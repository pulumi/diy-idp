package main

import (
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/api/handler"
	"github.com/pulumi-idp/internal/config"
	cleanup "github.com/pulumi-idp/internal/cron"
	"github.com/pulumi-idp/internal/repository"
	"github.com/pulumi-idp/internal/service"
	"github.com/pulumi-idp/router"
	"log"
)

func main() {

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or unable to load, continuing with environment variables.")
	}

	cfg := config.Load()

	repos := repository.NewRepository()
	services := service.NewService(repos, cfg)

	deletionCriteria := cleanup.StackDeletionCriteria{
		DeletionTags: cleanup.DeletionTags{
			Key:   "idp:auto-delete",
			Value: "true",
		},
	}
	r := router.New(cfg)

	cleanupService := cleanup.NewStackCleanupService(cfg, deletionCriteria, r.StdLogger)
	if err := cleanupService.Start(); err != nil {
		r.Logger.Fatalf("Failed to start stack cleanup service: %v", err)
	}

	// healthcheck
	r.GET("/", func(c echo.Context) error {
		return c.String(200, "Pulumi IDP API")
	})

	v1 := r.Group("/api")
	h := handler.NewHandler(services, cfg)
	h.Register(v1)

	port := cfg.Server.Port
	if port == "" {
		port = "3000"
	}
	log.Printf("Server running on port %s\n", port)
	r.Logger.Fatal(r.Start(":" + port))
}
