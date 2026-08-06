# Sơ đồ quan hệ thực thể

[← Mục lục tài liệu](../README.md) · [Tham chiếu mô hình dữ liệu](../architecture/data-model.md)

## Toàn bộ schema

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string passwordHash
        datetime createdAt
        datetime updatedAt
    }
    RefreshToken {
        string id PK "= jti cua JWT"
        string userId FK
        string tokenHash UK "sha256"
        datetime expiresAt
        datetime revokedAt "null khi con hieu luc"
        datetime createdAt
    }
    Workspace {
        string id PK
        string name
        string ownerId FK
        datetime createdAt
        datetime updatedAt
    }
    WorkspaceMember {
        string id PK
        string workspaceId FK
        string userId FK
        enum role "OWNER|ADMIN|MEMBER"
        datetime createdAt
    }
    Meeting {
        string id PK
        string workspaceId FK
        string uploadedById FK
        string title
        string description "nullable"
        enum status "UPLOADED|PROCESSING|TRANSCRIBED|SUMMARIZED|FAILED"
        string storageKey
        string originalName
        string mimeType
        int fileSize
        int durationSec "nullable"
        datetime createdAt
        datetime updatedAt
    }
    Transcript {
        string id PK
        string meetingId FK,UK
        enum status "PENDING|PROCESSING|COMPLETED|FAILED"
        string language "nullable"
        string text "nullable"
        json segments "nullable"
        string error "nullable"
    }
    Summary {
        string id PK
        string meetingId FK,UK
        enum status "PENDING|PROCESSING|COMPLETED|FAILED"
        string content "nullable"
        string model "nullable"
        string error "nullable"
    }
    ActionItem {
        string id PK
        string meetingId FK
        string content
        string assigneeId FK "nullable"
        datetime dueDate "nullable"
        enum status "OPEN|IN_PROGRESS|DONE"
    }

    User ||--o{ RefreshToken : "phat hanh"
    User ||--o{ Workspace : "so huu"
    User ||--o{ WorkspaceMember : "thanh vien"
    User ||--o{ Meeting : "da upload"
    User |o--o{ ActionItem : "duoc giao"
    Workspace ||--o{ WorkspaceMember : "co"
    Workspace ||--o{ Meeting : "chua"
    Meeting ||--o| Transcript : "co mot"
    Meeting ||--o| Summary : "co mot"
    Meeting ||--o{ ActionItem : "co nhieu"
```

## Đường kiểm tra quyền

Mọi quyết định phân quyền đều lần ngược về một dòng `WorkspaceMember`:

```mermaid
flowchart BT
    AI["ActionItem"] --> M["Meeting"]
    T["Transcript"] --> M
    S["Summary"] --> M
    F["File đã lưu"] --> M
    M --> W["Workspace"]
    W --> WM["WorkspaceMember<br/>(workspaceId, userId) → role"]
    WM --> DECISION{"là thành viên?<br/>role cho phép hành động?"}
```

## Cascade khi xóa

```mermaid
flowchart TD
    U["Xóa User"] --> RT["RefreshToken ✗"]
    U --> WM1["WorkspaceMember ✗"]
    U --> WO["Workspace sở hữu ✗"]
    U --> AIN["ActionItem.assigneeId → NULL"]

    W["Xóa Workspace"] --> WM2["WorkspaceMember ✗"]
    W --> ME["Meeting ✗"]

    M["Xóa Meeting"] --> TR["Transcript ✗"]
    M --> SU["Summary ✗"]
    M --> AI2["ActionItem ✗"]
```

`✗` = dòng bị xóa. Lưu ý **không cascade nào đụng tới file đã lưu** — xóa một
workspace sẽ để lại mồ côi toàn bộ bản ghi đã upload bên trong. Chỉ route xóa
meeting mới xóa file, và cũng chỉ theo kiểu best-effort.

`Meeting.uploadedById` không có quy tắc cascade, nên xóa một user từng upload vào
workspace mà họ không sở hữu sẽ lỗi ràng buộc khóa ngoại.

## Ràng buộc unique và index

| Model | Unique | Có index |
| --- | --- | --- |
| `User` | `email` | — |
| `RefreshToken` | `tokenHash` | `userId` |
| `Workspace` | — | `ownerId` |
| `WorkspaceMember` | `(workspaceId, userId)` | `userId` |
| `Meeting` | — | `workspaceId` |
| `Transcript` | `meetingId` | — |
| `Summary` | `meetingId` | — |
| `ActionItem` | — | `meetingId`, `assigneeId` |
