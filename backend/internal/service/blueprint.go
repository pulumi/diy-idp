package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/google/go-github/github"
	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/config"
	"github.com/pulumi-idp/internal/model"
	"golang.org/x/oauth2"
	"gopkg.in/yaml.v3"
)

// BlueprintService implements BlueprintServiceInterface
type BlueprintService struct {
	cfg        *config.Config
	httpClient *http.Client
}

// NewBlueprintService creates a new BlueprintService instance
func NewBlueprintService(cfg *config.Config) *BlueprintService {
	return &BlueprintService{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetBlueprints retrieves all available blueprints
func (s *BlueprintService) GetBlueprints(c echo.Context) ([]model.Blueprint, error) {
	cacheFilePath := "blueprints_cache.json"
	cacheExpiration := 24 * time.Hour // Cache expires after 24 hours

	// Try to read from cache first
	blueprints, cacheValid := readFromCache(c, cacheFilePath, cacheExpiration)
	if cacheValid {
		c.Logger().Infof("Using cached blueprints data")
		return blueprints, nil
	}

	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: s.cfg.GitHub.Token},
	)
	tc := oauth2.NewClient(ctx, ts)
	client := github.NewClient(tc)

	// Get repository content (top-level directories)

	blueprintsGitHubLocation := s.cfg.Pulumi.BlueprintGithubLocation
	owner := strings.Split(blueprintsGitHubLocation, "/")[0]
	repo := strings.Split(blueprintsGitHubLocation, "/")[1]

	var path string
	if len(strings.Split(blueprintsGitHubLocation, "/")) > 2 {
		path = strings.Split(blueprintsGitHubLocation, "/")[2]
	} else {
		path = ""
	}

	_, directoryContent, _, err := client.Repositories.GetContents(
		ctx,
		owner,
		repo,
		path,
		&github.RepositoryContentGetOptions{},
	)
	if err != nil {
		c.Logger().Errorf("Failed to get repository contents: %v", err)
		return nil, fmt.Errorf("failed to retrieve repository contents: %w", err)
	}

	blueprints = []model.Blueprint{}

	// Iterate through directories
	for _, content := range directoryContent {
		if *content.Type == "dir" {
			// Skip directories that typically don't contain Pulumi.yaml
			if *content.Name == "scripts" {
				continue
			}

			// For each directory, try to get the Pulumi.yaml file
			fileContent, _, _, err := client.Repositories.GetContents(
				ctx,
				owner,
				repo,
				fmt.Sprintf("%s/Pulumi.yaml", *content.Path),
				&github.RepositoryContentGetOptions{},
			)

			if err != nil {
				c.Logger().Debugf("No Pulumi.yaml found in directory %s: %v", *content.Name, err)
				continue
			}

			// Decode file content
			contentStr, err := fileContent.GetContent()
			if err != nil {
				c.Logger().Debugf("Failed to decode Pulumi.yaml content in %s: %v", *content.Name, err)
				continue
			}

			// Parse YAML content
			var pulumiYaml model.PulumiYaml
			err = yaml.Unmarshal([]byte(contentStr), &pulumiYaml)
			if err != nil {
				c.Logger().Debugf("Failed to parse Pulumi.yaml in %s: %v", *content.Name, err)
				continue
			}

			// Log the actual structure of the runtime field for debugging
			c.Logger().Debugf("Runtime field type: %v in %s", reflect.TypeOf(pulumiYaml.Runtime), *content.Name)

			// Extract runtime using helper function
			runtime := getRuntime(pulumiYaml.Runtime)

			// Add blueprint to the list using the folder name and template description
			blueprint := model.Blueprint{
				Name:        *content.Name,
				Author:      pulumiYaml.Author,
				DisplayName: pulumiYaml.Template.DisplayName,
				Description: pulumiYaml.Template.Description,
				Runtime:     runtime,
			}

			tags := pulumiYaml.Config["pulumi:tags"]
			blueprint.Tags = make(map[string]string)
			if tags != nil {
				for _, v := range tags.(map[string]interface{}) {
					for k2, tag2 := range v.(map[string]interface{}) {
						blueprint.Tags[k2] = tag2.(string)
					}
				}
			}

			c.Logger().Debugf("Successfully parsed blueprint: %s with runtime: %s", blueprint.Name, blueprint.Runtime)
			blueprints = append(blueprints, blueprint)
		}
	}

	// Save results to cache
	saveToCache(c, cacheFilePath, blueprints)

	return blueprints, nil
}

// getRuntime extracts the runtime name from different possible formats
func getRuntime(runtimeField interface{}) string {
	// If it's a string, return directly
	if runtimeStr, ok := runtimeField.(string); ok {
		return runtimeStr
	}

	// If it's a map, try to extract the name
	if runtimeMap, ok := runtimeField.(map[string]interface{}); ok {
		if name, exists := runtimeMap["name"]; exists {
			if nameStr, ok := name.(string); ok {
				return nameStr
			}
		}
	}

	// Try to marshal/unmarshal to handle complex types
	if runtimeField != nil {
		var runtimeObj model.RuntimeObject
		// Convert to YAML and back to structured object
		yamlBytes, err := yaml.Marshal(runtimeField)
		if err == nil {
			err = yaml.Unmarshal(yamlBytes, &runtimeObj)
			if err == nil && runtimeObj.Name != "" {
				return runtimeObj.Name
			}
		}
	}

	return "unknown"
}

// GetBlueprintSchema retrieves the JSON schema for a specific blueprint
func (s *BlueprintService) GetBlueprintSchema(c echo.Context, name string) (map[string]interface{}, error) {
	// Fetch from GitHub
	ctx := context.Background()

	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: s.cfg.GitHub.Token},
	)
	tc := oauth2.NewClient(ctx, ts)
	client := github.NewClient(tc)

	blueprintsGitHubLocation := s.cfg.Pulumi.BlueprintGithubLocation
	owner := strings.Split(blueprintsGitHubLocation, "/")[0]
	repo := strings.Split(blueprintsGitHubLocation, "/")[1]

	// Get the Pulumi.yaml file for the specified blueprint
	fileContent, _, _, err := client.Repositories.GetContents(
		ctx,
		owner,
		repo,
		fmt.Sprintf("%s/Pulumi.yaml", name),
		&github.RepositoryContentGetOptions{},
	)

	if err != nil {
		c.Logger().Errorf("Failed to get Pulumi.yaml for blueprint %s: %v", name, err)
		return nil, fmt.Errorf("blueprint %s not found: %w", name, err)
	}

	// Decode file content
	contentStr, err := fileContent.GetContent()
	if err != nil {
		c.Logger().Errorf("Failed to decode Pulumi.yaml content for %s: %v", name, err)
		return nil, fmt.Errorf("failed to read blueprint configuration: %w", err)
	}

	// Parse YAML content
	var pulumiYaml model.PulumiYaml
	err = yaml.Unmarshal([]byte(contentStr), &pulumiYaml)
	if err != nil {
		c.Logger().Errorf("Failed to parse Pulumi.yaml for %s: %v", name, err)
		return nil, fmt.Errorf("failed to parse blueprint configuration: %w", err)
	}

	// Convert the config to property overrides
	var propertyOverrides []model.PropertyOverride

	for propName, propConfigRaw := range pulumiYaml.Template.Config {
		po := model.PropertyOverride{
			Name: propName,
			Type: "string", // Default type
		}

		// Process the config property based on its actual type
		switch config := propConfigRaw.(type) {
		case map[interface{}]interface{}:
			// This is typically how YAML parses nested maps
			if descVal, ok := config["displayName"]; ok {
				if desc, ok := descVal.(string); ok {
					po.Title = desc
				}
			}

			if typeVal, ok := config["type"]; ok {
				if typeStr, ok := typeVal.(string); ok {
					po.Type = typeStr
				}
			}

			if defaultVal, ok := config["default"]; ok {
				po.Default = fmt.Sprintf("%v", defaultVal)
			}

			if secretVal, ok := config["secret"]; ok {
				if boolVal, ok := secretVal.(bool); ok && boolVal {
					c.Logger().Debugf("Config %s is marked as secret", propName)
				}
			}

			if enumVal, ok := config["enum"]; ok {
				if enumArr, ok := enumVal.([]interface{}); ok {
					enum := make([]string, len(enumArr))
					for i, e := range enumArr {
						enum[i] = fmt.Sprintf("%v", e)
					}
					po.Enum = enum
				}
			}

			if enumNamesVal, ok := config["enumNames"]; ok {
				if enumArr, ok := enumNamesVal.([]interface{}); ok {
					enumNames := make([]string, len(enumArr))
					for i, e := range enumArr {
						enumNames[i] = fmt.Sprintf("%v", e)
					}
					po.EnumNames = enumNames
				}
			}

		case map[string]interface{}:
			// This could happen if the YAML parser already converted the keys to strings
			if descVal, ok := config["displayName"]; ok {
				if desc, ok := descVal.(string); ok {
					po.Title = desc
				}
			}

			if typeVal, ok := config["type"]; ok {
				if typeStr, ok := typeVal.(string); ok {
					po.Type = typeStr
				}
			}

			if defaultVal, ok := config["default"]; ok {
				po.Default = fmt.Sprintf("%v", defaultVal)
			}

			if secretVal, ok := config["secret"]; ok {
				if boolVal, ok := secretVal.(bool); ok && boolVal {
					c.Logger().Debugf("Config %s is marked as secret", propName)
				}
			}

			if enumVal, ok := config["enum"]; ok {
				if enumArr, ok := enumVal.([]interface{}); ok {
					enum := make([]string, len(enumArr))
					for i, e := range enumArr {
						enum[i] = fmt.Sprintf("%v", e)
					}
					po.Enum = enum
				}
			}

			if enumNamesVal, ok := config["enumNames"]; ok {
				if enumArr, ok := enumNamesVal.([]interface{}); ok {
					enumNames := make([]string, len(enumArr))
					for i, e := range enumArr {
						enumNames[i] = fmt.Sprintf("%v", e)
					}
					po.EnumNames = enumNames
				}
			}

		case string:
			// If config is just a string, use it as the description/title
			po.Title = config

		default:
			// For any other type, try to get a string representation
			c.Logger().Debugf("Unexpected config type for %s: %T", propName, propConfigRaw)
			if str, ok := propConfigRaw.(string); ok {
				po.Title = str
			} else {
				po.Title = fmt.Sprintf("%v", propConfigRaw)
			}
		}

		propertyOverrides = append(propertyOverrides, po)
	}

	// Create blueprint object
	blueprintConfig := model.BlueprintO{
		DisplayName:       pulumiYaml.Template.DisplayName,
		Description:       pulumiYaml.Template.Description,
		PropertyOverrides: propertyOverrides,
	}

	// If there's metadata in the template, you might want to handle it here
	if len(pulumiYaml.Template.Metadata) > 0 {
		c.Logger().Debugf("Blueprint %s has metadata: %v", name, pulumiYaml.Template.Metadata)
		// Optionally add metadata to the blueprint or schema
	}

	// Get the ESC tag value safely
	var escTag string
	if escTagVal, ok := pulumiYaml.Config["esc:tag"]; ok {
		if escTagStr, ok := escTagVal.(string); ok {
			escTag = escTagStr
		}
	}

	schema := s.convertToJSONSchema(blueprintConfig.PropertyOverrides, escTag, blueprintConfig.DisplayName, blueprintConfig.Description)

	return schema, nil
}

// GetBlueprintUISchema retrieves the UI schema for a specific blueprint
func (s *BlueprintService) GetBlueprintUISchema(c echo.Context, name string) (map[string]map[string]interface{}, error) {
	// Fetch from GitHub
	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: s.cfg.GitHub.Token},
	)
	tc := oauth2.NewClient(ctx, ts)
	client := github.NewClient(tc)

	blueprintsGitHubLocation := s.cfg.Pulumi.BlueprintGithubLocation
	owner := strings.Split(blueprintsGitHubLocation, "/")[0]
	repo := strings.Split(blueprintsGitHubLocation, "/")[1]

	// Get the Pulumi.yaml file for the specified blueprint
	fileContent, _, _, err := client.Repositories.GetContents(
		ctx,
		owner,
		repo,
		fmt.Sprintf("%s/Pulumi.yaml", name),
		&github.RepositoryContentGetOptions{},
	)

	if err != nil {
		c.Logger().Errorf("Failed to get Pulumi.yaml for blueprint %s: %v", name, err)
		return nil, fmt.Errorf("blueprint %s not found: %w", name, err)
	}

	// Decode file content
	contentStr, err := fileContent.GetContent()
	if err != nil {
		c.Logger().Errorf("Failed to decode Pulumi.yaml content for %s: %v", name, err)
		return nil, fmt.Errorf("failed to read blueprint configuration: %w", err)
	}

	// Parse YAML content
	var pulumiYaml model.PulumiYaml
	err = yaml.Unmarshal([]byte(contentStr), &pulumiYaml)
	if err != nil {
		c.Logger().Errorf("Failed to parse Pulumi.yaml for %s: %v", name, err)
		return nil, fmt.Errorf("failed to parse blueprint configuration: %w", err)
	}

	// Create UI Schema JSON
	uiSchema := map[string]map[string]interface{}{
		"advanced": {
			"items": make(map[string]interface{}),
		},
	}

	// Process each config property
	for propName, propConfigRaw := range pulumiYaml.Template.Config {
		uiFieldSchema := make(map[string]interface{})

		// Extract property details based on the type of the config
		switch config := propConfigRaw.(type) {
		case map[interface{}]interface{}:
			// Process description
			if descVal, ok := config["description"]; ok {
				if desc, ok := descVal.(string); ok && desc != "" {
					uiFieldSchema["ui:description"] = desc
					uiFieldSchema["ui:enableMarkdownInDescription"] = true
				}
			}

			// Check if it's a secret
			if secretVal, ok := config["secret"]; ok {
				if boolVal, ok := secretVal.(bool); ok && boolVal {
					uiFieldSchema["ui:widget"] = "password"
					uiFieldSchema["ui:help"] = "This is a sensitive value"
				}
			}

			// Add specific widgets based on type if applicable
			if typeVal, ok := config["type"]; ok {
				if typeStr, ok := typeVal.(string); ok {
					switch typeStr {
					case "number", "integer":
						uiFieldSchema["ui:widget"] = "updown"
					case "boolean":
						// No special UI needed for boolean, the default checkbox works well
					case "array":
						// Could add specific array handling if needed
					case "object":
						// Could add specific object handling if needed
					}
				}
			}

			// Add placeholder if helpful
			if defaultVal, ok := config["default"]; ok {
				uiFieldSchema["ui:placeholder"] = fmt.Sprintf("Default: %v", defaultVal)
			}

		case map[string]interface{}:
			// Process description
			if descVal, ok := config["description"]; ok {
				if desc, ok := descVal.(string); ok && desc != "" {
					uiFieldSchema["ui:help"] = desc
					uiFieldSchema["ui:enableMarkdownInDescription"] = true
				}
			}

			// Check if it's a secret
			if secretVal, ok := config["secret"]; ok {
				if boolVal, ok := secretVal.(bool); ok && boolVal {
					uiFieldSchema["ui:widget"] = "password"
				}
			}

			// Add specific widgets based on type if applicable
			if typeVal, ok := config["type"]; ok {
				if typeStr, ok := typeVal.(string); ok {
					switch typeStr {
					case "number", "integer":
						uiFieldSchema["ui:widget"] = "updown"
					case "boolean":
						// No special UI needed for boolean, the default checkbox works well
					case "array":
						// Could add specific array handling if needed
					case "object":
						// Could add specific object handling if needed
					}
				}
			}

			// Add placeholder if helpful
			if defaultVal, ok := config["default"]; ok {
				uiFieldSchema["ui:placeholder"] = fmt.Sprintf("Default: %v", defaultVal)
				uiFieldSchema["ui:widget"] = "DefaultValueOverrideWidget"
			}

		case string:
			// If config is just a string, it's a simple description
			if config != "" {
				uiFieldSchema["ui:description"] = config
				uiFieldSchema["ui:enableMarkdownInDescription"] = true
			}
		}

		// Only add the property to the UI schema if we have UI elements to specify
		if len(uiFieldSchema) > 0 {
			// Add this property to the items map without overwriting the existing entries
			uiSchema["advanced"]["items"].(map[string]interface{})[propName] = uiFieldSchema
		}
	}

	return uiSchema, nil
}

// ReadFromCache reads blueprints from the cache file if it exists and is not expired
func readFromCache(c echo.Context, cacheFilePath string, cacheExpiration time.Duration) ([]model.Blueprint, bool) {
	// Check if cache file exists
	fileInfo, err := os.Stat(cacheFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			c.Logger().Debugf("Cache file does not exist: %s", cacheFilePath)
		} else {
			c.Logger().Warnf("Error checking cache file: %v", err)
		}
		return nil, false
	}

	// Check if cache is expired
	if time.Since(fileInfo.ModTime()) > cacheExpiration {
		c.Logger().Debugf("Cache is expired: %s", cacheFilePath)
		return nil, false
	}

	// Read cache file
	cacheData, err := os.ReadFile(cacheFilePath)
	if err != nil {
		c.Logger().Warnf("Error reading cache file: %v", err)
		return nil, false
	}

	// Parse cache data
	var blueprints []model.Blueprint
	err = json.Unmarshal(cacheData, &blueprints)
	if err != nil {
		c.Logger().Warnf("Error parsing cache data: %v", err)
		return nil, false
	}

	// Cache is valid and parsed successfully
	return blueprints, true
}

// SaveToCache saves blueprints to the cache file
func saveToCache(c echo.Context, cacheFilePath string, blueprints []model.Blueprint) {
	// Serialize blueprints to JSON
	cacheData, err := json.Marshal(blueprints)
	if err != nil {
		c.Logger().Warnf("Error serializing blueprints to JSON: %v", err)
		return
	}

	// Write to cache file
	err = os.WriteFile(cacheFilePath, cacheData, 0644)
	if err != nil {
		c.Logger().Warnf("Error writing cache file: %v", err)
		return
	}

	c.Logger().Infof("Successfully updated cache file: %s", cacheFilePath)
}

// ConvertToJSONSchema converts property overrides to a JSON schema
func (s *BlueprintService) convertToJSONSchema(overrides []model.PropertyOverride, esc, name, description string) map[string]interface{} {
	properties := make(map[string]interface{})
	required := []string{}

	for _, override := range overrides {
		properties[override.Name] = map[string]interface{}{
			"type": override.Type,
		}
		if override.Title != "" {
			properties[override.Name].(map[string]interface{})["title"] = override.Title
		} else {
			properties[override.Name].(map[string]interface{})["title"] = override.Name
		}
		if len(override.Enum) > 0 {
			properties[override.Name].(map[string]interface{})["enum"] = override.Enum
		}
		if len(override.EnumNames) > 0 {
			properties[override.Name].(map[string]interface{})["enumNames"] = override.EnumNames
		}
		if override.Default != "" {
			properties[override.Name].(map[string]interface{})["default"] = override.Default
		}
		if len(override.Items) > 0 {
			properties[override.Name].(map[string]interface{})["items"] = override.Items
		}

		if override.Default == "" {
			required = append(required, override.Name)
		}
	}

	var escEnvironment map[string]interface{}
	if esc != "" {
		environmentsResp, err := s.GetEnvironmentsForUserAndTag("", esc)
		if err == nil && environmentsResp != nil {
			oneOfOptions := make([]map[string]interface{}, 0, len(environmentsResp.Environments))

			for _, env := range environmentsResp.Environments {
				option := map[string]interface{}{
					"const": fmt.Sprintf("%s/%s", env.Project, env.Name),
					"title": env.Name,
				}
				oneOfOptions = append(oneOfOptions, option)
			}

			escEnvironment = map[string]interface{}{
				"type":  "string",
				"oneOf": oneOfOptions,
			}
		} else {
			fmt.Printf("Error fetching environments: %v\n", err)
		}
	}

	return map[string]interface{}{
		"type":        "object",
		"stage":       escEnvironment,
		"properties":  properties,
		"required":    required,
		"title":       name,
		"description": description,
	}
}

// GetEnvironmentsForUserAndTag retrieves environments for a user and tag
func (s *BlueprintService) GetEnvironmentsForUserAndTag(continuationToken, tag string) (*model.EnvironmentsResponse0, error) {
	url := fmt.Sprintf("%s/esc/environments/%s", s.cfg.Pulumi.APIBaseURL, s.cfg.Pulumi.Organization)

	if continuationToken != "" {
		url = fmt.Sprintf("%s?continuationToken=%s", url, continuationToken)
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

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}
	var envResponse model.EnvironmentsResponse0
	if err := json.Unmarshal(body, &envResponse); err != nil {
		return nil, fmt.Errorf("error unmarshaling response: %w", err)
	}

	envResponse.Environments = filterByNameTag(envResponse.Environments, tag)

	return &envResponse, nil
}

func filterByNameTag(environments []model.Environment0, nameValue string) []model.Environment0 {
	var filtered []model.Environment0
	for _, env := range environments {
		if value, exists := env.Tags["esc"]; exists && value == nameValue {
			filtered = append(filtered, env)
		}
	}
	return filtered
}
