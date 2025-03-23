package handler

import (
	"github.com/go-playground/validator/v10"
	"github.com/pulumi-idp/internal/config"
	"github.com/pulumi-idp/internal/service"
)

// Handler contains all HTTP handlers dependencies
type Handler struct {
	services  *service.Service
	validator *validator.Validate
	cfg       *config.Config
}

// NewHandler creates a new handler instance
func NewHandler(services *service.Service, cfg *config.Config) *Handler {
	validate := validator.New()
	return &Handler{
		services:  services,
		validator: validate,
		cfg:       cfg,
	}
}
