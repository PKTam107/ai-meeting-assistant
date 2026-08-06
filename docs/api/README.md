# Quy ước API

[← Mục lục tài liệu](../README.md)

Base URL khi phát triển: `http://localhost:4000/api`. Mọi route đều nằm dưới
prefix global `/api`.

| Tham chiếu | |
| --- | --- |
| [Auth](auth.md) | `register` · `login` · `refresh` · `logout` · `me` |
| [Workspaces](workspaces.md) | CRUD workspace và quản lý thành viên |
| [Meetings](meetings.md) | Upload, danh sách, chi tiết, sửa, xóa, tải file |
| [Transcript & Summary](transcripts-and-summaries.md) | Các artifact AI |
| [Action items](action-items.md) | Công việc cần theo dõi |

## Xác thực

Mọi route trừ `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` và
`POST /auth/logout` đều yêu cầu:

```
Authorization: Bearer <accessToken>
```

`/auth/refresh` và `/auth/logout` xác thực bằng cookie `refreshToken` thay vì
header — trình duyệt tự gửi cookie này tới `/api/auth/*`. Xem
[Xác thực](../architecture/authentication.md).

## Response envelope

Mọi response JSON thành công đều được `TransformInterceptor` bọc lại:

```json
{
  "success": true,
  "data": { }
}
```

`data` là bất cứ thứ gì controller trả về — một object, một mảng, hoặc `null` với
response `204`.

**Ngoại lệ:** `GET /meetings/:id/file` trả về `StreamableFile` và bỏ qua hoàn
toàn envelope, stream bytes thô.

## Envelope lỗi

Do `AllExceptionsFilter` sinh ra:

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Not a member of this workspace",
  "error": "Forbidden",
  "path": "/api/workspaces/8f2c…",
  "timestamp": "2026-08-06T06:30:05.000Z"
}
```

| Trường | Ghi chú |
| --- | --- |
| `statusCode` | Trùng với HTTP status |
| `message` | Một chuỗi, hoặc **mảng chuỗi** khi validate thất bại |
| `error` | Tên exception, ví dụ `Bad Request`, `Forbidden`, `InternalServerError` |
| `path` | URL của request |
| `timestamp` | ISO 8601 |

Lỗi không được xử lý (không phải `HttpException`) sẽ được log kèm stack trace ở
phía server và trả về `500 Internal server error` chung chung, không lộ chi tiết
nội bộ.

## Validate request

`ValidationPipe` global chạy với:

| Tùy chọn | Tác dụng |
| --- | --- |
| `whitelist: true` | Thuộc tính không khai báo trong DTO bị loại bỏ |
| `forbidNonWhitelisted: true` | …và sự có mặt của nó là **`400`**, chứ không bị loại âm thầm |
| `transform: true` | Payload được khởi tạo thành class DTO kèm ép kiểu |

Nên gửi một trường lạ sẽ hỏng:

```json
{
  "success": false,
  "statusCode": 400,
  "message": ["property nickname should not exist"],
  "error": "Bad Request"
}
```

## Mã trạng thái

| Mã | Khi nào |
| --- | --- |
| `200` | Đọc hoặc cập nhật thành công |
| `201` | Mặc định cho `POST` (tạo workspace, thêm thành viên, tạo action item, upload meeting) |
| `202` | Đã yêu cầu transcript / summary — chấp nhận để xử lý sau |
| `204` | Xóa thành công — không có body |
| `400` | Validate thất bại, hoặc vi phạm quy tắc như thêm thành viên trùng |
| `401` | Thiếu/sai access token, hoặc refresh token hỏng/hết hạn/đã thu hồi |
| `403` | Đã xác thực nhưng không được phép — không phải thành viên, hoặc role không đủ |
| `404` | Không tìm thấy tài nguyên, hoặc artifact chưa từng được yêu cầu |
| `413` | Upload vượt `MAX_UPLOAD_SIZE_MB` |
| `500` | Lỗi không được xử lý |

Lưu ý `403` cũng được dùng cho trường hợp MIME type upload bị từ chối, nơi mà
`415` sẽ hợp lý hơn.

## Định danh

Mọi id đều là chuỗi uuid. Không có tham số phân trang, lọc hay sắp xếp trên bất
kỳ endpoint danh sách nào — danh sách trả về toàn bộ dòng mà người gọi được thấy.
Thứ tự sắp xếp cố định theo từng endpoint và được ghi rõ ở trang tương ứng.

## CORS

`origin: true` (phản chiếu origin của request) kèm `credentials: true`. Hiện tại
bất kỳ site nào cũng gọi được API từ trình duyệt; cần một allowlist trước khi lên
production.
