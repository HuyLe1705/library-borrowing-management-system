const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME,

    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate:
            process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },

    connectionTimeout: 15000,
    requestTimeout: 15000,
};

let poolPromise;

const getPool = async () => {
    if (!poolPromise) {
        const pool = new sql.ConnectionPool(dbConfig);

        pool.on('error', (err) => {
            console.error('SQL Server pool error:', err.message);
        });

        poolPromise = pool.connect().catch((err) => {
            poolPromise = null;
            throw err;
        });
    }

    return poolPromise;
};

module.exports = {
    sql,
    getPool,
};