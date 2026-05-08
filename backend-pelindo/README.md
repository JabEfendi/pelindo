# Task Management API — Backend Pelindo

REST API untuk mengelola tugas (*to-do list*) yang dibangun dengan **Go**, **PostgreSQL**, dan **Redis**.

---

## Fitur

| Kategori | Detail |
|---|---|
| **CRUD** | Create, Read (list + by-id), Update, Delete task |
| **Autentikasi** | JWT Bearer Token (register & login) |
| **Validasi** | Input binding & validasi via `go-playground/validator` |
| **Paginasi** | `page`, `limit`, `status`, `search` query params |
| **Caching** | Redis — cache GET responses, invalidasi otomatis saat mutasi |
| **Concurrent** | COUNT + SELECT dijalankan secara paralel (goroutine) pada `GET /tasks` |
| **Logging** | Structured JSON logging (Go `log/slog`) untuk setiap request & error |
| **Unit Test** | `net/http/httptest` + `testify/mock` untuk semua endpoint |
| **Graceful Shutdown** | Server berhenti bersih setelah menyelesaikan request aktif |

---

## Struktur Proyek

```
backend-pelindo/
├── cmd/
│   └── main.go                  # Entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Konfigurasi dari env vars
│   ├── database/
│   │   ├── postgres.go          # Koneksi PostgreSQL + AutoMigrate
│   │   └── redis.go             # Koneksi Redis
│   ├── handlers/
│   │   ├── auth_handler.go      # POST /auth/register, /auth/login
│   │   ├── task_handler.go      # CRUD /tasks
│   │   └── task_handler_test.go # Unit tests
│   ├── logger/
│   │   └── logger.go            # Structured logger (slog)
│   ├── middleware/
│   │   ├── auth_middleware.go   # JWT validation
│   │   └── logger_middleware.go # HTTP request logger
│   ├── models/
│   │   ├── task.go              # Task model + DTOs
│   │   └── user.go              # User model + DTOs
│   ├── repository/
│   │   ├── task_repository.go   # DB queries (concurrent FindAll)
│   │   └── user_repository.go   # DB queries untuk user
│   └── services/
│       ├── auth_service.go      # Logika register/login + JWT
│       └── task_service.go      # Logika bisnis task + Redis cache
├── migrations/
│   └── 001_create_tables.sql    # SQL referensi (GORM auto-migrate)
├── .env.example                 # Template environment variables
├── go.mod
└── README.md
```

---

## Prasyarat

- **Go** ≥ 1.21 — [download](https://go.dev/dl/)
- **PostgreSQL** ≥ 14 — [download](https://www.postgresql.org/download/)
- **Redis** ≥ 7 (opsional) — [download](https://redis.io/download/)

---

## Cara Menjalankan

### 1. Clone / Buka Direktori

```bash
cd backend-pelindo
```

### 2. Salin & Isi File Environment

```bash
cp .env.example .env
```

Edit `.env` dan sesuaikan:

```env
SERVER_PORT=8080

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=pelindo_db
DB_SSL_MODE=disable

REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_SECRET=ganti-dengan-secret-yang-panjang-dan-acak
JWT_EXPIRATION_HOURS=24
```

### 3. Buat Database PostgreSQL

```sql
CREATE DATABASE pelindo_db;
```

> **Catatan:** Tabel dibuat **otomatis** saat server pertama kali dijalankan melalui GORM AutoMigrate. Tidak perlu menjalankan file SQL secara manual.

### 4. Install Dependensi

```bash
go mod tidy
```

### 5. Jalankan Server

```bash
go run ./cmd/main.go
```

Server akan berjalan di `http://localhost:8080`

---

## Menjalankan Unit Test

```bash
go test ./internal/handlers/... -v
```

Jalankan semua test:

```bash
go test ./... -v
```

Dengan coverage:

```bash
go test ./... -cover
```

---

## Dokumentasi API

### Base URL
```
http://localhost:8080
```

### Health Check
```http
GET /health
```

---

### 🔐 Autentikasi

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response `201 Created`:**
```json
{
  "message": "User registered successfully",
  "data": {
    "token": "<jwt_token>",
    "user": {
      "id": "...",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response `200 OK`:**
```json
{
  "message": "Login successful",
  "data": {
    "token": "<jwt_token>",
    "user": { ... }
  }
}
```

> Semua endpoint `/tasks` memerlukan header:
> ```
> Authorization: Bearer <jwt_token>
> ```

---

### 📋 Tasks

#### Create Task
```http
POST /tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Belajar Go",
  "description": "Mempelajari goroutine dan channel",
  "status": "pending",
  "due_date": "2025-12-31"
}
```

**Response `201 Created`:**
```json
{
  "message": "Task created successfully",
  "task": {
    "id": "...",
    "title": "Belajar Go",
    "description": "Mempelajari goroutine dan channel",
    "status": "pending",
    "due_date": "2025-12-31",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### Get All Tasks
```http
GET /tasks?status=pending&page=1&limit=10&search=belajar
Authorization: Bearer <token>
```

| Query Param | Wajib | Keterangan |
|---|---|---|
| `status` | Tidak | `pending` atau `completed` |
| `page` | Tidak | Default: `1` |
| `limit` | Tidak | Default: `10`, Maks: `100` |
| `search` | Tidak | Cari di `title` atau `description` |

**Response `200 OK`:**
```json
{
  "tasks": [ { ... } ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_tasks": 42
  }
}
```

#### Get Task by ID
```http
GET /tasks/:id
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "status": "pending",
  "due_date": "2025-12-31",
  "created_at": "...",
  "updated_at": "..."
}
```

#### Update Task
```http
PUT /tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Belajar Go (Updated)",
  "description": "Sudah selesai",
  "status": "completed",
  "due_date": "2025-12-31"
}
```

**Response `200 OK`:**
```json
{
  "message": "Task updated successfully",
  "task": { ... }
}
```

#### Delete Task
```http
DELETE /tasks/:id
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "message": "Task deleted successfully"
}
```

---

## HTTP Status Codes

| Kode | Makna |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request (validasi gagal) |
| `401` | Unauthorized (token tidak valid/missing) |
| `404` | Not Found |
| `409` | Conflict (email sudah terdaftar) |
| `500` | Internal Server Error |

---

## Implementasi Concurrent Execution

Concurrent execution diterapkan di **dua tempat**:

1. **Repository — `FindAll`** (`internal/repository/task_repository.go`)
   Saat `GET /tasks`, query `COUNT(*)` dan `SELECT ... LIMIT` dijalankan secara **paralel** menggunakan dua goroutine terpisah. Hasilnya dikumpulkan melalui channel untuk memastikan tidak ada race condition.

2. **Service — Cache Invalidation** (`internal/services/task_service.go`)
   Setelah operasi Create, Update, dan Delete, invalidasi Redis cache dijalankan di **background goroutine** agar response API tidak tertunda oleh operasi Redis.

3. **Main — Graceful Shutdown** (`cmd/main.go`)
   Server HTTP dijalankan di goroutine terpisah. Main goroutine menunggu sinyal OS (`SIGINT`/`SIGTERM`) untuk melakukan shutdown bersih.
