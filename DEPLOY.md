# DEPLOY.md — Hướng dẫn triển khai các môi trường

> REST API **base-server-nodejs** — Express.js + Prisma + Neon PostgreSQL + Cloudinary, deploy lên **Vercel Serverless**.

Tài liệu này tập trung vào **triển khai** (dev / staging / prod). Setup local từ đầu xem [SETUP.md](./SETUP.md). Kiến trúc và quy ước code xem [PROJECT.md](./PROJECT.md).

---

## Mục lục

1. [Tổng quan 3 môi trường](#1-tổng-quan-3-môi-trường)
2. [Chuẩn bị hạ tầng](#2-chuẩn-bị-hạ-tầng)
3. [Development — chạy local](#3-development--chạy-local)
4. [Staging — deploy Vercel Preview](#4-staging--deploy-vercel-preview)
5. [Production — deploy Vercel Production](#5-production--deploy-vercel-production)
6. [Quy trình release (dev → staging → prod)](#6-quy-trình-release-dev--staging--prod)
7. [Scripts theo môi trường](#7-scripts-theo-môi-trường)
8. [Cấu hình Vercel](#8-cấu-hình-vercel)
9. [Kiểm tra sau deploy](#9-kiểm-tra-sau-deploy)
10. [Xử lý lỗi deploy thường gặp](#10-xử-lý-lỗi-deploy-thường-gặp)

---

## 1. Tổng quan 3 môi trường

Dự án dùng biến `APP_ENV` để phân tách cấu hình. Mỗi môi trường có **database riêng**, **JWT secret riêng**, **credentials Cloudinary riêng**.

**Trên Vercel:** `APP_ENV` được **tự động** suy ra từ `VERCEL_ENV` (không cần set thủ công):

| `VERCEL_ENV` (Vercel tự set) | `APP_ENV` (app dùng) |
|------------------------------|----------------------|
| `production` | `prod` |
| `preview` | `staging` |
| `development` | `dev` |

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Git Repository                               │
│  main ──────────────────────────────► Vercel Production  (prod)      │
│  develop / staging ─────────────────► Vercel Preview     (staging)   │
│  feature/* ─────────────────────────► Vercel Preview     (tùy chọn)  │
└──────────────────────────────────────────────────────────────────────┘

Local (dev)                    Vercel Preview (staging)        Vercel Production (prod)
├── .env.dev                   ├── Env scope: Preview           ├── Env scope: Production
├── Neon dev DB                ├── Neon staging DB              ├── Neon prod DB
├── JWT dev                    ├── JWT staging                  ├── JWT prod
└── Cloudinary dev             └── Cloudinary staging           └── Cloudinary prod
```

| `APP_ENV` | Tên | Chạy ở đâu | Deploy cloud? |
|-----------|-----|-----------|---------------|
| `dev` | Development | Máy developer (local) | **Không** — theo thiết kế dự án |
| `staging` | Staging | Vercel Preview | **Có** — QA / UAT trước prod |
| `prod` | Production | Vercel Production | **Có** — người dùng thật |

| Môi trường | Vercel target | Branch gợi ý | File env local |
|------------|---------------|--------------|----------------|
| dev | — | — | `.env.dev` |
| staging | **Preview** | `develop`, `staging` | `.env.staging` |
| prod | **Production** | `main` | `.env.prod` |

> **Lưu ý:** `dev` **không** deploy lên Vercel. Nếu cần server online để test → dùng **staging** (Vercel Preview).

---

## 2. Chuẩn bị hạ tầng

### 2.1. Neon — 3 database project

Trên [Neon Console](https://console.neon.tech), tạo 3 project (hoặc 3 branch) riêng:

| Neon project | Gắn với | Ghi chú |
|--------------|---------|---------|
| `base-server-dev` | Local dev | Có thể reset data thoải mái |
| `base-server-staging` | Vercel Preview | Data test/QA, tách biệt prod |
| `base-server-prod` | Vercel Production | Data người dùng thật |

Mỗi project cần **2 connection string**:

| Biến | Loại kết nối | Dùng cho |
|------|--------------|----------|
| `DATABASE_URL` | Pooled (`pgbouncer=true`) | Runtime — Prisma query |
| `DIRECT_URL` | Direct (không pgbouncer) | `prisma migrate dev/deploy` |

### 2.2. Cloudinary

| Cách | Mô tả |
|------|-------|
| **Khuyến nghị** | 1 account, upload vào folder `dev/`, `staging/`, `prod/` |
| **Bảo mật cao** | Tách account cho staging và prod |

### 2.3. JWT Secret — bắt buộc khác nhau

```bash
node -e "console.log('dev:     ', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('staging: ', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('prod:    ', require('crypto').randomBytes(32).toString('hex'))"
```

Lưu vào `.env.dev`, `.env.staging`, `.env.prod` tương ứng (và Vercel Dashboard cho staging/prod).

### 2.4. File môi trường local

```bash
cp .env.dev.example .env.dev
cp .env.staging.example .env.staging
cp .env.prod.example .env.prod
```

Điền giá trị thật vào từng file. **Không commit** `.env`, `.env.dev`, `.env.staging`, `.env.prod` — chỉ commit `*.example`.

### 2.5. Yêu cầu runtime

| Hạng mục | Phiên bản |
|----------|-----------|
| Node.js | **≥ 22.13** (pnpm 11 yêu cầu) |
| pnpm | **11.1.3** (ghim trong `packageManager` — Corepack tự dùng) |

```bash
nvm use 22          # hoặc nvm alias default 22
corepack enable
pnpm -v             # 11.1.3
```

---

## 3. Development — chạy local

Môi trường **dev** chỉ chạy trên máy developer, không deploy lên Vercel.

### 3.1. Cài dependency

```bash
nvm use 22
corepack enable
pnpm install
```

> Nếu gặp lỗi `bcrypt_lib.node` không tìm thấy: đảm bảo `pnpm-workspace.yaml` có `allowBuilds.bcrypt: true`, rồi chạy `pnpm rebuild bcrypt`.

### 3.2. Migrate database dev

```bash
pnpm run db:migrate:dev
# Tạo migration mới:
pnpm run db:migrate:dev -- --name ten_migration
```

### 3.3. Chạy server

```bash
pnpm dev
```

Server chạy tại `http://localhost:3000` (hoặc `PORT` trong `.env.dev`).

### 3.4. Kiểm tra

```bash
curl http://localhost:3000/api/health
```

Response mong đợi:

```json
{
  "success": true,
  "data": {
    "appEnv": "dev",
    "nodeEnv": "development"
  }
}
```

### 3.5. Scripts dev thường dùng

| Mục đích | Lệnh |
|----------|------|
| Dev server (hot reload) | `pnpm dev` |
| Chạy không watch | `pnpm start` |
| Prisma Studio | `pnpm run db:studio` |
| Sinh Prisma Client | `pnpm run db:generate` |
| Tạo + apply migration | `pnpm run db:migrate:dev -- --name <tên>` |

---

## 4. Staging — deploy Vercel Preview

Staging dùng để QA, demo, kiểm tra migration trước khi lên production.

### 4.1. Chuẩn bị

1. Đã có Neon project **staging** + 2 connection string.
2. Đã tạo `.env.staging` local (để test hoặc chạy `db:deploy:staging` thủ công).
3. Repo đã push lên Git (GitLab / GitHub / Bitbucket).

### 4.2. Cấu hình Environment Variables trên Vercel

**Project Settings → Environment Variables** — chọn scope **Preview** only:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **staging** pooled (`pgbouncer=true`) |
| `DIRECT_URL` | Neon **staging** direct |
| `JWT_SECRET` | Secret staging (≥ 32 ký tự, **khác** dev và prod) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary staging |
| `CLOUDINARY_API_KEY` | Cloudinary staging |
| `CLOUDINARY_API_SECRET` | Cloudinary staging |

> `APP_ENV` **không cần** set trên Vercel — app tự map từ `VERCEL_ENV`: Preview → `staging`, Production → `prod`. Chỉ set `APP_ENV` thủ công nếu muốn ghi đè.

### 4.3. Deploy staging

```bash
# Tạo branch develop (nếu chưa có)
git checkout -b develop
git push -u origin develop
```

Mỗi lần push lên `develop` (hoặc tạo PR) → Vercel tự build **Preview deployment**.

URL dạng: `https://<tên-project>-<hash>.vercel.app`

### 4.4. Migration trên staging

**Tự động (khuyến nghị):** Khi Vercel build Preview, script `pnpm run build` chạy `prisma migrate deploy`. Vercel inject env scope **Preview** → migration apply lên DB staging.

**Thủ công (local):**

```bash
pnpm run db:deploy:staging
```

### 4.5. Test staging local (tùy chọn)

Chạy server local với config staging:

```bash
pnpm run start:staging
curl http://localhost:3000/api/health
# Kỳ vọng: "appEnv": "staging"
```

---

## 5. Production — deploy Vercel Production

### 5.1. Chuẩn bị

1. Đã có Neon project **prod** + 2 connection string.
2. Đã tạo `.env.prod` local (để test `pnpm build` trước khi push).
3. Migration đã test trên dev và staging.
4. Folder `prisma/migrations/` đã commit lên Git.

### 5.2. Cấu hình Environment Variables trên Vercel

**Project Settings → Environment Variables** — chọn scope **Production** only:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **prod** pooled (`pgbouncer=true`) |
| `DIRECT_URL` | Neon **prod** direct |
| `JWT_SECRET` | Secret prod (≥ 32 ký tự, **khác** staging/dev) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary prod |
| `CLOUDINARY_API_KEY` | Cloudinary prod |
| `CLOUDINARY_API_SECRET` | Cloudinary prod |

### 5.3. Tạo project Vercel (lần đầu)

1. Đăng nhập [vercel.com](https://vercel.com).
2. **Add New → Project** → Import Git Repository.
3. Chọn repo `base-server-nodejs`.
4. **Production Branch** = `main`.
5. Cấu hình build (xem [mục 8](#8-cấu-hình-vercel)).
6. Set env Production (mục 5.2).
7. Nhấn **Deploy**.

### 5.4. Deploy production

```bash
git push origin main
```

URL: `https://<tên-project>.vercel.app`

### 5.5. Test build prod local (tùy chọn)

```bash
pnpm build
```

Script `build` load `.env.prod` rồi chạy `prisma generate` + `prisma migrate deploy` lên DB prod. Chỉ chạy khi đã có `.env.prod` với credentials prod thật.

### 5.6. Migration trên prod

**Tự động:** Mỗi lần Vercel build Production → `pnpm run build` → `prisma migrate deploy` lên DB prod.

**Thủ công (local):**

```bash
pnpm run db:deploy:prod
```

---

## 6. Quy trình release (dev → staging → prod)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  1. DEV     │────►│  2. STAGING  │────►│  3. PROD    │
│  (local)    │     │  (Preview)   │     │  (Production)│
└─────────────┘     └──────────────┘     └─────────────┘
```

### Bước 1 — Phát triển local

```bash
pnpm dev
pnpm run db:migrate:dev -- --name feature_x
# Test API local (xem API.md)
```

### Bước 2 — Deploy staging

```bash
git add .
git commit -m "feat: thêm tính năng X"
git push origin develop
# → Vercel Preview deploy (APP_ENV=staging)
# → QA test trên URL preview
```

### Bước 3 — Deploy production

```bash
# Sau khi QA pass trên staging
git checkout main
git merge develop
git push origin main
# → Vercel Production deploy (APP_ENV=prod)
# → Build tự chạy prisma migrate deploy lên DB prod
```

### Checklist trước khi merge lên `main`

- [ ] Migration đã test trên dev (`pnpm run db:migrate:dev`)
- [ ] Folder `prisma/migrations/` đã commit
- [ ] Staging health check trả `"appEnv": "staging"`
- [ ] QA đã pass trên staging URL
- [ ] Env Production trên Vercel đã set DB prod credentials (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, …)
- [ ] `JWT_SECRET` prod khác staging và dev

### Khi có thay đổi `schema.prisma`

```bash
# 1. Tạo migration trên dev
pnpm run db:migrate:dev -- --name ten_migration

# 2. Commit migration
git add prisma/migrations/
git commit -m "chore: add migration ten_migration"

# 3. Push staging → build Preview migrate DB staging
git push origin develop

# 4. Sau QA pass → push main → build Production migrate DB prod
git push origin main
```

---

## 7. Scripts theo môi trường

| Script | `APP_ENV` | Mục đích | Khi nào dùng |
|--------|-----------|----------|--------------|
| `pnpm dev` | `dev` | Dev server + hot reload | Phát triển local |
| `pnpm start` | `dev` | Chạy server dev | Test local không watch |
| `pnpm run start:staging` | `staging` | Chạy server staging | Test local với config staging |
| `pnpm run start:prod` | `prod` | Chạy server prod | Test local với config prod |
| `pnpm build` | `prod` | Generate + migrate deploy | Vercel build / test build prod local |
| `pnpm run db:migrate:dev` | `dev` | Tạo + apply migration | Phát triển schema |
| `pnpm run db:deploy:staging` | `staging` | Apply migration | Deploy DB staging thủ công |
| `pnpm run db:deploy:prod` | `prod` | Apply migration | Deploy DB prod thủ công |
| `pnpm run db:studio` | `dev` | GUI xem/sửa data | Debug data dev |

Script `build` trong `package.json`:

```json
"build": "prisma generate && node scripts/run-with-env.mjs prod prisma migrate deploy"
```

- **Local:** load biến từ `.env.prod`.
- **Vercel:** dùng env variables đã set trên Dashboard (theo scope Production hoặc Preview). Mỗi target có bộ `DATABASE_URL` / `DIRECT_URL` riêng → migration apply đúng DB.

---

## 8. Cấu hình Vercel

### 8.1. Build & Development Settings

| Setting | Giá trị |
|---------|---------|
| **Framework Preset** | Other |
| **Root Directory** | `./` |
| **Install Command** | `pnpm install` |
| **Build Command** | `pnpm run build` |
| **Output Directory** | *(để trống)* |
| **Node.js Version** | **22.x** |

> Repo có `pnpm-lock.yaml` và `packageManager` trong `package.json` → Vercel tự nhận pnpm qua Corepack.

### 8.2. `vercel.json` (đã có sẵn)

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
| `rewrites` | Mọi request `/api/*` → handler `api/index.js` |
| `maxDuration: 30` | Timeout 30s — tránh lỗi khi Neon cold start |
| `buildCommand` | Generate Prisma Client + chạy migration |

### 8.3. Branch strategy gợi ý

| Branch | Vercel deployment | `APP_ENV` |
|--------|-------------------|-----------|
| `main` | Production | `prod` |
| `develop` / `staging` | Preview (staging chính) | `staging` |
| `feature/*` | Preview (tùy chọn) | `staging` |

### 8.4. Push code lên Git (lần đầu)

```bash
git init
git add .
git commit -m "feat: init Express REST API server"
git remote add origin <url-repo>
git push -u origin main
git push -u origin develop
```

---

## 9. Kiểm tra sau deploy

### Health check

```bash
# Production
curl https://<tên-project>.vercel.app/api/health

# Staging (Preview)
curl https://<preview-url>.vercel.app/api/health
```

### Response mong đợi — Production

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

### Response mong đợi — Staging

```json
{
  "success": true,
  "data": {
    "appEnv": "staging",
    "nodeEnv": "production"
  }
}
```

> **Luôn kiểm tra `appEnv`** trong health check để chắc chắn deploy đúng môi trường.

### Test API đầy đủ

Xem [API.md](./API.md) — thay `BASE_URL` bằng URL Vercel:

```bash
export BASE_URL="https://<tên-project>.vercel.app"
curl "$BASE_URL/api/health"
```

---

## 10. Xử lý lỗi deploy thường gặp

### `Environment variable not found: DIRECT_URL` (build local)

**Nguyên nhân:** Chạy `pnpm build` mà chưa có `.env.prod` hoặc thiếu `DIRECT_URL`.  
**Cách fix:** `cp .env.prod.example .env.prod` và điền `DIRECT_URL` + `DATABASE_URL`.

---

### Vercel build fail: `prisma migrate deploy`

**Nguyên nhân:** Thiếu/sai `DIRECT_URL` trên Vercel, hoặc chưa commit `prisma/migrations/`.  
**Cách fix:**
1. Thêm `DIRECT_URL` (direct, không pgbouncer) vào Environment Variables đúng scope.
2. Commit và push folder `prisma/migrations/`.

---

### Health check trả `appEnv: "dev"` trên Vercel Production

**Nguyên nhân:** Code cũ chưa map `VERCEL_ENV` → `APP_ENV`, hoặc deploy chưa chạy bản mới.  
**Cách fix:** Pull/deploy bản mới (`src/config/env.js` tự map `VERCEL_ENV=production` → `prod`). Hoặc set `APP_ENV=prod` thủ công trên Vercel nếu muốn ghi đè.

---

### Staging và prod dùng chung database

**Nguyên nhân:** `DATABASE_URL` trên Vercel Preview và Production trỏ cùng 1 Neon project.  
**Cách fix:** Tạo Neon project riêng; Preview = staging DB, Production = prod DB.

---

### `Biến môi trường không hợp lệ`

**Nguyên nhân:** Thiếu env hoặc `JWT_SECRET` < 32 ký tự trên Vercel.  
**Cách fix:** Bổ sung đủ biến theo [mục 4.2](#42-cấu-hình-environment-variables-trên-vercel) / [mục 5.2](#52-cấu-hình-environment-variables-trên-vercel).

---

### `Can't reach database server` / timeout

**Nguyên nhân:** Sai connection string hoặc Neon bị sleep (free tier).  
**Cách fix:**
1. Kiểm tra đúng scope env trên Vercel.
2. Kiểm tra URL có `?sslmode=require`.
3. Vào Neon Console → wake up database.
4. Runtime dùng `DATABASE_URL` pooled; migrate dùng `DIRECT_URL` direct.

---

### Vercel build fail: `ERR_PNPM_IGNORED_BUILDS` (pnpm install exited with 1)

**Nguyên nhân:** pnpm 11 chặn build script của `bcrypt`, `prisma`, `@prisma/client`… File `pnpm-workspace.yaml` (chứa `allowBuilds`) **chưa được commit** hoặc bị `.gitignore` loại khỏi Git.  
**Cách fix:**
1. Đảm bảo repo có `pnpm-workspace.yaml` với `allowBuilds` cho `bcrypt`, `prisma`, `@prisma/client`, `@prisma/engines` đều `true`.
2. **Không** ignore `pnpm-workspace.yaml` trong `.gitignore`.
3. Commit và push file lên Git → Vercel redeploy.

---

### `bcrypt_lib.node` không tìm thấy (local)

**Nguyên nhân:** pnpm 11 chặn build script của `bcrypt` khi cài.  
**Cách fix:** Kiểm tra `pnpm-workspace.yaml` có `allowBuilds.bcrypt: true`, rồi `pnpm rebuild bcrypt`.

---

### pnpm yêu cầu Node.js ≥ 22.13

**Nguyên nhân:** Đang dùng Node 20 với pnpm 11.  
**Cách fix:**

```bash
nvm use 22
nvm alias default 22
```

---

### API 404 sau deploy

**Nguyên nhân:** Route chưa mount trong `src/routes/index.js`.  
**Cách fix:** Thêm `router.use(...)` và redeploy.

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [SETUP.md](./SETUP.md) | Setup local từ đầu (Neon, Cloudinary, pnpm, migrate) |
| [PROJECT.md](./PROJECT.md) | Kiến trúc, thêm API, quy ước code |
| [API.md](./API.md) | Danh sách endpoint + lệnh `curl` test |
| [DEPLOY.md](./DEPLOY.md) | File này — hướng dẫn deploy 3 môi trường |

---

*Cập nhật: tháng 6/2026 — base-server-nodejs v1.0.0*
