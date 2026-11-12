IF OBJECT_ID('dbo.activity_logs', 'U') IS NOT NULL DROP TABLE dbo.activity_logs;
IF OBJECT_ID('dbo.borrow_requests', 'U') IS NOT NULL DROP TABLE dbo.borrow_requests;
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

-- 7. BẢNG BORROW_REQUESTS (Độc giả đăng ký mượn sách trước / Giữ chỗ)
CREATE TABLE dbo.borrow_requests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES dbo.users(id),
    book_id INT NOT NULL REFERENCES dbo.books(id),
    copy_id INT NULL REFERENCES dbo.book_copies(id),
    request_date DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    expected_pickup_date DATE NULL,
    pickup_deadline DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED')),
    note NVARCHAR(500) NULL,
    admin_note NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 8. BẢNG ACTIVITY_LOGS (Ghi lại lịch sử hoạt động hệ thống: mượn, trả, phạt, yêu cầu mượn)
CREATE TABLE dbo.activity_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    user_id INT NULL REFERENCES dbo.users(id),
    user_code VARCHAR(20) NULL,
    user_name NVARCHAR(100) NULL,
    user_role VARCHAR(20) NULL,
    target_type VARCHAR(50) NULL,
    target_id INT NULL,
    details NVARCHAR(MAX) NULL,
    ip_address VARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- Chống lỗi Concurrency (Rủi ro R3): 1 bản sao vật lý chỉ có tối đa 1 giao dịch đang mượn tại 1 thời điểm
CREATE UNIQUE INDEX idx_unique_active_copy_borrow
ON dbo.borrow_records(copy_id)
WHERE status IN ('BORROWED', 'OVERDUE');
GO

-- =================================================================================
-- DỮ LIỆU MẪU (MOCK DATA)
-- =================================================================================

-- 1. Thêm 6 Danh mục thể loại sách
INSERT INTO dbo.categories (name, description) VALUES
(N'Công nghệ phần mềm', N'Sách về quy trình phát triển, kiến trúc, kiểm thử và quản lý dự án phần mềm'),
(N'Cơ sở dữ liệu', N'Sách về thiết kế CSDL, SQL, NoSQL và hệ quản trị dữ liệu lớn'),
(N'Trí tuệ nhân tạo & Khoa học dữ liệu', N'Sách về Machine Learning, Deep Learning, NLP và phân tích dữ liệu'),
(N'Mạng máy tính & Bảo mật', N'Sách về giao thức mạng, an toàn thông tin, mật mã học và Cloud'),
(N'Thuật toán & Lập trình', N'Sách nền tảng về cấu trúc dữ liệu, giải thuật và ngôn ngữ lập trình'),
(N'Hệ thống & Kiến trúc máy tính', N'Sách về hệ điều hành, Linux, vi xử lý và hệ thống phân tán');

-- 2. Thêm đúng 5 Người dùng vừa đủ để test các Role và Status
INSERT INTO dbo.users (user_code, username, password_hash, full_name, email, phone, role, status) VALUES
('ADMIN01', 'admin', 'hashed_pw', N'Quản Trị Hệ Thống', 'admin@library.edu.vn', '0901000001', 'ADMIN', 'ACTIVE'),
('TT001', 'thuthu', 'hashed_pw', N'Nguyễn Thị Thủ Thư', 'thuthu@library.edu.vn', '0901000002', 'LIBRARIAN', 'ACTIVE'),
('GV001', 'giangvien', 'hashed_pw', N'Trần Văn Giảng Viên', 'giangvien@library.edu.vn', '0902000001', 'LECTURER', 'ACTIVE'),
('SV001', 'sinhvien1', 'hashed_pw', N'Nguyễn Văn A', 'nguyenvana@student.edu.vn', '0903000001', 'STUDENT', 'ACTIVE'),
('SV002', 'sinhvien2', 'hashed_pw', N'Trần Thị B', 'tranthib@student.edu.vn', '0903000002', 'STUDENT', 'LOCKED');

-- 3. Thêm 30 Đầu sách CNTT kinh điển (Mỗi danh mục 5 cuốn - Ảnh bìa nét căng từ OpenLibrary CDN)
INSERT INTO dbo.books (isbn, title, author, category_id, publisher, publish_year, language, description, cover_url) VALUES
-- [Danh mục 1: Công nghệ phần mềm] (ID: 1 -> 5)
('978-0133943030', N'Software Engineering (10th Edition)', N'Ian Sommerville', 1, N'Pearson', 2015, N'Tiếng Anh', N'Giáo trình toàn diện về quy trình kỹ nghệ phần mềm, kiến trúc hệ thống và quản lý dự án.', 'https://covers.openlibrary.org/b/isbn/9780133943030-L.jpg'),
('978-0132350884', N'Clean Code: A Handbook of Agile Software Craftsmanship', N'Robert C. Martin', 1, N'Prentice Hall', 2008, N'Tiếng Anh', N'Cẩm nang viết mã nguồn sạch, dễ bảo trì và áp dụng các nguyên lý thiết kế phần mềm hiện đại.', 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'),
('978-0135957059', N'The Pragmatic Programmer (20th Anniversary Edition)', N'David Thomas, Andrew Hunt', 1, N'Addison-Wesley', 2019, N'Tiếng Anh', N'Những bài học thực chiến giúp lập trình viên nâng cao tư duy thiết kế và phát triển sự nghiệp.', 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg'),
('978-0201633610', N'Design Patterns: Elements of Reusable Object-Oriented Software', N'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides', 1, N'Addison-Wesley', 1994, N'Tiếng Anh', N'Cuốn sách kinh điển của Gang of Four (GoF) về 23 mẫu thiết kế hướng đối tượng.', 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg'),
('978-0134757599', N'Refactoring: Improving the Design of Existing Code (2nd Edition)', N'Martin Fowler', 1, N'Addison-Wesley', 2018, N'Tiếng Anh', N'Phương pháp tái cấu trúc mã nguồn để cải thiện thiết kế mà không làm thay đổi hành vi phần mềm.', 'https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg'),

-- [Danh mục 2: Cơ sở dữ liệu] (ID: 6 -> 10)
('978-0078022159', N'Database System Concepts (7th Edition)', N'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', 2, N'McGraw-Hill', 2019, N'Tiếng Anh', N'Giáo trình nền tảng về hệ cơ sở dữ liệu quan hệ, SQL, chuẩn hóa và quản lý giao dịch.', 'https://covers.openlibrary.org/b/isbn/9780078022159-L.jpg'),
('978-1449373320', N'Designing Data-Intensive Applications', N'Martin Kleppmann', 2, N'O''Reilly Media', 2017, N'Tiếng Anh', N'Kiến trúc các hệ thống dữ liệu lớn, đảm bảo tính tin cậy, khả năng mở rộng và bảo trì.', 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg'),
('978-0133970777', N'Fundamentals of Database Systems (7th Edition)', N'Ramez Elmasri, Shamkant B. Navathe', 2, N'Pearson', 2015, N'Tiếng Anh', N'Lý thuyết chuyên sâu về mô hình ER, đại số quan hệ, tối ưu hóa truy vấn và cơ sở dữ liệu NoSQL.', 'https://covers.openlibrary.org/b/isbn/9780133970777-L.jpg'),
('978-3950307825', N'SQL Performance Explained', N'Markus Winand', 2, N'Markus Winand', 2012, N'Tiếng Anh', N'Tất cả những gì lập trình viên cần biết về Indexing (Đánh chỉ mục) và tối ưu hóa tốc độ câu lệnh SQL.', 'https://covers.openlibrary.org/b/isbn/9783950307825-L.jpg'),
('978-1491954546', N'MongoDB: The Definitive Guide (3rd Edition)', N'Shannon Bradshaw, Eoin Brazil, Kristina Chodorow', 2, N'O''Reilly Media', 2019, N'Tiếng Anh', N'Hướng dẫn quản trị và phát triển ứng dụng với hệ quản trị cơ sở dữ liệu NoSQL phổ biến nhất.', 'https://covers.openlibrary.org/b/isbn/9781491954546-L.jpg'),

-- [Danh mục 3: Trí tuệ nhân tạo & Khoa học dữ liệu] (ID: 11 -> 15)
('978-0134610993', N'Artificial Intelligence: A Modern Approach (4th Edition)', N'Stuart Russell, Peter Norvig', 3, N'Pearson', 2020, N'Tiếng Anh', N'Giáo trình gối đầu giường về Trí tuệ nhân tạo, giải thuật tìm kiếm, suy diễn logic và học máy.', 'https://covers.openlibrary.org/b/isbn/9780134610993-L.jpg'),
('978-0262035613', N'Deep Learning', N'Ian Goodfellow, Yoshua Bengio, Aaron Courville', 3, N'MIT Press', 2016, N'Tiếng Anh', N'Sách chuyên sâu về toán học ứng dụng, mạng nơ-ron nhân tạo sâu, CNN, RNN và tối ưu hóa.', 'https://covers.openlibrary.org/b/isbn/9780262035613-L.jpg'),
('978-1492032649', N'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', N'Aurélien Géron', 3, N'O''Reilly Media', 2019, N'Tiếng Anh', N'Hướng dẫn thực hành xây dựng các hệ thống học máy và học sâu bằng ngôn ngữ Python.', 'https://covers.openlibrary.org/b/isbn/9781492032649-L.jpg'),
('978-0387848570', N'The Elements of Statistical Learning (2nd Edition)', N'Trevor Hastie, Robert Tibshirani, Jerome Friedman', 3, N'Springer', 2009, N'Tiếng Anh', N'Nền tảng toán thống kê cho khai phá dữ liệu, suy luận và dự đoán trong Machine Learning.', 'https://covers.openlibrary.org/b/isbn/9780387848570-L.jpg'),
('978-1491957660', N'Python for Data Analysis (2nd Edition)', N'Wes McKinney', 3, N'O''Reilly Media', 2017, N'Tiếng Anh', N'Xử lý, làm sạch và phân tích dữ liệu thực tế bằng thư viện Pandas, NumPy và IPython.', 'https://covers.openlibrary.org/b/isbn/9781491957660-L.jpg'),

-- [Danh mục 4: Mạng máy tính & Bảo mật] (ID: 16 -> 20)
('978-0133594140', N'Computer Networking: A Top-Down Approach (7th Edition)', N'James F. Kurose, Keith W. Ross', 4, N'Pearson', 2016, N'Tiếng Anh', N'Tiếp cận mạng máy tính từ tầng ứng dụng (HTTP, DNS) xuống tầng giao vận (TCP/UDP) và vật lý.', 'https://covers.openlibrary.org/b/isbn/9780133594140-L.jpg'),
('978-1118026489', N'The Web Application Hacker''s Handbook (2nd Edition)', N'Dafydd Stuttard, Marcus Pinto', 4, N'Wiley', 2011, N'Tiếng Anh', N'Phương pháp tìm kiếm, khai thác và phòng chống các lỗ hổng bảo mật trên ứng dụng Web.', 'https://covers.openlibrary.org/b/isbn/9781118026489-L.jpg'),
('978-0132126953', N'Computer Networks (5th Edition)', N'Andrew S. Tanenbaum, David J. Wetherall', 4, N'Pearson', 2010, N'Tiếng Anh', N'Kiến thức toàn diện về kiến trúc tầng mạng, truyền thông không dây và bảo mật hạ tầng mạng.', 'https://covers.openlibrary.org/b/isbn/9780132126953-L.jpg'),
('978-0134444284', N'Cryptography and Network Security: Principles and Practice', N'William Stallings', 4, N'Pearson', 2016, N'Tiếng Anh', N'Lý thuyết mật mã học đối xứng, bất đối xứng, hàm băm và các giao thức bảo mật mạng hiện đại.', 'https://covers.openlibrary.org/b/isbn/9780134444284-L.jpg'),
('978-1593271442', N'Hacking: The Art of Exploitation (2nd Edition)', N'Jon Erickson', 4, N'No Starch Press', 2008, N'Tiếng Anh', N'Khám phá bản chất kỹ thuật của lỗ hổng tràn bộ đệm (Buffer Overflow), shellcode và mạng.', 'https://covers.openlibrary.org/b/isbn/9781593271442-L.jpg'),

-- [Danh mục 5: Thuật toán & Lập trình] (ID: 21 -> 25)
('978-0262033848', N'Introduction to Algorithms - CLRS (3rd Edition)', N'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', 5, N'MIT Press', 2009, N'Tiếng Anh', N'Sách kinh điển về phân tích thiết kế giải thuật, cấu trúc dữ liệu, quy hoạch động và đồ thị.', 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg'),
('978-1617292231', N'Grokking Algorithms', N'Aditya Bhargava', 5, N'Manning', 2016, N'Tiếng Anh', N'Hướng dẫn trực quan bằng hình ảnh minh họa sinh động về các thuật toán cốt lõi cho lập trình viên.', 'https://covers.openlibrary.org/b/isbn/9781617292231-L.jpg'),
('978-0321573513', N'Algorithms (4th Edition)', N'Robert Sedgewick, Kevin Wayne', 5, N'Addison-Wesley', 2011, N'Tiếng Anh', N'Các thuật toán sắp xếp, tìm kiếm, đồ thị và xử lý chuỗi được cài đặt chi tiết bằng ngôn ngữ Java.', 'https://covers.openlibrary.org/b/isbn/9780321573513-L.jpg'),
('978-0134685991', N'Effective Java (3rd Edition)', N'Joshua Bloch', 5, N'Addison-Wesley', 2017, N'Tiếng Anh', N'90 quy tắc vàng giúp viết mã nguồn Java tối ưu, an toàn và đúng chuẩn kiến trúc hướng đối tượng.', 'https://covers.openlibrary.org/b/isbn/9780134685991-L.jpg'),
('978-0984782857', N'Cracking the Coding Interview (6th Edition)', N'Gayle Laakmann McDowell', 5, N'CareerCup', 2015, N'Tiếng Anh', N'189 câu hỏi và lời giải chi tiết về cấu trúc dữ liệu và giải thuật phục vụ phỏng vấn Big Tech.', 'https://covers.openlibrary.org/b/isbn/9780984782857-L.jpg'),

-- [Danh mục 6: Hệ thống & Kiến trúc máy tính] (ID: 26 -> 30)
('978-1119456339', N'Operating System Concepts (10th Edition)', N'Abraham Silberschatz, Peter B. Galvin, Greg Gagne', 6, N'Wiley', 2018, N'Tiếng Anh', N'Sách khủng long kinh điển về quản lý tiến trình, luồng, đồng bộ hóa, bộ nhớ ảo và hệ thống file.', 'https://covers.openlibrary.org/b/isbn/9781119456339-L.jpg'),
('978-0134092669', N'Computer Systems: A Programmer''s Perspective (3rd Edition)', N'Randal E. Bryant, David R. O''Hallaron', 6, N'Pearson', 2015, N'Tiếng Anh', N'Giải thích cách phần cứng, trình biên dịch và hệ điều hành phối hợp thực thi chương trình.', 'https://covers.openlibrary.org/b/isbn/9780134092669-L.jpg'),
('978-0133591620', N'Modern Operating Systems (4th Edition)', N'Andrew S. Tanenbaum, Herbert Bos', 6, N'Pearson', 2014, N'Tiếng Anh', N'Phân tích sâu về thiết kế nhân hệ điều hành (Kernel), ảo hóa, bảo mật và hệ điều hành phân tán.', 'https://covers.openlibrary.org/b/isbn/9780133591620-L.jpg'),
('978-0321356680', N'Compilers: Principles, Techniques, and Tools (2nd Edition)', N'Alfred V. Aho, Monica S. Lam, Ravi Sethi, Jeffrey D. Ullman', 6, N'Addison-Wesley', 2006, N'Tiếng Anh', N'Sách Con Rồng (Dragon Book) kinh điển về phân tích từ vựng, cú pháp, ngữ nghĩa và sinh mã máy.', 'https://covers.openlibrary.org/b/isbn/9780321356680-L.jpg'),
('978-0128119051', N'Computer Architecture: A Quantitative Approach (6th Edition)', N'John L. Hennessy, David A. Patterson', 6, N'Morgan Kaufmann', 2017, N'Tiếng Anh', N'Sách của hai chủ nhân giải Turing về thiết kế bộ vi xử lý hiện đại, phân cấp bộ nhớ và tính toán song song.', 'https://covers.openlibrary.org/b/isbn/9780128119051-L.jpg');

-- 4. Thêm 40 Bản sao vật lý (Trải đều cho cả 30 đầu sách, có đủ các trạng thái)
INSERT INTO dbo.book_copies (book_id, barcode, shelf_location, status) VALUES
-- Sách 1 -> 5 (Kệ CNPM - Tầng 2)
(1, 'BC-SE-001', N'Kệ CNPM - Tầng 2 - Ô A1', 'AVAILABLE'),
(1, 'BC-SE-002', N'Kệ CNPM - Tầng 2 - Ô A1', 'BORROWED'),
(2, 'BC-SE-003', N'Kệ CNPM - Tầng 2 - Ô A1', 'AVAILABLE'),
(2, 'BC-SE-004', N'Kệ CNPM - Tầng 2 - Ô A1', 'AVAILABLE'),
(3, 'BC-SE-005', N'Kệ CNPM - Tầng 2 - Ô A2', 'AVAILABLE'),
(4, 'BC-SE-006', N'Kệ CNPM - Tầng 2 - Ô A2', 'MAINTENANCE'),
(5, 'BC-SE-007', N'Kệ CNPM - Tầng 2 - Ô A3', 'AVAILABLE'),
(5, 'BC-SE-008', N'Kệ CNPM - Tầng 2 - Ô A3', 'AVAILABLE'),

-- Sách 6 -> 10 (Kệ CSDL - Tầng 2)
(6, 'BC-DB-001', N'Kệ CSDL - Tầng 2 - Ô B1', 'AVAILABLE'),
(6, 'BC-DB-002', N'Kệ CSDL - Tầng 2 - Ô B1', 'BORROWED'),
(7, 'BC-DB-003', N'Kệ CSDL - Tầng 2 - Ô B1', 'AVAILABLE'),
(7, 'BC-DB-004', N'Kệ CSDL - Tầng 2 - Ô B1', 'AVAILABLE'),
(8, 'BC-DB-005', N'Kệ CSDL - Tầng 2 - Ô B2', 'AVAILABLE'),
(9, 'BC-DB-006', N'Kệ CSDL - Tầng 2 - Ô B2', 'AVAILABLE'),
(10, 'BC-DB-007', N'Kệ CSDL - Tầng 2 - Ô B3', 'AVAILABLE'),

-- Sách 11 -> 15 (Kệ AI - Tầng 3)
(11, 'BC-AI-001', N'Kệ AI - Tầng 3 - Ô C1', 'AVAILABLE'),
(11, 'BC-AI-002', N'Kệ AI - Tầng 3 - Ô C1', 'AVAILABLE'),
(12, 'BC-AI-003', N'Kệ AI - Tầng 3 - Ô C1', 'BORROWED'),
(13, 'BC-AI-004', N'Kệ AI - Tầng 3 - Ô C2', 'AVAILABLE'),
(13, 'BC-AI-005', N'Kệ AI - Tầng 3 - Ô C2', 'AVAILABLE'),
(14, 'BC-AI-006', N'Kệ AI - Tầng 3 - Ô C3', 'AVAILABLE'),
(15, 'BC-AI-007', N'Kệ AI - Tầng 3 - Ô C3', 'AVAILABLE'),

-- Sách 16 -> 20 (Kệ Mạng & Bảo mật - Tầng 3)
(16, 'BC-NW-001', N'Kệ Mạng - Tầng 3 - Ô D1', 'AVAILABLE'),
(16, 'BC-NW-002', N'Kệ Mạng - Tầng 3 - Ô D1', 'AVAILABLE'),
(17, 'BC-NW-003', N'Kệ Mạng - Tầng 3 - Ô D2', 'LOST'),
(18, 'BC-NW-004', N'Kệ Mạng - Tầng 3 - Ô D2', 'AVAILABLE'),
(19, 'BC-NW-005', N'Kệ Mạng - Tầng 3 - Ô D3', 'AVAILABLE'),
(20, 'BC-NW-006', N'Kệ Mạng - Tầng 3 - Ô D3', 'AVAILABLE'),

-- Sách 21 -> 25 (Kệ Thuật Toán - Tầng 4)
(21, 'BC-AL-001', N'Kệ Thuật Toán - Tầng 4 - Ô E1', 'AVAILABLE'),
(21, 'BC-AL-002', N'Kệ Thuật Toán - Tầng 4 - Ô E1', 'AVAILABLE'),
(22, 'BC-AL-003', N'Kệ Thuật Toán - Tầng 4 - Ô E2', 'AVAILABLE'),
(23, 'BC-AL-004', N'Kệ Thuật Toán - Tầng 4 - Ô E2', 'AVAILABLE'),
(24, 'BC-AL-005', N'Kệ Thuật Toán - Tầng 4 - Ô E3', 'AVAILABLE'),
(25, 'BC-AL-006', N'Kệ Thuật Toán - Tầng 4 - Ô E3', 'AVAILABLE'),

-- Sách 26 -> 30 (Kệ Hệ Thống - Tầng 4)
(26, 'BC-OS-001', N'Kệ Hệ Thống - Tầng 4 - Ô F1', 'AVAILABLE'),
(26, 'BC-OS-002', N'Kệ Hệ Thống - Tầng 4 - Ô F1', 'AVAILABLE'),
(27, 'BC-OS-003', N'Kệ Hệ Thống - Tầng 4 - Ô F2', 'AVAILABLE'),
(28, 'BC-OS-004', N'Kệ Hệ Thống - Tầng 4 - Ô F2', 'AVAILABLE'),
(29, 'BC-OS-005', N'Kệ Hệ Thống - Tầng 4 - Ô F3', 'AVAILABLE'),
(30, 'BC-OS-006', N'Kệ Hệ Thống - Tầng 4 - Ô F3', 'AVAILABLE');

-- 5. Thêm 4 Giao dịch Mượn / Trả mẫu (Khớp ID của 5 user vừa tạo: 2=Thủ thư, 3=Giảng viên, 4=Nguyễn Văn A)
INSERT INTO dbo.borrow_records (copy_id, borrower_id, librarian_id, borrow_date, due_date, return_date, renewal_count, status) VALUES
-- 1. Nguyễn Văn A (id=4) đã trả đúng hạn cuốn BC-SE-001 (copy_id=1)
(1, 4, 2, DATEADD(DAY, -20, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, -8, CAST(SYSDATETIME() AS DATE)), 0, 'RETURNED'),
-- 2. Nguyễn Văn A (id=4) đang mượn trong hạn cuốn BC-SE-002 (copy_id=2)
(2, 4, 2, DATEADD(DAY, -5, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, 9, CAST(SYSDATETIME() AS DATE)), NULL, 0, 'BORROWED'),
-- 3. Nguyễn Văn A (id=4) đang mượn nhưng QUÁ HẠN cuốn BC-DB-002 (copy_id=10)
(10, 4, 2, DATEADD(DAY, -25, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, -11, CAST(SYSDATETIME() AS DATE)), NULL, 1, 'OVERDUE'),
-- 4. Giảng viên (id=3) đang mượn trong hạn cuốn BC-AI-003 (copy_id=18) + trả trễ 1 cuốn trước đó để test phạt
(18, 3, 2, DATEADD(DAY, -3, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, 27, CAST(SYSDATETIME() AS DATE)), NULL, 0, 'BORROWED'),
-- 5. Nguyễn Văn A (id=4) đã trả cuốn BC-AI-001 (copy_id=16) nhưng bị trễ hạn 5 ngày -> Sinh phiếu phạt
(16, 4, 2, DATEADD(DAY, -30, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, -16, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, -11, CAST(SYSDATETIME() AS DATE)), 0, 'RETURNED');

-- 6. Thêm Phiếu phạt mẫu (Ứng với giao dịch số 5 của Nguyễn Văn A)
INSERT INTO dbo.fines (borrow_record_id, librarian_id, overdue_days, amount, reason, status, paid_at) VALUES
(5, 2, 5, 25000.00, N'Trả sách quá hạn 5 ngày (BC-AI-001)', 'UNPAID', NULL);

-- 7. Thêm Yêu cầu mượn sách mẫu (Borrow Requests)
INSERT INTO dbo.borrow_requests (user_id, book_id, copy_id, request_date, expected_pickup_date, pickup_deadline, status, note, admin_note) VALUES
(4, 3, NULL, DATEADD(HOUR, -2, SYSDATETIME()), DATEADD(DAY, 2, CAST(SYSDATETIME() AS DATE)), NULL, 'PENDING', N'Cần mượn làm đồ án môn học', NULL),
(3, 11, 19, DATEADD(DAY, -1, SYSDATETIME()), DATEADD(DAY, 1, CAST(SYSDATETIME() AS DATE)), DATEADD(DAY, 3, CAST(SYSDATETIME() AS DATE)), 'APPROVED', N'Giảng viên mượn tham khảo giảng dạy', N'Đã chuẩn bị sách tại quầy');

-- 8. Thêm Nhật ký hoạt động mẫu (Activity Logs)
INSERT INTO dbo.activity_logs (action, user_id, user_code, user_name, user_role, target_type, target_id, details, ip_address, created_at) VALUES
('BORROW', 2, 'TT001', N'Nguyễn Thị Thủ Thư', 'LIBRARIAN', 'BORROW_RECORD', 1, N'Thủ thư TT001 cho độc giả SV001 mượn sách BC-SE-001', '127.0.0.1', DATEADD(DAY, -20, SYSDATETIME())),
('RETURN', 2, 'TT001', N'Nguyễn Thị Thủ Thư', 'LIBRARIAN', 'BORROW_RECORD', 1, N'Độc giả SV001 trả sách BC-SE-001 đúng hạn', '127.0.0.1', DATEADD(DAY, -8, SYSDATETIME())),
('BORROW', 2, 'TT001', N'Nguyễn Thị Thủ Thư', 'LIBRARIAN', 'BORROW_RECORD', 3, N'Thủ thư TT001 cho độc giả SV001 mượn sách BC-DB-002', '127.0.0.1', DATEADD(DAY, -25, SYSDATETIME())),
('BORROW_REQUEST', 4, 'SV001', N'Nguyễn Văn A', 'STUDENT', 'BORROW_REQUEST', 1, N'Độc giả SV001 gửi yêu cầu mượn sách The Pragmatic Programmer', '127.0.0.1', DATEADD(HOUR, -2, SYSDATETIME()));
GO