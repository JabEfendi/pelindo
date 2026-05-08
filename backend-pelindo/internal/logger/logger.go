package logger

import (
	"log/slog"
	"os"
)

// Log adalah logger utama yang dipakai di seluruh aplikasi.
// Formatnya JSON supaya mudah dibaca oleh tools monitoring seperti Grafana atau Datadog.
var Log *slog.Logger

func init() {
	// Menginisialisasi logger saat package pertama kali dimuat.
	// Memilih level Debug agar semua pesan dari debug sampai error ikut tercatat.
	Log = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(Log)
}

// Info mencatat pesan informasi biasa — cocok untuk aktivitas normal yang perlu dipantau.
func Info(msg string, args ...any) {
	Log.Info(msg, args...)
}

// Error mencatat pesan error — dipanggil kalau ada sesuatu yang tidak berjalan semestinya.
func Error(msg string, args ...any) {
	Log.Error(msg, args...)
}

// Warn mencatat pesan peringatan — bukan error fatal, tapi perlu diperhatikan.
func Warn(msg string, args ...any) {
	Log.Warn(msg, args...)
}

// Debug mencatat pesan detail untuk keperluan debugging saat pengembangan.
func Debug(msg string, args ...any) {
	Log.Debug(msg, args...)
}
