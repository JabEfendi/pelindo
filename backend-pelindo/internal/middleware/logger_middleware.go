package middleware

import (
	"time"

	"github.com/backend-pelindo/internal/logger"
	"github.com/gin-gonic/gin"
)

// LoggerMiddleware mencatat setiap request HTTP yang masuk ke aplikasi.
// Informasi yang dicatat meliputi method, path, status code, lama proses, dan IP pengirim.
// Level log disesuaikan otomatis: error untuk 5xx, warn untuk 4xx, info untuk yang lainnya.
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Meneruskan request ke handler berikutnya, baru mencatat setelah selesai.
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		// Memilih level log berdasarkan status HTTP — error server lebih kritis dari client error.
		logFn := logger.Info
		if status >= 500 {
			logFn = logger.Error
		} else if status >= 400 {
			logFn = logger.Warn
		}

		// Menggabungkan path dan query string supaya log lebih informatif.
		fullPath := path
		if query != "" {
			fullPath = path + "?" + query
		}

		logFn("http request",
			"method", c.Request.Method,
			"path", fullPath,
			"status", status,
			"latency", latency.String(),
			"ip", c.ClientIP(),
			"errors", c.Errors.ByType(gin.ErrorTypePrivate).String(),
		)
	}
}
