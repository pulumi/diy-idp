package github

import (
	"context"
	"github.com/google/go-github/github"
	"github.com/pulumi-idp/internal/model"
)

type Service interface {
	ExchangeCodeForToken(code string) (*model.OAuthResponse, error)
	CreateRepository(ctx context.Context, req *model.RepoCreationRequest) (*github.Repository, *github.Response, error)
	SetupBranchProtection(ctx context.Context, owner, repo, branch string, requireReviews bool) error
	CommitPulumiFilesToRepo(ctx context.Context, tempDir, owner, repo string) error
	CollectFilesRecursively(dir string) ([]string, error)
}
