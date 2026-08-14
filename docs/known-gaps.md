# Hạn chế đã biết

[← Mục lục tài liệu](README.md)

Mọi mục dưới đây đều đã được kiểm chứng trực tiếp trong code, không phải suy đoán
từ roadmap.

Đo theo [mục tiêu hiện tại](learning-roadmap.md) — họp trong app, ghi lại, rồi
xử lý — thì hai mục đầu là hai nửa còn thiếu của chính mục tiêu đó.

## 1. Chưa có phòng họp, và schema đang chặn nó

Không có một dòng WebRTC nào trong `apps/api/src` hay `apps/web/src`. Không có
signaling, không có SFU, không có khái niệm phiên họp trực tiếp. Cách duy nhất
để một bản ghi vào được hệ thống là **upload một file đã ghi xong ở nơi khác**.

`Meeting` hiện là *một file đã upload*, không phải *một cuộc họp*:

```prisma
model Meeting {
  storageKey   String   // NOT NULL
  originalName String   // NOT NULL
  mimeType     String   // NOT NULL
  fileSize     Int      // NOT NULL
}
```

Bốn cột này không thể điền vào lúc **bắt đầu** một cuộc họp trực tiếp — file chỉ
tồn tại sau khi họp xong. Nên đây không chỉ là "thiếu tính năng": phần lưu trữ
file phải tách khỏi `Meeting` (thành `Recording` / `RecordingTrack`) trước khi
viết được dòng WebRTC đầu tiên, và đó là breaking change với các endpoint meeting
đang chạy.

Cũng chưa có `MeetingParticipant` — hệ thống không có chỗ nào ghi lại *ai đã dự*,
chỉ có ai là thành viên workspace.

## 2. Chưa có AI

Nửa còn lại của mục tiêu.

`TranscriptsService.transcribe` và `SummariesService.summarize` ghi một dòng
`PENDING` rồi return. Cả hai đều mang cùng một dấu vết:

```ts
// TODO(ai): enqueue a BullMQ transcription job here once the worker exists.
```

Hạ tầng queue thì đã có thật — worker process, BullMQ, retry, dead-letter — nhưng
nó mới chỉ chạy job đo thời lượng media (xem
[Hàng đợi và worker](architecture/queue-and-worker.md)). **Worker đã tồn tại;
thứ chưa tồn tại là một loại job AI.** Không có gì tiêu thụ các dòng `PENDING`,
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

## 3. `Meeting.status` mới đi được nửa đường

Worker metadata đưa meeting qua `UPLOADED → PROCESSING → READY`, và `FAILED` khi
job chết hẳn. Nhưng `TRANSCRIBED` và `SUMMARIZED` vẫn là hai giá trị **không ai
ghi**, vì chưa có bước AI nào tồn tại để ghi chúng.

## 4. Dependency đã cài nhưng không dùng

**API** — không được import ở đâu trong `src/`:

| Package | Dự định dùng cho |
| --- | --- |
| `openai` | Chuyển giọng nói thành văn bản / tóm tắt |
| `@nestjs/websockets`, `@nestjs/platform-socket.io` | Cập nhật tiến độ realtime |
| `aws-sdk` | Backend lưu trữ S3 |
| `uuid` | (thực tế code dùng `crypto.randomUUID`) |

**Web** — `socket.io-client` đã cài và không dùng.

## 5. `packages/shared-types` là code chết

Không có gì import `@ai-meeting/shared-types`. Cùng một bộ shape được định nghĩa
ba lần:

| Vị trí | Dạng |
| --- | --- |
| `apps/api/generated/prisma` | Kiểu do Prisma sinh |
| `apps/web/src/lib/types.ts` | Interface viết tay |
| `packages/shared-types/src/` | Viết tay, không dùng |

Chúng có thể lệch nhau âm thầm — không có gì đối chiếu khái niệm `Meeting` của
web app với của API.

## 6. Turborepo không hoạt động

`turbo.json` có định nghĩa đồ thị task, nhưng:

- không có `pnpm-workspace.yaml` ở gốc,
- `package.json` ở gốc không có trường `workspaces`,
- và gốc repo không có script `build` / `dev` / `lint` nào.

Nên turbo không tìm ra được các package. Hãy chạy lệnh riêng cho từng app.

## 7. Trộn hai package manager

`apps/api` dùng pnpm (kèm `pnpm-workspace.yaml` riêng để khai báo build
allowance), `apps/web` dùng npm, còn gốc repo có cả `pnpm-lock.yaml` lẫn
`package-lock.json`.

## 8. Test chỉ phủ một tính chất duy nhất

Toàn bộ test hiện có nằm quanh việc xoay refresh token: unit test cạnh
`AuthService` và `test/refresh-rotation.e2e-spec.ts` chạy với PostgreSQL thật. CI
(`.github/workflows/ci.yml`) chạy lint · typecheck · unit · e2e cho API và lint ·
typecheck · build cho web.

Không có gì khác được phủ. Workspace, meeting, upload, transcript, summary và
action item — không module nào có test, và không có test nào chạm tới `apps/web`.

## 9. Khung trống

Các thư mục tồn tại nhưng không chứa file nào:

```
apps/worker/
packages/ui/
packages/eslint-config/
packages/tsconfig/
infra/{docker,k8s,nginx,terraform}/
```

`apps/worker/` vẫn rỗng **có chủ đích**: worker process sống trong
`apps/api/src/worker/` và chạy bằng `pnpm start:worker`. Tách nó thành package
riêng đòi hỏi một package dùng chung cho Prisma client, config và repository —
mà monorepo hiện tại chưa gánh nổi (mục 6 và 7 ngay trên). Việc đó là một bước
dọn dẹp monorepo riêng, không phải điều kiện để có worker.

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
