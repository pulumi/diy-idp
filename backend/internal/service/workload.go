package service

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gobeam/stringy"
	esc "github.com/pulumi/esc-sdk/sdk/go"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/config"
	"github.com/pulumi-idp/internal/model"
)

// BlueprintService implements BlueprintServiceInterface
type WorkloadService struct {
	cfg              *config.Config
	httpClient       *http.Client
	pulumiService    *PulumiService
	blueprintService *BlueprintService
	githubService    *GitHubService
}

// NewBlueprintService creates a new BlueprintService instance
func NewWorkloadService(cfg *config.Config) *WorkloadService {
	return &WorkloadService{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (s *WorkloadService) SetPulumiService(service *PulumiService) {
	s.pulumiService = service
}

func (s *WorkloadService) SetBlueprintService(service *BlueprintService) {
	s.blueprintService = service
}

func (s *WorkloadService) SetGitHubService(service *GitHubService) {
	s.githubService = service
}

// isRefType checks if a property type is a reference
func isRefType(propertyType string) bool {
	return strings.HasPrefix(propertyType, "$ref/")
}

// getRefEntity extracts the reference entity from the property type
func getRefEntity(propertyType string) string {
	if isRefType(propertyType) {
		parts := strings.Split(propertyType, "/")
		if len(parts) > 1 {
			return parts[1]
		}
	}
	return ""
}

// teamsToOneOfSchema converts a list of teams to a oneOf schema format
func teamsToOneOfSchema(teams []model.Team) []map[string]interface{} {
	oneOfOptions := make([]map[string]interface{}, 0, len(teams))
	for _, team := range teams {
		option := map[string]interface{}{
			"const": team.Name,
			"title": team.DisplayName,
		}
		oneOfOptions = append(oneOfOptions, option)
	}
	return oneOfOptions
}

// convertWorkloadToJSONSchema converts workload property overrides to a JSON schema
func (s *WorkloadService) convertWorkloadToJSONSchema(overrides []model.WorkloadPropertyOverride) map[string]interface{} {
	properties := make(map[string]interface{})
	var required []string

	for _, override := range overrides {
		if override.Required {
			required = append(required, override.Name)
		}

		if isRefType(override.Type) {
			refEntity := getRefEntity(override.Type)
			if refEntity == "teams" {
				teamsResp, err := s.pulumiService.GetTeams(s.cfg.Pulumi.Organization, s.cfg.Pulumi.APIToken)
				if err == nil && teamsResp != nil {
					oneOfOptions := teamsToOneOfSchema(teamsResp.Teams)
					properties[override.Name] = map[string]interface{}{
						"type":  "string",
						"oneOf": oneOfOptions,
					}
					if override.Title != "" {
						properties[override.Name].(map[string]interface{})["title"] = override.Title
					} else {
						properties[override.Name].(map[string]interface{})["title"] = override.Name
					}
					continue
				} else {
					fmt.Printf("Error fetching teams: %v\n", err)
				}
			} else if refEntity == "projects" {
				projects := []string{"123", "456", "789"} // This should be fetched from a real source
				options := make([]map[string]interface{}, 0, len(projects))
				for _, project := range projects {
					option := map[string]interface{}{
						"const": project,
						"title": project,
					}
					options = append(options, option)
				}
				properties[override.Name] = map[string]interface{}{
					"type":  "string",
					"oneOf": options,
				}
				if override.Title != "" {
					properties[override.Name].(map[string]interface{})["title"] = override.Title
				} else {
					properties[override.Name].(map[string]interface{})["title"] = override.Name
				}
				continue
			} else if refEntity == "esc" {
				environmentsResp, err := s.blueprintService.GetEnvironmentsForUserAndTag("", "")
				if err == nil && environmentsResp != nil {
					oneOfOptions := make([]map[string]interface{}, 0, len(environmentsResp.Environments))
					for _, env := range environmentsResp.Environments {
						option := map[string]interface{}{
							"const": env.Name,
							"title": env.Name,
						}
						oneOfOptions = append(oneOfOptions, option)
					}
					properties[override.Name] = map[string]interface{}{
						"type":  "string",
						"oneOf": oneOfOptions,
					}
					if override.Title != "" {
						properties[override.Name].(map[string]interface{})["title"] = override.Title
					} else {
						properties[override.Name].(map[string]interface{})["title"] = override.Name
					}
					continue
				} else {
					fmt.Printf("Error fetching environments: %v\n", err)
				}
			} else {
				fmt.Printf("Reference type %s not yet implemented\n", refEntity)
			}
		}

		properties[override.Name] = map[string]interface{}{
			"type": override.Type,
		}
		if override.Title != "" {
			properties[override.Name].(map[string]interface{})["title"] = override.Title
		} else {
			properties[override.Name].(map[string]interface{})["title"] = override.Name
		}
	}

	return map[string]interface{}{
		"type":       "object",
		"properties": properties,
		"required":   required,
	}
}

// GetWorkloadSchema retrieves the JSON schema for workloads
func (s *WorkloadService) GetWorkloadSchema(c echo.Context) (map[string]interface{}, error) {
	configuration := esc.NewConfiguration()
	escClient := esc.NewClient(configuration)
	authCtx := esc.NewAuthContext(s.cfg.Pulumi.APIToken)

	workloadDefinitionLocation := s.cfg.Pulumi.WorkloadDefinitionLocation

	projName := strings.Split(workloadDefinitionLocation, "/")[0]
	envName := strings.Split(workloadDefinitionLocation, "/")[1]

	_, values, err := escClient.OpenAndReadEnvironment(authCtx, s.cfg.Pulumi.Organization, projName, envName)
	if err != nil {
		c.Logger().Debugf("Failed to open environment: %v", err)
		return nil, fmt.Errorf("failed to open environment: %w", err)
	}

	escBlueprint, ok := values["workload"]
	if !ok {
		c.Logger().Debugf("Secret 'workload' not found in environment %s/%s", projName, envName)
		return nil, fmt.Errorf("secret 'workload' not found in environment %s/%s", projName, envName)
	}

	var ws = model.Workload{}

	if overrides, ok := escBlueprint.(map[string]interface{})["properties"].([]map[string]string); ok {
		for _, o := range overrides {
			ws.WorkloadPropertyOverrides = append(ws.WorkloadPropertyOverrides, model.WorkloadPropertyOverride{
				Name:     o["name"],
				Type:     o["type"],
				Title:    o["title"],
				Required: o["required"] == "false",
			})
		}
	} else if overrides, ok := escBlueprint.(map[string]interface{})["properties"].([]interface{}); ok {
		for _, o := range overrides {
			override := o.(map[string]interface{})
			po := model.WorkloadPropertyOverride{
				Name: override["name"].(string),
				Type: override["type"].(string),
			}
			if required, ok := override["required"]; ok {
				po.Required = required.(bool)
			} else {
				po.Required = true
			}
			if title, ok := override["title"]; ok {
				po.Title = title.(string)
			}
			ws.WorkloadPropertyOverrides = append(ws.WorkloadPropertyOverrides, po)
		}
	}

	schema := s.convertWorkloadToJSONSchema(ws.WorkloadPropertyOverrides)
	return schema, nil
}

// GetWorkloads retrieves all workloads
func (s *WorkloadService) GetWorkloads(c echo.Context, workload, projectID string) (*model.ListStacksResponse, error) {
	options := &model.ListStacksOptions{
		Organization: s.cfg.Pulumi.Organization,
		TagName:      "idp:workload",
	}

	if workload != "" {
		options.TagValue = workload
	}

	if projectID != "" {
		options.TagValue = projectID
	}

	stacks, err := s.pulumiService.ListStacks(options)
	if err != nil {
		return nil, fmt.Errorf("failed to list stacks: %w", err)
	}

	for i := range stacks.Stacks {
		handler, err := s.pulumiService.GetStackUpdates(&model.ListStackUpdatesParams{
			Page:       1,
			PageSize:   1,
			OutputType: "cli",
		}, stacks.Stacks[i].ProjectName, stacks.Stacks[i].StackName)

		if err != nil {
			return nil, err
		}

		if len(handler.Deployments) > 0 {
			stacks.Stacks[i].Result = handler.Deployments[0].Status
		} else {
			stacks.Stacks[i].Result = "no updates"
		}

		stackHandler, err := s.pulumiService.GetStack(stacks.Stacks[i].ProjectName, stacks.Stacks[i].StackName)
		if err != nil {
			return nil, err
		}

		stacks.Stacks[i].Tags = stackHandler.Tags
	}

	return stacks, nil
}

// DeleteWorkload deletes a workload
func (s *WorkloadService) DeleteWorkload(organization, project, stack string) error {
	if organization == "" {
		return fmt.Errorf("organization is required")
	}

	if project == "" {
		return fmt.Errorf("project is required")
	}

	if stack == "" {
		return fmt.Errorf("stack is required")
	}

	err := s.pulumiService.DeleteDeployment(organization, project, stack)
	if err != nil {
		return err
	}

	err = s.pulumiService.SetStackTag(organization, project, stack, model.Tag{
		Key:   "idp:auto-delete",
		Value: "true",
	})

	if err != nil {
		return fmt.Errorf("failed to set stack tags: %w", err)
	}

	return nil
}

// UpdateWorkload updates a workload
func (s *WorkloadService) UpdateWorkload(organization, project, stack string, req *model.WorkloadRequest) error {
	if organization == "" {
		return fmt.Errorf("organization is required")
	}

	if project == "" {
		return fmt.Errorf("project is required")
	}

	if stack == "" {
		return fmt.Errorf("stack is required")
	}

	name := stringy.New(req.Name).KebabCase("?", "-").ToLower()
	s.pulumiService.RunPulumiUp(name, req.BlueprintName, fmt.Sprintf("https://github.com/%s.git", s.cfg.Pulumi.BlueprintGithubLocation), req.Advanced, req.Stage)

	return nil
}

// CreateWorkload creates a new workload
func (s *WorkloadService) CreateWorkload(ctx context.Context, req *model.WorkloadRequest) (*model.RepoCreationResponse, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("repository name is required")
	}

	if req.Blueprint == "" {
		return nil, fmt.Errorf("pulumi template is required")
	}

	token := s.cfg.GitHub.Token
	if token == "" {
		return nil, fmt.Errorf("GITHUB_TOKEN environment variable not set")
	}

	name := stringy.New(req.Name).KebabCase("?", "-").ToLower()

	_, err := s.pulumiService.CreateStack(s.cfg.Pulumi.Organization, req.Blueprint, name)
	if err != nil {
		return nil, fmt.Errorf("failed to create stack: %w", err)
	}

	err = s.pulumiService.GrantStackAccessToTeam(s.cfg.Pulumi.Organization, req.Team, req.Blueprint, name, 103)
	if err != nil {
		return nil, fmt.Errorf("failed to grant stack access to team: %w", err)
	}

	// Set workload name as stack tag
	err = s.pulumiService.SetStackTag(s.cfg.Pulumi.Organization, req.Blueprint, name, model.Tag{
		Key:   "idp:workload",
		Value: req.Name,
	})

	// Set projectid as stack tag
	err = s.pulumiService.SetStackTag(s.cfg.Pulumi.Organization, req.Blueprint, name, model.Tag{
		Key:   "idp:projectid",
		Value: req.ProjectID,
	})

	// Set stage as stack tag
	err = s.pulumiService.SetStackTag(s.cfg.Pulumi.Organization, req.Blueprint, name, model.Tag{
		Key:   "idp:stage",
		Value: req.Stage,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to set stack tag: %w", err)
	}

	for _, tag := range req.Tags {
		err = s.pulumiService.SetStackTag(s.cfg.Pulumi.Organization, req.Blueprint, name, tag)
		if err != nil {
			return nil, fmt.Errorf("failed to set stack tags: %w", err)
		}
	}

	if req.CookieCut {
		repoRequest := model.RepoCreationRequest{
			RepoName:               name,
			Description:            "Generated repository via Pulumi IDP",
			Private:                false,
			EnableBranchProtection: true,
			ProtectedBranches:      []string{"main"},
			RequireReviews:         true,
		}

		repo, _, err := s.githubService.CreateRepository(ctx, &repoRequest)
		if err != nil {
			return nil, fmt.Errorf("failed to create repository: %w", err)
		}

		tempDir, err := ioutil.TempDir("", "pulumi-project-")
		if err != nil {
			return nil, fmt.Errorf("failed to create temp directory: %w", err)
		}
		defer os.RemoveAll(tempDir)

		pulumiTemplate := stringy.New(req.Blueprint).KebabCase("?", "-").ToLower()
		err = s.pulumiService.RunPulumiNew(tempDir, pulumiTemplate, name, "Pulumi project created via Pulumi IDP")
		if err != nil {
			return nil, fmt.Errorf("failed to create Pulumi project: %w", err)
		}

		err = s.githubService.CommitPulumiFilesToRepo(ctx, tempDir, repo.GetOwner().GetLogin(), *repo.Name)
		if err != nil {
			return nil, fmt.Errorf("failed to commit Pulumi files: %w", err)
		}

		if repoRequest.EnableBranchProtection && len(repoRequest.ProtectedBranches) > 0 {
			for _, branch := range repoRequest.ProtectedBranches {
				err = s.githubService.SetupBranchProtection(ctx, repo.GetOwner().GetLogin(), *repo.Name, branch, repoRequest.RequireReviews)
				if err != nil {
					return nil, fmt.Errorf("failed to set up branch protection for %s: %w", branch, err)
				}
			}
		}

		s.pulumiService.RunPulumiUp(name, "/", *repo.CloneURL, req.Advanced, req.Stage)

		return &model.RepoCreationResponse{
			RepoURL:  *repo.HTMLURL,
			CloneURL: *repo.CloneURL,
			Message:  "Repository created successfully with Pulumi project files",
			Success:  true,
		}, nil
	} else {
		repo := fmt.Sprintf("https://github.com/%s.git", s.cfg.Pulumi.BlueprintGithubLocation)
		s.pulumiService.RunPulumiUp(name, req.BlueprintName, fmt.Sprintf("https://github.com/%s.git", s.cfg.Pulumi.BlueprintGithubLocation), req.Advanced, req.Stage)

		return &model.RepoCreationResponse{
			RepoURL:  repo,
			CloneURL: repo,
			Message:  "Repository created successfully with Pulumi project files",
			Success:  true,
		}, nil
	}
}

// GetWorkloadDetails retrieves detailed information about a workload
func (s *WorkloadService) GetWorkloadDetails(organization, project, stack string) (*model.WorkloadResponse, error) {
	configuration := esc.NewConfiguration()
	escClient := esc.NewClient(configuration)
	authCtx := esc.NewAuthContext(s.cfg.Pulumi.APIToken)

	_, values, err := escClient.OpenAndReadEnvironment(authCtx, organization, project, stack)
	if err != nil {
		return nil, fmt.Errorf("failed to open environment: %w", err)
	}

	pulumiConfig, ok := values["pulumiConfig"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("secret 'pulumiConfig' not found in environment %s/%s", project, stack)
	}

	cleanPulumiConfig := make(map[string]interface{})
	for key, value := range pulumiConfig {
		if !strings.Contains(key, "token") && !strings.Contains(key, "kubeconfig") {
			cleanPulumiConfig[key] = value
		}
	}

	options := &model.ListStacksOptions{
		Organization: s.cfg.Pulumi.Organization,
		TagName:      "idp:workload",
		TagValue:     stack,
	}

	stacks, err := s.pulumiService.ListStacks(options)
	if err != nil {
		return nil, fmt.Errorf("failed to list stacks: %w", err)
	}

	if len(stacks.Stacks) == 0 {
		return nil, fmt.Errorf("no stacks found for workload %s", stack)
	}

	for i := range stacks.Stacks {
		handler, err := s.pulumiService.GetStackUpdates(&model.ListStackUpdatesParams{
			Page:       1,
			PageSize:   1,
			OutputType: "cli",
		}, stacks.Stacks[i].ProjectName, stacks.Stacks[i].StackName)

		if err != nil {
			return nil, err
		}

		if len(handler.Deployments) > 0 {
			stacks.Stacks[i].Result = handler.Deployments[0].Status
			stacks.Stacks[i].DeploymentId = handler.Deployments[0].ID
		} else {
			stacks.Stacks[i].Result = "no updates"
			stacks.Stacks[i].DeploymentId = ""
		}

		stackHandler, err := s.pulumiService.GetStack(stacks.Stacks[i].ProjectName, stacks.Stacks[i].StackName)
		if err != nil {
			return nil, err
		}

		stacks.Stacks[i].Tags = stackHandler.Tags
	}

	return &model.WorkloadResponse{
		Name:          stack,
		Blueprint:     project,
		BlueprintName: project,
		ProjectID:     stacks.Stacks[0].Tags["idp:projectid"],
		Stack:         stacks.Stacks[0],
		Stage:         stacks.Stacks[0].Tags["idp:stage"],
		Advanced: []map[string]interface{}{
			cleanPulumiConfig,
		},
	}, nil
}

// GetDeploymentLogs retrieves logs for a deployment
func (s *WorkloadService) GetDeploymentLogs(organization, project, stack, deploymentID, continuationToken string) (*model.LogResponse, error) {
	// Construct the URL for the Pulumi API
	url := fmt.Sprintf("%s/stacks/%s/%s/%s/deployments/%s/logs",
		s.cfg.Pulumi.APIBaseURL, organization, project, stack, deploymentID)

	if continuationToken != "" {
		url = fmt.Sprintf("%s?continuationToken=%s", url, continuationToken)
	}

	// Create a new request
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch logs: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Pulumi API returned error: %s", string(body))
	}

	// Parse response
	var logResponse model.LogResponse
	if err := json.NewDecoder(resp.Body).Decode(&logResponse); err != nil {
		return nil, fmt.Errorf("failed to parse logs: %w", err)
	}

	return &logResponse, nil
}
