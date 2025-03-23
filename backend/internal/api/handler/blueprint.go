package handler

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"net/http"
)

func (h *Handler) GetBlueprints(c echo.Context) error {
	blueprints, err := h.services.BlueprintService.GetBlueprints(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, blueprints)
}

func (h *Handler) GetBlueprintSchema(c echo.Context) error {
	name := c.Param("name")

	schema, err := h.services.BlueprintService.GetBlueprintSchema(c, name)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "GITHUB_TOKEN environment variable not set" {
			status = http.StatusInternalServerError
		} else if err.Error() == fmt.Sprintf("blueprint %s not found", name) {
			status = http.StatusNotFound
		}

		return c.JSON(status, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, schema)
}
func (h *Handler) GetBlueprintUISchema(c echo.Context) error {
	name := c.Param("name")

	uiSchema, err := h.services.BlueprintService.GetBlueprintUISchema(c, name)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "GITHUB_TOKEN environment variable not set" {
			status = http.StatusInternalServerError
		} else if err.Error() == fmt.Sprintf("blueprint %s not found", name) {
			status = http.StatusNotFound
		}

		return c.JSON(status, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, uiSchema)
}
