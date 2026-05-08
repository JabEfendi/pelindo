package repository

import (
	"context"
	"fmt"

	"github.com/backend-pelindo/internal/models"
	"gorm.io/gorm"
)

// TaskRepository mendefinisikan kontrak akses data untuk tugas.
// Semua interaksi dengan tabel tasks harus lewat interface ini
// supaya mudah diganti implementasinya — misalnya pakai mock saat unit test.
type TaskRepository interface {
	Create(ctx context.Context, task *models.Task) error
	FindAll(ctx context.Context, userID string, filter models.TaskFilter) ([]models.Task, int64, error)
	FindByID(ctx context.Context, id, userID string) (*models.Task, error)
	Update(ctx context.Context, task *models.Task) error
	Delete(ctx context.Context, id, userID string) error
}

type taskRepository struct {
	db *gorm.DB
}

// NewTaskRepository membuat instance TaskRepository yang terhubung ke database.
func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) Create(ctx context.Context, task *models.Task) error {
	if err := r.db.WithContext(ctx).Create(task).Error; err != nil {
		return fmt.Errorf("taskRepository.Create: %w", err)
	}
	return nil
}

// FindAll mengambil daftar tugas milik pengguna dengan dukungan filter dan paginasi.
//
// Trik performa di sini: query COUNT dan SELECT dijalankan secara bersamaan menggunakan
// dua goroutine terpisah. Hasilnya dikumpulkan lewat channel, bukan menunggu satu per satu.
// Cara ini memangkas waktu tunggu hampir separuhnya dibanding dijalankan berurutan.
func (r *taskRepository) FindAll(ctx context.Context, userID string, filter models.TaskFilter) ([]models.Task, int64, error) {
	// Menyiapkan query dasar yang akan dipakai bersama oleh kedua goroutine.
	baseQuery := r.db.WithContext(ctx).Model(&models.Task{}).Where("user_id = ?", userID)

	if filter.Status != "" {
		baseQuery = baseQuery.Where("status = ?", filter.Status)
	}
	if filter.Search != "" {
		// Menggunakan ILIKE supaya pencarian tidak peka huruf besar/kecil (case-insensitive).
		search := "%" + filter.Search + "%"
		baseQuery = baseQuery.Where("title ILIKE ? OR description ILIKE ?", search, search)
	}

	// Tipe pembantu untuk menampung hasil dari masing-masing goroutine.
	type countResult struct {
		count int64
		err   error
	}
	type tasksResult struct {
		tasks []models.Task
		err   error
	}

	countCh := make(chan countResult, 1)
	tasksCh := make(chan tasksResult, 1)

	// Goroutine 1: menghitung total data yang cocok dengan filter.
	go func() {
		var total int64
		err := baseQuery.Session(&gorm.Session{}).Count(&total).Error
		countCh <- countResult{count: total, err: err}
	}()

	// Goroutine 2: mengambil data halaman yang diminta.
	go func() {
		var tasks []models.Task
		offset := (filter.Page - 1) * filter.Limit
		err := baseQuery.Session(&gorm.Session{}).
			Order("created_at DESC").
			Offset(offset).
			Limit(filter.Limit).
			Find(&tasks).Error
		tasksCh <- tasksResult{tasks: tasks, err: err}
	}()

	// Menunggu kedua goroutine selesai lalu mengumpulkan hasilnya.
	cr := <-countCh
	tr := <-tasksCh

	if cr.err != nil {
		return nil, 0, fmt.Errorf("taskRepository.FindAll count: %w", cr.err)
	}
	if tr.err != nil {
		return nil, 0, fmt.Errorf("taskRepository.FindAll fetch: %w", tr.err)
	}

	return tr.tasks, cr.count, nil
}

func (r *taskRepository) FindByID(ctx context.Context, id, userID string) (*models.Task, error) {
	var task models.Task
	// Memastikan tugas yang dicari memang milik pengguna yang sedang login — bukan milik orang lain.
	if err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		First(&task).Error; err != nil {
		return nil, fmt.Errorf("taskRepository.FindByID: %w", err)
	}
	return &task, nil
}

func (r *taskRepository) Update(ctx context.Context, task *models.Task) error {
	result := r.db.WithContext(ctx).
		Model(task).
		Where("id = ? AND user_id = ?", task.ID, task.UserID).
		Updates(task)
	if result.Error != nil {
		return fmt.Errorf("taskRepository.Update: %w", result.Error)
	}
	// Kalau tidak ada baris yang berubah, berarti tugas tidak ditemukan.
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *taskRepository) Delete(ctx context.Context, id, userID string) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		Delete(&models.Task{})
	if result.Error != nil {
		return fmt.Errorf("taskRepository.Delete: %w", result.Error)
	}
	// Sama seperti Update — kalau tidak ada yang terhapus, berarti tugasnya tidak ada.
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
