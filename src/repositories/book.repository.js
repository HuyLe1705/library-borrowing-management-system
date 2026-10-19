const { getPool, sql } = require('../config/database');

const bookRepository = {
    // Lấy danh sách sách, tìm kiếm, lọc, phân trang kèm số lượng bản sao sẵn có
    async findAll({ keyword, category, year, page = 1, size = 10, sort }) {
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

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const sortColumns = {
            title: 'b.title',
            year: 'b.publish_year',
            author: 'b.author',
        };
        const sortColumn = sortColumns[sort] || 'b.title';

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
                b.cover_url AS coverURL,
                (SELECT COUNT(*) FROM dbo.book_copies bc WHERE bc.book_id = b.id) AS totalCopies,
                (SELECT COUNT(*) FROM dbo.book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') AS availableCopies
            FROM dbo.books b
            LEFT JOIN dbo.categories c ON c.id = b.category_id
            ${whereClause}
            ORDER BY ${sortColumn} ASC, b.id ASC
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
                    b.cover_url AS coverURL
                FROM dbo.books b
                LEFT JOIN dbo.categories c ON c.id = b.category_id
                WHERE b.id = @id;

                SELECT
                    id AS copyId,
                    barcode,
                    shelf_location AS shelfLocation,
                    status,
                    entry_date AS entryDate
                FROM dbo.book_copies
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
            request.input('coverURL', sql.NVarChar, book.coverURL || null);

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
        const request = pool.request();

        request.input('id', sql.Int, id);
        request.input('title', sql.NVarChar, book.title);
        request.input('isbn', sql.VarChar, book.isbn || null);
        request.input('author', sql.NVarChar, book.author || 'Chưa rõ');
        request.input('categoryId', sql.Int, book.categoryId ? Number(book.categoryId) : null);
        request.input('publisher', sql.NVarChar, book.publisher || null);
        request.input('year', sql.Int, book.year ?? null);
        request.input('language', sql.NVarChar, book.language || 'Tiếng Việt');
        request.input('description', sql.NVarChar, book.description || null);
        request.input('coverURL', sql.NVarChar, book.coverURL || null);

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
            return null;
        }

        return await this.findById(id);
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