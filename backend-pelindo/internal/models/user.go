package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User mewakili pengguna yang sudah terdaftar di sistem.
// Field Password sengaja disembunyikan dari respons JSON
// supaya hash password tidak pernah bocor ke luar API.
type User struct {
	ID        string    `gorm:"type:uuid;primaryKey" json:"id"`
	Username  string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"username"`
	Email     string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"type:varchar(255);not null" json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// BeforeCreate dipanggil GORM secara otomatis sebelum data user disimpan ke database.
// Mengisi UUID supaya setiap user punya ID unik tanpa perlu diatur manual dari luar.
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

// RegisterRequest adalah data yang dikirim pengguna saat mendaftar akun baru.
// Semua field wajib diisi dan sudah ada validasi minimumnya.
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest adalah data yang dikirim pengguna saat masuk ke aplikasi.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse adalah balasan yang dikirim ke pengguna setelah berhasil daftar atau login.
// Berisi token JWT dan informasi dasar akun — tanpa password tentunya.
type AuthResponse struct {
	Token string `json:"token"`
	User  struct {
		ID       string `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"user"`
}
