# Guía de implementación — Sistema de turnos + recordatorios WhatsApp

Documento portable para replicar la PoC de **EMME Beauty** en otro proyecto. Describe arquitectura, dependencias, esquema de datos, módulos clave y el orden recomendado de implementación.

---

## 1. Qué se implementó

Sistema de gestión de turnos para salón de estética con:

| Módulo | Descripción |
|--------|-------------|
| **Agenda web** | Vista diaria (grilla por empleada) y semanal. Creación de turnos desde modal. |
| **API REST** | CRUD de catálogos (empleadas, clientas, servicios) y turnos. |
| **Bot WhatsApp** | Recordatorios automáticos vía `whatsapp-web.js` + cron cada 1 minuto. |
| **Base de datos** | SQL Server con control de envío (`recordatorio_enviado`). |
| **Modo demo** | Fallback en memoria si SQL Server no está disponible. |

**Fuera de alcance** (no implementar salvo que se pida explícitamente):

- Bot conversacional / reservas por chat.
- Módulos Clientas, Empleados y Resúmenes completos en el frontend (solo placeholders).
- WhatsApp Business API oficial de Meta (la PoC usa WhatsApp Web).

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND — HTML + CSS + JS (ES modules, sin framework)     │
│  Servido como estático desde Express en el mismo puerto     │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST /api/*
┌──────────────────────────▼──────────────────────────────────┐
│  BACKEND — Express 5 + Node.js (ES modules)                 │
│  ├── routes/          API REST                              │
│  ├── db/db.js         Conexión SQL Server + fallback demo   │
│  ├── data/mockData.js Datos en memoria                      │
│  ├── whatsapp/bot.js  Cliente WA + cron + resolución tel.  │
│  └── whatsapp/mensajes.js  Plantilla del recordatorio       │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
    ┌──────────────────┐      ┌──────────────────────┐
    │  SQL Server       │      │  WhatsApp Web         │
    │  (EmmE_Beauty)    │      │  Puppeteer + Chrome   │
    └──────────────────┘      └──────────────────────┘
```

### Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js 18+ |
| Backend | Express 5, `mssql`, `dotenv`, `cors` |
| WhatsApp | `whatsapp-web.js`, `node-cron`, `qrcode-terminal`, Puppeteer |
| Frontend | HTML, CSS, JavaScript ES modules |
| Base de datos | Microsoft SQL Server |

---

## 3. Estructura de carpetas objetivo

Replicar esta estructura en el proyecto destino:

```
proyecto/
├── sql/
│   ├── 01_creacion_tablas.sql
│   ├── 02_datos_prueba.sql          # opcional
│   └── 03_migracion_recordatorio.sql
├── backend/
│   ├── index.js                     # Express + health + static frontend
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── loadEnv.js               # dotenv + config negocio/recordatorio
│   ├── db/
│   │   └── db.js                    # pool SQL + isDbAvailable()
│   ├── data/
│   │   └── mockData.js              # fallback sin DB
│   ├── whatsapp/
│   │   ├── bot.js                   # núcleo del bot
│   │   └── mensajes.js              # plantilla de mensaje
│   └── routes/
│       ├── empleadas.js
│       ├── clientas.js
│       ├── servicios.js
│       ├── turnos.js
│       └── whatsapp.js
└── frontend/
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── api.js
        ├── agenda.js
        ├── app.js
        ├── modal-turno.js
        └── toast.js
```

---

## 4. Orden de implementación recomendado

### Fase 1 — Base de datos

1. Ejecutar `01_creacion_tablas.sql` en SQL Server.
2. Ejecutar `03_migracion_recordatorio.sql` (columna `recordatorio_enviado`).
3. (Opcional) Ejecutar `02_datos_prueba.sql` para datos de demo.

### Fase 2 — Backend mínimo

1. Inicializar `package.json` con `"type": "module"`.
2. Instalar dependencias (ver sección 5).
3. Implementar `config/loadEnv.js` y `db/db.js`.
4. Implementar rutas de catálogo: `empleadas`, `clientas`, `servicios`.
5. Implementar `routes/turnos.js` (GET día/semana, POST crear).
6. Implementar `data/mockData.js` con el mismo patrón de fallback (`DB_UNAVAILABLE`).
7. Montar `index.js` con CORS, JSON, rutas y `express.static` del frontend.

### Fase 3 — Frontend agenda

1. Crear `index.html` con sidebar, selector de fecha, contenedor de agenda y modal de turno.
2. Implementar `api.js` (fetch wrapper).
3. Implementar `agenda.js` (grilla 08:00–20:00, bloques 30 min, tarjetas de turno).
4. Implementar `modal-turno.js` (formulario + POST `/api/turnos`).
5. Implementar `app.js` (navegación diaria/semanal, eventos).

### Fase 4 — WhatsApp

1. Implementar `whatsapp/mensajes.js`.
2. Implementar `whatsapp/bot.js` (conexión, cron, resolución de teléfonos).
3. Implementar `routes/whatsapp.js` (diagnosticar, verificar, probar).
4. Conectar `iniciarBot()` desde `index.js` sin tumbar el servidor si falla.
5. Instalar Chrome: `npm run install:chrome`.
6. Escanear QR y probar con `/api/whatsapp/probar`.

### Fase 5 — Endpoints de demo y health

1. `GET /api/health` — estado DB + WhatsApp.
2. `POST /api/turnos/demo` — turno +3 min para probar cron.
3. Scripts npm: `start`, `dev`, `install:chrome`, `whatsapp:reset`.

---

## 5. Dependencias del backend

```json
{
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "install:chrome": "npx puppeteer browsers install chrome",
    "whatsapp:reset": "pkill -f 'chrome.*wwebjs' 2>/dev/null; pkill -f 'session-emme-beauty' 2>/dev/null; rm -rf .wwebjs_auth .wwebjs_cache && echo 'Sesión borrada. Usá npm start y escaneá el QR.'"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^5.1.0",
    "mssql": "^11.0.1",
    "node-cron": "^3.0.3",
    "puppeteer": "^25.4.0",
    "qrcode-terminal": "^0.12.0",
    "whatsapp-web.js": "^1.26.0"
  }
}
```

Instalación:

```bash
cd backend
npm install
npm run install:chrome   # primera vez
```

---

## 6. Variables de entorno

Crear `backend/.env` a partir de `.env.example`:

```env
PORT=7777

# SQL Server
DB_USER=sa
DB_PASSWORD=TuPasswordAqui
DB_SERVER=localhost
DB_NAME=EmmE_Beauty

# WhatsApp
WHATSAPP_ENABLED=true
CHROME_PATH=                          # opcional; se auto-detecta en ~/.cache/puppeteer

# Identidad del negocio (aparece en recordatorios)
EMME_NOMBRE=EMME Beauty
EMME_DIRECCION=Salta, Argentina
EMME_WHATSAPP_NUMERO_ESPERADO=549387XXXXXXXX

# Ventana de recordatorio: turnos entre ahora y +N horas (default 24)
RECORDATORIO_HORAS_ANTES=24
```

**Adaptación a otro negocio:** renombrar prefijos `EMME_*` por el nombre del cliente (ej. `NEGOCIO_NOMBRE`, `NEGOCIO_DIRECCION`) y actualizar `loadEnv.js` y `mensajes.js`.

**`.gitignore` obligatorio:**

```
node_modules/
.env
.wwebjs_auth/
.wwebjs_cache/
```

---

## 7. Esquema de base de datos

### Tablas principales

```sql
-- Clienta
Id_Clienta INT IDENTITY PK
Nombre, Apellido VARCHAR(50)
Fecha_Nac DATE
Telefono VARCHAR(20)    -- guardar SIN 0 ni 15: ej. 3875246591
Ig VARCHAR(50)

-- Empleada
Id_Empleada INT IDENTITY PK
DNI VARCHAR(15) UNIQUE
Nombre_Ap VARCHAR(100)
Telefono VARCHAR(20)

-- Servicio
Id_Servicio INT IDENTITY PK
Nombre VARCHAR(100)
Precio_Base DECIMAL(10,2)
Duracion_Minutos INT

-- Turno
Id_Turno INT IDENTITY PK
Id_Clienta, Id_Empleada, Id_Servicio INT FK
Fecha_Hora DATETIME NOT NULL
Fecha_Hora_Fin DATETIME NULL      -- calculado: inicio + duración servicio
Sena_Monto DECIMAL(10,2) DEFAULT 0
Id_Empleada_Recibio_Sena INT NULL
Estado VARCHAR(20) DEFAULT 'Pendiente'
recordatorio_enviado BIT DEFAULT 0  -- migración 03
```

### Query del cron de recordatorios

El bot busca turnos **pendientes**, **sin recordatorio enviado**, con `Fecha_Hora` entre **ahora** y **ahora + N horas**:

```sql
SELECT
    t.Id_Turno,
    c.Nombre, c.Apellido, c.Telefono,
    t.Fecha_Hora,
    s.Nombre AS Servicio,
    e.Nombre_Ap AS Empleada
FROM Turno t
INNER JOIN Clienta c ON t.Id_Clienta = c.Id_Clienta
INNER JOIN Servicio s ON t.Id_Servicio = s.Id_Servicio
INNER JOIN Empleada e ON t.Id_Empleada = e.Id_Empleada
WHERE t.Fecha_Hora > GETDATE()
  AND t.Fecha_Hora <= DATEADD(HOUR, @horas, GETDATE())
  AND t.recordatorio_enviado = 0
  AND t.Estado = 'Pendiente'
```

Tras enviar:

```sql
UPDATE Turno SET recordatorio_enviado = 1 WHERE Id_Turno = @id
```

---

## 8. Patrón de conexión a DB con fallback demo

`db/db.js` intenta conectar al iniciar. Si falla, `isDbAvailable()` devuelve `false` y las rutas usan `mockData.js`.

```javascript
// db/db.js — patrón clave
let pool = null;
let dbAvailable = false;

export const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(p => { pool = p; dbAvailable = true; return p; })
    .catch(() => { console.warn('Modo demo activo'); return null; });

export async function getPool() {
    const p = await poolPromise;
    if (!p) throw new Error('DB_UNAVAILABLE');
    return p;
}

export function isDbAvailable() {
    return dbAvailable;
}
```

En cada ruta:

```javascript
try {
    const pool = await getPool();
    // ... query SQL
} catch (error) {
    if (error.message === 'DB_UNAVAILABLE') {
        return res.json(mockGetTurnos(fecha));
    }
    res.status(500).json({ error: error.message });
}
```

---

## 9. Módulo WhatsApp — piezas críticas

### 9.1 Inicialización del cliente

```javascript
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

export const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'emme-beauty',           // cambiar por ID único del proyecto
        dataPath: path.join(backendRoot, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        executablePath: chromePath,        // resolver con install:chrome o CHROME_PATH
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014590669-alpha.html'
    }
});
```

**Reglas operativas:**

- Usar `npm start`, **no** `npm run dev`, en producción o con WhatsApp activo (el watch reinicia y desconecta).
- Si hay LOGOUT o sesión corrupta: `npm run whatsapp:reset` → `npm start` → re-escanear QR.
- `WHATSAPP_ENABLED=false` desactiva el bot sin afectar la web.

### 9.2 Resolución de teléfonos (Argentina)

Guardar en DB **sin 0 ni 15**: `3875246591`.

El bot genera candidatos internacionales y prueba cuál está registrado en WhatsApp:

| Entrada DB | Candidatos generados (Salta 387) |
|------------|----------------------------------|
| `3875246591` | `5493875246591` (prioritario), `549387155246591` (fallback) |

Enviar siempre a `{numero}@c.us` (más confiable que `@lid`).

Funciones exportadas desde `bot.js`:

- `generarCandidatos(telefono)` — lista de formatos a probar.
- `diagnosticarNumero(telefono)` — cuáles están registrados en WA.
- `resolverChatId(telefono)` — elige el mejor formato.
- `enviarWhatsApp(telefono, mensaje, numeroForzado?)` — envío con reintentos.

Si falla con `No LID for user`, reintenta el siguiente candidato automáticamente.

### 9.3 Cron de recordatorios

```javascript
cron.schedule('* * * * *', async () => {
    if (botStatus !== 'ready') return;

    const { horasAntes } = getRecordatorioConfig();
    // Obtener turnos (SQL o mock)
    for (const turno of turnos) {
        const mensaje = armarMensajeRecordatorio(turno);
        await enviarWhatsApp(turno.Telefono, mensaje);
        // Marcar recordatorio_enviado = 1
    }
});
```

### 9.4 Plantilla de mensaje

Implementar en `whatsapp/mensajes.js`:

```
Hola {Nombre}! 💅

Te recordamos tu turno en *{NombreNegocio}*:

💅 {Servicio}
👤 Con {Empleada}
📅 {fecha legible es-AR} a las {hora}
📍 {Dirección}

¡Te esperamos!
— {NombreNegocio}
```

Usar `toLocaleDateString('es-AR')` y `toLocaleTimeString('es-AR')`.

### 9.5 Manejo de errores — el servidor NO debe caer

- `iniciarBot().catch(...)` en `index.js`.
- Errores temporales de Puppeteer (`execution context was destroyed`) → reintentos automáticos.
- Errores de sesión rota → `reiniciarSesionWhatsApp()`.
- `process.on('unhandledRejection')` para capturar rechazos de WA.

---

## 10. API REST — contrato completo

| Método | Ruta | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| GET | `/api/health` | — | `{ status, port, database, whatsapp, emme }` |
| GET | `/api/empleadas` | — | `[{ Id_Empleada, Nombre_Ap, ... }]` |
| GET | `/api/clientas` | — | `[{ Id_Clienta, Nombre, Apellido, Telefono, ... }]` |
| GET | `/api/servicios` | — | `[{ Id_Servicio, Nombre, Duracion_Minutos, ... }]` |
| GET | `/api/turnos` | `?fecha=YYYY-MM-DD` | Turnos del día (Estado=Pendiente) |
| GET | `/api/turnos/semana` | `?inicio=YYYY-MM-DD` | Turnos de 7 días desde inicio |
| POST | `/api/turnos` | `{ id_clienta, id_empleada, id_servicio, fecha_hora, sena_monto? }` | `{ id_turno }` |
| POST | `/api/turnos/demo` | `{ nombre_cliente, telefono }` | Turno +3 min para probar cron |
| GET | `/api/whatsapp/info` | — | Cuenta conectada |
| POST | `/api/whatsapp/diagnosticar` | `{ telefono }` | Candidatos y formatos registrados |
| POST | `/api/whatsapp/verificar` | `{ telefono }` | `{ registrado: true/false }` |
| POST | `/api/whatsapp/probar` | `{ telefono, nombre?, numero_forzado? }` | Envío inmediato de prueba |

### POST `/api/turnos` — lógica de negocio

1. Validar campos obligatorios.
2. Obtener `Duracion_Minutos` del servicio.
3. Calcular `Fecha_Hora_Fin = Fecha_Hora + duración`.
4. Insertar con `Estado = 'Pendiente'`, `recordatorio_enviado = 0`.

### Health check

```json
{
  "status": "ok",
  "port": "7777",
  "database": "connected | demo",
  "whatsapp": "ready | qr | disconnected | error",
  "emme": {
    "nombre_perfil": "...",
    "numero": "549387...",
    "negocio_configurado": "EMME Beauty"
  }
}
```

---

## 11. Frontend — comportamiento esperado

### Agenda diaria

- Horario: **08:00 – 20:00**, bloques de **30 minutos**.
- Una columna por empleada (desde `/api/empleadas`).
- Turnos como tarjetas posicionadas según hora inicio y duración (`Fecha_Hora_Fin` o `Duracion_Minutos`).
- Click en celda vacía → abre modal con fecha, hora y empleada pre-cargadas.

### Agenda semanal

- 7 columnas (días) desde el lunes de la semana seleccionada.
- Misma API `/api/turnos/semana?inicio=YYYY-MM-DD`.

### Modal "Nuevo Turno"

Campos: clienta, servicio, empleada, fecha, hora, seña (opcional).

Al crear, informar al usuario cuándo llegará el recordatorio según ventana de 24 hs.

### Cliente API (`api.js`)

```javascript
const API_BASE = `${window.location.origin}/api`;
// fetch wrapper con manejo de errores JSON
```

No hardcodear puerto: el frontend se sirve desde el mismo origin que la API.

---

## 12. Archivos de referencia en este repositorio

Copiar y adaptar desde EMME-Beauty-BOT:

| Archivo | Rol |
|---------|-----|
| `backend/index.js` | Entry point Express |
| `backend/config/loadEnv.js` | Config centralizada |
| `backend/db/db.js` | Pool SQL + fallback |
| `backend/data/mockData.js` | Datos demo |
| `backend/whatsapp/bot.js` | Bot completo (~530 líneas) |
| `backend/whatsapp/mensajes.js` | Plantilla |
| `backend/routes/*.js` | Todas las rutas |
| `sql/*.sql` | Schema + migración |
| `frontend/**` | UI completa |
| `backend/.env.example` | Template de variables |

Documentación complementaria en este repo:

- `README.md` — setup rápido y troubleshooting.
- `docs/CONFIGURACION_WHATSAPP_EMME.md` — vinculación de chip dedicado.
- `docs/RESUMEN_PROYECTO.md` — cierre de PoC y decisiones.

---

## 13. Checklist de puesta en marcha

### Primera vez

- [ ] SQL Server corriendo; scripts `01` y `03` ejecutados.
- [ ] `backend/.env` configurado.
- [ ] `npm install` + `npm run install:chrome`.
- [ ] Chip/celular con WhatsApp Business del negocio (no personal).
- [ ] `npm start` (no `dev`).
- [ ] Escanear QR en consola.
- [ ] `GET /api/health` → `whatsapp: "ready"`.
- [ ] Abrir `http://localhost:7777` y ver agenda.
- [ ] Probar envío: `POST /api/whatsapp/probar`.
- [ ] Probar cron: `POST /api/turnos/demo` y esperar ~3 min.

### Verificación end-to-end

```bash
# 1. Health
curl http://localhost:7777/api/health

# 2. Diagnóstico de número
curl -X POST http://localhost:7777/api/whatsapp/diagnosticar \
  -H "Content-Type: application/json" \
  -d '{"telefono": "3875246591"}'

# 3. Envío inmediato
curl -X POST http://localhost:7777/api/whatsapp/probar \
  -H "Content-Type: application/json" \
  -d '{"telefono": "3875246591", "nombre": "Prueba"}'

# 4. Turno demo (+3 min vía cron)
curl -X POST http://localhost:7777/api/turnos/demo \
  -H "Content-Type: application/json" \
  -d '{"nombre_cliente": "Prueba", "telefono": "3875246591"}'
```

---

## 14. Troubleshooting frecuente

| Problema | Causa | Solución |
|----------|-------|----------|
| Servidor no arranca tras activar WA | Chrome no instalado | `npm run install:chrome` o `CHROME_PATH` |
| WhatsApp desconectado / LOGOUT | Sesión inválida o hot-reload | `npm run whatsapp:reset` → `npm start` → QR |
| `The browser is already running` | Chrome zombie | `npm run whatsapp:reset` |
| API 500 "Cannot read null" | SQL caído sin fallback | Implementar patrón `DB_UNAVAILABLE` + mockData |
| Mensaje no llega | Formato teléfono incorrecto | `/diagnosticar`; guardar sin 15; probar `/probar` |
| `No LID for user` | Formato con 15 intercalado | Usar candidato sin 15 (`549387...`) |
| Respuesta demo engañosa | SQL caído pero WA activo | Verificar `/api/health`, no confiar solo en mensaje del endpoint demo |
| Error `execution context was destroyed` | Normal al conectar | Ignorar si termina en `ready` |

---

## 15. Adaptación a otro proyecto / negocio

| Elemento | Qué cambiar |
|----------|-------------|
| Nombre DB | `DB_NAME` en `.env` y scripts SQL |
| Identidad | Variables `EMME_*` → nombre del negocio |
| `LocalAuth.clientId` | ID único por proyecto (evita conflictos de sesión) |
| Colores / logo frontend | CSS variables en `styles.css` |
| Empleadas en grilla | Datos en SQL o mockData |
| Ventana recordatorio | `RECORDATORIO_HORAS_ANTES` (default 24) |
| Área telefónica | Ajustar `generarCandidatos()` si no es Salta 387 |
| Puerto | `PORT` en `.env` (default 7777) |

### Migración futura a WhatsApp Business API (Meta)

Reemplazar `whatsapp-web.js` por Cloud API. Cambios principales:

- Autenticación por token Meta en lugar de QR.
- Webhooks entrantes en lugar de cron + Puppeteer.
- Eliminar dependencia de Chrome/Puppeteer.
- Mantener misma lógica de negocio: query de turnos + plantilla + flag `recordatorio_enviado`.

---

## 16. Decisiones de diseño (mantener en reimplementación)

1. **Un solo proceso:** Express sirve API + frontend + bot (simplicidad PoC).
2. **Fallback demo:** La UI funciona sin SQL; útil para demos y desarrollo frontend.
3. **Recordatorio único:** Una sola ventana configurable; flag `recordatorio_enviado` evita duplicados.
4. **Sin chat bot:** Solo outbound; la agenda se gestiona desde la web.
5. **Teléfonos normalizados en backend:** La UI/DB guarda formato local; el bot resuelve internacional.
6. **Errores de WA no fatales:** El servidor web sigue aunque WhatsApp falle al iniciar.

---

## 17. Mejoras opcionales (no incluidas en la PoC)

- Tabla de log de envíos WhatsApp.
- Segundo recordatorio (ej. 24 hs + 2 hs antes).
- CRUD completo de clientas/empleadas en frontend.
- Autenticación de usuarios para la agenda.
- Docker / despliegue en VPS con systemd.
- Tests automatizados de `generarCandidatos()` y rutas API.

---

*Generado desde EMME-Beauty-BOT — PoC Turnos + Recordatorios WhatsApp. Usar junto con `README.md` para operación diaria.*
