
IF OBJECT_ID('dbo.fines', 'U') IS NOT NULL DROP TABLE dbo.fines;
IF OBJECT_ID('dbo.borrow_records', 'U') IS NOT NULL DROP TABLE dbo.borrow_records;
IF OBJECT_ID('dbo.book_copies', 'U') IS NOT NULL DROP TABLE dbo.book_copies;
IF OBJECT_ID('dbo.books', 'U') IS NOT NULL DROP TABLE dbo.books;
IF OBJECT_ID('dbo.categories', 'U') IS NOT NULL DROP TABLE dbo.categories;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

-- 1. BẢNG USERS (Quản lý Sinh viên, Giảng viên, Thủ thư, Admin)
CREATE TABLE dbo.users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_code VARCHAR(20) NOT NULL UNIQUE, -- MSSV / Mã GV / Mã Thủ thư
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'LECTURER', 'LIBRARIAN', 'ADMIN')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED')),
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 2. BẢNG CATEGORIES (Danh mục thể loại sách)
CREATE TABLE dbo.categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL
);

-- 3. BẢNG BOOKS (Thông tin đầu sách / Bản ghi thư mục)
CREATE TABLE dbo.books (
    id INT IDENTITY(1,1) PRIMARY KEY,
    isbn VARCHAR(20) NULL UNIQUE,
    title NVARCHAR(255) NOT NULL,
    author NVARCHAR(200) NOT NULL DEFAULT N'Chưa rõ',
    category_id INT NULL REFERENCES dbo.categories(id) ON DELETE SET NULL,
    publisher NVARCHAR(150) NULL,
    publish_year INT NULL CHECK (publish_year >= 1900 AND publish_year <= YEAR(SYSDATETIME()) + 1),
    language NVARCHAR(50) NULL DEFAULT N'Tiếng Việt',
    description NVARCHAR(MAX) NULL,
    cover_url NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 4. BẢNG BOOK_COPIES (Bản sao sách vật lý gắn Barcode & Vị trí kệ)
CREATE TABLE dbo.book_copies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    book_id INT NOT NULL REFERENCES dbo.books(id) ON DELETE CASCADE,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    shelf_location NVARCHAR(100) NOT NULL DEFAULT N'Kệ Tổng hợp',
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'BORROWED', 'LOST', 'MAINTENANCE')),
    entry_date DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE)
);

-- 5. BẢNG BORROW_RECORDS (Giao dịch Mượn / Trả / Gia hạn)
CREATE TABLE dbo.borrow_records (
    id INT IDENTITY(1,1) PRIMARY KEY,
    copy_id INT NOT NULL REFERENCES dbo.book_copies(id),
    borrower_id INT NOT NULL REFERENCES dbo.users(id),
    librarian_id INT NOT NULL REFERENCES dbo.users(id),
    borrow_date DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    due_date DATE NOT NULL,
    return_date DATE NULL,
    renewal_count INT NOT NULL DEFAULT 0 CHECK (renewal_count >= 0 AND renewal_count <= 1),
    status VARCHAR(20) NOT NULL DEFAULT 'BORROWED'
        CHECK (status IN ('BORROWED', 'RETURNED', 'OVERDUE')),
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT chk_borrow_dates CHECK (due_date >= borrow_date AND (return_date IS NULL OR return_date >= borrow_date))
);

-- 6. BẢNG FINES (Ghi nhận tiền phạt quá hạn)
CREATE TABLE dbo.fines (
    id INT IDENTITY(1,1) PRIMARY KEY,
    borrow_record_id INT NOT NULL UNIQUE REFERENCES dbo.borrow_records(id) ON DELETE CASCADE,
    librarian_id INT NOT NULL REFERENCES dbo.users(id),
    overdue_days INT NOT NULL CHECK (overdue_days > 0),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason NVARCHAR(255) NOT NULL DEFAULT N'Trả sách quá hạn',
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID')),
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    paid_at DATETIME2 NULL
);
GO

-- Chống lỗi Concurrency (Rủi ro R3): 1 bản sao vật lý chỉ có tối đa 1 giao dịch đang mượn tại 1 thời điểm
CREATE UNIQUE INDEX idx_unique_active_copy_borrow
ON dbo.borrow_records(copy_id)
WHERE status IN ('BORROWED', 'OVERDUE');
GO

-- Dữ liệu mẫu (Mock Data phục vụ kiểm thử ngay - id được DB tự tăng IDENTITY(1,1) hoàn toàn tự động)
INSERT INTO dbo.categories (name, description) VALUES
(N'Công nghệ phần mềm', N'Sách về quy trình phát triển và quản lý dự án phần mềm'),
(N'Cơ sở dữ liệu', N'Sách về thiết kế CSDL, SQL và hệ quản trị CSDL'),
(N'Trí tuệ nhân tạo', N'Sách về Machine Learning, Deep Learning và NLP');

INSERT INTO dbo.users (user_code, username, password_hash, full_name, email, phone, role, status) VALUES
('ADMIN01', 'admin', 'hashed_pw', N'Quản Trị Viên', 'admin@hcmut.edu.vn', '0901000001', 'ADMIN', 'ACTIVE'),
('TT001', 'thuthu1', 'hashed_pw', N'Nguyễn Thị Thủ Thư', 'thuthu1@hcmut.edu.vn', '0901000002', 'LIBRARIAN', 'ACTIVE'),
('2311159', 'huy.le', 'hashed_pw', N'Lê Thanh Huy', 'huy.le@hcmut.edu.vn', '0902000001', 'STUDENT', 'ACTIVE'),
('2310862', 'hai.bui', 'hashed_pw', N'Bùi Hà Hải', 'hai.bui@hcmut.edu.vn', '0902000002', 'STUDENT', 'ACTIVE'),
('GV001', 'tam.nguyen', 'hashed_pw', N'Nguyễn Minh Tâm', 'tam.nguyen@hcmut.edu.vn', '0903000001', 'LECTURER', 'ACTIVE');

-- Chèn dữ liệu sách kèm URL ảnh bìa trực tuyến để phục vụ render giao diện Web/Mobile
INSERT INTO dbo.books (isbn, title, author, category_id, publisher, publish_year, description, cover_url) VALUES
('978-0133943030', N'Software Engineering (10th Edition)', N'Ian Sommerville', 1, N'Pearson', 2015, N'Giáo trình Kỹ nghệ phần mềm và Quản lý dự án', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=600&q=80'),
('978-0078022159', N'Database System Concepts (7th Edition)', N'Abraham Silberschatz', 2, N'McGraw-Hill', 2019, N'Giáo trình nền tảng về hệ cơ sở dữ liệu', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'),
('978-0134610993', N'Artificial Intelligence: A Modern Approach (4th Edition)', N'Stuart Russell, Peter Norvig', 3, N'Pearson', 2020, N'Giáo trình kinh điển về trí tuệ nhân tạo và học máy', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80');

INSERT INTO dbo.book_copies (book_id, barcode, shelf_location, status) VALUES
(1, 'BC-SE-001', N'Kệ CNPM - Tầng 2 - Ô A1', 'AVAILABLE'),
(1, 'BC-SE-002', N'Kệ CNPM - Tầng 2 - Ô A1', 'AVAILABLE'),
(2, 'BC-DB-001', N'Kệ CSDL - Tầng 2 - Ô B2', 'AVAILABLE'),
(3, 'BC-AI-001', N'Kệ AI - Tầng 3 - Ô C1', 'AVAILABLE');
GO