# Quy ước code

[← Mục lục tài liệu](../README.md)

## API — ba lớp cho mỗi module

```
modules/<domain>/
  controllers/     Chỉ lo hình dạng HTTP
  services/        Quy tắc nghiệp vụ và phân quyền
  repositories/    Nơi duy nhất chạm vào Prisma
  dto/             Validate request
  policies/        Quy tắc role → capability (chỉ workspaces)
  <domain>.module.ts
```

**Controller** phải mỏng. Chúng không mang prefix — `@Controller()` — vì prefix
được gán tập trung trong
[`app.routes.ts`](../../apps/api/src/app.routes.ts). Chúng được gác bằng
`@UseGuards(JwtAuthGuard)` ở cấp class, đọc người gọi qua `@CurrentUser()`, rồi
ủy quyền ngay. Một controller không nên chứa câu `if` nào.

**Service** giữ mọi quy tắc: phân quyền, những kiểm tra cần truy vấn database, và
việc điều phối qua nhiều repository. Chúng nhận vào một `userId` thuần, không bao
giờ nhận object request.

**Repository** bọc `PrismaService` và phơi ra các method nói rõ ý định
(`listByWorkspace`, `findByIdWithArtifacts`, `enqueue`). Kiểu dữ liệu của Prisma
không rò rỉ ra khỏi lớp này, trừ các kiểu model dùng làm kiểu trả về.

Alias `@/*` trỏ tới `apps/api/src/*`.

### Vài quy ước đặt tên đáng học theo

- `assertX` thì throw; `isX` / `canX` trả boolean. Cả hai biến thể đều tồn tại ở
  những chỗ nơi gọi cần rẽ nhánh (`assertMember` / `isMember`, `assert` / `can`).
- `loadAccessible(id, userId)` — nạp tài nguyên *và* kiểm tra quyền trong một lời
  gọi, để không thể quên kiểm tra ở một nơi gọi mới.
- `enqueue(...)` trên repository của transcript/summary là một upsert đồng thời
  reset kết quả cũ, nhờ vậy "chạy" và "chạy lại" dùng chung một nhánh code.
- Các kiểu payload của Prisma được export từ chính repository sinh ra chúng
  (`MeetingWithArtifacts`, `WorkspaceMemberWithUser`) thay vì khai báo lại.

### Tách module cho các điểm mount khác nhau

Một domain truy cập được qua hai dạng URL sẽ được đăng ký thành hai module dùng
chung một service:

| Module | Mount tại |
| --- | --- |
| `MeetingsModule` | `meetings` |
| `WorkspaceMeetingsModule` | `workspaces/:workspaceId/meetings` |
| `ActionItemsModule` | `action-items` |
| `MeetingActionItemsModule` | `meetings/:meetingId/action-items` |

## Web — mỗi feature một thư mục

```
src/
  features/<domain>/
    services/<domain>.api.ts    Lớp bọc mỏng quanh axios client dùng chung
    hooks/use-<domain>.ts       Hook TanStack Query
    components/*.tsx            Phần hiển thị
  components/ui/                Primitive dùng chung
  lib/                          api client, query-keys, types, utils
  providers/                    AuthProvider
  store/                        Zustand (chỉ auth)
```

Quy ước:

- **Mọi lời gọi HTTP đi qua `src/lib/api.ts`.** Các file `*.api.ts` của feature
  gọi `request<T>()`, hàm này bóc envelope `{ success, data }` và trả về `data`.
  Những endpoint có thể 404 một cách hợp lệ (transcript, summary) dùng
  `getOrNull`, trả `null` thay vì throw.
- **Cache key được gom tập trung** trong `src/lib/query-keys.ts` — đừng viết
  thẳng mảng key trong hook.
- **Server state nằm ở TanStack Query; client state nằm ở Zustand.** Store chỉ
  giữ user đã đăng nhập. Không có cache toàn cục nào cho workspace hay meeting
  bên ngoài Query.
- **Modal được code-split.** Bất cứ thứ gì nằm sau một cú click đều được import
  bằng `next/dynamic` để nằm ở chunk riêng — xem `workspace-detail.tsx` và
  `meeting-detail.tsx`.
- **Lỗi hiện ra dưới dạng toast.** `errorMessage(err, fallback)` biến một lỗi
  axios thành chuỗi, có nối mảng message mà `ValidationPipe` trả về.
- Alias `@/*` trỏ tới `apps/web/src/*`.

### Route group

```
app/(auth)/    Công khai — /login, /register
app/(app)/     Có bảo vệ — /dashboard, /workspaces/[id], /meetings/[id]
```

Lớp bảo vệ chính là layout `(app)`: nó chờ bootstrap phiên đăng nhập xong rồi
chuyển hướng về `/login` nếu không có user. Thêm một trang vào dưới `(app)` là nó
tự động được bảo vệ.

## Kiểu dữ liệu hiện đang bị trùng lặp

API dùng kiểu do Prisma sinh; web app tự duy trì bản tương đương trong
`src/lib/types.ts`; và `packages/shared-types` khai báo bản thứ ba mà **không ai
import**. Hãy nhớ điều này khi đổi một shape — xem
[Hạn chế đã biết](../known-gaps.md).

## Định dạng code

Prettier và ESLint được cấu hình riêng cho từng app (`pnpm lint`, `pnpm format`
trong `apps/api`; `npm run lint` trong `apps/web`). Không có task format cho toàn
repo, và không có pre-commit hook.
