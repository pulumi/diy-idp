package pulumi

import (
	"github.com/pulumi-idp/internal/model"
)

type Service interface {
	SetStackTag(organization, project, stack string, tag model.Tag) error
	CreateStack(organization, project, stackName string) (*model.StackCreationResponse, error)
	DeleteStack(organization, project, stack string) error
	GetStack(project, stack string) (*model.Stack, error)
	ListStacks(options *model.ListStacksOptions) (*model.ListStacksResponse, error)
	CreateStackSettings(organization, project, stack, cloneUrl string) error
	DeleteDeployment(organization, project, stack string) error
	CreateDeployment(organization, project, stack, cloneUrl string) (*model.CreateDeploymentResponse, error)
	RunPulumiUp(pulumiProjectName, bluePrintName, cloneUrl string, pulumiConfig []map[string]interface{}, stage string)
	RunPulumiNew(tempDir, template, projectName, projectDesc string) error
	GetStackUpdates(params *model.ListStackUpdatesParams, project, stack string) (*model.StackDeploymentsResponse, error)
	GetTeams(organization, accessToken string) (*model.TeamsResponse, error)
	GrantStackAccessToTeam(organization, team, projectName, stackName string, permission int) error
}
