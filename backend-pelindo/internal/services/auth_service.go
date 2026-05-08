package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/backend-pelindo/internal/config"
	"github.com/backend-pelindo/internal/models"
	"github.com/backend-pelindo/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService menangani semua logika yang berkaitan dengan autentikasi pengguna.
type AuthService interface {
	Register(ctx context.Context, req *models.RegisterRequest) (*models.AuthResponse, error)
	Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error)
}

type authService struct {
	userRepo repository.UserRepository
	cfg      *config.Config
}

// NewAuthService membuat instance AuthService dengan dependensi yang sudah disiapkan.
func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{userRepo: userRepo, cfg: cfg}
}

func (s *authService) Register(ctx context.Context, req *models.RegisterRequest) (*models.AuthResponse, error) {
	// Mengecek apakah email ini sudah pernah dipakai — tidak mengizinkan duplikasi.
	_, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err == nil {
		return nil, errors.New("email sudah terdaftar")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("authService.Register lookup: %w", err)
	}

	// Melakukan hash password sebelum disimpan — tidak pernah menyimpan password dalam bentuk polos.
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("authService.Register hash: %w", err)
	}

	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashed),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("authService.Register create: %w", err)
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return s.buildAuthResponse(user, token), nil
}

func (s *authService) Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		// Sengaja memakai pesan yang sama untuk email salah dan password salah
		// supaya penyerang tidak bisa menebak apakah email terdaftar atau tidak.
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("email atau password salah")
		}
		return nil, fmt.Errorf("authService.Login lookup: %w", err)
	}

	// Membandingkan password yang diketik dengan hash yang tersimpan di database.
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("email atau password salah")
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return s.buildAuthResponse(user, token), nil
}

// generateToken membuat JWT yang ditandatangani untuk pengguna yang diberikan.
// Token ini berisi informasi pengguna dan masa berlakunya sesuai konfigurasi.
func (s *authService) generateToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(time.Duration(s.cfg.JWTExpirationHours) * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("authService.generateToken: %w", err)
	}
	return signed, nil
}

// buildAuthResponse merakit struktur respons yang akan dikirim ke pengguna setelah autentikasi berhasil.
func (s *authService) buildAuthResponse(user *models.User, token string) *models.AuthResponse {
	resp := &models.AuthResponse{Token: token}
	resp.User.ID = user.ID
	resp.User.Username = user.Username
	resp.User.Email = user.Email
	return resp
}
