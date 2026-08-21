const path = require('path');
const fs = require('fs');
const os = require('os');

const backendRoot = path.join(__dirname, '..');
const homeRoot = path.join(os.homedir(), '.emme-beauty');

function getWhatsAppAuthDir() {
    return path.join(homeRoot, 'wwebjs_auth');
}

function getWhatsAppCacheDir() {
    return path.join(homeRoot, 'wwebjs_cache');
}

function moverSiExiste(origen, destino) {
    if (fs.existsSync(destino) || !fs.existsSync(origen)) return;
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    try {
        fs.renameSync(origen, destino);
    } catch {
        fs.cpSync(origen, destino, { recursive: true });
        fs.rmSync(origen, { recursive: true, force: true });
    }
    console.log('[WhatsApp] Datos movidos a', destino);
}

function resolverRutasWhatsApp() {
    fs.mkdirSync(homeRoot, { recursive: true });
    const auth = getWhatsAppAuthDir();
    const cache = getWhatsAppCacheDir();
    moverSiExiste(path.join(backendRoot, '.wwebjs_auth'), auth);
    moverSiExiste(path.join(backendRoot, '.wwebjs_cache'), cache);
    return { auth, cache, homeRoot };
}

function borrarSesionWhatsApp() {
    const dirs = [
        getWhatsAppAuthDir(),
        getWhatsAppCacheDir(),
        path.join(backendRoot, '.wwebjs_auth'),
        path.join(backendRoot, '.wwebjs_cache')
    ];
    for (const dir of dirs) {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log('[WhatsApp] Carpeta eliminada:', dir);
        }
    }
}

module.exports = {
    getWhatsAppAuthDir,
    getWhatsAppCacheDir,
    resolverRutasWhatsApp,
    borrarSesionWhatsApp
};
