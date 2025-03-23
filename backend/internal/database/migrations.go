package database

import (
	"gorm.io/gorm"
)

// RunMigrations performs database migrations
func RunMigrations(db *gorm.DB) error {
	// Auto-migrate models
	return db.AutoMigrate()
}
