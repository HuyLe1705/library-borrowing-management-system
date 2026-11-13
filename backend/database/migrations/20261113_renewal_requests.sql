-- Run once against an existing BK Library database before starting the updated API.
IF OBJECT_ID('dbo.renewal_requests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.renewal_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        borrow_record_id INT NOT NULL REFERENCES dbo.borrow_records(id),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
            CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
        note NVARCHAR(500) NULL,
        admin_note NVARCHAR(500) NULL,
        reviewed_by INT NULL REFERENCES dbo.users(id),
        original_due_date DATE NOT NULL,
        new_due_date DATE NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        reviewed_at DATETIME2 NULL
    );
    CREATE UNIQUE INDEX ux_renewal_pending ON dbo.renewal_requests(borrow_record_id) WHERE status='PENDING';
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.borrow_requests') AND name='idx_borrow_requests_copy_status')
    CREATE INDEX idx_borrow_requests_copy_status ON dbo.borrow_requests(copy_id,status);
