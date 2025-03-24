package service

import (
	"github.com/pulumi-idp/internal/config"
	"github.com/pulumi-idp/internal/repository"
)

// Service contains all services
type Service struct {
	PulumiService    *PulumiService
	BlueprintService *BlueprintService
	GitHubService    *GitHubService
	WorkloadService  *WorkloadService
}

// NewService creates a new service instance with all services
func NewService(_ *repository.Repository, cfg *config.Config) *Service {
	pulumiService := NewPulumiService(cfg)
	blueprintService := NewBlueprintService(cfg)
	githubService := NewGitHubService(cfg)
	workloadService := NewWorkloadService(cfg)

	// Set dependencies
	workloadService.SetPulumiService(pulumiService)
	workloadService.SetBlueprintService(blueprintService)
	workloadService.SetGitHubService(githubService)

	return &Service{
		PulumiService:    pulumiService,
		BlueprintService: blueprintService,
		GitHubService:    githubService,
		WorkloadService:  workloadService,
	}
}
