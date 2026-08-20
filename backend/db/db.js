const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'EmmE_Beauty',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        useUTC: false
    }
};

let pool = null;
let dbAvailable = false;

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then((p) => {
        pool = p;
        dbAvailable = true;
        console.log('✅ Conectado a SQL Server');
        return p;
    })
    .catch((err) => {
        console.warn('⚠️  SQL Server no disponible — usando almacenamiento JSON de prueba');
        return null;
    });

async function getPool() {
    const p = await poolPromise;
    if (!p) throw new Error('DB_UNAVAILABLE');
    return p;
}

function isDbAvailable() {
    return dbAvailable;
}

module.exports = {
    sql,
    dbConfig,
    getPool,
    isDbAvailable,
    poolPromise
};
