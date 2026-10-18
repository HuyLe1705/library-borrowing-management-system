const { getPool, sql } = require('../config/database');

const bookRepository = {
    // Lấy danh sách sách, tìm kiếm, lọc và phân trang
    async findAll({
        keyword,
        category,
        year,
        page = 1,
        size = 10,
        sort,
    }) {
        const pool = await getPool();
        const request = pool.request();

        const conditions = [];

        if (keyword) {
            request.input('keyword', sql.NVarChar, `%${keyword}%`);

            conditions.push(`
                (
                    b.Title LIKE @keyword
                    OR b.ISBN LIKE @keyword
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.Viet v
                        INNER JOIN dbo.Author a
                            ON a.SSN = v.AuthorID
                        WHERE v.RecordID = b.RecordID
                          AND a.Fullname LIKE @keyword
                    )
                )
            `);
        }

        if (category) {
            request.input('category', sql.NVarChar, category);

            conditions.push(`
                EXISTS (
                    SELECT 1
                    FROM dbo.Thuoc t
                    INNER JOIN dbo.Category c
                        ON c.Name = t.CategoryName
                    WHERE t.RecordID = b.RecordID
                      AND c.Name = @category
                )
            `);
        }

        if (year !== undefined && year !== null && year !== '') {
            request.input('year', sql.Int, Number(year));
            conditions.push('b.[Year] = @year');
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // Chỉ cho phép các cột được chỉ định để tránh SQL injection.
        const sortColumns = {
            title: 'b.Title',
            year: 'b.[Year]',
            author: 'Author',
        };

        const sortColumn = sortColumns[sort] || 'b.Title';

        const safePage = Math.max(1, Number(page) || 1);
        const safeSize = Math.max(1, Number(size) || 10);

        request.input('offset', sql.Int, (safePage - 1) * safeSize);
        request.input('size', sql.Int, safeSize);

        const result = await request.query(`
            SELECT
                b.RecordID AS id,
                b.Title AS title,
                b.ISBN AS isbn,
                b.Publisher AS publisher,
                b.[Year] AS year,
                b.Language AS language,
                b.Description AS description,
                b.CoverURL AS coverURL,

                (
                    SELECT STRING_AGG(a.Fullname, N', ')
                    FROM dbo.Viet v
                    INNER JOIN dbo.Author a
                        ON a.SSN = v.AuthorID
                    WHERE v.RecordID = b.RecordID
                ) AS author,

                (
                    SELECT STRING_AGG(c.Name, N', ')
                    FROM dbo.Thuoc t
                    INNER JOIN dbo.Category c
                        ON c.Name = t.CategoryName
                    WHERE t.RecordID = b.RecordID
                ) AS category

            FROM dbo.BibliographicRecord b

            ${whereClause}

            ORDER BY ${sortColumn} ASC, b.RecordID ASC
            OFFSET @offset ROWS
            FETCH NEXT @size ROWS ONLY;

            SELECT COUNT(*) AS total
            FROM dbo.BibliographicRecord b
            ${whereClause};
        `);

        return {
            items: result.recordsets[0],
            total: result.recordsets[1][0].total,
        };
    },

    // Lấy chi tiết sách
    async findById(id) {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT
                    b.RecordID AS id,
                    b.Title AS title,
                    b.RefBookID AS refBookId,
                    b.ISBN AS isbn,
                    b.Publisher AS publisher,
                    b.[Year] AS year,
                    b.Language AS language,
                    b.Description AS description,
                    b.CoverURL AS coverURL,

                    (
                        SELECT STRING_AGG(a.Fullname, N', ')
                        FROM dbo.Viet v
                        INNER JOIN dbo.Author a
                            ON a.SSN = v.AuthorID
                        WHERE v.RecordID = b.RecordID
                    ) AS author,

                    (
                        SELECT STRING_AGG(c.Name, N', ')
                        FROM dbo.Thuoc t
                        INNER JOIN dbo.Category c
                            ON c.Name = t.CategoryName
                        WHERE t.RecordID = b.RecordID
                    ) AS category

                FROM dbo.BibliographicRecord b
                WHERE b.RecordID = @id;
            `);

        return result.recordset[0] || null;
    },

    // Tìm thể loại theo tên, do Category không có CategoryID
    async findCategoryById(categoryName) {
        const pool = await getPool();

        const result = await pool.request()
            .input('name', sql.NVarChar, categoryName)
            .query(`
                SELECT Name AS id, Name AS name
                FROM dbo.Category
                WHERE Name = @name;
            `);

        return result.recordset[0] || null;
    },

    // Tạo sách và các liên kết tác giả/thể loại
    async create(book) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            request.input('id', sql.VarChar, book.id);
            request.input('title', sql.NVarChar, book.title);
            request.input('refBookId', sql.VarChar, book.refBookId || null);
            request.input('isbn', sql.VarChar, book.isbn || null);
            request.input('publisher', sql.NVarChar, book.publisher || null);
            request.input('year', sql.Int, book.year ?? null);
            request.input('language', sql.NVarChar, book.language || null);
            request.input('description', sql.NVarChar, book.description || null);
            request.input('coverURL', sql.NVarChar, book.coverURL || null);

            await request.query(`
                INSERT INTO dbo.BibliographicRecord (
                    RecordID,
                    Title,
                    RefBookID,
                    ISBN,
                    Publisher,
                    [Year],
                    Language,
                    Description,
                    CoverURL,
                    CreatedAt,
                    UpdatedAt
                )
                VALUES (
                    @id,
                    @title,
                    @refBookId,
                    @isbn,
                    @publisher,
                    @year,
                    @language,
                    @description,
                    @coverURL,
                    SYSDATETIME(),
                    SYSDATETIME()
                );
            `);

            await this._replaceRelations(transaction, book.id, book);

            await transaction.commit();

            return await this.findById(book.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    // Cập nhật thông tin sách và các liên kết
    async update(id, book) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            request.input('id', sql.VarChar, id);
            request.input('title', sql.NVarChar, book.title);
            request.input('refBookId', sql.VarChar, book.refBookId || null);
            request.input('isbn', sql.VarChar, book.isbn || null);
            request.input('publisher', sql.NVarChar, book.publisher || null);
            request.input('year', sql.Int, book.year ?? null);
            request.input('language', sql.NVarChar, book.language || null);
            request.input('description', sql.NVarChar, book.description || null);
            request.input('coverURL', sql.NVarChar, book.coverURL || null);

            const result = await request.query(`
                UPDATE dbo.BibliographicRecord
                SET
                    Title = @title,
                    RefBookID = @refBookId,
                    ISBN = @isbn,
                    Publisher = @publisher,
                    [Year] = @year,
                    Language = @language,
                    Description = @description,
                    CoverURL = @coverURL,
                    UpdatedAt = SYSDATETIME()
                WHERE RecordID = @id;

                SELECT @@ROWCOUNT AS affectedRows;
            `);

            if (result.recordset[0].affectedRows === 0) {
                await transaction.rollback();
                return null;
            }

            await this._replaceRelations(transaction, id, book);

            await transaction.commit();

            return await this.findById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    // Thay thế các liên kết tác giả và thể loại của một cuốn sách.
    // book.authorIds: mảng AuthorID.
    // book.categories: mảng tên thể loại.
    async _replaceRelations(transaction, recordId, book) {
        const authorIds = Array.isArray(book.authorIds)
            ? book.authorIds
            : [];

        const categories = Array.isArray(book.categories)
            ? book.categories
            : [];

        const deleteRequest = new sql.Request(transaction);
        deleteRequest.input('recordId', sql.VarChar, recordId);

        await deleteRequest.query(`
            DELETE FROM dbo.Viet
            WHERE RecordID = @recordId;

            DELETE FROM dbo.Thuoc
            WHERE RecordID = @recordId;
        `);

        for (const authorId of authorIds) {
            const request = new sql.Request(transaction);

            request.input('recordId', sql.VarChar, recordId);
            request.input('authorId', sql.VarChar, authorId);

            await request.query(`
                IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.Author
                    WHERE SSN = @authorId
                )
                BEGIN
                    THROW 50001, 'Author does not exist.', 1;
                END;

                INSERT INTO dbo.Viet (AuthorID, RecordID)
                VALUES (@authorId, @recordId);
            `);
        }

        for (const categoryName of categories) {
            const request = new sql.Request(transaction);

            request.input('recordId', sql.VarChar, recordId);
            request.input('categoryName', sql.NVarChar, categoryName);

            await request.query(`
                IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.Category
                    WHERE Name = @categoryName
                )
                BEGIN
                    THROW 50002, 'Category does not exist.', 1;
                END;

                INSERT INTO dbo.Thuoc (CategoryName, RecordID)
                VALUES (@categoryName, @recordId);
            `);
        }
    },

    // Xóa sách
    async delete(id) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const request = new sql.Request(transaction);
            request.input('id', sql.VarChar, id);

            const existing = await request.query(`
                SELECT RecordID
                FROM dbo.BibliographicRecord
                WHERE RecordID = @id;
            `);

            if (existing.recordset.length === 0) {
                await transaction.rollback();
                return null;
            }

            // Xóa liên kết trước khi xóa bản ghi sách.
            await request.query(`
                DELETE FROM dbo.Viet WHERE RecordID = @id;
                DELETE FROM dbo.Thuoc WHERE RecordID = @id;
            `);

            const result = await request.query(`
                DELETE FROM dbo.BibliographicRecord
                OUTPUT DELETED.RecordID AS id
                WHERE RecordID = @id;
            `);

            await transaction.commit();

            return result.recordset[0] || null;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    // Lấy danh sách thể loại
    async findCategories() {
        const pool = await getPool();

        const result = await pool.request().query(`
            SELECT
                Name AS id,
                Name AS name,
                Description AS description
            FROM dbo.Category
            ORDER BY Name;
        `);

        return result.recordset;
    },
};

module.exports = bookRepository;