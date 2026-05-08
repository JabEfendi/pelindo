package database

import (
	"context"
	"fmt"

	"github.com/backend-pelindo/internal/config"
	"github.com/backend-pelindo/internal/logger"
	"github.com/redis/go-redis/v9"
)

// NewRedisClient membuat koneksi ke Redis lalu mengecek apakah Redis bisa dijangkau.
// Kalau Redis tidak tersedia, fungsi ini mengembalikan error — tapi di main.go sudah ditangani
// secara graceful: aplikasi tetap jalan tanpa cache, bukan langsung crash.
func NewRedisClient(cfg *config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	// Mengirim PING ke Redis untuk memastikan koneksinya benar-benar aktif.
	ctx := context.Background()
	if _, err := client.Ping(ctx).Result(); err != nil {
		return nil, fmt.Errorf("gagal terhubung ke redis: %w", err)
	}

	logger.Info("Redis berhasil terhubung", "addr", cfg.RedisAddr)
	return client, nil
}
