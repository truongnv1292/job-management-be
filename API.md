# API.md — Tài liệu API & cURL (Postman)

> REST API **base-server-nodejs** — copy lệnh `curl` bên dưới để test terminal hoặc import vào Postman.

---

## Mục lục

1. [Cấu hình nhanh](#1-cấu-hình-nhanh)
2. [Import vào Postman](#2-import-vào-postman)
3. [Format response](#3-format-response)
4. [Health check](#4-health-check)
5. [Auth — Đăng ký / Đăng nhập](#5-auth--đăng-ký--đăng-nhập)
6. [Users — CRUD & danh sách](#6-users--crud--danh-sách)
7. [Luồng test đầy đủ](#7-luồng-test-đầy-đủ)
8. [Mã lỗi thường gặp](#8-mã-lỗi-thường-gặp)

---

## 1. Cấu hình nhanh

### Base URL

| Môi trường | URL |
|------------|-----|
| **Local** | `http://localhost:3000` |
| **Production (Vercel)** | `https://<tên-project>.vercel.app` |

Thay `<tên-project>` bằng URL thật sau khi deploy (vd: `base-server-nodejs.vercel.app`).

### Biến shell (khuyến nghị)

Chạy một lần trong terminal để dùng lại trong các lệnh curl:

```bash
# Local
export BASE_URL="http://localhost:3000"

# Hoặc Production
# export BASE_URL="https://base-server-nodejs.vercel.app"

# Sau khi login, gán token:
export TOKEN="<paste-jwt-token-ở-đây>"
```

### Authentication

Các API **protected** yêu cầu header:

```
Authorization: Bearer <token>
```

Lấy `token` từ response `POST /api/auth/register` hoặc `POST /api/auth/login`.

---

## 2. Import vào Postman

### Cách 1 — Import từng lệnh curl (nhanh nhất)

1. Mở **Postman** → **Import**
2. Chọn tab **Raw text**
3. Dán nguyên lệnh `curl` từ tài liệu này
4. Postman tự tạo request (method, URL, headers, body)

### Cách 2 — Tạo Environment

Tạo Environment với 2 biến:

| Variable | Initial value |
|----------|---------------|
| `baseUrl` | `http://localhost:3000` |
| `token` | *(để trống, điền sau khi login)* |

Trong Postman, đổi URL thành `{{baseUrl}}/api/...` và header Authorization thành `Bearer {{token}}`.

### Cách 3 — Collection thủ công

Tạo Collection **Base Server API** với các folder:

- `Health`
- `Auth`
- `Users`

Copy từng endpoint theo bảng bên dưới.

---

## 3. Format response

### Thành công

```json
{
  "success": true,
  "data": { },
  "message": "Mô tả kết quả"
}
```

### Lỗi

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errors": [
    { "field": "email", "message": "Email không hợp lệ" }
  ]
}
```

---

## 4. Health check

Kiểm tra server đang chạy. **Không cần JWT.**

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/health` |
| **Auth** | Không |

### cURL

```bash
curl -X GET "$BASE_URL/api/health"
```

### Response mẫu `200`

```json
{
  "success": true,
  "message": "Server đang hoạt động",
  "data": {
    "timestamp": "2026-06-05T10:00:00.000Z",
    "uptime": 123.45
  }
}
```

---

## 5. Auth — Đăng ký / Đăng nhập

Prefix: `/api/auth`

### 5.1. Đăng ký

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/register` |
| **Auth** | Không |
| **Content-Type** | `application/json` |

**Body:**

```json
{
  "email": "user@example.com",
  "password": "12345678",
  "name": "Nguyễn Văn A"
}
```

| Field | Bắt buộc | Quy tắc |
|-------|----------|---------|
| `email` | Có | Email hợp lệ |
| `password` | Có | 8–72 ký tự |
| `name` | Không | Chuỗi không rỗng |

### cURL

```bash
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "12345678",
    "name": "Nguyễn Văn A"
  }'
```

### Response mẫu `201`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxx...",
      "email": "user@example.com",
      "name": "Nguyễn Văn A",
      "avatar": null,
      "createdAt": "2026-06-05T10:00:00.000Z",
      "updatedAt": "2026-06-05T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Đăng ký thành công"
}
```

---

### 5.2. Đăng nhập

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/login` |
| **Auth** | Không |
| **Content-Type** | `application/json` |

**Body:**

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

### cURL

```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "12345678"
  }'
```

### Response mẫu `200`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxx...",
      "email": "user@example.com",
      "name": "Nguyễn Văn A",
      "avatar": null,
      "createdAt": "2026-06-05T10:00:00.000Z",
      "updatedAt": "2026-06-05T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Đăng nhập thành công"
}
```

> **Lưu token:** `export TOKEN="<data.token từ response>"`

---

### 5.3. Lấy profile đang đăng nhập

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/auth/me` |
| **Auth** | **JWT** |

### cURL

```bash
curl -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### Response mẫu `200`

```json
{
  "success": true,
  "data": {
    "id": "clxx...",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "avatar": null,
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:00:00.000Z"
  },
  "message": "Lấy profile thành công"
}
```

---

## 6. Users — CRUD & danh sách

Prefix: `/api/users`  
**Tất cả endpoint yêu cầu JWT** (`Authorization: Bearer <token>`).

---

### 6.1. Lấy danh sách user (phân trang)

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/users` |
| **Auth** | **JWT** |

**Query params:**

| Param | Mặc định | Mô tả |
|-------|----------|-------|
| `page` | `1` | Trang hiện tại (≥ 1) |
| `limit` | `10` | Số bản ghi/trang (1–100) |

### cURL — Trang 1, 10 user/trang

```bash
curl -X GET "$BASE_URL/api/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### cURL — Trang 2, 20 user/trang

```bash
curl -X GET "$BASE_URL/api/users?page=2&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### cURL — Dùng mặc định (page=1, limit=10)

```bash
curl -X GET "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN"
```

### Response mẫu `200`

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "clxx...",
        "email": "user@example.com",
        "name": "Nguyễn Văn A",
        "avatar": null,
        "createdAt": "2026-06-05T10:00:00.000Z",
        "updatedAt": "2026-06-05T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "Lấy danh sách user thành công"
}
```

> Password **không bao giờ** xuất hiện trong response.

---

### 6.2. Lấy chi tiết user theo ID

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/users/:id` |
| **Auth** | **JWT** |

### cURL

```bash
curl -X GET "$BASE_URL/api/users/clxx_user_id_ở_đây" \
  -H "Authorization: Bearer $TOKEN"
```

### Response mẫu `200`

```json
{
  "success": true,
  "data": {
    "id": "clxx...",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "avatar": null,
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:00:00.000Z"
  },
  "message": "Lấy user thành công"
}
```

---

### 6.3. Cập nhật user

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/users/:id` |
| **Auth** | **JWT** |
| **Content-Type** | `application/json` |

**Body** — cần ít nhất một field:

```json
{
  "name": "Tên mới",
  "email": "newemail@example.com"
}
```

### cURL

```bash
curl -X PUT "$BASE_URL/api/users/clxx_user_id_ở_đây" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tên mới"
  }'
```

### Response mẫu `200`

```json
{
  "success": true,
  "data": {
    "id": "clxx...",
    "email": "user@example.com",
    "name": "Tên mới",
    "avatar": null,
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:01:00.000Z"
  },
  "message": "Cập nhật user thành công"
}
```

---

### 6.4. Xóa user

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/users/:id` |
| **Auth** | **JWT** |

### cURL

```bash
curl -X DELETE "$BASE_URL/api/users/clxx_user_id_ở_đây" \
  -H "Authorization: Bearer $TOKEN"
```

### Response mẫu `200`

```json
{
  "success": true,
  "data": {
    "id": "clxx...",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "avatar": null,
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:00:00.000Z"
  },
  "message": "Xóa user thành công"
}
```

---

### 6.5. Upload avatar

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/users/:id/avatar` |
| **Auth** | **JWT** |
| **Content-Type** | `multipart/form-data` |
| **Field file** | `avatar` (ảnh, tối đa 5MB) |

### cURL

```bash
curl -X POST "$BASE_URL/api/users/clxx_user_id_ở_đây/avatar" \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/đường/dẫn/đến/ảnh.jpg"
```

**Ví dụ macOS/Linux:**

```bash
curl -X POST "$BASE_URL/api/users/clxx_user_id_ở_đây/avatar" \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@./avatar.jpg"
```

### Response mẫu `200`

```json
{
  "success": true,
  "data": {
    "id": "clxx...",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "avatar": "https://res.cloudinary.com/xxx/image/upload/v123/avatars/abc.jpg",
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:02:00.000Z"
  },
  "message": "Upload avatar thành công"
}
```

### Postman — Upload avatar

1. Method: `POST`
2. URL: `{{baseUrl}}/api/users/:id/avatar`
3. Tab **Authorization** → Type: **Bearer Token** → Token: `{{token}}`
4. Tab **Body** → **form-data**
5. Key: `avatar` → chọn type **File** → chọn ảnh

---

## 7. Luồng test đầy đủ

Chạy tuần tự trong terminal (copy từng block):

```bash
# 1. Cấu hình
export BASE_URL="http://localhost:3000"

# 2. Health check
curl -X GET "$BASE_URL/api/health"

# 3. Đăng ký (bỏ qua nếu email đã tồn tại → dùng login)
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678","name":"Test User"}'

# 4. Đăng nhập — lưu token
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'

# Copy token từ response bước 4:
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 5. Profile
curl -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"

# 6. Danh sách user
curl -X GET "$BASE_URL/api/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 7. Chi tiết user (thay USER_ID)
curl -X GET "$BASE_URL/api/users/USER_ID" \
  -H "Authorization: Bearer $TOKEN"

# 8. Cập nhật user
curl -X PUT "$BASE_URL/api/users/USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# 9. Upload avatar
curl -X POST "$BASE_URL/api/users/USER_ID/avatar" \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@./avatar.jpg"
```

---

## 8. Mã lỗi thường gặp

| HTTP | Message | Nguyên nhân | Cách xử lý |
|------|---------|-------------|------------|
| `400` | Dữ liệu đầu vào không hợp lệ | Body/query sai schema Zod | Kiểm tra field trong `errors[]` |
| `401` | Thiếu token xác thực | Không gửi header Authorization | Thêm `Authorization: Bearer <token>` |
| `401` | Token đã hết hạn | JWT quá 7 ngày | Đăng nhập lại |
| `401` | Email hoặc password không đúng | Sai thông tin login | Kiểm tra email/password |
| `404` | Không tìm thấy user | ID không tồn tại | Dùng ID hợp lệ (cuid) |
| `404` | Route ... không tồn tại | Sai path/method | Kiểm tra URL và method |
| `409` | Email đã được sử dụng | Register trùng email | Dùng email khác hoặc login |
| `409` | Dữ liệu trùng lặp | Unique constraint (email) | Cập nhật email khác |
| `500` | Đã xảy ra lỗi server | Lỗi server/DB | Xem log server |

---

## Bảng tổng hợp endpoint

| # | Method | Path | Auth | Mô tả |
|---|--------|------|------|-------|
| 1 | `GET` | `/api/health` | — | Health check |
| 2 | `POST` | `/api/auth/register` | — | Đăng ký |
| 3 | `POST` | `/api/auth/login` | — | Đăng nhập |
| 4 | `GET` | `/api/auth/me` | JWT | Profile hiện tại |
| 5 | `GET` | `/api/users` | JWT | **Danh sách user** (phân trang) |
| 6 | `GET` | `/api/users/:id` | JWT | Chi tiết user |
| 7 | `PUT` | `/api/users/:id` | JWT | Cập nhật user |
| 8 | `DELETE` | `/api/users/:id` | JWT | Xóa user |
| 9 | `POST` | `/api/users/:id/avatar` | JWT | Upload avatar |

---

*Tài liệu liên quan: [PROJECT.md](./PROJECT.md) · [SETUP.md](./SETUP.md) · [DEPLOY.md](./DEPLOY.md)*
