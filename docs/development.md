# Phát triển

[← Mục lục tài liệu](README.md)

## Yêu cầu môi trường

| Công cụ | Phiên bản | Vì sao |
| --- | --- | --- |
| Node.js | **≥ 20.19** (hoặc ≥ 22.12, hoặc ≥ 24) | Prisma 7 khai báo `^20.19 \|\| ^22.12 \|\| >=24`; Next 16 cần ≥ 20.9; NestJS 11 cần ≥ 20 |
| pnpm | 9+ | `apps/api` được cài bằng pnpm |
| npm | 10+ | `apps/web` được cài bằng npm |
| Docker | bản gần đây bất kỳ | PostgreSQL qua `docker-compose.yml` |

> **Việc trộn hai package manager là thực trạng hiện tại**, không phải khuyến
> nghị: `apps/api` có `pnpm-lock.yaml`, `apps/web` có `package-lock.json`, và thư
> mục gốc có cả hai. Không có file workspace ở gốc, nên mỗi app được cài độc lập.
> Xem [Hạn chế đã biết](known-gaps.md).

## Cài đặt lần đầu

```bash
# 1. Database
docker compose up -d

# 2. API
cd apps/api
cp .env.example .env          # rồi đặt cả hai JWT secret
pnpm install
pnpm prisma migrate deploy    # áp dụng hai migration đang có
pnpm prisma generate          # sinh ra apps/api/generated/prisma
pnpm start:dev                # http://localhost:4000

# 3. Web (terminal thứ hai)
cd apps/web
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

API từ chối khởi động nếu thiếu bất kỳ biến môi trường bắt buộc nào — xem
[Cấu hình](configuration.md).

## Scripts

### `apps/api` (pnpm)

| Script | Làm gì |
| --- | --- |
| `start:dev` | Nest ở chế độ watch |
| `start:debug` | Watch kèm inspector |
| `start` | Chạy một lần, không watch |
| `build` | `nest build` → `dist/` |
| `start:prod` | `node dist/main` (chạy `build` trước) |
| `lint` | ESLint trên `src`, `apps`, `libs`, `test` kèm `--fix` |
| `format` | Prettier trên `src/**/*.ts` và `test/**/*.ts` |
| `test` | Jest unit — khớp `*.spec.ts` dưới `src/`. **Không có file nào như vậy** |
| `test:e2e` | Jest e2e — **hiện đang fail**, xem [Hạn chế đã biết](known-gaps.md) |
| `test:cov` | Coverage |

### `apps/web` (npm)

| Script | Làm gì |
| --- | --- |
| `dev` | Next dev server |
| `build` | Build production |
| `start` | Phục vụ bản build production |
| `lint` | ESLint |

### Gốc repo

`package.json` ở gốc **không có script hữu ích nào** — chỉ một `test` giữ chỗ,
thoát với mã 1. `turbo.json` có định nghĩa các task `build` / `dev` / `lint` /
`test`, nhưng turbo không tìm ra được các package vì không có cấu hình workspace ở
gốc. Hãy chạy lệnh riêng cho từng app.

## Quy trình Prisma

Mọi lệnh Prisma chạy từ `apps/api`.

| Lệnh | Khi nào |
| --- | --- |
| `pnpm prisma migrate dev --name <thay-đổi>` | Bạn vừa sửa `schema.prisma` và muốn tạo migration mới ở local |
| `pnpm prisma migrate deploy` | Áp dụng các migration đã có (clone mới, CI, production) |
| `pnpm prisma generate` | Sinh lại client sau khi đổi schema |
| `pnpm prisma studio` | Xem database bằng giao diện |
| `pnpm prisma migrate reset` | **Phá hủy dữ liệu** — drop, tạo lại, chạy lại migration và seed |

Đặc thù của setup này:

- Client được sinh ra ở **`apps/api/generated/prisma`**, không phải
  `node_modules/.prisma`. Thư mục này bị gitignore, nên sau khi clone mới bắt
  buộc phải chạy `generate`.
- Code ứng dụng import kiểu model bằng **đường dẫn tương đối**
  (`../../../../generated/prisma/client`), không phải bằng tên package.
- Khối `datasource` trong `schema.prisma` không có `url`. Chuỗi kết nối đến từ
  `prisma.config.ts` cho lệnh CLI và từ `PrismaService` lúc runtime, cả hai đều
  đọc `DATABASE_URL`.
- Runtime dùng driver adapter `@prisma/adapter-pg` thay vì query engine binary
  viết bằng Rust.

> **Nếu một lệnh Prisma báo `Cannot find module 'dotenv/config'`:**
> `prisma.config.ts` import `dotenv` nhưng package này không được khai báo trong
> `apps/api/package.json`. Khắc phục bằng `pnpm add -D dotenv` trong `apps/api`.

## Thêm một feature module vào API

1. Tạo `src/modules/<domain>/` với `controllers/`, `services/`, `repositories/`,
   `dto/`.
2. Viết controller **không prefix** — `@Controller()` — và gác bằng
   `@UseGuards(JwtAuthGuard)`.
3. Đăng ký module trong `app.module.ts`.
4. Thêm prefix của nó vào `appRoutes` trong `app.routes.ts`.
5. Nếu domain truy cập được qua hai dạng URL (lồng nhau và ở cấp cao nhất), tạo
   module thứ hai dùng chung service — xem `MeetingsModule` /
   `WorkspaceMeetingsModule`.
6. Gác quyền trong **service**, không phải controller. Bất cứ thứ gì nằm dưới một
   meeting đều nên gọi `MeetingsService.loadAccessible`.

Xem [Quy ước code](architecture/conventions.md).

## Thêm một feature vào web app

1. Tạo `src/features/<domain>/` với `services/`, `hooks/`, `components/`.
2. Đặt các lời gọi HTTP trong `services/<domain>.api.ts`, dùng `request<T>()` từ
   `@/lib/api` — đừng gọi axios trực tiếp.
3. Thêm cache key vào `src/lib/query-keys.ts`.
4. Thêm kiểu dữ liệu vào `src/lib/types.ts` (web app tự duy trì bản riêng).
5. Trang nằm dưới `app/(app)/` được layout đó bảo vệ tự động.

## Những cái bẫy môi trường đã gặp

- **Node 18 không chạy được.** Cả Prisma 7 lẫn Next 16 đều từ chối. Nếu bạn phát
  triển bên trong WSL, hãy kiểm tra `node -v` ở đó riêng, tách biệt với Windows.
- **Đường dẫn UNC làm hỏng toolchain Node.** Chạy `npx`/`npm` từ Windows trỏ vào
  đường dẫn `\\wsl.localhost\...` sẽ lỗi — `cmd.exe` không hỗ trợ thư mục làm
  việc dạng UNC. Hãy chạy bên trong WSL, hoặc để checkout trên filesystem gốc.
- **`generated/prisma` bị gitignore**, nên sau khi clone mới sẽ chưa có client
  cho tới khi bạn chạy `prisma generate`. Trước đó TypeScript sẽ báo thiếu module
  ở khắp nơi.

## Kiểm thử

Gần như không có test suite. `apps/api/test/app.e2e-spec.ts` là file scaffold mặc
định của NestJS, kiểm tra `GET /` trả về `Hello World!` — một route không tồn tại
trong app này, nên nó fail. Xem [Hạn chế đã biết](known-gaps.md).

Không có CI: `.github/workflows/` rỗng.
