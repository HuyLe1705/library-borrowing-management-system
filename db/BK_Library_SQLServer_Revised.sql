/*
    BK LIBRARY - SQL SERVER DATABASE
    Version: revised schema based on the original LibraryDB source.

    SAFETY:
    - This script NEVER drops a database or existing tables.
    - It creates LibraryDB only when it does not already exist.
    - If legacy tables are already present, it stops instead of overwriting them.
    - For an existing database, back it up and run this script against a NEW database
      (recommended: LibraryDB_Dev) or write a deliberate migration script.
    - Seed accounts use a placeholder BCrypt hash. Replace it with hashes generated
      by your Spring Boot PasswordEncoder before testing login.
*/

USE master;
GO

IF DB_ID(N'LibraryDB') IS NULL
BEGIN
    CREATE DATABASE LibraryDB;
END
GO

USE LibraryDB;
GO

IF OBJECT_ID(N'dbo.Branch', N'U') IS NOT NULL
   OR OBJECT_ID(N'dbo.[User]', N'U') IS NOT NULL
   OR OBJECT_ID(N'dbo.BibliographicRecord', N'U') IS NOT NULL
BEGIN
    THROW 50001,
      'LibraryDB already contains legacy tables. No objects were changed. Back up the database and run this script in a new database, or create a dedicated migration script.',
      1;
END
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* =========================================================
   1. REFERENCE DATA
   ========================================================= */

CREATE TABLE dbo.Branch (
    [Branch ID] VARCHAR(10) NOT NULL CONSTRAINT PK_Branch PRIMARY KEY,
    [Branch Name] NVARCHAR(100) NOT NULL,
    [Address] NVARCHAR(200) NULL,
    [Phone] VARCHAR(20) NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_Branch_Status DEFAULT ('Active'),
    CONSTRAINT CK_Branch_Status CHECK ([Status] IN ('Active', 'Inactive'))
);
GO

/* Original Manufacture represented a mix of printers and publishers.
   Keep the original table name for compatibility, but treat it as a publisher/vendor. */
CREATE TABLE dbo.Manufacture (
    ManufactureID VARCHAR(10) NOT NULL CONSTRAINT PK_Manufacture PRIMARY KEY,
    ManuName NVARCHAR(150) NOT NULL,
    Contact NVARCHAR(150) NULL,
    [Type] VARCHAR(20) NOT NULL CONSTRAINT DF_Manufacture_Type DEFAULT ('Publisher'),
    CONSTRAINT CK_Manufacture_Type CHECK ([Type] IN ('Publisher', 'Printer', 'Supplier'))
);
GO

CREATE TABLE dbo.Author (
    SSN VARCHAR(10) NOT NULL CONSTRAINT PK_Author PRIMARY KEY,
    Biography NVARCHAR(MAX) NULL,
    Fullname NVARCHAR(150) NOT NULL
);
GO

CREATE TABLE dbo.Category (
    [Name] NVARCHAR(100) NOT NULL CONSTRAINT PK_Category PRIMARY KEY,
    [Description] NVARCHAR(255) NULL
);
GO

CREATE TABLE dbo.BibliographicRecord (
    RecordID VARCHAR(10) NOT NULL CONSTRAINT PK_BibliographicRecord PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    RefBookID VARCHAR(10) NULL,
    Publisher NVARCHAR(150) NULL,
    [Year] INT NULL,
    ISBN VARCHAR(20) NULL,
    Language NVARCHAR(50) NULL,
    Description NVARCHAR(MAX) NULL,
    CoverURL NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_BibliographicRecord_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_BibliographicRecord_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_BibliographicRecord_Reference FOREIGN KEY (RefBookID)
        REFERENCES dbo.BibliographicRecord(RecordID),
    CONSTRAINT CK_BibliographicRecord_Year CHECK ([Year] IS NULL OR [Year] BETWEEN 0 AND 9999),
    CONSTRAINT CK_BibliographicRecord_NotSelfReference CHECK (RefBookID IS NULL OR RefBookID <> RecordID)
);
GO

CREATE UNIQUE INDEX UX_BibliographicRecord_ISBN
ON dbo.BibliographicRecord(ISBN)
WHERE ISBN IS NOT NULL;
GO

/* =========================================================
   2. USERS, ROLES AND USER SUBTYPES
   ========================================================= */

CREATE TABLE dbo.[User] (
    UserID CHAR(8) NOT NULL CONSTRAINT PK_User PRIMARY KEY,
    Username VARCHAR(50) NOT NULL,
    [Password] VARCHAR(255) NOT NULL, -- BCrypt hash only; never plain text
    [First Name] NVARCHAR(50) NOT NULL,
    [Last Name] NVARCHAR(50) NOT NULL,
    Email VARCHAR(254) NOT NULL,
    SSN CHAR(8) NULL,
    Birthday DATE NULL,
    [Address] NVARCHAR(200) NULL,
    UserType VARCHAR(20) NOT NULL,
    [Phone Number] VARCHAR(20) NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_User_Status DEFAULT ('Active'),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_User_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_User_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_User_Username UNIQUE (Username),
    CONSTRAINT UQ_User_Email UNIQUE (Email),
    CONSTRAINT CK_User_Type CHECK (UserType IN ('Admin', 'Librarian', 'Student')),
    CONSTRAINT CK_User_Status CHECK ([Status] IN ('Active', 'Inactive', 'Locked')),
    CONSTRAINT CK_User_Email CHECK (Email LIKE '%_@_%._%'),
    CONSTRAINT CK_User_Birthday CHECK (Birthday IS NULL OR Birthday <= CAST(GETDATE() AS DATE))
);
GO

CREATE TABLE dbo.[Admin] (
    UserID CHAR(8) NOT NULL CONSTRAINT PK_Admin PRIMARY KEY,
    AdminCode VARCHAR(20) NOT NULL CONSTRAINT UQ_Admin_AdminCode UNIQUE,
    CONSTRAINT FK_Admin_User FOREIGN KEY (UserID) REFERENCES dbo.[User](UserID)
);
GO

CREATE TABLE dbo.Student (
    UserID CHAR(8) NOT NULL CONSTRAINT PK_Student PRIMARY KEY,
    [Student ID] VARCHAR(20) NOT NULL,
    [Year] INT NULL,
    CONSTRAINT UQ_Student_StudentID UNIQUE ([Student ID]),
    CONSTRAINT FK_Student_User FOREIGN KEY (UserID) REFERENCES dbo.[User](UserID),
    CONSTRAINT CK_Student_Year CHECK ([Year] IS NULL OR [Year] BETWEEN 1 AND 10)
);
GO

CREATE TABLE dbo.Librarian (
    UserID CHAR(8) NOT NULL CONSTRAINT PK_Librarian PRIMARY KEY,
    [Branch ID] VARCHAR(10) NOT NULL,
    CONSTRAINT FK_Librarian_User FOREIGN KEY (UserID) REFERENCES dbo.[User](UserID),
    CONSTRAINT FK_Librarian_Branch FOREIGN KEY ([Branch ID]) REFERENCES dbo.Branch([Branch ID])
);
GO

/* Flexible RBAC for application authorization; UserType/subtype tables remain
   to preserve the original academic model and student/librarian attributes. */
CREATE TABLE dbo.Role (
    RoleID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Role PRIMARY KEY,
    RoleName VARCHAR(30) NOT NULL CONSTRAINT UQ_Role_RoleName UNIQUE,
    [Description] NVARCHAR(200) NULL
);
GO

CREATE TABLE dbo.UserRole (
    UserID CHAR(8) NOT NULL,
    RoleID INT NOT NULL,
    CONSTRAINT PK_UserRole PRIMARY KEY (UserID, RoleID),
    CONSTRAINT FK_UserRole_User FOREIGN KEY (UserID) REFERENCES dbo.[User](UserID) ON DELETE CASCADE,
    CONSTRAINT FK_UserRole_Role FOREIGN KEY (RoleID) REFERENCES dbo.Role(RoleID)
);
GO

/* =========================================================
   3. BOOKS, COPIES AND MANY-TO-MANY RELATIONSHIPS
   ========================================================= */

CREATE TABLE dbo.[Book Copy] (
    BookID VARCHAR(10) NOT NULL CONSTRAINT PK_BookCopy PRIMARY KEY,
    RecordID VARCHAR(10) NOT NULL,
    [Entry Date] DATE NOT NULL CONSTRAINT DF_BookCopy_EntryDate DEFAULT (CAST(GETDATE() AS DATE)),
    [Branch ID] VARCHAR(10) NOT NULL,
    ManufactureID VARCHAR(10) NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_BookCopy_Status DEFAULT ('Available'),
    Barcode VARCHAR(50) NULL,
    CONSTRAINT FK_BookCopy_Record FOREIGN KEY (RecordID) REFERENCES dbo.BibliographicRecord(RecordID),
    CONSTRAINT FK_BookCopy_Branch FOREIGN KEY ([Branch ID]) REFERENCES dbo.Branch([Branch ID]),
    CONSTRAINT FK_BookCopy_Manufacture FOREIGN KEY (ManufactureID) REFERENCES dbo.Manufacture(ManufactureID),
    CONSTRAINT CK_BookCopy_Status CHECK ([Status] IN ('Available', 'OnLoan', 'Maintenance', 'Lost', 'Damaged', 'Inactive'))
);
GO

CREATE UNIQUE INDEX UX_BookCopy_Barcode
ON dbo.[Book Copy](Barcode)
WHERE Barcode IS NOT NULL;
GO

CREATE TABLE dbo.Keywords (
    RecordID VARCHAR(10) NOT NULL,
    Keyword NVARCHAR(50) NOT NULL,
    CONSTRAINT PK_Keywords PRIMARY KEY (RecordID, Keyword),
    CONSTRAINT FK_Keywords_Record FOREIGN KEY (RecordID) REFERENCES dbo.BibliographicRecord(RecordID) ON DELETE CASCADE
);
GO

/* Keep legacy relationship table name Viet. */
CREATE TABLE dbo.Viet (
    AuthorID VARCHAR(10) NOT NULL,
    RecordID VARCHAR(10) NOT NULL,
    CONSTRAINT PK_Viet PRIMARY KEY (AuthorID, RecordID),
    CONSTRAINT FK_Viet_Author FOREIGN KEY (AuthorID) REFERENCES dbo.Author(SSN),
    CONSTRAINT FK_Viet_Record FOREIGN KEY (RecordID) REFERENCES dbo.BibliographicRecord(RecordID) ON DELETE CASCADE
);
GO

/* Keep legacy relationship table name Thuoc. */
CREATE TABLE dbo.Thuoc (
    CategoryName NVARCHAR(100) NOT NULL,
    RecordID VARCHAR(10) NOT NULL,
    CONSTRAINT PK_Thuoc PRIMARY KEY (CategoryName, RecordID),
    CONSTRAINT FK_Thuoc_Category FOREIGN KEY (CategoryName) REFERENCES dbo.Category([Name]),
    CONSTRAINT FK_Thuoc_Record FOREIGN KEY (RecordID) REFERENCES dbo.BibliographicRecord(RecordID) ON DELETE CASCADE
);
GO

/* =========================================================
   4. CART, BORROW REQUEST, LOAN AND FINE
   ========================================================= */

CREATE TABLE dbo.Cart (
    CartID VARCHAR(8) NOT NULL CONSTRAINT PK_Cart PRIMARY KEY,
    InitialDate DATE NOT NULL CONSTRAINT DF_Cart_InitialDate DEFAULT (CAST(GETDATE() AS DATE)),
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_Cart_Status DEFAULT ('Active'),
    UserID CHAR(8) NOT NULL,
    CONSTRAINT FK_Cart_User FOREIGN KEY (UserID) REFERENCES dbo.[User](UserID),
    CONSTRAINT CK_Cart_Status CHECK ([Status] IN ('Active', 'Submitted', 'Completed', 'Cancelled'))
);
GO

/* One active cart per user. */
CREATE UNIQUE INDEX UX_Cart_OneActivePerUser
ON dbo.Cart(UserID)
WHERE [Status] = 'Active';
GO

CREATE TABLE dbo.[Cart Contain] (
    CartID VARCHAR(8) NOT NULL,
    BookID VARCHAR(10) NOT NULL,
    AddedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CartContain_AddedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_CartContain PRIMARY KEY (CartID, BookID),
    CONSTRAINT FK_CartContain_Cart FOREIGN KEY (CartID) REFERENCES dbo.Cart(CartID) ON DELETE CASCADE,
    CONSTRAINT FK_CartContain_Copy FOREIGN KEY (BookID) REFERENCES dbo.[Book Copy](BookID)
);
GO

/* Checkout submits a request for staff approval; it does NOT immediately create a loan. */
CREATE TABLE dbo.BorrowRequest (
    RequestID VARCHAR(10) NOT NULL CONSTRAINT PK_BorrowRequest PRIMARY KEY,
    CartID VARCHAR(8) NULL,
    BorrowerID CHAR(8) NOT NULL,
    RequestedAt DATETIME2(0) NOT NULL CONSTRAINT DF_BorrowRequest_RequestedAt DEFAULT (SYSDATETIME()),
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_BorrowRequest_Status DEFAULT ('Pending'),
    ReviewedBy CHAR(8) NULL,
    ReviewedAt DATETIME2(0) NULL,
    Note NVARCHAR(500) NULL,
    CONSTRAINT FK_BorrowRequest_Cart FOREIGN KEY (CartID) REFERENCES dbo.Cart(CartID),
    CONSTRAINT FK_BorrowRequest_Borrower FOREIGN KEY (BorrowerID) REFERENCES dbo.[User](UserID),
    CONSTRAINT FK_BorrowRequest_Reviewer FOREIGN KEY (ReviewedBy) REFERENCES dbo.[User](UserID),
    CONSTRAINT CK_BorrowRequest_Status CHECK ([Status] IN ('Pending', 'Approved', 'Rejected', 'Cancelled'))
);
GO

CREATE TABLE dbo.BorrowRequestItem (
    RequestID VARCHAR(10) NOT NULL,
    BookID VARCHAR(10) NOT NULL,
    CONSTRAINT PK_BorrowRequestItem PRIMARY KEY (RequestID, BookID),
    CONSTRAINT FK_BorrowRequestItem_Request FOREIGN KEY (RequestID) REFERENCES dbo.BorrowRequest(RequestID) ON DELETE CASCADE,
    CONSTRAINT FK_BorrowRequestItem_Copy FOREIGN KEY (BookID) REFERENCES dbo.[Book Copy](BookID)
);
GO

CREATE TABLE dbo.Loan (
    LoanID VARCHAR(8) NOT NULL CONSTRAINT PK_Loan PRIMARY KEY,
    LoanDate DATE NOT NULL CONSTRAINT DF_Loan_LoanDate DEFAULT (CAST(GETDATE() AS DATE)),
    [Due Date] DATE NOT NULL,
    ReturnDate DATE NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_Loan_Status DEFAULT ('OnLoan'),
    [Handler ID] CHAR(8) NOT NULL,
    BorrowerID CHAR(8) NOT NULL,
    BookID VARCHAR(10) NOT NULL,
    RequestID VARCHAR(10) NULL,
    CONSTRAINT FK_Loan_Handler FOREIGN KEY ([Handler ID]) REFERENCES dbo.[User](UserID),
    CONSTRAINT FK_Loan_Borrower FOREIGN KEY (BorrowerID) REFERENCES dbo.[User](UserID),
    CONSTRAINT FK_Loan_Copy FOREIGN KEY (BookID) REFERENCES dbo.[Book Copy](BookID),
    CONSTRAINT FK_Loan_Request FOREIGN KEY (RequestID) REFERENCES dbo.BorrowRequest(RequestID),
    CONSTRAINT CK_Loan_Status CHECK ([Status] IN ('OnLoan', 'Returned', 'Lost')),
    CONSTRAINT CK_Loan_Dates CHECK ([Due Date] >= LoanDate),
    CONSTRAINT CK_Loan_ReturnDate CHECK (ReturnDate IS NULL OR ReturnDate >= LoanDate),
    CONSTRAINT CK_Loan_ReturnConsistency CHECK (
        ([Status] = 'Returned' AND ReturnDate IS NOT NULL)
        OR ([Status] IN ('OnLoan', 'Lost'))
    )
);
GO

/* A copy may only have one active loan at a time. */
CREATE UNIQUE INDEX UX_Loan_OneActiveLoanPerCopy
ON dbo.Loan(BookID)
WHERE [Status] = 'OnLoan';
GO

CREATE INDEX IX_Loan_Borrower_Status ON dbo.Loan(BorrowerID, [Status]);
CREATE INDEX IX_Loan_DueDate_Status ON dbo.Loan([Due Date], [Status]);
CREATE INDEX IX_BorrowRequest_Status_Date ON dbo.BorrowRequest([Status], RequestedAt);
GO

CREATE TABLE dbo.Fine (
    FineID VARCHAR(10) NOT NULL CONSTRAINT PK_Fine PRIMARY KEY,
    Amount DECIMAL(12,2) NOT NULL,
    Reason NVARCHAR(200) NOT NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_Fine_Status DEFAULT ('Unpaid'),
    [Closing Date] DATE NULL,
    ActionDate DATE NOT NULL CONSTRAINT DF_Fine_ActionDate DEFAULT (CAST(GETDATE() AS DATE)),
    HandlerID CHAR(8) NOT NULL,
    LoanID VARCHAR(8) NOT NULL,
    CONSTRAINT FK_Fine_Handler FOREIGN KEY (HandlerID) REFERENCES dbo.[User](UserID),
    CONSTRAINT FK_Fine_Loan FOREIGN KEY (LoanID) REFERENCES dbo.Loan(LoanID),
    CONSTRAINT CK_Fine_Amount CHECK (Amount > 0),
    CONSTRAINT CK_Fine_Status CHECK ([Status] IN ('Paid', 'Unpaid', 'Waived')),
    CONSTRAINT CK_Fine_ClosingDate CHECK ([Status] <> 'Paid' OR [Closing Date] IS NOT NULL)
);
GO

CREATE INDEX IX_Fine_Loan_Status ON dbo.Fine(LoanID, [Status]);
GO

CREATE TABLE dbo.ActivityLog (
    ActivityID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ActivityLog PRIMARY KEY,
    UserID CHAR(8) NULL,
    Action VARCHAR(100) NOT NULL,
    EntityType VARCHAR(100) NULL,
    EntityID VARCHAR(50) NULL,
    Description NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ActivityLog_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_ActivityLog_User FOREIGN KEY (UserID) REFERENCES dbo.[User](UserID) ON DELETE SET NULL
);
GO

/* =========================================================
   5. SAMPLE DATA
   Password values below are placeholders, NOT usable plaintext passwords.
   Replace with BCrypt hashes generated by the application.
   ========================================================= */

INSERT INTO dbo.Branch ([Branch ID], [Branch Name], [Address], [Phone]) VALUES
('B001', N'Chi nhánh Trung Tâm', N'123 Đường Nguyễn Huệ, Quận 1, TP.HCM', '0280000001'),
('B002', N'Chi nhánh Thủ Đức', N'456 Đường Võ Văn Ngân, TP. Thủ Đức', '0280000002'),
('B003', N'Chi nhánh Quận 5', N'789 Đường An Dương Vương, Quận 5', '0280000003'),
('B004', N'Chi nhánh Quận 7', N'101 Đường Nguyễn Văn Linh, Quận 7', '0280000004'),
('B005', N'Chi nhánh Gò Vấp', N'202 Đường Quang Trung, Quận Gò Vấp', '0280000005');

INSERT INTO dbo.Manufacture (ManufactureID, ManuName, Contact, [Type]) VALUES
('M001', N'Công ty In ấn Sao Mai', N'saomai@print.com', 'Printer'),
('M002', N'Nhà xuất bản Trẻ', N'tre@nxb.vn', 'Publisher'),
('M003', N'Nhà xuất bản Kim Đồng', N'kimdong@nxb.vn', 'Publisher'),
('M004', N'In ấn Phương Đông', N'phuongdong@in.com', 'Printer'),
('M005', N'Nhà xuất bản Tổng hợp HCM', N'tonghop@nxb.vn', 'Publisher');

INSERT INTO dbo.Author (SSN, Biography, Fullname) VALUES
('A001', N'Tác giả sách về kinh tế.', N'Nguyen Van A'),
('A002', N'Nhà văn truyện trinh thám.', N'Tran Thi B'),
('A003', N'Chuyên gia lập trình và cơ sở dữ liệu.', N'Le Van C'),
('A004', N'Tác giả khoa học viễn tưởng.', N'Pham Minh D'),
('A005', N'Tác giả sách thiếu nhi.', N'Hoang Thuy E'),
('A006', N'Tác giả bộ truyện Harry Potter.', N'J.K. Rowling'),
('A007', N'Chuyên gia Clean Code và kiến trúc phần mềm.', N'Robert C. Martin'),
('A008', N'Nhà văn Nhật Bản.', N'Haruki Murakami'),
('A009', N'Giáo viên/nghiên cứu ngôn ngữ.', N'Nguyen Phuong F'),
('A010', N'Tác giả nội dung về AI và Machine Learning.', N'Pham Tri Tue');

INSERT INTO dbo.Category ([Name], [Description]) VALUES
(N'Lập trình', N'Sách phát triển phần mềm và lập trình'),
(N'Kinh tế', N'Tài chính, quản trị và đầu tư'),
(N'Truyện Trinh Thám', N'Sách điều tra và phá án'),
(N'Khoa Học Viễn Tưởng', N'Tương lai, vũ trụ và khoa học giả tưởng'),
(N'Văn học', N'Thơ ca và tiểu thuyết'),
(N'Ngoại ngữ', N'Sách học ngoại ngữ');

INSERT INTO dbo.BibliographicRecord (RecordID, Title, RefBookID, Publisher, [Year], ISBN, Language, Description) VALUES
('R001', N'Lập trình C# cơ bản', NULL, N'Nhà xuất bản Trẻ', 2022, '9780000000001', N'Tiếng Việt', N'Sách nhập môn C#.'),
('R002', N'Bí mật tư duy triệu phú', NULL, N'Nhà xuất bản Tổng hợp HCM', 2018, '9780000000002', N'Tiếng Việt', N'Sách về tư duy tài chính.'),
('R003', N'Sherlock Holmes: Cuộc điều tra cuối cùng', NULL, N'Nhà xuất bản Kim Đồng', 2015, '9780000000003', N'Tiếng Việt', N'Truyện trinh thám.'),
('R004', N'Lập trình Web với ASP.NET', 'R001', N'Nhà xuất bản Trẻ', 2023, '9780000000004', N'Tiếng Việt', N'Tài liệu lập trình web.'),
('R005', N'Dế Mèn Phiêu Lưu Ký', NULL, N'Nhà xuất bản Kim Đồng', 2010, '9780000000005', N'Tiếng Việt', N'Tác phẩm văn học thiếu nhi.'),
('R006', N'Harry Potter và Hòn đá Phù thủy', NULL, N'Nhà xuất bản Trẻ', 2018, '9780000000006', N'Tiếng Việt', N'Tập đầu tiên của bộ truyện.'),
('R007', N'Harry Potter và Phòng chứa Bí mật', 'R006', N'Nhà xuất bản Trẻ', 2019, '9780000000007', N'Tiếng Việt', N'Tập thứ hai của bộ truyện.'),
('R008', N'Harry Potter và Tên tù nhân ngục Azkaban', 'R007', N'Nhà xuất bản Trẻ', 2020, '9780000000008', N'Tiếng Việt', N'Tập thứ ba của bộ truyện.'),
('R009', N'Clean Code: Mã sạch', NULL, N'Nhà xuất bản Khoa học Kỹ thuật', 2017, '9780000000009', N'Tiếng Việt', N'Nguyên tắc viết mã sạch.'),
('R010', N'Clean Architecture: Kiến trúc sạch', NULL, N'Nhà xuất bản Khoa học Kỹ thuật', 2021, '9780000000010', N'Tiếng Việt', N'Kiến trúc phần mềm.'),
('R011', N'Rừng Na Uy', NULL, N'Nhà xuất bản Hội Nhà Văn', 2015, '9780000000011', N'Tiếng Việt', N'Tiểu thuyết.'),
('R012', N'Lập trình C# cơ bản (tái bản lần 2)', 'R001', N'Nhà xuất bản Giáo dục Việt Nam', 2024, '9780000000012', N'Tiếng Việt', N'Bản tái bản.'),
('R013', N'Tiếng Anh giao tiếp cơ bản', NULL, N'Nhà xuất bản Giáo dục Việt Nam', 2020, '9780000000013', N'Tiếng Việt', N'Sách học giao tiếp.');

-- BCrypt placeholder: replace every value with a real BCrypt hash before using login.
DECLARE @PlaceholderHash VARCHAR(255) = '{REPLACE_WITH_BCRYPT_HASH}';

INSERT INTO dbo.[User]
(UserID, Username, [Password], [First Name], [Last Name], Email, SSN, Birthday, [Address], UserType, [Phone Number], [Status])
VALUES
('U0000001', 'admin_lib', @PlaceholderHash, N'Nguyễn', N'Quản Trị', 'admin@lib.edu', '11111111', '1985-01-01', N'Hà Nội', 'Admin', '0901111111', 'Active'),
('U0000002', 'lib_td', @PlaceholderHash, N'Phạm', N'Thủ Thư 1', 'lib1@lib.edu', '22222222', '1990-05-15', N'TP. Thủ Đức', 'Librarian', '0902222222', 'Active'),
('U0000003', 'lib_q1', @PlaceholderHash, N'Lê', N'Thủ Thư 2', 'lib2@lib.edu', '33333333', '1992-10-20', N'Quận 1', 'Librarian', '0903333333', 'Active'),
('U0000004', 'stu_loan', @PlaceholderHash, N'Trần', N'Sinh Viên 1', 'stu1@hcmut.edu.vn', '44444444', '2000-03-08', N'Bình Thạnh', 'Student', '0904444444', 'Active'),
('U0000005', 'stu_cart', @PlaceholderHash, N'Hoàng', N'Sinh Viên 2', 'stu2@hcmut.edu.vn', '55555555', '2001-07-25', N'Quận 5', 'Student', '0905555555', 'Active'),
('U0000006', 'stu_fine', @PlaceholderHash, N'Võ', N'Sinh Viên 3', 'stu3@hcmut.edu.vn', '66666666', '2002-12-10', N'Quận 7', 'Student', '0906666666', 'Active'),
('U0000007', 'lib_b1_new', @PlaceholderHash, N'Ngô', N'Thủ Thư 3', 'lib3@lib.edu', '77777777', '1988-03-01', N'Quận 1', 'Librarian', '0907777777', 'Active'),
('U0000008', 'lib_b3_new', @PlaceholderHash, N'Trịnh', N'Thủ Thư 4', 'lib4@lib.edu', '88888888', '1995-11-25', N'Quận 5', 'Librarian', '0908888888', 'Active'),
('U0000009', 'lib_b4_new', @PlaceholderHash, N'Đinh', N'Thủ Thư 5', 'lib5@lib.edu', '99999999', '1991-04-12', N'Quận 7', 'Librarian', '0909999999', 'Active'),
('U0000010', 'lib_b5_new', @PlaceholderHash, N'Bùi', N'Thủ Thư 6', 'lib6@lib.edu', '10101010', '1993-09-09', N'Gò Vấp', 'Librarian', '0910101010', 'Active'),
('U0000011', 'stu_2010', @PlaceholderHash, N'Cao', N'Sinh Viên 4', 'stu4@hcmut.edu.vn', '11111112', '2000-01-20', N'Bình Thạnh', 'Student', '0911111111', 'Active'),
('U0000012', 'stu_2110', @PlaceholderHash, N'Đỗ', N'Sinh Viên 5', 'stu5@hcmut.edu.vn', '12121212', '2001-08-01', N'Quận 5', 'Student', '0912121212', 'Active'),
('U0000013', 'stu_2210', @PlaceholderHash, N'Đinh', N'Sinh Viên 6', 'stu6@hcmut.edu.vn', '13131313', '2002-04-04', N'Thủ Đức', 'Student', '0913131313', 'Active'),
('U0000014', 'stu_2211', @PlaceholderHash, N'Chu', N'Sinh Viên 7', 'stu7@hcmut.edu.vn', '14141414', '2002-11-11', N'Quận 7', 'Student', '0914141414', 'Active'),
('U0000015', 'stu_2310', @PlaceholderHash, N'Dương', N'Sinh Viên 8', 'stu8@hcmut.edu.vn', '15151515', '2003-05-30', N'Gò Vấp', 'Student', '0915151515', 'Active');

INSERT INTO dbo.[Admin] (UserID, AdminCode) VALUES ('U0000001', 'AD001');

INSERT INTO dbo.Librarian (UserID, [Branch ID]) VALUES
('U0000002', 'B002'),
('U0000003', 'B001'),
('U0000007', 'B001'),
('U0000008', 'B003'),
('U0000009', 'B004'),
('U0000010', 'B005');

INSERT INTO dbo.Student (UserID, [Student ID], [Year]) VALUES
('U0000004', '20100000', 3),
('U0000005', '21100000', 3),
('U0000006', '22100000', 4),
('U0000011', '20100001', 3),
('U0000012', '21100002', 3),
('U0000013', '22100003', 4),
('U0000014', '22100004', 4),
('U0000015', '23100005', 3);

INSERT INTO dbo.Role (RoleName, [Description]) VALUES
('ADMIN', N'Quản trị hệ thống'),
('LIBRARIAN', N'Thủ thư quản lý mượn trả'),
('USER', N'Người dùng thư viện');

INSERT INTO dbo.UserRole (UserID, RoleID)
SELECT u.UserID, r.RoleID
FROM (VALUES
    ('U0000001', 'ADMIN'),
    ('U0000002', 'LIBRARIAN'), ('U0000003', 'LIBRARIAN'),
    ('U0000007', 'LIBRARIAN'), ('U0000008', 'LIBRARIAN'),
    ('U0000009', 'LIBRARIAN'), ('U0000010', 'LIBRARIAN'),
    ('U0000004', 'USER'), ('U0000005', 'USER'), ('U0000006', 'USER'),
    ('U0000011', 'USER'), ('U0000012', 'USER'), ('U0000013', 'USER'),
    ('U0000014', 'USER'), ('U0000015', 'USER')
) AS x(UserID, RoleName)
JOIN dbo.[User] u ON u.UserID = x.UserID
JOIN dbo.Role r ON r.RoleName = x.RoleName;

INSERT INTO dbo.[Book Copy] (BookID, RecordID, [Entry Date], [Branch ID], ManufactureID, [Status], Barcode) VALUES
('C001', 'R001', '2023-01-10', 'B002', 'M001', 'OnLoan', 'BC-C001'),
('C002', 'R001', '2023-01-10', 'B002', 'M001', 'Available', 'BC-C002'),
('C003', 'R002', '2023-03-01', 'B001', 'M002', 'OnLoan', 'BC-C003'),
('C004', 'R002', '2023-03-01', 'B001', 'M002', 'Available', 'BC-C004'),
('C005', 'R003', '2022-11-15', 'B003', 'M003', 'Available', 'BC-C005'),
('C006', 'R003', '2022-11-15', 'B003', 'M003', 'Maintenance', 'BC-C006'),
('C007', 'R004', '2025-02-20', 'B004', 'M004', 'OnLoan', 'BC-C007'),
('C008', 'R004', '2025-02-20', 'B004', 'M004', 'Available', 'BC-C008'),
('C009', 'R005', '2021-05-05', 'B005', 'M005', 'Available', 'BC-C009'),
('C010', 'R005', '2021-05-05', 'B005', 'M005', 'Maintenance', 'BC-C010'),
('C011', 'R006', '2023-06-01', 'B001', 'M002', 'Available', 'BC-C011'),
('C012', 'R006', '2023-06-01', 'B001', 'M002', 'OnLoan', 'BC-C012'),
('C013', 'R006', '2023-06-05', 'B002', 'M002', 'Available', 'BC-C013'),
('C014', 'R006', '2023-06-05', 'B002', 'M002', 'Available', 'BC-C014'),
('C015', 'R006', '2023-07-01', 'B003', 'M002', 'Maintenance', 'BC-C015'),
('C016', 'R006', '2023-07-01', 'B005', 'M002', 'Available', 'BC-C016'),
('C017', 'R009', '2022-01-15', 'B002', 'M004', 'Available', 'BC-C017'),
('C018', 'R009', '2022-01-15', 'B002', 'M004', 'OnLoan', 'BC-C018'),
('C019', 'R009', '2022-02-20', 'B003', 'M004', 'OnLoan', 'BC-C019'),
('C020', 'R009', '2022-02-20', 'B003', 'M004', 'Available', 'BC-C020'),
('C021', 'R011', '2021-12-12', 'B004', 'M005', 'Available', 'BC-C021'),
('C022', 'R011', '2021-12-12', 'B004', 'M005', 'Available', 'BC-C022'),
('C023', 'R011', '2022-03-10', 'B001', 'M005', 'Lost', 'BC-C023'),
('C024', 'R012', '2025-10-01', 'B002', 'M001', 'Available', 'BC-C024'),
('C025', 'R012', '2025-10-01', 'B002', 'M001', 'Available', 'BC-C025'),
('C026', 'R012', '2025-10-05', 'B001', 'M001', 'OnLoan', 'BC-C026'),
('C027', 'R007', '2023-08-15', 'B001', 'M002', 'Available', 'BC-C027'),
('C028', 'R007', '2023-08-15', 'B002', 'M002', 'Available', 'BC-C028'),
('C029', 'R008', '2023-09-20', 'B001', 'M002', 'Available', 'BC-C029'),
('C030', 'R008', '2023-09-20', 'B005', 'M002', 'Available', 'BC-C030');

INSERT INTO dbo.Keywords (RecordID, Keyword) VALUES
('R001', N'Lập trình'), ('R001', N'C#'),
('R002', N'Kinh tế'),
('R003', N'Trinh thám'),
('R004', N'ASP.NET'),
('R006', N'Harry Potter'), ('R006', N'Magic'), ('R006', N'Hogwarts'),
('R007', N'Harry Potter'), ('R007', N'Chamber of Secrets'),
('R009', N'Clean Code'), ('R009', N'Java'), ('R009', N'Refactoring'),
('R010', N'Architecture'), ('R010', N'Design Patterns'),
('R012', N'AI'), ('R012', N'Machine Learning'), ('R012', N'C#'),
('R011', N'Novel'), ('R011', N'Japan');

INSERT INTO dbo.Viet (AuthorID, RecordID) VALUES
('A003', 'R001'), ('A001', 'R002'), ('A002', 'R003'), ('A003', 'R004'), ('A005', 'R005'),
('A006', 'R006'), ('A006', 'R007'), ('A006', 'R008'),
('A007', 'R009'), ('A007', 'R010'), ('A008', 'R011'),
('A003', 'R012'), ('A010', 'R012'), ('A003', 'R013');

INSERT INTO dbo.Thuoc (CategoryName, RecordID) VALUES
(N'Lập trình', 'R001'),
(N'Kinh tế', 'R002'),
(N'Truyện Trinh Thám', 'R003'),
(N'Lập trình', 'R004'),
(N'Văn học', 'R005'),
(N'Văn học', 'R006'), (N'Văn học', 'R007'), (N'Văn học', 'R008'),
(N'Ngoại ngữ', 'R013'),
(N'Lập trình', 'R009'), (N'Lập trình', 'R010'),
(N'Văn học', 'R011'),
(N'Lập trình', 'R012'),
(N'Khoa Học Viễn Tưởng', 'R012');

-- Historical loans. Dates are relative to current date so overdue queries remain useful.
INSERT INTO dbo.Loan (LoanID, LoanDate, [Due Date], ReturnDate, [Status], [Handler ID], BorrowerID, BookID) VALUES
('L001', DATEADD(DAY, -25, CAST(GETDATE() AS DATE)), DATEADD(DAY, -11, CAST(GETDATE() AS DATE)), DATEADD(DAY, -12, CAST(GETDATE() AS DATE)), 'Returned', 'U0000003', 'U0000004', 'C002'),
('L002', DATEADD(DAY, -35, CAST(GETDATE() AS DATE)), DATEADD(DAY, -21, CAST(GETDATE() AS DATE)), NULL, 'OnLoan', 'U0000003', 'U0000004', 'C003'),
('L003', DATEADD(DAY, -18, CAST(GETDATE() AS DATE)), DATEADD(DAY, -4, CAST(GETDATE() AS DATE)), DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), 'Returned', 'U0000002', 'U0000006', 'C004'),
('L004', DATEADD(DAY, -30, CAST(GETDATE() AS DATE)), DATEADD(DAY, -16, CAST(GETDATE() AS DATE)), NULL, 'OnLoan', 'U0000002', 'U0000006', 'C001'),
('L005', DATEADD(DAY, -3, CAST(GETDATE() AS DATE)), DATEADD(DAY, 11, CAST(GETDATE() AS DATE)), NULL, 'OnLoan', 'U0000003', 'U0000004', 'C007'),
('L006', DATEADD(DAY, -20, CAST(GETDATE() AS DATE)), DATEADD(DAY, -6, CAST(GETDATE() AS DATE)), NULL, 'OnLoan', 'U0000002', 'U0000005', 'C012'),
('L007', DATEADD(DAY, -10, CAST(GETDATE() AS DATE)), DATEADD(DAY, 4, CAST(GETDATE() AS DATE)), NULL, 'OnLoan', 'U0000003', 'U0000006', 'C018'),
('L008', DATEADD(DAY, -5, CAST(GETDATE() AS DATE)), DATEADD(DAY, 9, CAST(GETDATE() AS DATE)), NULL, 'OnLoan', 'U0000002', 'U0000004', 'C019');

INSERT INTO dbo.Cart (CartID, InitialDate, [Status], UserID) VALUES
('CT001', CAST(GETDATE() AS DATE), 'Active', 'U0000005'),
('CT002', CAST(GETDATE() AS DATE), 'Active', 'U0000004'),
('CT003', DATEADD(DAY, -5, CAST(GETDATE() AS DATE)), 'Completed', 'U0000006'),
('CT004', DATEADD(DAY, -6, CAST(GETDATE() AS DATE)), 'Cancelled', 'U0000005');

INSERT INTO dbo.[Cart Contain] (CartID, BookID) VALUES
('CT001', 'C005'),
('CT002', 'C008'),
('CT003', 'C009');

INSERT INTO dbo.BorrowRequest (RequestID, CartID, BorrowerID, RequestedAt, [Status], Note) VALUES
('BR0001', NULL, 'U0000005', DATEADD(DAY, -2, SYSDATETIME()), 'Pending', N'Yêu cầu mẫu chờ duyệt.'),
('BR0002', 'CT003', 'U0000006', DATEADD(DAY, -5, SYSDATETIME()), 'Approved', N'Yêu cầu mẫu đã duyệt.');

INSERT INTO dbo.BorrowRequestItem (RequestID, BookID) VALUES
('BR0001', 'C005'),
('BR0002', 'C009');

INSERT INTO dbo.Fine (FineID, Amount, Reason, [Status], HandlerID, LoanID, [Closing Date], ActionDate) VALUES
('F0001', 100000.00, N'Hư hỏng nhẹ bìa sách', 'Paid', 'U0000002', 'L001', DATEADD(DAY, -12, CAST(GETDATE() AS DATE)), DATEADD(DAY, -12, CAST(GETDATE() AS DATE))),
('F0002', 50000.00, N'Trả sách quá hạn', 'Paid', 'U0000002', 'L003', DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), DATEADD(DAY, -2, CAST(GETDATE() AS DATE))),
('F0003', 50000.00, N'Trả sách quá hạn', 'Unpaid', 'U0000002', 'L004', NULL, CAST(GETDATE() AS DATE)),
('F0004', 200000.00, N'Mất sách', 'Unpaid', 'U0000003', 'L002', NULL, CAST(GETDATE() AS DATE));

INSERT INTO dbo.ActivityLog (UserID, Action, EntityType, EntityID, Description) VALUES
('U0000001', 'SEED_DATA_CREATED', 'Database', 'LibraryDB', N'Dữ liệu mẫu ban đầu.'),
('U0000003', 'LOAN_CREATED', 'Loan', 'L005', N'Phiếu mượn mẫu.');

GO

/* =========================================================
   6. TRIGGERS
   ========================================================= */

/* Keep copy status synchronized with loan changes.
   Set-based and handles multi-row INSERT/UPDATE/DELETE. */
CREATE OR ALTER TRIGGER dbo.trg_SyncBookCopyStatus
ON dbo.Loan
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH AffectedCopies AS (
        SELECT BookID FROM inserted
        UNION
        SELECT BookID FROM deleted
    )
    UPDATE bc
       SET [Status] =
           CASE
             WHEN bc.[Status] IN ('Lost', 'Damaged', 'Maintenance', 'Inactive') THEN bc.[Status]
             WHEN EXISTS (
                 SELECT 1
                 FROM dbo.Loan l
                 WHERE l.BookID = bc.BookID
                   AND l.[Status] = 'OnLoan'
             ) THEN 'OnLoan'
             ELSE 'Available'
           END
    FROM dbo.[Book Copy] bc
    JOIN AffectedCopies ac ON ac.BookID = bc.BookID;
END;
GO

/* Do not allow unavailable copies to be added to an active cart.
   A trigger sees all inserted rows and rolls back the whole statement on invalid input. */
CREATE OR ALTER TRIGGER dbo.trg_CheckCartItemAvailable
ON dbo.[Cart Contain]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN dbo.Cart c ON c.CartID = i.CartID
        JOIN dbo.[Book Copy] bc ON bc.BookID = i.BookID
        WHERE c.[Status] <> 'Active'
           OR bc.[Status] <> 'Available'
    )
    BEGIN
        THROW 50010, N'Chỉ được thêm bản sao đang Available vào giỏ Active.', 1;
    END
END;
GO

/* A copy marked Available cannot have an active loan. */
CREATE OR ALTER TRIGGER dbo.trg_ValidateBookCopyStatus
ON dbo.[Book Copy]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE([Status]) AND EXISTS (
        SELECT 1
        FROM inserted i
        JOIN dbo.Loan l ON l.BookID = i.BookID AND l.[Status] = 'OnLoan'
        WHERE i.[Status] = 'Available'
    )
    BEGIN
        THROW 50011, N'Bản sao vẫn đang có lượt mượn hoạt động; hãy xử lý phiếu mượn trước.', 1;
    END
END;
GO

/* =========================================================
   7. FUNCTIONS
   ========================================================= */

CREATE OR ALTER FUNCTION dbo.fn_CalculateFine (@LoanID VARCHAR(8))
RETURNS DECIMAL(12,2)
AS
BEGIN
    DECLARE @DueDate DATE;
    DECLARE @EffectiveReturnDate DATE;
    DECLARE @DailyFineRate DECIMAL(12,2) = 5000.00;

    SELECT
        @DueDate = [Due Date],
        @EffectiveReturnDate = COALESCE(ReturnDate, CAST(GETDATE() AS DATE))
    FROM dbo.Loan
    WHERE LoanID = @LoanID;

    IF @DueDate IS NULL RETURN 0;

    IF @EffectiveReturnDate > @DueDate
        RETURN DATEDIFF(DAY, @DueDate, @EffectiveReturnDate) * @DailyFineRate;

    RETURN 0;
END;
GO

CREATE OR ALTER FUNCTION dbo.fn_ListOverdueBooksByUser (@UserID CHAR(8))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @BookList NVARCHAR(MAX);

    SELECT @BookList = STRING_AGG(br.Title, N', ')
    FROM dbo.Loan l
    JOIN dbo.[Book Copy] bc ON bc.BookID = l.BookID
    JOIN dbo.BibliographicRecord br ON br.RecordID = bc.RecordID
    WHERE l.BorrowerID = @UserID
      AND l.[Status] = 'OnLoan'
      AND l.[Due Date] < CAST(GETDATE() AS DATE);

    RETURN COALESCE(@BookList, N'Không có sách quá hạn.');
END;
GO

/* =========================================================
   8. STORED PROCEDURES
   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.sp_SearchBookByTitle
    @Keyword NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        br.RecordID,
        br.Title,
        br.Publisher,
        br.[Year],
        br.ISBN,
        Authors.AuthorName,
        COUNT(CASE WHEN bc.[Status] = 'Available' THEN 1 END) AS AvailableCopies,
        STRING_AGG(CASE WHEN bc.[Status] = 'Available' THEN bc.BookID END, ', ') AS AvailableBookIDs
    FROM dbo.BibliographicRecord br
    LEFT JOIN dbo.[Book Copy] bc ON bc.RecordID = br.RecordID
    OUTER APPLY (
        SELECT STRING_AGG(a.Fullname, N', ') AS AuthorName
        FROM dbo.Viet v
        JOIN dbo.Author a ON a.SSN = v.AuthorID
        WHERE v.RecordID = br.RecordID
    ) Authors
    WHERE br.Title LIKE N'%' + COALESCE(@Keyword, N'') + N'%'
    GROUP BY br.RecordID, br.Title, br.Publisher, br.[Year], br.ISBN, Authors.AuthorName
    ORDER BY br.Title;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_FilterBooksByCategory
    @CategoryName NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        br.RecordID,
        br.Title,
        br.Publisher,
        br.[Year],
        Authors.AuthorName,
        COUNT(CASE WHEN bc.[Status] = 'Available' THEN 1 END) AS AvailableCopies
    FROM dbo.BibliographicRecord br
    JOIN dbo.Thuoc t ON t.RecordID = br.RecordID
    LEFT JOIN dbo.[Book Copy] bc ON bc.RecordID = br.RecordID
    OUTER APPLY (
        SELECT STRING_AGG(a.Fullname, N', ') AS AuthorName
        FROM dbo.Viet v
        JOIN dbo.Author a ON a.SSN = v.AuthorID
        WHERE v.RecordID = br.RecordID
    ) Authors
    WHERE t.CategoryName = @CategoryName
    GROUP BY br.RecordID, br.Title, br.Publisher, br.[Year], Authors.AuthorName
    ORDER BY br.Title;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetTopBorrowedBooks
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    IF @StartDate IS NULL OR @EndDate IS NULL OR @StartDate > @EndDate
        THROW 50020, N'Khoảng ngày không hợp lệ.', 1;

    SELECT TOP (10)
        br.RecordID,
        br.Title,
        COUNT_BIG(*) AS BorrowCount
    FROM dbo.Loan l
    JOIN dbo.[Book Copy] bc ON bc.BookID = l.BookID
    JOIN dbo.BibliographicRecord br ON br.RecordID = bc.RecordID
    WHERE l.LoanDate BETWEEN @StartDate AND @EndDate
    GROUP BY br.RecordID, br.Title
    ORDER BY BorrowCount DESC, br.Title;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_UpdateBibliographicRecord
    @RecordID VARCHAR(10),
    @Title NVARCHAR(200),
    @RefBookID VARCHAR(10) = NULL,
    @Publisher NVARCHAR(150) = NULL,
    @Year INT = NULL,
    @ISBN VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.BibliographicRecord WHERE RecordID = @RecordID)
        THROW 50021, N'Không tìm thấy đầu sách cần cập nhật.', 1;
    IF NULLIF(LTRIM(RTRIM(@Title)), N'') IS NULL
        THROW 50022, N'Tên sách không được để trống.', 1;
    IF @Year IS NOT NULL AND (@Year < 0 OR @Year > YEAR(GETDATE()))
        THROW 50023, N'Năm xuất bản không hợp lệ.', 1;
    IF @RefBookID = @RecordID
        THROW 50024, N'Đầu sách không thể tham chiếu chính nó.', 1;
    IF @RefBookID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.BibliographicRecord WHERE RecordID = @RefBookID)
        THROW 50025, N'Đầu sách tham chiếu không tồn tại.', 1;

    UPDATE dbo.BibliographicRecord
    SET Title = @Title,
        RefBookID = @RefBookID,
        Publisher = @Publisher,
        [Year] = @Year,
        ISBN = @ISBN,
        UpdatedAt = SYSDATETIME()
    WHERE RecordID = @RecordID;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DeleteBibliographicRecord
    @RecordID VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.BibliographicRecord WHERE RecordID = @RecordID)
        THROW 50026, N'Không tìm thấy đầu sách cần xóa.', 1;
    IF EXISTS (SELECT 1 FROM dbo.[Book Copy] WHERE RecordID = @RecordID)
        THROW 50027, N'Không thể xóa đầu sách còn bản sao. Hãy thanh lý/điều chuyển bản sao theo nghiệp vụ trước.', 1;
    IF EXISTS (SELECT 1 FROM dbo.BibliographicRecord WHERE RefBookID = @RecordID)
        THROW 50028, N'Không thể xóa vì đầu sách đang được đầu sách khác tham chiếu.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;
        DELETE FROM dbo.Viet WHERE RecordID = @RecordID;
        DELETE FROM dbo.Thuoc WHERE RecordID = @RecordID;
        DELETE FROM dbo.Keywords WHERE RecordID = @RecordID;
        DELETE FROM dbo.BibliographicRecord WHERE RecordID = @RecordID;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetActiveCartDetails
    @UserID CHAR(8)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CartID,
        cc.BookID,
        br.RecordID,
        br.Title,
        b.[Branch Name] AS BranchName,
        bc.[Status] AS BookStatus,
        Authors.AuthorName
    FROM dbo.Cart c
    JOIN dbo.[Cart Contain] cc ON cc.CartID = c.CartID
    JOIN dbo.[Book Copy] bc ON bc.BookID = cc.BookID
    JOIN dbo.BibliographicRecord br ON br.RecordID = bc.RecordID
    JOIN dbo.Branch b ON b.[Branch ID] = bc.[Branch ID]
    OUTER APPLY (
        SELECT STRING_AGG(a.Fullname, N', ') AS AuthorName
        FROM dbo.Viet v
        JOIN dbo.Author a ON a.SSN = v.AuthorID
        WHERE v.RecordID = br.RecordID
    ) Authors
    WHERE c.UserID = @UserID AND c.[Status] = 'Active'
    ORDER BY br.Title;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_AddToCart
    @UserID CHAR(8),
    @BookID VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE UserID = @UserID AND [Status] = 'Active')
        THROW 50030, N'Tài khoản không tồn tại hoặc không hoạt động.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @ActiveCartID VARCHAR(8);
        SELECT @ActiveCartID = CartID
        FROM dbo.Cart WITH (UPDLOCK, HOLDLOCK)
        WHERE UserID = @UserID AND [Status] = 'Active';

        IF @ActiveCartID IS NULL
        BEGIN
            DECLARE @CartNumber INT;
            SELECT @CartNumber = ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(CartID, 3, 6))), 0) + 1
            FROM dbo.Cart WITH (UPDLOCK, HOLDLOCK);

            IF @CartNumber > 999999 THROW 50031, N'Đã hết dải mã giỏ hàng.', 1;
            SET @ActiveCartID = 'CT' + RIGHT('000' + CONVERT(VARCHAR(6), @CartNumber), 3);

            INSERT INTO dbo.Cart (CartID, UserID, [Status])
            VALUES (@ActiveCartID, @UserID, 'Active');
        END;

        IF NOT EXISTS (SELECT 1 FROM dbo.[Book Copy] WHERE BookID = @BookID AND [Status] = 'Available')
            THROW 50032, N'Bản sao không tồn tại hoặc hiện không khả dụng.', 1;

        IF EXISTS (SELECT 1 FROM dbo.[Cart Contain] WHERE CartID = @ActiveCartID AND BookID = @BookID)
            THROW 50033, N'Bản sao đã có trong giỏ.', 1;

        INSERT INTO dbo.[Cart Contain] (CartID, BookID) VALUES (@ActiveCartID, @BookID);

        COMMIT TRANSACTION;
        SELECT @ActiveCartID AS CartID, @BookID AS BookID, N'Đã thêm vào giỏ.' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_RemoveFromCart
    @UserID CHAR(8),
    @BookID VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE cc
    FROM dbo.[Cart Contain] cc
    JOIN dbo.Cart c ON c.CartID = cc.CartID
    WHERE c.UserID = @UserID
      AND c.[Status] = 'Active'
      AND cc.BookID = @BookID;

    IF @@ROWCOUNT = 0
        THROW 50034, N'Không tìm thấy bản sao trong giỏ đang hoạt động.', 1;
END;
GO

/* Submit active cart to a pending BorrowRequest. A librarian approves it later.
   This preserves the user's cart workflow without prematurely creating loans. */
CREATE OR ALTER PROCEDURE dbo.sp_CheckoutCart
    @BorrowerID CHAR(8)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @ActiveCartID VARCHAR(8);
        SELECT @ActiveCartID = CartID
        FROM dbo.Cart WITH (UPDLOCK, HOLDLOCK)
        WHERE UserID = @BorrowerID AND [Status] = 'Active';

        IF @ActiveCartID IS NULL
            THROW 50040, N'Người dùng không có giỏ hàng hoạt động.', 1;

        DECLARE @BookCount INT;
        SELECT @BookCount = COUNT(*) FROM dbo.[Cart Contain] WHERE CartID = @ActiveCartID;

        IF @BookCount = 0
            THROW 50041, N'Giỏ hàng đang trống.', 1;
        IF @BookCount > 3
            THROW 50042, N'Giới hạn mỗi yêu cầu là 3 bản sách.', 1;

        IF EXISTS (
            SELECT 1
            FROM dbo.[Cart Contain] cc
            JOIN dbo.[Book Copy] bc ON bc.BookID = cc.BookID
            WHERE cc.CartID = @ActiveCartID AND bc.[Status] <> 'Available'
        )
            THROW 50043, N'Có bản sao trong giỏ không còn khả dụng. Hãy làm mới giỏ.', 1;

        DECLARE @RequestNumber INT;
        SELECT @RequestNumber = ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(RequestID, 3, 8))), 0) + 1
        FROM dbo.BorrowRequest WITH (UPDLOCK, HOLDLOCK);

        IF @RequestNumber > 99999999 THROW 50044, N'Đã hết dải mã yêu cầu mượn.', 1;

        DECLARE @RequestID VARCHAR(10) = 'BR' + RIGHT('00000000' + CONVERT(VARCHAR(8), @RequestNumber), 8);

        INSERT INTO dbo.BorrowRequest (RequestID, CartID, BorrowerID, [Status])
        VALUES (@RequestID, @ActiveCartID, @BorrowerID, 'Pending');

        INSERT INTO dbo.BorrowRequestItem (RequestID, BookID)
        SELECT @RequestID, BookID
        FROM dbo.[Cart Contain]
        WHERE CartID = @ActiveCartID;

        UPDATE dbo.Cart SET [Status] = 'Submitted' WHERE CartID = @ActiveCartID;
        DELETE FROM dbo.[Cart Contain] WHERE CartID = @ActiveCartID;

        COMMIT TRANSACTION;

        SELECT @RequestID AS RequestID, N'Đã gửi yêu cầu mượn, đang chờ duyệt.' AS Message, 'Pending' AS [Status];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/* Approve one pending request and create one loan per requested copy.
   Uses locks and a transaction so two staff members cannot loan the same copy. */
CREATE OR ALTER PROCEDURE dbo.sp_ApproveBorrowRequest
    @RequestID VARCHAR(10),
    @HandlerID CHAR(8)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 FROM dbo.[User]
            WHERE UserID = @HandlerID AND UserType IN ('Admin', 'Librarian') AND [Status] = 'Active'
        )
            THROW 50050, N'Người xử lý không phải Admin/Thủ thư đang hoạt động.', 1;

        IF NOT EXISTS (
            SELECT 1 FROM dbo.BorrowRequest WITH (UPDLOCK, HOLDLOCK)
            WHERE RequestID = @RequestID AND [Status] = 'Pending'
        )
            THROW 50051, N'Yêu cầu không tồn tại hoặc không còn ở trạng thái Pending.', 1;

        IF EXISTS (
            SELECT 1
            FROM dbo.BorrowRequestItem ri
            JOIN dbo.[Book Copy] bc WITH (UPDLOCK, HOLDLOCK) ON bc.BookID = ri.BookID
            WHERE ri.RequestID = @RequestID AND bc.[Status] <> 'Available'
        )
            THROW 50052, N'Có bản sao không còn khả dụng; không thể duyệt yêu cầu.', 1;

        DECLARE @BorrowerID CHAR(8);
        SELECT @BorrowerID = BorrowerID
        FROM dbo.BorrowRequest
        WHERE RequestID = @RequestID;

        DECLARE @NextLoanNumber INT;
        SELECT @NextLoanNumber = ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(LoanID, 2, 7))), 0)
        FROM dbo.Loan WITH (UPDLOCK, HOLDLOCK);

        DECLARE @BookID VARCHAR(10);
        DECLARE @LoanID VARCHAR(8);

        DECLARE loan_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT BookID FROM dbo.BorrowRequestItem WHERE RequestID = @RequestID ORDER BY BookID;

        OPEN loan_cursor;
        FETCH NEXT FROM loan_cursor INTO @BookID;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @NextLoanNumber += 1;
            IF @NextLoanNumber > 9999999 THROW 50053, N'Đã hết dải mã phiếu mượn.', 1;
            SET @LoanID = 'L' + RIGHT('0000000' + CONVERT(VARCHAR(7), @NextLoanNumber), 7);

            INSERT INTO dbo.Loan (LoanID, LoanDate, [Due Date], [Status], [Handler ID], BorrowerID, BookID, RequestID)
            VALUES (@LoanID, CAST(GETDATE() AS DATE), DATEADD(DAY, 14, CAST(GETDATE() AS DATE)),
                    'OnLoan', @HandlerID, @BorrowerID, @BookID, @RequestID);

            FETCH NEXT FROM loan_cursor INTO @BookID;
        END;

        CLOSE loan_cursor;
        DEALLOCATE loan_cursor;

        UPDATE dbo.BorrowRequest
        SET [Status] = 'Approved', ReviewedBy = @HandlerID, ReviewedAt = SYSDATETIME()
        WHERE RequestID = @RequestID;

        COMMIT TRANSACTION;
        SELECT @RequestID AS RequestID, N'Đã duyệt yêu cầu và tạo phiếu mượn.' AS Message;
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('local', 'loan_cursor') >= 0 CLOSE loan_cursor;
        IF CURSOR_STATUS('local', 'loan_cursor') > -3 DEALLOCATE loan_cursor;
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_RejectBorrowRequest
    @RequestID VARCHAR(10),
    @HandlerID CHAR(8),
    @Reason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.[User]
        WHERE UserID = @HandlerID AND UserType IN ('Admin', 'Librarian') AND [Status] = 'Active'
    )
        THROW 50060, N'Người xử lý không phải Admin/Thủ thư đang hoạt động.', 1;

    UPDATE dbo.BorrowRequest
    SET [Status] = 'Rejected',
        ReviewedBy = @HandlerID,
        ReviewedAt = SYSDATETIME(),
        Note = COALESCE(@Reason, Note)
    WHERE RequestID = @RequestID AND [Status] = 'Pending';

    IF @@ROWCOUNT = 0
        THROW 50061, N'Yêu cầu không tồn tại hoặc không còn ở trạng thái Pending.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ReturnBookAndPayFine
    @LoanID VARCHAR(8),
    @HandlerID CHAR(8)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 FROM dbo.[User]
            WHERE UserID = @HandlerID AND UserType IN ('Admin', 'Librarian') AND [Status] = 'Active'
        )
            THROW 50070, N'Người xử lý không phải Admin/Thủ thư đang hoạt động.', 1;

        DECLARE @DueDate DATE;
        DECLARE @ReturnDate DATE = CAST(GETDATE() AS DATE);
        DECLARE @CurrentStatus VARCHAR(20);

        SELECT @DueDate = [Due Date], @CurrentStatus = [Status]
        FROM dbo.Loan WITH (UPDLOCK, HOLDLOCK)
        WHERE LoanID = @LoanID;

        IF @DueDate IS NULL
            THROW 50071, N'Không tìm thấy phiếu mượn.', 1;
        IF @CurrentStatus <> 'OnLoan'
            THROW 50072, N'Phiếu mượn không ở trạng thái OnLoan.', 1;

        DECLARE @FineAmount DECIMAL(12,2) =
            CASE WHEN @ReturnDate > @DueDate
                 THEN DATEDIFF(DAY, @DueDate, @ReturnDate) * CONVERT(DECIMAL(12,2), 5000)
                 ELSE 0 END;

        UPDATE dbo.Loan
        SET ReturnDate = @ReturnDate, [Status] = 'Returned'
        WHERE LoanID = @LoanID;

        /* Only create an overdue fine if one does not already exist.
           Existing damage/loss fines are not overwritten by the overdue calculation. */
        IF @FineAmount > 0 AND NOT EXISTS (
            SELECT 1 FROM dbo.Fine
            WHERE LoanID = @LoanID AND Reason = N'Trả sách quá hạn'
        )
        BEGIN
            DECLARE @FineNumber INT;
            SELECT @FineNumber = ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(FineID, 2, 9))), 0) + 1
            FROM dbo.Fine WITH (UPDLOCK, HOLDLOCK);

            INSERT INTO dbo.Fine (FineID, Amount, Reason, [Status], HandlerID, LoanID)
            VALUES ('F' + RIGHT('000000000' + CONVERT(VARCHAR(9), @FineNumber), 9),
                    @FineAmount, N'Trả sách quá hạn', 'Unpaid', @HandlerID, @LoanID);
        END;

        UPDATE dbo.Fine
        SET [Status] = 'Paid',
            [Closing Date] = @ReturnDate,
            ActionDate = @ReturnDate
        WHERE LoanID = @LoanID
          AND [Status] = 'Unpaid'
          AND Reason = N'Trả sách quá hạn'
          AND @FineAmount = 0;

        COMMIT TRANSACTION;
        SELECT @LoanID AS LoanID, @FineAmount AS CalculatedOverdueFine,
               N'Đã xác nhận trả sách.' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/* =========================================================
   9. DASHBOARD / REPORTING VIEWS
   ========================================================= */

CREATE OR ALTER VIEW dbo.vw_BookInventory
AS
SELECT
    br.RecordID,
    br.Title,
    COUNT(bc.BookID) AS TotalCopies,
    SUM(CASE WHEN bc.[Status] = 'Available' THEN 1 ELSE 0 END) AS AvailableCopies,
    SUM(CASE WHEN bc.[Status] = 'OnLoan' THEN 1 ELSE 0 END) AS BorrowedCopies,
    SUM(CASE WHEN bc.[Status] = 'Maintenance' THEN 1 ELSE 0 END) AS MaintenanceCopies
FROM dbo.BibliographicRecord br
LEFT JOIN dbo.[Book Copy] bc ON bc.RecordID = br.RecordID
GROUP BY br.RecordID, br.Title;
GO

CREATE OR ALTER VIEW dbo.vw_OverdueLoans
AS
SELECT
    l.LoanID,
    l.BorrowerID,
    u.Username,
    CONCAT(u.[First Name], N' ', u.[Last Name]) AS BorrowerName,
    l.BookID,
    br.RecordID,
    br.Title,
    l.LoanDate,
    l.[Due Date],
    DATEDIFF(DAY, l.[Due Date], CAST(GETDATE() AS DATE)) AS DaysOverdue
FROM dbo.Loan l
JOIN dbo.[User] u ON u.UserID = l.BorrowerID
JOIN dbo.[Book Copy] bc ON bc.BookID = l.BookID
JOIN dbo.BibliographicRecord br ON br.RecordID = bc.RecordID
WHERE l.[Status] = 'OnLoan'
  AND l.[Due Date] < CAST(GETDATE() AS DATE);
GO

/* =========================================================
   10. BASIC VALIDATION QUERIES
   ========================================================= */
SELECT * FROM dbo.Branch ORDER BY [Branch ID];
SELECT * FROM dbo.[User] ORDER BY UserID;
SELECT * FROM dbo.vw_BookInventory ORDER BY Title;
SELECT * FROM dbo.vw_OverdueLoans ORDER BY [Due Date];
SELECT RequestID, BorrowerID, [Status], RequestedAt FROM dbo.BorrowRequest ORDER BY RequestedAt DESC;
GO

PRINT N'BK Library schema and sample data created successfully.';
PRINT N'Remember: replace the seed password placeholder with real BCrypt hashes before testing authentication.';
GO
