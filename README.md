# Library Borrowing Management System (LBMS)

Hệ thống Quản lý Mượn/Trả Sách Thư viện (Library Borrowing Management System - LBMS) dành cho trường đại học/tổ chức giáo dục. Dự án được thiết kế theo cấu trúc Monorepo gồm **Frontend (React)** và **Backend (Node.js & Express)**, sử dụng **Microsoft SQL Server (MSSQL)** làm hệ quản trị cơ sở dữ liệu và được đóng gói toàn diện bằng **Docker Compose**.

---

## 📑 Mục lục
- [Kiến trúc & Công nghệ](#kiến-trúc--công-nghệ)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Khởi chạy nhanh với Docker (Khuyên dùng)](#khởi-chạy-nhanh-với-docker-khuyên-dùng)
- [Tài khoản kiểm thử mặc định](#tài-khoản-kiểm-thử-mặc-định)
- [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường)
- [Chạy thủ công cho môi trường phát triển (Local Development)](#chạy-thủ-công-cho-môi-trường-phát-triển-local-development)
- [Các lệnh Docker hữu ích](#các-lệnh-docker-hữu-ích)

---

## 🛠 Kiến trúc & Công nghệ

- **Frontend (`/frontend`)**:
  - **Framework**: React 19, React Router v7
  - **Bundler**: Webpack 5, Babel
  - **Web Server trong Docker**: Nginx Alpine (hỗ trợ Single Page Application routing và Reverse Proxy API)
  - **Cổng mặc định**: `http://localhost:8080`

- **Backend (`/backend`)**:
  - **Runtime**: Node.js v22 (Express.js)
  - **Database Driver**: `mssql` (kết nối Microsoft SQL Server)
  - **Xác thực & Bảo mật**: JWT (JSON Web Token), bcryptjs
  - **Uploads**: Multer (lưu ảnh bìa sách)
  - **Cổng mặc định**: `http://localhost:5000`

- **Database**:
  - **Hệ quản trị**: Microsoft SQL Server 2022
  - **Dịch vụ khởi tạo**: Tự động tạo cơ sở dữ liệu `LBMS_DB` và nạp schema, trigger, dữ liệu mẫu từ `backend/database/schema.sql` (UTF-8) khi khởi động container.
  - **Cổng ánh xạ ra máy chủ (Host Port)**: `localhost:14330`

---

## 📁 Cấu trúc thư mục

```text
.
├── backend/                  # Mã nguồn Backend API
│   ├── database/             # File schema và dữ liệu mẫu (schema.sql, schema.dbml)
│   ├── src/                  # Controllers, Services, Repositories, Routes, Middlewares
│   ├── uploads/              # Thư mục lưu trữ ảnh bìa sách
│   ├── .env.example          # Mẫu biến môi trường cho Backend
│   ├── Dockerfile            # Dockerfile cho Backend
│   └── package.json          # Quản lý dependencies của Backend
├── frontend/                 # Mã nguồn Frontend (React)
│   ├── public/               # File HTML và tài nguyên tĩnh
│   ├── src/                  # Components, Pages, Context, Services, Layouts
│   ├── Dockerfile            # Dockerfile multi-stage (Node.js build -> Nginx serve)
│   ├── nginx.conf            # Cấu hình Nginx phục vụ SPA & reverse proxy
│   ├── webpack.config.js     # Cấu hình Webpack
│   └── package.json          # Quản lý dependencies của Frontend
├── docker-compose.yml        # Điều phối toàn bộ các dịch vụ (db, db-init, backend, frontend)
├── .dockerignore             # Bỏ qua các file rác khi build Docker
├── .gitignore                # Bỏ qua dependencies, logs, biến môi trường
└── README.md                 # Tài liệu hướng dẫn sử dụng hệ thống
```

---

## 🚀 Khởi chạy nhanh với Docker (Khuyên dùng)

### 1. Yêu cầu tiên quyết
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) và Docker Compose.

### 2. Khởi chạy toàn bộ hệ thống
Tại thư mục gốc của dự án, mở terminal và chạy lệnh:

```bash
docker compose up --build -d
```

Quá trình này sẽ tự động:
1. Kéo image **MSSQL Server 2022** và khởi chạy database container.
2. Kiểm tra sức khỏe (`healthcheck`) của database. Khi database sẵn sàng, dịch vụ `db-init` sẽ tự động tạo cơ sở dữ liệu `LBMS_DB` và nạp toàn bộ cấu trúc bảng, dữ liệu mẫu từ `backend/database/schema.sql`.
3. Build và khởi động dịch vụ **Backend API** (port `5000`).
4. Build bundle React và chạy **Frontend Nginx** (port `8080`).

### 3. Truy cập các dịch vụ

| Dịch vụ | URL / Địa chỉ | Ghi chú |
| :--- | :--- | :--- |
| **Giao diện Web (Frontend)** | `http://localhost:8080` | Trang chủ thư viện, tra cứu sách, mượn/trả, quản lý |
| **Backend API** | `http://localhost:5000/api` | Điểm truy cập gốc của REST API |
| **Kiểm tra trạng thái API** | `http://localhost:5000/api/health` | Kiểm tra tình trạng backend |
| **Kiểm tra kết nối Database** | `http://localhost:5000/api/health/db` | Kiểm tra trạng thái kết nối tới SQL Server |
| **SQL Server Database** | `localhost:14330` | User: `sa`, Mật khẩu: `YourStrong@Password123`, DB: `LBMS_DB` |

---

## 👥 Tài khoản kiểm thử mặc định

Cơ sở dữ liệu mẫu đã được nạp sẵn các tài khoản thử nghiệm cho các vai trò khác nhau (mật khẩu mặc định có thể dùng `123456`, `admin`, hoặc `hashed_pw`):

| Vai trò | Tên đăng nhập (`username`) | Mã người dùng (`userCode`) | Mật khẩu mẫu | Họ và tên |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin` | `ADMIN01` | `123456` | Quản Trị Hệ Thống |
| **Thủ thư (LIBRARIAN)** | `thuthu` | `TT001` | `123456` | Nguyễn Thị Thủ Thư |
| **Giảng viên (LECTURER)** | `giangvien` | `GV001` | `123456` | Trần Văn Giảng Viên |
| **Sinh viên (STUDENT)** | `sinhvien1` | `SV001` | `123456` | Nguyễn Văn A |

---

## ⚙️ Cấu hình biến môi trường

Nếu cần thay đổi cấu hình kết nối, bạn có thể tạo file `.env` trong thư mục `backend/` dựa trên mẫu `backend/.env.example`:

```ini
NODE_ENV=development
PORT=5000

# Địa chỉ Frontend được phép gọi API (CORS)
CLIENT_URL=http://localhost:8080

# Cấu hình kết nối SQL Server
DB_USER=sa
DB_PASSWORD=YourStrong@Password123
DB_SERVER=localhost
DB_PORT=14330
DB_NAME=LBMS_DB
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

> **Lưu ý khi chạy qua Docker**: Docker Compose đã cấu hình sẵn các biến môi trường này thông qua mạng nội bộ Docker (`DB_SERVER=db`, `DB_PORT=1433`), bạn không cần tạo file `.env` thủ công khi chạy với Docker.

---

## 💻 Chạy thủ công cho môi trường phát triển (Local Development)

Nếu bạn muốn chạy từng dịch vụ trực tiếp trên máy không dùng Docker cho Frontend/Backend:

### 1. Cơ sở dữ liệu
Khởi chạy SQL Server (hoặc tận dụng container db từ Docker):
```bash
docker compose up -d db db-init
```

### 2. Chạy Backend
```bash
cd backend
npm install
npm run dev      # Sử dụng nodemon (hoặc: node src/server.js)
```
Backend sẽ lắng nghe tại `http://localhost:5000`.

### 3. Chạy Frontend
```bash
cd frontend
npm install
npm run client   # Khởi chạy Webpack Dev Server với Hot-Reloading
```
Frontend sẽ mở tại `http://localhost:8080`.

---

## 🐳 Các lệnh Docker hữu ích

- **Xem log toàn bộ hệ thống theo thời gian thực:**
  ```bash
  docker compose logs -f
  ```

- **Xem log riêng từng dịch vụ (ví dụ: backend hoặc frontend):**
  ```bash
  docker compose logs -f backend
  docker compose logs -f frontend
  ```

- **Dừng toàn bộ hệ thống:**
  ```bash
  docker compose down
  ```

- **Dừng và xoá dữ liệu database (reset cơ sở dữ liệu về ban đầu):**
  ```bash
  docker compose down -v
  ```

- **Rebuild lại image khi có thay đổi trong mã nguồn:**
  ```bash
  docker compose up --build -d
  ```
