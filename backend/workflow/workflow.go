package workflow

import (
	"context"
	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/model"
)

type Service interface {
	GetWorkflowSchema(ctx echo.Context) (map[string]interface{}, error)
	GetWorkflows(ctx echo.Context, workflow, projectID string) (*model.ListStacksResponse, error)
	DeleteWorkflow(organization, project, stack string) error
	UpdateWorkflow(organization, project, stack string, req *model.WorkflowRequest) error
	CreateWorkflow(ctx context.Context, req *model.WorkflowRequest) (*model.RepoCreationResponse, error)
	GetWorkflowDetails(organization, project, stack string) (*model.WorkflowResponse, error)
	GetDeploymentLogs(organization, project, stack, deploymentID, continuationToken string) (*model.LogResponse, error)
}
