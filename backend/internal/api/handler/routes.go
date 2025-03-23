package handler

import (
	"github.com/labstack/echo/v4"
)

func (h *Handler) Register(v1 *echo.Group) {
	github := v1.Group("/github")
	github.POST("/token", h.HandleGitHubToken)

	blueprint := v1.Group("/blueprints")
	blueprint.GET("", h.GetBlueprints)
	blueprint.GET("/:name/schema", h.GetBlueprintSchema)
	blueprint.GET("/:name/ui-schema", h.GetBlueprintUISchema)

	workflow := v1.Group("/workflows")
	workflow.GET("/schema", h.GetWorkflowSchema)
	workflow.POST("", h.CreateWorkflow)
	workflow.PUT("/:organization/:project/:stack", h.UpdateWorkflow)
	workflow.DELETE("/:organization/:project/:stack", h.DeleteWorkflow)
	workflow.GET("", h.GetWorkflows)
	workflow.GET("/:organization/:project/:stack", h.GetWorkflowDetails)

	workflow.GET("/:organization/:project/:stack/deployments/:deploymentID/logs", h.GetDeploymentLogs)

	// WebSocket endpoint for streaming logs
	workflow.GET("/ws/:organization/:project/:stack/deployments/:deploymentID/logs", h.StreamDeploymentLogsWS)
}
