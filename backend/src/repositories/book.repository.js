const { getPool, sql } = require('../config/database');

const bookRepository = {
    // Lấy danh sách sách, tìm kiếm, lọc, phân trang kèm số lượng bản sao sẵn có
    async findAll({ keyword, category, year, page = 1, size = 10, sort, order, availability }) {
        const pool = await getPool();
        const request = pool.request();
        const conditions = [];

        if (keyword) {
            request.input('keyword', sql.NVarChar, `%${keyword}%`);
            conditions.push(`
                (
                    b.title LIKE @keyword
                    OR b.isbn LIKE @keyword
                    OR b.author LIKE @keyword
                )
            `);
        }

        if (category) {
            request.input('category', sql.NVarChar, category);
            conditions.push(`c.name = @category`);
        }

        if (year !== undefined && year !== null && year !== '') {
            request.input('year', sql.Int, Number(year));
            conditions.push('b.publish_year = @year');
        }

        if (availability === 'available') {
            conditions.push(`
                EXISTS (
                    SELECT 1 FROM dbo.book_copies bc 
                    WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE'
                    AND NOT EXISTS (SELECT 1 FROM dbo.borrow_requests r WHERE r.copy_id = bc.id AND r.status = 'APPROVED')
                )
            `);
        } else if (availability === 'unavailable') {
            conditions.push(`
                NOT EXISTS (
                    SELECT 1 FROM dbo.book_copies bc 
                    WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE'
                    AND NOT EXISTS (SELECT 1 FROM dbo.borrow_requests r WHERE r.copy_id = bc.id AND r.status = 'APPROVED')
                )
            `);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const sortColumns = {
            title: 'b.title',
            year: 'b.publish_year',
            author: 'b.author',
        };
        const rawSort = String(sort || '').toLowerCase();
        const sortKey = rawSort.replace(/-(asc|desc)$/, '');
        const sortDir = rawSort.endsWith('-desc') || String(order || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const sortColumn = sortColumns[sortKey] || sortColumns[rawSort] || 'b.title';

        const safePage = Math.max(1, Number(page) || 1);
        const safeSize = Math.max(1, Number(size) || 10);

        request.input('offset', sql.Int, (safePage - 1) * safeSize);
        request.input('size', sql.Int, safeSize);

        const result = await request.query(`
            SELECT
                b.id,
                b.title,
                b.isbn,
                b.author,
                b.category_id AS categoryId,
                c.name AS category,
                b.publisher,
                b.publish_year AS [year],
                b.language,
                b.description,
                b.cover_url AS coverUrl,
                (SELECT COUNT(*) FROM dbo.book_copies bc WHERE bc.book_id = b.id) AS totalCopies,
                (SELECT COUNT(*) FROM dbo.book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE'
                    AND NOT EXISTS (SELECT 1 FROM dbo.borrow_requests r WHERE r.copy_id=bc.id AND r.status='APPROVED')) AS availableCopies
            FROM dbo.books b
            LEFT JOIN dbo.categories c ON c.id = b.category_id
            ${whereClause}
            ORDER BY ${sortColumn} ${sortDir}, b.id ${sortDir}
            OFFSET @offset ROWS
            FETCH NEXT @size ROWS ONLY;

            SELECT COUNT(*) AS total
            FROM dbo.books b
            LEFT JOIN dbo.categories c ON c.id = b.category_id
            ${whereClause};
        `);

        return {
            items: result.recordsets[0],
            total: result.recordsets[1][0].total,
        };
    },
    
    async checkBookDeleteConstraints(id) {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM dbo.book_copies WHERE book_id = @id AND status = 'BORROWED') AS activeBorrowedCopies,
                    (SELECT COUNT(*) FROM dbo.borrow_records br
                     INNER JOIN dbo.book_copies bc ON bc.id = br.copy_id
                     WHERE bc.book_id = @id AND br.status IN ('BORROWED', 'OVERDUE')) AS activeLoans,
                    (SELECT COUNT(*) FROM dbo.borrow_records br
                     INNER JOIN dbo.book_copies bc ON bc.id = br.copy_id
                     WHERE bc.book_id = @id) AS totalLoanHistory;
            `);

        return result.recordset[0];
    },

    // Kiểm tra trùng ISBN (Chặn Case 6)
    async findByIsbn(isbn, excludeId = null) {
        if (!isbn) return null;
        const pool = await getPool();
        const request = pool.request().input('isbn', sql.VarChar, isbn);

        let query = `SELECT id, isbn FROM dbo.books WHERE isbn = @isbn`;
        if (excludeId) {
            request.input('excludeId', sql.Int, excludeId);
            query += ` AND id <> @excludeId`;
        }

        const result = await request.query(query);
        return result.recordset[0] || null;
    },
    // Lấy chi tiết đầu sách kèm danh sách các cuốn sách vật lý (Barcode & Vị trí kệ)
    async findById(id) {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT
                    b.id,
                    b.title,
                    b.isbn,
                    b.author,
                    b.category_id AS categoryId,
                    c.name AS category,
                    b.publisher,
                    b.publish_year AS [year],
                    b.language,
                    b.description,
                    b.cover_url AS coverUrl
                FROM dbo.books b
                LEFT JOIN dbo.categories c ON c.id = b.category_id
                WHERE b.id = @id;

                SELECT
                    bc.id AS copyId,
                    barcode,
                    shelf_location AS shelfLocation,
                    CASE WHEN bc.status='AVAILABLE' AND EXISTS(SELECT 1 FROM dbo.borrow_requests r WHERE r.copy_id=bc.id AND r.status='APPROVED')
                        THEN 'RESERVED' ELSE bc.status END AS status,
                    entry_date AS entryDate
                FROM dbo.book_copies bc
                WHERE book_id = @id
                ORDER BY barcode ASC;
            `);

        const book = result.recordsets[0][0];
        if (!book) return null;

        const copies = result.recordsets[1] || [];
        return {
            ...book,
            totalCopies: copies.length,
            availableCopies: copies.filter((c) => c.status === 'AVAILABLE').length,
            copies,
        };
    },

    // Tìm thể loại theo ID số nguyên (Khớp với book.service.js)
    async findCategoryById(categoryId) {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, categoryId)
            .query(`
                SELECT id, name, description
                FROM dbo.categories
                WHERE id = @id;
            `);

        return result.recordset[0] || null;
    },

    // Tạo sách mới và tự động tạo bản sao vật lý (book_copies)
    async create(book) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            request.input('title', sql.NVarChar, book.title);
            request.input('isbn', sql.VarChar, book.isbn || null);
            request.input('author', sql.NVarChar, book.author || 'Chưa rõ');
            request.input('categoryId', sql.Int, book.categoryId ? Number(book.categoryId) : null);
            request.input('publisher', sql.NVarChar, book.publisher || null);
            request.input('year', sql.Int, book.year ?? null);
            request.input('language', sql.NVarChar, book.language || 'Tiếng Việt');
            request.input('description', sql.NVarChar, book.description || null);
            request.input('coverURL', sql.NVarChar, book.coverUrl ? String(book.coverUrl).trim() : null);

            const insertBook = await request.query(`
                INSERT INTO dbo.books (
                    title, isbn, author, category_id, publisher,
                    publish_year, language, description, cover_url
                )
                OUTPUT INSERTED.id
                VALUES (
                    @title, @isbn, @author, @categoryId, @publisher,
                    @year, @language, @description, @coverURL
                );
            `);

            const newBookId = insertBook.recordset[0].id;

            // Nếu truyền kèm mảng copies [{ barcode, shelfLocation }] thì thêm luôn vào book_copies
            if (Array.isArray(book.copies) && book.copies.length > 0) {
                for (const copy of book.copies) {
                    const copyReq = new sql.Request(transaction);
                    copyReq.input('bookId', sql.Int, newBookId);
                    copyReq.input('barcode', sql.VarChar, copy.barcode);
                    copyReq.input('shelfLocation', sql.NVarChar, copy.shelfLocation || 'Kệ Tổng hợp');

                    await copyReq.query(`
                        INSERT INTO dbo.book_copies (book_id, barcode, shelf_location, status)
                        VALUES (@bookId, @barcode, @shelfLocation, 'AVAILABLE');
                    `);
                }
            } else if (book.barcode) {
                // Hỗ trợ tạo nhanh 1 bản sao nếu truyền trực tiếp book.barcode
                const copyReq = new sql.Request(transaction);
                copyReq.input('bookId', sql.Int, newBookId);
                copyReq.input('barcode', sql.VarChar, book.barcode);
                copyReq.input('shelfLocation', sql.NVarChar, book.shelfLocation || 'Kệ Tổng hợp');

                await copyReq.query(`
                    INSERT INTO dbo.book_copies (book_id, barcode, shelf_location, status)
                    VALUES (@bookId, @barcode, @shelfLocation, 'AVAILABLE');
                `);
            } else {
                // Tự động tạo bản sao theo totalCopies (mặc định ít nhất 1 bản sao nếu không chỉ định)
                const numCopies = Math.max(1, Number(book.totalCopies) || 1);
                const numAvailable = (book.availableCopies !== undefined && book.availableCopies !== null && !isNaN(Number(book.availableCopies)))
                    ? Math.max(0, Math.min(Number(book.availableCopies), numCopies))
                    : numCopies;

                for (let i = 1; i <= numCopies; i++) {
                    const copyReq = new sql.Request(transaction);
                    const barcode = `BC-${String(newBookId).padStart(4, '0')}-${String(i).padStart(3, '0')}`;
                    const status = i <= numAvailable ? 'AVAILABLE' : 'MAINTENANCE';
                    copyReq.input('bookId', sql.Int, newBookId);
                    copyReq.input('barcode', sql.VarChar, barcode);
                    copyReq.input('shelfLocation', sql.NVarChar, book.shelfLocation || 'Kệ Tổng hợp');
                    copyReq.input('status', sql.VarChar, status);

                    await copyReq.query(`
                        INSERT INTO dbo.book_copies (book_id, barcode, shelf_location, status)
                        VALUES (@bookId, @barcode, @shelfLocation, @status);
                    `);
                }
            }

            await transaction.commit();
            return await this.findById(newBookId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    // Cập nhật thông tin sách
    async update(id, book) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            request.input('id', sql.Int, id);
            request.input('title', sql.NVarChar, book.title);
            request.input('isbn', sql.VarChar, book.isbn || null);
            request.input('author', sql.NVarChar, book.author || 'Chưa rõ');
            request.input('categoryId', sql.Int, book.categoryId ? Number(book.categoryId) : null);
            request.input('publisher', sql.NVarChar, book.publisher || null);
            request.input('year', sql.Int, book.year ?? null);
            request.input('language', sql.NVarChar, book.language || 'Tiếng Việt');
            request.input('description', sql.NVarChar, book.description || null);
            request.input('coverURL', sql.NVarChar, book.coverUrl ? String(book.coverUrl).trim() : null);

            const result = await request.query(`
                UPDATE dbo.books
                SET
                    title = @title,
                    isbn = @isbn,
                    author = @author,
                    category_id = @categoryId,
                    publisher = @publisher,
                    publish_year = @year,
                    language = @language,
                    description = @description,
                    cover_url = @coverURL,
                    updated_at = SYSDATETIME()
                WHERE id = @id;

                SELECT @@ROWCOUNT AS affectedRows;
            `);

            if (result.recordset[0].affectedRows === 0) {
                await transaction.rollback();
                return null;
            }

            // Đồng bộ số lượng bản sao nếu client truyền totalCopies
            if (book.totalCopies !== undefined && book.totalCopies !== null && !isNaN(Number(book.totalCopies))) {
                const targetTotal = Math.max(0, Number(book.totalCopies));
                const targetAvailable = (book.availableCopies !== undefined && book.availableCopies !== null && !isNaN(Number(book.availableCopies)))
                    ? Math.max(0, Math.min(Number(book.availableCopies), targetTotal))
                    : null;

                const copiesResult = await new sql.Request(transaction)
                    .input('bookId', sql.Int, id)
                    .query(`SELECT id, barcode, status FROM dbo.book_copies WHERE book_id = @bookId ORDER BY id ASC;`);

                const existingCopies = copiesResult.recordset;
                const currentTotal = existingCopies.length;

                if (targetTotal > currentTotal) {
                    for (let i = currentTotal + 1; i <= targetTotal; i++) {
                        const copyReq = new sql.Request(transaction);
                        const barcode = `BC-${String(id).padStart(4, '0')}-${String(i).padStart(3, '0')}`;
                        copyReq.input('bookId', sql.Int, id);
                        copyReq.input('barcode', sql.VarChar, barcode);
                        copyReq.input('shelfLocation', sql.NVarChar, 'Kệ Tổng hợp');

                        await copyReq.query(`
                            INSERT INTO dbo.book_copies (book_id, barcode, shelf_location, status)
                            VALUES (@bookId, @barcode, @shelfLocation, 'AVAILABLE');
                        `);
                    }
                } else if (targetTotal < currentTotal) {
                    const excess = currentTotal - targetTotal;
                    await new sql.Request(transaction)
                        .input('bookId', sql.Int, id)
                        .input('limit', sql.Int, excess)
                        .query(`
                            DELETE FROM dbo.book_copies
                            WHERE id IN (
                                SELECT TOP (@limit) bc.id
                                FROM dbo.book_copies bc
                                WHERE bc.book_id = @bookId
                                  AND bc.status = 'AVAILABLE'
                                  AND NOT EXISTS (SELECT 1 FROM dbo.borrow_records br WHERE br.copy_id = bc.id)
                                  AND NOT EXISTS (SELECT 1 FROM dbo.borrow_requests r WHERE r.copy_id = bc.id)
                                ORDER BY bc.id DESC
                            );
                        `);
                }

                if (targetAvailable !== null) {
                    const currentAvailableRes = await new sql.Request(transaction)
                        .input('bookId', sql.Int, id)
                        .query(`
                            SELECT id, status FROM dbo.book_copies 
                            WHERE book_id = @bookId 
                            ORDER BY CASE WHEN status = 'AVAILABLE' THEN 1 WHEN status = 'MAINTENANCE' THEN 2 ELSE 3 END, id ASC;
                        `);
                    const allCopies = currentAvailableRes.recordset;
                    const availCopies = allCopies.filter(c => c.status === 'AVAILABLE');
                    const maintCopies = allCopies.filter(c => c.status === 'MAINTENANCE');

                    if (targetAvailable < availCopies.length) {
                        const diff = availCopies.length - targetAvailable;
                        const toMaint = availCopies.slice(-diff).map(c => c.id);
                        if (toMaint.length > 0) {
                            await new sql.Request(transaction)
                                .query(`UPDATE dbo.book_copies SET status = 'MAINTENANCE' WHERE id IN (${toMaint.join(',')});`);
                        }
                    } else if (targetAvailable > availCopies.length && maintCopies.length > 0) {
                        const diff = targetAvailable - availCopies.length;
                        const toAvail = maintCopies.slice(0, diff).map(c => c.id);
                        if (toAvail.length > 0) {
                            await new sql.Request(transaction)
                                .query(`UPDATE dbo.book_copies SET status = 'AVAILABLE' WHERE id IN (${toAvail.join(',')});`);
                        }
                    }
                }
            }

            await transaction.commit();
            return await this.findById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    // Xóa sách
    async delete(id) {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM dbo.books
                OUTPUT DELETED.id AS id
                WHERE id = @id;
            `);

        return result.recordset[0] || null;
    },

    // Lấy danh sách thể loại
    async findCategories() {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT id, name, description
            FROM dbo.categories
            ORDER BY name ASC;
        `);

        return result.recordset;
    },
};

module.exports = bookRepository;
