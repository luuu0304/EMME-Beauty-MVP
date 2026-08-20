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

// ==========================================================================
// ÍNDICE DEL BACKEND (API REST)
// 1. MIDDLEWARES & CONFIGURACIÓN
// 2. RUTAS: CLIENTAS
// 3. RUTAS: EMPLEADAS
// 4. RUTAS: SERVICIOS & EXTRAS
// 5. RUTAS: TURNOS & AGENDA
// 6. RUTAS: GASTOS & CATEGORÍAS
// 7. RUTAS: INGRESOS & COBROS
// 8. RUTAS: DASHBOARD Y RESÚMENES
// 9. INICIO DEL SERVIDOR
// ==========================================================================


// ==========================================================================
// 1. MIDDLEWARES & CONFIGURACIÓN DE LA BASE DE DATOS
// ==========================================================================
app.use(cors());
app.use(express.json());
app.use('/api/whatsapp', whatsappRoutes);

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
        const resultado = await pool.request()
            .input('Id_Clienta', sql.Int, idClienta)
            .input('Id_Empleada', sql.Int, empleada.recordset[0].Id_Empleada)
            .input('Id_Servicio', sql.Int, servicio.recordset[0].Id_Servicio)
            .query(`
                INSERT INTO Turno (Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Estado)
                OUTPUT inserted.Id_Turno, inserted.Fecha_Hora
                VALUES (@Id_Clienta, @Id_Empleada, @Id_Servicio, DATEADD(MINUTE, 3, GETDATE()), 'Pendiente')
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
        if (demo.useJsonStore()) return res.json(demo.getClientas());
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

// Obtener el historial estético de una clienta
app.get('/api/clientas/:id/historial', async (req, res) => {
    try {
        const { id } = req.params;
        if (demo.useJsonStore()) return res.json(demo.getHistorialClienta(id));
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

// Obtener todas las empleadas con su saldo acumulado, info de su última liquidación y sus áreas
app.get('/api/empleadas', async (req, res) => {
    try {
        if (demo.useJsonStore()) return res.json(demo.getEmpleadas());
        let pool = await sql.connect(dbConfig);
        
        let result = await pool.request().query(`
            SELECT 
                e.Id_Empleada,
                e.Nombre_Ap,
                e.DNI,
                e.Telefono,
                ISNULL(Saldo.Saldo_Acumulado, 0) AS Saldo_Acumulado,
                UltimaLiq.Fecha_Pago AS Ultima_Fecha_Liq,
                UltimaLiq.Monto_Abonado AS Ultimo_Monto_Liq,
                AreasInfo.Areas -- NUEVO: Traemos el texto con las áreas
            FROM Empleada e
            
            -- 1. Subconsulta para el saldo acumulado actual
            LEFT JOIN (
                SELECT 
                    t.Id_Empleada, 
                    SUM((s.Precio_Base + ISNULL(Extras.Total_Extras, 0)) * ISNULL(ea.Porcentaje_Comision, 0.50)) AS Saldo_Acumulado
                FROM Turno t
                JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
                LEFT JOIN Empleada_Area ea ON t.Id_Empleada = ea.Id_Empleada AND s.Area = ea.Area
                LEFT JOIN (
                    SELECT Id_Turno, SUM(Precio) as Total_Extras
                    FROM Turno_Extra te
                    JOIN Extra ex ON te.Id_Extra = ex.Id_Extra
                    GROUP BY Id_Turno
                ) Extras ON t.Id_Turno = Extras.Id_Turno
                WHERE t.Estado = 'Pagado' AND t.Liquidado = 0
                GROUP BY t.Id_Empleada
            ) Saldo ON e.Id_Empleada = Saldo.Id_Empleada
            
            -- 2. Subconsulta para buscar el último recibo emitido
            OUTER APPLY (
                SELECT TOP 1 Fecha_Pago, Monto_Abonado
                FROM Liquidacion_Sueldo ls
                WHERE ls.Id_Empleada = e.Id_Empleada
                ORDER BY Fecha_Pago DESC
            ) UltimaLiq

            -- 3. NUEVO: Subconsulta para traer las áreas separadas por coma
            OUTER APPLY (
                SELECT STRING_AGG(ea.Area, ',') AS Areas
                FROM Empleada_Area ea
                WHERE ea.Id_Empleada = e.Id_Empleada
            ) AreasInfo
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error trayendo empleadas y saldos: ", err);
        res.status(500).send("Error conectando a la base de datos");
    }
});

// Obtener empleadas habilitadas según el servicio (Filtro Inteligente)
app.get('/api/empleadas/servicio/:idServicio', async (req, res) => {
    try {
        const { idServicio } = req.params;
        if (demo.useJsonStore()) return res.json(demo.getEmpleadasPorServicio(idServicio));
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
        if (demo.useJsonStore()) {
            demo.createEmpleada({ Nombre_Ap, Dni });
            return res.status(201).send('Empleada creada correctamente');
        }
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

// Eliminar (Dar de baja) una empleada
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
            .query(`DELETE FROM Empleada WHERE Id_Empleada = @Id_Empleada`);
            
        res.status(200).send("Profesional dada de baja correctamente");
    } catch (error) {
        console.error("Error al eliminar empleada:", error);
        res.status(500).send("Error interno al eliminar la empleada");
    }
});

// Obtener el detalle de los turnos pendientes de cobro para una empleada
app.get('/api/empleadas/:id/sueldo-detalle', async (req, res) => {
    try {
        const { id } = req.params;
        if (demo.useJsonStore()) return res.json(demo.getSueldoDetalle(id));
        let pool = await sql.connect(dbConfig);
        
        let result = await pool.request()
            .input('Id_Empleada', sql.Int, id)
            .query(`
                SELECT 
                    t.Id_Turno,
                    t.Fecha_Hora,
                    c.Nombre + ' ' + c.Apellido AS Nombre_Clienta,
                    s.Nombre AS Nombre_Servicio,
                    (s.Precio_Base + ISNULL(Extras.Total_Extras, 0)) AS Total_Abonado,
                    ISNULL(ea.Porcentaje_Comision, 0.50) AS Porcentaje_Comision,
                    ((s.Precio_Base + ISNULL(Extras.Total_Extras, 0)) * ISNULL(ea.Porcentaje_Comision, 0.50)) AS A_Cobrar
                FROM Turno t
                JOIN Clienta c ON t.Id_Clienta = c.Id_Clienta
                JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
                LEFT JOIN Empleada_Area ea ON t.Id_Empleada = ea.Id_Empleada AND s.Area = ea.Area
                LEFT JOIN (
                    SELECT Id_Turno, SUM(Precio) as Total_Extras
                    FROM Turno_Extra te
                    JOIN Extra ex ON te.Id_Extra = ex.Id_Extra
                    GROUP BY Id_Turno
                ) Extras ON t.Id_Turno = Extras.Id_Turno
                WHERE t.Id_Empleada = @Id_Empleada 
                  AND t.Estado = 'Pagado' 
                  AND t.Liquidado = 0
                ORDER BY t.Fecha_Hora DESC
            `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error("Error trayendo detalle de sueldo: ", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Liquidar el sueldo pendiente de una empleada
app.post('/api/empleadas/:id/liquidar', async (req, res) => {
    const { id } = req.params;
    
    try {
        if (demo.useJsonStore()) {
            const resultado = demo.liquidarSueldo(id);
            if (resultado.error) return res.status(resultado.error).send(resultado.message);
            return res.status(200).json(resultado);
        }
        let pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // 1. Calcular cuánto se le debe exactamente en este momento para evitar errores
            const requestCalc = new sql.Request(transaction);
            const resultCalc = await requestCalc
                .input('Id_Empleada', sql.Int, id)
                .query(`
                    SELECT 
                        ISNULL(SUM((s.Precio_Base + ISNULL(Extras.Total_Extras, 0)) * ISNULL(ea.Porcentaje_Comision, 0.50)), 0) AS Monto_A_Pagar
                    FROM Turno t
                    JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
                    LEFT JOIN Empleada_Area ea ON t.Id_Empleada = ea.Id_Empleada AND s.Area = ea.Area
                    LEFT JOIN (
                        SELECT Id_Turno, SUM(Precio) as Total_Extras
                        FROM Turno_Extra te
                        JOIN Extra ex ON te.Id_Extra = ex.Id_Extra
                        GROUP BY Id_Turno
                    ) Extras ON t.Id_Turno = Extras.Id_Turno
                    WHERE t.Id_Empleada = @Id_Empleada AND t.Estado = 'Pagado' AND t.Liquidado = 0
                `);
            
            const montoTotal = resultCalc.recordset[0].Monto_A_Pagar;
            
            if (montoTotal <= 0) {
                await transaction.rollback();
                return res.status(400).send("No hay saldo pendiente para liquidar.");
            }

            // 2. Crear el recibo en Liquidacion_Sueldo
            const requestLiq = new sql.Request(transaction);
            const resultLiq = await requestLiq
                .input('Id_Empleada', sql.Int, id)
                .input('Monto', sql.Decimal(12, 2), montoTotal)
                .query(`
                    INSERT INTO Liquidacion_Sueldo (Id_Empleada, Monto_Abonado)
                    OUTPUT inserted.Id_Liquidacion
                    VALUES (@Id_Empleada, @Monto)
                `);
                
            const idLiquidacion = resultLiq.recordset[0].Id_Liquidacion;
            
            // 3. Marcar los turnos como liquidados
            const requestUpdate = new sql.Request(transaction);
            await requestUpdate
                .input('Id_Empleada', sql.Int, id)
                .input('Id_Liquidacion', sql.Int, idLiquidacion)
                .query(`
                    UPDATE Turno 
                    SET Liquidado = 1, Id_Liquidacion = @Id_Liquidacion 
                    WHERE Id_Empleada = @Id_Empleada 
                      AND Estado = 'Pagado' 
                      AND Liquidado = 0
                `);
                
            await transaction.commit();
            res.status(200).json({ message: "Sueldo liquidado con éxito" });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Error al liquidar sueldo:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Gestión de ÁREAS Y COMISONES

// Obtener todas las áreas únicas que existen en la tabla Servicio
app.get('/api/areas', async (req, res) => {
    try {
        if (demo.useJsonStore()) return res.json(demo.getAreas());
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT DISTINCT Area FROM Servicio WHERE Area IS NOT NULL");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error obteniendo áreas:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Obtener las áreas y comisiones asignadas a una empleada específica
app.get('/api/empleadas/:id/areas', async (req, res) => {
    try {
        const { id } = req.params;
        if (demo.useJsonStore()) return res.json(demo.getEmpleadaAreas(id));
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('Id_Empleada', sql.Int, id)
            .query("SELECT Area, Porcentaje_Comision FROM Empleada_Area WHERE Id_Empleada = @Id_Empleada");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error obteniendo áreas de la empleada:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Guardar la nueva configuración de áreas y comisiones
app.post('/api/empleadas/:id/areas', async (req, res) => {
    const { id } = req.params;
    const { areas } = req.body; // Recibe un array ej: [{ area: 'Manicura', comision: 0.50 }]

    try {
        if (demo.useJsonStore()) {
            demo.setEmpleadaAreas(id, areas);
            return res.status(200).send('Configuración guardada correctamente');
        }
        let pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Limpiamos las áreas anteriores de esta empleada
            await new sql.Request(transaction)
                .input('Id_Empleada', sql.Int, id)
                .query("DELETE FROM Empleada_Area WHERE Id_Empleada = @Id_Empleada");

            // 2. Insertamos las nuevas áreas con sus porcentajes
            if (areas && areas.length > 0) {
                for (let item of areas) {
                    await new sql.Request(transaction)
                        .input('Id_Empleada', sql.Int, id)
                        .input('Area', sql.VarChar, item.area)
                        .input('Comision', sql.Decimal(3,2), item.comision)
                        .query("INSERT INTO Empleada_Area (Id_Empleada, Area, Porcentaje_Comision) VALUES (@Id_Empleada, @Area, @Comision)");
                }
            }

            await transaction.commit();
            res.status(200).send("Configuración guardada correctamente");
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Error guardando áreas:", err);
        res.status(500).send("Error interno del servidor");
    }
});


// ==========================================================================
// 4. RUTAS: SERVICIOS & EXTRAS
// ==========================================================================

// Obtener todos los servicios
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

// Obtener todos los extras disponibles
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


// ==========================================================================
// 5. RUTAS: TURNOS & AGENDA
// ==========================================================================

// Obtener todos los turnos formateados para la Agenda Semanal (FullCalendar)
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
                    e.Nombre_Ap, -- ¡Acá agregamos la columna que faltaba!
                    t.Estado,
                    t.Color,
                    t.Sena_Monto
                FROM Turno t
                JOIN Clienta c ON t.Id_Clienta = c.Id_Clienta
                JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
                JOIN Empleada e ON t.Id_Empleada = e.Id_Empleada -- ¡Y acá unimos la tabla!
                WHERE CAST(t.Fecha_Hora AS DATE) = @FechaBuscada
            `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error("Error trayendo turnos de la agenda: ", err);
        res.status(500).send("Error conectando a la base de datos");
    }
});

// Crear un nuevo turno (Con validación de rango de tiempo y registro de Ingreso)
app.post('/api/turnos', async (req, res) => {
    const { Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Sena_Monto } = req.body;

    try {
        if (demo.useJsonStore()) {
            const resultado = demo.createTurno({ Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Sena_Monto });
            if (resultado.error) return res.status(resultado.error).send(resultado.message);
            return res.status(201).json(resultado);
        }
        let pool = await sql.connect(dbConfig);

        // 1. Primero averiguamos cuánto dura el servicio nuevo que queremos agendar
        const infoServicio = await pool.request()
            .input('Id_Servicio', sql.Int, Id_Servicio)
            .query(`SELECT Duracion_Minutos FROM Servicio WHERE Id_Servicio = @Id_Servicio`);
        
        const duracionNueva = infoServicio.recordset[0].Duracion_Minutos;

        // 2. Validación de solapamiento (RANGOS DE TIEMPO)
        const chequeo = await pool.request()
            .input('Id_Empleada', sql.Int, Id_Empleada)
            .input('NuevaFechaInicio', sql.DateTime, Fecha_Hora)
            .input('DuracionNueva', sql.Int, duracionNueva)
            .query(`
                SELECT t.Id_Turno 
                FROM Turno t
                JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
                WHERE t.Id_Empleada = @Id_Empleada
                AND (
                    -- El turno nuevo empieza ANTES de que termine el existente...
                    @NuevaFechaInicio < DATEADD(MINUTE, s.Duracion_Minutos, t.Fecha_Hora)
                    -- ...Y el turno nuevo termina DESPUÉS de que empiece el existente
                    AND DATEADD(MINUTE, @DuracionNueva, @NuevaFechaInicio) > t.Fecha_Hora
                )
            `);

        if (chequeo.recordset.length > 0) {
            return res.status(400).send("La profesional ya tiene un turno que se superpone en ese horario.");
        }

        // 3. Insertamos el turno normal
        await pool.request()
            .input('Id_Clienta', sql.Int, Id_Clienta)
            .input('Id_Empleada', sql.Int, Id_Empleada)
            .input('Id_Servicio', sql.Int, Id_Servicio)
            .input('Fecha_Hora', sql.DateTime, Fecha_Hora)
            .input('Sena_Monto', sql.Decimal(10,2), Sena_Monto || 0)
            .query(`
                INSERT INTO Turno (Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Sena_Monto) 
                VALUES (@Id_Clienta, @Id_Empleada, @Id_Servicio, @Fecha_Hora, @Sena_Monto);

                -- 4. SI HAY SEÑA, REGISTRAMOS EL INGRESO AUTOMÁTICAMENTE
                IF (@Sena_Monto > 0)
                BEGIN
                    DECLARE @NombreC VARCHAR(100);
                    SELECT @NombreC = Nombre + ' ' + Apellido FROM Clienta WHERE Id_Clienta = @Id_Clienta;
                    
                    INSERT INTO Ingreso (Concepto, Monto_Total, Fecha, Medio_Pago) 
                    VALUES ('Seña abonada - ' + @NombreC, @Sena_Monto, GETDATE(), 'Transferencia');
                END
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

// ACTUALIZAR SEÑA DE UN TURNO (Y registrar el ingreso automáticamente)
app.put('/api/turnos/:id/sena', async (req, res) => {
    const { id } = req.params;
    const { Sena_Monto, Nombre_Clienta } = req.body; // <-- Nombre corregido
    
    try {
        if (demo.useJsonStore()) {
            const resultado = demo.actualizarSena(id, Sena_Monto, Nombre_Clienta);
            if (resultado.error) return res.status(resultado.error).json({ error: resultado.message });
            return res.json(resultado);
        }
        let pool = await sql.connect(dbConfig);
        
        // 1. Guardamos la seña en el turno
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Monto', sql.Decimal(10,2), Sena_Monto)
            .query('UPDATE Turno SET Sena_Monto = @Monto WHERE Id_Turno = @Id'); // <-- Columna correcta
            
        // 2. Si la seña es mayor a 0, la registramos como un Ingreso en la caja de hoy
        if (Sena_Monto > 0) {
            await pool.request()
                .input('Concepto', sql.VarChar, `Seña abonada - ${Nombre_Clienta}`)
                .input('Monto', sql.Decimal(10,2), Sena_Monto)
                .input('Medio', sql.VarChar, 'Transferencia') // Asumimos transferencia
                .query(`INSERT INTO Ingreso (Concepto, Monto_Total, Fecha, Medio_Pago) 
                        VALUES (@Concepto, @Monto, GETDATE(), @Medio)`);
        }
        
        res.json({ message: "Seña guardada e ingreso registrado" });
    } catch (err) {
        console.error("Error al actualizar seña:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// ==========================================================================
// 6. RUTAS: GASTOS & CATEGORÍAS
// ==========================================================================

// Obtener categorías de gastos
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

// Crear nueva categoría de gasto
app.post('/api/categorias-gastos', async (req, res) => {
    try {
        const { Nombre } = req.body;
        if (!Nombre) return res.status(400).send("El nombre es obligatorio");
        if (demo.useJsonStore()) {
            return res.status(201).json(demo.createCategoriaGasto(Nombre));
        }
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

// Registrar un nuevo gasto
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
    try {
        const { id } = req.params;
        if (demo.useJsonStore()) {
            if (!demo.deleteGasto(id)) return res.status(404).send('Gasto no encontrado');
            return res.status(200).json({ message: 'Gasto eliminado con éxito' });
        }
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

// Cobrar un turno completo (El Patovica Financiero)
app.post('/api/cobrar-turno', async (req, res) => {
    try {
        const { idTurno, montoTotal, medioPago, descuento, extras } = req.body;
        if (demo.useJsonStore()) {
            const resultado = demo.cobrarTurno({ idTurno, montoTotal, medioPago, descuento, extras });
            if (resultado.error) return res.status(resultado.error).send(resultado.message);
            return res.status(200).json(resultado);
        }
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
// 8. RUTAS: DASHBOARD Y RESÚMENES
// ==========================================================================
app.get('/api/dashboard/kpis', async (req, res) => {
    const { desde, hasta } = req.query;
    try {
        if (demo.useJsonStore()) return res.json(demo.getDashboardKpis(desde, hasta));
        let pool = await sql.connect(dbConfig);

        // Armamos los filtros de fecha. Agregamos la hora al 'hasta' para incluir todo ese día completo
        const fechaDesde = desde ? `${desde} 00:00:00` : '2000-01-01 00:00:00';
        const fechaHasta = hasta ? `${hasta} 23:59:59` : '2099-12-31 23:59:59';

        const query = `
            -- 1. Total Ingresos
            DECLARE @TotalIngresos DECIMAL(12,2) = (
                SELECT ISNULL(SUM(Monto_Total), 0) FROM Ingreso
                WHERE Fecha >= @Desde AND Fecha <= @Hasta
            );

            -- 2. Total Gastos
            DECLARE @TotalGastos DECIMAL(12,2) = (
                SELECT ISNULL(SUM(Monto), 0) FROM Gasto
                WHERE Fecha >= @Desde AND Fecha <= @Hasta
            );

            -- 3. Total Sueldos (Comisiones liquidadas)
            DECLARE @TotalSueldos DECIMAL(12,2) = (
                SELECT ISNULL(SUM(Monto_Abonado), 0) FROM Liquidacion_Sueldo
                WHERE Fecha_Pago >= @Desde AND Fecha_Pago <= @Hasta
            );

            -- Devolvemos las 4 métricas juntas
            SELECT 
                @TotalIngresos AS Ingresos,
                @TotalGastos AS Gastos,
                @TotalSueldos AS Sueldos,
                (@TotalIngresos - @TotalGastos - @TotalSueldos) AS GananciaNeta;
        `;

        let result = await pool.request()
            .input('Desde', sql.DateTime, fechaDesde)
            .input('Hasta', sql.DateTime, fechaHasta)
            .query(query);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Error cargando KPIs del dashboard:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Obtener ingresos y cantidad de turnos agrupados por día
app.get('/api/dashboard/grafico-ingresos', async (req, res) => {
    const { desde, hasta } = req.query;
    try {
        if (demo.useJsonStore()) return res.json(demo.getGraficoIngresos(desde, hasta));
        let pool = await sql.connect(dbConfig);

        const fechaDesde = desde ? `${desde} 00:00:00` : '2000-01-01 00:00:00';
        const fechaHasta = hasta ? `${hasta} 23:59:59` : '2099-12-31 23:59:59';

        const query = `
            WITH IngresosDiarios AS (
                SELECT CAST(Fecha AS DATE) as FechaDia, SUM(Monto_Total) as Total
                FROM Ingreso
                WHERE Fecha >= @Desde AND Fecha <= @Hasta
                GROUP BY CAST(Fecha AS DATE)
            ),
            TurnosDiarios AS (
                SELECT CAST(Fecha_Hora AS DATE) as FechaDia, COUNT(Id_Turno) as Cantidad
                FROM Turno
                WHERE Fecha_Hora >= @Desde AND Fecha_Hora <= @Hasta
                GROUP BY CAST(Fecha_Hora AS DATE)
            )
            SELECT 
                CONVERT(VARCHAR(5), ISNULL(i.FechaDia, t.FechaDia), 103) as Dia,
                CONVERT(VARCHAR(10), ISNULL(i.FechaDia, t.FechaDia), 23) as FechaCompleta, -- NUEVO: Fecha en formato YYYY-MM-DD
                ISNULL(i.Total, 0) as Total,
                ISNULL(t.Cantidad, 0) as Turnos
            FROM IngresosDiarios i
            FULL OUTER JOIN TurnosDiarios t ON i.FechaDia = t.FechaDia
            ORDER BY ISNULL(i.FechaDia, t.FechaDia) ASC
        `;

        let result = await pool.request()
            .input('Desde', sql.DateTime, fechaDesde)
            .input('Hasta', sql.DateTime, fechaHasta)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error cargando datos del gráfico:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Obtener el Top 5 de servicios más realizados
app.get('/api/dashboard/servicios-estrella', async (req, res) => {
    const { desde, hasta } = req.query;
    try {
        if (demo.useJsonStore()) return res.json(demo.getServiciosEstrella(desde, hasta));
        let pool = await sql.connect(dbConfig);

        const fechaDesde = desde ? `${desde} 00:00:00` : '2000-01-01 00:00:00';
        const fechaHasta = hasta ? `${hasta} 23:59:59` : '2099-12-31 23:59:59';

        const query = `
            SELECT TOP 5 
                s.Nombre, 
                COUNT(t.Id_Turno) as Cantidad
            FROM Turno t
            JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
            WHERE t.Fecha_Hora >= @Desde AND t.Fecha_Hora <= @Hasta
            GROUP BY s.Nombre
            ORDER BY Cantidad DESC
        `;

        let result = await pool.request()
            .input('Desde', sql.DateTime, fechaDesde)
            .input('Hasta', sql.DateTime, fechaHasta)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error cargando servicios estrella:", err);
        res.status(500).json({ error: "Error interno" });
    }
});

// ==========================================================================
// 9. INICIO DEL SERVIDOR
// ==========================================================================

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
        console.log('Modo demo JSON activo — datos en backend/data/demo-store.json');
    }
    console.log(`Servidor corriendo en http://localhost:${port}`);
    iniciarBot().catch((err) => {
        console.error('[WhatsApp] No se pudo iniciar el bot (el servidor web sigue activo):', err.message);
    });
});