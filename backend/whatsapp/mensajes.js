const { getEmmeConfig } = require('../config/loadEnv');

function formatearFecha(fechaHora) {
    const fecha = new Date(fechaHora);
    return fecha.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatearHora(fechaHora) {
    const fecha = new Date(fechaHora);
    return fecha.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function armarMensajeRecordatorio(turno) {
    const { nombre, direccion } = getEmmeConfig();
    const nombreClienta = turno.Nombre || turno.nombre || 'Clienta';
    const servicio = turno.Servicio || turno.Nombre_Servicio || turno.servicio || 'Servicio';
    const empleada = turno.Empleada || turno.Nombre_Ap || turno.empleada || 'Profesional';
    const fechaHora = turno.Fecha_Hora || turno.fecha_hora;

    return (
        `Hola ${nombreClienta}! 💅\n\n` +
        `Te recordamos tu turno en *${nombre}*:\n\n` +
        `💅 ${servicio}\n` +
        `👤 Con ${empleada}\n` +
        `📅 ${formatearFecha(fechaHora)} a las ${formatearHora(fechaHora)}\n` +
        `📍 ${direccion}\n\n` +
        `¡Te esperamos!\n` +
        `— ${nombre}`
    );
}

function armarMensajePrueba(nombre) {
    const { nombre: negocio, direccion } = getEmmeConfig();
    return (
        `Hola ${nombre || 'Prueba'}! 💅\n\n` +
        `Este es un mensaje de prueba desde *${negocio}*.\n` +
        `📍 ${direccion}\n\n` +
        `Si recibiste esto, WhatsApp está funcionando correctamente.\n` +
        `— ${negocio}`
    );
}

module.exports = {
    armarMensajeRecordatorio,
    armarMensajePrueba,
    formatearFecha,
    formatearHora
};
