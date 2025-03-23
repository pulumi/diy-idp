package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/go-github/github"
	"github.com/pulumi-idp/internal/config"
	"github.com/pulumi-idp/internal/model"
	"golang.org/x/oauth2"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"
)

// GitHubService implements GitHubServiceInterface
type GitHubService struct {
	cfg *config.Config
}

// NewGitHubService creates a new GitHub service
func NewGitHubService(cfg *config.Config) *GitHubService {
	return &GitHubService{
		cfg: cfg,
	}
}

// ExchangeCodeForToken exchanges GitHub OAuth code for access token
func (s *GitHubService) ExchangeCodeForToken(code string) (*model.OAuthResponse, error) {
	if code == "" {
		return nil, fmt.Errorf("missing required field: code")
	}

	githubReq := map[string]string{
		"client_id":     os.Getenv("GITHUB_CLIENT_ID"),
		"client_secret": os.Getenv("GITHUB_CLIENT_SECRET"),
		"code":          code,
	}

	jsonData, err := json.Marshal(githubReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(
		"https://github.com/login/oauth/access_token",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to request GitHub: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	values, err := url.ParseQuery(string(body))
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	oauthResp := &model.OAuthResponse{
		AccessToken: values.Get("access_token"),
		TokenType:   values.Get("token_type"),
		Scope:       values.Get("scope"),
	}

	return oauthResp, nil
}

// GetGitHubClient creates a new authenticated GitHub client
func (s *GitHubService) getGitHubClient(ctx context.Context) *github.Client {
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: s.cfg.GitHub.Token},
	)
	tc := oauth2.NewClient(ctx, ts)
	return github.NewClient(tc)
}

// CreateRepository creates a new GitHub repository
func (s *GitHubService) CreateRepository(ctx context.Context, req *model.RepoCreationRequest) (*github.Repository, *github.Response, error) {
	client := s.getGitHubClient(ctx)

	newRepo := &github.Repository{
		Name:        github.String(req.RepoName),
		Description: github.String(req.Description),
		Private:     github.Bool(req.Private),
		AutoInit:    github.Bool(true),
	}

	repo, resp, err := client.Repositories.Create(ctx, "", newRepo)
	if err != nil {
		if resp != nil {
			return nil, resp, fmt.Errorf("failed to create repository: %w", err)
		}
		return nil, nil, fmt.Errorf("failed to create repository: %w", err)
	}

	time.Sleep(2 * time.Second)

	return repo, resp, nil
}

// SetupBranchProtection sets up branch protection for a repository
func (s *GitHubService) SetupBranchProtection(ctx context.Context, owner, repo, branch string, requireReviews bool) error {
	client := s.getGitHubClient(ctx)

	protectionRequest := &github.ProtectionRequest{
		RequiredStatusChecks: &github.RequiredStatusChecks{
			Strict:   true,
			Contexts: []string{},
		},
		EnforceAdmins:              true,
		RequiredPullRequestReviews: nil,
	}

	if requireReviews {
		protectionRequest.RequiredPullRequestReviews = &github.PullRequestReviewsEnforcementRequest{
			DismissStaleReviews:          true,
			RequireCodeOwnerReviews:      true,
			RequiredApprovingReviewCount: 1,
		}
	}

	_, _, err := client.Repositories.UpdateBranchProtection(ctx, owner, repo, branch, protectionRequest)
	return err
}

// CollectFilesRecursively collects files recursively from a directory
func (s *GitHubService) CollectFilesRecursively(dir string) ([]string, error) {
	var files []string

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() {
			relPath, err := filepath.Rel(dir, path)
			if err != nil {
				return err
			}
			files = append(files, relPath)
		}

		return nil
	})

	return files, err
}

// CommitPulumiFilesToRepo commits Pulumi files to a repository
func (s *GitHubService) CommitPulumiFilesToRepo(ctx context.Context, tempDir, owner, repo string) error {
	client := s.getGitHubClient(ctx)

	// First try to get the main branch reference
	ref, _, err := client.Git.GetRef(ctx, owner, repo, "refs/heads/main")
	if err != nil {
		// If main doesn't exist, try master
		ref, _, err = client.Git.GetRef(ctx, owner, repo, "refs/heads/master")
		if err != nil {
			return fmt.Errorf("failed to get default branch: %v", err)
		}
	}

	// Get the tree for the latest commit
	tree, _, err := client.Git.GetTree(ctx, owner, repo, *ref.Object.SHA, false)
	if err != nil {
		return fmt.Errorf("failed to get tree: %v", err)
	}

	// Collect all files in the directory
	filePaths, err := s.CollectFilesRecursively(tempDir)
	if err != nil {
		return fmt.Errorf("failed to collect files: %v", err)
	}

	// Create tree entries for each file
	var entries []github.TreeEntry
	for _, filePath := range filePaths {
		content, err := ioutil.ReadFile(filepath.Join(tempDir, filePath))
		if err != nil {
			return fmt.Errorf("failed to read file %s: %v", filePath, err)
		}

		// Create a blob for the file content
		blob, _, err := client.Git.CreateBlob(ctx, owner, repo, &github.Blob{
			Content:  github.String(string(content)),
			Encoding: github.String("utf-8"),
		})
		if err != nil {
			return fmt.Errorf("failed to create blob for %s: %v", filePath, err)
		}

		// Add entry to the list
		entries = append(entries, github.TreeEntry{
			Path: github.String(filePath),
			Mode: github.String("100644"),
			Type: github.String("blob"),
			SHA:  blob.SHA,
		})
	}

	// Create a new tree with all the files
	newTree, _, err := client.Git.CreateTree(ctx, owner, repo, *tree.SHA, entries)
	if err != nil {
		return fmt.Errorf("failed to create tree: %v", err)
	}

	// Get the parent commit
	parent, _, err := client.Git.GetCommit(ctx, owner, repo, *ref.Object.SHA)
	if err != nil {
		return fmt.Errorf("failed to get parent commit: %v", err)
	}

	// Create a new commit with the new tree
	newCommit, _, err := client.Git.CreateCommit(ctx, owner, repo, &github.Commit{
		Message: github.String("Add Pulumi project files"),
		Tree:    newTree,
		Parents: []github.Commit{*parent},
	})
	if err != nil {
		return fmt.Errorf("failed to create commit: %v", err)
	}

	// Update the reference to point to the new commit
	branchName := "refs/heads/main"
	_, _, err = client.Git.UpdateRef(ctx, owner, repo, &github.Reference{
		Ref: github.String(branchName),
		Object: &github.GitObject{
			SHA: newCommit.SHA,
		},
	}, true)

	if err != nil {
		// If updating main fails, try master
		branchName = "refs/heads/master"
		_, _, err = client.Git.UpdateRef(ctx, owner, repo, &github.Reference{
			Ref: github.String(branchName),
			Object: &github.GitObject{
				SHA: newCommit.SHA,
			},
		}, true)

		if err != nil {
			return fmt.Errorf("failed to update reference: %v", err)
		}
	}

	return nil
}
