# Mượn từ xa, gia hạn và xử phạt

## Cập nhật database

Database hiện có: chạy `database/migrations/20261113_renewal_requests.sql` trong đúng database ứng dụng trước khi khởi động backend. Script chạy lại được, không xóa dữ liệu. Database mới dùng `database/schema.sql` đã bao gồm bảng mới. Không chạy lại toàn bộ schema lên database đang sử dụng.

## API

Tất cả API bên dưới cần `Authorization: Bearer <token>`. Swagger: `/api/api-docs/`.

| API | Vai trò / tác dụng |
| --- | --- |
| `PATCH /api/borrow-requests/:id/approve` | Thủ thư/Admin duyệt PENDING, tự chọn và giữ bản sao còn trống |
| `PATCH /api/borrow-requests/:id/reject` | Thủ thư/Admin từ chối PENDING |
| `PATCH /api/borrow-requests/:id/fulfill` | Thủ thư/Admin bàn giao APPROVED, tạo phiếu mượn và cập nhật bản sao trong cùng transaction |
| `PATCH /api/borrow-requests/:id/status` | Tương thích API cũ; dùng cùng nghiệp vụ duyệt/bàn giao |
| `GET /api/renewal-requests` | Độc giả xem của mình; nhân viên xem toàn bộ; lọc `status`, `userCode` |
| `POST /api/renewal-requests` | `{ "borrowRecordId": 1, "note": "Cần thêm thời gian đọc" }` |
| `PATCH /api/renewal-requests/:id/approve` | Thủ thư/Admin duyệt, cộng 7 ngày, tăng số lần gia hạn |
| `PATCH /api/renewal-requests/:id/reject` | Thủ thư/Admin từ chối |
| `PATCH /api/renewal-requests/:id/cancel` | Độc giả hủy yêu cầu PENDING của mình; nhân viên cũng được hủy |
| `GET /api/fines` | Độc giả xem của mình; nhân viên xem toàn bộ; lọc `status`, `userCode` |
| `POST /api/fines` | Thủ thư/Admin lập bổ sung cho phiếu đã trả quá hạn chưa có phạt; body `{ "borrowRecordId": 1, "reason": "..." }` |
| `PATCH /api/fines/:id/pay` | Thủ thư/Admin xác nhận đã nhận tiền tại quầy |

Approve mượn không bắt buộc body. Có thể gửi `copyId`, `pickupDeadline` (YYYY-MM-DD) và `adminNote`. Nếu bỏ trống: tự chọn bản sao và hạn nhận sau 3 ngày. Reject/gia hạn nhận `adminNote` tùy chọn.

Sau duyệt, sách được giữ qua liên kết `borrow_requests.copy_id`: danh mục trả trạng thái hiển thị `RESERVED`, không tính vào số bản sao sẵn có, không thể checkout trực tiếp. Khi nhận sách, dùng **Bàn giao sách** trên yêu cầu đã duyệt. Hạn mượn tính từ ngày bàn giao: sinh viên 14 ngày, giảng viên 30 ngày. Nếu hết hạn nhận, thủ thư hủy giữ sách để giải phóng bản sao; không có tác vụ tự động hết hạn.

Gia hạn tối đa 1 lần, thêm 7 ngày từ hạn trả. Kiểm tra cả khi gửi và khi duyệt: đúng chủ phiếu, sách đang mượn/chưa quá hạn, chưa gia hạn, tài khoản hoạt động, không nợ phạt, không có sách quá hạn khác, không có độc giả khác đang chờ đầu sách đó. Một phiếu chỉ có một yêu cầu PENDING. Trả sách sẽ hủy yêu cầu gia hạn đang chờ. API cũ `POST /api/borrows/:id/renew` chỉ còn dành cho nhân viên; độc giả dùng renewal requests.

Phạt theo quy tắc có sẵn: 5.000đ/ngày, chốt tại ngày trả và tự tạo khi trả trễ. Một phiếu mượn có tối đa một khoản phạt. Thanh toán là ghi nhận tiền đã thu tại quầy, không phải cổng thanh toán trực tuyến. Chỉ mở lại thẻ khi không còn khoản phạt chưa thu và sách quá hạn theo hành vi sẵn có của hệ thống.

## Giao diện và kiểm tra

- Thủ thư: `/librarian/requests`, `/librarian/renewals`, `/librarian/fines`.
- Admin: `/admin/requests`, `/admin/renewals`, `/admin/fines`.
- Độc giả: `/my-books`; gửi gia hạn từ sách đang mượn, xem tab Yêu cầu gia hạn và Khoản phạt.
- Backend: `npm test`; frontend: `npm run build`.
- Kiểm thử tự động dùng repository/SQL doubles, không thay thế việc kiểm tra transaction trên SQL Server thực tế.
