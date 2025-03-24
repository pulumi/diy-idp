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

	workload := v1.Group("/workloads")
	workload.GET("/schema", h.GetWorkloadSchema)
	workload.POST("", h.CreateWorkload)
	workload.PUT("/:organization/:project/:stack", h.UpdateWorkload)
	workload.DELETE("/:organization/:project/:stack", h.DeleteWorkload)
	workload.GET("", h.GetWorkloads)
	workload.GET("/:organization/:project/:stack", h.GetWorkloadDetails)

	workload.GET("/:organization/:project/:stack/deployments/:deploymentID/logs", h.GetDeploymentLogs)

	// WebSocket endpoint for streaming logs
	workload.GET("/ws/:organization/:project/:stack/deployments/:deploymentID/logs", h.StreamDeploymentLogsWS)
}
