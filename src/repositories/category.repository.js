const { sql, getPool } = require('../config/database');

const findAll = async (keyword) => {
    const pool = await getPool();
    const request = pool.request();

    let query = `
        SELECT Name, Description
        FROM Category
    `;

    if (keyword) {
        request.input('Keyword', sql.NVarChar, `%${keyword}%`);

        query += `
            WHERE Name LIKE @Keyword
               OR Description LIKE @Keyword
        `;
    }

    query += ' ORDER BY Name ASC';

    const result = await request.query(query);
    return result.recordset;
};

const findByName = async (name) => {
    const pool = await getPool();

    const result = await pool.request()
        .input('Name', sql.NVarChar, name)
        .query(`
            SELECT Name, Description
            FROM Category
            WHERE Name = @Name
        `);

    return result.recordset[0] || null;
};

const create = async (name, description) => {
    const pool = await getPool();

    const result = await pool.request()
        .input('Name', sql.NVarChar, name)
        .input('Description', sql.NVarChar, description)
        .query(`
            INSERT INTO Category (Name, Description)
            OUTPUT INSERTED.Name, INSERTED.Description
            VALUES (@Name, @Description)
        `);

    return result.recordset[0];
};

const update = async (oldName, newName, description) => {
    const pool = await getPool();

    const result = await pool.request()
        .input('OldName', sql.NVarChar, oldName)
        .input('NewName', sql.NVarChar, newName)
        .input('Description', sql.NVarChar, description)
        .query(`
            UPDATE Category
            SET Name = @NewName,
                Description = @Description
            OUTPUT INSERTED.Name, INSERTED.Description
            WHERE Name = @OldName
        `);

    return result.recordset[0] || null;
};

const isUsedByBooks = async (name) => {
    const pool = await getPool();

    const result = await pool.request()
        .input('Name', sql.NVarChar, name)
        .query(`
            SELECT TOP 1 RecordID
            FROM Thuoc
            WHERE CategoryName = @Name
        `);

    return result.recordset.length > 0;
};

const remove = async (name) => {
    const pool = await getPool();

    await pool.request()
        .input('Name', sql.NVarChar, name)
        .query(`
            DELETE FROM Category
            WHERE Name = @Name
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
