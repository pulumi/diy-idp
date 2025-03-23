package repository

import (
	"gorm.io/gorm"
)

// Repository contains all repositories
type Repository struct {
}

// NewRepository creates a new repository instance with all repositories
func NewRepository(_ *gorm.DB) *Repository {
	return &Repository{}
}
