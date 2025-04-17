package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all application configuration
type Config struct {
	Server ServerConfig
	GitHub GitHubConfig
	Pulumi PulumiConfig
	Cors   CorsConfig
}

type CorsConfig struct {
	AllowOrigin      []string
	AllowHeaders     []string
	AllowMethods     []string
	AllowCredentials bool
	ExposeHeaders    []string
	MaxAge           int
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

// GitHubConfig holds GitHub-related configuration
type GitHubConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	Token        string
}

type PulumiConfig struct {
	APIBaseURL                 string
	APIToken                   string
	APIVersion                 string
	Organization               string
	BlueprintGithubLocation    string
	WorkloadDefinitionLocation string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         getEnv("PORT", "3000"),
			ReadTimeout:  time.Duration(getEnvAsInt("SERVER_READ_TIMEOUT", 10)) * time.Second,
			WriteTimeout: time.Duration(getEnvAsInt("SERVER_WRITE_TIMEOUT", 10)) * time.Second,
		},
		GitHub: GitHubConfig{
			ClientID:     getEnv("GITHUB_CLIENT_ID", ""),
			ClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
			RedirectURI:  getEnv("GITHUB_REDIRECT_URI", ""),
			Token:        getEnv("GITHUB_TOKEN", ""),
		},
		Pulumi: PulumiConfig{
			APIBaseURL:                 getEnv("PULUMI_BASE_URL", "https://api.pulumi.com"),
			APIToken:                   getEnv("PULUMI_ACCESS_TOKEN", ""),
			Organization:               getEnv("PULUMI_ORGANIZATION", ""),
			APIVersion:                 "application/vnd.pulumi+8",
			BlueprintGithubLocation:    getEnv("PULUMI_BLUEPRINT_GITHUB_LOCATION", ""),
			WorkloadDefinitionLocation: getEnv("PULUMI_WORKLOAD_DEFINITION_LOCATION", ""),
		},
		Cors: CorsConfig{
			AllowOrigin:      getEnvAsArray("CORS_ALLOW_ORIGIN", []string{"*"}),
			AllowHeaders:     getEnvAsArray("CORS_ALLOW_HEADERS", []string{"*"}),
			AllowMethods:     getEnvAsArray("CORS_ALLOW_METHODS", []string{"*"}),
			AllowCredentials: getEnvAsBool("CORS_ALLOW_CREDENTIALS", true),
			ExposeHeaders:    getEnvAsArray("CORS_EXPOSE_HEADERS", []string{"Content-Length", "Content-Type", "Access-Control-Allow-Origin"}),
			MaxAge:           getEnvAsInt("CORS_MAX_AGE", 86400), // 24 hours
		},
	}
}

// getEnvAsArray retrieves environment variable as a slice of strings
func getEnvAsArray(key string, defaultValue []string) []string {
	if valueStr, exists := os.LookupEnv(key); exists {
		return strings.Split(valueStr, ",")
	}
	return defaultValue
}

// getEnv retrieves environment variable or returns default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getEnvAsBool retrieves environment variable as boolean or returns default value
func getEnvAsBool(key string, defaultValue bool) bool {
	if valueStr, exists := os.LookupEnv(key); exists {
		value, err := strconv.ParseBool(valueStr)
		if err == nil {
			return value
		}
	}
	return defaultValue
}

// getEnvAsInt retrieves environment variable as integer or returns default value
func getEnvAsInt(key string, defaultValue int) int {
	if valueStr, exists := os.LookupEnv(key); exists {
		value, err := strconv.Atoi(valueStr)
		if err == nil {
			return value
		}
	}
	return defaultValue
}
