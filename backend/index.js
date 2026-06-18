const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de la Base de Datos (Reemplazá con tu contraseña real)
const dbConfig = {
    user: 'sa',
    password: 'TThmA4bmPfPUk*',
    server: 'localhost', 
    database: 'EmmE_Beauty',
    options: {
        encrypt: true,
        trustServerCertificate: true // Fundamental para Mac/Docker
    }
};

// Ruta de prueba para ver si el servidor funciona
app.get('/', (req, res) => {
    res.send('¡Hola! El backend de EMME Beauty está vivo 💅✨');
});

// Ruta para traer todas las clientas desde la base de datos
app.get('/api/clientas', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT * FROM Clienta");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la base de datos: ", err);
        res.status(500).send("Error conectando a la base de datos");
    }
});

// Ruta para guardar una NUEVA clienta en la base de datos
app.post('/api/clientas', async (req, res) => {
    // 1. Agarramos los datos que nos mande el formulario
    const { Nombre, Apellido, Fecha_Nac, Telefono, Ig } = req.body;
    
    try {
        let pool = await sql.connect(dbConfig);
        
        // 2. Armamos la consulta SQL de manera segura (evitando hackeos)
        await pool.request()
            .input('Nombre', sql.VarChar, Nombre)
            .input('Apellido', sql.VarChar, Apellido)
            .input('Fecha_Nac', sql.Date, Fecha_Nac || null)
            .input('Telefono', sql.VarChar, Telefono || null)
            .input('Ig', sql.VarChar, Ig || null)
            .query(`
                INSERT INTO Clienta (Nombre, Apellido, Fecha_Nac, Telefono, Ig) 
                VALUES (@Nombre, @Apellido, @Fecha_Nac, @Telefono, @Ig)
            `);
        
        // 3. Avisamos que todo salió perfecto
        res.status(201).json({ mensaje: "¡Clienta creada con éxito!" });
        
    } catch (err) {
        console.error("Error al crear la clienta: ", err);
        res.status(500).json({ error: "Hubo un error al guardar en la base de datos" });
    }
});

// Levantar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});