# Cấu hình

[← Mục lục tài liệu](README.md)

## API — `apps/api/.env`

Sao chép [`apps/api/.env.example`](../apps/api/.env.example) thành
`apps/api/.env`.

Mọi biến đều được khai báo trong
[`src/common/config/env.validation.ts`](../apps/api/src/common/config/env.validation.ts)
và kiểm tra bằng `class-validator` **trước khi app khởi động**. Giá trị thiếu hay
sai định dạng sẽ throw ngay lúc bootstrap kèm thông báo liệt kê mọi ràng buộc bị
vi phạm — không có giá trị dự phòng âm thầm nào lúc runtime.

| Biến | Bắt buộc | Mặc định | Ràng buộc | Ghi chú |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | không | `development` | `development` \| `production` \| `test` | Quyết định cờ `secure` của cookie refresh |
| `PORT` | không | `4000` | số nguyên | |
| `DATABASE_URL` | **có** | — | chuỗi không rỗng | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | **có** | — | ≥ 16 ký tự | Ký access token |
| `JWT_ACCESS_EXPIRES_IN` | không | `15m` | chuỗi không rỗng | `.env.example` để `1h` |
| `JWT_REFRESH_SECRET` | **có** | — | ≥ 16 ký tự | Ký refresh token. Phải khác `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN` | không | `7d` | chuỗi không rỗng | Đồng thời quyết định `expires` của cookie |
| `STORAGE_LOCAL_DIR` | không | `./storage` | chuỗi không rỗng | Thư mục gốc chứa upload, tính tương đối so với **thư mục làm việc của process** |
| `MAX_UPLOAD_SIZE_MB` | không | `1024` | số nguyên | Được `MeetingsService.validateFile` áp dụng |

### Ghi chú cho từng biến

**`JWT_SECRET` / `JWT_REFRESH_SECRET`** — mức tối thiểu 16 ký tự là sàn, không
phải khuyến nghị. Sinh secret thật:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Không có gì trong code kiểm tra hai secret có khác nhau không, nhưng dùng chung
một secret cho cả hai loại token là phá bỏ chính lý do tách chúng ra — lộ secret
của access token sẽ cho phép kẻ tấn công tự đúc refresh token.

**`JWT_ACCESS_EXPIRES_IN`** — giá trị mặc định trong schema (`15m`) và giá trị
trong `.env.example` (`1h`) không khớp nhau. Bạn set gì thì cái đó thắng; xóa
dòng đi thì được `15m`. Định dạng là bất cứ thứ gì `jsonwebtoken` chấp nhận
(`900`, `15m`, `1h`, `7d`).

**`STORAGE_LOCAL_DIR`** — đường dẫn tương đối được tính so với `process.cwd()`,
nên khởi động API từ thư mục gốc repo thay vì từ `apps/api/` sẽ trỏ tới một thư
mục khác và các file đã upload sẽ trông như bị mất.

**`MAX_UPLOAD_SIZE_MB`** — được áp dụng *sau khi* file đã nằm trọn trong bộ nhớ.
Một mức chặn cứng 2 GiB riêng biệt nằm trong controller làm lá chắn chống sập.
Nâng giá trị này vượt quá heap khả dụng sẽ không có tác dụng. Xem
[Lưu trữ file](architecture/storage.md).

**`NODE_ENV=production`** đặt `secure: true` cho cookie refresh, nghĩa là cookie
chỉ được gửi qua HTTPS. Bật nó trong khi vẫn phục vụ qua HTTP thuần sẽ làm hỏng
xác thực một cách âm thầm.

## Web — `apps/web/.env.local`

Sao chép [`apps/web/.env.example`](../apps/web/.env.example).

| Biến | Mặc định | Ghi chú |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | **Phải bao gồm cả prefix `/api`** |

Đây là biến `NEXT_PUBLIC_`, nên nó được nhúng thẳng vào bundle phía client lúc
**build**, không phải đọc lúc runtime. Đổi giá trị đòi hỏi build lại chứ không
chỉ restart. Giá trị dự phòng trong `src/lib/api.ts` cũng chính là localhost đó,
nên thiếu file này vẫn chạy được khi phát triển local.

Phía web không có bước validate biến môi trường nào.

## Database

`docker-compose.yml` ở thư mục gốc dựng PostgreSQL 16 với:

| Thiết lập | Giá trị |
| --- | --- |
| User / mật khẩu | `postgres` / `postgres` |
| Database | `ai_meeting_assistant` |
| Cổng | `5432` |
| Volume | `postgres_data` |

Chuỗi kết nối tương ứng:

```
postgresql://postgres:postgres@localhost:5432/ai_meeting_assistant?schema=public
```

Service có healthcheck `pg_isready` nhưng **không có gì phụ thuộc vào nó** — API
không nằm trong file compose, nên thứ tự khởi động là việc của bạn.

`DATABASE_URL` được dùng ở hai nơi: `PrismaService` lúc runtime, và
[`prisma.config.ts`](../apps/api/prisma.config.ts) cho các lệnh CLI (file này nạp
`.env` qua `dotenv/config`).

## Liên quan

- [Phát triển](development.md) — cài đặt và quy trình Prisma
- [Xác thực](architecture/authentication.md) — cách các biến JWT được dùng
