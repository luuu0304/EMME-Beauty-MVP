# EMME Beauty

Sistema de gestión para el salón: agenda, clientas, cobros, gastos, dashboard y recordatorios por WhatsApp.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- npm (viene con Node)
- Un navegador actual
- **Opcional:** SQL Server, si no querés usar el modo demo
- **Opcional:** Google Chrome, Chromium o Brave, si vas a vincular WhatsApp

## 1. Clonar y entrar al repo

```bash
git clone https://github.com/luuu0304/EMME-Beauty-MVP.git
cd EMME-Beauty-MVP
git checkout main
```

Si ya tenés el proyecto en la máquina:

```bash
cd EMME-Beauty-MVP
git checkout main
git pull origin main
```

## 2. Configurar el backend

```bash
cd backend
cp .env.example .env
```

En macOS, si `cp` no está disponible podés copiar `.env.example` a `.env` a mano.

Editá `backend/.env`. Para arrancar **sin SQL Server** (recomendado en cualquier PC de desarrollo):

```env
PORT=7777
DEMO_MODE=true
WHATSAPP_ENABLED=true
CHROME_PATH=
EMME_NOMBRE=EMME Beauty
EMME_DIRECCION=Salta, Argentina
```

El frontend llama al API en `http://localhost:7777`. No cambies `PORT` salvo que sepas ajustar también `frontend/app.js`.

### Chrome para WhatsApp (opcional)

Si el bot no encuentra un navegador, completá `CHROME_PATH` con el ejecutable:

| Sistema | Ejemplo |
|---------|---------|
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |
| macOS (Brave) | `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser` |
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Linux | `/usr/bin/google-chrome` |

También podés instalar el Chrome de Puppeteer:

```bash
cd backend
npm run install:chrome
```

Para desactivar el bot y usar solo la web:

```env
WHATSAPP_ENABLED=false
```

## 3. Instalar dependencias

Desde `backend/`:

```bash
npm install
```

## 4. Levantar backend y frontend

Necesitás **dos terminales**.

**Terminal 1 — API**

```bash
cd backend
npm start
```

Deberías ver algo como:

```text
Servidor corriendo en http://localhost:7777
```

Si no hay SQL Server, también aparece el modo demo JSON.

**Terminal 2 — web**

```bash
cd frontend
python3 -m http.server 3000
```

Si no tenés Python:

```bash
cd frontend
npx --yes serve -p 3000
```

Abrí **http://localhost:3000** en el navegador.

## 5. Verificar que anda

- La agenda, clientas, empleados, gastos, ingresos y resúmenes deberían cargar datos de prueba (modo demo).
- Health check: http://localhost:7777/api/health
- WhatsApp: menú **Configuración → WhatsApp**. Si pide QR, en el celular andá a WhatsApp → **Dispositivos vinculados** → **Vincular dispositivo**.

## SQL Server (opcional)

Si querés la base real en lugar del JSON de demo:

1. Creá la base `EmmE_Beauty`.
2. Ejecutá en orden:
   - `database/01_creacion_tablas.sql`
   - `database/03_migracion_recordatorio.sql`
   - `database/02_datos_prueba.sql` (datos de ejemplo)
3. En `backend/.env` cargá `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME` y **sacá** `DEMO_MODE=true` (o ponelo en `false`).
4. Reiniciá el backend. El health check tiene que decir `"database":"connected"`.

## Problemas frecuentes

| Qué pasa | Qué probar |
|----------|------------|
| El frontend abre pero no hay datos | Confirmá que el backend está en el puerto **7777** y que no hay error en esa terminal. |
| WhatsApp no muestra QR | Completá `CHROME_PATH` o corré `npm run install:chrome`. En la web: **Reiniciar conexión**. |
| Error de Chrome / sesión trabada | En `backend/`: `npm run whatsapp:reset` y volvé a `npm start`. La sesión vive en `~/.emme-beauty/` (en Windows, `%USERPROFILE%\.emme-beauty\`). |
| La página se recarga sola | No abras el proyecto con Live Server / Live Preview sobre la carpeta del repo. Chrome de WhatsApp escribe archivos todo el tiempo y el watcher recarga `index.html`. Usá `python3 -m http.server` **dentro de `frontend/`** o `npx serve`. |
| Puerto 7777 u 3000 ocupado | Cerrá el proceso anterior o cambiá el puerto (si cambias 7777, actualizá `API_BASE` en `frontend/app.js`). |
| `npm` no encuentra `package.json` | Ejecutá los comandos **dentro** de `backend/` o `frontend/`. |

## Estructura

```text
EMME-Beauty-MVP/
├── backend/          API Express (puerto 7777)
├── frontend/         HTML/CSS/JS estático (puerto 3000)
└── database/         Scripts SQL Server
```
