package handlers

import (
	"net/http"

	"github.com/backend-pelindo/internal/logger"
	"github.com/backend-pelindo/internal/models"
	"github.com/backend-pelindo/internal/services"
	"github.com/gin-gonic/gin"
)

// AuthHandler menangani semua endpoint yang berkaitan dengan autentikasi pengguna.
type AuthHandler struct {
	authService services.AuthService
}

// NewAuthHandler membuat instance AuthHandler dengan service yang sudah disiapkan.
func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register menangani pendaftaran akun baru.
// POST /auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("validasi registrasi gagal", "err", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Register(c.Request.Context(), &req)
	if err != nil {
		logger.Error("registrasi pengguna gagal", "err", err)
		// Status 409 Conflict dipakai karena penyebab umumnya adalah duplikasi email.
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Akun berhasil didaftarkan",
		"data":    resp,
	})
}

// Login menangani proses masuk ke aplikasi.
// POST /auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("validasi login gagal", "err", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		// Catat email yang gagal login untuk keperluan audit keamanan.
		logger.Error("login gagal", "email", req.Email, "err", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
		"data":    resp,
	})
}
