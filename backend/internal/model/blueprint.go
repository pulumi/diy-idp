package model

type PropertyOverride struct {
	Name      string        `yaml:"name" json:"name"`
	Type      string        `yaml:"type" json:"type"`
	Title     string        `yaml:"title" json:"title"`
	Default   string        `yaml:"default" json:"default"`
	Enum      []string      `yaml:"enum" json:"enum"`
	EnumNames []string      `yaml:"enumNames" json:"enumNames"`
	Items     []interface{} `yaml:"items" json:"items"`
}

type Stage struct {
	Name         string   `yaml:"name" json:"name"`
	Environments []string `yaml:"environments" json:"environments"`
}

type BlueprintO struct {
	Name              string             `yaml:"name" json:"name"`
	DisplayName       string             `yaml:"displayName" json:"displayName"`
	Icon              string             `yaml:"icon" json:"icon"`
	Description       string             `yaml:"description" json:"description"`
	Git               string             `yaml:"git" json:"git"`
	Lifecycle         string             `yaml:"lifecycle" json:"lifecycle"`
	PropertyOverrides []PropertyOverride `yaml:"property-overrides" json:"property-overrides"`
	Environments      []string           `yaml:"environments" json:"environments"`
	Stages            []Stage            `yaml:"stages" json:"stages"`
}

type BlueprintConfig struct {
	Blueprints []BlueprintO `yaml:"blueprints" json:"blueprints"`
}

// Environment represents an environment
type Environment struct {
	Name    string `json:"name"`
	Project string `json:"project"`
}

// EnvironmentsResponse represents a response containing environments
type EnvironmentsResponse struct {
	Environments []Environment `json:"environments"`
}
