package model

import "time"

type Tag struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type WorkflowRequest struct {
	BlueprintName string                   `json:"blueprintName"`
	Blueprint     string                   `json:"blueprint"`
	Name          string                   `json:"name"`
	ProjectID     string                   `json:"projectId"`
	Stage         string                   `json:"stage"`
	Team          string                   `json:"team"`
	Tags          []Tag                    `json:"tags"`
	Advanced      []map[string]interface{} `json:"advanced"`
	CookieCut     bool                     `json:"cookiecut"`
}

type WorkflowResponse struct {
	BlueprintName string                   `json:"blueprintName"`
	Blueprint     string                   `json:"blueprint"`
	Name          string                   `json:"name"`
	ProjectID     string                   `json:"projectId"`
	Stage         string                   `json:"stage"`
	Team          string                   `json:"team"`
	Tags          []Tag                    `json:"tags"`
	Advanced      []map[string]interface{} `json:"advanced"`
	CookieCut     bool                     `json:"cookiecut"`
	Stack         Stack                    `json:"stack"`
}

// Blueprint represents the structure of a Pulumi blueprint
// Blueprint represents the structure of a Pulumi blueprint
type Blueprint struct {
	Name        string            `json:"name"`
	Author      string            `json:"author"`
	DisplayName string            `json:"displayName"`
	Description string            `json:"description"`
	Runtime     string            `json:"runtime"`
	Tags        map[string]string `json:"tags"`
}

// RuntimeObject represents the complex runtime structure
type RuntimeObject struct {
	Name    string                 `yaml:"name"`
	Options map[string]interface{} `yaml:"options"`
}

// PulumiYaml represents the structure of a Pulumi.yaml file
type PulumiYaml struct {
	Name        interface{} `yaml:"name"`        // Could be string or map
	Description interface{} `yaml:"description"` // Could be string or map
	Runtime     interface{} `yaml:"runtime"`     // Could be string or RuntimeObject
	Author      string      `yaml:"author"`
	Template    struct {
		DisplayName string                 `yaml:"displayName"`
		Description string                 `yaml:"description"`
		Config      map[string]interface{} `yaml:"config"`
		Metadata    map[string]interface{} `yaml:"metadata"`
	} `yaml:"template"`
	Config map[string]interface{} `yaml:"config"`
}

type LogLine struct {
	Header    string    `json:"header,omitempty"`
	Timestamp time.Time `json:"timestamp"`
	Line      string    `json:"line,omitempty"`
}

// LogResponse represents the response from the Pulumi logs API
type LogResponse struct {
	Lines     []LogLine `json:"lines"`
	NextToken string    `json:"nextToken,omitempty"`
}

type WorkflowPropertyOverride struct {
	Name     string `yaml:"name" json:"name"`
	Type     string `yaml:"type" json:"type"`
	Title    string `yaml:"title" json:"title"`
	Required bool   `yaml:"required" json:"required"`
}

type Workflow struct {
	WorkflowPropertyOverrides []WorkflowPropertyOverride `yaml:"properties" json:"properties"`
}

type Team struct {
	Kind        string `json:"kind"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Description string `json:"description"`
	UserRole    string `json:"userRole"`
}

// TeamsResponse represents the response for the list teams endpoint
type TeamsResponse struct {
	Teams []Team `json:"teams"`
}

type Environment0 struct {
	Organization string            `json:"organization"`
	Project      string            `json:"project"`
	Name         string            `json:"name"`
	Created      string            `json:"created"`
	Modified     string            `json:"modified"`
	Tags         map[string]string `json:"tags"`
}

// EnvironmentsResponse represents the response for the list environments endpoint
type EnvironmentsResponse0 struct {
	Environments      []Environment0 `json:"environments"`
	ContinuationToken string         `json:"continuationToken,omitempty"`
}
