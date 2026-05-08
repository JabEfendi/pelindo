package config

import (
	"os"
	"strconv"
)

// Config menampung semua pengaturan aplikasi yang dibaca dari environment variable.
// Kalau ada nilai yang tidak diset, sudah disiapkan nilai defaultnya agar aplikasi tetap bisa jalan.
type Config struct {
	// Pengaturan server HTTP
	ServerPort string

	// Pengaturan koneksi ke database PostgreSQL
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Pengaturan koneksi ke Redis (dipakai untuk caching)
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Pengaturan JWT untuk autentikasi
	JWTSecret          string
	JWTExpirationHours int
}

// Load membaca semua konfigurasi dari environment variable.
// Kalau suatu variable tidak ditemukan, nilai default yang sudah disiapkan akan dipakai.
func Load() *Config {
	jwtExp, _ := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	return &Config{
		ServerPort:         getEnv("SERVER_PORT", "8080"),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "postgres"),
		DBPassword:         getEnv("DB_PASSWORD", "postgres"),
		DBName:             getEnv("DB_NAME", "pelindo_db"),
		DBSSLMode:          getEnv("DB_SSL_MODE", "disable"),
		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		RedisDB:            redisDB,
		JWTSecret:          getEnv("JWT_SECRET", "super-secret-jwt-key-change-in-production"),
		JWTExpirationHours: jwtExp,
	}
}

// getEnv adalah helper kecil untuk membaca environment variable.
// Mengembalikan nilai default kalau variable-nya kosong atau tidak ada.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
