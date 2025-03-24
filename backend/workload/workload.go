package workload

import (
	"context"
	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/model"
)

type Service interface {
	GetWorkloadSchema(ctx echo.Context) (map[string]interface{}, error)
	GetWorkloads(ctx echo.Context, workload, projectID string) (*model.ListStacksResponse, error)
	DeleteWorkload(organization, project, stack string) error
	UpdateWorkload(organization, project, stack string, req *model.WorkloadRequest) error
	CreateWorkload(ctx context.Context, req *model.WorkloadRequest) (*model.RepoCreationResponse, error)
	GetWorkloadDetails(organization, project, stack string) (*model.WorkloadResponse, error)
	GetDeploymentLogs(organization, project, stack, deploymentID, continuationToken string) (*model.LogResponse, error)
}
