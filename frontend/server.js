const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
const PORT = 5000;

// 1. Cấu hình kết nối SQL Server
const dbConfig = {
  user: "sa",
  password: "12345",
  server: "localhost", // SỬA: Phải là localhost hoặc 127.0.0.1
  database: "LibDB",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Middleware
app.use(cors());
app.use(express.json());

// 2. Kết nối Database
sql
  .connect(dbConfig)
  .then((pool) => {
    if (pool.connected) {
      console.log("✅ Đã kết nối thành công tới SQL Server!");
    }
  })
  .catch((err) => {
    console.error("❌ Lỗi kết nối Database:", err);
  });

// ================= API ENDPOINTS =================

// API: Lấy thông tin phiếu mượn (Loan) theo LoanID
app.get("/api/loan/:loanID", async (req, res) => {
  try {
    const { loanID } = req.params;
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("LoanID", sql.VarChar, loanID)
      .query("SELECT LoanID, BorrowerID FROM Loan WHERE LoanID = @LoanID");
    if (result.recordset.length === 0) {
      res.status(404).send("Không tìm thấy phiếu mượn");
    } else {
      res.json(result.recordset[0]);
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// API: Lấy danh sách sách quá hạn của một user
app.get("/api/user/overdue-books/:userID", async (req, res) => {
  try {
    const { userID } = req.params;
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("UserID", sql.Char(8), userID)
      .query("SELECT dbo.fn_ListOverdueBooksByUser(@UserID) AS OverdueBooks");
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// API 1: Tìm kiếm sách
app.get("/api/books/search", async (req, res) => {
  try {
    const { keyword } = req.query;
    const pool = await sql.connect(dbConfig);

    const result = await pool
      .request()
      .input("Keyword", sql.NVarChar(100), keyword)
      .execute("sp_SearchBookByTitle");

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// API 2: Thêm sách mới
app.post("/api/books", async (req, res) => {
  try {
    const { recordID, title, publisher, year } = req.body;
    const pool = await sql.connect(dbConfig);

    await pool
      .request()
      .input("RecordID", sql.VarChar, recordID)
      .input("Title", sql.NVarChar, title)
      .input("Publisher", sql.NVarChar, publisher)
      .input("Year", sql.Int, year).query(`
                INSERT INTO BibliographicRecord (RecordID, Title, Publisher, Year)
                VALUES (@RecordID, @Title, @Publisher, @Year)
            `);

    res.json({ message: "Thêm sách thành công" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// API 3: Kiểm tra tiền phạt (Gọi Function SQL)
app.get("/api/loans/fine/:loanID", async (req, res) => {
    try {
        const { loanID } = req.params;
        const pool = await sql.connect(dbConfig);

        // BƯỚC 1: Kiểm tra xem LoanID có tồn tại và lấy trạng thái Loan
        const loanCheckQuery = `
            SELECT LoanID, [Due Date], ReturnDate, [Status] 
            FROM Loan 
            WHERE LoanID = @LoanID
        `;
        const checkResult = await pool.request()
            .input("LoanID", sql.VarChar, loanID)
            .query(loanCheckQuery);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).send("Lỗi: Không tìm thấy LoanID này trong hệ thống.");
        }

        const loanRecord = checkResult.recordset[0];
        
        // BƯỚC 2: Nếu đã trả sách, trả về lịch sử giao dịch
        if (loanRecord.ReturnDate !== null) {
            const fineHistoryQuery = `
                SELECT 
                    f.FineID, 
                    f.Amount, 
                    f.[Status], 
                    f.ActionDate AS FinePaymentDate,
                    l.ReturnDate
                FROM Fine f
                JOIN Loan l ON f.LoanID = l.LoanID
                WHERE f.LoanID = @LoanID;
            `;
            const fineHistoryResult = await pool.request()
                .input("LoanID", sql.VarChar, loanID)
                .query(fineHistoryQuery);

            return res.json({ 
                FineAmount: 0, // Đã trả, tiền phạt luôn là 0 (hoặc đã paid)
                DaysLate: loanRecord.ReturnDate > loanRecord["Due Date"] 
                            ? Math.max(0, new Date(loanRecord.ReturnDate).getTime() - new Date(loanRecord["Due Date"]).getTime()) / (1000 * 3600 * 24) 
                            : 0,
                // Trả về thông tin giao dịch
                isReturned: true,
                ReturnDate: loanRecord.ReturnDate,
                FineHistory: fineHistoryResult.recordset[0] || { Status: 'No Fine', Amount: 0 } // Đảm bảo trả về dữ liệu
            });
        }
        
        // BƯỚC 3: Nếu chưa trả, tính toán tiền phạt như bình thường
        const fineResult = await pool.request().input("LoanID", sql.VarChar, loanID)
            .query(`
                SELECT dbo.fn_CalculateFine(@LoanID) AS FineAmount,
                DATEDIFF(DAY, (SELECT [Due Date] FROM Loan WHERE LoanID = @LoanID), GETDATE()) AS DaysLate
            `);

        res.json({
            ...fineResult.recordset[0],
            isReturned: false // Đánh dấu chưa trả
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ==========================================================
// API 4 [QUAN TRỌNG]: Trả sách & Thu tiền (ĐÃ SỬA)
// Thay vì UPDATE thủ công, ta gọi Stored Procedure để đảm bảo Transaction
// ==========================================================
app.post("/api/loans/return", async (req, res) => {
  try {
    const { loanID } = req.body;
    const pool = await sql.connect(dbConfig);


    await pool.request()
      .input("LoanID", sql.VarChar, loanID)
      .execute("sp_ReturnBookAndPayFine");

    res.json({ message: "Đã trả sách và thanh toán phạt thành công!" });
  } catch (err) {
    console.error("Lỗi trả sách:", err.message);
    res.status(500).send(err.message);
  }
});
// ==========================================================


// API: Sửa thông tin sách
app.put("/api/books/:id", async (req, res) => {
  try {
    const { id } = req.params; 
    const { title, publisher, year, refBookID } = req.body; 

    const pool = await sql.connect(dbConfig);

    await pool
      .request()
      .input("RecordID", sql.VarChar, id)
      .input("Title", sql.NVarChar, title)
      .input("Publisher", sql.NVarChar, publisher)
      .input("Year", sql.Int, year)
      .input("RefBookID", sql.VarChar, refBookID ? refBookID : null)
      .execute("sp_UpdateBibliographicRecord");

    res.json({ message: "Cập nhật sách thành công!" });
  } catch (err) {
    console.error("Lỗi khi cập nhật:", err.message);
    res.status(500).send(err.message);
  }
});

// API: XÓA thông tin sách
app.delete("/api/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);

    await pool
      .request()
      .input("RecordID", sql.VarChar, id)
      .execute("sp_DeleteBibliographicRecord");

    res.json({ message: "Xóa sách thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa:", err.message);
    res.status(500).send(err.message);
  }
});

// API 6: Lọc sách theo thể loại
app.get("/api/books/filter-by-category", async (req, res) => {
  try {
    const { category } = req.query;
    const pool = await sql.connect(dbConfig);

    const result = await pool
      .request()
      .input("CategoryName", sql.NVarChar(100), category)
      .execute("sp_FilterBooksByCategory");

    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi lọc sách:", err);
    res.status(500).send(err.message);
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT Name FROM Category");
    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi lấy danh mục:", err);
    res.status(500).send(err.message);
  }
});

app.post("/api/insert/books", async (req, res) => {
  console.log("Incoming request body:", req.body); // log luôn
  try {
    const { title, refBookID, publisher, year, authorName, authorID, authorBio } = req.body;

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("Title", sql.NVarChar(200), title)
      .input("RefBookID", sql.VarChar(10), refBookID || null)
      .input("Publisher", sql.NVarChar(100), publisher)
      .input("Year", sql.Int, year)
      .input("AuthorName", sql.NVarChar(100), authorName)
      .input("AuthorID", sql.VarChar(10), authorID)
      .input("AuthorBio", sql.NVarChar(sql.MAX), authorBio)
      .execute("sp_InsertBibliographicRecord");

    console.log("SQL result:", result.recordset);

    const data = result.recordset[0];
    res.json({ id: data.NewRecordID });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "server_error", detail: err.message });
  }
});
// API 7: Lấy chi tiết giỏ hàng đang Active của User
app.get("/api/cart/:userID", async (req, res) => {
  try {
    const { userID } = req.params;
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("UserID", sql.Char(8), userID)
      .execute("sp_GetActiveCartDetails");
    
    // Xử lý trường hợp không có giỏ hàng (recordset rỗng hoặc chỉ chứa message)
    if (result.recordset.length > 0 && result.recordset[0].Message) {
        return res.status(200).json({ books: [], message: result.recordset[0].Message });
    }

    res.json({ books: result.recordset });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// API 8: Thêm sách vào giỏ hàng
app.post("/api/cart/add", async (req, res) => {
  try {
    const { userID, bookID } = req.body;
    const pool = await sql.connect(dbConfig);
    
    await pool
      .request()
      .input("UserID", sql.Char(8), userID)
      .input("BookID", sql.VarChar(10), bookID)
      .execute("sp_AddToCart");

    res.json({ message: "Đã thêm sách vào giỏ hàng." });
  } catch (err) {
    console.error("Lỗi thêm sách vào giỏ:", err.message);
    res.status(500).send(err.message);
  }
});

// API 9: Xóa sách khỏi giỏ hàng
app.post("/api/cart/remove", async (req, res) => {
  try {
    const { userID, bookID } = req.body;
    const pool = await sql.connect(dbConfig);
    
    await pool
      .request()
      .input("UserID", sql.Char(8), userID)
      .input("BookID", sql.VarChar(10), bookID)
      .execute("sp_RemoveFromCart");

    res.json({ message: "Đã xóa sách khỏi giỏ hàng." });
  } catch (err) {
    console.error("Lỗi xóa sách khỏi giỏ:", err.message);
    res.status(500).send(err.message);
  }
});

// API 10: Thanh toán giỏ hàng (Checkout)
app.post("/api/cart/checkout", async (req, res) => {
  try {
    const { borrowerID, handlerID } = req.body;
    const pool = await sql.connect(dbConfig);
    
    // GỌI STORED PROCEDURE SP_CHECKOUTCART
    const result = await pool
      .request()
      .input("BorrowerID", sql.Char(8), borrowerID)
      .input("HandlerID", sql.Char(8), handlerID)
      .execute("sp_CheckoutCart");

    res.json(result.recordset[0]); // Trả về NewRecordID và Status/Message
  } catch (err) {
    console.error("Lỗi thanh toán giỏ hàng:", err.message);
    res.status(500).send(err.message);
  }
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});