require('../config/loadEnv');
const fs = require('fs');
const path = require('path');
const { sql, dbConfig, poolPromise } = require('../db/db');

async function migrate() {
    await poolPromise;

    const pool = await sql.connect(dbConfig);

    const check = await pool.request().query(`
        SELECT COL_LENGTH('Turno', 'recordatorio_enviado') AS col_exists
    `);

    if (check.recordset[0].col_exists !== null) {
        console.log('✅ La columna recordatorio_enviado ya existe en Turno.');
        await pool.close();
        return;
    }

    await pool.request().query(`
        ALTER TABLE Turno ADD recordatorio_enviado BIT NOT NULL DEFAULT 0
    `);

    console.log('✅ Migración aplicada: columna recordatorio_enviado agregada a Turno.');
    await pool.close();
}

migrate().catch((err) => {
    console.error('❌ Error en la migración:', err.message);
    process.exit(1);
});
