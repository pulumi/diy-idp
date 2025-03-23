package main

import (
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/pulumi-idp/internal/api/handler"
	"github.com/pulumi-idp/internal/config"
	cleanup "github.com/pulumi-idp/internal/cron"
	"github.com/pulumi-idp/internal/database"
	"github.com/pulumi-idp/internal/repository"
	"github.com/pulumi-idp/internal/service"
	"github.com/pulumi-idp/router"
	"log"
	"net/http"
)

func main() {

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or unable to load, continuing with environment variables.")
	}

	cfg := config.Load()

	db, err := database.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	repos := repository.NewRepository(db)
	services := service.NewService(repos, cfg)

	deletionCriteria := cleanup.StackDeletionCriteria{
		DeletionTags: cleanup.DeletionTags{
			Key:   "idp:auto-delete",
			Value: "true",
		},
	}
	r := router.New()

	cleanupService := cleanup.NewStackCleanupService(cfg, deletionCriteria, r.StdLogger)

	if err := cleanupService.Start(); err != nil {
		r.Logger.Fatalf("Failed to start stack cleanup service: %v", err)
	}

	r.Use(middleware.Logger())
	r.Use(middleware.Recover())
	r.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"*"}, // Adjust for production
		AllowMethods:     []string{http.MethodGet, http.MethodPut, http.MethodPost, http.MethodDelete},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))
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
