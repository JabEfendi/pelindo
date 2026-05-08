package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/backend-pelindo/internal/logger"
	"github.com/backend-pelindo/internal/models"
	"github.com/backend-pelindo/internal/repository"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	// Mendefinisikan berapa lama data task disimpan di cache Redis sebelum kedaluwarsa.
	cacheTaskTTL = 5 * time.Minute
	// Awalan key di Redis supaya mudah diidentifikasi dan tidak tabrakan dengan data lain.
	cacheTaskPrefix = "task:"
)

// TaskService menangani semua logika bisnis yang berkaitan dengan pengelolaan tugas.
type TaskService interface {
	CreateTask(ctx context.Context, userID string, req *models.TaskRequest) (*models.TaskResponse, error)
	GetAllTasks(ctx context.Context, userID string, filter models.TaskFilter) (*models.TaskListResponse, error)
	GetTaskByID(ctx context.Context, id, userID string) (*models.TaskResponse, error)
	UpdateTask(ctx context.Context, id, userID string, req *models.TaskRequest) (*models.TaskResponse, error)
	DeleteTask(ctx context.Context, id, userID string) error
}

type taskService struct {
	taskRepo    repository.TaskRepository
	redisClient *redis.Client // bisa nil kalau Redis tidak tersedia — aplikasi tetap jalan tanpa cache
}

// NewTaskService membuat instance TaskService.
// redisClient boleh nil; dalam kondisi itu semua fitur caching akan dilewati secara otomatis.
func NewTaskService(taskRepo repository.TaskRepository, redisClient *redis.Client) TaskService {
	return &taskService{taskRepo: taskRepo, redisClient: redisClient}
}

func (s *taskService) CreateTask(ctx context.Context, userID string, req *models.TaskRequest) (*models.TaskResponse, error) {
	// Mengurai due_date dari string ke time.Time agar bisa disimpan ke kolom date di PostgreSQL.
	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		return nil, fmt.Errorf("format due_date tidak valid, harus YYYY-MM-DD")
	}

	task := &models.Task{
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		Status:      models.TaskStatus(req.Status),
		DueDate:     &dueDate,
	}

	if err := s.taskRepo.Create(ctx, task); err != nil {
		return nil, fmt.Errorf("taskService.CreateTask: %w", err)
	}

	// Menghapus cache daftar tugas milik user ini di background supaya data selalu segar.
	// Dijalankan di goroutine terpisah agar tidak menghambat respons ke pengguna.
	go s.invalidateListCache(userID)

	resp := task.ToResponse()
	return &resp, nil
}

func (s *taskService) GetAllTasks(ctx context.Context, userID string, filter models.TaskFilter) (*models.TaskListResponse, error) {
	// Menormalisasi paginasi — memastikan nilainya masuk akal sebelum dikirim ke database.
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 10
	}

	// Membangun key cache yang unik berdasarkan semua parameter filter.
	cacheKey := fmt.Sprintf("%slist:%s:status:%s:page:%d:limit:%d:search:%s",
		cacheTaskPrefix, userID, filter.Status, filter.Page, filter.Limit, filter.Search)

	// Mencoba mengambil dari cache dulu — kalau ada, langsung balik tanpa ke database.
	if cached, ok := s.getCache(ctx, cacheKey); ok {
		var result models.TaskListResponse
		if err := json.Unmarshal([]byte(cached), &result); err == nil {
			return &result, nil
		}
	}

	// Cache miss — mengambil dari database.
	// COUNT dan SELECT dijalankan bersamaan di dalam repository untuk efisiensi.
	tasks, total, err := s.taskRepo.FindAll(ctx, userID, filter)
	if err != nil {
		return nil, fmt.Errorf("taskService.GetAllTasks: %w", err)
	}

	taskResponses := make([]models.TaskResponse, 0, len(tasks))
	for _, t := range tasks {
		taskResponses = append(taskResponses, t.ToResponse())
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	result := &models.TaskListResponse{
		Tasks: taskResponses,
		Pagination: models.Pagination{
			CurrentPage: filter.Page,
			TotalPages:  totalPages,
			TotalTasks:  total,
		},
	}

	// Menyimpan hasilnya ke cache di background supaya request berikutnya lebih cepat.
	go s.setCache(cacheKey, result)

	return result, nil
}

func (s *taskService) GetTaskByID(ctx context.Context, id, userID string) (*models.TaskResponse, error) {
	cacheKey := fmt.Sprintf("%s%s", cacheTaskPrefix, id)

	// Mengecek cache dulu sebelum repot ke database.
	if cached, ok := s.getCache(ctx, cacheKey); ok {
		var resp models.TaskResponse
		if err := json.Unmarshal([]byte(cached), &resp); err == nil {
			return &resp, nil
		}
	}

	task, err := s.taskRepo.FindByID(ctx, id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("tugas tidak ditemukan")
		}
		return nil, fmt.Errorf("taskService.GetTaskByID: %w", err)
	}

	resp := task.ToResponse()

	// Menyimpan ke cache di background untuk mempercepat request berikutnya.
	go s.setCache(cacheKey, resp)

	return &resp, nil
}

func (s *taskService) UpdateTask(ctx context.Context, id, userID string, req *models.TaskRequest) (*models.TaskResponse, error) {
	// Mengambil data tugas yang ada sekaligus memverifikasi bahwa tugas ini milik user yang benar.
	existing, err := s.taskRepo.FindByID(ctx, id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("tugas tidak ditemukan")
		}
		return nil, fmt.Errorf("taskService.UpdateTask lookup: %w", err)
	}

	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		return nil, fmt.Errorf("format due_date tidak valid, harus YYYY-MM-DD")
	}

	// Menerapkan perubahan dari request ke data yang sudah ada.
	existing.Title = req.Title
	existing.Description = req.Description
	existing.Status = models.TaskStatus(req.Status)
	existing.DueDate = &dueDate

	if err := s.taskRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("taskService.UpdateTask: %w", err)
	}

	// Menghapus cache lama di background — baik cache spesifik tugas maupun cache daftar.
	go func() {
		s.deleteCache(fmt.Sprintf("%s%s", cacheTaskPrefix, id))
		s.invalidateListCache(userID)
	}()

	resp := existing.ToResponse()
	return &resp, nil
}

func (s *taskService) DeleteTask(ctx context.Context, id, userID string) error {
	if err := s.taskRepo.Delete(ctx, id, userID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("tugas tidak ditemukan")
		}
		return fmt.Errorf("taskService.DeleteTask: %w", err)
	}

	// Membersihkan cache terkait di background setelah tugas berhasil dihapus.
	go func() {
		s.deleteCache(fmt.Sprintf("%s%s", cacheTaskPrefix, id))
		s.invalidateListCache(userID)
	}()

	return nil
}

// ── Helper untuk Redis ────────────────────────────────────────────────────────

// getCache mencoba mengambil data dari Redis.
// Mengembalikan string kosong dan false kalau Redis tidak tersedia atau data tidak ada.
func (s *taskService) getCache(ctx context.Context, key string) (string, bool) {
	if s.redisClient == nil {
		return "", false
	}
	val, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		return "", false
	}
	return val, true
}

// setCache menyimpan data ke Redis dengan TTL yang sudah ditentukan.
// Error di sini tidak fatal — hanya dicatat ke log, tidak perlu panic.
func (s *taskService) setCache(key string, value any) {
	if s.redisClient == nil {
		return
	}
	data, err := json.Marshal(value)
	if err != nil {
		logger.Error("gagal marshal data untuk cache", "key", key, "err", err)
		return
	}
	ctx := context.Background()
	if err := s.redisClient.Set(ctx, key, data, cacheTaskTTL).Err(); err != nil {
		logger.Error("gagal menyimpan ke cache", "key", key, "err", err)
	}
}

// deleteCache menghapus satu key dari Redis.
func (s *taskService) deleteCache(key string) {
	if s.redisClient == nil {
		return
	}
	ctx := context.Background()
	if err := s.redisClient.Del(ctx, key).Err(); err != nil {
		logger.Error("gagal menghapus cache", "key", key, "err", err)
	}
}

// invalidateListCache menghapus semua cache daftar tugas milik pengguna tertentu
// menggunakan perintah SCAN supaya tidak memblokir Redis saat ada banyak key.
func (s *taskService) invalidateListCache(userID string) {
	if s.redisClient == nil {
		return
	}
	ctx := context.Background()
	pattern := fmt.Sprintf("%slist:%s:*", cacheTaskPrefix, userID)
	var cursor uint64
	for {
		keys, nextCursor, err := s.redisClient.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			logger.Error("gagal scan cache untuk invalidasi", "pattern", pattern, "err", err)
			return
		}
		if len(keys) > 0 {
			if err := s.redisClient.Del(ctx, keys...).Err(); err != nil {
				logger.Error("gagal hapus cache secara bulk", "err", err)
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
}
