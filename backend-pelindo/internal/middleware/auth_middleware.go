package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/backend-pelindo/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const userIDKey = "userID"

// AuthMiddleware memeriksa apakah setiap request yang masuk sudah membawa token JWT yang valid.
// Token harus dikirim di header Authorization dengan format: "Bearer <token>".
// Kalau token tidak ada atau tidak valid, request langsung ditolak dengan status 401.
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "header Authorization wajib disertakan"})
			return
		}

		// Memastikan formatnya benar: harus ada dua bagian — "Bearer" dan tokennya.
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "format Authorization harus 'Bearer <token>'"})
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			// Memastikan algoritma yang dipakai adalah HMAC — menolak kalau berbeda untuk mencegah serangan alg confusion.
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("algoritma signing tidak dikenali")
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			logger.Error("token JWT tidak valid", "err", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token tidak valid atau sudah kedaluwarsa"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "isi token tidak valid"})
			return
		}

		// Mengambil user ID dari claim "sub" lalu menyimpannya ke context Gin supaya handler bisa menggunakannya.
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "subject token tidak valid"})
			return
		}

		c.Set(userIDKey, userID)
		c.Next()
	}
}

// GetUserID mengambil ID pengguna yang sudah disimpan di context oleh AuthMiddleware.
// Hanya boleh dipanggil dari handler yang sudah dilindungi oleh AuthMiddleware.
func GetUserID(c *gin.Context) string {
	id, _ := c.Get(userIDKey)
	return id.(string)
}
