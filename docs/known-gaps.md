# Hạn chế đã biết

[← Mục lục tài liệu](README.md)

Mọi mục dưới đây đều đã được kiểm chứng trực tiếp trong code, không phải suy đoán
từ roadmap.

## 1. Chưa có AI

Đây là lỗ hổng lớn nhất của một dự án tên là "AI Meeting Assistant".

`TranscriptsService.transcribe` và `SummariesService.summarize` ghi một dòng
`PENDING` rồi return. Cả hai đều mang cùng một dấu vết:

```ts
// TODO(ai): enqueue a BullMQ transcription job here once the worker exists.
```

`apps/worker/` là một **thư mục rỗng**. Không có gì tiêu thụ các dòng `PENDING`,
nên:

- Transcript hay summary không bao giờ rời khỏi `PENDING`; `text` và `content`
  mãi là `null`.
- Giao diện hiển thị "Processing… this updates once the worker finishes" vô thời
  hạn.
- Action item chỉ được tạo thủ công, dù schema mô tả chúng có thể được AI trích
  xuất.

Mọi thứ xung quanh phần AI — máy trạng thái, tầng lưu trữ, các endpoint yêu cầu,
các trạng thái UI cho `PROCESSING` / `COMPLETED` / `FAILED` — đều đã dựng xong và
đang chờ.

## 2. `Meeting.status` không bao giờ đổi

Mọi meeting đứng nguyên ở `UPLOADED`. `MeetingRepository.update` có nhận trường
`status`, nhưng `MeetingsService.update` chỉ chuyển xuống `title` và
`description`, và không nơi gọi nào khác truyền `status`. Các giá trị
`PROCESSING`, `TRANSCRIBED`, `SUMMARIZED` và `FAILED` là không thể chạm tới.

`Meeting.durationSec` tương tự cũng không bao giờ được ghi — không có gì đọc
metadata của file media.

## 3. Dependency đã cài nhưng không dùng

**API** — không được import ở đâu trong `src/`:

| Package | Dự định dùng cho |
| --- | --- |
| `openai` | Chuyển giọng nói thành văn bản / tóm tắt |
| `bullmq`, `ioredis`, `@nestjs/bullmq` | Hàng đợi job |
| `@nestjs/websockets`, `@nestjs/platform-socket.io` | Cập nhật tiến độ realtime |
| `aws-sdk` | Backend lưu trữ S3 |
| `uuid` | (thực tế code dùng `crypto.randomUUID`) |

**API — đã cài nhưng không được nối vào `main.ts`**, đây là trường hợp đáng lưu ý
hơn:

| Package | Hệ quả |
| --- | --- |
| `helmet` | Không có security header |
| `compression` | Không nén response |
| `nestjs-pino`, `pino` | Không có structured logging — đang dùng logger mặc định của Nest |

**Web** — `socket.io-client` đã cài và không dùng.

## 4. `packages/shared-types` là code chết

Không có gì import `@ai-meeting/shared-types`. Cùng một bộ shape được định nghĩa
ba lần:

| Vị trí | Dạng |
| --- | --- |
| `apps/api/generated/prisma` | Kiểu do Prisma sinh |
| `apps/web/src/lib/types.ts` | Interface viết tay |
| `packages/shared-types/src/` | Viết tay, không dùng |

Chúng có thể lệch nhau âm thầm — không có gì đối chiếu khái niệm `Meeting` của
web app với của API.

## 5. Turborepo không hoạt động

`turbo.json` có định nghĩa đồ thị task, nhưng:

- không có `pnpm-workspace.yaml` ở gốc,
- `package.json` ở gốc không có trường `workspaces`,
- và gốc repo không có script `build` / `dev` / `lint` nào.

Nên turbo không tìm ra được các package. Hãy chạy lệnh riêng cho từng app.

## 6. Trộn hai package manager

`apps/api` dùng pnpm (kèm `pnpm-workspace.yaml` riêng để khai báo build
allowance), `apps/web` dùng npm, còn gốc repo có cả `pnpm-lock.yaml` lẫn
`package-lock.json`.

## 7. `dotenv` không được khai báo

`apps/api/prisma.config.ts` gọi `import "dotenv/config"`, nhưng `dotenv` không có
trong `apps/api/package.json` và không được link tại `node_modules/dotenv` (nó chỉ
tồn tại trong pnpm store dưới dạng dependency gián tiếp). Với cách bố trí nghiêm
ngặt của pnpm, việc resolve này có thể thất bại. Nếu một lệnh Prisma CLI báo
`Cannot find module 'dotenv/config'`, hãy chạy `pnpm add -D dotenv`.

## 8. Gần như không có test, và không có CI

File test duy nhất là scaffold mặc định của NestJS,
`apps/api/test/app.e2e-spec.ts`, kiểm tra `GET /` trả về `Hello World!`. Route đó
không tồn tại — `AppModule` không đăng ký controller nào và mọi route thật đều
nằm dưới prefix global `/api` — nên `pnpm test:e2e` **fail**.

Bộ unit test (`pnpm test`, khớp `*.spec.ts` dưới `src/`) không tìm thấy test nào.

`.github/workflows/` rỗng, nên không có gì được kiểm tra khi push hay mở pull
request.

## 9. Khung trống

Các thư mục tồn tại nhưng không chứa file nào:

```
apps/worker/
packages/ui/
packages/eslint-config/
packages/tsconfig/
infra/{docker,k8s,nginx,terraform}/
.github/workflows/
```

`apps/api/README.md` vẫn là readme starter nguyên bản của NestJS.

## 10. Giới hạn vận hành

**Upload được buffer hoàn toàn trong bộ nhớ.** Multer dùng memory storage với mức
chặn cứng 2 GiB; giới hạn cấu hình `MAX_UPLOAD_SIZE_MB` (mặc định 1024) chỉ được
kiểm tra *sau khi* file đã nằm trong heap. Một file 1 GB tốn 1 GB RAM.

**Lưu trữ chỉ chạy được một node.** Chỉ có đĩa cục bộ. Hai replica API sẽ không
dùng chung kho upload. `StorageService` được viết để thay bằng S3, nhưng backend
S3 chưa tồn tại.

**File mồ côi.** Xóa meeting sẽ xóa file theo kiểu best-effort và nuốt lỗi. Xóa
*workspace* thì cascade các dòng meeting nhưng hoàn toàn không đụng tới storage,
nên mọi file trong workspace đó thành mồ côi. Không có job đối soát.

**MIME type của upload không được kiểm chứng.** Kiểu file đến từ header multipart
của client và không được đối chiếu với nội dung thật.

**CORS chấp nhận mọi origin.** `origin: true` kèm `credentials: true` cần một
allowlist trước khi lên production.

**Không có phân trang ở bất kỳ đâu.** Mọi endpoint danh sách trả về toàn bộ dòng
mà người gọi được thấy.

**Không có rate limit** cho đăng nhập, đăng ký hay refresh.

## 11. Vài điểm thiếu nhất quán nhỏ trong API

- `POST /auth/logout` trả về payload `{ "success": true }`, sau đó lại bị
  interceptor bọc thêm — tạo ra `{"success":true,"data":{"success":true}}`.
- MIME type upload bị từ chối trả `403`, trong khi `415 Unsupported Media Type`
  mới là mã thông dụng.
- `PATCH /workspaces/:id` bắt buộc phải có `name`; đây không phải cập nhật một
  phần.
- Bất kỳ thành viên nào cũng đổi tên hay sửa được **mọi** meeting, và tạo/sửa/xóa
  được **mọi** action item. Chỉ việc xóa meeting của người khác mới bị gác theo
  role.
- Gỡ một thành viên khỏi workspace không bỏ gán các action item của họ.
- Chạy lại transcript hay summary sẽ âm thầm hủy kết quả cũ — không có bước xác
  nhận và không lưu lịch sử.
- `GET /meetings/:id/file` yêu cầu header `Authorization`, nên không dùng được
  như một link thuần hay thuộc tính `src`.
