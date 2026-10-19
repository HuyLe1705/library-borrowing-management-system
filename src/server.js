require('dotenv').config();
const app = require('./app');

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
    console.log('===================================');
    console.log('       BK LIBRARY BACKEND (LBMS)');
    console.log('===================================');
    console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port        : ${PORT}`);
    console.log(`API         : http://localhost:${PORT}/api`);
    console.log(`Health      : http://localhost:${PORT}/api/health`);
    console.log('===================================');
});

const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Closing server...`);
    server.close((err) => {
        if (err) {
            console.error('Error while closing server:', err);
            process.exitCode = 1;
        } else {
            process.exitCode = 0;
        }
    });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));