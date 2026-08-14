# Lộ trình học

[← Mục lục tài liệu](README.md)

Đây là dự án để học, không phải sản phẩm. Nên hàm mục tiêu là **học được bao
nhiêu kỹ thuật trên mỗi giờ bỏ ra**, chứ không phải giá trị cho người dùng.
Toàn bộ thứ tự dưới đây được xếp theo tiêu chí đó.

## Nguyên tắc

**Sâu hơn rộng.** Repo hiện tại đã rộng và nông: 7 module, ~4.5k dòng, và 0 test,
0 job bất đồng bộ, 0 AI. Thêm một tính năng na ná những cái đã có thì gần như
không dạy thêm gì.

**Mọi việc đều có một phiên bản đáng học.** Không có tính năng nào "chỉ là CRUD"
một cách tất yếu — phân trang có thể là `skip/take` hoặc là keyset pagination,
tìm kiếm có thể là `ILIKE` hoặc là `tsvector` + GIN. Cùng một tính năng, khác
nhau hoàn toàn về thứ học được. Xem [Giai đoạn 5](#giai-đoạn-5--làm-cứng).

**Mỗi giai đoạn phải có test.** Không phải để đẹp, mà vì test là cách duy nhất
biết mình hiểu đúng cái vừa viết.

**Mỗi giai đoạn một PR riêng.** Giữ thói quen đã có, và để nhìn lại được đường đi.

**Ghi lại quyết định.** Thư mục `docs/` đang là thứ tốt nhất của repo này — mỗi
khi chọn giữa hai cách làm, ghi lại lý do.

---

## Giai đoạn 0 — Lưới an toàn

> Mọi thứ sau đây đều dựa trên giai đoạn này. Đừng bỏ qua.

- [x] Node 22 có hiệu lực (`.nvmrc`, `~/.profile`)
- [x] Redis chạy và tự khởi động
- [x] PostgreSQL — chạy `sudo ./scripts/setup-dev-db.sh`
- [x] Xoá `apps/api/test/app.e2e-spec.ts` — nó kiểm tra `GET /` trả `Hello World!`,
      một route không tồn tại, nên đang luôn fail
- [x] **Unit test đầu tiên: `AuthService.refresh`** — mock repository, chứng minh
      `revokeIfActive` trả `false` thì gọi `revokeAllForUser` và ném 401
- [x] **Integration test: race thật** — hai lời gọi `refresh` song song với cùng
      một token trên Postgres thật, chứng minh đúng một cái thắng
- [x] GitHub Actions: lint + typecheck + test, dùng service container cho
      Postgres (Redis thêm ở GĐ 1, khi đã có thứ thật sự dùng tới nó)

**Kỹ thuật học được:** Jest, `Test.createTestingModule` của Nest và cách mock
dependency injection, test tích hợp với DB thật, GitHub Actions service
container, phân biệt unit test và integration test *bằng việc thấy rõ cái nào bắt
được lỗi gì*.

**Dấu hiệu hoàn thành:** revert commit `244bece` (bản vá race condition) thì
integration test **phải fail**. Nếu nó vẫn xanh, test của bạn chưa kiểm tra thứ
bạn tưởng.

Bản đầu tiên của test **vẫn xanh** khi revert — đúng cái bẫy mà dòng trên cảnh
báo. Bắn hai request rồi mong chúng đụng nhau là không đủ: cửa sổ giữa lúc đọc
row và lúc ghi chỉ vài mili-giây, còn request thứ hai thì thường tới sau khi
request đầu đã xong, nên bản có bug vẫn cho đúng một 200 và một 401. Test hiện
tại chặn cả hai caller ngay sau bước đọc bằng một barrier, rồi mới thả cả hai
cùng lúc vào bước ghi — revert `244bece` thì nó fail với **hai** response 200,
đúng triệu chứng session bị fork.

---

## Giai đoạn 1 — Worker bất đồng bộ (chưa đụng AI)

> Tách cái khó "hạ tầng async" ra khỏi cái khó "AI". Làm riêng từng cái dễ hơn
> nhiều so với debug cả hai cùng lúc.

**Đã xong.** BullMQ, ioredis và `@nestjs/bullmq` — ba package cài sẵn từ đầu mà
chưa từng được import — giờ đã chạy thật.

- [x] Dựng worker thành một Nest standalone application — nằm ở
      `apps/api/src/worker/`, không phải `apps/worker/`: tách thành package riêng
      cần trước một package dùng chung cho Prisma client và config, mà monorepo
      hiện tại chưa gánh nổi. Vẫn là **process riêng**, chạy bằng
      `pnpm start:worker`
- [x] Queue `media-metadata`; producer đặt job trong `MeetingsService.create`
- [x] Consumer chạy `ffprobe` → ghi `durationSec`, đẩy `Meeting.status`
      `UPLOADED → PROCESSING → READY`
- [x] Retry với exponential backoff, và dead-letter queue cho job chết hẳn
- [x] **Idempotency**: chạy lại cùng một job hai lần không được làm hỏng dữ liệu
- [x] Graceful shutdown: worker đang chạy job mà bị kill thì job phải quay lại queue
- [x] Test consumer

**Kỹ thuật học được:** mô hình producer/consumer, at-least-once delivery và vì
sao nó buộc bạn phải idempotent, exponential backoff, dead-letter queue, graceful
shutdown, chạy nhiều process cùng lúc và cách chúng chia việc.

**Vì sao job không-AI trước:** khi job AI vào ở giai đoạn 3, hạ tầng queue đã
chạy thật và đã được kiểm chứng. Lúc đó lỗi phát sinh chắc chắn là lỗi AI, không
phải lỗi queue. `Meeting.status` với 5 giá trị hiện chỉ dùng đúng một cũng sống
lại trong bước này.

**Đã học được gì thêm khi làm:** chỗ khó nhất không phải producer/consumer mà là
trạng thái *giữa chừng*. Claim bằng UPDATE có điều kiện chặn được hai worker cùng
làm một meeting, nhưng lại tạo ra một hố mới: worker chết giữa lúc probe thì
meeting nằm lại ở `PROCESSING` và không lần thử nào claim được nữa. Nên claim
phải phân biệt "lần đầu" với "chính tôi thử lại" — chi tiết trong
[Hàng đợi và worker](architecture/queue-and-worker.md).

---

## Giai đoạn 2 — Realtime

`socket.io` và `@nestjs/websockets` cũng đã cài sẵn và chưa dùng.

- [ ] WebSocket gateway, xác thực bằng JWT trong handshake
- [ ] Room theo `meetingId`, chỉ thành viên workspace được vào
- [ ] Worker phát tiến độ job → gateway → UI
- [ ] Web nhận event rồi invalidate cache TanStack Query

**Kỹ thuật học được:** xác thực WebSocket (khó hơn HTTP vì không có sẵn header
tiện như `Authorization`), room và namespace, reconnect, đồng bộ cache phía client
từ sự kiện server đẩy xuống.

**Bài toán thật sẽ gặp:** access token của bạn nằm trong RAM và tự xoay vòng
(xem [authentication.md](architecture/authentication.md)). Một kết nối WebSocket
sống hàng giờ thì token sẽ hết hạn giữa chừng — xử lý thế nào? Đây là câu hỏi
hay, và không có đáp án sẵn để copy.

---

## Giai đoạn 3 — AI pipeline ← trọng tâm

> Đây là lý do dự án tồn tại, và là khối kiến thức dày nhất trong cả lộ trình.

Toàn bộ máy trạng thái đã được thiết kế sẵn và đang chờ: `ProcessingStatus`
(`PENDING → PROCESSING → COMPLETED / FAILED`), các cột `text`, `segments`,
`content`, `model`, `error`, endpoint request, và cả UI cho từng trạng thái. Bạn
chỉ cần viết phần *tiêu thụ*.

- [ ] **Transcription**: audio dài vượt giới hạn API → dùng `ffmpeg` chia đoạn →
      gọi API từng đoạn → ghép lại, ghi vào cột `segments` (kiểu `Json`)
- [ ] **Summarization**: transcript dài vượt context window → map-reduce
      (tóm tắt từng phần, rồi tóm tắt các bản tóm tắt)
- [ ] **Extraction**: trích action item có cấu trúc bằng structured output /
      JSON schema, ghi thẳng vào bảng `ActionItem`
- [ ] Phân biệt lỗi **tạm thời** (rate limit, timeout → retry) và lỗi **vĩnh viễn**
      (file hỏng, quá dài → fail luôn, ghi vào cột `error`)
- [ ] Theo dõi chi phí: log số token và thời lượng audio mỗi job
- [ ] Eval tối thiểu: vài file mẫu cố định, kiểm tra output đúng định dạng và
      không rỗng

**Kỹ thuật học được:** chunking dữ liệu vượt giới hạn, map-reduce trên context
window, structured output, phân loại lỗi để retry cho đúng, kiểm soát chi phí, và
khó nhất — **đánh giá chất lượng của một output không xác định**. Đây là nhóm kỹ
năng khác hẳn mọi thứ trong CRUD.

---

## Giai đoạn 4 — Chọn **một** hướng đi sâu

Chọn một, không làm cả bốn.

| | Hướng | Học được gì |
| --- | --- | --- |
| **a** | **WebRTC P2P tự viết** | Signaling (dùng lại gateway ở GĐ2), SDP offer/answer, ICE, STUN. **Tự viết, đừng dùng SFU quản lý sẵn** — dùng dịch vụ thì bạn học cách gọi SDK, không phải học WebRTC. Giới hạn 2-3 người là *đúng*: khi chạm trần đó bạn sẽ tự hiểu vì sao SFU tồn tại. |
| **b** | **RAG — "chat với cuộc họp"** | `pgvector`, embedding, chiến lược chia chunk, retrieval, vì sao câu trả lời sai khi chunk sai. |
| **c** | **Transcription realtime khi đang họp** | Cần làm (a) trước. Xử lý luồng audio, streaming API. |
| **d** | **Observability** | OpenTelemetry, trace một job đi xuyên qua HTTP → queue → worker. `pino` đã cài sẵn chưa dùng. |

Gợi ý: **(b)** nếu muốn đi sâu tiếp về AI, **(a)** nếu muốn tự tay làm phòng họp.

---

## Giai đoạn 5 — Làm cứng

Những việc "sản phẩm" thường bị gạt khỏi một dự án học với lý do "chỉ là CRUD".
Lý do đó **sai**, vì gần như mục nào cũng có hai phiên bản: một phiên bản làm cho
xong không dạy gì, và một phiên bản đáng học thật sự. Chọn cột bên phải.

| Việc | Phiên bản "cho xong" | Phiên bản đáng học | Học được gì |
| --- | --- | --- | --- |
| Phân trang | `skip` / `take` | **Keyset / cursor pagination** | Sort ổn định, xử lý dòng bị chèn hoặc xoá giữa lúc đang duyệt — chỗ rất nhiều người làm sai |
| Tìm kiếm | `ILIKE '%x%'` | **`tsvector` + GIN index** | Full-text search của Postgres, đánh chỉ mục, ranking. Bước đệm sang vector search ở GĐ 4b |
| Rate limit | `@nestjs/throttler` mặc định | **Sliding window tự viết bằng Redis + Lua** | Thao tác nguyên tử, bộ đếm phân tán. Sau GĐ 1 đã có sẵn Redis |
| Storage S3 | Đổi backend | **Presigned URL** | Đây chính là cơ chế bắt buộc để phát lại được bản ghi trong trình duyệt |
| Zoom / Calendar | Gọi API | **OAuth 2.0 phía client + xác thực chữ ký webhook** | Tự implement OAuth với vai trò bên tích hợp; chống giả mạo webhook |
| Mời qua email | Gửi mail | **Token mời có hạn, chống replay** | Họ hàng gần với refresh token rotation đã làm ở phần auth |

### Làm ngay vì quá rẻ

`helmet` · `compression` · `pino` (cả ba đã cài sẵn, chưa nối vào `main.ts`) ·
CORS allowlist.

Tổng cộng khoảng 10 phút. Giá trị học gần bằng không, nhưng nếu dự án này còn
được đem cho ai xem thì thiếu chúng là thứ người review nhìn ra trong 30 giây.

### Giá trị học thấp thật

Màn hình "Việc của tôi" · comment & `@mention`. Đây là CRUD thuần. Làm nếu bạn
muốn dùng sản phẩm thật, đừng làm vì nghĩ sẽ học được gì.

### Vì sao để ở giai đoạn 5, không phải giai đoạn 1

Không phải vì chúng kém quan trọng, mà vì **làm sau thì làm được phiên bản tốt
hơn**:

- Rate limit bằng Redis cần Redis đã chạy thật → sau GĐ 1
- Full-text search chỉ có ý nghĩa khi đã có transcript để tìm → sau GĐ 3
- Presigned URL đi liền với việc phát lại bản ghi → sau khi có storage thật
- Phân trang chỉ lộ ra vấn đề khi pipeline đã sinh đủ dữ liệu

Làm sớm quá thì bạn viết phiên bản "cho xong" và không học được gì — đúng thứ
đang cần tránh.

Danh sách đầy đủ các giới hạn đã kiểm chứng nằm ở [known-gaps.md](known-gaps.md).
