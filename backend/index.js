const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = 3000;

// ==========================================
// 1. MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// 2. CONFIGURACIÓN DE LA BASE DE DATOS
// ==========================================
const dbConfig = {
    user: 'sa',
    password: 'TThmA4bmPfPUk*',
    server: 'localhost', 
    database: 'EmmE_Beauty',
    options: {
        encrypt: true,
        trustServerCertificate: true, // Fundamental para Mac/Docker
        useUTC: false // Fix de Zona Horaria: guarda la hora exacta sin sumar de más
    }
};

// ==========================================
// 3. RUTAS DEL SISTEMA
// ==========================================

// Ruta base para probar si el backend responde
app.get('/', (req, res) => {
    res.send('¡Hola! El backend de EMME Beauty está vivo 💅✨');
});

// --- SECCIÓN: CLIENTAS ---

// Obtener todas las clientas (para armar las tarjetas de la grilla)
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

// Registrar una nueva clienta (¡Ahora con OUTPUT para devolver el nuevo ID!)
app.post('/api/clientas', async (req, res) => {
    try {
        const { Nombre, Apellido, Fecha_Nac, Telefono, Ig } = req.body;
        let pool = await sql.connect(dbConfig);
        
        const resultado = await pool.request()
            .input('Nombre', sql.VarChar, Nombre)
            .input('Apellido', sql.VarChar, Apellido)
            .input('Fecha_Nac', sql.Date, Fecha_Nac || null)
            .input('Telefono', sql.VarChar, Telefono || null)
            .input('Ig', sql.VarChar, Ig || null)
            .query(`
                INSERT INTO Clienta (Nombre, Apellido, Fecha_Nac, Telefono, Ig)
                OUTPUT inserted.Id_Clienta
                VALUES (@Nombre, @Apellido, @Fecha_Nac, @Telefono, @Ig)
            `);
            
        const nuevoId = resultado.recordset[0].Id_Clienta;

        res.status(201).json({ 
            mensaje: "Clienta creada con éxito",
            Id_Clienta: nuevoId 
        });

    } catch (error) {
        console.error("Error al insertar clienta:", error);
        res.status(500).send("Error interno al guardar la clienta");
    }
});

// --- SECCIÓN: EMPLEADOS ---

// Obtener todas las empleadas para armar sus tarjetas
app.get('/api/empleadas', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        // Buscamos todas las chicas en la tabla Empleada
        let result = await pool.request().query("SELECT * FROM Empleada");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error trayendo empleadas: ", err);
        res.status(500).send("Error conectando a la base de datos");
    }
});

// Registrar una nueva empleada
app.post('/api/empleadas', async (req, res) => {
    try {
        const { Nombre_Ap, Dni } = req.body;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Nombre_Ap', sql.VarChar, Nombre_Ap)
            .input('Dni', sql.VarChar, Dni || null)
            .query(`
                INSERT INTO Empleada (Nombre_Ap, Dni)
                VALUES (@Nombre_Ap, @Dni)
            `);
            
        res.status(201).send("Empleada creada correctamente");
    } catch (error) {
        console.error("Error al insertar empleada:", error);
        res.status(500).send("Error interno al guardar la empleada");
    }
});


// --- SECCIÓN: TURNOS ---

// Obtener todos los turnos formateados para FullCalendar
app.get('/api/turnos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        
        const resultado = await pool.request().query(`
            SELECT 
                t.Id_Turno AS id,
                c.Nombre + ' ' + c.Apellido + ' - ' + s.Nombre + ' (' + e.Nombre_Ap + ')' AS title,
                t.Fecha_Hora AS start,
                t.Fecha_Hora_Fin AS [end]
            FROM Turno t
            JOIN Clienta c ON t.Id_Clienta = c.Id_Clienta
            JOIN Empleada e ON t.Id_Empleada = e.Id_Empleada
            JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
        `);
        
        res.json(resultado.recordset);
    } catch (error) {
        console.error("Error trayendo turnos:", error);
        res.status(500).send("Error interno del servidor");
    }
});

// Recibir los datos del formulario y guardar un nuevo turno
app.post('/api/turnos', async (req, res) => {
    try {
        const { Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora } = req.body;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Id_Clienta', sql.Int, Id_Clienta)
            .input('Id_Empleada', sql.Int, Id_Empleada)
            .input('Id_Servicio', sql.Int, Id_Servicio)
            .input('Fecha_Hora', sql.DateTime, Fecha_Hora)
            .query(`
                INSERT INTO Turno (Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Fecha_Hora_Fin, Estado)
                VALUES (@Id_Clienta, @Id_Empleada, @Id_Servicio, @Fecha_Hora, DATEADD(minute, 60, @Fecha_Hora), 'Pendiente')
            `);
            
        res.status(201).send("Turno creado correctamente");
    } catch (error) {
        console.error("Error al insertar el turno:", error);
        res.status(500).send("Error interno al guardar el turno");
    }
});


// ==========================================
// 4. LEVANTAR EL SERVIDOR (Siempre al final)
// ==========================================
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});