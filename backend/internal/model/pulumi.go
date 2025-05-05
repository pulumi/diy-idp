package model

// StackCreationRequest represents the request body for creating a new stack
type StackCreationRequest struct {
	StackName string `json:"stackName"`
}

// StackTagRequest represents the request body for setting a tag on a stack
type StackTagRequest struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// StackCreationResponse represents the response from the Pulumi API when creating a stack
type StackCreationResponse struct {
	Name          string `json:"name"`
	Organization  string `json:"organization"`
	Project       string `json:"project"`
	URL           string `json:"url"`
	LastUpdate    string `json:"lastUpdate,omitempty"`
	ResourceCount int    `json:"resourceCount,omitempty"`
	ActiveUpdate  string `json:"activeUpdate,omitempty"`
	TagCount      int    `json:"tagCount"`
	GitHubProject string `json:"githubProject,omitempty"`
	Permission    string `json:"permission,omitempty"`
	Error         string `json:"error,omitempty"`
}

// ListStacksOptions represents the optional parameters for listing stacks
type ListStacksOptions struct {
	Organization      string
	Project           string
	TagName           string
	TagValue          string
	ContinuationToken string
}

// Stack represents a stack in the list stacks response
type Stack struct {
	OrgName          string                 `json:"orgName"`
	ProjectName      string                 `json:"projectName"`
	StackName        string                 `json:"stackName"`
	LastUpdate       int64                  `json:"lastUpdate"`
	ResourceCount    int                    `json:"resourceCount"`
	Result           string                 `json:"result"`
	DeploymentId     string                 `json:"deploymentId"`
	CurrentOperation *CurrentOperation      `json:"currentOperation,omitempty"`
	ActiveUpdate     string                 `json:"activeUpdate,omitempty"`
	Outputs          map[string]interface{} `json:"outputs,omitempty"`
	Tags             map[string]string      `json:"tags,omitempty"`
	Version          int                    `json:"version"`
}

// CurrentOperation represents the current operation on a stack
type CurrentOperation struct {
	Kind    string `json:"kind"`
	Author  string `json:"author"`
	Started int64  `json:"started"`
}

// ListStacksResponse represents the response from listing stacks
type ListStacksResponse struct {
	Stacks            []Stack `json:"stacks"`
	ContinuationToken string  `json:"continuationToken,omitempty"`
}

// Updated struct definitions to match the new deployments API response
type JobStep struct {
	Name        string `json:"name"`
	Status      string `json:"status"`
	Started     string `json:"started"`
	LastUpdated string `json:"lastUpdated"`
}

type Job struct {
	Status      string    `json:"status"`
	Started     string    `json:"started"`
	LastUpdated string    `json:"lastUpdated"`
	Steps       []JobStep `json:"steps"`
}

type StackUpdate struct {
	ID          string                 `json:"id"`
	UpdateID    string                 `json:"updateID"`
	Version     int                    `json:"version"`
	StartTime   int64                  `json:"startTime"`
	EndTime     int64                  `json:"endTime"`
	Result      string                 `json:"result"`
	Kind        string                 `json:"kind"`
	Message     string                 `json:"message"`
	Environment map[string]interface{} `json:"environment"`
}

type RequestedBy struct {
	Name        string `json:"name"`
	GithubLogin string `json:"githubLogin"`
	AvatarURL   string `json:"avatarUrl"`
	Email       string `json:"email"`
}

type Deployment struct {
	ID              string        `json:"id"`
	Created         string        `json:"created"`
	Modified        string        `json:"modified"`
	Status          string        `json:"status"`
	Version         int           `json:"version"`
	RequestedBy     RequestedBy   `json:"requestedBy"`
	ProjectName     string        `json:"projectName"`
	StackName       string        `json:"stackName"`
	PulumiOperation string        `json:"pulumiOperation"`
	Updates         []StackUpdate `json:"updates"`
	Jobs            []Job         `json:"jobs"`
	Initiator       string        `json:"initiator"`
}

type StackDeploymentsResponse struct {
	Deployments  []Deployment `json:"deployments"`
	ItemsPerPage int          `json:"itemsPerPage"`
	Total        int          `json:"total"`
}

// ListStackUpdatesParams contains query parameters for the stack updates endpoint
type ListStackUpdatesParams struct {
	Page       int    `query:"page"`
	PageSize   int    `query:"pageSize"`
	OutputType string `query:"output-type"`
}

type Secret struct {
	Secret string `json:"secret"`
}

// SSHAuth represents SSH authentication details
type SSHAuth struct {
	SSHPrivateKey Secret  `json:"sshPrivateKey"`
	Password      *Secret `json:"password,omitempty"`
}

// BasicAuth represents basic authentication details
type BasicAuth struct {
	UserName string `json:"userName"`
	Password Secret `json:"password"`
}

// GitAuth represents Git authentication details
type GitAuth struct {
	SSHAuth   *SSHAuth   `json:"sshAuth,omitempty"`
	BasicAuth *BasicAuth `json:"basicAuth,omitempty"`
}

// GitSource represents a Git source configuration
type GitSource struct {
	RepoURL string   `json:"repoURL"`
	Branch  *string  `json:"branch,omitempty"`
	RepoDir *string  `json:"repoDir,omitempty"`
	Commit  *string  `json:"commit,omitempty"`
	GitAuth *GitAuth `json:"gitAuth,omitempty"`
}

// SourceContext represents the source context for a deployment
type SourceContext struct {
	Git *GitSource `json:"git,omitempty"`
}

// EnvironmentVariable represents an environment variable which can be plaintext or secret
type EnvironmentVariable struct {
	Value  *string `json:"value,omitempty"`
	Secret *string `json:"secret,omitempty"`
}

// AWSOIDCConfiguration represents AWS OIDC configuration
type AWSOIDCConfiguration struct {
	Duration    *string   `json:"duration,omitempty"`
	PolicyARNs  *[]string `json:"policyArns,omitempty"`
	RoleARN     string    `json:"roleArn"`
	SessionName string    `json:"sessionName"`
}

// AzureOIDCConfiguration represents Azure OIDC configuration
type AzureOIDCConfiguration struct {
	ClientID       string `json:"clientId"`
	TenantID       string `json:"tenantId"`
	SubscriptionID string `json:"subscriptionId"`
}

// GCPOIDCConfiguration represents GCP OIDC configuration
type GCPOIDCConfiguration struct {
	ProjectID      string  `json:"projectId"`
	Region         *string `json:"region,omitempty"`
	WorkloadPoolID string  `json:"workloadPoolId"`
	ProviderID     string  `json:"providerId"`
	ServiceAccount string  `json:"serviceAccount"`
	TokenLifetime  *string `json:"tokenLifetime,omitempty"`
}

// OIDCConfiguration represents OIDC configuration options
type OIDCConfiguration struct {
	AWS   *AWSOIDCConfiguration   `json:"aws,omitempty"`
	Azure *AzureOIDCConfiguration `json:"azure,omitempty"`
	GCP   *GCPOIDCConfiguration   `json:"gcp,omitempty"`
}

// OperationContextOptions represents options for the operation context
type OperationContextOptions struct {
	SkipInstallDependencies     *bool `json:"skipInstallDependencies,omitempty"`
	SkipIntermediateDeployments *bool `json:"skipIntermediateDeployments,omitempty"`
	DeleteAfterDestroy          *bool `json:"deleteAfterDestroy,omitempty"`
}

// OperationContext represents the context for running a Pulumi operation
type OperationContext struct {
	PreRunCommands       *[]string                `json:"preRunCommands,omitempty"`
	EnvironmentVariables map[string]interface{}   `json:"environmentVariables,omitempty"`
	Options              *OperationContextOptions `json:"options,omitempty"`
	OIDC                 *OIDCConfiguration       `json:"oidc,omitempty"`
}

// GitHub represents GitHub integration settings
type GitHub struct {
	Repository          string    `json:"repository"`
	DeployCommits       *bool     `json:"deployCommits,omitempty"`
	PreviewPullRequests *bool     `json:"previewPullRequests,omitempty"`
	PullRequestTemplate *bool     `json:"pullRequestTemplate,omitempty"`
	Paths               *[]string `json:"paths,omitempty"`
}

// CacheOptions represents dependency caching options
type CacheOptions struct {
	Enable bool `json:"enable"`
}

// DeploymentOperation represents a Pulumi operation
type DeploymentOperation struct {
	Type string `json:"type"`
}

// CreateDeploymentRequest represents a request to create a deployment
type CreateDeploymentRequest struct {
	SourceContext    *SourceContext    `json:"sourceContext,omitempty"`
	OperationContext *OperationContext `json:"operationContext,omitempty"`
	GitHub           *GitHub           `json:"github,omitempty"`
	CacheOptions     *CacheOptions     `json:"cacheOptions,omitempty"`
	Operation        string            `json:"operation"`
	InheritSettings  *bool             `json:"inheritSettings,omitempty"`
}

// CreateDeploymentResponse represents the response from the Pulumi API when creating a deployment
type CreateDeploymentResponse struct {
	ID        string                 `json:"id"`
	URL       string                 `json:"url"`
	Status    string                 `json:"status"`
	Message   string                 `json:"message,omitempty"`
	Settings  map[string]interface{} `json:"settings,omitempty"`
	Operation map[string]interface{} `json:"operation,omitempty"`
}

// Create the request payload
type StackPermission struct {
	ProjectName string `json:"projectName"`
	StackName   string `json:"stackName"`
	Permission  int    `json:"permission"`
}

type RequestBody struct {
	AddStackPermission StackPermission `json:"addStackPermission"`
}

type StackResourcesResponse struct {
	Resources []ResourceWrapper `json:"resources"`
	Region    string            `json:"region"`
	Version   int               `json:"version"`
}

// ResourceWrapper wraps a resource object
type ResourceWrapper struct {
	Resource Resource `json:"resource"`
}

// Resource represents a Pulumi resource
type Resource struct {
	ID                      string                 `json:"id,omitempty"`
	Type                    string                 `json:"type"`
	URN                     string                 `json:"urn"`
	Custom                  bool                   `json:"custom"`
	Delete                  bool                   `json:"delete"`
	Dependencies            []string               `json:"dependencies"`
	Outputs                 map[string]interface{} `json:"outputs,omitempty"`
	Parent                  string                 `json:"parent,omitempty"`
	AdditionalSecretOutputs []string               `json:"additionalSecretOutputs,omitempty"`
	Inputs                  map[string]interface{} `json:"inputs,omitempty"`
	ProviderInputs          map[string]interface{} `json:"providerInputs,omitempty"`
}
