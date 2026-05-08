package handlers

import (
	"net/http"
	"strconv"

	"github.com/backend-pelindo/internal/logger"
	"github.com/backend-pelindo/internal/middleware"
	"github.com/backend-pelindo/internal/models"
	"github.com/backend-pelindo/internal/services"
	"github.com/gin-gonic/gin"
)

// TaskHandler menangani semua endpoint CRUD untuk tugas.
type TaskHandler struct {
	taskService services.TaskService
}

// NewTaskHandler membuat instance TaskHandler dengan service yang sudah disiapkan.
func NewTaskHandler(taskService services.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

// CreateTask menangani pembuatan tugas baru.
// POST /tasks
func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req models.TaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("validasi buat tugas gagal", "user_id", userID, "err", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := h.taskService.CreateTask(c.Request.Context(), userID, &req)
	if err != nil {
		logger.Error("gagal membuat tugas", "user_id", userID, "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Task created successfully",
		"task":    task,
	})
}

// GetAllTasks menangani pengambilan daftar tugas dengan dukungan filter dan paginasi.
// GET /tasks?status=&page=&limit=&search=
func (h *TaskHandler) GetAllTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)

	// Mengambil dan mengurai parameter query — kalau tidak ada, memakai nilai default.
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	filter := models.TaskFilter{
		Status: c.Query("status"),
		Page:   page,
		Limit:  limit,
		Search: c.Query("search"),
	}

	// Memvalidasi nilai status sebelum diteruskan ke service.
	if filter.Status != "" &&
		filter.Status != string(models.TaskStatusPending) &&
		filter.Status != string(models.TaskStatusCompleted) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status hanya boleh 'pending' atau 'completed'"})
		return
	}

	result, err := h.taskService.GetAllTasks(c.Request.Context(), userID, filter)
	if err != nil {
		logger.Error("gagal mengambil daftar tugas", "user_id", userID, "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetTaskByID menangani pengambilan satu tugas berdasarkan ID-nya.
// GET /tasks/:id
func (h *TaskHandler) GetTaskByID(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tugas wajib disertakan"})
		return
	}

	task, err := h.taskService.GetTaskByID(c.Request.Context(), id, userID)
	if err != nil {
		if err.Error() == "tugas tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		logger.Error("gagal mengambil tugas", "task_id", id, "user_id", userID, "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}

// UpdateTask menangani pembaruan data tugas yang sudah ada.
// PUT /tasks/:id
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tugas wajib disertakan"})
		return
	}

	var req models.TaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("validasi perbarui tugas gagal", "task_id", id, "user_id", userID, "err", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := h.taskService.UpdateTask(c.Request.Context(), id, userID, &req)
	if err != nil {
		if err.Error() == "tugas tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		logger.Error("gagal memperbarui tugas", "task_id", id, "user_id", userID, "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Task updated successfully",
		"task":    task,
	})
}

// DeleteTask menangani penghapusan tugas berdasarkan ID-nya.
// DELETE /tasks/:id
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tugas wajib disertakan"})
		return
	}

	if err := h.taskService.DeleteTask(c.Request.Context(), id, userID); err != nil {
		if err.Error() == "tugas tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		logger.Error("gagal menghapus tugas", "task_id", id, "user_id", userID, "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}
