# API Meetings

[← Mục lục API](README.md) · [Lưu trữ file](../architecture/storage.md)

Meeting được tách ra hai điểm mount: tạo và liệt kê diễn ra **bên trong một
workspace**, còn mọi thao tác trên một meeting cụ thể nằm dưới
`/api/meetings/:id`.

**Mọi route đều yêu cầu** `Authorization: Bearer …` và phải là thành viên của
workspace sở hữu meeting.

---

## `POST /api/workspaces/:workspaceId/meetings`

Upload một bản ghi. Dùng **`multipart/form-data`**, không phải JSON.

**Các trường form**

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `file` | file | Bắt buộc. MIME type phải bắt đầu bằng `audio/` hoặc `video/` |
| `title` | string | Bắt buộc, không rỗng, ≤ 200 ký tự |
| `description` | string | Tùy chọn, ≤ 2000 ký tự |

**`201`**

```json
{
  "id": "d4b7…",
  "workspaceId": "8f2c…",
  "uploadedById": "3a91…",
  "title": "Weekly sync",
  "description": "Notes",
  "status": "UPLOADED",
  "storageKey": "meetings/8f2c…/9e1f….m4a",
  "originalName": "recording.m4a",
  "mimeType": "audio/mp4",
  "fileSize": 8123456,
  "durationSec": null,
  "createdAt": "2026-08-06T06:30:05.000Z",
  "updatedAt": "2026-08-06T06:30:05.000Z"
}
```

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `400` | `A meeting file is required` |
| `403` | `Only audio or video files are accepted` |
| `403` | `Not a member of this workspace` |
| `413` | `Uploaded file is too large` (vượt `MAX_UPLOAD_SIZE_MB`, mặc định 1024 MB) |

Ghi chú:

- MIME type là **lời khai của client** lấy từ header multipart; nội dung file
  không được kiểm tra.
- File được buffer **hoàn toàn trong bộ nhớ** trước khi ghi xuống đĩa (memory
  storage của Multer, giới hạn cứng 2 GiB).
- `durationSec` không bao giờ được ghi — không có gì đọc metadata media.
- `status` là `UPLOADED` và ở nguyên đó vĩnh viễn. Xem
  [Hạn chế đã biết](../known-gaps.md).

**Ví dụ**

```bash
curl -X POST "$BASE/workspaces/$WS/meetings" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'title=Weekly sync' \
  -F 'description=Notes' \
  -F 'file=@recording.m4a'
```

---

## `GET /api/workspaces/:workspaceId/meetings`

Liệt kê mọi meeting trong workspace, sắp xếp theo `createdAt` giảm dần. Không
phân trang.

**`200`** — mảng object meeting thuần (không kèm dữ liệu transcript/summary/action
item; muốn có thì dùng route chi tiết).

---

## `GET /api/meetings/:id`

Một meeting, kèm **trạng thái** các artifact của nó và số lượng action item.

**`200`**

```json
{
  "id": "d4b7…",
  "workspaceId": "8f2c…",
  "title": "Weekly sync",
  "status": "UPLOADED",
  "originalName": "recording.m4a",
  "mimeType": "audio/mp4",
  "fileSize": 8123456,
  "durationSec": null,
  "createdAt": "2026-08-06T06:30:05.000Z",
  "updatedAt": "2026-08-06T06:30:05.000Z",
  "transcript": { "id": "aa10…", "status": "PENDING" },
  "summary": null,
  "_count": { "actionItems": 3 }
}
```

`transcript` và `summary` là `null` cho tới khi được yêu cầu, và ở đây chỉ phơi
ra `id` cùng `status` — muốn lấy artifact đầy đủ thì gọi endpoint riêng của nó.

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `404` | `Meeting not found` |
| `403` | `Not a member of this workspace` |

---

## `PATCH /api/meetings/:id`

Sửa metadata. **Bất kỳ thành viên nào** cũng sửa được meeting bất kỳ trong
workspace — không giới hạn ở người upload.

**Body** (cả hai đều tùy chọn)

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `title` | string | ≤ 200 ký tự |
| `description` | string | ≤ 2000 ký tự |

**`200`** — meeting sau khi cập nhật.

Chỉ `title` và `description` được chuyển xuống database. Repository cũng nhận
`status`, nhưng không route nào phơi ra trường đó.

---

## `DELETE /api/meetings/:id`

**`204`** — không có body.

Cho phép với **người upload**, hoặc bất kỳ thành viên nào có capability
`meeting:deleteAny` (`OWNER` / `ADMIN`):

```ts
if (meeting.uploadedById !== userId) {
  await assertCan(meeting.workspaceId, userId, 'meeting:deleteAny');
}
```

Cascade tới transcript, summary và action item. File đã lưu sau đó bị xóa theo
kiểu **best-effort** — lỗi ở tầng storage bị nuốt, để lại file mồ côi thay vì làm
hỏng request.

| Mã | Thông báo |
| --- | --- |
| `403` | `Insufficient workspace permissions` |
| `404` | `Meeting not found` |

---

## `GET /api/meetings/:id/file`

Tải bản ghi gốc.

**`200`** — bytes thô. Route này **bỏ qua envelope JSON**.

| Header | Giá trị |
| --- | --- |
| `Content-Type` | `mimeType` đã lưu |
| `Content-Disposition` | `attachment; filename="<originalName đã URI-encode>"` |

| Mã | Thông báo |
| --- | --- |
| `404` | `Meeting not found` |
| `404` | `Stored file is missing` — dòng dữ liệu còn nhưng key đã biến mất khỏi kho |
| `403` | `Not a member of this workspace` |

> Route này yêu cầu header `Authorization`, nên một thẻ `<a href>` thuần hay URL
> dán vào trình duyệt sẽ **không** hoạt động. Client phải fetch kèm token rồi
> chuyển response thành blob.

```bash
curl -L -H "Authorization: Bearer $TOKEN" \
  -o recording.m4a "$BASE/meetings/$ID/file"
```

---

## Tóm tắt quyền

| Route | Yêu cầu |
| --- | --- |
| `POST /workspaces/:id/meetings` | Là thành viên |
| `GET /workspaces/:id/meetings` | Là thành viên |
| `GET /meetings/:id` | Là thành viên |
| `PATCH /meetings/:id` | Là thành viên |
| `GET /meetings/:id/file` | Là thành viên |
| `DELETE /meetings/:id` | Người upload, **hoặc** `OWNER` / `ADMIN` |
