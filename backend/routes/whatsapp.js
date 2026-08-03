const express = require('express');
const QRCode = require('qrcode');
const {
    diagnosticarNumero,
    enviarWhatsApp,
    getBotStatus,
    getCuentaInfo,
    getUltimoQr,
    generarCandidatos,
    reiniciarSesionWhatsApp
} = require('../whatsapp/bot');
const { armarMensajePrueba } = require('../whatsapp/mensajes');
const { getEmmeConfig } = require('../config/loadEnv');

const router = express.Router();

router.get('/info', (req, res) => {
    const info = getCuentaInfo();
    const emme = getEmmeConfig();

    res.json({
        status: getBotStatus(),
        cuenta: info,
        negocio: emme.nombre,
        direccion: emme.direccion,
        numero_esperado: emme.numeroEsperado,
        tiene_qr: !!getUltimoQr()
    });
});

router.get('/qr', async (req, res) => {
    const qr = getUltimoQr();
    const status = getBotStatus();
    let qr_image = null;

    if (qr) {
        try {
            qr_image = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
        } catch (err) {
            console.error('[WhatsApp] Error generando imagen QR:', err.message);
        }
    }

    res.json({ status, qr, qr_image });
});

router.post('/reiniciar', async (req, res) => {
    try {
        const limpiarSesion = !!req.body?.limpiar_sesion;

        reiniciarSesionWhatsApp({ limpiarSesion }).catch((err) => {
            console.error('[WhatsApp] Error en reinicio solicitado desde la web:', err.message);
        });

        res.json({
            mensaje: limpiarSesion
                ? 'Sesión borrada. Esperá el código QR para escanear.'
                : 'Reinicio iniciado. Esperá el código QR si hace falta reconectar.',
            status: getBotStatus(),
            limpiar_sesion: limpiarSesion
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/diagnosticar', async (req, res) => {
    try {
        const { telefono } = req.body;

        if (!telefono) {
            return res.status(400).json({ error: 'El campo telefono es obligatorio' });
        }

        if (getBotStatus() !== 'ready') {
            return res.status(503).json({
                error: 'WhatsApp no está conectado',
                status: getBotStatus(),
                candidatos_generados: generarCandidatos(telefono)
            });
        }

        const resultado = await diagnosticarNumero(telefono);
        res.json(resultado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/verificar', async (req, res) => {
    try {
        const { telefono } = req.body;

        if (!telefono) {
            return res.status(400).json({ error: 'El campo telefono es obligatorio' });
        }

        if (getBotStatus() !== 'ready') {
            return res.status(503).json({ error: 'WhatsApp no está conectado', status: getBotStatus() });
        }

        const resultado = await diagnosticarNumero(telefono);
        const registrado = resultado.candidatos?.some((c) => c.registrado) || false;

        res.json({
            telefono,
            registrado,
            numero_recomendado: resultado.recomendado
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/probar', async (req, res) => {
    try {
        const { telefono, nombre, numero_forzado } = req.body;

        if (!telefono) {
            return res.status(400).json({ error: 'El campo telefono es obligatorio' });
        }

        if (getBotStatus() !== 'ready') {
            return res.status(503).json({ error: 'WhatsApp no está conectado', status: getBotStatus() });
        }

        const mensaje = armarMensajePrueba(nombre);
        const resultado = await enviarWhatsApp(telefono, mensaje, numero_forzado || null);

        res.json({
            mensaje: 'Mensaje de prueba enviado',
            ...resultado
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
