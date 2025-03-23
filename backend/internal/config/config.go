package config

import (
	"os"
	"strconv"
	"time"

	"github.com/pulumi-idp/internal/database"
	"gorm.io/gorm/logger"
)

// Config holds all application configuration
type Config struct {
	Server   ServerConfig
	Database database.Config
	GitHub   GitHubConfig
	Pulumi   PulumiConfig
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
	APIBaseURL   string
	APIToken     string
	APIVersion   string
	Organization string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         getEnv("PORT", "3000"),
			ReadTimeout:  time.Duration(getEnvAsInt("SERVER_READ_TIMEOUT", 10)) * time.Second,
			WriteTimeout: time.Duration(getEnvAsInt("SERVER_WRITE_TIMEOUT", 10)) * time.Second,
		},
		Database: database.Config{
			Driver:          getEnv("DB_DRIVER", "sqlite"),
			ConnectionURL:   getEnv("DB_CONNECTION_URL", "pulumi-idp.db"),
			MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
			MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 100),
			ConnMaxLifetime: time.Duration(getEnvAsInt("DB_CONN_MAX_LIFETIME", 30)) * time.Minute,
			LogLevel:        logger.LogLevel(getEnvAsInt("DB_LOG_LEVEL", 1)),
		},
		GitHub: GitHubConfig{
			ClientID:     getEnv("GITHUB_CLIENT_ID", ""),
			ClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
			RedirectURI:  getEnv("GITHUB_REDIRECT_URI", ""),
			Token:        getEnv("GITHUB_TOKEN", ""),
		},
		Pulumi: PulumiConfig{
			APIBaseURL:   getEnv("PULUMI_BASE_URL", "https://api.pulumi.com"),
			APIToken:     getEnv("PULUMI_ACCESS_TOKEN", ""),
			Organization: getEnv("PULUMI_ORGANIZATION", ""),
			APIVersion:   "application/vnd.pulumi+8",
		},
	}
}

// getEnv retrieves environment variable or returns default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
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
