# Hướng dẫn Setup — Base Server Node.js

REST API server xây bằng **Express.js**, kết nối **Neon PostgreSQL** qua **Prisma ORM**, xác thực **JWT**, upload file qua **Cloudinary**, deploy lên **Vercel Serverless**.

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cấu trúc dự án](#2-cấu-trúc-dự-án)
3. [Tạo tài khoản & dịch vụ cần thiết](#3-tạo-tài-khoản--dịch-vụ-cần-thiết)
4. [Setup local với npm](#4-setup-local-với-npm)
5. [Setup local với pnpm](#5-setup-local-với-pnpm)
6. [Biến môi trường & 3 môi trường (dev / staging / prod)](#6-biến-môi-trường--3-môi-trường-dev--staging--prod)
7. [Prisma — Database & Migration](#7-prisma--database--migration)
8. [Chạy server & kiểm tra API](#8-chạy-server--kiểm-tra-api)
9. [Triển khai 3 môi trường (GitLab → Vercel)](#9-triển-khai-3-môi-trường-gitlab--vercel)
10. [Scripts có sẵn (npm & pnpm)](#10-scripts-có-sẵn-npm--pnpm)
11. [Xử lý lỗi thường gặp](#11-xử-lý-lỗi-thường-gặp)
12. [Thêm module mới](#12-thêm-module-mới)

---

## 1. Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---------|---------------------|---------|
| **Node.js** | 18.x trở lên | Kiểm tra: `node -v` |
| **npm** *hoặc* **pnpm** | npm 9+ / pnpm 9+ | Chọn **một** package manager cho cả dự án |
| **Git** | Bất kỳ | Để clone repo và push lên GitLab |
| Tài khoản **Neon** | Miễn phí | PostgreSQL serverless |
| Tài khoản **Cloudinary** | Miễn phí | Upload ảnh avatar |
| Tài khoản **Vercel** | Miễn phí | Deploy serverless (khi deploy) |

> **Lưu ý:** Dự án dùng ES Modules (`"type": "module"` trong `package.json`), không cần cài thêm Babel hay TypeScript.

### npm vs pnpm — nên chọn gì?

| Tiêu chí | npm | pnpm |
|----------|-----|------|
| Cài sẵn với Node.js | ✅ Có | ❌ Cần cài thêm |
| Tốc độ cài package | Trung bình | Nhanh hơn (cache + hard link) |
| Dung lượng `node_modules` | Lớn hơn | Nhỏ hơn (chia sẻ store toàn máy) |
| Lock file | `package-lock.json` | `pnpm-lock.yaml` |
| Phù hợp team lớn | ✅ | ✅ (khuyến nghị nếu đã quen pnpm) |

> **Quan trọng:** Không trộn npm và pnpm trong cùng một repo. Chọn một loại, xóa lock file của loại kia trước khi chuyển.

---

## 2. Cấu trúc dự án

```
base-server-nodejs/
├── api/
│   └── index.js               # Entry point Vercel + chạy local (listen port)
├── src/
│   ├── config/
│   │   ├── env.js             # Validate & load biến môi trường theo APP_ENV
│   │   ├── environments.js    # Metadata mặc định cho dev / staging / prod
│   │   ├── prisma.js          # PrismaClient singleton (tránh hết connection pool)
│   │   └── cloudinary.js      # Cloudinary SDK + helper upload
│   ├── middlewares/
│   │   ├── auth.middleware.js # Xác thực JWT
│   │   ├── error.middleware.js# Bắt lỗi toàn app (kể cả lỗi Prisma)
│   │   ├── upload.middleware.js# Multer (memory storage cho serverless)
│   │   └── validate.middleware.js # Validate input bằng Zod
│   ├── modules/
│   │   ├── auth/              # Đăng ký, đăng nhập, lấy profile
│   │   └── users/             # CRUD user + upload avatar (module mẫu)
│   ├── routes/
│   │   └── index.js           # Gom tất cả routes module
│   ├── utils/
│   │   └── apiResponse.js     # Format response thống nhất
│   └── app.js                 # Khởi tạo Express app
├── prisma/
│   ├── schema.prisma          # Định nghĩa models
│   └── migrations/            # Migration SQL (tự sinh bởi Prisma)
├── scripts/
│   └── run-with-env.mjs       # Chạy Prisma CLI với .env.{APP_ENV}
├── vercel.json                # Cấu hình rewrite + maxDuration
├── .env.example               # Hướng dẫn tổng quan biến môi trường
├── .env.dev.example           # Template môi trường development
├── .env.staging.example       # Template môi trường staging
├── .env.prod.example          # Template môi trường production
├── .gitignore                 # Loại .env*, node_modules khỏi Git
└── package.json
```

**Luồng xử lý một request:**

```
Client → api/index.js → src/app.js → routes → middleware → controller → service → Prisma → Neon DB
```

---

## 3. Tạo tài khoản & dịch vụ cần thiết

### 3.1. Neon — PostgreSQL Serverless

1. Truy cập [https://console.neon.tech](https://console.neon.tech) và đăng ký/đăng nhập.
2. Nhấn **New Project** → đặt tên project (vd: `base-server`).
3. Chọn region gần bạn nhất (vd: `Singapore` hoặc `US East`).
4. Sau khi tạo xong, vào tab **Connection Details**.
5. Bạn cần lấy **2 connection string**:

| Biến env | Loại connection | Mục đích |
|----------|-----------------|----------|
| `DATABASE_URL` | **Pooled** (có `pgbouncer=true`) | Runtime — Prisma query khi app chạy |
| `DIRECT_URL` | **Direct** (không có pgbouncer) | Migration — `prisma migrate dev/deploy` |

**Ví dụ connection string:**

```env
# Pooled — dùng cho runtime
DATABASE_URL=postgresql://neondb_owner:xxxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true

# Direct — dùng cho migrate
DIRECT_URL=postgresql://neondb_owner:xxxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> **Tại sao cần 2 URL?**  
> PgBouncer (pooler) giúp tái sử dụng connection — tốt cho serverless Vercel. Nhưng `prisma migrate` cần connection trực tiếp để chạy DDL (CREATE TABLE...), nên dùng `DIRECT_URL`.

### 3.2. Cloudinary — Upload ảnh

1. Truy cập [https://cloudinary.com](https://cloudinary.com) và đăng ký tài khoản miễn phí.
2. Vào **Dashboard** → mục **Product Environment Credentials**.
3. Copy 3 giá trị:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

### 3.3. JWT Secret

Tự tạo một chuỗi bí mật **tối thiểu 32 ký tự**. Có thể dùng lệnh:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Lưu kết quả vào `JWT_SECRET` trong file `.env.dev` (và tạo secret **khác** cho `.env.staging`, `.env.prod`).

---

## 4. Setup local với npm

> Nếu bạn dùng **pnpm**, bỏ qua mục này và xem [mục 5 — Setup local với pnpm](#5-setup-local-với-pnpm).

### Bước 1: Clone repository

```bash
git clone <url-repo-gitlab-của-bạn>
cd base-server-nodejs
```

### Bước 2: Cài dependencies

```bash
npm install
```

Lệnh này sẽ:
- Cài tất cả package trong `package.json`
- Tự chạy `prisma generate` (script `postinstall`) để sinh Prisma Client

### Bước 3: Tạo file môi trường dev

```bash
cp .env.dev.example .env.dev
```

Mở file `.env.dev` và điền giá trị thật từ Neon, Cloudinary (xem [mục 6](#6-biến-môi-trường--3-môi-trường-dev--staging--prod)).

> Khi làm việc local, mặc định dùng `APP_ENV=dev` (script `npm run dev` đã set sẵn). Không cần tạo `.env` riêng trừ khi bạn muốn biến chung cho mọi môi trường.

### Bước 4: Sinh Prisma Client

```bash
npx prisma generate
```

> Chạy lại lệnh này mỗi khi sửa `prisma/schema.prisma`.

### Bước 5: Chạy migration — tạo bảng trên Neon (dev)

```bash
npm run db:migrate:dev
# hoặc: npx prisma migrate dev --name init (khi đã có .env.dev)
```

Lệnh này sẽ:
- Load biến từ `.env.dev` qua `APP_ENV=dev`
- Kết nối Neon dev qua `DIRECT_URL`
- Tạo bảng `User` (và các bảng khác trong schema)
- Lưu migration vào `prisma/migrations/`

### Bước 6: Chạy dev server

```bash
npm run dev
```

Nếu thành công, terminal hiển thị:

```
🚀 Server chạy tại http://localhost:3000
🌍 Môi trường: Development (APP_ENV=dev, NODE_ENV=development)
📋 Health check: http://localhost:3000/api/health
🔐 Auth: POST /api/auth/register, POST /api/auth/login
👤 Users: GET /api/users (cần JWT)
```

---

## 5. Setup local với pnpm

[pnpm](https://pnpm.io/) là package manager thay thế npm — nhanh hơn, tiết kiệm dung lượng ổ đĩa, và được Vercel hỗ trợ tự động khi repo có file `pnpm-lock.yaml`.

### 5.1. Cài đặt pnpm

Chọn **một** cách dưới đây:

#### Cách 1: Corepack (khuyến nghị — đi kèm Node.js 18+)

```bash
# Bật Corepack (chỉ cần chạy 1 lần trên máy)
corepack enable

# Kích hoạt pnpm phiên bản mới nhất
corepack prepare pnpm@latest --activate

# Kiểm tra đã cài thành công
pnpm -v
# Kỳ vọng: 9.x hoặc 10.x
```

#### Cách 2: Cài global qua npm

```bash
npm install -g pnpm

pnpm -v
```

#### Cách 3: Script cài nhanh (macOS / Linux)

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Mở terminal mới rồi chạy
pnpm -v
```

#### Cách 4: Homebrew (macOS)

```bash
brew install pnpm
pnpm -v
```

---

### 5.2. Clone repository

```bash
git clone <url-repo-gitlab-của-bạn>
cd base-server-nodejs
```

---

### 5.3. Cài dependencies

```bash
pnpm install
```

Lệnh này sẽ:
- Đọc `package.json` và tạo / cập nhật `pnpm-lock.yaml`
- Cài package vào `node_modules` (cấu trúc symlink — bình thường, không phải lỗi)
- Tự chạy script `postinstall` → `prisma generate` sinh Prisma Client

**So sánh với npm:**

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npx <cmd>` | `pnpm exec <cmd>` hoặc `pnpm dlx <cmd>` |
| `npm run <script>` | `pnpm run <script>` hoặc `pnpm <script>` |

> **Lock file:** Sau `pnpm install`, commit file `pnpm-lock.yaml` lên Git để team và Vercel cài đúng phiên bản package.

---

### 5.4. (Tuỳ chọn) Khai báo package manager trong `package.json`

Thêm dòng sau vào `package.json` để Corepack tự dùng đúng phiên bản pnpm:

```json
{
  "packageManager": "pnpm@9.15.0"
}
```

Kiểm tra phiên bản hiện tại:

```bash
pnpm -v
```

> Không bắt buộc, nhưng giúp đồng bộ pnpm giữa các máy trong team.

---

### 5.5. Tạo file môi trường dev

```bash
cp .env.dev.example .env.dev
```

Mở `.env.dev` và điền giá trị thật từ Neon, Cloudinary (xem [mục 6](#6-biến-môi-trường--3-môi-trường-dev--staging--prod)).

---

### 5.6. Sinh Prisma Client

```bash
pnpm exec prisma generate
# hoặc dùng script có sẵn:
pnpm run db:generate
```

> Chạy lại mỗi khi sửa `prisma/schema.prisma`.

---

### 5.7. Chạy migration — tạo bảng trên Neon (dev)

```bash
pnpm run db:migrate:dev
# hoặc:
pnpm run db:migrate
```

Lệnh này sẽ:
- Load biến từ `.env.dev` qua `APP_ENV=dev`
- Kết nối Neon dev qua `DIRECT_URL`
- Tạo bảng `User` theo `prisma/schema.prisma`
- Lưu migration vào `prisma/migrations/`

---

### 5.8. Chạy dev server

```bash
pnpm run dev
# hoặc viết gọn:
pnpm dev
```

Nếu thành công, terminal hiển thị:

```
🚀 Server chạy tại http://localhost:3000
🌍 Môi trường: Development (APP_ENV=dev, NODE_ENV=development)
📋 Health check: http://localhost:3000/api/health
🔐 Auth: POST /api/auth/register, POST /api/auth/login
👤 Users: GET /api/users (cần JWT)
```

---

### 5.9. Các lệnh pnpm thường dùng trong dự án

```bash
# Cài thêm dependency runtime
pnpm add express

# Cài dependency dev (vd: thêm tool dev)
pnpm add -D prisma

# Gỡ package
pnpm remove <tên-package>

# Cập nhật tất cả package (cẩn thận — test lại sau khi update)
pnpm update

# Xem package nào đã cài
pnpm list --depth=0

# Mở Prisma Studio (GUI database)
pnpm run db:studio

# Chạy local với config staging / prod
pnpm run start:staging
pnpm run start:prod

# Build giống Vercel (generate + migrate deploy)
pnpm run build
```

---

### 5.10. Chuyển từ npm sang pnpm (nếu repo đang dùng npm)

Nếu máy bạn đã chạy `npm install` trước đó:

```bash
# 1. Xóa node_modules và lock file của npm
rm -rf node_modules package-lock.json

# 2. Cài lại bằng pnpm
pnpm install

# 3. Commit lock file mới
git add pnpm-lock.yaml
git commit -m "chore: chuyển sang pnpm"
```

> **Không commit** cả `package-lock.json` và `pnpm-lock.yaml` cùng lúc — chỉ giữ một loại.

---

### 5.11. Cấu hình `.npmrc` (khi gặp lỗi Prisma / native module)

Đa số trường hợp **không cần** file này. Chỉ tạo khi gặp lỗi kiểu *"Cannot find module '@prisma/client'"* hoặc bcrypt build fail:

Tạo file `.npmrc` ở root project:

```ini
# Cho phép hoist một số package lên node_modules root — tương thích tool cũ
shamefully-hoist=true

# Tự động cài peer dependencies thiếu
auto-install-peers=true
```

Sau đó cài lại:

```bash
rm -rf node_modules
pnpm install
```

---

## 6. Biến môi trường & 3 môi trường (dev / staging / prod)

Dự án tách cấu hình theo **3 môi trường** thông qua biến `APP_ENV`. Mỗi môi trường có file riêng, database riêng, secret riêng — tránh dùng chung data hoặc JWT giữa dev và production.

### 6.1. Tổng quan

| `APP_ENV` | Tên hiển thị | Mục đích | Chạy ở đâu |
|-----------|--------------|----------|------------|
| `dev` | Development | Phát triển local, thử nghiệm tự do | Máy developer |
| `staging` | Staging | QA, UAT, demo trước khi lên prod | Vercel Preview / server staging |
| `prod` | Production | Người dùng thật | Vercel Production |

**Luồng load biến môi trường** (`src/config/env.js`):

```
1. Đọc APP_ENV từ process.env (mặc định: dev)
2. Load .env          → biến chung (tùy chọn)
3. Load .env.{APP_ENV} → override theo môi trường (.env.dev / .env.staging / .env.prod)
4. Validate bằng Zod → crash ngay nếu thiếu/sai
```

### 6.2. Chi tiết từng môi trường

#### Development (`APP_ENV=dev`)

| Thuộc tính | Giá trị |
|------------|---------|
| File cấu hình | `.env.dev` (copy từ `.env.dev.example`) |
| `NODE_ENV` mặc định | `development` |
| Database | Neon project **dev** (có thể reset/xóa data thoải mái) |
| JWT / Cloudinary | Credentials **dev** — không dùng chung với prod |
| Hiển thị lỗi chi tiết | ✅ Có — trả message lỗi đầy đủ cho developer |
| Script chạy | `pnpm dev`, `pnpm start`, `pnpm db:migrate:dev` |

Dùng khi: code feature mới, debug, chạy Prisma Studio, test API local.

#### Staging (`APP_ENV=staging`)

| Thuộc tính | Giá trị |
|------------|---------|
| File cấu hình | `.env.staging` (copy từ `.env.staging.example`) |
| `NODE_ENV` mặc định | `production` |
| Database | Neon project **staging** — data giống prod nhưng tách biệt |
| JWT / Cloudinary | Credentials **staging** — secret khác dev và prod |
| Hiển thị lỗi chi tiết | ✅ Có — giúp QA debug trước khi release |
| Script chạy | `pnpm start:staging`, `pnpm db:deploy:staging` |

Dùng khi: team QA test tích hợp, demo cho stakeholder, kiểm tra migration trước prod.

#### Production (`APP_ENV=prod`)

| Thuộc tính | Giá trị |
|------------|---------|
| File cấu hình | `.env.prod` (copy từ `.env.prod.example`) |
| `NODE_ENV` mặc định | `production` |
| Database | Neon project **prod** — data người dùng thật |
| JWT / Cloudinary | Credentials **prod** — bảo mật cao nhất |
| Hiển thị lỗi chi tiết | ❌ Không — client chỉ nhận `"Đã xảy ra lỗi server"` |
| Script chạy | `pnpm start:prod`, `pnpm db:deploy:prod`, `pnpm build` |

Dùng khi: deploy lên Vercel Production, phục vụ người dùng cuối.

> **Khuyến nghị:** Tạo **3 Neon project** riêng (`base-server-dev`, `base-server-staging`, `base-server-prod`). Cloudinary có thể dùng 1 account với folder prefix khác nhau, hoặc tách account nếu cần.

### 6.3. Cấu trúc file môi trường

```
base-server-nodejs/
├── .env.example              # Hướng dẫn tổng quan (commit được)
├── .env.dev.example          # Template dev (commit được)
├── .env.staging.example      # Template staging (commit được)
├── .env.prod.example         # Template prod (commit được)
├── .env                      # (tùy chọn) Biến chung — KHÔNG commit
├── .env.dev                  # Secret dev thật — KHÔNG commit
├── .env.staging              # Secret staging thật — KHÔNG commit
└── .env.prod                 # Secret prod thật — KHÔNG commit
```

**Thiết lập lần đầu:**

```bash
cp .env.dev.example .env.dev
cp .env.staging.example .env.staging
cp .env.prod.example .env.prod
```

Sau đó mở từng file và điền connection string, secret thật cho từng môi trường.

> Nếu repo cũ chỉ có file `.env`, chuyển sang mô hình mới:
> ```bash
> cp .env .env.dev
> ```

### 6.4. Bảng biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `APP_ENV` | ✅ (auto) | `dev` / `staging` / `prod` — xác định file `.env.{APP_ENV}` được load |
| `DATABASE_URL` | ✅ | Connection string Neon **có pgbouncer** — runtime query |
| `DIRECT_URL` | ✅ | Connection string Neon **không pgbouncer** — `prisma migrate` |
| `JWT_SECRET` | ✅ | Chuỗi bí mật ký JWT, **>= 32 ký tự** — **khác nhau** giữa 3 môi trường |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Tên cloud Cloudinary |
| `CLOUDINARY_API_KEY` | ✅ | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | ✅ | API secret Cloudinary |
| `NODE_ENV` | ❌ | `development` / `production` — tự gán theo `APP_ENV` nếu không set |
| `PORT` | ❌ | Port chạy local (mặc định: `3000`) |

**Ví dụ `.env.dev`:**

```env
APP_ENV=dev
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://user:pass@ep-xxx-dev.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:pass@ep-xxx-dev.neon.tech/neondb?sslmode=require

JWT_SECRET=dev-secret-key-min-32-chars-long-enough
CLOUDINARY_CLOUD_NAME=your_dev_cloud
CLOUDINARY_API_KEY=your_dev_api_key
CLOUDINARY_API_SECRET=your_dev_api_secret
```

**Ví dụ `.env.staging`:**

```env
APP_ENV=staging
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://user:pass@ep-xxx-staging.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:pass@ep-xxx-staging.neon.tech/neondb?sslmode=require

JWT_SECRET=staging-secret-key-min-32-chars-long
CLOUDINARY_CLOUD_NAME=your_staging_cloud
CLOUDINARY_API_KEY=your_staging_api_key
CLOUDINARY_API_SECRET=your_staging_api_secret
```

**Ví dụ `.env.prod`:**

```env
APP_ENV=prod
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://user:pass@ep-xxx-prod.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:pass@ep-xxx-prod.neon.tech/neondb?sslmode=require

JWT_SECRET=production-secret-key-min-32-chars-long
CLOUDINARY_CLOUD_NAME=your_prod_cloud
CLOUDINARY_API_KEY=your_prod_api_key
CLOUDINARY_API_SECRET=your_prod_api_secret
```

### 6.5. Metadata trong code (`src/config/environments.js`)

Logic hành vi theo môi trường được định nghĩa tập trung:

| `APP_ENV` | `defaultNodeEnv` | `hideErrorDetails` |
|-----------|------------------|--------------------|
| `dev` | `development` | `false` |
| `staging` | `production` | `false` |
| `prod` | `production` | `true` |

- `hideErrorDetails` điều khiển error middleware: prod ẩn stack/message nội bộ, dev và staging hiện chi tiết.
- Health check (`GET /api/health`) trả `appEnv` và `nodeEnv` để xác nhận đang chạy đúng môi trường.

> App validate tất cả biến bắt buộc ngay khi khởi động (`src/config/env.js`). Nếu thiếu hoặc sai → crash ngay với message rõ ràng.

---

## 7. Prisma — Database & Migration

### Quy trình migration theo môi trường

```
dev (local)  →  tạo migration mới bằng migrate dev
     ↓
staging      →  apply migration: db:deploy:staging
     ↓
prod         →  apply migration: db:deploy:prod (hoặc qua Vercel build)
```

> **Luôn tạo migration trên dev trước**, commit folder `prisma/migrations/`, rồi mới deploy lên staging/prod.

Script `scripts/run-with-env.mjs` tự load `.env.{APP_ENV}` trước khi gọi Prisma CLI — không cần copy file env thủ công.

### Các lệnh thường dùng

| Mục đích | npm | pnpm |
|----------|-----|------|
| Sinh lại `@prisma/client` | `npm run db:generate` | `pnpm run db:generate` |
| Tạo migration + apply (**dev**) | `npm run db:migrate:dev -- --name <tên>` | `pnpm run db:migrate:dev -- --name <tên>` |
| Apply migration (**staging**) | `npm run db:deploy:staging` | `pnpm run db:deploy:staging` |
| Apply migration (**prod**) | `npm run db:deploy:prod` | `pnpm run db:deploy:prod` |
| GUI xem/sửa data (dev) | `npm run db:studio` | `pnpm run db:studio` |
| Đồng bộ schema nhanh (prototype) | `npx prisma db push` | `pnpm exec prisma db push` |

**Ví dụ tạo migration mới trên dev:**

```bash
# pnpm
pnpm run db:migrate:dev -- --name add_product_table

# npm
npm run db:migrate:dev -- --name add_product_table
```

**Ví dụ apply migration lên staging sau khi merge:**

```bash
pnpm run db:deploy:staging
```

### Model hiện tại (`prisma/schema.prisma`)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // đã hash bcrypt, KHÔNG lưu plain text
  name      String?
  avatar    String?  // URL ảnh trên Cloudinary
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Khi thêm model mới

1. Sửa `prisma/schema.prisma`
2. Chạy migration trên **dev**:
   - pnpm: `pnpm run db:migrate:dev -- --name add_product_table`
   - npm: `npm run db:migrate:dev -- --name add_product_table`
3. Commit `prisma/migrations/` lên Git
4. Deploy staging → `pnpm run db:deploy:staging`
5. Deploy prod → `pnpm run db:deploy:prod` (hoặc tự chạy qua Vercel build)

---

## 8. Chạy server & kiểm tra API

### 8.1. Danh sách endpoints

| Method | Route | Auth | Mô tả |
|--------|-------|------|-------|
| `GET` | `/api/health` | ❌ | Kiểm tra server còn sống |
| `POST` | `/api/auth/register` | ❌ | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | ❌ | Đăng nhập, nhận JWT |
| `GET` | `/api/auth/me` | ✅ JWT | Lấy profile user đang đăng nhập |
| `GET` | `/api/users` | ✅ JWT | Danh sách user (phân trang) |
| `GET` | `/api/users/:id` | ✅ JWT | Chi tiết 1 user |
| `PUT` | `/api/users/:id` | ✅ JWT | Cập nhật user |
| `DELETE` | `/api/users/:id` | ✅ JWT | Xóa user |
| `POST` | `/api/users/:id/avatar` | ✅ JWT | Upload avatar (multipart) |

### 8.2. Format response

**Thành công:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Thành công"
}
```

**Thất bại:**

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errors": [
    { "field": "email", "message": "Email không hợp lệ" }
  ]
}
```

### 8.3. Test bằng curl

**Health check** (kiểm tra `appEnv` để xác nhận đúng môi trường):

```bash
curl http://localhost:3000/api/health
```

Response mẫu:

```json
{
  "success": true,
  "message": "Server đang hoạt động",
  "data": {
    "appEnv": "dev",
    "nodeEnv": "development",
    "timestamp": "2026-06-05T10:00:00.000Z",
    "uptime": 12.34
  }
}
```

**Đăng ký:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "12345678",
    "name": "Test User"
  }'
```

**Đăng nhập (lưu token trả về):**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "12345678"
  }'
```

**Lấy danh sách users (thay `<TOKEN>` bằng JWT thật):**

```bash
curl http://localhost:3000/api/users?page=1&limit=10 \
  -H "Authorization: Bearer <TOKEN>"
```

**Lấy profile:**

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

**Upload avatar:**

```bash
curl -X POST http://localhost:3000/api/users/<USER_ID>/avatar \
  -H "Authorization: Bearer <TOKEN>" \
  -F "avatar=@/đường/dẫn/ảnh.jpg"
```

### 8.4. Test bằng Postman / Thunder Client

1. Tạo request **POST** `http://localhost:3000/api/auth/login` với body JSON.
2. Copy `data.token` từ response.
3. Với các route cần auth: tab **Authorization** → Type: **Bearer Token** → dán token.

---

## 9. Triển khai 3 môi trường (GitLab → Vercel)

> **Tài liệu deploy đầy đủ:** Xem [DEPLOY.md](./DEPLOY.md) — hướng dẫn chi tiết deploy dev / staging / prod, checklist release và xử lý lỗi.

### 9.1. Kiến trúc triển khai

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitLab Repository                        │
│  main branch ──────────────────────────► Vercel Production (prod)│
│  develop / staging branch ─────────────► Vercel Preview (staging)│
│  feature branches ─────────────────────► Vercel Preview (tùy)   │
└─────────────────────────────────────────────────────────────────┘

Local (APP_ENV=dev)          Vercel Preview (APP_ENV=staging)     Vercel Production (APP_ENV=prod)
├── .env.dev                 ├── Neon staging DB                    ├── Neon prod DB
├── Neon dev DB              ├── JWT staging secret                 ├── JWT prod secret
└── Cloudinary dev           └── Cloudinary staging                 └── Cloudinary prod
```

| Môi trường app | Vercel target | Branch gợi ý | `APP_ENV` trên Vercel |
|----------------|---------------|--------------|------------------------|
| Development | — (chỉ local) | — | `dev` |
| Staging | **Preview** | `develop`, `staging` | `staging` |
| Production | **Production** | `main` | `prod` |

### 9.2. Chuẩn bị hạ tầng cho 3 môi trường

#### Neon — tạo 3 database project

Trên [Neon Console](https://console.neon.tech), tạo 3 project riêng:

| Neon project | Gắn với | Ghi chú |
|--------------|---------|---------|
| `base-server-dev` | Local dev | Có thể reset data, dùng free tier |
| `base-server-staging` | Vercel Preview | Data test/QA, tách biệt prod |
| `base-server-prod` | Vercel Production | Data người dùng thật |

Mỗi project cần **2 connection string** (`DATABASE_URL` pooled + `DIRECT_URL` direct) — xem [mục 3.1](#31-neon--postgresql-serverless).

#### Cloudinary — tách theo môi trường

| Cách | Mô tả |
|------|-------|
| **Khuyến nghị** | 1 Cloudinary account, upload vào folder `dev/`, `staging/`, `prod/` |
| **Bảo mật cao** | Tách account Cloudinary cho staging và prod |

#### JWT Secret — bắt buộc khác nhau

```bash
# Sinh 3 secret riêng
node -e "console.log('dev:     ', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('staging: ', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('prod:    ', require('crypto').randomBytes(32).toString('hex'))"
```

### 9.3. Push code lên GitLab

```bash
git init
git add .
git commit -m "feat: init Express REST API server"
git remote add origin <url-repo-gitlab>
git push -u origin main
```

> **Quan trọng:** Không commit `.env`, `.env.dev`, `.env.staging`, `.env.prod`. Chỉ commit các file `*.example`.

### 9.4. Tạo project trên Vercel

1. Đăng nhập [https://vercel.com](https://vercel.com).
2. **Add New → Project**.
3. **Import Git Repository** → chọn GitLab → authorize nếu chưa kết nối.
4. Chọn repo `base-server-nodejs`.
5. Cấu hình **Production Branch** = `main`.

**Gợi ý branch strategy:**

| Branch | Vercel deployment | `APP_ENV` |
|--------|-------------------|-----------|
| `main` | Production | `prod` |
| `develop` hoặc `staging` | Preview (staging chính) | `staging` |
| `feature/*` | Preview (tùy chọn) | `staging` hoặc bỏ qua |

### 9.5. Cấu hình Build trên Vercel

#### Dùng npm

| Setting | Giá trị |
|---------|---------|
| **Framework Preset** | Other |
| **Root Directory** | `./` (mặc định) |
| **Build Command** | `npm run build` |
| **Output Directory** | *(để trống)* |
| **Install Command** | `npm install` |
| **Node.js Version** | 18.x hoặc 20.x |

#### Dùng pnpm

| Setting | Giá trị |
|---------|---------|
| **Framework Preset** | Other |
| **Root Directory** | `./` (mặc định) |
| **Build Command** | `pnpm run build` |
| **Output Directory** | *(để trống)* |
| **Install Command** | `pnpm install` |
| **Node.js Version** | 18.x hoặc 20.x |

> **Tự động nhận diện:** Nếu repo có `pnpm-lock.yaml`, Vercel thường tự chọn pnpm. Kiểm tra **Project Settings → General → Build & Development Settings**.

Script `build` trong `package.json`:

```json
"build": "prisma generate && prisma migrate deploy"
```

- `prisma generate` — sinh Prisma Client trên server build
- `prisma migrate deploy` — apply migration lên DB của môi trường đang build (dùng `DIRECT_URL` từ env Vercel)

> Build trên **Production** sẽ migrate DB prod; build **Preview** sẽ migrate DB staging — vì mỗi target có bộ env variables riêng.

### 9.6. Environment Variables trên Vercel (quan trọng)

Vào **Project Settings → Environment Variables**. Thêm biến **riêng** cho từng Vercel target:

#### Biến cho **Production** (`APP_ENV=prod`)

Chọn scope: ☑️ **Production** only

| Key | Value |
|-----|-------|
| `APP_ENV` | `prod` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **prod** pooled (`pgbouncer=true`) |
| `DIRECT_URL` | Neon **prod** direct |
| `JWT_SECRET` | Secret prod (>= 32 ký tự, khác staging/dev) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary prod |
| `CLOUDINARY_API_KEY` | Cloudinary prod |
| `CLOUDINARY_API_SECRET` | Cloudinary prod |

#### Biến cho **Preview / Staging** (`APP_ENV=staging`)

Chọn scope: ☑️ **Preview** only

| Key | Value |
|-----|-------|
| `APP_ENV` | `staging` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **staging** pooled |
| `DIRECT_URL` | Neon **staging** direct |
| `JWT_SECRET` | Secret staging (khác prod) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary staging |
| `CLOUDINARY_API_KEY` | Cloudinary staging |
| `CLOUDINARY_API_SECRET` | Cloudinary staging |

#### Biến cho **Development** (tùy chọn trên Vercel)

Thông thường **không cần** set env dev trên Vercel vì dev chạy local với `.env.dev`. Nếu muốn deploy dev lên Vercel Preview cho test nhanh, chọn scope **Development** và set `APP_ENV=dev` + credentials Neon dev.

> **Lưu ý:** `APP_ENV` là biến **bắt buộc** trên Vercel để app biết đang ở staging hay prod. Thiếu biến này → app mặc định `dev` và có thể dùng sai logic ẩn lỗi.

### 9.7. Deploy lần đầu

**Production (prod):**

1. Đảm bảo đã set env Production (mục 9.6).
2. Push lên `main` → Vercel tự deploy Production.
3. URL: `https://<tên-project>.vercel.app`

**Staging:**

1. Đảm bảo đã set env Preview (mục 9.6).
2. Push lên `develop` hoặc tạo PR → Vercel tạo Preview URL.
3. URL: `https://<tên-project>-<hash>.vercel.app`

### 9.8. Kiểm tra sau deploy

```bash
# Production
curl https://<tên-project>.vercel.app/api/health

# Staging (Preview)
curl https://<preview-url>.vercel.app/api/health
```

Response mong đợi — **Production:**

```json
{
  "success": true,
  "message": "Server đang hoạt động",
  "data": {
    "appEnv": "prod",
    "nodeEnv": "production",
    "timestamp": "2026-06-05T...",
    "uptime": 123.45
  }
}
```

Response mong đợi — **Staging:**

```json
{
  "data": {
    "appEnv": "staging",
    "nodeEnv": "production"
  }
}
```

> Luôn kiểm tra `appEnv` trong health check để chắc chắn deploy đúng môi trường, đặc biệt khi có nhiều Preview deployment.

### 9.9. Quy trình release (dev → staging → prod)

```
1. Phát triển local (APP_ENV=dev)
   pnpm dev
   pnpm run db:migrate:dev -- --name feature_x

2. Commit & push lên branch develop
   git push origin develop
   → Vercel Preview deploy (APP_ENV=staging)
   → QA test trên URL preview

3. Merge develop → main
   git push origin main
   → Vercel Production deploy (APP_ENV=prod)
   → Build tự chạy prisma migrate deploy lên DB prod
```

**Checklist trước khi merge lên main:**

- [ ] Migration đã test trên dev
- [ ] `prisma/migrations/` đã commit
- [ ] Staging health check trả `appEnv: "staging"`
- [ ] QA đã pass trên staging URL
- [ ] Env Production trên Vercel đã set `APP_ENV=prod` và DB prod credentials

### 9.10. Cấu hình `vercel.json` (đã có sẵn)

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

- **rewrites:** Mọi request `/api/*` đều vào `api/index.js` (serverless function).
- **maxDuration: 30:** Tăng timeout lên 30 giây — tránh lỗi khi Neon cold start lần đầu.

### 9.11. Deploy lại khi có thay đổi

Mỗi lần push → Vercel tự build & deploy theo branch target.

```bash
git add .
git commit -m "feat: thêm tính năng X"
git push origin develop   # → staging preview
# sau khi QA pass:
git push origin main      # → production
```

Nếu sửa `schema.prisma`, tạo migration trên dev trước khi push:

```bash
pnpm run db:migrate:dev -- --name ten_migration

git add prisma/migrations/
git commit -m "chore: add migration ten_migration"
git push origin develop   # staging build sẽ migrate DB staging
# sau khi QA pass:
git push origin main      # prod build sẽ migrate DB prod
```

---

## 10. Scripts có sẵn (npm & pnpm)

Các script định nghĩa trong `package.json` — chỉ khác lệnh gọi ở prefix:

| Script | `APP_ENV` | Lệnh thực thi | npm | pnpm |
|--------|-----------|---------------|-----|------|
| `dev` | `dev` | `node --watch api/index.js` | `npm run dev` | `pnpm dev` |
| `start` | `dev` | `node api/index.js` | `npm start` | `pnpm start` |
| `start:staging` | `staging` | `node api/index.js` | `npm run start:staging` | `pnpm run start:staging` |
| `start:prod` | `prod` | `node api/index.js` | `npm run start:prod` | `pnpm run start:prod` |
| `build` | *(từ env Vercel)* | `prisma generate && prisma migrate deploy` | `npm run build` | `pnpm run build` |
| `db:generate` | — | `prisma generate` | `npm run db:generate` | `pnpm run db:generate` |
| `db:migrate` | `dev` | `prisma migrate dev` (qua `run-with-env.mjs`) | `npm run db:migrate` | `pnpm run db:migrate` |
| `db:migrate:dev` | `dev` | `prisma migrate dev` | `npm run db:migrate:dev` | `pnpm run db:migrate:dev` |
| `db:deploy` | `prod` | `prisma migrate deploy` | `npm run db:deploy` | `pnpm run db:deploy` |
| `db:deploy:staging` | `staging` | `prisma migrate deploy` | `npm run db:deploy:staging` | `pnpm run db:deploy:staging` |
| `db:deploy:prod` | `prod` | `prisma migrate deploy` | `npm run db:deploy:prod` | `pnpm run db:deploy:prod` |
| `db:studio` | `dev` | `prisma studio` | `npm run db:studio` | `pnpm run db:studio` |

> Với pnpm, `pnpm dev` tương đương `pnpm run dev` — có thể bỏ từ `run` với script không trùng tên lệnh pnpm built-in.

**Chạy thủ công với môi trường bất kỳ:**

```bash
APP_ENV=staging node api/index.js
APP_ENV=prod node scripts/run-with-env.mjs prod prisma migrate deploy
```

---

## 11. Xử lý lỗi thường gặp

### ❌ `APP_ENV không hợp lệ`

**Nguyên nhân:** `APP_ENV` không phải `dev`, `staging`, hoặc `prod`.  
**Cách fix:** Kiểm tra script trong `package.json` hoặc env trên Vercel — chỉ dùng 3 giá trị trên.

---

### ❌ Health check trả `appEnv: "dev"` trên Vercel Production

**Nguyên nhân:** Thiếu biến `APP_ENV=prod` trong Vercel Environment Variables (scope Production).  
**Cách fix:** Thêm `APP_ENV=prod` vào **Production** scope trên Vercel → redeploy.

---

### ❌ Staging và prod dùng chung database

**Nguyên nhân:** `DATABASE_URL` trên Vercel Preview và Production trỏ cùng 1 Neon project.  
**Cách fix:** Tạo Neon project riêng, set env Preview = staging DB, Production = prod DB (xem [mục 9.6](#96-environment-variables-trên-vercel-quan-trọng)).

---

### ❌ `Biến môi trường không hợp lệ: JWT_SECRET phải >= 32 ký tự`

**Nguyên nhân:** `JWT_SECRET` quá ngắn.  
**Cách fix:** Tạo chuỗi >= 32 ký tự và cập nhật `.env.dev` / `.env.staging` / `.env.prod` tương ứng.

---

### ❌ `Can't reach database server` / `Connection refused`

**Nguyên nhân:** `DATABASE_URL` hoặc `DIRECT_URL` sai, hoặc Neon project bị suspend (free tier idle).  
**Cách fix:**
1. Kiểm tra đang dùng đúng file env (`.env.dev` / `.env.staging` / `.env.prod`) hoặc đúng scope trên Vercel.
2. Kiểm tra lại connection string trên Neon dashboard.
3. Vào Neon console → wake up database nếu bị sleep.
4. Đảm bảo có `?sslmode=require` trong URL.

---

### ❌ `P2002: Unique constraint failed` (HTTP 409)

**Nguyên nhân:** Email đã tồn tại khi đăng ký.  
**Cách fix:** Dùng email khác hoặc đăng nhập bằng email cũ.

---

### ❌ `P2025: Record not found` (HTTP 404)

**Nguyên nhân:** Update/delete user với `id` không tồn tại.  
**Cách fix:** Kiểm tra `id` đúng format `cuid`.

---

### ❌ `401 Unauthorized` — Token không hợp lệ

**Nguyên nhân:** Thiếu header, token hết hạn, hoặc `JWT_SECRET` khác giữa lúc ký và verify.  
**Cách fix:**
1. Gửi header: `Authorization: Bearer <token>`
2. Đăng nhập lại để lấy token mới.
3. Đảm bảo `JWT_SECRET` giống nhau giữa các lần chạy **cùng môi trường** (dev/staging/prod có secret khác nhau là đúng).

---

### ❌ Vercel build fail: `prisma migrate deploy`

**Nguyên nhân:** Thiếu `DIRECT_URL` trên Vercel, hoặc chưa commit folder `prisma/migrations/`.  
**Cách fix:**
1. Thêm `DIRECT_URL` vào Environment Variables trên Vercel.
2. Commit và push `prisma/migrations/` lên Git.

---

### ❌ Upload avatar fail

**Nguyên nhân:** Sai Cloudinary credentials, file quá 5MB, hoặc không phải ảnh.  
**Cách fix:**
1. Kiểm tra 3 biến `CLOUDINARY_*` trong file env của môi trường đang chạy.
2. File <= 5MB, định dạng JPEG/PNG/WebP/GIF.
3. Gửi đúng field name: `avatar` (multipart/form-data).

---

### ❌ pnpm: `ERR_PNPM_OUTDATED_LOCKFILE`

**Nguyên nhân:** `package.json` đã sửa nhưng chưa cập nhật `pnpm-lock.yaml`.  
**Cách fix:**

```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update pnpm lockfile"
```

---

### ❌ pnpm: `Cannot find module '@prisma/client'`

**Nguyên nhân:** Chưa chạy `prisma generate` sau `pnpm install`, hoặc cấu trúc `node_modules` của pnpm chưa resolve đúng.  
**Cách fix:**

```bash
pnpm run db:generate
# Nếu vẫn lỗi, thử cài lại:
rm -rf node_modules
pnpm install
```

Nếu vẫn fail → tạo `.npmrc` với `shamefully-hoist=true` (xem [mục 5.11](#511-cấu-hình-npmrc-khi-gặp-lỗi-prisma--native-module)).

---

### ❌ pnpm: Trộn lock file npm và pnpm

**Nguyên nhân:** Repo có cả `package-lock.json` và `pnpm-lock.yaml`, hoặc `node_modules` cài bằng npm nhưng chạy lệnh pnpm.  
**Cách fix:**

```bash
rm -rf node_modules package-lock.json   # nếu chuyển sang pnpm
pnpm install
```

Chỉ commit **một** loại lock file.

---

### ❌ Vercel build fail khi dùng pnpm

**Nguyên nhân:** Thiếu `pnpm-lock.yaml` trên Git, hoặc Install Command vẫn là `npm install`.  
**Cách fix:**
1. Commit `pnpm-lock.yaml` lên repo.
2. Vercel → **Settings → Build** → đặt Install Command = `pnpm install`.
3. (Tuỳ chọn) Thêm `"packageManager": "pnpm@9.x.x"` vào `package.json`.

---

## 12. Thêm module mới

Copy pattern từ `src/modules/users/`:

### Bước 1: Tạo folder module

```
src/modules/products/
├── products.validator.js   # Schema Zod
├── products.service.js     # Logic Prisma
├── products.controller.js  # HTTP handlers
└── products.route.js       # Express Router
```

### Bước 2: Thêm model vào Prisma (nếu cần)

```prisma
// prisma/schema.prisma
model Product {
  id    String @id @default(cuid())
  name  String
  price Float
}
```

```bash
# pnpm
pnpm run db:migrate:dev -- --name add_product

# npm
npm run db:migrate:dev -- --name add_product
```

### Bước 3: Mount route

```javascript
// src/routes/index.js
import productsRoute from '../modules/products/products.route.js';

router.use('/products', productsRoute);
```

### Bước 4: Gắn middleware trong route

```javascript
// products.route.js
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

router.use(authenticate); // Bảo vệ toàn bộ routes module
router.get('/', validate(paginationSchema, 'query'), controller.getAll);
```

**Pattern chuẩn:** `Route → Validate → Auth → Controller → Service → Prisma`

---

## Tài liệu tham khảo

- [Express.js](https://expressjs.com/)
- [pnpm — Installation](https://pnpm.io/installation)
- [pnpm — CLI commands](https://pnpm.io/pnpm-cli)
- [Prisma Docs](https://www.prisma.io/docs)
- [Neon Docs](https://neon.tech/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel — Package Managers](https://vercel.com/docs/deployments/configure-a-build#package-manager)
- [Cloudinary Node SDK](https://cloudinary.com/documentation/node_integration)
- [Zod Validation](https://zod.dev/)
