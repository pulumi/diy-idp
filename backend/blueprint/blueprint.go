package blueprint

import (
	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/model"
)

type Service interface {
	GetBlueprints(ctx echo.Context) ([]model.Blueprint, error)
	GetBlueprintSchema(ctx echo.Context, name string) (map[string]interface{}, error)
	GetBlueprintUISchema(ctx echo.Context, name string) (map[string]map[string]interface{}, error)
	GetEnvironmentsForUserAndTag(user, tag string) (*model.EnvironmentsResponse0, error)
}
