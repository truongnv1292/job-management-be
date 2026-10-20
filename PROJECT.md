# PROJECT.md — Tổng quan dự án Base Server Node.js

> Tài liệu này mô tả kiến trúc, quy ước phát triển, checklist khi thêm API và quy trình deploy lên Vercel.  
> Hướng dẫn setup chi tiết từ đầu: [SETUP.md](./SETUP.md). Hướng dẫn deploy 3 môi trường: [DEPLOY.md](./DEPLOY.md).

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Tech stack](#2-tech-stack)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Luồng xử lý request](#4-luồng-xử-lý-request)
5. [API hiện có](#5-api-hiện-có)
6. [Thêm API mới hoặc nhóm API mới](#6-thêm-api-mới-hoặc-nhóm-api-mới)
7. [Quy ước code](#7-quy-ước-code)
8. [Checklist phát triển](#8-checklist-phát-triển)
9. [Deploy lên Vercel](#9-deploy-lên-vercel)
10. [Tài liệu liên quan](#10-tài-liệu-liên-quan)

---

## 1. Giới thiệu

**base-server-nodejs** là REST API server dùng làm nền tảng (base template) cho các dự án backend nhỏ và vừa.

| Đặc điểm | Mô tả |
|----------|--------|
| **Runtime** | Node.js ≥ 18, ES Modules (`"type": "module"`) |
| **Framework** | Express.js 4 |
| **Database** | PostgreSQL trên Neon (serverless) |
| **ORM** | Prisma 6 |
| **Auth** | JWT (Bearer token) |
| **Upload** | Cloudinary (Multer memory storage) |
| **Validation** | Zod |
| **Deploy** | Vercel Serverless Functions |

**Entry point:**

- **Local & Vercel:** `api/index.js` → import `src/app.js`
- **Prefix API:** mọi endpoint bắt đầu bằng `/api`

---

## 2. Tech stack

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│ Vercel /     │────▶│   Neon      │
│  (Frontend) │     │ Express API  │     │ PostgreSQL  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  Cloudinary  │
                    │  (upload)    │
                    └──────────────┘
```

| Layer | Công nghệ | File chính |
|-------|-----------|------------|
| Entry | Vercel serverless | `api/index.js` |
| App | Express | `src/app.js` |
| Routes | Express Router | `src/routes/index.js` |
| Business | Module pattern | `src/modules/*/` |
| DB | Prisma + Neon | `src/config/prisma.js`, `prisma/schema.prisma` |
| Auth | jsonwebtoken | `src/middlewares/auth.middleware.js` |
| Env | dotenv + Zod | `src/config/env.js` |

---

## 3. Cấu trúc thư mục

```
base-server-nodejs/
├── api/
│   └── index.js                    # Entry Vercel + listen port khi chạy local
├── src/
│   ├── app.js                      # Khởi tạo Express (CORS, JSON, mount routes)
│   ├── config/
│   │   ├── env.js                  # Validate biến môi trường (Zod)
│   │   ├── prisma.js               # PrismaClient singleton
│   │   └── cloudinary.js           # Cloudinary SDK + helper upload
│   ├── middlewares/
│   │   ├── auth.middleware.js      # JWT authenticate
│   │   ├── error.middleware.js     # Global error + Prisma error mapping
│   │   ├── upload.middleware.js    # Multer (memory, serverless-safe)
│   │   └── validate.middleware.js  # Zod validation wrapper
│   ├── modules/                    # ★ Mỗi domain = 1 folder module
│   │   ├── auth/                   # Đăng ký, đăng nhập, profile
│   │   └── users/                  # CRUD user + avatar (module mẫu)
│   ├── routes/
│   │   └── index.js                # ★ Gom & mount tất cả module routes
│   └── utils/
│       └── apiResponse.js          # Format response { success, data, message }
├── prisma/
│   ├── schema.prisma               # ★ Định nghĩa models DB
│   └── migrations/                 # Migration SQL (auto by Prisma)
├── vercel.json                     # Rewrite /api/* → api/index.js
├── .env.example                    # Template env (commit file này)
├── SETUP.md                        # Hướng dẫn setup từ đầu
├── DEPLOY.md                       # Hướng dẫn deploy dev / staging / prod
└── PROJECT.md                      # File này — overview & quy trình
```

### Vai trò từng layer trong module

Mỗi module (vd: `users`, `auth`, `products`) gồm 4 file:

| File | Trách nhiệm | Không làm gì |
|------|-------------|--------------|
| `*.route.js` | Định nghĩa HTTP method + path, gắn middleware | Không chứa logic DB |
| `*.controller.js` | Nhận req/res, gọi service, trả `success()` / `next(err)` | Không query Prisma trực tiếp |
| `*.service.js` | Business logic, gọi Prisma | Không dùng `res.json()` |
| `*.validator.js` | Schema Zod cho body/query/params | Không xử lý HTTP |

---

## 4. Luồng xử lý request

```
Client
  │
  ▼
api/index.js          (Vercel handler hoặc app.listen local)
  │
  ▼
src/app.js            (CORS, express.json, mount /api)
  │
  ▼
src/routes/index.js   (health + mount module routes)
  │
  ▼
modules/<name>/*.route.js
  │
  ├── validate.middleware   (Zod — body / query / params)
  ├── auth.middleware       (JWT — nếu route protected)
  ├── upload.middleware     (Multer — nếu upload file)
  │
  ▼
*.controller.js
  │
  ▼
*.service.js → prisma → Neon PostgreSQL
  │
  ▼
apiResponse.success() / error.middleware
```

**Pattern chuẩn:**

```
Route → Validate → Auth (tuỳ chọn) → Controller → Service → Prisma
```

---

## 5. API hiện có

Base URL local: `http://localhost:3000`  
Base URL production: `https://<tên-project>.vercel.app`

### 5.1. Health check

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/health` | Không | Kiểm tra server đang chạy |

### 5.2. Auth — `/api/auth`

| Method | Path | Auth | Body | Mô tả |
|--------|------|------|------|-------|
| `POST` | `/api/auth/register` | Không | `{ email, password, name? }` | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Không | `{ email, password }` | Đăng nhập, trả JWT |
| `GET` | `/api/auth/me` | **JWT** | — | Lấy profile user hiện tại |

### 5.3. Users — `/api/users`

Tất cả routes yêu cầu header:

```
Authorization: Bearer <token>
```

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/users?page=1&limit=10` | Danh sách user (phân trang) |
| `GET` | `/api/users/:id` | Chi tiết user |
| `PUT` | `/api/users/:id` | Cập nhật user |
| `DELETE` | `/api/users/:id` | Xóa user |
| `POST` | `/api/users/:id/avatar` | Upload avatar (`multipart/form-data`, field `avatar`) |

### 5.4. Format response

**Thành công:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Thành công"
}
```

**Lỗi:**

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errors": []
}
```

---

## 6. Thêm API mới hoặc nhóm API mới

### 6.1. Thêm endpoint vào module đã có

**Ví dụ:** thêm `PATCH /api/users/:id/status` vào module `users`.

| Bước | File | Việc cần làm |
|------|------|--------------|
| 1 | `users.validator.js` | Thêm schema Zod (body/params/query) |
| 2 | `users.service.js` | Thêm hàm business logic + Prisma |
| 3 | `users.controller.js` | Thêm handler gọi service |
| 4 | `users.route.js` | Đăng ký route + middleware |

**Ví dụ route:**

```javascript
// src/modules/users/users.route.js
router.patch(
  '/:id/status',
  validate(userIdParamSchema, 'params'),
  validate(updateStatusSchema),
  usersController.updateStatus
);
```

> Không cần sửa `src/routes/index.js` nếu endpoint nằm trong module đã mount.

---

### 6.2. Thêm nhóm API (module) mới

**Ví dụ:** tạo module `products` → prefix `/api/products`.

#### Bước 1 — Tạo folder module

```
src/modules/products/
├── products.validator.js
├── products.service.js
├── products.controller.js
└── products.route.js
```

Copy cấu trúc từ `src/modules/users/` và đổi tên cho phù hợp.

#### Bước 2 — Thêm model Prisma (nếu cần DB mới)

```prisma
// prisma/schema.prisma
model Product {
  id        String   @id @default(cuid())
  name      String
  price     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Chạy migration:

```bash
pnpm exec prisma migrate dev --name add_product
# hoặc: npx prisma migrate dev --name add_product
```

#### Bước 3 — Mount route vào router trung tâm ★

```javascript
// src/routes/index.js
import productsRoute from '../modules/products/products.route.js';

router.use('/products', productsRoute);
// → Tất cả routes trong products.route.js có prefix /api/products
```

> **Đây là bước bắt buộc** khi thêm nhóm API mới. Nếu thiếu bước này, endpoint sẽ trả 404.

#### Bước 4 — Cấu hình middleware trong `products.route.js`

```javascript
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = Router();

// Bảo vệ toàn module (tuỳ chọn)
router.use(authenticate);

router.get('/', validate(paginationSchema, 'query'), controller.getAll);
router.post('/', validate(createSchema), controller.create);

export default router;
```

#### Bước 5 — Thêm biến môi trường mới (nếu có)

Nếu module cần config mới (API key, URL service...):

1. Thêm vào `.env.example`
2. Thêm vào schema Zod trong `src/config/env.js`
3. Thêm trên Vercel Dashboard → Environment Variables

> **Quy tắc:** Không đọc `process.env.XXX` rải rác — luôn khai báo qua `src/config/env.js`.

#### Bước 6 — Không cần sửa `vercel.json`

File `vercel.json` đã rewrite mọi `/api/*` về `api/index.js`. Module mới tự hoạt động sau khi mount trong `src/routes/index.js`.

---

### 6.3. Sơ đồ quyết định: thêm ở đâu?

```
Cần thêm API?
│
├─ Endpoint thuộc domain đã có (auth, users, products...)?
│   └─ YES → Sửa 4 file trong src/modules/<tên-module>/
│            (validator → service → controller → route)
│
├─ Domain hoàn toàn mới (orders, payments...)?
│   └─ YES → Tạo folder src/modules/<tên-mới>/
│            + Mount trong src/routes/index.js  ★
│            + (Tuỳ chọn) Thêm model prisma/schema.prisma + migrate
│
└─ Middleware dùng chung (rate limit, role check...)?
    └─ Tạo/sửa src/middlewares/<tên>.middleware.js
       Gắn trong *.route.js hoặc src/app.js (global)
```

---

## 7. Quy ước code

| Quy tắc | Chi tiết |
|---------|----------|
| **Response** | Luôn dùng `success()` / `fail()` từ `src/utils/apiResponse.js` |
| **Lỗi async** | Controller dùng `try/catch` + `next(error)` |
| **Validation** | Zod schema trong `*.validator.js`, gắn qua `validate(schema, 'body'\|'query'\|'params')` |
| **Auth** | Protected route dùng `authenticate` middleware |
| **DB** | Import `prisma` từ `src/config/prisma.js`, không `new PrismaClient()` |
| **Env** | Import `env` từ `src/config/env.js` |
| **Upload** | Dùng `uploadAvatar` hoặc tạo middleware Multer mới (memory storage) |
| **Password** | Hash bằng bcrypt trong service, không trả password ra client |
| **Naming** | Folder module số nhiều: `users`, `products`. File: `users.route.js`, ... |

---

## 8. Checklist phát triển

### 8.1. Trước khi code

- [ ] Xác định module mới hay mở rộng module cũ
- [ ] Thiết kế endpoint: method, path, auth, body/query
- [ ] Kiểm tra model Prisma đã đủ fields chưa
- [ ] `.env` local đã cấu hình đầy đủ (xem `.env.example`)

### 8.2. Khi implement

- [ ] Tạo/sửa `*.validator.js` — schema Zod
- [ ] Tạo/sửa `*.service.js` — logic + Prisma
- [ ] Tạo/sửa `*.controller.js` — handler HTTP
- [ ] Tạo/sửa `*.route.js` — đăng ký route + middleware
- [ ] **Module mới:** mount trong `src/routes/index.js`
- [ ] **Model mới:** cập nhật `prisma/schema.prisma` + chạy migrate
- [ ] **Env mới:** cập nhật `src/config/env.js` + `.env.example`

### 8.3. Test local

```bash
# Cài dependencies (lần đầu)
pnpm install

# Generate Prisma Client (sau khi sửa schema)
pnpm run db:generate

# Migrate DB (dev)
pnpm run db:migrate

# Chạy server (hot reload)
pnpm run dev
```

**Kiểm tra từng bước:**

- [ ] `GET http://localhost:3000/api/health` → `success: true`
- [ ] Endpoint public hoạt động (register/login nếu liên quan auth)
- [ ] Endpoint protected trả `401` khi thiếu/sai JWT
- [ ] Validation trả lỗi rõ ràng khi gửi body sai
- [ ] CRUD / upload hoạt động đúng với DB Neon
- [ ] Không log hoặc trả password ra response

**Test nhanh bằng curl:**

```bash
# Health
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678","name":"Test"}'

# Login → lấy token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'

# Gọi API protected
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"
```

### 8.4. Trước khi push / deploy

- [ ] Không commit file `.env` (chỉ `.env.example`)
- [ ] Migration mới đã được tạo và commit trong `prisma/migrations/`
- [ ] `pnpm run build` chạy thành công local (nếu có thể)
- [ ] Code review: controller mỏng, logic nằm ở service
- [ ] Cập nhật tài liệu API trong PR/commit message nếu cần

---

## 9. Deploy lên Vercel

Dự án đã được cấu hình sẵn cho Vercel Serverless. File quan trọng:

- `vercel.json` — rewrite + timeout
- `api/index.js` — serverless handler
- `package.json` → script `build`

### 9.1. Yêu cầu trước deploy

| Hạng mục | Trạng thái |
|----------|------------|
| Repo Git (GitHub / GitLab / Bitbucket) | Code đã push |
| Tài khoản [Vercel](https://vercel.com) | Đã đăng ký |
| Neon PostgreSQL | Đã tạo project + connection strings |
| Cloudinary | Đã có credentials |
| JWT Secret production | ≥ 32 ký tự, **khác** môi trường dev |

### 9.2. Checklist deploy lần đầu

#### Bước 1 — Push code lên Git

```bash
git add .
git commit -m "feat: ready for Vercel deploy"
git push origin main
```

> Không push `.env`. Chỉ commit `.env.example`.

#### Bước 2 — Import project trên Vercel

1. Đăng nhập [vercel.com](https://vercel.com)
2. **Add New → Project**
3. **Import Git Repository** → chọn repo
4. Authorize Git provider nếu chưa kết nối

#### Bước 3 — Cấu hình Build

| Setting | Giá trị |
|---------|---------|
| **Framework Preset** | Other |
| **Root Directory** | `./` |
| **Install Command** | `pnpm install` |
| **Build Command** | `pnpm run build` |
| **Output Directory** | *(để trống)* |
| **Node.js Version** | 18.x hoặc 20.x |

> Repo có `pnpm-lock.yaml` và `packageManager` trong `package.json` → Vercel tự nhận pnpm qua Corepack.

Script build:

```json
"build": "prisma generate && prisma migrate deploy"
```

- `prisma generate` — sinh Prisma Client trên server build
- `prisma migrate deploy` — apply migration lên Neon production (dùng `DIRECT_URL`)

#### Bước 4 — Environment Variables

Vào **Project Settings → Environment Variables**, thêm cho **Production** (và **Preview** nếu cần):

| Key | Ghi chú |
|-----|---------|
| `DATABASE_URL` | Neon **pooled** (`?pgbouncer=true`) |
| `DIRECT_URL` | Neon **direct** (không pgbouncer) — dùng cho migrate |
| `JWT_SECRET` | Secret production, ≥ 32 ký tự |
| `CLOUDINARY_CLOUD_NAME` | Từ Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | Từ Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | Từ Cloudinary Dashboard |
| `NODE_ENV` | `production` |

#### Bước 5 — Deploy

1. Nhấn **Deploy**
2. Chờ build (thường 1–3 phút)
3. Nhận URL: `https://<tên-project>.vercel.app`

#### Bước 6 — Verify sau deploy

```bash
curl https://<tên-project>.vercel.app/api/health
```

Response mong đợi:

```json
{
  "success": true,
  "message": "Server đang hoạt động",
  "data": {
    "timestamp": "...",
    "uptime": ...
  }
}
```

Tiếp theo test auth + API protected trên URL production.

### 9.3. Deploy lại khi có thay đổi

Mỗi lần push lên branch đã kết nối Vercel → **tự động build & deploy**.

```bash
git add .
git commit -m "feat: thêm module products"
git push origin main
```

**Checklist mỗi lần deploy có thay đổi DB:**

- [ ] Đã chạy `prisma migrate dev` local và commit folder migration
- [ ] Build trên Vercel sẽ chạy `prisma migrate deploy` tự động
- [ ] Nếu thêm env mới → cập nhật trên Vercel Dashboard trước khi deploy

**Checklist mỗi lần deploy có API mới:**

- [ ] Module đã mount trong `src/routes/index.js`
- [ ] Test local pass
- [ ] Env production đủ (nếu module cần config mới)

### 9.4. Cấu hình `vercel.json` (đã có sẵn)

```json
{
  "installCommand": "pnpm install",
  "buildCommand": "pnpm run build",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" }
  ],
  "functions": {
    "api/index.js": { "maxDuration": 30 }
  }
}
```

| Cấu hình | Mục đích |
|----------|----------|
| `rewrites` | Mọi `/api/*` → handler `api/index.js` |
| `maxDuration: 30` | Timeout 30s — tránh lỗi khi Neon cold start |
| `buildCommand` | Generate Prisma Client + chạy migration |

### 9.5. Lỗi deploy thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| Build fail `prisma migrate deploy` | Thiếu/sai `DIRECT_URL` | Kiểm tra env trên Vercel |
| `Biến môi trường không hợp lệ` | Thiếu env hoặc `JWT_SECRET` < 32 ký tự | Bổ sung env trên Vercel |
| API 404 | Chưa mount route trong `src/routes/index.js` | Thêm `router.use(...)` |
| DB connection timeout | Sai `DATABASE_URL` hoặc Neon sleep | Dùng pooled URL, gọi lại sau cold start |
| Upload fail | Sai Cloudinary credentials | Kiểm tra 3 biến Cloudinary |

Chi tiết thêm: [SETUP.md — Xử lý lỗi thường gặp](./SETUP.md#11-xử-lý-lỗi-thường-gặp).

---

## 10. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [SETUP.md](./SETUP.md) | Setup local từ đầu (Neon, Cloudinary, npm/pnpm, migrate) |
| [DEPLOY.md](./DEPLOY.md) | Hướng dẫn deploy dev / staging / prod lên Vercel |
| [PROJECT.md](./PROJECT.md) | Overview, thêm API, checklist (file này) |
| `.env.example` | Danh sách biến môi trường |
| `prisma/schema.prisma` | Schema database |

**Tham khảo bên ngoài:**

- [Express.js](https://expressjs.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Neon Docs](https://neon.tech/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Zod](https://zod.dev/)

---

*Cập nhật lần cuối: tháng 6/2026 — base-server-nodejs v1.0.0*
