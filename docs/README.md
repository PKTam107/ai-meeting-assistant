# Tài liệu

Tài liệu chi tiết của AI Meeting Assistant. Phần quick start và hướng dẫn sử dụng
nằm ở [README gốc](../README.md).

> **Mục tiêu:** họp ngay trong app, ghi lại, rồi ra transcript · summary · action
> item — hoặc upload một bản ghi làm ở đâu đó và nhận đúng chừng đó. **Cả hai nửa
> đều chưa được xây.** Cái đang có là mọi thứ bao quanh chúng: auth, workspace,
> upload + lưu trữ, worker bất đồng bộ, CI, và giao diện web đầy đủ.
>
> Kế hoạch đi tới đó: [Lộ trình](learning-roadmap.md). Giới hạn đã kiểm chứng của
> code hiện tại: [Hạn chế đã biết](known-gaps.md).
>
> Lưu ý ranh giới khi đọc: thư mục `architecture/` mô tả **cái đang có thật**,
> còn [Lộ trình](learning-roadmap.md) mô tả **cái định làm**.

## Kiến trúc

| Tài liệu | Nội dung |
| --- | --- |
| [Tổng quan](architecture/overview.md) | Hình dạng hệ thống, request pipeline, bảng route tập trung |
| [Mô hình dữ liệu](architecture/data-model.md) | Prisma schema, enum, quan hệ, cascade |
| [Xác thực](architecture/authentication.md) | Access/refresh token, xoay vòng, phát hiện tái sử dụng |
| [Phân quyền](architecture/authorization.md) | Kiểm tra membership và policy theo capability |
| [Lưu trữ file](architecture/storage.md) | `StorageService`, validate upload, chặn path traversal |
| [Hàng đợi và worker](architecture/queue-and-worker.md) | BullMQ, worker process, idempotency, retry, dead-letter |
| [Quy ước code](architecture/conventions.md) | Phân lớp module, cấu trúc feature folder, path alias |

## Tham chiếu API

| Tài liệu | Nội dung |
| --- | --- |
| [Quy ước chung](api/README.md) | Response envelope, dạng lỗi, header xác thực, mã trạng thái |
| [Auth](api/auth.md) | `register` · `login` · `refresh` · `logout` · `me` |
| [Workspaces](api/workspaces.md) | CRUD workspace và quản lý thành viên |
| [Meetings](api/meetings.md) | Upload, danh sách, chi tiết, sửa, xóa, tải file |
| [Transcript & Summary](api/transcripts-and-summaries.md) | Yêu cầu và đọc các artifact AI |
| [Action items](api/action-items.md) | CRUD công việc cần theo dõi |

## Vận hành

| Tài liệu | Nội dung |
| --- | --- |
| [Cấu hình](configuration.md) | Toàn bộ biến môi trường, giá trị mặc định, validate |
| [Phát triển](development.md) | Cài đặt local, scripts, quy trình Prisma, package manager |
| [Hạn chế đã biết](known-gaps.md) | Những giới hạn đã kiểm chứng của code hiện tại |
| [Lộ trình](learning-roadmap.md) | Kế hoạch phát triển: phòng họp trực tiếp, ghi hình, rồi AI pipeline |

## Sơ đồ

| Tài liệu | Nội dung |
| --- | --- |
| [Kiến trúc hệ thống](diagrams/system-architecture.md) | Sơ đồ thành phần và luồng request |
| [Quan hệ thực thể](diagrams/entity-relationship.md) | Sơ đồ ER và ghi chú quan hệ |
