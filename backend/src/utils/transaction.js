const { getPool, sql } = require('../config/database');

module.exports = async function inTransaction(work) {
    const transaction = new sql.Transaction(await getPool());
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const result = await work(() => new sql.Request(transaction));
        await transaction.commit();
        return result;
    } catch (error) {
        try { await transaction.rollback(); } catch { /* SQL Server may already have rolled back a deadlock. */ }
        throw error;
    }
};
