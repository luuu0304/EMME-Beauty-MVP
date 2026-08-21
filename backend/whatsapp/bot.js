const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const pkg = require('whatsapp-web.js');
const { Client, LocalAuth } = pkg;
const { sql, getPool, isDbAvailable } = require('../db/db');
const { getRecordatorioConfig, getEmmeConfig, isWhatsAppEnabled } = require('../config/loadEnv');
const { armarMensajeRecordatorio } = require('./mensajes');
const { resolverRutasWhatsApp, borrarSesionWhatsApp } = require('./paths');

const whatsappDirs = resolverRutasWhatsApp();

let client = null;
let botStatus = 'disconnected';
let cuentaInfo = null;
let cronJob = null;
let iniciando = false;
let ultimoQr = null;

function limpiarTelefono(telefono) {
    if (!telefono) return '';
    let digits = String(telefono).replace(/\D/g, '');

    if (digits.startsWith('549') && digits.length >= 12) {
        return digits;
    }

    if (digits.startsWith('54') && digits.length >= 11) {
        return digits;
    }

    if (digits.startsWith('0')) {
        digits = digits.slice(1);
    }

    if (digits.startsWith('15') && digits.length > 10) {
        digits = digits.slice(2);
    }

    if (digits.length === 10 && digits.startsWith('387')) {
        return '549' + digits;
    }

    if (digits.length === 10) {
        return '549' + digits;
    }

    return digits;
}

function generarCandidatos(telefono) {
    const limpio = limpiarTelefono(telefono);
    const candidatos = [];
    const seen = new Set();

    function agregar(num) {
        if (num && !seen.has(num)) {
            seen.add(num);
            candidatos.push(num);
        }
    }

    if (limpio.startsWith('549') && limpio.length === 13) {
        agregar(limpio);
        const local = limpio.slice(3);
        if (local.startsWith('387') && local.length === 10) {
            agregar('54938715' + local.slice(3));
        }
    } else if (limpio.length === 10 && limpio.startsWith('387')) {
        agregar('549' + limpio);
        agregar('54938715' + limpio.slice(3));
    } else if (limpio.length === 10) {
        agregar('549' + limpio);
    } else if (limpio.startsWith('54')) {
        agregar(limpio);
    }

    const soloDigitos = String(telefono).replace(/\D/g, '');
    if (soloDigitos.length >= 10) {
        agregar('549' + soloDigitos.slice(-10));
    }

    return candidatos;
}

function chromeEsUsable(binario) {
    if (!binario || !fs.existsSync(binario)) return false;
    try {
        execFileSync(binario, ['--version'], { timeout: 8000, stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function chromeDesdeCache(cacheRoot) {
    if (!cacheRoot) return null;
    const cacheBase = path.join(cacheRoot, 'chrome');
    if (!fs.existsSync(cacheBase)) return null;

    const versions = fs.readdirSync(cacheBase).sort().reverse();
    for (const version of versions) {
        const candidatos = [
            path.join(cacheBase, version, 'chrome-linux64', 'chrome'),
            path.join(cacheBase, version, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
            path.join(cacheBase, version, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
            path.join(cacheBase, version, 'chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
            path.join(cacheBase, version, 'chrome-win64', 'chrome.exe')
        ];
        const encontrado = candidatos.find(chromeEsUsable);
        if (encontrado) return encontrado;
    }

    return null;
}

function resolverChromePath() {
    const candidatos = [
        process.env.CHROME_PATH,
        chromeDesdeCache(path.join(os.homedir(), '.cache', 'puppeteer')),
        chromeDesdeCache(process.env.PUPPETEER_CACHE_DIR || ''),
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ].filter(Boolean);

    const encontrado = candidatos.find(chromeEsUsable);
    if (encontrado) return encontrado;

    console.warn('[WhatsApp] No se encontró un Chrome usable. Instalá Chrome o corré: npm run install:chrome');
    return undefined;
}

function getBotStatus() {
    return botStatus;
}

function getCuentaInfo() {
    return cuentaInfo;
}

function getUltimoQr() {
    return ultimoQr;
}

async function estaRegistradoEnWhatsApp(numero) {
    if (!client || botStatus !== 'ready') {
        throw new Error('WhatsApp no está conectado');
    }
    const chatId = `${numero}@c.us`;
    try {
        const result = await client.isRegisteredUser(chatId);
        return !!result;
    } catch {
        return false;
    }
}

async function diagnosticarNumero(telefono) {
    const candidatos = generarCandidatos(telefono);
    const resultados = [];

    for (const candidato of candidatos) {
        let registrado = false;
        try {
            registrado = await estaRegistradoEnWhatsApp(candidato);
        } catch (err) {
            return { error: err.message, candidatos };
        }
        resultados.push({
            numero: candidato,
            chatId: `${candidato}@c.us`,
            registrado
        });
    }

    return {
        telefonoOriginal: telefono,
        candidatos: resultados,
        recomendado: resultados.find((r) => r.registrado)?.numero || null
    };
}

async function resolverChatId(telefono) {
    const candidatos = generarCandidatos(telefono);

    for (const candidato of candidatos) {
        try {
            const registrado = await client.isRegisteredUser(`${candidato}@c.us`);
            if (registrado) {
                return `${candidato}@c.us`;
            }
        } catch {
            continue;
        }
    }

    if (candidatos.length > 0) {
        return `${candidatos[0]}@c.us`;
    }

    throw new Error('No se pudo resolver un número válido para WhatsApp');
}

async function enviarWhatsApp(telefono, mensaje, numeroForzado = null) {
    if (!client || botStatus !== 'ready') {
        throw new Error('WhatsApp no está conectado (estado: ' + botStatus + ')');
    }

    const candidatos = numeroForzado
        ? [String(numeroForzado).replace(/\D/g, '')]
        : generarCandidatos(telefono);

    let ultimoError = null;

    for (const candidato of candidatos) {
        const chatId = `${candidato}@c.us`;
        try {
            await client.sendMessage(chatId, mensaje);
            return { enviado: true, chatId, numero: candidato };
        } catch (err) {
            ultimoError = err;
            const msg = err.message || '';
            if (msg.includes('No LID for user') || msg.includes('not registered')) {
                continue;
            }
            throw err;
        }
    }

    throw ultimoError || new Error('No se pudo enviar el mensaje a ningún candidato');
}

async function obtenerTurnosParaRecordatorio(horasAntes) {
    const demo = require('../data/jsonStore');
    if (demo.useJsonStore()) {
        return demo.getTurnosParaRecordatorio(horasAntes);
    }

    if (!isDbAvailable()) {
        console.warn('[WhatsApp] DB no disponible, sin turnos para recordar');
        return [];
    }

    const pool = await getPool();
    const result = await pool.request()
        .input('horas', sql.Int, horasAntes)
        .query(`
            SELECT
                t.Id_Turno,
                c.Nombre,
                c.Apellido,
                c.Telefono,
                t.Fecha_Hora,
                s.Nombre AS Servicio,
                e.Nombre_Ap AS Empleada
            FROM Turno t
            INNER JOIN Clienta c ON t.Id_Clienta = c.Id_Clienta
            INNER JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
            INNER JOIN Empleada e ON t.Id_Empleada = e.Id_Empleada
            WHERE t.Fecha_Hora > GETDATE()
              AND t.Fecha_Hora <= DATEADD(HOUR, @horas, GETDATE())
              AND ISNULL(t.recordatorio_enviado, 0) = 0
              AND t.Estado = 'Pendiente'
              AND c.Telefono IS NOT NULL
              AND LTRIM(RTRIM(c.Telefono)) <> ''
        `);

    return result.recordset;
}

async function marcarRecordatorioEnviado(idTurno) {
    const demo = require('../data/jsonStore');
    if (demo.useJsonStore()) {
        return demo.marcarRecordatorioEnviado(idTurno);
    }

    const pool = await getPool();
    await pool.request()
        .input('id', sql.Int, idTurno)
        .query('UPDATE Turno SET recordatorio_enviado = 1 WHERE Id_Turno = @id');
}

async function procesarRecordatorios() {
    if (botStatus !== 'ready') return;

    const { horasAntes } = getRecordatorioConfig();

    try {
        const turnos = await obtenerTurnosParaRecordatorio(horasAntes);

        for (const turno of turnos) {
            try {
                const mensaje = armarMensajeRecordatorio(turno);
                await enviarWhatsApp(turno.Telefono, mensaje);
                await marcarRecordatorioEnviado(turno.Id_Turno);
                console.log(`[WhatsApp] Recordatorio enviado — Turno #${turno.Id_Turno} → ${turno.Telefono}`);
            } catch (err) {
                console.error(`[WhatsApp] Error enviando recordatorio turno #${turno.Id_Turno}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[WhatsApp] Error en cron de recordatorios:', err.message);
    }
}

function iniciarCron() {
    if (cronJob) return;
    cronJob = cron.schedule('* * * * *', () => {
        procesarRecordatorios().catch((err) => {
            console.error('[WhatsApp] Error no capturado en cron:', err.message);
        });
    });
    console.log('[WhatsApp] Cron de recordatorios activo (cada 1 min)');
}

function crearCliente() {
    const chromePath = resolverChromePath();
    const puppeteerConfig = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check'
        ]
    };

    if (chromePath) {
        puppeteerConfig.executablePath = chromePath;
        console.log('[WhatsApp] Usando Chrome:', chromePath);
    }

    return new Client({
        authStrategy: new LocalAuth({
            clientId: 'emme-beauty',
            dataPath: whatsappDirs.auth
        }),
        puppeteer: puppeteerConfig,
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014590669-alpha.html'
        }
    });
}

function configurarEventos(waClient) {
    waClient.on('qr', (qr) => {
        botStatus = 'qr';
        ultimoQr = qr;
        console.log('\n📱 Escaneá este QR con WhatsApp Business:\n');
        qrcode.generate(qr, { small: true });
    });

    waClient.on('authenticated', () => {
        console.log('[WhatsApp] Autenticado');
    });

    waClient.on('ready', async () => {
        botStatus = 'ready';
        ultimoQr = null;
        console.log('[WhatsApp] ✅ Cliente listo');

        try {
            const info = waClient.info;
            cuentaInfo = {
                nombre_perfil: info?.pushname || null,
                numero: info?.wid?.user || null,
                plataforma: info?.platform || null
            };
            console.log(`[WhatsApp] Conectado como: ${cuentaInfo.nombre_perfil} (${cuentaInfo.numero})`);
        } catch {
            cuentaInfo = null;
        }

        iniciarCron();
    });

    waClient.on('auth_failure', (msg) => {
        botStatus = 'error';
        ultimoQr = null;
        console.error('[WhatsApp] Fallo de autenticación:', msg);
    });

    waClient.on('disconnected', (reason) => {
        botStatus = 'disconnected';
        ultimoQr = null;
        console.warn('[WhatsApp] Desconectado:', reason);

        if (reason === 'LOGOUT') {
            reiniciarSesionWhatsApp().catch((err) => {
                console.error('[WhatsApp] Error reiniciando sesión:', err.message);
            });
        }
    });
}

async function reiniciarSesionWhatsApp(opciones = {}) {
    const { limpiarSesion = false } = opciones;
    console.log('[WhatsApp] Reiniciando sesión...');

    if (cronJob) {
        cronJob.stop();
        cronJob = null;
    }

    if (client) {
        try {
            await client.destroy();
        } catch {
            // ignorar errores al destruir
        }
        client = null;
    }

    botStatus = 'disconnected';
    cuentaInfo = null;
    ultimoQr = null;

    if (limpiarSesion) {
        borrarSesionWhatsApp();
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    return iniciarBot();
}

async function iniciarBot() {
    if (!isWhatsAppEnabled()) {
        console.log('[WhatsApp] Desactivado (WHATSAPP_ENABLED=false)');
        botStatus = 'disabled';
        return;
    }

    if (iniciando) return;
    iniciando = true;

    try {
        if (client) {
            try {
                await client.destroy();
            } catch {
                // ignorar
            }
        }

        client = crearCliente();
        configurarEventos(client);

        botStatus = 'connecting';
        console.log('[WhatsApp] Iniciando cliente...');

        await client.initialize();
    } catch (err) {
        botStatus = 'error';
        console.error('[WhatsApp] Error al iniciar:', err.message);
        throw err;
    } finally {
        iniciando = false;
    }
}

module.exports = {
    generarCandidatos,
    diagnosticarNumero,
    resolverChatId,
    enviarWhatsApp,
    iniciarBot,
    reiniciarSesionWhatsApp,
    getBotStatus,
    getCuentaInfo,
    getUltimoQr,
    procesarRecordatorios,
    obtenerTurnosParaRecordatorio
};
