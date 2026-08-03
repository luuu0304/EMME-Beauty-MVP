const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'demo-store.json');
const SEED_PATH = path.join(__dirname, 'seed.json');

let data = null;

function pad(n) {
    return String(n).padStart(2, '0');
}

function toLocalDateTime(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toDateOnly(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function atTime(baseDate, hours, minutes) {
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

function buildSeedTurnos() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return [
        {
            Id_Turno: 1,
            Id_Clienta: 1,
            Id_Empleada: 1,
            Id_Servicio: 1,
            Fecha_Hora: toLocalDateTime(atTime(today, 10, 0)),
            Fecha_Hora_Fin: toLocalDateTime(addMinutes(atTime(today, 10, 0), 90)),
            Sena_Monto: 3000,
            Id_Empleada_Recibio_Sena: 1,
            Estado: 'Pendiente',
            Color: null,
            recordatorio_enviado: 0
        },
        {
            Id_Turno: 2,
            Id_Clienta: 2,
            Id_Empleada: 2,
            Id_Servicio: 4,
            Fecha_Hora: toLocalDateTime(atTime(today, 11, 30)),
            Fecha_Hora_Fin: toLocalDateTime(addMinutes(atTime(today, 11, 30), 60)),
            Sena_Monto: 0,
            Id_Empleada_Recibio_Sena: null,
            Estado: 'Pendiente',
            Color: null,
            recordatorio_enviado: 0
        },
        {
            Id_Turno: 3,
            Id_Clienta: 3,
            Id_Empleada: 1,
            Id_Servicio: 3,
            Fecha_Hora: toLocalDateTime(atTime(addDays(today, -2), 15, 0)),
            Fecha_Hora_Fin: toLocalDateTime(addMinutes(atTime(addDays(today, -2), 15, 0), 60)),
            Sena_Monto: 2000,
            Id_Empleada_Recibio_Sena: 2,
            Estado: 'Realizado',
            Color: 'Rojo clásico',
            recordatorio_enviado: 1
        },
        {
            Id_Turno: 4,
            Id_Clienta: 1,
            Id_Empleada: 2,
            Id_Servicio: 2,
            Fecha_Hora: toLocalDateTime(atTime(addDays(today, 7), 10, 0)),
            Fecha_Hora_Fin: toLocalDateTime(addMinutes(atTime(addDays(today, 7), 10, 0), 75)),
            Sena_Monto: 0,
            Id_Empleada_Recibio_Sena: null,
            Estado: 'Pendiente',
            Color: null,
            recordatorio_enviado: 0
        }
    ];
}

function loadStore() {
    if (data) return data;

    if (fs.existsSync(STORE_PATH)) {
        data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        return data;
    }

    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    seed.turnos = buildSeedTurnos();
    data = seed;
    saveStore();
    console.log('📁 Modo demo: datos de prueba cargados en', STORE_PATH);
    return data;
}

function saveStore() {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(table) {
    loadStore();
    data.counters[table] = (data.counters[table] || 0) + 1;
    saveStore();
    return data.counters[table];
}

function findById(list, idField, id) {
    return list.find((item) => String(item[idField]) === String(id));
}

function getServicio(id) {
    return findById(loadStore().servicios, 'Id_Servicio', id);
}

function calcularFin(fechaHora, idServicio) {
    const servicio = getServicio(idServicio);
    const minutos = servicio?.Duracion_Minutos || 60;
    const inicio = new Date(fechaHora.replace(' ', 'T'));
    return toLocalDateTime(addMinutes(inicio, minutos));
}

// --- Clientas ---

function getClientas() {
    return [...loadStore().clientas];
}

function createClienta(body) {
    const store = loadStore();
    const id = nextId('clienta');
    const clienta = {
        Id_Clienta: id,
        Nombre: body.Nombre,
        Apellido: body.Apellido,
        Fecha_Nac: body.Fecha_Nac || null,
        Telefono: body.Telefono || null,
        Ig: body.Ig || null
    };
    store.clientas.push(clienta);
    saveStore();
    return { mensaje: 'Clienta creada con éxito', Id_Clienta: id };
}

function updateClienta(id, body) {
    const clienta = findById(loadStore().clientas, 'Id_Clienta', id);
    if (!clienta) return null;
    Object.assign(clienta, {
        Nombre: body.Nombre,
        Apellido: body.Apellido,
        Fecha_Nac: body.Fecha_Nac || null,
        Telefono: body.Telefono || null,
        Ig: body.Ig || null
    });
    saveStore();
    return true;
}

function getHistorialClienta(id) {
    const store = loadStore();
    return store.turnos
        .filter((t) => String(t.Id_Clienta) === String(id))
        .map((t) => {
            const s = getServicio(t.Id_Servicio);
            const e = findById(store.empleadas, 'Id_Empleada', t.Id_Empleada);
            return {
                Fecha_Hora: t.Fecha_Hora,
                Nombre_Servicio: s?.Nombre,
                Nombre_Ap: e?.Nombre_Ap
            };
        })
        .sort((a, b) => new Date(b.Fecha_Hora) - new Date(a.Fecha_Hora));
}

// --- Empleadas ---

function getEmpleadas() {
    return [...loadStore().empleadas];
}

function createEmpleada(body) {
    const store = loadStore();
    const id = nextId('empleada');
    store.empleadas.push({
        Id_Empleada: id,
        Nombre_Ap: body.Nombre_Ap,
        Dni: body.Dni || null,
        Telefono: body.Telefono || null
    });
    saveStore();
    return true;
}

function updateEmpleada(id, body) {
    const empleada = findById(loadStore().empleadas, 'Id_Empleada', id);
    if (!empleada) return null;
    empleada.Nombre_Ap = body.Nombre_Ap;
    empleada.Dni = body.Dni || null;
    saveStore();
    return true;
}

function deleteEmpleada(id) {
    const store = loadStore();
    const idx = store.empleadas.findIndex((e) => String(e.Id_Empleada) === String(id));
    if (idx === -1) return false;
    store.empleadas.splice(idx, 1);
    saveStore();
    return true;
}

// --- Servicios ---

function getServicios() {
    return loadStore().servicios.map((s) => ({
        Id_Servicio: s.Id_Servicio,
        Nombre: s.Nombre
    }));
}

// --- Turnos ---

function getTurnosAgenda() {
    const store = loadStore();
    return store.turnos.map((t) => {
        const c = findById(store.clientas, 'Id_Clienta', t.Id_Clienta);
        const e = findById(store.empleadas, 'Id_Empleada', t.Id_Empleada);
        const s = getServicio(t.Id_Servicio);
        const nombreClienta = `${c?.Nombre || ''} ${c?.Apellido || ''}`.trim();
        return {
            id: t.Id_Turno,
            Id_Turno: t.Id_Turno,
            Id_Empleada: t.Id_Empleada,
            title: `${nombreClienta} - ${s?.Nombre} (${e?.Nombre_Ap})`,
            start: t.Fecha_Hora,
            end: t.Fecha_Hora_Fin || calcularFin(t.Fecha_Hora, t.Id_Servicio),
            Nombre_Clienta: nombreClienta,
            Nombre_Servicio: s?.Nombre,
            Precio: s?.Precio_Base
        };
    });
}

function getTurnosPorFecha(fecha) {
    const store = loadStore();
    return store.turnos
        .filter((t) => t.Fecha_Hora.startsWith(fecha))
        .map((t) => {
            const c = findById(store.clientas, 'Id_Clienta', t.Id_Clienta);
            const s = getServicio(t.Id_Servicio);
            return {
                Id_Turno: t.Id_Turno,
                Fecha_Hora: t.Fecha_Hora,
                Nombre_Clienta: `${c?.Nombre || ''} ${c?.Apellido || ''}`.trim(),
                Nombre_Servicio: s?.Nombre,
                Duracion_Minutos: s?.Duracion_Minutos,
                Precio_Base: s?.Precio_Base,
                Id_Empleada: t.Id_Empleada,
                Estado: t.Estado,
                Color: t.Color
            };
        });
}

function createTurno(body) {
    const store = loadStore();
    const conflicto = store.turnos.find(
        (t) => String(t.Id_Empleada) === String(body.Id_Empleada) && t.Fecha_Hora === body.Fecha_Hora
    );
    if (conflicto) {
        return { error: 400, message: 'La profesional ya tiene un turno agendado en ese horario.' };
    }

    const id = nextId('turno');
    const turno = {
        Id_Turno: id,
        Id_Clienta: body.Id_Clienta,
        Id_Empleada: body.Id_Empleada,
        Id_Servicio: body.Id_Servicio,
        Fecha_Hora: body.Fecha_Hora,
        Fecha_Hora_Fin: calcularFin(body.Fecha_Hora, body.Id_Servicio),
        Sena_Monto: body.Sena_Monto || 0,
        Id_Empleada_Recibio_Sena: null,
        Estado: 'Pendiente',
        Color: null,
        recordatorio_enviado: 0
    };
    store.turnos.push(turno);
    saveStore();
    return { message: '¡Turno creado exitosamente!' };
}

function updateTurnoDetalles(id, color) {
    const turno = findById(loadStore().turnos, 'Id_Turno', id);
    if (!turno || turno.Estado === 'Pagado') return false;
    turno.Color = turno.Color ? `${turno.Color} | ${color}` : color;
    if (turno.Estado === 'Pendiente') turno.Estado = 'En progreso';
    saveStore();
    return true;
}

function createTurnoDemo(nombreCliente, telefono) {
    const store = loadStore();
    let clienta = store.clientas.find((c) => c.Telefono === telefono);

    if (!clienta) {
        const partes = String(nombreCliente).trim().split(/\s+/);
        const id = nextId('clienta');
        clienta = {
            Id_Clienta: id,
            Nombre: partes[0] || 'Prueba',
            Apellido: partes.slice(1).join(' ') || 'Demo',
            Fecha_Nac: null,
            Telefono: telefono,
            Ig: null
        };
        store.clientas.push(clienta);
    }

    if (store.empleadas.length === 0 || store.servicios.length === 0) {
        return { error: 400, message: 'Necesitás al menos una empleada y un servicio en la base de datos' };
    }

    const fechaHora = toLocalDateTime(addMinutes(new Date(), 3));
    const empleada = store.empleadas[0];
    const servicio = store.servicios[0];
    const id = nextId('turno');

    const turno = {
        Id_Turno: id,
        Id_Clienta: clienta.Id_Clienta,
        Id_Empleada: empleada.Id_Empleada,
        Id_Servicio: servicio.Id_Servicio,
        Fecha_Hora: fechaHora,
        Fecha_Hora_Fin: calcularFin(fechaHora, servicio.Id_Servicio),
        Sena_Monto: 0,
        Id_Empleada_Recibio_Sena: null,
        Estado: 'Pendiente',
        Color: null,
        recordatorio_enviado: 0
    };
    store.turnos.push(turno);
    saveStore();

    return {
        mensaje: 'Turno demo creado. El recordatorio debería enviarse en ~3 minutos si WhatsApp está conectado.',
        id_turno: id,
        fecha_hora: fechaHora
    };
}

function getTurnosParaRecordatorio(horasAntes) {
    const store = loadStore();
    const now = new Date();
    const limite = addMinutes(now, horasAntes * 60);

    return store.turnos
        .filter((t) => {
            if (t.Estado !== 'Pendiente' || t.recordatorio_enviado) return false;
            const c = findById(store.clientas, 'Id_Clienta', t.Id_Clienta);
            if (!c?.Telefono) return false;
            const fh = new Date(t.Fecha_Hora.replace(' ', 'T'));
            return fh > now && fh <= limite;
        })
        .map((t) => {
            const c = findById(store.clientas, 'Id_Clienta', t.Id_Clienta);
            const s = getServicio(t.Id_Servicio);
            const e = findById(store.empleadas, 'Id_Empleada', t.Id_Empleada);
            return {
                Id_Turno: t.Id_Turno,
                Nombre: c.Nombre,
                Apellido: c.Apellido,
                Telefono: c.Telefono,
                Fecha_Hora: t.Fecha_Hora,
                Servicio: s?.Nombre,
                Empleada: e?.Nombre_Ap
            };
        });
}

function marcarRecordatorioEnviado(idTurno) {
    const turno = findById(loadStore().turnos, 'Id_Turno', idTurno);
    if (turno) {
        turno.recordatorio_enviado = 1;
        saveStore();
    }
}

// --- Gastos ---

function getCategoriasGasto() {
    return [...loadStore().categorias_gasto].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
}

function createCategoriaGasto(nombre) {
    const store = loadStore();
    const id = nextId('categoria_gasto');
    store.categorias_gasto.push({ Id_Categoria: id, Nombre: nombre });
    saveStore();
    return { message: '¡Categoría creada exitosamente!' };
}

function getGastos() {
    const store = loadStore();
    return store.gastos
        .map((g) => {
            const cat = findById(store.categorias_gasto, 'Id_Categoria', g.Id_Categoria);
            return {
                ...g,
                Nombre_Categoria: cat?.Nombre || null
            };
        })
        .sort((a, b) => {
            const cmp = String(b.Fecha).localeCompare(String(a.Fecha));
            return cmp !== 0 ? cmp : b.Id_Gasto - a.Id_Gasto;
        });
}

function createGasto(body) {
    const store = loadStore();
    const id = nextId('gasto');
    store.gastos.push({
        Id_Gasto: id,
        Fecha: body.Fecha,
        Descripcion: body.Descripcion,
        Monto: body.Monto,
        Id_Categoria: body.Id_Categoria || null
    });
    saveStore();
    return true;
}

function deleteGasto(id) {
    const store = loadStore();
    const idx = store.gastos.findIndex((g) => String(g.Id_Gasto) === String(id));
    if (idx === -1) return false;
    store.gastos.splice(idx, 1);
    saveStore();
    return true;
}

// --- Extras ---

function getExtras() {
    return [...loadStore().extras].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
}

// --- Ingresos ---

function getIngresos() {
    const store = loadStore();
    return store.ingresos
        .map((i) => {
            let nombreClienta = null;
            let nombreServicio = null;
            if (i.Id_Turno) {
                const t = findById(store.turnos, 'Id_Turno', i.Id_Turno);
                if (t) {
                    const c = findById(store.clientas, 'Id_Clienta', t.Id_Clienta);
                    const s = getServicio(t.Id_Servicio);
                    nombreClienta = c ? `${c.Nombre} ${c.Apellido}` : null;
                    nombreServicio = s?.Nombre || null;
                }
            }
            return {
                ...i,
                Nombre_Clienta: nombreClienta,
                Nombre_Servicio: nombreServicio
            };
        })
        .sort((a, b) => {
            const cmp = String(b.Fecha).localeCompare(String(a.Fecha));
            return cmp !== 0 ? cmp : b.Id_Ingreso - a.Id_Ingreso;
        });
}

function createIngresoManual(body) {
    const store = loadStore();
    const id = nextId('ingreso');
    store.ingresos.push({
        Id_Ingreso: id,
        Id_Turno: null,
        Fecha: toDateOnly(new Date()),
        Monto_Total: body.Monto_Total,
        Medio_Pago: body.Medio_Pago,
        Descuento_Aplicado: 0,
        Concepto: body.Concepto
    });
    saveStore();
    return { message: 'Ingreso manual registrado' };
}

function cobrarTurno(body) {
    const store = loadStore();
    const turno = findById(store.turnos, 'Id_Turno', body.idTurno);
    if (!turno) return { error: 404, message: 'Turno no encontrado' };
    if (turno.Estado === 'Pagado') return { error: 400, message: '¡Ojo! Este turno ya fue cobrado.' };

    const idIngreso = nextId('ingreso');
    store.ingresos.push({
        Id_Ingreso: idIngreso,
        Id_Turno: turno.Id_Turno,
        Fecha: toDateOnly(new Date()),
        Monto_Total: body.montoTotal,
        Medio_Pago: body.medioPago,
        Descuento_Aplicado: body.descuento || 0,
        Concepto: null
    });

    if (body.extras?.length) {
        for (const idExtra of body.extras) {
            store.turno_extra.push({
                Id_Turno_Extra: nextId('turno_extra'),
                Id_Turno: turno.Id_Turno,
                Id_Extra: idExtra
            });
        }
    }

    turno.Estado = 'Pagado';
    saveStore();
    return { message: '¡Cobro registrado exitosamente!' };
}

function useJsonStore() {
    if (process.env.DEMO_MODE === 'true' || process.env.USE_JSON_STORE === 'true') {
        return true;
    }
    const { isDbAvailable } = require('../db/db');
    return !isDbAvailable();
}

module.exports = {
    loadStore,
    useJsonStore,
    getClientas,
    createClienta,
    updateClienta,
    getHistorialClienta,
    getEmpleadas,
    createEmpleada,
    updateEmpleada,
    deleteEmpleada,
    getServicios,
    getTurnosAgenda,
    getTurnosPorFecha,
    createTurno,
    updateTurnoDetalles,
    createTurnoDemo,
    getTurnosParaRecordatorio,
    marcarRecordatorioEnviado,
    getCategoriasGasto,
    createCategoriaGasto,
    getGastos,
    createGasto,
    deleteGasto,
    getExtras,
    getIngresos,
    createIngresoManual,
    cobrarTurno
};
