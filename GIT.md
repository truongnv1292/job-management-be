# GIT.md — Hướng dẫn Git & Git Flow

> Tài liệu thao tác Git và quy trình làm việc với source code **base-server-nodejs**.  
> Triển khai sau khi push: xem [DEPLOY.md](./DEPLOY.md). Setup ban đầu: [SETUP.md](./SETUP.md).

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Git Flow của dự án](#2-git-flow-của-dự-án)
3. [Cấu hình Git lần đầu](#3-cấu-hình-git-lần-đầu)
4. [Thao tác Git cơ bản](#4-thao-tác-git-cơ-bản)
5. [Quy trình phát triển tính năng](#5-quy-trình-phát-triển-tính-năng)
6. [Quy trình release (dev → staging → prod)](#6-quy-trình-release-dev--staging--prod)
7. [Hotfix — sửa lỗi khẩn trên production](#7-hotfix--sửa-lỗi-khẩn-trên-production)
8. [Quy ước commit message](#8-quy-ước-commit-message)
9. [File nào commit / không commit](#9-file-nào-commit--không-commit)
10. [Git + Prisma migration](#10-git--prisma-migration)
11. [Merge & xử lý conflict](#11-merge--xử-lý-conflict)
12. [Lệnh Git hữu ích](#12-lệnh-git-hữu-ích)
13. [Tích hợp Vercel](#13-tích-hợp-vercel)
14. [Xử lý lỗi Git thường gặp](#14-xử-lý-lỗi-git-thường-gặp)
15. [Checklist nhanh](#15-checklist-nhanh)

---

## 1. Tổng quan

| Thông tin | Giá trị |
|-----------|---------|
| **Remote** | `origin` → GitHub (`https://github.com/truongnv1292/base-server-nodejs.git`) |
| **Branch chính** | `main` (production), `develop` (staging) |
| **Package manager** | pnpm — commit `pnpm-lock.yaml` |
| **CI/CD** | Vercel tự build khi push (không dùng GitLab CI / GitHub Actions) |
| **Môi trường** | `dev` (local) → `staging` (Vercel Preview) → `prod` (Vercel Production) |

> Repo có thể host trên **GitHub**, **GitLab** hoặc **Bitbucket** — Vercel hỗ trợ cả ba. Quy trình Git Flow bên dưới giữ nguyên, chỉ đổi URL remote.

---

## 2. Git Flow của dự án

Dự án dùng **Git Flow đơn giản** (không dùng `release/*` hay `hotfix/*` branch bắt buộc, nhưng có thể tạo khi cần).

### 2.1. Sơ đồ branch

```
main          ●─────────────────●─────────────────●  → Vercel Production (prod)
               \               /                 /
develop         ●─────●─────●─────●─────●───────●    → Vercel Preview (staging)
                     \   /           \   /
feature/xxx           ●─●             ●─●            → (không deploy, chỉ dev local)
```

### 2.2. Vai trò từng branch

| Branch | Mục đích | Ai merge vào | Deploy |
|--------|----------|--------------|--------|
| `main` | Code production ổn định | Lead / reviewer sau QA | Vercel **Production** |
| `develop` | Tích hợp feature, test staging | Developer sau khi feature xong | Vercel **Preview** (staging) |
| `feature/<tên>` | Phát triển 1 tính năng | Merge vào `develop` | Không (chỉ test local) |
| `fix/<tên>` | Sửa bug nhỏ | Merge vào `develop` | Không |
| `hotfix/<tên>` | Sửa lỗi khẩn prod | Merge vào `main` **và** `develop` | Vercel Production ngay |

### 2.3. Luồng code theo môi trường

```
┌──────────────┐    push     ┌──────────────┐    merge     ┌──────────────┐
│ feature/*    │ ──────────► │   develop    │ ───────────► │     main     │
│ (local dev)  │             │  (staging)   │              │   (prod)     │
└──────────────┘             └──────────────┘              └──────────────┘
       │                            │                            │
       ▼                            ▼                            ▼
  APP_ENV=dev               Vercel Preview               Vercel Production
  .env.dev                  APP_ENV=staging              APP_ENV=prod
  Neon dev DB               Neon staging DB              Neon prod DB
```

### 2.4. Quy tắc vàng

1. **Không push thẳng lên `main`** nếu chưa test trên `develop`/staging (trừ hotfix khẩn).
2. **Luôn pull trước khi bắt đầu** feature mới hoặc trước khi push.
3. **Commit nhỏ, rõ ràng** — mỗi commit một mục đích.
4. **Không commit file secret** (`.env`, `.env.dev`, `.env.staging`, `.env.prod`).
5. **Migration Prisma** — tạo trên dev, commit `prisma/migrations/`, rồi mới merge lên `develop`/`main`.

---

## 3. Cấu hình Git lần đầu

### 3.1. Clone repository

```bash
git clone https://github.com/truongnv1292/base-server-nodejs.git
cd base-server-nodejs
```

Hoặc SSH:

```bash
git clone git@github.com:truongnv1292/base-server-nodejs.git
cd base-server-nodejs
```

### 3.2. Kiểm tra remote & branch

```bash
git remote -v
git branch -a
```

Kết quả mong đợi:

```
origin  https://github.com/truongnv1292/base-server-nodejs.git (fetch)
origin  https://github.com/truongnv1292/base-server-nodejs.git (push)

* main
  remotes/origin/main
  remotes/origin/develop
```

### 3.3. Cấu hình identity (một lần trên máy)

```bash
git config --global user.name "Tên của bạn"
git config --global user.email "email@congty.com"
```

### 3.4. Lấy branch `develop` về local

```bash
git fetch origin
git checkout develop
# hoặc nếu chưa có local:
git checkout -b develop origin/develop
```

### 3.5. Thêm remote mới (nếu fork / đổi host)

```bash
# Xem remote hiện tại
git remote -v

# Đổi URL remote
git remote set-url origin <url-repo-mới>

# Thêm remote thứ hai (vd: GitLab mirror)
git remote add gitlab <url-repo-gitlab>
git push -u gitlab main
```

---

## 4. Thao tác Git cơ bản

### 4.1. Xem trạng thái

```bash
# File đã sửa / chưa stage
git status

# Diff chi tiết (chưa stage)
git diff

# Diff đã stage (sắp commit)
git diff --staged
```

### 4.2. Stage & commit

```bash
# Stage file cụ thể
git add src/modules/products/products.route.js
git add prisma/schema.prisma

# Stage tất cả file đã sửa (không gồm untracked nếu dùng -u)
git add .

# Stage có chọn lọc (từng hunk)
git add -p

# Commit
git commit -m "feat: thêm module products"

# Stage + commit nhanh (chỉ file đã tracked, đã sửa trước đó)
git commit -am "fix: sửa validate email"
```

### 4.3. Push & pull

```bash
# Lấy code mới từ remote (không merge)
git fetch origin

# Pull = fetch + merge
git pull origin develop

# Push branch hiện tại lên remote
git push origin develop

# Push branch mới lần đầu (set upstream)
git push -u origin feature/add-products
```

### 4.4. Làm việc với branch

```bash
# Xem branch local & remote
git branch
git branch -a

# Tạo branch mới từ branch hiện tại
git checkout -b feature/add-products

# Đổi sang branch có sẵn
git checkout develop

# Đổi tên branch (đang đứng trên branch đó)
git branch -m feature/old-name feature/new-name

# Xóa branch local (sau khi đã merge)
git branch -d feature/add-products

# Xóa branch remote
git push origin --delete feature/add-products
```

### 4.5. Hoàn tác thay đổi

```bash
# Bỏ thay đổi chưa stage (file tracked)
git checkout -- src/app.js
# Git 2.23+:
git restore src/app.js

# Bỏ stage (unstage) nhưng giữ nội dung file
git reset HEAD src/app.js
# Git 2.23+:
git restore --staged src/app.js

# Sửa commit message vừa tạo (CHƯA push)
git commit --amend -m "feat: message mới"

# Hoàn tác commit cuối, giữ thay đổi trong working tree
git reset --soft HEAD~1

# Hoàn tác commit cuối, bỏ luôn thay đổi (NGUY HIỂM)
git reset --hard HEAD~1
```

> **Cảnh báo:** Không dùng `git push --force` lên `main`/`develop` trừ khi team thống nhất và hiểu rủi ro.

### 4.6. Stash — cất thay đổi tạm

Dùng khi đang code dở mà cần chuyển branch gấp:

```bash
# Cất thay đổi
git stash push -m "WIP: products module"

# Xem danh sách stash
git stash list

# Lấy lại thay đổi
git stash pop

# Lấy lại nhưng giữ trong stash
git stash apply
```

### 4.7. Xem lịch sử commit

#### Cơ bản

```bash
# 10 commit gần nhất — dòng ngắn (hay dùng nhất)
git log --oneline -10

# Lịch sử đầy đủ (message, author, date)
git log

# Giới hạn số dòng hiển thị
git log -5
```

#### Graph branch — xem luồng merge

```bash
# Graph tất cả branch (local + remote)
git log --oneline --graph --all --decorate -20

# Chỉ branch hiện tại
git log --oneline --graph -15

# Graph kèm tên branch/tag
git log --graph --pretty=format:'%C(yellow)%h%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit -15
```

#### Theo branch / phạm vi

```bash
# Lịch sử riêng branch develop
git log develop --oneline -10

# Commit có trên main nhưng CHƯA có trên develop
git log develop..main --oneline

# Commit có trên develop nhưng CHƯA merge vào main
git log main..develop --oneline

# Commit từ một mốc (hash/tag) đến HEAD
git log v1.0.0..HEAD --oneline
```

#### Theo thời gian / tác giả

```bash
# Commit trong 7 ngày qua
git log --since="7 days ago" --oneline

# Commit trong khoảng ngày
git log --since="2026-06-01" --until="2026-06-05" --oneline

# Commit của một người
git log --author="Truong" --oneline

# Commit hôm nay
git log --since="midnight" --oneline
```

#### Theo file / thư mục

```bash
# Lịch sử thay đổi của 1 file
git log --oneline -- src/modules/users/users.service.js

# Kèm diff từng commit (patch)
git log -p -- src/modules/users/users.service.js

# Theo dõi cả khi file bị đổi tên
git log --follow --oneline -- src/modules/users/users.service.js

# File nào thay đổi trong mỗi commit
git log --stat --oneline -10
```

#### Chi tiết 1 commit

```bash
# Commit mới nhất — full diff
git show

# Commit cụ thể (dùng hash rút gọn 7 ký tự)
git show abc1234

# Chỉ xem danh sách file thay đổi
git show abc1234 --stat

# Chỉ xem message, không diff
git show abc1234 --no-patch
```

#### Tìm kiếm trong lịch sử

```bash
# Tìm theo nội dung commit message
git log --oneline --grep="products"
git log --oneline --grep="feat" --grep="fix" --all-match

# Tìm commit đã thêm/xóa chuỗi code (pickaxe)
git log -S "getUsers" --oneline

# Tìm commit sửa regex trong code
git log -G "paginationQuerySchema" --oneline
```

#### Reflog — lịch sử thao tác local

Dùng khi cần tìm commit "đã mất" sau `reset`, `rebase`, đổi branch:

```bash
# 20 thao tác gần nhất trên HEAD
git reflog -20

# Reflog của branch cụ thể
git reflog show develop

# Quay lại trạng thái trước khi reset (lấy hash từ reflog)
git checkout abc1234
# hoặc:
git reset --hard abc1234
```

#### Tóm tắt theo tác giả

```bash
# Số commit mỗi người
git shortlog -sn

# Trên branch develop
git shortlog -sn develop
```

#### Xem ai sửa dòng code (blame)

```bash
# Từng dòng do ai commit, lúc nào
git blame src/modules/users/users.service.js

# Chỉ một đoạn dòng
git blame -L 10,30 src/modules/users/users.service.js
```

#### Thoát khi đang xem lịch sử (pager `less`)

`git log`, `git show`, `git diff` thường mở trình phân trang **`less`** khi output dài. Góc dưới terminal có thể hiện `(END)` hoặc `--More--`.

| Thao tác | Phím |
|----------|------|
| **Thoát** (về dòng lệnh) | `q` |
| Cuộn xuống 1 trang | `Space` hoặc `f` |
| Cuộn lên 1 trang | `b` |
| Cuộn từng dòng | `↓` / `↑` hoặc `j` / `k` |
| Tìm kiếm | `/` → gõ từ khóa → `Enter` |
| Tìm tiếp | `n` |
| Tìm ngược | `N` |

> **Bị kẹt trong `git log`?** Nhấn **`q`** một lần là thoát.

**Tránh mở pager** — in thẳng ra terminal:

```bash
git --no-pager log --oneline -20
git log --oneline -20          # -20 commit ngắn, thường không vào pager
```

**Tắt pager vĩnh viễn** (tùy chọn):

```bash
git config --global core.pager cat
# Hoặc chỉ tắt cho log:
git config --global pager.log false
```

#### Giao diện tương tác khác (tùy chọn)

```bash
gitk          # GUI xem lịch sử (cần cài gitk)
```

| Lệnh | Khi nào dùng |
|------|--------------|
| `git log --oneline -10` | Xem nhanh 10 commit gần nhất |
| `git log --graph --all` | Hiểu branch đã merge như thế nào |
| `git log main..develop` | Xem commit chờ release lên prod |
| `git log -- <file>` | Ai đã sửa file này, khi nào |
| `git show <hash>` | Xem chi tiết 1 commit |
| `git reflog` | Khôi phục sau reset/rebase nhầm |
| `git blame <file>` | Truy vết từng dòng code |

---

## 5. Quy trình phát triển tính năng

### Bước 1 — Cập nhật `develop`

```bash
git checkout develop
git pull origin develop
```

### Bước 2 — Tạo feature branch

```bash
git checkout -b feature/add-products
```

**Quy ước đặt tên branch:**

| Prefix | Ví dụ | Khi nào dùng |
|--------|-------|--------------|
| `feature/` | `feature/user-search` | Tính năng mới |
| `fix/` | `fix/login-validation` | Sửa bug |
| `chore/` | `chore/update-deps` | Bảo trì, deps, config |
| `docs/` | `docs/api-curl-examples` | Chỉ tài liệu |
| `hotfix/` | `hotfix/jwt-expired` | Sửa khẩn production |

### Bước 3 — Code & test local

```bash
pnpm install
pnpm dev

# Nếu sửa schema Prisma:
pnpm run db:migrate:dev -- --name add_product_table
```

Test API theo [API.md](./API.md).

### Bước 4 — Commit

```bash
git status
git add src/modules/products/
git add prisma/migrations/
git commit -m "feat: thêm module products CRUD"
```

### Bước 5 — Push feature branch

```bash
git push -u origin feature/add-products
```

### Bước 6 — Tạo Pull Request / Merge Request

**GitHub:**

1. Vào repo trên GitHub → **Pull requests** → **New pull request**
2. Base: `develop` ← Compare: `feature/add-products`
3. Điền mô tả, gắn reviewer
4. Sau khi approve → **Merge pull request**

**GitLab:**

1. **Merge requests** → **New merge request**
2. Source: `feature/add-products` → Target: `develop`
3. Assign reviewer → Merge khi approved

**Merge trực tiếp bằng CLI (không qua PR):**

```bash
git checkout develop
git pull origin develop
git merge feature/add-products
git push origin develop
```

### Bước 7 — Dọn branch sau merge

```bash
git branch -d feature/add-products
git push origin --delete feature/add-products
```

---

## 6. Quy trình release (dev → staging → prod)

### 6.1. Sơ đồ release

```
1. DEV (local)
   pnpm dev
   pnpm run db:migrate:dev -- --name feature_x
        │
        ▼
2. STAGING
   git push origin develop
   → Vercel Preview deploy
   → QA test: curl /api/health → appEnv: "staging"
        │
        ▼
3. PRODUCTION
   git checkout main && git merge develop && git push origin main
   → Vercel Production deploy
   → prisma migrate deploy lên DB prod
```

### 6.2. Chi tiết từng bước

#### Bước 1 — Phát triển & test local

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# ... code, test ...
pnpm dev
pnpm run db:migrate:dev -- --name my_feature

git add .
git commit -m "feat: mô tả tính năng"
git push -u origin feature/my-feature
```

Tạo PR: `feature/my-feature` → `develop`, merge khi review xong.

#### Bước 2 — Deploy staging

```bash
git checkout develop
git pull origin develop
git push origin develop
```

Vercel tự build Preview. Kiểm tra:

```bash
curl https://<preview-url>.vercel.app/api/health
# Kỳ vọng: "appEnv": "staging"
```

QA test toàn bộ API trên URL Preview (xem [API.md](./API.md)).

#### Bước 3 — Deploy production

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

Kiểm tra production:

```bash
curl https://<tên-project>.vercel.app/api/health
# Kỳ vọng: "appEnv": "prod"
```

### 6.3. Checklist trước khi merge `develop` → `main`

- [ ] Feature đã test local (`pnpm dev`)
- [ ] Migration đã tạo và test trên dev
- [ ] `prisma/migrations/` đã commit
- [ ] `pnpm-lock.yaml` đã commit (nếu thêm/sửa dependency)
- [ ] Không có file `.env*` trong `git status`
- [ ] Staging health check trả `appEnv: "staging"`
- [ ] QA đã pass trên URL Preview
- [ ] Env Production trên Vercel đã cấu hình đủ (xem [DEPLOY.md](./DEPLOY.md))

---

## 7. Hotfix — sửa lỗi khẩn trên production

Khi production lỗi nghiêm trọng, cần sửa nhanh **không chờ** feature đang dev trên `develop`.

```bash
# 1. Tạo hotfix từ main
git checkout main
git pull origin main
git checkout -b hotfix/fix-auth-crash

# 2. Sửa lỗi, test local
pnpm dev
git add .
git commit -m "fix: sửa crash khi token hết hạn"

# 3. Merge vào main → deploy prod ngay
git checkout main
git merge hotfix/fix-auth-crash
git push origin main

# 4. Đồng bộ hotfix về develop (tránh mất fix)
git checkout develop
git pull origin develop
git merge hotfix/fix-auth-crash
git push origin develop

# 5. Dọn branch
git branch -d hotfix/fix-auth-crash
git push origin --delete hotfix/fix-auth-crash
```

> Hotfix **không** nên kèm feature mới — chỉ sửa đúng lỗi cần thiết.

---

## 8. Quy ước commit message

Dự án dùng **Conventional Commits** — giúp đọc `git log` và tự động changelog.

### 8.1. Format

```
<type>: <mô tả ngắn gọn>

[body tùy chọn — giải thích thêm]

[footer tùy chọn — BREAKING CHANGE, Closes #123]
```

### 8.2. Các `type` thường dùng

| Type | Dùng khi | Ví dụ |
|------|----------|-------|
| `feat` | Tính năng mới | `feat: thêm API danh sách products` |
| `fix` | Sửa bug | `fix: trả 401 khi token sai format` |
| `chore` | Bảo trì, deps, config | `chore: update pnpm lockfile` |
| `docs` | Chỉ tài liệu | `docs: thêm hướng dẫn Git flow` |
| `refactor` | Đổi code, không đổi behavior | `refactor: tách auth service` |
| `test` | Thêm/sửa test | `test: thêm test login` |
| `db` | Migration Prisma | `db: add product table migration` |

### 8.3. Ví dụ commit tốt

```bash
git commit -m "feat: thêm module products với CRUD cơ bản"
git commit -m "fix: validate pagination limit tối đa 100"
git commit -m "chore: sync pnpm-lock sau khi thêm zod"
git commit -m "docs: thêm API.md với curl examples"
git commit -m "db: add migration product table"
```

### 8.4. Ví dụ commit nên tránh

```bash
# ❌ Quá chung chung
git commit -m "update"
git commit -m "fix bug"
git commit -m "WIP"

# ❌ Nhiều thay đổi không liên quan trong 1 commit
git commit -m "feat: thêm products và sửa auth và update docs"
```

---

## 9. File nào commit / không commit

### 9.1. Bắt buộc commit

| File / folder | Lý do |
|---------------|-------|
| `src/` | Source code |
| `api/` | Entry point Vercel |
| `prisma/schema.prisma` | Schema DB |
| `prisma/migrations/` | Lịch sử migration — team & Vercel cần |
| `pnpm-lock.yaml` | Lock dependency — Vercel cài đúng version |
| `package.json` | Scripts & dependencies |
| `vercel.json` | Cấu hình deploy |
| `.env.example`, `.env.*.example` | Template env (không có secret) |
| `*.md` (SETUP, PROJECT, API, DEPLOY, GIT) | Tài liệu |

### 9.2. Tuyệt đối KHÔNG commit

| File / folder | Lý do |
|---------------|-------|
| `.env`, `.env.dev`, `.env.staging`, `.env.prod` | Chứa password DB, JWT secret, API key |
| `node_modules/` | Cài lại bằng `pnpm install` |
| `.vercel/` | Config local Vercel CLI |
| `.pnpm-store/` | Cache pnpm |
| `uploads/` | File upload tạm |

Đã cấu hình trong `.gitignore`:

```gitignore
.env
.env.dev
.env.staging
.env.prod
node_modules/
.vercel
```

### 9.3. Kiểm tra trước mỗi commit

```bash
git status

# Đảm bảo KHÔNG thấy:
#   .env
#   .env.dev
#   .env.staging
#   .env.prod

# Nếu lỡ stage file secret:
git reset HEAD .env.dev
```

### 9.4. Lỡ commit file secret — xử lý

```bash
# Bỏ file khỏi Git nhưng giữ trên máy
git rm --cached .env.dev
git commit -m "chore: remove .env.dev from tracking"

# Đổi secret trên Neon / Cloudinary / JWT ngay lập tức
# vì secret có thể đã lộ trong git history
```

> Nếu secret đã push lên remote → **rotate** (đổi) toàn bộ credential liên quan.

---

## 10. Git + Prisma migration

Migration và Git đi **cùng nhau** — mỗi thay đổi schema phải có commit migration.

### 10.1. Quy trình chuẩn

```bash
# 1. Sửa prisma/schema.prisma

# 2. Tạo migration trên dev
pnpm run db:migrate:dev -- --name add_product_table

# 3. Commit cả schema VÀ folder migration mới
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "db: add product table"

# 4. Push lên develop → Vercel Preview migrate DB staging
git push origin develop

# 5. Merge develop → main → Vercel Production migrate DB prod
```

### 10.2. Thứ tự migrate theo môi trường

```
dev (migrate dev)  →  staging (migrate deploy)  →  prod (migrate deploy)
     local              Vercel Preview build          Vercel Production build
```

| Môi trường | Lệnh | Khi nào chạy |
|------------|------|--------------|
| dev | `pnpm run db:migrate:dev -- --name <tên>` | Tạo migration mới (local) |
| staging | `pnpm run db:deploy:staging` | Thủ công, hoặc tự qua Vercel Preview build |
| prod | `pnpm run db:deploy:prod` | Thủ công, hoặc tự qua Vercel Production build |

### 10.3. Lưu ý quan trọng

- **Không** sửa file migration đã merge vào `main` — tạo migration mới thay thế.
- **Luôn** commit folder `prisma/migrations/<timestamp>_<tên>/migration.sql`.
- Nếu đổi schema mà quên migrate → đồng nghiệp và Vercel build sẽ lỗi.

---

## 11. Merge & xử lý conflict

### 11.1. Merge thông thường

```bash
git checkout develop
git pull origin develop
git merge feature/add-products
# Nếu không conflict:
git push origin develop
```

### 11.2. Khi có conflict

Git báo:

```
CONFLICT (content): Merge conflict in src/routes/index.js
Automatic merge failed; fix conflicts and then commit the result.
```

**Xử lý:**

```bash
# 1. Mở file conflict — tìm marker:
#    <<<<<<< HEAD
#    code từ branch đích (develop)
#    =======
#    code từ branch nguồn (feature)
#    >>>>>>> feature/add-products

# 2. Sửa file, giữ code đúng, xóa marker

# 3. Stage file đã sửa
git add src/routes/index.js

# 4. Hoàn tất merge
git commit -m "merge: feature/add-products into develop"

# 5. Push
git push origin develop
```

### 11.3. Hủy merge đang dở

```bash
git merge --abort
```

### 11.4. Rebase (tùy chọn — team thống nhất mới dùng)

Giữ history thẳng hơn trước khi merge PR:

```bash
git checkout feature/add-products
git fetch origin
git rebase origin/develop

# Nếu conflict → sửa → git add → git rebase --continue
# Hủy rebase:
git rebase --abort
```

> **Không** `rebase` branch đã push shared (develop/main) trừ khi team đồng ý.

---

## 12. Lệnh Git hữu ích

> Xem lịch sử commit đầy đủ: [mục 4.7](#47-xem-lịch-sử-commit).

### Xem lịch sử (tóm tắt)

```bash
git log --oneline -10                              # 10 commit gần nhất
git log --oneline --graph --all --decorate -20     # Graph tất cả branch
git log develop..main --oneline                    # Commit chờ merge lên main
git log --oneline -- src/routes/index.js           # Lịch sử 1 file
git show HEAD --stat                               # Chi tiết commit cuối
git reflog -20                                     # Lịch sử thao tác local
git blame src/app.js                               # Ai sửa từng dòng
```

### Xem thông tin khác

```bash
git diff develop..main                 # Khác biệt giữa 2 branch
git diff develop..main --stat          # Tóm tắt file thay đổi
```

### Tìm kiếm trong lịch sử

```bash
git log --oneline --grep="products"    # Tìm commit theo message
git log -S "getUsers" --oneline        # Tìm commit thay đổi chuỗi code
git log --author="Tên" --oneline       # Commit của một người
git log --since="7 days ago" --oneline # Commit trong 7 ngày qua
```

### Làm việc với remote

```bash
git fetch --all --prune                # Cập nhật branch remote, xóa branch đã xóa trên server
git remote show origin                 # Chi tiết remote
```

### Tag version (khi release)

```bash
git tag -a v1.0.0 -m "Release v1.0.0 - initial production"
git push origin v1.0.0

# Xem tag
git tag -l
```

---

## 13. Tích hợp Vercel

Git push kích hoạt Vercel build tự động — không cần deploy thủ công.

| Hành động Git | Vercel | Môi trường |
|---------------|--------|------------|
| `git push origin main` | Production deployment | `prod` |
| `git push origin develop` | Preview deployment | `staging` |
| `git push origin feature/*` | Preview deployment (tùy cấu hình) | `staging` |
| PR/MR mở trên GitHub/GitLab | Preview deployment cho PR | `staging` |

**Cấu hình Vercel quan trọng:**

| Setting | Giá trị |
|---------|---------|
| Production Branch | `main` |
| Install Command | `pnpm install` |
| Build Command | `pnpm run build` |

Chi tiết env variables, checklist deploy: [DEPLOY.md](./DEPLOY.md).

---

## 14. Xử lý lỗi Git thường gặp

### ❌ `rejected — non-fast-forward`

Remote có commit mới hơn local.

```bash
git pull origin develop
# Giải quyết conflict nếu có
git push origin develop
```

### ❌ `Please commit your changes or stash them`

Đang có thay đổi chưa commit khi đổi branch.

```bash
git stash
git checkout develop
git stash pop
```

### ❌ `fatal: refusing to merge unrelated histories`

Repo local và remote khởi tạo riêng.

```bash
git pull origin main --allow-unrelated-histories
```

### ❌ Lỡ commit nhầm file `.env`

```bash
git rm --cached .env.dev
echo ".env.dev" >> .gitignore   # đã có sẵn trong .gitignore
git commit -m "chore: stop tracking .env.dev"
# Rotate toàn bộ secret trong file đó
```

### ❌ Muốn lấy lại 1 file từ commit cũ

```bash
git checkout abc1234 -- src/modules/users/users.service.js
```

### ❌ `pnpm-lock.yaml` conflict

```bash
# Sau khi merge, chạy lại install để resolve lockfile
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: resolve pnpm-lock conflict"
```

---

## 15. Checklist nhanh

### Bắt đầu ngày làm việc

- [ ] `git checkout develop && git pull origin develop`
- [ ] `pnpm install` (nếu có thay đổi lockfile từ đồng nghiệp)

### Trước mỗi commit

- [ ] `git status` — không có file `.env*`
- [ ] Code chạy được (`pnpm dev`)
- [ ] Commit message đúng format (`feat:`, `fix:`, ...)

### Trước khi push feature

- [ ] Đã pull `develop` mới nhất và merge/rebase
- [ ] Migration đã commit (nếu sửa schema)
- [ ] `pnpm-lock.yaml` đã commit (nếu sửa `package.json`)

### Trước khi merge `develop` → `main`

- [ ] QA pass trên Vercel Preview
- [ ] Health check staging: `appEnv: "staging"`
- [ ] Migration đã apply staging thành công
- [ ] Không có secret trong diff

### Sau khi deploy prod

- [ ] `curl .../api/health` → `appEnv: "prod"`
- [ ] Test endpoint chính trên production URL
- [ ] Tag version nếu là release lớn (`git tag v1.x.x`)

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [GIT.md](./GIT.md) | Git & Git Flow (file này) |
| [DEPLOY.md](./DEPLOY.md) | Deploy dev / staging / prod lên Vercel |
| [SETUP.md](./SETUP.md) | Setup local từ đầu |
| [PROJECT.md](./PROJECT.md) | Kiến trúc dự án, thêm API |
| [API.md](./API.md) | Tài liệu API & curl |

**Tham khảo bên ngoài:**

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Vercel Git Integration](https://vercel.com/docs/deployments/git)

---

*Cập nhật: tháng 6/2026 — base-server-nodejs*
