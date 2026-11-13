const { sql, getPool } = require('../config/database');

const findAll = async (keyword) => {
    const pool = await getPool();
    const request = pool.request();

    let query = `
        SELECT id, name, description
        FROM dbo.categories
    `;

    if (keyword) {
        request.input('keyword', sql.NVarChar, `%${keyword}%`);
        query += `
            WHERE name LIKE @keyword
               OR description LIKE @keyword
        `;
    }

    query += ' ORDER BY name ASC';
    const result = await request.query(query);
    return result.recordset;
};

const findByName = async (name) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('name', sql.NVarChar, name)
        .query(`
            SELECT id, name, description
            FROM dbo.categories
            WHERE name = @name
        `);

    return result.recordset[0] || null;
};

const create = async (name, description) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('name', sql.NVarChar, name)
        .input('description', sql.NVarChar, description)
        .query(`
            INSERT INTO dbo.categories (name, description)
            OUTPUT INSERTED.id, INSERTED.name, INSERTED.description
            VALUES (@name, @description)
        `);

    return result.recordset[0];
};

const update = async (oldName, newName, description) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('oldName', sql.NVarChar, oldName)
        .input('newName', sql.NVarChar, newName)
        .input('description', sql.NVarChar, description)
        .query(`
            UPDATE dbo.categories
            SET name = @newName,
                description = @description
            OUTPUT INSERTED.id, INSERTED.name, INSERTED.description
            WHERE name = @oldName
        `);

    return result.recordset[0] || null;
};

const isUsedByBooks = async (name) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('name', sql.NVarChar, name)
        .query(`
            SELECT TOP 1 b.id
            FROM dbo.books b
            INNER JOIN dbo.categories c ON c.id = b.category_id
            WHERE c.name = @name
        `);

    return result.recordset.length > 0;
};

const remove = async (name) => {
    const pool = await getPool();
    await pool.request()
        .input('name', sql.NVarChar, name)
        .query(`
            DELETE FROM dbo.categories
            WHERE name = @name
        `);
};

module.exports = {
    findAll,
    findByName,
    create,
    update,
    isUsedByBooks,
    remove,
};