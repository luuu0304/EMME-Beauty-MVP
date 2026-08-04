const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = Number(process.env.PORT) || 3000;

// ==========================================
// 1. MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// 2. CONFIGURACIÓN DE LA BASE DE DATOS
// ==========================================
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME,
    options: {
        encrypt: process.env.DB_ENCRYPT !== 'false',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        useUTC: process.env.DB_USE_UTC === 'true'
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

// Actualizar (Editar) una clienta existente
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

// Obtener el historial de turnos de una clienta
app.get('/api/clientas/:id/historial', async (req, res) => {
    try {
        const { id } = req.params;
        let pool = await sql.connect(dbConfig);
        
        // Hacemos un JOIN para traer los nombres del servicio y la empleada, ordenados por fecha
        let result = await pool.request()
            .input('Id_Clienta', sql.Int, id)
            .query(`
                SELECT t.Fecha_Hora, s.Nombre AS Nombre_Servicio, e.Nombre_Ap
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

// ==========================================
// MÓDULO DE AGENDA DIARIA
// ==========================================
// Obtener los turnos de una fecha específica
app.get('/api/turnos/fecha/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params; // Llega en formato YYYY-MM-DD
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

// Dar de baja (eliminar) una empleada
app.delete('/api/empleadas/:id', async (req, res) => {
    try {
        const { id } = req.params; // Agarramos el ID que viene en la URL
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Id_Empleada', sql.Int, id)
            .query(`
                DELETE FROM Empleada 
                WHERE Id_Empleada = @Id_Empleada
            `);
            
        res.status(200).send("Profesional dada de baja correctamente");
    } catch (error) {
        console.error("Error al eliminar empleada:", error);
        res.status(500).send("Error interno al eliminar la empleada");
    }
});

// Actualizar (Editar) una empleada existente
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


// --- SECCIÓN: TURNOS ---

// Obtener todos los turnos formateados para la Agenda
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
                s.Precio AS Precio
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

// Recibir los datos del formulario y guardar un nuevo turno con validación
app.post('/api/turnos', async (req, res) => {
    const { Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora } = req.body;

    try {
        let pool = await sql.connect(dbConfig);

        // 1. VALIDACIÓN: Revisar si la profesional ya tiene un turno en esa fecha y hora exacta
        const chequeo = await pool.request().query(`
            SELECT Id_Turno FROM Turno 
            WHERE Id_Empleada = ${Id_Empleada} AND Fecha_Hora = '${Fecha_Hora}'
        `);

        // Si recordset tiene al menos 1 elemento, significa que el horario está ocupado
        if (chequeo.recordset.length > 0) {
            // Frenamos todo y le mandamos un error 400 (Bad Request) al frontend
            return res.status(400).send("La profesional ya tiene un turno agendado en ese horario.");
        }

        // 2. Si el horario está libre, procedemos a guardar el turno
        await pool.request().query(`
            INSERT INTO Turno (Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora) 
            VALUES (${Id_Clienta}, ${Id_Empleada}, ${Id_Servicio}, '${Fecha_Hora}')
        `);
        
        res.status(201).json({ message: "¡Turno creado exitosamente!" });

    } catch (err) {
        console.error("Error al crear turno:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// ==========================================
// MÓDULO DE SERVICIOS
// ==========================================
// Obtener todos los servicios para el desplegable
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
// ==========================================
// MÓDULO DE GASTOS
// ==========================================

// 1. Obtener las categorías para el menú desplegable
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

// 2. Obtener todos los gastos para la tabla
app.get('/api/gastos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        // Hacemos un JOIN para traer el nombre de la categoría en lugar del número
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

// 3. Registrar un nuevo gasto
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

// 4. Eliminar un gasto
app.delete('/api/gastos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('Id_Gasto', sql.Int, id)
            .query(`DELETE FROM Gasto WHERE Id_Gasto = @Id_Gasto`);
            
        res.status(200).send("Gasto eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        res.status(500).send("Error interno al eliminar el gasto");
    }
});

// Agregar nueva categoría de gasto
app.post('/api/categorias-gastos', async (req, res) => {
    const { Nombre } = req.body;
    
    if (!Nombre) {
        return res.status(400).send("El nombre es obligatorio");
    }

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request().query(`
            INSERT INTO Categoria_Gasto (Nombre) 
            VALUES ('${Nombre}')
        `);
        res.status(201).json({ message: "¡Categoría creada exitosamente!" });
    } catch (err) {
        console.error("Error creando categoría:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// ELIMINAR UN GASTO
app.delete('/api/gastos/:id', async (req, res) => {
    const idGasto = req.params.id;

    try {
        let pool = await sql.connect(dbConfig);
        
        // Ejecutamos la consulta para borrar el registro por su ID
        const result = await pool.request().query(`
            DELETE FROM Gasto 
            WHERE Id_Gasto = ${idGasto}
        `);

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

// ==========================================
// MÓDULO DE EXTRAS
// ==========================================
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

// ==========================================
// MÓDULO DE COBROS E INGRESOS
// ==========================================

// Obtener todos los ingresos para la tabla (Mejorado para manuales)
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
            -- Usamos LEFT JOIN para que traiga la plata aunque no tenga turno asignado
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

// Registrar un nuevo ingreso manual (Sin turno)
app.post('/api/ingresos/manual', async (req, res) => {
    const { Concepto, Monto_Total, Medio_Pago } = req.body;
    try {
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

app.post('/api/cobrar-turno', async (req, res) => {
    const { idTurno, montoTotal, medioPago, descuento, extras } = req.body;
    
    try {
        let pool = await sql.connect(dbConfig);
        
        // 1. EL PATOVICA: Revisamos el estado antes de cobrar
        const chequeo = await pool.request().query(`
            SELECT Estado FROM Turno WHERE Id_Turno = ${idTurno}
        `);
        
        if (chequeo.recordset.length === 0) return res.status(404).send("Turno no encontrado");
        if (chequeo.recordset[0].Estado === 'Pagado') {
            return res.status(400).send("¡Ojo! Este turno ya fue cobrado.");
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // 2. Guardar la plata en Ingreso
            const requestIngreso = new sql.Request(transaction);
            await requestIngreso.query(`
                INSERT INTO Ingreso (Id_Turno, Fecha, Monto_Total, Medio_Pago, Descuento_Aplicado)
                VALUES (${idTurno}, GETDATE(), ${montoTotal}, '${medioPago}', ${descuento})
            `);
            
            // 3. Guardar extras en Turno_Extra
            if (extras && extras.length > 0) {
                for (let idExtra of extras) {
                    const requestExtra = new sql.Request(transaction);
                    await requestExtra.query(`
                        INSERT INTO Turno_Extra (Id_Turno, Id_Extra)
                        VALUES (${idTurno}, ${idExtra})
                    `);
                }
            }
            
            // 4. MAGIA: Cambiar el estado del turno a "Pagado"
            const requestEstado = new sql.Request(transaction);
            await requestEstado.query(`
                UPDATE Turno SET Estado = 'Pagado' WHERE Id_Turno = ${idTurno}
            `);
            
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

// Actualizar detalles del turno durante la sesión (Ej: Anotar color)
// Agregar un color/detalle a la sesión
app.put('/api/turnos/:id/detalles', async (req, res) => {
    const { id } = req.params;
    const { Color } = req.body; // Este es el color NUEVO que se agrega

    try {
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

// ==========================================
// 4. LEVANTAR EL SERVIDOR (Siempre al final)
// ==========================================
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});