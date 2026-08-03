const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = 3000;

// ==========================================================================
// ÍNDICE DEL BACKEND (API REST)
// 1. MIDDLEWARES & CONFIGURACIÓN
// 2. RUTAS: CLIENTAS
// 3. RUTAS: EMPLEADAS
// 4. RUTAS: SERVICIOS & EXTRAS
// 5. RUTAS: TURNOS & AGENDA
// 6. RUTAS: GASTOS & CATEGORÍAS
// 7. RUTAS: INGRESOS & COBROS
// 8. INICIO DEL SERVIDOR
// ==========================================================================


// ==========================================================================
// 1. MIDDLEWARES & CONFIGURACIÓN DE LA BASE DE DATOS
// ==========================================================================
app.use(cors());
app.use(express.json());

const dbConfig = {
    user: 'sa',
    password: 'TThmA4bmPfPUk*',
    server: 'localhost', 
    database: 'EmmE_Beauty',
    options: {
        encrypt: true,
        trustServerCertificate: true, // Fundamental para Mac/Docker
        useUTC: false // Fix de Zona Horaria
    }
};

// Ruta base de testeo
app.get('/', (req, res) => {
    res.send('¡Hola! El backend de EMME Beauty está vivo 💅✨');
});


// ==========================================================================
// 2. RUTAS: CLIENTAS
// ==========================================================================

// Obtener todas las clientas
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

// Registrar una nueva clienta (Devuelve el ID generado)
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
            
        res.status(201).json({ 
            mensaje: "Clienta creada con éxito",
            Id_Clienta: resultado.recordset[0].Id_Clienta 
        });
    } catch (error) {
        console.error("Error al insertar clienta:", error);
        res.status(500).send("Error interno al guardar la clienta");
    }
});

// Actualizar una clienta existente
app.put('/api/clientas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { Nombre, Apellido, Fecha_Nac, Telefono, Ig } = req.body;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Id_Clienta', sql.Int, id)
            .input('Nombre', sql.VarChar, Nombre)
            .input('Apellido', sql.VarChar, Apellido)
            .input('Fecha_Nac', sql.Date, Fecha_Nac || null)
            .input('Telefono', sql.VarChar, Telefono || null)
            .input('Ig', sql.VarChar, Ig || null)
            .query(`
                UPDATE Clienta 
                SET Nombre = @Nombre, Apellido = @Apellido, Fecha_Nac = @Fecha_Nac, Telefono = @Telefono, Ig = @Ig
                WHERE Id_Clienta = @Id_Clienta
            `);
            
        res.status(200).send("Clienta actualizada correctamente");
    } catch (error) {
        console.error("Error al actualizar clienta:", error);
        res.status(500).send("Error interno al actualizar");
    }
});

// Obtener el historial estético de una clienta
app.get('/api/clientas/:id/historial', async (req, res) => {
    try {
        const { id } = req.params;
        let pool = await sql.connect(dbConfig);
        
        let result = await pool.request()
            .input('Id_Clienta', sql.Int, id)
            .query(`
                SELECT 
                    t.Fecha_Hora, 
                    s.Nombre AS Nombre_Servicio, 
                    e.Nombre_Ap,
                    t.Color
                FROM Turno t
                JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
                JOIN Empleada e ON t.Id_Empleada = e.Id_Empleada
                WHERE t.Id_Clienta = @Id_Clienta
                ORDER BY t.Fecha_Hora DESC
            `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error("Error trayendo historial: ", err);
        res.status(500).send("Error conectando a la base de datos");
    }
});


// ==========================================================================
// 3. RUTAS: EMPLEADAS
// ==========================================================================

// Obtener todas las empleadas
app.get('/api/empleadas', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT * FROM Empleada");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error trayendo empleadas: ", err);
        res.status(500).send("Error conectando a la base de datos");
    }
});

// Obtener empleadas habilitadas según el servicio (Filtro Inteligente)
app.get('/api/empleadas/servicio/:idServicio', async (req, res) => {
    try {
        const { idServicio } = req.params;
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('Id_Servicio', sql.Int, idServicio)
            .query(`
                SELECT 
                    e.Id_Empleada, 
                    e.Nombre_Ap AS Nombre, 
                    '' AS Apellido 
                FROM Empleada e
                JOIN Empleada_Area ea ON e.Id_Empleada = ea.Id_Empleada
                JOIN Servicio s ON ea.Area = s.Area
                WHERE s.Id_Servicio = @Id_Servicio
            `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error("Error filtrando empleadas por servicio:", err);
        res.status(500).send("Error interno del servidor");
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
            .query(`INSERT INTO Empleada (Nombre_Ap, Dni) VALUES (@Nombre_Ap, @Dni)`);
            
        res.status(201).send("Empleada creada correctamente");
    } catch (error) {
        console.error("Error al insertar empleada:", error);
        res.status(500).send("Error interno al guardar la empleada");
    }
});

// Actualizar una empleada existente
app.put('/api/empleadas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { Nombre_Ap, Dni } = req.body;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Id_Empleada', sql.Int, id)
            .input('Nombre_Ap', sql.VarChar, Nombre_Ap)
            .input('Dni', sql.VarChar, Dni || null)
            .query(`
                UPDATE Empleada 
                SET Nombre_Ap = @Nombre_Ap, Dni = @Dni
                WHERE Id_Empleada = @Id_Empleada
            `);
            
        res.status(200).send("Profesional actualizada correctamente");
    } catch (error) {
        console.error("Error al actualizar empleada:", error);
        res.status(500).send("Error interno al actualizar");
    }
});

// Eliminar (Dar de baja) una empleada
app.delete('/api/empleadas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Id_Empleada', sql.Int, id)
            .query(`DELETE FROM Empleada WHERE Id_Empleada = @Id_Empleada`);
            
        res.status(200).send("Profesional dada de baja correctamente");
    } catch (error) {
        console.error("Error al eliminar empleada:", error);
        res.status(500).send("Error interno al eliminar la empleada");
    }
});


// ==========================================================================
// 4. RUTAS: SERVICIOS & EXTRAS
// ==========================================================================

// Obtener todos los servicios
app.get('/api/servicios', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query('SELECT Id_Servicio, Nombre FROM Servicio');
        res.json(result.recordset);
    } catch (err) {
        console.error("Error obteniendo servicios:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Obtener todos los extras disponibles
app.get('/api/extras', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT * FROM Extra ORDER BY Nombre");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error obteniendo extras:", err);
        res.status(500).send("Error interno del servidor");
    }
});


// ==========================================================================
// 5. RUTAS: TURNOS & AGENDA
// ==========================================================================

// Obtener todos los turnos formateados para la Agenda Semanal (FullCalendar)
app.get('/api/turnos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const resultado = await pool.request().query(`
            SELECT 
                t.Id_Turno AS id,
                t.Id_Turno,
                t.Id_Empleada,
                c.Nombre + ' ' + c.Apellido + ' - ' + s.Nombre + ' (' + e.Nombre_Ap + ')' AS title,
                t.Fecha_Hora AS start,
                t.Fecha_Hora_Fin AS [end],
                c.Nombre + ' ' + c.Apellido AS Nombre_Clienta,
                s.Nombre AS Nombre_Servicio,
                s.Precio_Base AS Precio
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

// Obtener los turnos de una fecha específica (Agenda Diaria)
app.get('/api/turnos/fecha/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params; 
        let pool = await sql.connect(dbConfig);
        
        let result = await pool.request()
            .input('FechaBuscada', sql.VarChar, fecha)
            .query(`
                SELECT 
                    t.Id_Turno, 
                    t.Fecha_Hora, 
                    c.Nombre + ' ' + c.Apellido AS Nombre_Clienta,
                    s.Nombre AS Nombre_Servicio, 
                    s.Duracion_Minutos,
                    s.Precio_Base, 
                    t.Id_Empleada,
                    t.Estado,
                    t.Color
                FROM Turno t
                JOIN Clienta c ON t.Id_Clienta = c.Id_Clienta
                JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
                WHERE CAST(t.Fecha_Hora AS DATE) = @FechaBuscada
            `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error("Error trayendo turnos de la agenda: ", err);
        res.status(500).send("Error conectando a la base de datos");
    }
});

// Crear un nuevo turno (Con validación de solapamiento)
app.post('/api/turnos', async (req, res) => {
    try {
        const { Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora } = req.body;
        let pool = await sql.connect(dbConfig);

        // Validación: Evitar doble reserva
        const chequeo = await pool.request()
            .input('Id_Empleada', sql.Int, Id_Empleada)
            .input('Fecha_Hora', sql.DateTime, Fecha_Hora)
            .query(`SELECT Id_Turno FROM Turno WHERE Id_Empleada = @Id_Empleada AND Fecha_Hora = @Fecha_Hora`);

        if (chequeo.recordset.length > 0) {
            return res.status(400).send("La profesional ya tiene un turno agendado en ese horario.");
        }

        await pool.request()
            .input('Id_Clienta', sql.Int, Id_Clienta)
            .input('Id_Empleada', sql.Int, Id_Empleada)
            .input('Id_Servicio', sql.Int, Id_Servicio)
            .input('Fecha_Hora', sql.DateTime, Fecha_Hora)
            .query(`
                INSERT INTO Turno (Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora) 
                VALUES (@Id_Clienta, @Id_Empleada, @Id_Servicio, @Fecha_Hora)
            `);
        
        res.status(201).json({ message: "¡Turno creado exitosamente!" });
    } catch (err) {
        console.error("Error al crear turno:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Actualizar detalles del turno durante la sesión (Color/Extras estéticos)
app.put('/api/turnos/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;
        const { Color } = req.body; 
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Id_Turno', sql.Int, id)
            .input('NuevoColor', sql.VarChar, Color)
            .query(`
                UPDATE Turno 
                SET Color = CASE 
                                WHEN Color IS NULL OR Color = '' THEN @NuevoColor 
                                ELSE Color + ' | ' + @NuevoColor 
                            END,
                    Estado = CASE WHEN Estado = 'Pendiente' THEN 'En progreso' ELSE Estado END
                WHERE Id_Turno = @Id_Turno AND Estado != 'Pagado'
            `);
            
        res.status(200).send("Color agregado a la sesión.");
    } catch (error) {
        console.error("Error al guardar detalles:", error);
        res.status(500).send("Error interno al actualizar el turno");
    }
});


// ==========================================================================
// 6. RUTAS: GASTOS & CATEGORÍAS
// ==========================================================================

// Obtener categorías de gastos
app.get('/api/categorias-gastos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT * FROM Categoria_Gasto ORDER BY Nombre");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error obteniendo categorías de gastos:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Crear nueva categoría de gasto
app.post('/api/categorias-gastos', async (req, res) => {
    try {
        const { Nombre } = req.body;
        if (!Nombre) return res.status(400).send("El nombre es obligatorio");

        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Nombre', sql.VarChar, Nombre)
            .query(`INSERT INTO Categoria_Gasto (Nombre) VALUES (@Nombre)`);
            
        res.status(201).json({ message: "¡Categoría creada exitosamente!" });
    } catch (err) {
        console.error("Error creando categoría:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Obtener todos los gastos
app.get('/api/gastos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(`
            SELECT 
                g.Id_Gasto, 
                g.Fecha, 
                g.Descripcion, 
                g.Monto, 
                c.Nombre AS Nombre_Categoria
            FROM Gasto g
            LEFT JOIN Categoria_Gasto c ON g.Id_Categoria = c.Id_Categoria
            ORDER BY g.Fecha DESC, g.Id_Gasto DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error obteniendo gastos:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Registrar un nuevo gasto
app.post('/api/gastos', async (req, res) => {
    try {
        const { Fecha, Descripcion, Monto, Id_Categoria } = req.body;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Fecha', sql.Date, Fecha)
            .input('Descripcion', sql.VarChar, Descripcion)
            .input('Monto', sql.Decimal(12, 2), Monto)
            .input('Id_Categoria', sql.Int, Id_Categoria || null)
            .query(`
                INSERT INTO Gasto (Fecha, Descripcion, Monto, Id_Categoria)
                VALUES (@Fecha, @Descripcion, @Monto, @Id_Categoria)
            `);
            
        res.status(201).send("Gasto registrado correctamente");
    } catch (error) {
        console.error("Error al registrar gasto:", error);
        res.status(500).send("Error interno al guardar el gasto");
    }
});

// Eliminar un gasto
app.delete('/api/gastos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('Id_Gasto', sql.Int, id)
            .query(`DELETE FROM Gasto WHERE Id_Gasto = @Id_Gasto`);

        if (result.rowsAffected[0] > 0) {
            res.status(200).json({ message: "Gasto eliminado con éxito" });
        } else {
            res.status(404).send("Gasto no encontrado");
        }
    } catch (err) {
        console.error("Error al eliminar el gasto:", err);
        res.status(500).send("Error interno del servidor al intentar eliminar");
    }
});


// ==========================================================================
// 7. RUTAS: INGRESOS & COBROS
// ==========================================================================

// Obtener todos los ingresos
app.get('/api/ingresos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(`
            SELECT 
                i.Id_Ingreso, 
                i.Fecha, 
                i.Monto_Total, 
                i.Medio_Pago,
                i.Concepto, 
                c.Nombre + ' ' + c.Apellido AS Nombre_Clienta,
                s.Nombre AS Nombre_Servicio
            FROM Ingreso i
            LEFT JOIN Turno t ON i.Id_Turno = t.Id_Turno
            LEFT JOIN Clienta c ON t.Id_Clienta = c.Id_Clienta
            LEFT JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
            ORDER BY i.Fecha DESC, i.Id_Ingreso DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error obteniendo ingresos:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Registrar un ingreso manual (Venta mostrador, extras sin turno)
app.post('/api/ingresos/manual', async (req, res) => {
    try {
        const { Concepto, Monto_Total, Medio_Pago } = req.body;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Concepto', sql.VarChar, Concepto)
            .input('Monto_Total', sql.Decimal(10,2), Monto_Total)
            .input('Medio_Pago', sql.VarChar, Medio_Pago)
            .query(`
                INSERT INTO Ingreso (Fecha, Monto_Total, Medio_Pago, Descuento_Aplicado, Concepto)
                VALUES (GETDATE(), @Monto_Total, @Medio_Pago, 0, @Concepto)
            `);
            
        res.status(201).json({ message: "Ingreso manual registrado" });
    } catch (err) {
        console.error("Error al registrar ingreso manual:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Cobrar un turno completo (El Patovica Financiero)
app.post('/api/cobrar-turno', async (req, res) => {
    try {
        const { idTurno, montoTotal, medioPago, descuento, extras } = req.body;
        let pool = await sql.connect(dbConfig);
        
        // 1. Verificación de seguridad
        const chequeo = await pool.request()
            .input('Id_Turno', sql.Int, idTurno)
            .query(`SELECT Estado FROM Turno WHERE Id_Turno = @Id_Turno`);
        
        if (chequeo.recordset.length === 0) return res.status(404).send("Turno no encontrado");
        if (chequeo.recordset[0].Estado === 'Pagado') {
            return res.status(400).send("¡Ojo! Este turno ya fue cobrado.");
        }

        // Transacción para asegurar que todo se guarde junto
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Guardar ingreso
            const requestIngreso = new sql.Request(transaction);
            await requestIngreso
                .input('Id_Turno', sql.Int, idTurno)
                .input('Monto_Total', sql.Decimal(12, 2), montoTotal)
                .input('Medio_Pago', sql.VarChar, medioPago)
                .input('Descuento', sql.Decimal(12, 2), descuento)
                .query(`
                    INSERT INTO Ingreso (Id_Turno, Fecha, Monto_Total, Medio_Pago, Descuento_Aplicado)
                    VALUES (@Id_Turno, GETDATE(), @Monto_Total, @Medio_Pago, @Descuento)
                `);
            
            // Guardar extras
            if (extras && extras.length > 0) {
                for (let idExtra of extras) {
                    const requestExtra = new sql.Request(transaction);
                    await requestExtra
                        .input('Id_Turno', sql.Int, idTurno)
                        .input('Id_Extra', sql.Int, idExtra)
                        .query(`INSERT INTO Turno_Extra (Id_Turno, Id_Extra) VALUES (@Id_Turno, @Id_Extra)`);
                }
            }
            
            // Actualizar estado del turno
            const requestEstado = new sql.Request(transaction);
            await requestEstado
                .input('Id_Turno', sql.Int, idTurno)
                .query(`UPDATE Turno SET Estado = 'Pagado' WHERE Id_Turno = @Id_Turno`);
            
            await transaction.commit();
            res.status(200).json({ message: "¡Cobro registrado exitosamente!" });
            
        } catch (err) {
            await transaction.rollback();
            throw err; 
        }
    } catch (err) {
        console.error("Error al registrar el cobro:", err);
        res.status(500).send("Error interno del servidor");
    }
});


// ==========================================================================
// 8. INICIO DEL SERVIDOR
// ==========================================================================
app.listen(port, () => {
    console.log(`Servidor corriendo impecable en http://localhost:${port} 🚀`);
});