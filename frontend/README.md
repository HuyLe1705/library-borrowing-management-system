### Yêu cầu chung
- Node.js v18+ và npm
- SQL Server Express (hoặc Developer) + SQL Server Management Studio (SSMS)
- Đã bật `Mixed Mode` cho SQL Server để dùng được tài khoản `sa`

### Chuẩn bị database `LibraryDB`
1. Mở **SQL Server Configuration Manager** → `SQL Server Network Configuration` → `Protocols for MSSQLSERVER` → bật `TCP/IP`.
2. Ở tab `IP Addresses`, phần `IPAll`, nhập `TCP Port = 63218`, `TCP Dynamic Ports` để trống → Apply → restart service `SQL Server (MSSQLSERVER)`.
3. Mở **SSMS**, đăng nhập bằng tài khoản `sa` (mật khẩu mặc định trong `server.js` là `123456`, thay đổi nếu bạn đã chỉnh sửa).
4. File script: `Database/CRUD.sql`. Mở file này trong SSMS và chạy toàn bộ để tạo schema, dữ liệu mẫu, trigger.
5. Kiểm tra lại database `LibraryDB` đã có dữ liệu (ví dụ bảng `BibliographicRecord`, `Loan`, `Fine`, ...).

> Nếu bạn đổi tài khoản, mật khẩu, port hoặc tên instance, nhớ sửa lại cấu hình trong `server.js`.

### Cài đặt dependencies
```bash
npm install
```

### Chạy API server (Express + mssql)
```bash
npx nodemon server.js        # hoặc: node server.js
```
- Server mặc định chạy ở `http://localhost:5000`.
- Kiểm tra log `✅ Đã kết nối thành công tới SQL Server!`. Nếu lỗi, xem lại bước cấu hình DB.

### Chạy frontend (Webpack dev server)
```bash
npm run start
```
- Web mặc định mở tại `http://localhost:8080` (tự động bật trình duyệt).
- Frontend gọi API tới server ở port 5000, nên đảm bảo backend đang chạy trước khi thử các tính năng.

### Build bundle production
```bash
npm run build
```
- Kết quả nằm trong thư mục `build/` với `index.html` và `bundle.js`.




1. Trang chủ — Homepage
Cần có
- Giới thiệu hệ thống thư viện.
- Hiển thị sách nổi bật, sách mới hoặc sách phổ biến.
- Thanh tìm kiếm sách nhanh.
- Lối tắt đến tra cứu sách, giỏ mượn và thông tin tài khoản.

2. Tra cứu và tìm kiếm sách — Book Catalog
Cần có
- Tìm kiếm theo tên sách, tác giả, ISBN.
- Lọc theo thể loại, năm xuất bản và tình trạng sách.
- Xem thông tin chi tiết của sách.
- Hiển thị số lượng bản còn có thể mượn.
- Phân trang kết quả tìm kiếm.

3. Quản lý sách — Book Management
Cần có
- Hiển thị danh sách sách trong thư viện.
- Thêm, sửa, xóa sách.
- Quản lý thông tin sách và số lượng bản sao.
- Tìm kiếm, lọc và xem tình trạng từng cuốn sách.
- Xác nhận trước khi xóa và thông báo kết quả thao tác.
Quyền sử dụng: nhân viên thư viện hoặc quản trị viên.

4. Đăng ký mượn sách — Borrowing Cart
Cần có
- Thêm sách muốn mượn vào giỏ.
- Xem và xóa sách khỏi giỏ.
- Chọn hoặc xác nhận các sách muốn mượn.
- Gửi yêu cầu mượn sách.
- Hiển thị kết quả gửi yêu cầu và lý do từ chối nếu có.
Lưu ý: giỏ mượn chỉ là bước chuẩn bị yêu cầu, không đồng nghĩa sách đã được mượn thành công.

5. Quầy mượn và trả sách — Circulation Desk
Cần có
- Tra cứu phiếu mượn theo mã phiếu hoặc sinh viên.
- Xác nhận yêu cầu mượn.
- Ghi nhận việc giao sách cho người mượn.
- Tiếp nhận sách trả và cập nhật tình trạng.
- Hiển thị hạn trả, ngày trả thực tế và tình trạng quá hạn.
- Ghi nhận sách hư hỏng hoặc mất nếu nằm trong phạm vi đề tài.
Đây là module nghiệp vụ quan trọng nhất phía nhân viên thư viện.

6. Theo dõi mượn trả — My Borrowings
Cần có
- Xem sách đang mượn.
- Xem hạn trả và trạng thái từng phiếu mượn.
- Xem lịch sử mượn và trả.
- Nhận diện sách sắp đến hạn hoặc quá hạn.
- Xem trạng thái yêu cầu mượn đang chờ xử lý.
Phần này hiện chưa có trong danh sách route hiện tại của bạn, nên nên bổ sung.

7. Đăng nhập và tài khoản — Authentication
Cần có
- Đăng nhập.
- Đăng xuất.
- Hiển thị thông tin người dùng.
- Phân quyền giao diện theo vai trò.
- Bảo vệ các trang nghiệp vụ không dành cho khách hoặc sinh viên.
Có thể bổ sung đăng ký tài khoản, đổi mật khẩu nếu yêu cầu môn học quy định.

8. Dashboard quản lý — Staff Dashboard
Nên có
- Tổng số đầu sách và số bản sách.
- Số phiếu mượn đang hoạt động.
- Số sách quá hạn.
- Các yêu cầu mượn đang chờ xử lý.
- Thống kê hoạt động mượn trả cơ bản.
Đây là phần tăng chất lượng giao diện, nhưng có thể để sau khi hoàn thành nghiệp vụ cốt lõi.