package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/pulumi-idp/internal/config"
	"github.com/pulumi-idp/internal/model"
	esc "github.com/pulumi/esc-sdk/sdk/go"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

// PulumiService implements PulumiServiceInterface
type PulumiService struct {
	cfg        *config.Config
	httpClient *http.Client
}

// NewPulumiService creates a new Pulumi service
func NewPulumiService(cfg *config.Config) *PulumiService {
	return &PulumiService{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SetStackTag sets a tag on a stack
func (s *PulumiService) SetStackTag(organization, project, stack string, tag model.Tag) error {
	reqBody := model.StackTagRequest{
		Name:  tag.Key,
		Value: tag.Value,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("error marshaling request body: %w", err)
	}

	url := fmt.Sprintf("%s/stacks/%s/%s/%s/tags", s.cfg.Pulumi.APIBaseURL, organization, project, stack)

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to set stack tag: HTTP %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// CreateStack creates a new stack
func (s *PulumiService) CreateStack(organization, project, stackName string) (*model.StackCreationResponse, error) {
	reqBody := model.StackCreationRequest{
		StackName: stackName,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request body: %w", err)
	}

	url := fmt.Sprintf("%s/stacks/%s/%s", s.cfg.Pulumi.APIBaseURL, organization, project)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to create stack: HTTP %d %s", resp.StatusCode, string(data))
	}

	var stackResp model.StackCreationResponse
	if err := json.NewDecoder(resp.Body).Decode(&stackResp); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &stackResp, nil
}

// DeleteStack deletes a stack
func (s *PulumiService) DeleteStack(organization, project, stack string) error {
	if organization == "" || project == "" || stack == "" {
		return fmt.Errorf("organization, project, and stack are required")
	}

	url := fmt.Sprintf("%s/stacks/%s/%s/%s", s.cfg.Pulumi.APIBaseURL, organization, project, stack)

	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete stack: HTTP %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// GetLatestStackResources retrieves the latest stack resources
func (s *PulumiService) GetLatestStackResources(organization, project, stack string) (*model.StackResourcesResponse, error) {
	url := fmt.Sprintf("%s/stacks/%s/%s/%s/resources/latest",
		s.cfg.Pulumi.APIBaseURL, organization, project, stack)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.pulumi+8")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var stackResources model.StackResourcesResponse
	if err := json.NewDecoder(resp.Body).Decode(&stackResources); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &stackResources, nil
}

// GetStack retrieves a stack
func (s *PulumiService) GetStack(project, stack string) (*model.Stack, error) {
	url := fmt.Sprintf("%s/stacks/%s/%s/%s", s.cfg.Pulumi.APIBaseURL, s.cfg.Pulumi.Organization, project, stack)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var stackResponse model.Stack
	if err := json.Unmarshal(body, &stackResponse); err != nil {
		return nil, fmt.Errorf("error decoding response body: %w", err)
	}

	return &stackResponse, nil
}

// ListStacks lists stacks with options
func (s *PulumiService) ListStacks(options *model.ListStacksOptions) (*model.ListStacksResponse, error) {
	url := fmt.Sprintf("%s/user/stacks", s.cfg.Pulumi.APIBaseURL)

	if options != nil {
		params := make([]string, 0)

		if options.Organization != "" {
			params = append(params, fmt.Sprintf("organization=%s", options.Organization))
		}

		if options.Project != "" {
			params = append(params, fmt.Sprintf("project=%s", options.Project))
		}

		if options.TagName != "" {
			params = append(params, fmt.Sprintf("tagName=%s", options.TagName))
		}

		if options.TagValue != "" {
			params = append(params, fmt.Sprintf("tagValue=%s", options.TagValue))
		}

		if options.ContinuationToken != "" {
			params = append(params, fmt.Sprintf("continuationToken=%s", options.ContinuationToken))
		}

		if len(params) > 0 {
			url += "?" + strings.Join(params, "&")
		}
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Add the necessary headers
	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	// Execute the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	// Check for successful response
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list stacks: HTTP %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse the response
	var listResp model.ListStacksResponse
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &listResp, nil
}

// CreateStackSettings creates stack settings
func (s *PulumiService) CreateStackSettings(organization, project, stack, cloneUrl string) error {
	url := fmt.Sprintf("%s/stacks/%s/%s/%s/deployments/settings", s.cfg.Pulumi.APIBaseURL, organization, project, stack)

	deploymentRequest := model.CreateDeploymentRequest{
		SourceContext: &model.SourceContext{
			Git: &model.GitSource{
				RepoURL: cloneUrl,
				RepoDir: &project,
				Branch:  pulumi.StringRef("refs/heads/main"),
			},
		},
		OperationContext: &model.OperationContext{
			PreRunCommands: &[]string{
				fmt.Sprintf("pulumi stack select %s/%s", organization, stack),
				fmt.Sprintf("pulumi config env add %s/%s -y", project, stack),
			},
		},
	}

	requestBody, err := json.Marshal(deploymentRequest)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(requestBody))
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	// Send the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error reading response body: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse the successful response
	var deploymentResponse model.CreateDeploymentResponse
	if err := json.Unmarshal(body, &deploymentResponse); err != nil {
		return fmt.Errorf("error unmarshaling response: %w", err)
	}
	return nil
}

// DeleteDeployment deletes a deployment
func (s *PulumiService) DeleteDeployment(organization, project, stack string) error {
	url := fmt.Sprintf("%s/stacks/%s/%s/%s/deployments", s.cfg.Pulumi.APIBaseURL, organization, project, stack)

	deploymentRequest := model.CreateDeploymentRequest{
		InheritSettings: pulumi.BoolRef(true),
		Operation:       "destroy",
	}

	requestBody, err := json.Marshal(deploymentRequest)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(requestBody))
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	// Send the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error reading response body: %w", err)
	}

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// CreateDeployment creates a deployment
func (s *PulumiService) CreateDeployment(organization, project, stack, cloneUrl string) (*model.CreateDeploymentResponse, error) {
	err := s.CreateStackSettings(organization, project, stack, cloneUrl)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/stacks/%s/%s/%s/deployments", s.cfg.Pulumi.APIBaseURL, s.cfg.Pulumi.Organization, project, stack)

	deploymentRequest := model.CreateDeploymentRequest{
		InheritSettings: pulumi.BoolRef(true),
		Operation:       "update",
	}
	requestBody, err := json.Marshal(deploymentRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	// Send the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse the successful response
	var deploymentResponse model.CreateDeploymentResponse
	if err := json.Unmarshal(body, &deploymentResponse); err != nil {
		return nil, fmt.Errorf("error unmarshaling response: %w", err)
	}

	return &deploymentResponse, nil
}

// RunPulumiUp runs a Pulumi update
func (s *PulumiService) RunPulumiUp(pulumiProjectName, bluePrintName, cloneUrl string, pulumiConfig []map[string]interface{}, stage string) {
	go func() {
		configuration := esc.NewConfiguration()
		escClient := esc.NewClient(configuration)
		authCtx := esc.NewAuthContext(s.cfg.Pulumi.APIToken)

		err := escClient.CreateEnvironment(authCtx, s.cfg.Pulumi.Organization, bluePrintName, pulumiProjectName)
		if err != nil {
			_ = fmt.Errorf("error creating environment: %w", err)
		}

		updatePayload := &esc.EnvironmentDefinition{
			Imports: []string{
				stage,
			},
			Values: &esc.EnvironmentDefinitionValues{
				PulumiConfig: map[string]interface{}{},
			},
		}

		for _, config := range pulumiConfig {
			for key, value := range config {
				updatePayload.Values.PulumiConfig[key] = value
			}
		}

		_, err = escClient.UpdateEnvironment(authCtx, s.cfg.Pulumi.Organization, bluePrintName, pulumiProjectName, updatePayload)
		if err != nil {
			_ = fmt.Errorf("error updating environment: %w", err)
		}

		_, err = s.CreateDeployment(s.cfg.Pulumi.Organization, bluePrintName, pulumiProjectName, cloneUrl)
		if err != nil {
			_ = fmt.Errorf("error creating deployment: %w", err)
		}
	}()
	fmt.Println("Pulumi deployment started in background")
}

// RunPulumiNew runs a Pulumi new command
func (s *PulumiService) RunPulumiNew(tempDir, template, projectName, projectDesc string) error {
	if projectName == "" {
		projectName = "pulumi-project"
	}

	cmd := exec.Command("pulumi", "new", template, "--dir", tempDir, "--name", projectName, "--description", projectDesc, "--yes", "--force", "-g")
	cmd.Env = os.Environ()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// GetStackUpdates retrieves stack updates
func (s *PulumiService) GetStackUpdates(params *model.ListStackUpdatesParams, project, stack string) (*model.StackDeploymentsResponse, error) {
	url := fmt.Sprintf("%s/stacks/%s/%s/%s/deployments", s.cfg.Pulumi.APIBaseURL, s.cfg.Pulumi.Organization, project, stack)

	queryParams := make([]string, 0)

	queryParams = append(queryParams, "pageSize=1")

	if params.Page > 0 {
		queryParams = append(queryParams, fmt.Sprintf("page=%d", params.Page))
	}

	if len(queryParams) > 0 {
		url = fmt.Sprintf("%s?%s", url, strings.Join(queryParams, "&"))
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list stack deployments: HTTP %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	var deploymentsResponse model.StackDeploymentsResponse
	if err := json.Unmarshal(bodyBytes, &deploymentsResponse); err != nil {
		return nil, fmt.Errorf("error decoding response body: %w", err)
	}

	return &deploymentsResponse, nil
}

func (s *PulumiService) GetTeams(organization, accessToken string) (*model.TeamsResponse, error) {

	fmt.Printf("--------Getting teams for organization %s\n", organization)
	url := fmt.Sprintf("%s/orgs/%s/teams", s.cfg.Pulumi.APIBaseURL, s.cfg.Pulumi.Organization)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.pulumi+8")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", accessToken))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var teamsResponse model.TeamsResponse
	if err := json.Unmarshal(body, &teamsResponse); err != nil {
		return nil, fmt.Errorf("error unmarshaling response: %w", err)
	}

	return &teamsResponse, nil
}

func (s *PulumiService) GrantStackAccessToTeam(organization, team, projectName, stackName string, permission int) error {

	payload := model.RequestBody{
		AddStackPermission: model.StackPermission{
			ProjectName: projectName,
			StackName:   stackName,
			Permission:  permission,
		},
	}

	// Marshal the payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request payload: %w", err)
	}

	// Construct the URL
	url := fmt.Sprintf("%s/orgs/%s/teams/%s", s.cfg.Pulumi.APIBaseURL, organization, team)

	// Create the request
	req, err := http.NewRequest(http.MethodPatch, url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Accept", "application/vnd.pulumi+8")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.cfg.Pulumi.APIToken))

	// Send the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}
