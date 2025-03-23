package handler

import (
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/model"
	"net/http"
	"time"
)

// GetWorkflowSchema handles the request to get the workflow JSON schema
func (h *Handler) GetWorkflowSchema(c echo.Context) error {
	schema, err := h.services.WorkflowService.GetWorkflowSchema(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}
	return c.JSON(http.StatusOK, schema)
}

// GetWorkflows handles the request to get all workflows
func (h *Handler) GetWorkflows(c echo.Context) error {
	workflow := c.QueryParam("workflow")
	projectID := c.QueryParam("projectid")

	stacks, err := h.services.WorkflowService.GetWorkflows(c, workflow, projectID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to list stacks: %v", err),
		})
	}

	return c.JSON(http.StatusOK, stacks)
}

// DeleteWorkflow handles the request to delete a workflow
func (h *Handler) DeleteWorkflow(c echo.Context) error {
	organization := c.Param("organization")
	project := c.Param("project")
	stack := c.Param("stack")

	if organization == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Organization is required",
		})
	}

	if project == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Project is required",
		})
	}

	if stack == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Stack is required",
		})
	}

	err := h.services.WorkflowService.DeleteWorkflow(organization, project, stack)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Workflow deleted successfully",
	})
}

// UpdateWorkflow handles the request to update a workflow
func (h *Handler) UpdateWorkflow(c echo.Context) error {
	organization := c.Param("organization")
	project := c.Param("project")
	stack := c.Param("stack")

	if organization == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Organization is required",
		})
	}

	if project == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Project is required",
		})
	}

	if stack == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Stack is required",
		})
	}

	req := new(model.WorkflowRequest)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	err := h.services.WorkflowService.UpdateWorkflow(organization, project, stack, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Workflow updated successfully",
	})
}

// CreateWorkflow handles the request to create a new workflow
func (h *Handler) CreateWorkflow(c echo.Context) error {
	ctx := c.Request().Context()

	req := new(model.WorkflowRequest)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Repository name is required",
		})
	}

	if req.Blueprint == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Pulumi template is required",
		})
	}

	response, err := h.services.WorkflowService.CreateWorkflow(ctx, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

// GetWorkflowDetails handles the request to get detailed information about a workflow
func (h *Handler) GetWorkflowDetails(c echo.Context) error {
	organization := c.Param("organization")
	project := c.Param("project")
	stack := c.Param("stack")

	response, err := h.services.WorkflowService.GetWorkflowDetails(organization, project, stack)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

// WebSocket upgrader configuration
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // This allows all origins, restrict in production
	},
}

// GetDeploymentLogs handles GET requests for deployment logs
func (h *Handler) GetDeploymentLogs(c echo.Context) error {
	organization := c.Param("organization")
	project := c.Param("project")
	stack := c.Param("stack")
	deploymentID := c.Param("deploymentID")
	continuationToken := c.QueryParam("continuationToken")

	logResponse, err := h.services.WorkflowService.GetDeploymentLogs(
		organization, project, stack, deploymentID, continuationToken)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, logResponse)
}

// StreamDeploymentLogsWS handles WebSocket connections for streaming logs
func (h *Handler) StreamDeploymentLogsWS(c echo.Context) error {
	organization := c.Param("organization")
	project := c.Param("project")
	stack := c.Param("stack")
	deploymentID := c.Param("deploymentID")

	// Upgrade HTTP connection to WebSocket
	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer ws.Close()

	// Start fetching logs
	var continuationToken string
	for {
		logResponse, err := h.services.WorkflowService.GetDeploymentLogs(
			organization, project, stack, deploymentID, continuationToken)

		if err != nil {
			ws.WriteJSON(map[string]string{
				"error": err.Error(),
			})
			break
		}

		// Send log lines to the client
		if err := ws.WriteJSON(logResponse); err != nil {
			break
		}

		// If there's no next token, we're done
		if logResponse.NextToken == "" {
			break
		}

		// Update the token for the next request
		continuationToken = logResponse.NextToken

		// Sleep a bit to avoid hammering the API
		time.Sleep(1 * time.Second)
	}

	return nil
}
