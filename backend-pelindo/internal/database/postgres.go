package database

import (
	"fmt"

	"github.com/backend-pelindo/internal/config"
	"github.com/backend-pelindo/internal/logger"
	"github.com/backend-pelindo/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

// NewPostgresDB membuka koneksi ke PostgreSQL lalu menjalankan auto-migrate.
// Auto-migrate otomatis membuat atau menyesuaikan tabel sesuai struct model
// yang sudah didaftarkan, jadi tidak perlu repot bikin SQL migration manual.
func NewPostgresDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		// Menggunakan mode Silent supaya log SQL dari GORM tidak memenuhi konsol.
		// Kalau perlu debug query SQL, ganti ke gormLogger.Info.
		Logger: gormLogger.Default.LogMode(gormLogger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("gagal terhubung ke postgres: %w", err)
	}

	// Mendaftarkan semua model di sini supaya tabelnya otomatis terbuat saat startup.
	if err := db.AutoMigrate(&models.User{}, &models.Task{}); err != nil {
		return nil, fmt.Errorf("gagal menjalankan migrasi: %w", err)
	}

	logger.Info("PostgreSQL berhasil terhubung dan migrasi sudah diterapkan")
	return db, nil
}
