package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/backend-pelindo/internal/handlers"
	"github.com/backend-pelindo/internal/middleware"
	"github.com/backend-pelindo/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ── Mock TaskService ──────────────────────────────────────────────────────────
// mockTaskService meniru perilaku TaskService tanpa perlu database sungguhan.
// Semua method dikonfigurasi hasilnya lewat testify/mock sebelum test dijalankan.

type mockTaskService struct {
	mock.Mock
}

func (m *mockTaskService) CreateTask(ctx context.Context, userID string, req *models.TaskRequest) (*models.TaskResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TaskResponse), args.Error(1)
}

func (m *mockTaskService) GetAllTasks(ctx context.Context, userID string, filter models.TaskFilter) (*models.TaskListResponse, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TaskListResponse), args.Error(1)
}

func (m *mockTaskService) GetTaskByID(ctx context.Context, id, userID string) (*models.TaskResponse, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TaskResponse), args.Error(1)
}

func (m *mockTaskService) UpdateTask(ctx context.Context, id, userID string, req *models.TaskRequest) (*models.TaskResponse, error) {
	args := m.Called(ctx, id, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TaskResponse), args.Error(1)
}

func (m *mockTaskService) DeleteTask(ctx context.Context, id, userID string) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

// ── Helper Test ───────────────────────────────────────────────────────────────

// ID pengguna palsu yang diinjeksikan langsung ke context — menghindari kebutuhan token JWT nyata.
const testUserID = "user-uuid-1234"

// setupRouter membuat router Gin khusus untuk testing.
// Melewati AuthMiddleware dengan menyuntikkan userID langsung ke context,
// sehingga fokus pengujian bisa pada logika handler tanpa perlu membuat token JWT nyata.
func setupRouter(h *handlers.TaskHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Middleware pengganti AuthMiddleware — mengisi userID langsung tanpa verifikasi token.
	r.Use(func(c *gin.Context) {
		c.Set("userID", testUserID)
		c.Next()
	})

	r.POST("/tasks", h.CreateTask)
	r.GET("/tasks", h.GetAllTasks)
	r.GET("/tasks/:id", h.GetTaskByID)
	r.PUT("/tasks/:id", h.UpdateTask)
	r.DELETE("/tasks/:id", h.DeleteTask)
	return r
}

// sampleTaskResponse membuat data tugas contoh yang dipakai di banyak test case.
func sampleTaskResponse() *models.TaskResponse {
	d := "2025-12-31"
	return &models.TaskResponse{
		ID:          "task-uuid-5678",
		Title:       "Test Task",
		Description: "Test Description",
		Status:      "pending",
		DueDate:     &d,
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}
}

// ── Test CreateTask ───────────────────────────────────────────────────────────

// TestCreateTask_Success memastikan tugas baru berhasil dibuat dan respons sesuai spesifikasi.
func TestCreateTask_Success(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	req := models.TaskRequest{
		Title:       "Test Task",
		Description: "Test Description",
		Status:      "pending",
		DueDate:     "2025-12-31",
	}
	svc.On("CreateTask", mock.Anything, testUserID, &req).Return(sampleTaskResponse(), nil)

	body, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodPost, "/tasks", bytes.NewBuffer(body))
	httpReq.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Task created successfully", resp["message"])
	assert.NotNil(t, resp["task"])
	svc.AssertExpectations(t)
}

// TestCreateTask_InvalidBody memverifikasi bahwa request tanpa field wajib ditolak dengan status 400.
func TestCreateTask_InvalidBody(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	// Mengirim body yang tidak lengkap — title kosong dan field lain tidak ada.
	body := []byte(`{"title":""}`)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodPost, "/tasks", bytes.NewBuffer(body))
	httpReq.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	// Memastikan service tidak dipanggil sama sekali kalau validasi gagal.
	svc.AssertNotCalled(t, "CreateTask")
}

// TestCreateTask_InvalidStatus memastikan status selain "pending"/"completed" ditolak.
func TestCreateTask_InvalidStatus(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	body := []byte(`{"title":"T","description":"D","status":"invalid","due_date":"2025-12-31"}`)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodPost, "/tasks", bytes.NewBuffer(body))
	httpReq.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ── Test GetAllTasks ──────────────────────────────────────────────────────────

// TestGetAllTasks_Success memastikan daftar tugas dan data paginasi dikembalikan dengan benar.
func TestGetAllTasks_Success(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	expected := &models.TaskListResponse{
		Tasks: []models.TaskResponse{*sampleTaskResponse()},
		Pagination: models.Pagination{
			CurrentPage: 1,
			TotalPages:  1,
			TotalTasks:  1,
		},
	}

	// Filter default yang diharapkan ketika tidak ada query param yang dikirim oleh pengguna.
	expectedFilter := models.TaskFilter{Status: "", Page: 1, Limit: 10, Search: ""}
	svc.On("GetAllTasks", mock.Anything, testUserID, expectedFilter).Return(expected, nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodGet, "/tasks", nil)
	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.TaskListResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp.Tasks, 1)
	assert.Equal(t, int64(1), resp.Pagination.TotalTasks)
	svc.AssertExpectations(t)
}

// TestGetAllTasks_WithFilters memastikan semua query parameter diteruskan dengan benar ke service.
func TestGetAllTasks_WithFilters(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	expected := &models.TaskListResponse{
		Tasks:      []models.TaskResponse{},
		Pagination: models.Pagination{CurrentPage: 2, TotalPages: 3, TotalTasks: 25},
	}

	expectedFilter := models.TaskFilter{Status: "pending", Page: 2, Limit: 5, Search: "test"}
	svc.On("GetAllTasks", mock.Anything, testUserID, expectedFilter).Return(expected, nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodGet, "/tasks?status=pending&page=2&limit=5&search=test", nil)
	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	svc.AssertExpectations(t)
}

// TestGetAllTasks_InvalidStatus memastikan nilai status yang tidak dikenal ditolak sebelum ke service.
func TestGetAllTasks_InvalidStatus(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodGet, "/tasks?status=unknown", nil)
	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	svc.AssertNotCalled(t, "GetAllTasks")
}

// ── Test GetTaskByID ──────────────────────────────────────────────────────────

// TestGetTaskByID_Success memastikan satu tugas bisa diambil berdasarkan ID-nya.
func TestGetTaskByID_Success(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	taskID := "task-uuid-5678"
	svc.On("GetTaskByID", mock.Anything, taskID, testUserID).Return(sampleTaskResponse(), nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodGet, "/tasks/"+taskID, nil)
	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.TaskResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, taskID, resp.ID)
	svc.AssertExpectations(t)
}

// TestGetTaskByID_NotFound memastikan respons 404 dikembalikan ketika tugas tidak ditemukan.
func TestGetTaskByID_NotFound(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	svc.On("GetTaskByID", mock.Anything, "nonexistent", testUserID).
		Return(nil, errors.New("tugas tidak ditemukan"))

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodGet, "/tasks/nonexistent", nil)
	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusNotFound, w.Code)
	svc.AssertExpectations(t)
}

// ── Test UpdateTask ───────────────────────────────────────────────────────────

// TestUpdateTask_Success memastikan tugas berhasil diperbarui dan pesan sukses dikembalikan.
func TestUpdateTask_Success(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	taskID := "task-uuid-5678"
	req := models.TaskRequest{
		Title:       "Updated Task",
		Description: "Updated Description",
		Status:      "completed",
		DueDate:     "2025-12-31",
	}

	updated := sampleTaskResponse()
	updated.Title = "Updated Task"
	updated.Status = "completed"

	svc.On("UpdateTask", mock.Anything, taskID, testUserID, &req).Return(updated, nil)

	body, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodPut, "/tasks/"+taskID, bytes.NewBuffer(body))
	httpReq.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Task updated successfully", resp["message"])
	svc.AssertExpectations(t)
}

// TestUpdateTask_NotFound memastikan 404 dikembalikan saat mencoba memperbarui tugas yang tidak ada.
func TestUpdateTask_NotFound(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	req := models.TaskRequest{
		Title:       "T",
		Description: "D",
		Status:      "pending",
		DueDate:     "2025-12-31",
	}
	svc.On("UpdateTask", mock.Anything, "ghost", testUserID, &req).
		Return(nil, errors.New("tugas tidak ditemukan"))

	body, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodPut, "/tasks/ghost", bytes.NewBuffer(body))
	httpReq.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusNotFound, w.Code)
	svc.AssertExpectations(t)
}

// ── Test DeleteTask ───────────────────────────────────────────────────────────

// TestDeleteTask_Success memastikan tugas berhasil dihapus dan pesan konfirmasi dikembalikan.
func TestDeleteTask_Success(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	taskID := "task-uuid-5678"
	svc.On("DeleteTask", mock.Anything, taskID, testUserID).Return(nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodDelete, "/tasks/"+taskID, nil)
	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Task deleted successfully", resp["message"])
	svc.AssertExpectations(t)
}

// TestDeleteTask_NotFound memastikan 404 dikembalikan saat mencoba menghapus tugas yang tidak ada.
func TestDeleteTask_NotFound(t *testing.T) {
	svc := new(mockTaskService)
	h := handlers.NewTaskHandler(svc)
	r := setupRouter(h)

	svc.On("DeleteTask", mock.Anything, "ghost", testUserID).
		Return(errors.New("tugas tidak ditemukan"))

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest(http.MethodDelete, "/tasks/ghost", nil)
	r.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusNotFound, w.Code)
	svc.AssertExpectations(t)
}

// ── Test AuthMiddleware ───────────────────────────────────────────────────────

// TestAuthMiddleware_MissingHeader memastikan request tanpa header Authorization langsung ditolak.
func TestAuthMiddleware_MissingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.AuthMiddleware("secret"))
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// TestAuthMiddleware_InvalidToken memastikan token yang tidak valid atau palsu ditolak.
func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.AuthMiddleware("secret"))
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer tokenpalsu-tidakvalid")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
