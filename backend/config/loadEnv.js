const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

function getEmmeConfig() {
    return {
        nombre: process.env.EMME_NOMBRE || 'EMME Beauty',
        direccion: process.env.EMME_DIRECCION || 'Salta, Argentina',
        numeroEsperado: process.env.EMME_WHATSAPP_NUMERO_ESPERADO || null
    };
}

function getRecordatorioConfig() {
    const horas = parseInt(process.env.RECORDATORIO_HORAS_ANTES, 10);
    return {
        horasAntes: Number.isFinite(horas) && horas > 0 ? horas : 24
    };
}

function isWhatsAppEnabled() {
    const val = process.env.WHATSAPP_ENABLED;
    if (val === undefined || val === '') return true;
    return val.toLowerCase() === 'true' || val === '1';
}

function getPort() {
    return parseInt(process.env.PORT, 10) || 7777;
}

module.exports = {
    getEmmeConfig,
    getRecordatorioConfig,
    isWhatsAppEnabled,
    getPort
};
