package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/backend-pelindo/internal/config"
	"github.com/backend-pelindo/internal/database"
	"github.com/backend-pelindo/internal/handlers"
	"github.com/backend-pelindo/internal/logger"
	"github.com/backend-pelindo/internal/middleware"
	"github.com/backend-pelindo/internal/repository"
	"github.com/backend-pelindo/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Memuat variabel dari file .env kalau ada. Kalau tidak ada, membaca langsung dari OS — tidak masalah.
	if err := godotenv.Load(); err != nil {
		logger.Warn("file .env tidak ditemukan, membaca dari environment OS")
	}

	cfg := config.Load()

	// ── Menyambungkan ke Database ─────────────────────────────────────────────
	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		logger.Error("gagal terhubung ke PostgreSQL", "err", err)
		os.Exit(1)
	}

	// ── Menyambungkan ke Redis (opsional) ─────────────────────────────────────
	// Kalau Redis tidak bisa dijangkau, aplikasi tetap jalan — hanya tanpa fitur caching.
	redisClient, err := database.NewRedisClient(cfg)
	if err != nil {
		logger.Warn("Redis tidak tersedia, berjalan tanpa cache", "err", err)
		redisClient = nil
	}

	// ── Menginisialisasi Lapisan Repository ───────────────────────────────────
	taskRepo := repository.NewTaskRepository(db)
	userRepo := repository.NewUserRepository(db)

	// ── Menginisialisasi Lapisan Service ──────────────────────────────────────
	taskService := services.NewTaskService(taskRepo, redisClient)
	authService := services.NewAuthService(userRepo, cfg)

	// ── Menginisialisasi Lapisan Handler ──────────────────────────────────────
	taskHandler := handlers.NewTaskHandler(taskService)
	authHandler := handlers.NewAuthHandler(authService)

	// ── Mengonfigurasi Router ─────────────────────────────────────────────────
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(middleware.LoggerMiddleware()) // mencatat semua request yang masuk
	r.Use(gin.Recovery())               // menangkap panic agar server tidak ikut crash

	// Endpoint health check — berguna untuk monitoring dan load balancer.
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	// Rute autentikasi — terbuka untuk umum, tidak perlu token.
	auth := r.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
	}

	// Rute tugas — hanya bisa diakses oleh pengguna yang sudah login (ada token JWT valid).
	tasks := r.Group("/tasks")
	tasks.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		tasks.POST("", taskHandler.CreateTask)
		tasks.GET("", taskHandler.GetAllTasks)
		tasks.GET("/:id", taskHandler.GetTaskByID)
		tasks.PUT("/:id", taskHandler.UpdateTask)
		tasks.DELETE("/:id", taskHandler.DeleteTask)
	}

	// ── Menjalankan HTTP Server dengan Graceful Shutdown ──────────────────────
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.ServerPort),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Menjalankan server di goroutine terpisah supaya main goroutine bisa menunggu sinyal shutdown.
	go func() {
		logger.Info("server mulai berjalan", "port", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server berhenti karena error", "err", err)
			os.Exit(1)
		}
	}()

	// Menunggu sinyal SIGINT atau SIGTERM dari sistem operasi (misalnya Ctrl+C atau docker stop).
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("menerima sinyal shutdown, menutup server dengan aman...")

	// Memberi waktu maksimal 10 detik untuk menyelesaikan request yang sedang berjalan.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server terpaksa ditutup paksa", "err", err)
	}

	logger.Info("server berhasil ditutup dengan bersih")
}
