package repository

import (
	"context"
	"fmt"

	"github.com/backend-pelindo/internal/models"
	"gorm.io/gorm"
)

// UserRepository mendefinisikan kontrak akses data untuk pengguna.
// Menggunakan interface di sini memudahkan testing karena bisa diganti
// dengan mock tanpa perlu koneksi database sungguhan.
type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id string) (*models.User, error)
}

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository membuat instance UserRepository yang terhubung ke database.
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
		return fmt.Errorf("userRepository.Create: %w", err)
	}
	return nil
}

// FindByEmail mencari pengguna berdasarkan email.
// Biasanya dipakai saat proses login atau pengecekan duplikasi email saat registrasi.
func (r *userRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		return nil, fmt.Errorf("userRepository.FindByEmail: %w", err)
	}
	return &user, nil
}

// FindByID mencari pengguna berdasarkan UUID-nya.
// Biasanya dipakai untuk memvalidasi token JWT agar memastikan user masih ada di database.
func (r *userRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		return nil, fmt.Errorf("userRepository.FindByID: %w", err)
	}
	return &user, nil
}
