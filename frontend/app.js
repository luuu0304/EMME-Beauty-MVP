// ==========================================================================
// 1. UTILIDADES GLOBALES Y NOTIFICACIONES
// ==========================================================================

// Sistema de notificaciones (Toasts)
function mostrarNotificacion(mensaje, tipo = 'success') {
    const contenedor = document.getElementById('toastContainer');
    if (!contenedor) return;

    const toast = document.createElement('div');
    toast.classList.add('toast', tipo);
    toast.textContent = mensaje;

    contenedor.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'deslizarDesaparecer 0.4s forwards';
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3500);
}

// Inicialización general al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    cargarClientas();
    cargarEmpleadas();
});

// ==========================================================================
// 2. NAVEGACIÓN Y MENÚ LATERAL
// ==========================================================================

const botonesMenu = document.querySelectorAll('.menu-item');
const seccionTurnos = document.getElementById('seccionTurnos');
const seccionClientas = document.getElementById('seccionClientas');
const seccionEmpleados = document.getElementById('seccionEmpleados');

const tituloHeader = document.querySelector('.header h1');
const btnNuevoTurno = document.getElementById('btnNuevoTurno');
const btnNuevaClienta = document.getElementById('btnNuevaClienta');
const buscadorClientas = document.getElementById('buscadorClientas');
const btnNuevaEmpleada = document.getElementById('btnNuevaEmpleada');

botonesMenu.forEach(boton => {
    boton.addEventListener('click', () => {
        // Cambiar botón activo
        botonesMenu.forEach(b => b.classList.remove('active'));
        boton.classList.add('active');

        // Ocultar todas las secciones
        seccionTurnos.style.display = 'none';
        seccionClientas.style.display = 'none';
        seccionEmpleados.style.display = 'none';

        const opcionSeleccionada = boton.textContent.trim();

        if (opcionSeleccionada === 'Turnos') {
            seccionTurnos.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Turnos';
            btnNuevaEmpleada.style.display = 'none';
            btnNuevoTurno.style.display = 'block';
            btnNuevaClienta.style.display = 'none';
            buscadorClientas.style.display = 'none';

        } else if (opcionSeleccionada === 'Clientas') {
            seccionClientas.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Clientas';
            btnNuevaEmpleada.style.display = 'none';
            btnNuevoTurno.style.display = 'none';
            btnNuevaClienta.style.display = 'block';
            buscadorClientas.style.display = 'block';
            cargarClientas();

        } else if (opcionSeleccionada === 'Empleados') {
            seccionEmpleados.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Empleados';
            btnNuevaEmpleada.style.display = 'block';
            btnNuevoTurno.style.display = 'none';
            btnNuevaClienta.style.display = 'none';
            buscadorClientas.style.display = 'none';
            cargarEmpleadas();
        }
    });
});

// ==========================================================================
// 3. MÓDULO DE TURNOS Y CALENDARIO
// ==========================================================================

// --- Calendario (FullCalendar) ---
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendario');
    
    if (calendarEl) {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            locale: 'es', 
            height: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridWeek,timeGridDay'
            },
            slotMinTime: '09:30:00', 
            slotMaxTime: '21:30:00', 
            allDaySlot: false, 
            events: 'http://localhost:3000/api/turnos',
            eventColor: 'var(--mostaza)'
        });
        calendar.render();
    }
});

// --- Modal de Turnos ---
const modalTurno = document.getElementById('modalNuevoTurno');

function abrirModalTurno() {
    if (modalTurno) modalTurno.classList.add('active');
}

function cerrarModalTurno() {
    if (modalTurno) modalTurno.classList.remove('active');
}

if (modalTurno) {
    modalTurno.addEventListener('click', function(e) {
        if(e.target === modalTurno) cerrarModalTurno();
    });
}

// --- Bloquear días pasados en el calendario de turnos ---
const inputFechaTurno = document.getElementById('fechaTurnoInput');
if (inputFechaTurno) {
    const hoy = new Date().toISOString().split('T')[0];
    inputFechaTurno.setAttribute('min', hoy);
}

// --- Lógica Clienta Express en Turnos ---
const btnNuevaExpress = document.getElementById('btnNuevaClientaExpress');
const btnCancelarExpress = document.getElementById('btnCancelarExpress');
const grupoSeleccion = document.getElementById('grupoSeleccionClienta');
const grupoExpress = document.getElementById('grupoClientaExpress');
const inputNombreExpress = document.getElementById('nombreExpress');
const inputApellidoExpress = document.getElementById('apellidoExpress');

if (btnNuevaExpress) {
    btnNuevaExpress.addEventListener('click', () => {
        grupoSeleccion.style.display = 'none';
        grupoExpress.style.display = 'block'; 
    });
}

if (btnCancelarExpress) {
    btnCancelarExpress.addEventListener('click', () => {
        grupoExpress.style.display = 'none';  
        grupoSeleccion.style.display = 'block';
        inputNombreExpress.value = '';
        inputApellidoExpress.value = '';
    });
}

// --- Guardar Turno ---
async function guardarTurno() {
    let idClientaFinal;

    if (grupoExpress.style.display === 'block' || grupoExpress.style.display === '') {
        const nombreExp = inputNombreExpress.value.trim();
        const apellidoExp = inputApellidoExpress.value.trim();
        
        if (!nombreExp || !apellidoExp) {
            mostrarNotificacion("Por favor, completá nombre y apellido.", "warning");
            return; 
        }

        try {
            const responseClienta = await fetch('http://localhost:3000/api/clientas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    Nombre: nombreExp, 
                    Apellido: apellidoExp,
                    Fecha_Nac: null,
                    Telefono: null, 
                    Ig: null 
                })
            });
            
            if (!responseClienta.ok) throw new Error('Error al crear clienta express');

            const nuevaClienta = await responseClienta.json();
            idClientaFinal = nuevaClienta.Id_Clienta || nuevaClienta.id; 
            cargarClientas(); 

        } catch (error) {
            console.error("Fallo al crear clienta express:", error);
            mostrarNotificacion("Hubo un error al registrar a la clienta.", "error");
            return; 
        }

    } else {
        idClientaFinal = document.getElementById('selectClientaTurno').value;
        if (!idClientaFinal) {
            mostrarNotificacion("Por favor, seleccioná una clienta de la lista.", "warning");
            return;
        }
    }

    const idEmpleada = document.getElementById('selectEmpleadaTurno').value;
    const idServicio = document.getElementById('selectServicioTurno').value;
    const fecha = document.getElementById('fechaTurnoInput').value;
    const hora = document.getElementById('horaTurnoInput').value;

    if (!idClientaFinal || !idEmpleada || !idServicio || !fecha || !hora) {
        mostrarNotificacion("¡Por favor completá todos los campos para agendar el turno!", "warning");
        return;
    }

    // Validación de horario
    if (hora < "09:30" || hora > "21:30") {
        mostrarNotificacion("Por favor, ingresá un horario dentro de la franja de atención (09:30 a 21:30 hs).", "warning");
        return;
    }

    const fechaHoraCompleta = `${fecha}T${hora}`;
    const nuevoTurno = {
        Id_Clienta: parseInt(idClientaFinal), 
        Id_Empleada: parseInt(idEmpleada),
        Id_Servicio: parseInt(idServicio),
        Fecha_Hora: fechaHoraCompleta
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/turnos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoTurno)
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Turno agendado con éxito! 📅✨", "success");
            cerrarModalTurno();
            location.reload();
        } else {
            mostrarNotificacion("Hubo un error al guardar el turno en el servidor.", "error");
        }
    } catch (error) {
        console.error("Error enviando el turno:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
    }
}

// ==========================================================================
// 4. MÓDULO DE CLIENTAS
// ==========================================================================

// --- Modal Clientas ---
const modal = document.getElementById('modalNuevaClienta');

function abrirModal() {
    if (modal) modal.classList.add('active');
}

function cerrarModal() {
    if (modal) modal.classList.remove('active');
}

if (modal) {
    modal.addEventListener('click', function(e) {
        if(e.target === modal) cerrarModal();
    });
}

// --- Cargar Clientas ---
async function cargarClientas() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/clientas');
        const clientas = await respuesta.json();
        
        // Llenar select del modal de turnos
        const selectTurno = document.getElementById('selectClientaTurno');
        if (selectTurno) {
            selectTurno.innerHTML = '<option value="">Seleccione una clienta...</option>';
            clientas.forEach(clienta => {
                const opcion = document.createElement('option');
                opcion.value = clienta.Id_Clienta; 
                opcion.textContent = `${clienta.Nombre} ${clienta.Apellido}`; 
                selectTurno.appendChild(opcion);
            });
        }

        // Dibujar tarjetas
        const contenedor = document.querySelector('#seccionClientas .cards-grid');
        if (!contenedor) return;

        contenedor.innerHTML = '';
        
        clientas.forEach(clienta => {
            const iniciales = `${clienta.Nombre[0]}${clienta.Apellido[0]}`.toUpperCase();
            let fechaNac = 'No registrada';
            if (clienta.Fecha_Nac) {
                fechaNac = new Date(clienta.Fecha_Nac).toLocaleDateString('es-AR');
            }

            const tarjetaHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="avatar">${iniciales}</div>
                        <div class="client-info">
                            <h3>${clienta.Nombre} ${clienta.Apellido}</h3>
                            <span>Cumple: ${fechaNac}</span>
                        </div>
                    </div>
                    <div class="visit-info">
                        <p>Instagram: <strong>${clienta.Ig || '-'}</strong></p>
                        <p>Teléfono: <strong>${clienta.Telefono || '-'}</strong></p>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon">✏️ Editar</button>
                        <button class="btn-icon">👁️ Mirar</button>
                        <button class="btn-icon" style="color: var(--mostaza); border-color: var(--mostaza);">+ Turno</button>
                    </div>
                </div>
            `;
            contenedor.innerHTML += tarjetaHTML;
        });
    } catch (error) {
        console.error("Error conectando con la API de clientas:", error);
    }
}

// --- Guardar Clienta ---
async function guardarClienta() {
    const nombre = document.getElementById('nombreInput').value;
    const apellido = document.getElementById('apellidoInput').value;
    const fechaNac = document.getElementById('cumpleInput').value;
    const telefono = document.getElementById('telefonoInput').value;
    const ig = document.getElementById('igInput').value;

    if (!nombre || !apellido) {
        mostrarNotificacion("¡Por favor completá el Nombre y el Apellido!", "warning");
        return; 
    }

    const nuevaClienta = {
        Nombre: nombre,
        Apellido: apellido,
        Fecha_Nac: fechaNac ? fechaNac : null,
        Telefono: telefono ? telefono : null,
        Ig: ig ? ig : null
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/clientas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaClienta)
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Clienta registrada con éxito! 🎉", "success");
            cerrarModal(); 
            cargarClientas(); 
            
            document.getElementById('nombreInput').value = '';
            document.getElementById('apellidoInput').value = '';
            document.getElementById('cumpleInput').value = '';
            document.getElementById('telefonoInput').value = '';
            document.getElementById('igInput').value = '';
        } else {
            mostrarNotificacion("Hubo un error al registrar en la base de datos.", "error");
        }
    } catch (error) {
        console.error("Error en el envío:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
    }
}

// --- Buscador de Clientas ---
const inputBuscador = document.getElementById('buscadorClientas');
if (inputBuscador) {
    inputBuscador.addEventListener('input', function(evento) {
        const textoBuscado = evento.target.value.toLowerCase();
        const tarjetas = document.querySelectorAll('#seccionClientas .card');
        
        tarjetas.forEach(tarjeta => {
            const nombreClienta = tarjeta.querySelector('h3').textContent.toLowerCase();
            if (nombreClienta.includes(textoBuscado)) {
                tarjeta.style.display = ''; 
            } else {
                tarjeta.style.display = 'none'; 
            }
        });
    });
}

// ==========================================================================
// 5. MÓDULO DE EMPLEADAS
// ==========================================================================

// --- Modal Empleadas ---
const modalEmpleada = document.getElementById('modalNuevaEmpleada');

function abrirModalEmpleada() {
    if (modalEmpleada) modalEmpleada.classList.add('active');
}

function cerrarModalEmpleada() {
    if (modalEmpleada) modalEmpleada.classList.remove('active');
}

if (modalEmpleada) {
    modalEmpleada.addEventListener('click', function(e) {
        if(e.target === modalEmpleada) cerrarModalEmpleada();
    });
}

// --- Cargar Empleadas ---
async function cargarEmpleadas() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/empleadas');
        const empleadas = await respuesta.json();
        
        const contenedor = document.getElementById('contenedorEmpleadas');
        if (!contenedor) return; 
        
        contenedor.innerHTML = '';
        
        empleadas.forEach(empleada => {
            const inicial = empleada.Nombre_Ap[0].toUpperCase();
            const dniText = empleada.DNI || empleada.dni || '-';

            const tarjetaHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="avatar" style="background-color: var(--mostaza); color: white;">${inicial}</div>
                        <div class="client-info">
                            <h3>${empleada.Nombre_Ap}</h3>
                            <span>DNI: ${dniText}</span>
                        </div>
                    </div>
                    <div class="card-actions" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                        <button class="btn-icon">✏️ Editar</button>
                        <button class="btn-icon" style="color: #d9534f;">🗑️ Dar de baja</button>
                    </div>
                </div>
            `;
            contenedor.innerHTML += tarjetaHTML;
        });
    } catch (error) {
        console.error("Error conectando con la API de empleadas:", error);
    }
}

// --- Guardar Empleada ---
async function guardarEmpleada() {
    const nombre = document.getElementById('nombreEmpleadaInput').value.trim();
    const dni = document.getElementById('dniEmpleadaInput').value.trim();

    if (!nombre) {
        mostrarNotificacion("¡Por favor ingresá el nombre de la profesional!", "warning");
        return;
    }

    if (dni){
        const dniRegex = /^\d{7,8}$/; 
        if (!dniRegex.test(dni)) {
            mostrarNotificacion("Por favor, ingresá un DNI válido (7 u 8 números, sin puntos ni letras).", "warning");
            return; 
        }
    }

    try {
        const response = await fetch('http://localhost:3000/api/empleadas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                Nombre_Ap: nombre, 
                Dni: dni || null 
            })
        });

        if (response.ok) {
            mostrarNotificacion("¡Profesional registrada con éxito! ✨", "success");
            cerrarModalEmpleada();
            
            document.getElementById('nombreEmpleadaInput').value = '';
            document.getElementById('dniEmpleadaInput').value = '';
            
            cargarEmpleadas(); 
        } else {
            mostrarNotificacion("Hubo un error al guardar en el servidor.", "error");
        }
    } catch (error) {
        console.error("Error guardando empleada:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
    }
}