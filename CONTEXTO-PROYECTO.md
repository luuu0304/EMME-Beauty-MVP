# EMME Beauty — Contexto actual del proyecto

Documento de onboarding para IA / desarrolladores. Describe **el código que existe hoy** en este repo (`emme-beauty-lauti`), no una PoC anterior.

**Fecha de este snapshot:** agosto 2026.

**No usar como fuente de verdad:** `IMPLEMENTATION.md`. Ese archivo describe una arquitectura vieja (ES modules, rutas partidas, frontend modular, frontend servido por Express). El código actual es distinto.

Documentos útiles:

| Archivo | Para qué sirve |
|---------|----------------|
| `README.md` | Cómo instalar y levantar el proyecto |
| Este archivo (`CONTEXTO-PROYECTO.md`) | Estructura, dominio, API y convenciones |
| `RESUMEN-PARA-LU.md` | Explicación no técnica de la sección Configuración |

---

## 1. Qué es

Sistema de gestión para el salón **EMME Beauty** (Salta, Argentina). Cubre:

- Agenda de turnos (diaria y semanal)
- Fichas de clientas + historial
- Empleadas, especialidades (áreas) y liquidación de comisiones
- Gastos, ingresos y cobro de turnos (con extras)
- Dashboard / resúmenes (KPIs y gráficos)
- Recordatorios automáticos por WhatsApp (outbound, no es un chatbot)

No hay autenticación de usuarios. Es una SPA estática de una sola página + API REST.

---

## 2. Arquitectura real

Dos procesos separados. El frontend **no** se sirve desde Express.

```
Navegador  http://localhost:3000
   frontend/index.html + app.js + styles.css
                │
                │ fetch  API_BASE = http://localhost:7777/api
                ▼
Node / Express  http://localhost:7777
   backend/index.js  (casi todas las rutas)
   backend/routes/whatsapp.js
                │                    │
                ▼                    ▼
     SQL Server (opcional)     WhatsApp Web
     o JSON demo               (whatsapp-web.js + Chrome)
```

### Stack

| Capa | Tecnología actual |
|------|-------------------|
| Runtime | Node.js 18+ |
| Backend | Express 5, **CommonJS** (`require` / `module.exports`), `mssql`, `cors`, `dotenv` |
| Persistencia | SQL Server (`EmmE_Beauty`) **o** JSON en disco (`backend/data/demo-store.json`) |
| WhatsApp | `whatsapp-web.js` + Puppeteer + Chrome, `node-cron`, `qrcode` (imagen para la web), `qrcode-terminal` |
| Frontend | HTML + CSS + JS vanilla (un solo `app.js`, **sin bundler ni framework**) |
| Libs CDN | FullCalendar 6, Chart.js, Flatpickr |

`backend/package.json` declara `"type": "commonjs"`. No hay TypeScript.

---

## 3. Árbol de carpetas

```
emme-beauty-lauti/
├── README.md
├── CONTEXTO-PROYECTO.md          ← este archivo
├── IMPLEMENTATION.md             ← desactualizado, no seguir
├── RESUMEN-PARA-LU.md            ← copy para usuaria no técnica
├── .gitignore
├── backend/
│   ├── index.js                  ← entry point + TODAS las rutas de negocio
│   ├── package.json
│   ├── .env.example
│   ├── config/loadEnv.js         ← PORT, EMME_*, WHATSAPP_ENABLED, RECORDATORIO_*
│   ├── db/db.js                  ← pool SQL + isDbAvailable()
│   ├── data/
│   │   ├── jsonStore.js          ← fallback demo (CRUD en JSON)
│   │   ├── seed.json             ← semilla inicial del demo
│   │   └── demo-store.json       ← runtime del demo (gitignored)
│   ├── routes/whatsapp.js        ← única carpeta de rutas extraída
│   ├── whatsapp/
│   │   ├── bot.js                ← cliente WA, QR, cron, teléfonos AR
│   │   └── mensajes.js           ← plantillas de recordatorio y prueba
│   └── scripts/migrate-recordatorio.js
├── frontend/
│   ├── index.html                ← UI completa (secciones + modales)
│   ├── app.js                    ← lógica completa (~3000+ líneas)
│   └── styles.css
└── database/
    ├── 01_creacion_tablas.sql    ← schema (evolutivo, incluye ALTERs)
    ├── 02_datos_prueba.sql       ← seed SQL (también tiene ALTERs sueltos)
    ├── 03_migracion_recordatorio.sql
    └── limpieza.sql              ← wipe + recarga de staff/clientas
```

Archivos que **no** existen (aunque `IMPLEMENTATION.md` los nombre): `backend/data/mockData.js`, `backend/routes/turnos.js`, `frontend/js/agenda.js`, etc.

---

## 4. Cómo corre

Desde `backend/`:

```bash
cp .env.example .env   # DEMO_MODE=true para no usar SQL
npm install
npm start              # puerto 7777 — usar start, no dev, si WhatsApp está activo
```

Frontend (otra terminal):

```bash
cd frontend
python3 -m http.server 3000
# abrir http://localhost:3000
```

El frontend hardcodea `const API_BASE = 'http://localhost:7777/api'` en `frontend/app.js`. Si cambia el puerto, hay que cambiar eso.

Scripts npm útiles:

- `npm start` / `npm run dev` (nodemon; ignora `demo-store.json` y carpetas wwebjs)
- `npm run install:chrome`
- `npm run whatsapp:reset`
- `npm run migrate:recordatorio`

---

## 5. Persistencia: SQL vs demo JSON

Al arrancar, `db/db.js` intenta conectar a SQL Server. Si falla, `isDbAvailable()` queda `false`.

`jsonStore.useJsonStore()` es `true` cuando:

1. `DEMO_MODE=true` o `USE_JSON_STORE=true`, **o**
2. SQL no está disponible.

Cada handler en `index.js` empieza con:

```javascript
if (demo.useJsonStore()) return res.json(demo.algunaFuncion(...));
// si no, query mssql
```

El store JSON se persiste en `backend/data/demo-store.json` (no commitear). La semilla está en `seed.json`. Los turnos de demo se generan con fechas relativas al día de hoy.

Para producción / datos reales: crear DB `EmmE_Beauty`, ejecutar `01` → `03` → (opcional) `02`, y **no** poner `DEMO_MODE=true`.

Health: `GET /api/health` → `{ status, port, database: "connected"|"demo", whatsapp, emme }`.

---

## 6. Modelo de dominio

### Tablas / colecciones

| Entidad | Rol |
|---------|-----|
| `Clienta` | Nombre, Apellido, Fecha_Nac, Telefono, Ig |
| `Empleada` | Nombre_Ap, DNI, Telefono |
| `Servicio` | Nombre, Precio_Base, Duracion_Minutos, **Area** (`Manicura` / `Cejas y Pestañas`) |
| `Empleada_Area` | Especialidad + `Porcentaje_Comision` (default 0.50) |
| `Turno` | Clienta + Empleada + Servicio + Fecha_Hora + seña + Estado + Color + Liquidado + recordatorio_enviado |
| `Extra` / `Turno_Extra` | Adicionales al cobrar |
| `Ingreso` | Cobro de turno, seña, o ingreso manual (`Id_Turno` nullable + `Concepto`) |
| `Gasto` / `Categoria_Gasto` | Egresos |
| `Liquidacion_Sueldo` | Recibo de comisiones; marca turnos `Liquidado = 1` |

### Estados de turno (usados en código)

- `Pendiente` — agendado, entra al cron de WhatsApp
- `En progreso` — se agregó color/detalle en sesión
- `Pagado` — cobrado; entra al saldo de la empleada
- `Realizado` — aparece en seed/demo histórico (no es el estado post-cobro)

### Teléfonos

Guardar **sin 0 ni 15**, con código de área: `3875246591`. El bot genera candidatos internacionales (`549387...`) y prueba cuál está en WhatsApp.

### Horario de agenda (hardcoded en UI)

Franja **09:30 – 21:30**, bloques de **30 min**. FullCalendar semanal usa `slotMinTime: 09:30` / `slotMaxTime: 21:30`. La pestaña Configuración → Horario guarda preferencias en `localStorage` pero **la grilla todavía no las aplica**.

---

## 7. API REST (contrato actual)

Base: `http://localhost:7777/api`

### Sistema

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/` | Texto de “backend vivo” |
| GET | `/health` | DB + WhatsApp + identidad |

### Clientas

| Método | Ruta |
|--------|------|
| GET | `/clientas` |
| POST | `/clientas` body `{ Nombre, Apellido, Fecha_Nac?, Telefono?, Ig? }` → `{ Id_Clienta }` |
| PUT | `/clientas/:id` |
| GET | `/clientas/:id/historial` |

### Empleadas / áreas / sueldos

| Método | Ruta |
|--------|------|
| GET | `/empleadas` (incluye Saldo_Acumulado, última liquidación, Areas) |
| POST | `/empleadas` `{ Nombre_Ap, Dni }` |
| PUT | `/empleadas/:id` |
| DELETE | `/empleadas/:id` |
| GET | `/empleadas/servicio/:idServicio` filtro por área del servicio |
| GET | `/empleadas/:id/sueldo-detalle` |
| POST | `/empleadas/:id/liquidar` transacción: recibo + marca turnos liquidados |
| GET | `/areas` áreas distintas de Servicio |
| GET | `/empleadas/:id/areas` |
| POST | `/empleadas/:id/areas` body `{ areas: [{ area, comision }] }` reemplaza todas |

Comisión: `(Precio_Base + extras) * Porcentaje_Comision` (default 50%) sobre turnos `Pagado` y `Liquidado = 0`.

### Servicios y extras

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/servicios` | Hoy solo `{ Id_Servicio, Nombre }` |
| GET | `/extras` | Catálogo al cobrar |

No hay POST/PUT de servicios ni extras en la API.

### Turnos

| Método | Ruta |
|--------|------|
| GET | `/turnos` formato FullCalendar (`id`, `title`, `start`, `end`, …) |
| GET | `/turnos/fecha/:fecha` `YYYY-MM-DD` agenda diaria |
| POST | `/turnos` `{ Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Sena_Monto? }` |
| PUT | `/turnos/:id/detalles` `{ Color }` append + pasa a En progreso |
| PUT | `/turnos/:id/sena` `{ Sena_Monto, Nombre_Clienta }` también crea Ingreso |
| POST | `/turnos/demo` `{ nombre_cliente, telefono }` turno +3 min para probar cron |

Al crear turno: valida solapamiento por empleada (inicio/fin vs duración del servicio). Si hay seña > 0, inserta un `Ingreso` con concepto `Seña abonada - {nombre}`.

**SQL vs demo:** el GET `/turnos` en SQL selecciona `Fecha_Hora_Fin`. Esa columna se agrega en `02_datos_prueba.sql`, no en el `CREATE TABLE` inicial. El demo JSON sí calcula `Fecha_Hora_Fin`.

### Caja

| Método | Ruta |
|--------|------|
| GET/POST | `/categorias-gastos` |
| GET/POST | `/gastos` |
| DELETE | `/gastos/:id` |
| GET | `/ingresos` |
| POST | `/ingresos/manual` `{ Concepto, Monto_Total, Medio_Pago }` |
| POST | `/cobrar-turno` `{ idTurno, montoTotal, medioPago, descuento, extras[] }` |

Cobro: no permite cobrar dos veces; transacción Ingreso + Turno_Extra + `Estado = 'Pagado'`.

### Dashboard

Query `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`.

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/dashboard/kpis` | Ingresos, Gastos, Sueldos, GananciaNeta |
| GET | `/dashboard/grafico-ingresos` | por día: Total + cantidad de turnos |
| GET | `/dashboard/servicios-estrella` | top 5 servicios |

### WhatsApp (`/api/whatsapp`)

| Método | Ruta |
|--------|------|
| GET | `/info` estado, cuenta, negocio, si hay QR |
| GET | `/qr` `{ status, qr, qr_image }` data-URL para la UI |
| POST | `/reiniciar` `{ limpiar_sesion?: boolean }` |
| POST | `/diagnosticar` `{ telefono }` |
| POST | `/verificar` `{ telefono }` |
| POST | `/probar` `{ telefono, nombre?, numero_forzado? }` |

---

## 8. Frontend

SPA de una página. Navegación por sidebar que muestra/oculta secciones. Recuerda la sección activa en `localStorage` (`emme_seccion_activa`).

### Secciones (`index.html` + handlers en `app.js`)

1. **Turnos** — agenda diaria (grilla por empleada, filtro por área) y semanal (Lun–Sáb). Modal nuevo turno (puede crear clienta al vuelo). Detalle de turno: color, seña, cobro.
2. **Clientas** — listado, alta/edición, perfil con historial, atajo a agendar.
3. **Empleados** — CRUD, especialidades/comisiones, detalle de sueldo, liquidar.
4. **Gastos** — listado, alta, categorías, baja.
5. **Ingresos** — listado + ingreso manual.
6. **Resúmenes** — KPIs, Chart.js, rango Flatpickr, servicios estrella.
7. **Configuración** — pestañas General / WhatsApp / Servicios / Horario.

### Modales principales

`modalNuevoTurno`, `modalDetalleTurno`, `modalNuevaClienta`, `modalPerfilClienta`, `modalNuevaEmpleada`, `modalEspecialidades`, `modalDetalleSueldo`, `modalNuevoGasto`, `modalNuevaCategoria`, `modalNuevoIngreso`, `modalConfirmacion`, `modalTurnos` (agrupados en vista semanal).

### Configuración — qué persiste dónde

| Dato | Dónde vive |
|------|------------|
| Nombre y dirección del salón | Solo lectura desde `.env` (`EMME_NOMBRE`, `EMME_DIRECCION`) vía `/api/health` o `/api/whatsapp/info` |
| Teléfono, Instagram, descripción del local | `localStorage` (`emme_config_local`) |
| Horario / días / bloque | `localStorage` — **no mueve la agenda todavía** |
| Horas del recordatorio (input en UI) | Visual; el valor real lo define `RECORDATORIO_HORAS_ANTES` en el servidor |
| Texto del recordatorio | No editable; solo vista previa |
| Servicios / extras | Solo lectura desde API |

WhatsApp desde la web: badge de estado, QR en pantalla, reiniciar, borrar sesión, enviar prueba. Polling de estado mientras espera QR.

Estilos: `frontend/styles.css`, fuente Montserrat, look limpio/salón.

---

## 9. Bot WhatsApp

Archivo núcleo: `backend/whatsapp/bot.js`.

- `whatsapp-web.js` + `LocalAuth` (`clientId: 'emme-beauty'`, datos en `backend/.wwebjs_auth`)
- Chrome: `CHROME_PATH`, cache de Puppeteer, o Chrome/Brave/Edge de macOS
- Si `WHATSAPP_ENABLED=false` el bot no arranca; la API web sigue
- Errores de WhatsApp **no deben tumbar** Express (`iniciarBot().catch(...)` + filtro de `unhandledRejection`)
- Cron `* * * * *`: turnos `Pendiente`, `recordatorio_enviado = 0`, con teléfono, entre ahora y ahora + N horas → envía plantilla → marca flag
- Solo mensajes salientes. No hay reservas por chat
- Usar `npm start`, no nodemon, con WhatsApp activo (el reload corta la sesión)

Plantilla en `whatsapp/mensajes.js`: saludo, servicio, profesional, fecha/hora `es-AR`, dirección del `.env`.

---

## 10. Variables de entorno (`backend/.env`)

```env
PORT=7777
DB_USER / DB_PASSWORD / DB_SERVER / DB_NAME=EmmE_Beauty
WHATSAPP_ENABLED=true
CHROME_PATH=
EMME_NOMBRE=EMME Beauty
EMME_DIRECCION=Salta, Argentina
EMME_WHATSAPP_NUMERO_ESPERADO=549387XXXXXXXX
RECORDATORIO_HORAS_ANTES=24
DEMO_MODE=true   # opcional; fuerza JSON aunque SQL exista
```

---

## 11. Reglas de negocio a respetar

1. Un turno no puede solaparse con otro de la misma empleada.
2. Seña > 0 genera un Ingreso automático (medio Transferencia).
3. No se cobra un turno ya `Pagado`.
4. Comisión solo sobre turnos pagados no liquidados; liquidar es atómico.
5. Recordatorio WhatsApp una sola vez (`recordatorio_enviado`).
6. Filtrar profesionales al agendar según el `Area` del servicio.
7. El servidor web tiene que seguir si WhatsApp falla.

---

## 12. Qué está a medias o no existe

- CRUD de servicios/extras desde la UI
- Editar plantilla de recordatorio o `RECORDATORIO_HORAS_ANTES` desde la web (el input de horas no pega en el backend)
- Horario de Configuración aplicado a la grilla (sigue 09:30–21:30 / 30 min)
- Chatbot / reservas por WhatsApp
- Auth / roles
- Tests automatizados
- Frontend no se sirve desde Express (a diferencia de la PoC vieja)
- `GET /api/servicios` no devuelve precio ni duración (el frontend los usa en otros endpoints de turnos)

Schema SQL: `01_creacion_tablas.sql` es un script evolutivo (CREATE + ALTER mezclados). `Fecha_Hora_Fin` y `recordatorio_enviado` no están en el CREATE original de Turno.

---

## 13. Convenciones para seguir trabajando

- Hablar y escribir UI/copy en **español (Argentina)**.
- Backend: CommonJS, handlers en `index.js` salvo WhatsApp.
- Cada ruta nueva debe tener rama `demo.useJsonStore()` + equivalente en `jsonStore.js`.
- Frontend: funciones globales en `app.js`, mismos IDs de DOM; no introducir React/Vite salvo pedido explícito.
- No commitear `.env`, `demo-store.json`, `.wwebjs_auth`, `.wwebjs_cache`.
- Paleta y componentes existentes en `styles.css` (botones, cards, toasts, config-*).
- Profesionales del seed demo: Mili y Meli. Áreas: Manicura, Cejas y Pestañas.

### Índice de `backend/index.js`

1. Middlewares, health, turno demo  
2. Clientas  
3. Empleadas  
4. Servicios y extras  
5. Turnos y agenda  
6. Gastos  
7. Ingresos y cobros  
8. Dashboard  
9. Listen + iniciar bot  

### Índice de `frontend/app.js`

1. Utilidades / toasts  
2. Navegación  
3. Turnos / calendario  
4. Clientas  
5. Empleadas  
6. Gastos  
7. Ingresos  
8. Cobro y extras  
9. Dashboard  
(+ bloque Configuración / WhatsApp al final)

---

*Generado desde el código del repo emme-beauty-lauti. Si el código y este archivo divergen, gana el código.*
