# EMME Beauty — Resumen de la sección Configuración

*Documento para Lu · Actualizado agosto 2026*

---

## ¿Qué es esto?

En el menú lateral de la app aparece una nueva sección llamada **Configuración**. Desde ahí se puede ver y ajustar parte del funcionamiento del salón, sobre todo lo relacionado con **WhatsApp** y los **recordatorios automáticos** a las clientas.

No hace falta tocar la consola del computador ni códigos raros para la mayoría de las cosas: todo se maneja desde la pantalla, con el mismo diseño limpio que el resto del sistema.

---

## ¿Qué se puede hacer hoy?

### 1. Datos del local (pestaña *General*)

- Se muestran el **nombre del salón** y la **dirección** tal como están configurados en el servidor (son los mismos datos que aparecen en los mensajes de WhatsApp).
- Se pueden guardar datos de contacto del local: **teléfono** e **Instagram**, más una **descripción corta** opcional.
- Esos datos de contacto se guardan en el navegador de quien los cargue.

### 2. WhatsApp (pestaña *WhatsApp*)

Esta es la parte más importante para el día a día.

**Conexión**
- Se ve si WhatsApp está **conectado**, **desconectado** o **esperando escaneo de QR**.
- Si hay que vincular de nuevo, el **código QR aparece en la pantalla** (ya no hace falta mirarlo en la terminal del servidor).
- Hay dos botones útiles:
  - **Reiniciar conexión** — intenta reconectar.
  - **Borrar sesión y reconectar** — sirve cuando la sesión quedó trabada; genera un QR nuevo para escanear con el celular.

**Cómo escanear el QR**
1. En el celular: WhatsApp → **Dispositivos vinculados** → **Vincular dispositivo**.
2. Escanear el código que aparece en la pantalla de Configuración.

**Recordatorios automáticos**
- El sistema puede avisar a las clientas **antes de su turno** (por defecto, 24 horas antes; eso se define en la configuración del servidor).
- En pantalla hay una **vista previa** de cómo se ve el mensaje que recibiría una clienta (ejemplo con datos de prueba).
- El texto del recordatorio es el **mensaje estándar del salón**; por ahora **no se edita desde la web** (solo se visualiza).

**Mensaje de prueba**
- Se puede enviar un WhatsApp de prueba a un número ingresado, para confirmar que todo funciona antes de confiar en los recordatorios automáticos.

### 3. Servicios y extras (pestaña *Servicios*)

- Lista de **servicios** que se ofrecen al agendar turnos.
- Lista de **extras** (adicionales al cobrar) con sus precios.
- Por ahora es **solo consulta**; para agregar o modificar servicios y extras hay que hacerlo en la base de datos o pedir ayuda técnica.

### 4. Horario de atención (pestaña *Agenda*)

- Permite definir **apertura**, **cierre**, **duración de bloques** y **días laborables**.
- **Importante:** esos valores se guardan como preferencia en el navegador, pero **la agenda de turnos todavía no los usa automáticamente**. La grilla sigue funcionando con el horario que ya tenía el sistema. Esto quedaría para una mejora futura.

---

## ¿Qué NO hace todavía esta sección?

| Función | Estado |
|--------|--------|
| Editar el texto del recordatorio desde la web | No disponible (solo vista previa) |
| Cambiar nombre/dirección del salón desde la web | Solo lectura (se cambia en configuración del servidor) |
| Modificar servicios y precios desde Configuración | Solo lectura |
| Que el horario de Agenda afecte la grilla de turnos | Pendiente |

---

## Flujo recomendado para Lu (uso normal)

1. Entrar a **Configuración → WhatsApp**.
2. Verificar que diga **Conectado** (badge verde).
3. Si no está conectado: **Borrar sesión y reconectar** → escanear QR → esperar a que diga Conectado.
4. Opcional: **Enviar prueba** a un número propio para confirmar que llega el mensaje.
5. Revisar la **vista previa** del recordatorio para saber qué recibirán las clientas.
6. El resto del trabajo (turnos, clientas, cobros) sigue igual en las otras secciones del menú.

---

## Si algo no funciona

- **No aparece el QR:** usar *Actualizar estado* o *Reiniciar conexión*. Refrescar la página (F5).
- **WhatsApp deshabilitado:** alguien con acceso al servidor debe activarlo (variable `WHATSAPP_ENABLED=true`).
- **La dirección no coincide:** la dirección oficial sale de la configuración del servidor; si cambió la dirección física del local, hay que actualizarla ahí y reiniciar el backend.
- **Recordatorios no salen:** WhatsApp tiene que estar en *Conectado* y las clientas deben tener teléfono cargado en su ficha.

---

## En una frase

La sección **Configuración** concentra todo lo necesario para **conectar WhatsApp desde la pantalla**, **ver el estado del bot** y **revisar cómo serán los recordatorios**, sin depender de la consola técnica — dejando listo el camino para seguir sumando ajustes (mensajes editables, horarios que impacten la agenda, etc.) más adelante.

---

*¿Dudas o algo que quieras que se pueda cambiar desde acá? Anotalo y lo vemos en la próxima iteración.*
