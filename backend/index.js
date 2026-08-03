require('./config/loadEnv');
const express = require('express');
const cors = require('cors');
const { sql, dbConfig, isDbAvailable, poolPromise } = require('./db/db');
const demo = require('./data/jsonStore');
const whatsappRoutes = require('./routes/whatsapp');
const { iniciarBot, getBotStatus, getCuentaInfo } = require('./whatsapp/bot');
const { getPort, getEmmeConfig } = require('./config/loadEnv');

const app = express();
const port = getPort();

// ==========================================
// 1. MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());

// Rutas WhatsApp
app.use('/api/whatsapp', whatsappRoutes);

// Health check (DB + WhatsApp)
app.get('/api/health', (req, res) => {
    const cuenta = getCuentaInfo();
    const emme = getEmmeConfig();

    res.json({
        status: 'ok',
        port: String(port),
        database: isDbAvailable() ? 'connected' : 'demo',
        whatsapp: getBotStatus(),
        emme: {
            nombre_perfil: cuenta?.nombre_perfil || null,
            numero: cuenta?.numero || null,
            negocio_configurado: emme.nombre,
            direccion: emme.direccion
        }
    });
});

// Turno demo (+3 min) para probar recordatorios WhatsApp
app.post('/api/turnos/demo', async (req, res) => {
    const { nombre_cliente, telefono } = req.body;

    if (!nombre_cliente || !telefono) {
        return res.status(400).json({ error: 'nombre_cliente y telefono son obligatorios' });
    }

    try {
        if (demo.useJsonStore()) {
            const resultado = demo.createTurnoDemo(nombre_cliente, telefono);
            if (resultado.error) return res.status(resultado.error).json({ error: resultado.message });
            return res.status(201).json({ ...resultado, whatsapp_status: getBotStatus(), modo: 'demo' });
        }

        let pool = await sql.connect(dbConfig);

        let clienta = await pool.request()
            .input('Telefono', sql.VarChar, telefono)
            .query(`SELECT TOP 1 Id_Clienta FROM Clienta WHERE Telefono = @Telefono`);

        let idClienta;

        if (clienta.recordset.length > 0) {
            idClienta = clienta.recordset[0].Id_Clienta;
        } else {
            const partes = String(nombre_cliente).trim().split(/\s+/);
            const nombre = partes[0] || 'Prueba';
            const apellido = partes.slice(1).join(' ') || 'Demo';

            const nueva = await pool.request()
                .input('Nombre', sql.VarChar, nombre)
                .input('Apellido', sql.VarChar, apellido)
                .input('Telefono', sql.VarChar, telefono)
                .query(`
                    INSERT INTO Clienta (Nombre, Apellido, Telefono)
                    OUTPUT inserted.Id_Clienta
                    VALUES (@Nombre, @Apellido, @Telefono)
                `);
            idClienta = nueva.recordset[0].Id_Clienta;
        }

        const empleada = await pool.request().query('SELECT TOP 1 Id_Empleada FROM Empleada');
        const servicio = await pool.request().query('SELECT TOP 1 Id_Servicio, Duracion_Minutos FROM Servicio');

        if (empleada.recordset.length === 0 || servicio.recordset.length === 0) {
            return res.status(400).json({ error: 'Necesitás al menos una empleada y un servicio en la base de datos' });
        }

        const idEmpleada = empleada.recordset[0].Id_Empleada;
        const idServicio = servicio.recordset[0].Id_Servicio;

        const resultado = await pool.request()
            .input('Id_Clienta', sql.Int, idClienta)
            .input('Id_Empleada', sql.Int, idEmpleada)
            .input('Id_Servicio', sql.Int, idServicio)
            .query(`
                INSERT INTO Turno (Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Estado)
                OUTPUT inserted.Id_Turno, inserted.Fecha_Hora
                VALUES (
                    @Id_Clienta,
                    @Id_Empleada,
                    @Id_Servicio,
                    DATEADD(MINUTE, 3, GETDATE()),
                    'Pendiente'
                )
            `);

        const turno = resultado.recordset[0];

        res.status(201).json({
            mensaje: 'Turno demo creado. El recordatorio debería enviarse en ~3 minutos si WhatsApp está conectado.',
            id_turno: turno.Id_Turno,
            fecha_hora: turno.Fecha_Hora,
            whatsapp_status: getBotStatus()
        });
    } catch (err) {
        console.error('Error creando turno demo:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. CONFIGURACIÓN DE LA BASE DE DATOS
// ==========================================
// dbConfig importado desde ./db/db.js

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
        if (demo.useJsonStore()) return res.json(demo.getClientas());
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
        if (demo.useJsonStore()) {
            const resultado = demo.createClienta({ Nombre, Apellido, Fecha_Nac, Telefono, Ig });
            return res.status(201).json(resultado);
        }
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
        if (demo.useJsonStore()) {
            if (!demo.updateClienta(id, { Nombre, Apellido, Fecha_Nac, Telefono, Ig })) {
                return res.status(404).send('Clienta no encontrada');
            }
            return res.status(200).send('Clienta actualizada correctamente');
        }
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
        if (demo.useJsonStore()) return res.json(demo.getHistorialClienta(id));
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
        const { fecha } = req.params;
        if (demo.useJsonStore()) return res.json(demo.getTurnosPorFecha(fecha));
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
        if (demo.useJsonStore()) return res.json(demo.getEmpleadas());
        let pool = await sql.connect(dbConfig);
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
        if (demo.useJsonStore()) {
            demo.createEmpleada({ Nombre_Ap, Dni });
            return res.status(201).send('Empleada creada correctamente');
        }
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
        const { id } = req.params;
        if (demo.useJsonStore()) {
            if (!demo.deleteEmpleada(id)) return res.status(404).send('Empleada no encontrada');
            return res.status(200).send('Profesional dada de baja correctamente');
        }
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
        if (demo.useJsonStore()) {
            if (!demo.updateEmpleada(id, { Nombre_Ap, Dni })) return res.status(404).send('Empleada no encontrada');
            return res.status(200).send('Profesional actualizada correctamente');
        }
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
        if (demo.useJsonStore()) return res.json(demo.getTurnosAgenda());
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
        if (demo.useJsonStore()) {
            const resultado = demo.createTurno({ Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora });
            if (resultado.error) return res.status(resultado.error).send(resultado.message);
            return res.status(201).json(resultado);
        }
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
        if (demo.useJsonStore()) return res.json(demo.getServicios());
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
        if (demo.useJsonStore()) return res.json(demo.getCategoriasGasto());
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
        if (demo.useJsonStore()) return res.json(demo.getGastos());
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

// 3. Registrar un nuevo gasto
app.post('/api/gastos', async (req, res) => {
    try {
        const { Fecha, Descripcion, Monto, Id_Categoria } = req.body;
        if (demo.useJsonStore()) {
            demo.createGasto({ Fecha, Descripcion, Monto, Id_Categoria });
            return res.status(201).send('Gasto registrado correctamente');
        }
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
    const idGasto = req.params.id;

    try {
        if (demo.useJsonStore()) {
            if (!demo.deleteGasto(idGasto)) return res.status(404).send('Gasto no encontrado');
            return res.status(200).json({ message: 'Gasto eliminado con éxito' });
        }
        let pool = await sql.connect(dbConfig);

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

// Agregar nueva categoría de gasto
app.post('/api/categorias-gastos', async (req, res) => {
    const { Nombre } = req.body;
    
    if (!Nombre) {
        return res.status(400).send("El nombre es obligatorio");
    }

    try {
        if (demo.useJsonStore()) {
            return res.status(201).json(demo.createCategoriaGasto(Nombre));
        }
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

// ==========================================
// MÓDULO DE EXTRAS
// ==========================================
app.get('/api/extras', async (req, res) => {
    try {
        if (demo.useJsonStore()) return res.json(demo.getExtras());
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
        if (demo.useJsonStore()) return res.json(demo.getIngresos());
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
        if (demo.useJsonStore()) {
            return res.status(201).json(demo.createIngresoManual({ Concepto, Monto_Total, Medio_Pago }));
        }
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
        if (demo.useJsonStore()) {
            const resultado = demo.cobrarTurno({ idTurno, montoTotal, medioPago, descuento, extras });
            if (resultado.error) return res.status(resultado.error).send(resultado.message);
            return res.status(200).json(resultado);
        }
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
    const { Color } = req.body;

    try {
        if (demo.useJsonStore()) {
            if (!demo.updateTurnoDetalles(id, Color)) {
                return res.status(404).send('Turno no encontrado o ya fue cobrado');
            }
            return res.status(200).send('Color agregado a la sesión.');
        }
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
process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    if (msg.includes('Execution context was destroyed') || msg.includes('whatsapp')) {
        console.warn('[WhatsApp] Rechazo no manejado (ignorado):', msg);
        return;
    }
    console.error('Unhandled rejection:', reason);
});

app.listen(port, async () => {
    await poolPromise;

    if (demo.useJsonStore()) {
        demo.loadStore();
        console.log('📁 Modo demo JSON activo — datos en backend/data/demo-store.json');
    }

    console.log(`Servidor corriendo en http://localhost:${port}`);

    iniciarBot().catch((err) => {
        console.error('[WhatsApp] No se pudo iniciar el bot (el servidor web sigue activo):', err.message);
    });
});