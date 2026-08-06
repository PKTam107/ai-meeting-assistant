# API Auth

[← Mục lục API](README.md) · [Quy ước chung](README.md) ·
[Cơ chế xác thực](../architecture/authentication.md)

Base path `/api/auth`. Đây là module duy nhất giữ prefix controller riêng thay vì
được mount từ `app.routes.ts`.

Các response bên dưới hiển thị phần `data` **đã bóc**; mỗi cái đều nằm trong
`{ "success": true, "data": … }`.

---

## `POST /api/auth/register`

Tạo tài khoản và đăng nhập luôn.

**Body**

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `email` | string | Email hợp lệ, duy nhất |
| `password` | string | Tối thiểu 6 ký tự |

**`201`**

```json
{
  "user": { "id": "8f2c…", "email": "me@example.com" },
  "accessToken": "eyJhbGciOi…"
}
```

Đồng thời set cookie `refreshToken` (httpOnly, `path=/api/auth`).

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `400` | `Email already exists` |
| `400` | Mảng lỗi validate, ví dụ `["password must be longer than or equal to 6 characters"]` |

---

## `POST /api/auth/login`

**Body**

| Trường | Kiểu |
| --- | --- |
| `email` | string, email hợp lệ |
| `password` | string |

**`201`** — cùng dạng với register.

**Lỗi**

| Mã | Thông báo |
| --- | --- |
| `401` | `Invalid credentials` — trả về cho cả email không tồn tại lẫn sai mật khẩu, nên endpoint không tiết lộ tài khoản nào có thật |

---

## `POST /api/auth/refresh`

Đổi cookie refresh lấy access token mới. Không nhận body; đọc cookie
`refreshToken`.

**`200`** — cùng dạng với register, và **xoay vòng** cookie: token vừa xuất trình
bị thu hồi, một token mới được phát hành.

**Lỗi**

| Mã | Thông báo | Ý nghĩa |
| --- | --- | --- |
| `401` | `Missing refresh token` | Không có cookie |
| `401` | `Invalid refresh token` | Sai chữ ký, `jti` không tồn tại, hoặc hash lệch |
| `401` | `Refresh token has been revoked` | **Phát hiện tái sử dụng** — mọi token đang hoạt động của user bị thu hồi |
| `401` | `Refresh token has expired` | Quá `expiresAt` |

---

## `POST /api/auth/logout`

Thu hồi refresh token vừa xuất trình và xóa cookie.

**`200`**

```json
{ "success": true }
```

> Lưu ý payload của endpoint này đúng nghĩa là `{ "success": true }`, sau đó lại
> bị interceptor bọc thêm — nên response thật trên đường truyền là
> `{"success":true,"data":{"success":true}}`.

Cố ý làm theo kiểu best-effort: token thiếu, sai định dạng hay đã bị thu hồi đều
không phải lỗi. Đăng xuất không bao giờ thất bại.

---

## `GET /api/auth/me` 🔒

Trả về chủ thể đã xác thực. Yêu cầu `Authorization: Bearer …`.

**`200`**

```json
{ "userId": "8f2c…", "email": "me@example.com" }
```

Lưu ý trường là `userId`, không phải `id` — đây là `AuthUser` mà `JwtStrategy`
gắn vào request, không phải một dòng `User`.

**Lỗi**

| Mã | Ý nghĩa |
| --- | --- |
| `401` | Access token thiếu, sai định dạng hoặc hết hạn |

---

## Thời hạn token

| Token | Biến | Mặc định |
| --- | --- | --- |
| Access | `JWT_ACCESS_EXPIRES_IN` | `15m` (`.env.example` để `1h`) |
| Refresh | `JWT_REFRESH_EXPIRES_IN` | `7d` |

Xem [Cấu hình](../configuration.md).
