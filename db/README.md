
erDiagram
    Branch ||--o{ Librarian : employs
    Branch ||--o{ BookCopy : stores

    Manufacture ||--o{ BookCopy : supplies

    BibliographicRecord ||--o{ BookCopy : has_copies
    BibliographicRecord o|--o{ BibliographicRecord : references
    BibliographicRecord ||--o{ Keywords : has
    BibliographicRecord ||--o{ Viet : written_by
    Author ||--o{ Viet : writes
    BibliographicRecord ||--o{ Thuoc : classified_by
    Category ||--o{ Thuoc : contains

    User ||--o| Admin : profile
    User ||--o| Student : profile
    User ||--o| Librarian : profile
    User ||--o{ UserRole : assigned
    Role ||--o{ UserRole : includes

    User ||--o{ Cart : owns
    Cart ||--o{ CartContain : contains
    BookCopy ||--o{ CartContain : selected

    Cart o|--o{ BorrowRequest : creates
    User ||--o{ BorrowRequest : requests
    User o|--o{ BorrowRequest : reviews
    BorrowRequest ||--o{ BorrowRequestItem : contains
    BookCopy ||--o{ BorrowRequestItem : requested

    User ||--o{ Loan : borrows
    User ||--o{ Loan : handles
    BookCopy ||--o{ Loan : loaned
    BorrowRequest o|--o{ Loan : generates
    Loan ||--o{ Fine : incurs
    User o|--o{ Fine : handles
    User o|--o{ ActivityLog : performs

    Branch {
        varchar BranchID PK
        varchar BranchName
        varchar Address
        varchar Phone
        varchar Status
    }

    Manufacture {
        varchar ManufactureID PK
        varchar ManuName
        varchar Contact
        varchar Type
    }

    Author {
        varchar SSN PK
        varchar Fullname
        text Biography
    }

    Category {
        varchar Name PK
        varchar Description
    }

    BibliographicRecord {
        varchar RecordID PK
        varchar RefBookID FK
        varchar Title
        varchar Publisher
        int Year
        varchar ISBN
        varchar Language
        text Description
        varchar CoverURL
    }

    BookCopy {
        varchar BookID PK
        varchar RecordID FK
        varchar BranchID FK
        varchar ManufactureID FK
        date EntryDate
        varchar Status
        varchar Barcode
    }

    Keywords {
        varchar RecordID PK,FK
        varchar Keyword PK
    }

    Viet {
        varchar AuthorID PK,FK
        varchar RecordID PK,FK
    }

    Thuoc {
        varchar CategoryName PK,FK
        varchar RecordID PK,FK
    }

    User {
        char UserID PK
        varchar Username
        varchar Password
        varchar Email
        varchar UserType
        varchar Status
    }

    Admin {
        char UserID PK,FK
        varchar AdminCode
    }

    Student {
        char UserID PK,FK
        varchar StudentID
        int Year
    }

    Librarian {
        char UserID PK,FK
        varchar BranchID FK
    }

    Role {
        int RoleID PK
        varchar RoleName
    }

    UserRole {
        char UserID PK,FK
        int RoleID PK,FK
    }

    Cart {
        varchar CartID PK
        char UserID FK
        date InitialDate
        varchar Status
    }

    CartContain {
        varchar CartID PK,FK
        varchar BookID PK,FK
        datetime AddedAt
    }

    BorrowRequest {
        varchar RequestID PK
        varchar CartID FK
        char BorrowerID FK
        char ReviewedBy FK
        datetime RequestedAt
        varchar Status
    }

    BorrowRequestItem {
        varchar RequestID PK,FK
        varchar BookID PK,FK
    }

    Loan {
        varchar LoanID PK
        char HandlerID FK
        char BorrowerID FK
        varchar BookID FK
        varchar RequestID FK
        date LoanDate
        date DueDate
        date ReturnDate
        varchar Status
    }

    Fine {
        varchar FineID PK
        varchar LoanID FK
        char HandlerID FK
        decimal Amount
        varchar Reason
        varchar Status
    }

    ActivityLog {
        bigint ActivityID PK
        char UserID FK
        varchar Action
        varchar EntityType
        varchar EntityID
        datetime CreatedAt
    }
