# Lưu trữ file

[← Mục lục tài liệu](../README.md)

Nguồn:
[`apps/api/src/common/storage/storage.service.ts`](../../apps/api/src/common/storage/storage.service.ts)

File ghi âm cuộc họp được ghi xuống đĩa cục bộ. Phần còn lại của ứng dụng chỉ làm
việc với các **key** opaque và không bao giờ chạm vào filesystem, nhờ đó backend
có thể thay bằng S3 mà không phải sửa một nơi gọi nào.

## Giao diện

```ts
save({ buffer, originalName, prefix? }): Promise<{ key, size }>
createReadStream(key): ReadStream
delete(key): Promise<void>
exists(key): Promise<boolean>
```

Thư mục gốc là `resolve(process.cwd(), STORAGE_LOCAL_DIR)`, tính một lần trong
constructor. Vì nó tương đối so với **thư mục làm việc**, chạy API từ một thư mục
khác sẽ trỏ tới một kho khác.

## Định dạng key

```
meetings/<workspaceId>/<uuid><ext>
```

- Chỉ **phần mở rộng** của tên file phía client được giữ lại; phần tên bị thay
  bằng một uuid mới. Tên file độc hại hoặc trùng lặp không thể va chạm hay tác
  động tới đường dẫn.
- Key luôn dùng dấu gạch chéo xuôi, kể cả trên Windows, nên key ghi trên nền tảng
  này vẫn resolve được trên nền tảng khác.
- Tên gốc được giữ trên dòng `Meeting` ở trường `originalName`, và chỉ dùng cho
  header `Content-Disposition` khi tải về.

## Chặn path traversal

Mọi key đều đi qua `resolveKey` trước khi chạm đĩa:

```ts
const absPath = resolve(this.root, key);
if (absPath !== this.root && !absPath.startsWith(this.root + sep)) {
  throw new NotFoundException('Invalid storage key');
}
```

Key chứa `..`, hoặc là đường dẫn tuyệt đối, sẽ resolve ra ngoài thư mục gốc và bị
từ chối. Lớp chặn này áp dụng cho cả đọc, ghi, xóa lẫn kiểm tra tồn tại. Nó cố ý
throw `404` thay vì `400` để một lần dò không phân biệt được "nằm ngoài thư mục
gốc" với "không tồn tại".

## Validate upload

Do `MeetingsService.validateFile` thực hiện, theo đúng thứ tự này:

| Kiểm tra | Lỗi |
| --- | --- |
| Có file | `400 A meeting file is required` |
| `mimetype` bắt đầu bằng `audio/` hoặc `video/` | `403 Only audio or video files are accepted` |
| `size` ≤ `MAX_UPLOAD_SIZE_MB` × 1024² | `413 Uploaded file is too large` |

Hai điểm cần lưu ý:

- **MIME type là lời khai của client.** Nó đến từ header multipart và không được
  đối chiếu với nội dung file. Một file `.exe` đổi tên, gửi kèm
  `Content-Type: audio/mpeg`, vẫn lọt.
- **Mã lỗi cho sai kiểu file là `403`, không phải `415`.** Đây là điều code đang
  trả về (`ForbiddenException`).

## Buffer

`FileInterceptor` dùng memory storage của Multer với giới hạn cứng 2 GiB:

```ts
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
```

Nghĩa là file upload được giữ **hoàn toàn trong RAM** trước khi ghi xuống đĩa, và
giới hạn cấu hình được `MAX_UPLOAD_SIZE_MB` (mặc định 1024 MB) chỉ kiểm tra *sau
khi* file đã nằm trong bộ nhớ. Hai giới hạn phục vụ hai mục đích khác nhau: mức
chặn của Multer là lá chắn chống sập, còn giá trị cấu hình là quy tắc nghiệp vụ.
Với giá trị mặc định, một file 1 GB chiếm 1 GB heap.

Chuyển sang `diskStorage` hoặc xử lý multipart theo stream sẽ gỡ được áp lực này,
và là thay đổi hiển nhiên cần làm trước khi hệ thống nhận tải thật.

## Tải file

`GET /api/meetings/:id/file` kiểm tra membership, xác nhận key vẫn tồn tại (nếu
không thì `404 Stored file is missing`), đặt `Content-Type` từ `mimeType` đã lưu
và `Content-Disposition: attachment` với `originalName` đã URI-encode, rồi trả về
một `StreamableFile`.

`TransformInterceptor` cho `StreamableFile` đi qua nguyên vẹn, nên response là
bytes thô chứ không phải envelope JSON thường lệ.

Lưu ý route này vẫn đòi header `Authorization`, nên một thẻ `<a href>` thuần hay
một URL dán vào trình duyệt sẽ không hoạt động — client phải fetch kèm token.

## Xóa

`MeetingsService.remove` xóa dòng database **trước**, rồi mới tới file:

```ts
await this.storageService.delete(meeting.storageKey).catch(() => undefined);
```

Lỗi ở tầng storage bị nuốt một cách có chủ đích — dòng dữ liệu đã biến mất rồi,
nên để request thất bại sẽ gây hiểu nhầm. Đánh đổi là một lần xóa hỏng sẽ để lại
file mồ côi không còn gì trỏ tới. Không có job đối soát nào.

## Giới hạn vận hành

- **Chỉ chạy được một node.** Hai replica API sẽ không dùng chung kho upload.
- **Không được liệt kê theo tên trong `.gitignore`** — thư mục mặc định
  `./storage` nằm trong `apps/api/`. Hiện nó không bị track vì chưa có file nào
  được commit, nhưng các file upload lúc phát triển nằm ở đó.
- **Chưa có backend S3**, dù `aws-sdk` đã được cài. Xem
  [Hạn chế đã biết](../known-gaps.md).

## Liên quan

- [API Meetings](../api/meetings.md)
- [Cấu hình](../configuration.md) — `STORAGE_LOCAL_DIR`, `MAX_UPLOAD_SIZE_MB`
