package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TaskStatus mendefinisikan nilai status yang boleh dipakai untuk sebuah tugas.
// Hanya ada dua pilihan: pending (belum selesai) dan completed (sudah selesai).
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusCompleted TaskStatus = "completed"
)

// Task adalah model utama yang merepresentasikan satu item tugas di database.
// Setiap tugas selalu terikat ke satu pengguna melalui UserID.
type Task struct {
	ID          string     `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      string     `gorm:"type:uuid;not null;index" json:"user_id"`
	Title       string     `gorm:"type:varchar(255);not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Status      TaskStatus `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	DueDate     *time.Time `gorm:"type:date" json:"due_date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// BeforeCreate dipanggil GORM otomatis sebelum data tugas disimpan.
// Mengisi UUID supaya setiap tugas punya ID unik.
func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

// TaskRequest adalah data yang dikirim pengguna saat membuat atau memperbarui tugas.
// Status hanya boleh "pending" atau "completed", dan due_date harus format YYYY-MM-DD.
type TaskRequest struct {
	Title       string `json:"title" binding:"required,min=1,max=255"`
	Description string `json:"description"`
	Status      string `json:"status" binding:"required,oneof=pending completed"`
	DueDate     string `json:"due_date" binding:"required,datetime=2006-01-02"`
}

// TaskResponse adalah bentuk tugas yang dikirim balik ke pengguna melalui API.
// DueDate dibuat pointer supaya nilainya bisa null kalau memang belum diset.
type TaskResponse struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	DueDate     *string `json:"due_date"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// TaskListResponse adalah struktur balasan untuk endpoint GET /tasks.
// Berisi daftar tugas beserta informasi paginasi.
type TaskListResponse struct {
	Tasks      []TaskResponse `json:"tasks"`
	Pagination Pagination     `json:"pagination"`
}

// Pagination menyimpan informasi halaman untuk membantu frontend menampilkan navigasi.
type Pagination struct {
	CurrentPage int   `json:"current_page"`
	TotalPages  int   `json:"total_pages"`
	TotalTasks  int64 `json:"total_tasks"`
}

// TaskFilter menampung semua parameter query yang bisa dikirim pengguna
// untuk menyaring dan membatasi hasil daftar tugas.
type TaskFilter struct {
	Status string
	Page   int
	Limit  int
	Search string
}

// ToResponse mengubah model Task dari database menjadi TaskResponse yang siap dikirim ke pengguna.
// Format tanggal disesuaikan: due_date pakai YYYY-MM-DD, timestamp pakai RFC3339.
func (t *Task) ToResponse() TaskResponse {
	resp := TaskResponse{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Status:      string(t.Status),
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   t.UpdatedAt.Format(time.RFC3339),
	}
	if t.DueDate != nil {
		d := t.DueDate.Format("2006-01-02")
		resp.DueDate = &d
	}
	return resp
}
