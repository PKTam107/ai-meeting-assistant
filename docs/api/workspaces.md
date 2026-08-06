# API Workspaces

[← Mục lục API](README.md) · [Mô hình phân quyền](../architecture/authorization.md)

Base path `/api/workspaces`. **Mọi route đều yêu cầu** `Authorization: Bearer …`.

Các response bên dưới hiển thị phần `data` đã bóc.

---

## `POST /api/workspaces`

Tạo workspace. Người gọi trở thành `OWNER`, và một dòng `WorkspaceMember` với
role `OWNER` được tạo trong cùng một lần ghi.

**Body**

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `name` | string | Không rỗng, ≤ 120 ký tự |

**`201`**

```json
{
  "id": "8f2c…",
  "name": "Product team",
  "ownerId": "3a91…",
  "createdAt": "2026-08-06T06:30:05.000Z",
  "updatedAt": "2026-08-06T06:30:05.000Z"
}
```

---

## `GET /api/workspaces`

Mọi workspace mà người gọi thuộc về, với tư cách chủ sở hữu **hoặc** thành viên.
Sắp xếp theo `createdAt` giảm dần. Không phân trang.

**`200`** — mảng object workspace.

---

## `GET /api/workspaces/:id`

**`200`** — một object workspace.

| Mã | Ý nghĩa |
| --- | --- |
| `404` | `Workspace not found` |
| `403` | `Not a member of this workspace` |

Kiểm tra tồn tại chạy trước kiểm tra membership, nên người ngoài dò một id có
thật sẽ nhận `403`, còn id bịa ra sẽ nhận `404`.

---

## `PATCH /api/workspaces/:id`

Đổi tên. Cần `workspace:update` — **`OWNER` hoặc `ADMIN`**.

**Body**

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `name` | string | Bắt buộc, không rỗng, ≤ 120 ký tự |

`name` **không phải tùy chọn** ở endpoint này — DTO bắt buộc phải có.

**`200`** — workspace sau khi cập nhật.

| Mã | Ý nghĩa |
| --- | --- |
| `403` | `Insufficient workspace permissions` |

---

## `DELETE /api/workspaces/:id`

Cần `workspace:delete` — **chỉ `OWNER`**.

**`204`** — không có body.

Cascade tới thành viên, meeting, và mọi thứ bên dưới mỗi meeting. File đã lưu
**không** bị xóa — xóa workspace sẽ để lại toàn bộ file upload mồ côi trên đĩa.

---

## `GET /api/workspaces/:id/members`

Thành viên bất kỳ đều xem được. Sắp xếp theo `createdAt` tăng dần, nên chủ sở hữu
đứng đầu.

**`200`**

```json
[
  {
    "id": "c14e…",
    "workspaceId": "8f2c…",
    "userId": "3a91…",
    "role": "OWNER",
    "createdAt": "2026-08-06T06:30:05.000Z",
    "user": { "id": "3a91…", "email": "me@example.com" }
  }
]
```

Chỉ `id` và `email` của user được join vào là được phơi ra.

---

## `POST /api/workspaces/:id/members`

Thêm một user đã tồn tại bằng email. Cần `workspace:manageMembers` — **`OWNER`
hoặc `ADMIN`**.

**Body**

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `email` | string | Email hợp lệ; user phải có tài khoản sẵn |
| `role` | enum | Tùy chọn, mặc định `MEMBER`. Chỉ `ADMIN` hoặc `MEMBER` |

**`201`** — dòng membership vừa tạo (không kèm user join).

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `400` | `Cannot assign the OWNER role` |
| `400` | `User is already a member` |
| `404` | `No user with that email` |
| `403` | `Insufficient workspace permissions` |

Không có luồng mời — người đó phải tự đăng ký trước.

---

## `DELETE /api/workspaces/:id/members/:userId`

Cần `workspace:manageMembers` — **`OWNER` hoặc `ADMIN`**.

**`204`** — không có body.

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `404` | `Member not found` |
| `400` | `Cannot remove the workspace owner` |

Không có gì ngăn một `ADMIN` gỡ một `ADMIN` khác, hoặc gỡ chính mình.

---

## Tóm tắt quyền

| Route | Yêu cầu |
| --- | --- |
| `POST /` | Bất kỳ user đã xác thực |
| `GET /`, `GET /:id`, `GET /:id/members` | Là thành viên |
| `PATCH /:id` | `OWNER` / `ADMIN` |
| `POST /:id/members`, `DELETE /:id/members/:userId` | `OWNER` / `ADMIN` |
| `DELETE /:id` | `OWNER` |
