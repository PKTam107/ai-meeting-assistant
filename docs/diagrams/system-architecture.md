# Sơ đồ kiến trúc hệ thống

[← Mục lục tài liệu](../README.md) · [Tổng quan kiến trúc](../architecture/overview.md)

Tất cả sơ đồ đều viết bằng Mermaid và render trực tiếp trên GitHub.

## Thành phần

```mermaid
flowchart LR
    subgraph Browser["Trình duyệt"]
        WEB["apps/web<br/>Next.js 16 · React 19<br/>TanStack Query · Zustand"]
    end

    subgraph Server["Máy chủ API"]
        API["apps/api<br/>NestJS 11"]
        STORE[("Đĩa cục bộ<br/>STORAGE_LOCAL_DIR")]
    end

    DB[("PostgreSQL 16")]

    WEB -->|"Bearer access token"| API
    WEB -.->|"cookie httpOnly<br/>path /api/auth"| API
    API -->|"Prisma 7 · adapter-pg"| DB
    API -->|"bytes audio/video"| STORE

    WORKER["worker process<br/>apps/api/src/worker"]
    QUEUE[("Redis · BullMQ<br/>queue media-metadata")]
    FF["ffprobe"]
    API -->|"enqueue {meetingId}"| QUEUE
    QUEUE -->|job| WORKER
    WORKER -->|"durationSec · status"| DB
    WORKER -->|"đọc file"| STORE
    WORKER --> FF

    WS["WebSocket gateway<br/>(chưa dựng)"]
    AI["Job AI: transcribe · summarize<br/>(chưa dựng)"]
    QUEUE -.->|dự kiến| AI
    WORKER -.->|dự kiến| WS
    WS -.->|dự kiến| WEB

    style WS stroke-dasharray: 5 5
    style AI stroke-dasharray: 5 5
```

Các thành phần nét đứt chưa tồn tại — xem [Hạn chế đã biết](../known-gaps.md) và
[Hàng đợi và worker](../architecture/queue-and-worker.md).

## Request pipeline

```mermaid
flowchart TD
    REQ([HTTP request]) --> PREFIX["Prefix global /api"]
    PREFIX --> COOKIE["cookie-parser"]
    COOKIE --> GUARD["JwtAuthGuard<br/>theo từng controller"]
    GUARD --> VALID["ValidationPipe<br/>whitelist · forbidNonWhitelisted · transform"]
    VALID --> CTRL["Controller"]
    CTRL --> SVC["Service<br/>nghiệp vụ + phân quyền"]
    SVC --> REPO["Repository<br/>Prisma"]
    REPO --> DB[(PostgreSQL)]
    SVC --> OK{Có throw?}
    OK -->|không| INT["TransformInterceptor<br/>{ success, data }"]
    OK -->|có| FILTER["AllExceptionsFilter<br/>{ success: false, statusCode, … }"]
    INT --> RES([Response])
    FILTER --> RES
```

## Phụ thuộc giữa các module

```mermaid
flowchart TD
    AUTH[AuthModule] --> USERS[UsersModule]
    WS[WorkspacesModule] --> USERS
    MEET[MeetingsModule] --> WS
    MEET --> STORAGE[StorageModule]
    WSMEET[WorkspaceMeetingsModule] --> MEET
    TRANS[TranscriptsModule] --> MEET
    SUM[SummariesModule] --> MEET
    AI[ActionItemsModule] --> MEET
    AI --> WS
    MAI[MeetingActionItemsModule] --> AI

    PRISMA["PrismaModule (@Global)"]
```

Chiều mũi tên chính là mô hình phân quyền: mọi thứ nằm dưới một meeting đều đi
tới `MeetingsService.loadAccessible`, hàm này tra ra workspace rồi ủy quyền cho
`WorkspacesService.assertMember`.

## Trình tự xác thực

```mermaid
sequenceDiagram
    autonumber
    participant U as Trình duyệt
    participant W as Next.js app
    participant A as NestJS API
    participant D as PostgreSQL

    U->>W: gửi form đăng nhập
    W->>A: POST /api/auth/login
    A->>D: tìm user, so sánh hash bcrypt
    A->>D: chèn RefreshToken (id = jti, hash sha256)
    A-->>W: { user, accessToken } + Set-Cookie refreshToken
    W->>W: giữ accessToken trong bộ nhớ

    Note over W,A: sau đó — access token hết hạn
    W->>A: GET /api/workspaces (Bearer …)
    A-->>W: 401
    W->>A: POST /api/auth/refresh (cookie)
    A->>D: tra jti, xác minh hash, thu hồi dòng cũ
    A->>D: chèn RefreshToken mới
    A-->>W: { user, accessToken } + cookie mới
    W->>A: thử lại GET /api/workspaces
    A-->>W: 200
```

## Vòng đời meeting (thực tế so với dự kiến)

```mermaid
stateDiagram-v2
    [*] --> UPLOADED: POST /workspaces/:id/meetings
    UPLOADED --> UPLOADED: hiện nằm mãi ở đây

    state "Không bao giờ tới" as unreachable {
        PROCESSING --> TRANSCRIBED
        TRANSCRIBED --> SUMMARIZED
        PROCESSING --> FAILED
    }
```

Transcript và summary có máy trạng thái riêng, hiện chỉ dừng ở `PENDING`:

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST .../transcript
    PENDING --> PENDING: chạy lại sẽ reset và xóa kết quả
    PENDING --> PROCESSING: dự kiến (worker)
    PROCESSING --> COMPLETED: dự kiến
    PROCESSING --> FAILED: dự kiến
```

## Cấu trúc route phía web

```mermaid
flowchart TD
    ROOT["/"] -->|"chưa đăng nhập"| LOGIN["/login"]
    ROOT -->|"đã đăng nhập"| DASH["/dashboard"]
    LOGIN --> REG["/register"]
    DASH --> WSD["/workspaces/[id]"]
    WSD --> MD["/meetings/[id]"]

    subgraph guarded["layout (app) — chuyển hướng về /login"]
        DASH
        WSD
        MD
    end
```
