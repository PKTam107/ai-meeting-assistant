# API Action items

[← Mục lục API](README.md)

Các công việc cần theo dõi, gắn với một meeting. Tách ra hai điểm mount: liệt kê
và tạo nằm dưới meeting, còn sửa và xóa thao tác trực tiếp trên item.

**Mọi route đều yêu cầu** `Authorization: Bearer …` và phải là thành viên
workspace của meeting. **Không có lớp gác theo role** — bất kỳ thành viên nào
cũng tạo, sửa và xóa được mọi action item trong workspace.

---

## `GET /api/meetings/:meetingId/action-items`

Sắp xếp theo `createdAt` tăng dần. Không phân trang.

**`200`**

```json
[
  {
    "id": "e5c8…",
    "meetingId": "d4b7…",
    "content": "Send the revised quote",
    "assigneeId": "3a91…",
    "dueDate": "2026-08-12T00:00:00.000Z",
    "status": "OPEN",
    "createdAt": "2026-08-06T06:30:05.000Z",
    "updatedAt": "2026-08-06T06:30:05.000Z"
  }
]
```

Người được giao chỉ trả về dưới dạng `assigneeId` trần — user **không** được join
vào. Muốn có tên thì tra qua `GET /workspaces/:id/members`.

---

## `POST /api/meetings/:meetingId/action-items`

**Body**

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `content` | string | Bắt buộc, không rỗng, ≤ 500 ký tự |
| `assigneeId` | uuid | Tùy chọn. Phải là thành viên workspace của meeting |
| `dueDate` | chuỗi ngày ISO 8601 | Tùy chọn |
| `status` | enum | Tùy chọn. `OPEN` \| `IN_PROGRESS` \| `DONE`. Mặc định `OPEN` |

**`201`** — item vừa tạo.

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `400` | `Assignee must be a member of the workspace` |
| `400` | Mảng lỗi validate, ví dụ `["assigneeId must be a UUID"]` |
| `404` | `Meeting not found` |
| `403` | `Not a member of this workspace` |

---

## `PATCH /api/action-items/:id`

Mọi trường đều tùy chọn. Hai trong số đó nhận `null` tường minh để **xóa** giá
trị — đây là điểm phân biệt giữa "giữ nguyên" và "bỏ trống":

| Trường | Bỏ qua | `null` | Có giá trị |
| --- | --- | --- | --- |
| `content` | giữ nguyên | ❌ bị từ chối | ≤ 500 ký tự, không rỗng |
| `assigneeId` | giữ nguyên | bỏ gán người | uuid, phải là thành viên workspace |
| `dueDate` | giữ nguyên | xóa hạn | chuỗi ISO 8601 |
| `status` | giữ nguyên | ❌ bị từ chối | `OPEN` \| `IN_PROGRESS` \| `DONE` |

```json
{ "status": "DONE", "assigneeId": null }
```

**`200`** — item sau khi cập nhật.

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `400` | `Assignee must be a member of the workspace` |
| `404` | `Action item not found` |
| `403` | `Not a member of this workspace` |

Việc kiểm tra membership đi theo chuỗi item → meeting → workspace, nên một id item
hợp lệ nhưng thuộc workspace của người khác sẽ trả `403`, không phải `404`.

---

## `DELETE /api/action-items/:id`

**`204`** — không có body.

| Mã | Thông báo |
| --- | --- |
| `404` | `Action item not found` |
| `403` | `Not a member of this workspace` |

---

## Ghi chú

- **`status` do client quyết định.** Không có gì tự động chuyển trạng thái; UI
  ghi đúng thứ người dùng chọn.
- **Dọn dẹp người được giao.** Xóa một user sẽ set `assigneeId` thành `NULL` chứ
  không xóa task (`onDelete: SetNull`).
- **Gỡ ai đó khỏi workspace không tự bỏ gán action item của họ.** Các item vẫn
  trỏ tới người đó, và một lần `PATCH` sau này gửi lại đúng `assigneeId` ấy sẽ
  hỏng ở bước kiểm tra membership.
- **AI trích xuất là nguồn thứ hai dự kiến.** Comment trong schema mô tả action
  item được tạo "bởi bước trích xuất của AI (sau này) hoặc thủ công bởi thành
  viên workspace" — hiện chỉ có đường thủ công. Xem
  [Hạn chế đã biết](../known-gaps.md).
