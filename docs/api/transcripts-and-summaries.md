# API Transcript & Summary

[← Mục lục API](README.md)

> ⚠️ **Các endpoint này chỉ ghi nhận ý định.** Yêu cầu tạo transcript hay summary
> sẽ ghi một dòng `PENDING` và trả `202`. Worker process **có tồn tại**, nhưng
> chưa có loại job AI nào tiêu thụ những dòng đó, nên chúng không bao giờ đạt
> `COMPLETED` và `text` / `content` mãi là `null`. Xem
> [Hạn chế đã biết](../known-gaps.md).

Hai tài nguyên này hành xử y hệt nhau — cùng vòng đời, cùng máy trạng thái, cùng
dạng lỗi — nên được viết chung một trang.

**Mọi route đều yêu cầu** `Authorization: Bearer …` và phải là thành viên
workspace của meeting, được xác định qua `MeetingsService.loadAccessible`.

---

## Transcript

### `POST /api/meetings/:meetingId/transcript`

Yêu cầu, hoặc yêu cầu lại, việc tạo transcript. Không có body.

**`202 Accepted`**

```json
{
  "id": "aa10…",
  "meetingId": "d4b7…",
  "status": "PENDING",
  "language": null,
  "text": null,
  "segments": null,
  "error": null,
  "createdAt": "2026-08-06T06:30:05.000Z",
  "updatedAt": "2026-08-06T06:30:05.000Z"
}
```

Được cài đặt bằng một **upsert**, nên "chạy" và "chạy lại" dùng chung một nhánh
code:

| Trường hợp | Kết quả |
| --- | --- |
| Chưa có dòng nào | Tạo mới với `status: PENDING` |
| Đã có dòng | Đưa `status` về `PENDING`, xóa `text` và `error` |

Vì vậy gọi lại trên một transcript đã hoàn tất sẽ **hủy kết quả trước đó**. Không
có bước xác nhận và không lưu lịch sử.

### `GET /api/meetings/:meetingId/transcript`

**`200`** — dòng transcript.

| Mã | Thông báo |
| --- | --- |
| `404` | `Transcript has not been requested yet` |
| `404` | `Meeting not found` |
| `403` | `Not a member of this workspace` |

Web client coi lỗi `404` đầu tiên là "chưa có" chứ không phải lỗi, thông qua
`getOrNull` trong `src/lib/api.ts`.

---

## Summary

### `POST /api/meetings/:meetingId/summary`

**`202 Accepted`** — cùng cơ chế upsert, xóa `content` và `error`.

```json
{
  "id": "bb20…",
  "meetingId": "d4b7…",
  "status": "PENDING",
  "content": null,
  "model": null,
  "error": null,
  "createdAt": "2026-08-06T06:30:05.000Z",
  "updatedAt": "2026-08-06T06:30:05.000Z"
}
```

### `GET /api/meetings/:meetingId/summary`

**`200`** — dòng summary.

| Mã | Thông báo |
| --- | --- |
| `404` | `Summary has not been requested yet` |

---

## Các trường

| Trường | Transcript | Summary |
| --- | --- | --- |
| `status` | `ProcessingStatus` | `ProcessingStatus` |
| Kết quả | `text`, `segments` (JSON), `language` | `content`, `model` |
| `error` | Chi tiết lỗi, `null` nếu không có | như trên |

`ProcessingStatus` đi theo `PENDING` → `PROCESSING` → `COMPLETED` \| `FAILED`.
Hiện chỉ `PENDING` từng được ghi.

## Thiết kế dự kiến

Schema và service được định hình sẵn cho một worker bất đồng bộ, dự kiến sẽ:

1. Poll hoặc tiêu thụ các dòng `PENDING` (ý định nêu rõ là dùng hàng đợi BullMQ —
   xem comment `TODO(ai)` trong `TranscriptsService` và `SummariesService`).
2. Chuyển dòng đó sang `PROCESSING`.
3. Đọc file của meeting qua `StorageService`, chuyển giọng nói thành văn bản, rồi
   ghi `text` / `segments` / `language` kèm `status: COMPLETED`.
4. Với summary, đọc transcript đã hoàn tất rồi ghi `content` và `model` đã dùng.
5. Khi thất bại, ghi `error` kèm `status: FAILED`.

`apps/worker/` được dành sẵn cho việc này và hiện là thư mục rỗng. Không có gì
ràng buộc thứ tự transcript-trước-summary mà bước 4 ngụ ý — vẫn có thể yêu cầu
summary cho một meeting hoàn toàn chưa có transcript.
