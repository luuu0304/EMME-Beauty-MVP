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
    cargarServicios();
});

// --- Sistema de Confirmación Personalizado (Promesa) ---
function pedirConfirmacion(mensaje) {
    return new Promise((resolve) => {
        const modalConf = document.getElementById('modalConfirmacion');
        const textoConf = document.getElementById('textoConfirmacion');
        const btnAceptar = document.getElementById('btnAceptarConfirmacion');
        const btnCancelar = document.getElementById('btnCancelarConfirmacion');

        // Ponemos el texto que queramos mostrar
        textoConf.textContent = mensaje;
        
        // Mostramos el modal
        modalConf.classList.add('active');

        // Si toca aceptar, cerramos el modal y devolvemos "true"
        btnAceptar.onclick = () => {
            modalConf.classList.remove('active');
            resolve(true);
        };

        // Si toca cancelar, cerramos y devolvemos "false"
        btnCancelar.onclick = () => {
            modalConf.classList.remove('active');
            resolve(false);
        };
    });
}

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

// --- Atajo: Agendar turno desde la tarjeta de Clienta ---
function agendarTurnoRapido(idClienta) {
    // 1. Nos aseguramos de que el selector clásico esté visible (y el express oculto)
    const grupoSeleccion = document.getElementById('grupoSeleccionClienta');
    const grupoExpress = document.getElementById('grupoClientaExpress');
    
    if (grupoSeleccion && grupoExpress) {
        grupoExpress.style.display = 'none';
        grupoSeleccion.style.display = 'block';
    }

    // 2. Buscamos el desplegable y le asignamos mágicamente el ID de la clienta
    const selectClienta = document.getElementById('selectClientaTurno');
    if (selectClienta) {
        selectClienta.value = idClienta;
    }

    // 3. Abrimos el modal de turnos
    abrirModalTurno();
}

// --- Cargar Servicios en el desplegable de Turnos ---
async function cargarServicios() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/servicios');
        const servicios = await respuesta.json();
        
        const selectServicio = document.getElementById('selectServicioTurno');
        if (selectServicio) {
            selectServicio.innerHTML = '<option value="">Seleccione...</option>';
            
            servicios.forEach(servicio => {
                const opcion = document.createElement('option');
                opcion.value = servicio.Id_Servicio;
                opcion.textContent = servicio.Nombre;
                selectServicio.appendChild(opcion);
            });
        }
    } catch (error) {
        console.error("Error conectando con la API de servicios:", error);
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

// --- Prepara el modal para CREAR de cero ---
function prepararNuevaClienta() {
    document.getElementById('idClientaOculto').value = ''; 
    document.getElementById('nombreInput').value = '';
    document.getElementById('apellidoInput').value = '';
    document.getElementById('cumpleInput').value = '';
    document.getElementById('telefonoInput').value = '';
    document.getElementById('igInput').value = '';
    
    document.getElementById('tituloModalClienta').textContent = 'Registre un nuevo Cliente';
    document.getElementById('btnGuardarClienta').textContent = 'Registrar';
    
    abrirModal();
}

// --- Prepara el modal para EDITAR ---
function abrirModalEditarClienta(id, nombre, apellido, fechaNac, telefono, ig) {
    document.getElementById('idClientaOculto').value = id; 
    document.getElementById('nombreInput').value = nombre;
    document.getElementById('apellidoInput').value = apellido;
    
    // Tratamiento especial para la fecha
    if (fechaNac && fechaNac !== 'null' && fechaNac !== 'undefined') {
        document.getElementById('cumpleInput').value = fechaNac.split('T')[0];
    } else {
        document.getElementById('cumpleInput').value = '';
    }

    document.getElementById('telefonoInput').value = (telefono === 'null' || !telefono || telefono === 'undefined') ? '' : telefono;
    document.getElementById('igInput').value = (ig === 'null' || !ig || ig === 'undefined') ? '' : ig;
    
    document.getElementById('tituloModalClienta').textContent = 'Editar Clienta';
    document.getElementById('btnGuardarClienta').textContent = 'Actualizar';
    
    abrirModal();
}

// --- Modal Perfil / Historial ---
const modalPerfil = document.getElementById('modalPerfilClienta');

function cerrarModalPerfil() {
    if (modalPerfil) modalPerfil.classList.remove('active');
}

if (modalPerfil) {
    modalPerfil.addEventListener('click', function(e) {
        if(e.target === modalPerfil) cerrarModalPerfil();
    });
}

// --- Función para ver el perfil ---
async function verPerfilClienta(idClienta, nombre, apellido) {
    // 1. Ponemos el nombre de la clienta en el título
    document.getElementById('nombrePerfilClienta').textContent = `Historial de ${nombre} ${apellido}`;
    
    const listaHistorial = document.getElementById('listaHistorialClienta');
    listaHistorial.innerHTML = '<p style="text-align:center; color:#888;">Cargando historial...</p>';
    
    // 2. Abrimos el modal
    modalPerfil.classList.add('active');

    try {
        // 3. Vamos a buscar los datos al backend
        const respuesta = await fetch(`http://localhost:3000/api/clientas/${idClienta}/historial`);
        const historial = await respuesta.json();

        listaHistorial.innerHTML = ''; // Limpiamos el "Cargando..."

        if (historial.length === 0) {
            listaHistorial.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">Esta clienta aún no tiene turnos registrados. 💅</p>';
            return;
        }

        // 4. Dibujamos cada turno pasado
        historial.forEach(turno => {
            // Formateamos la fecha para que se lea linda (ej. "23/06/2026 - 15:30 hs")
            const fechaObj = new Date(turno.Fecha_Hora);
            const fechaLimpia = fechaObj.toLocaleDateString('es-AR');
            const horaLimpia = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            const itemHTML = `
                <div style="background-color: #f9f9f9; border-left: 4px solid var(--mostaza); padding: 10px 15px; margin-bottom: 10px; border-radius: 4px;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${turno.Nombre_Servicio}</div>
                    <div style="font-size: 13px; color: #666; display: flex; justify-content: space-between;">
                        <span>📅 ${fechaLimpia} a las ${horaLimpia} hs</span>
                        <span>👩‍💼 con ${turno.Nombre_Ap}</span>
                    </div>
                </div>
            `;
            listaHistorial.innerHTML += itemHTML;
        });

    } catch (error) {
        console.error("Error cargando historial:", error);
        listaHistorial.innerHTML = '<p style="text-align:center; color:#d9534f;">Hubo un error al cargar los datos.</p>';
    }
}

// --- Cargar Clientas (Dibuja las tarjetas y llena el select de turnos) ---
async function cargarClientas() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/clientas');
        const clientas = await respuesta.json();
        
        // 1. Llenar select del modal de turnos
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

        // 2. Dibujar tarjetas
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
                        <button class="btn-icon" onclick="abrirModalEditarClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}', '${clienta.Fecha_Nac}', '${clienta.Telefono}', '${clienta.Ig}')">✏️ Editar</button>
                        <button class="btn-icon" onclick="verPerfilClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}')">👁️ Mirar</button>
                        <button class="btn-icon" style="color: var(--mostaza); border-color: var(--mostaza);" onclick="agendarTurnoRapido('${clienta.Id_Clienta}')">+ Turno</button>
                    </div>
                </div>
            `;
            contenedor.innerHTML += tarjetaHTML;
        });
    } catch (error) {
        console.error("Error conectando con la API de clientas:", error);
    }
}

// --- Guardar Clienta (POST y PUT) ---
async function guardarClienta() {
    const idOculto = document.getElementById('idClientaOculto').value;
    const nombre = document.getElementById('nombreInput').value.trim();
    const apellido = document.getElementById('apellidoInput').value.trim();
    const fechaNac = document.getElementById('cumpleInput').value;
    const telefono = document.getElementById('telefonoInput').value.trim();
    const ig = document.getElementById('igInput').value.trim();

    if (!nombre || !apellido) {
        mostrarNotificacion("¡Por favor completá el Nombre y el Apellido!", "warning");
        return; 
    }

    const clientaData = {
        Nombre: nombre,
        Apellido: apellido,
        Fecha_Nac: fechaNac ? fechaNac : null,
        Telefono: telefono ? telefono : null,
        Ig: ig ? ig : null
    };

    const url = idOculto 
        ? `http://localhost:3000/api/clientas/${idOculto}` 
        : 'http://localhost:3000/api/clientas';
        
    const metodoElegido = idOculto ? 'PUT' : 'POST';

    try {
        const respuesta = await fetch(url, {
            method: metodoElegido,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientaData)
        });

        if (respuesta.ok) {
            const mensajeExito = idOculto ? "¡Datos actualizados con éxito! ✏️" : "¡Clienta registrada con éxito! 🎉";
            mostrarNotificacion(mensajeExito, "success");
            cerrarModal(); 
            cargarClientas(); 
        } else {
            mostrarNotificacion("Hubo un error al guardar en la base de datos.", "error");
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

// --- Prepara el modal para CREAR de cero ---
function prepararNuevaEmpleada() {
    document.getElementById('idEmpleadaOculto').value = ''; 
    document.getElementById('nombreEmpleadaInput').value = '';
    document.getElementById('dniEmpleadaInput').value = '';
    
    document.getElementById('tituloModalEmpleada').textContent = 'Registrar Nueva Profesional';
    document.getElementById('btnGuardarEmpleada').textContent = 'Registrar';
    
    abrirModalEmpleada();
}

// --- Prepara el modal para EDITAR ---
function abrirModalEditarEmpleada(id, nombre, dni) {
    document.getElementById('idEmpleadaOculto').value = id; 
    document.getElementById('nombreEmpleadaInput').value = nombre;
    
    document.getElementById('dniEmpleadaInput').value = (dni === '-' || !dni) ? '' : dni;
    
    document.getElementById('tituloModalEmpleada').textContent = 'Editar Profesional';
    document.getElementById('btnGuardarEmpleada').textContent = 'Actualizar';
    
    abrirModalEmpleada();
}

// --- Guardar (Sirve para POST y PUT) ---
async function guardarEmpleada() {
    const idOculto = document.getElementById('idEmpleadaOculto').value;
    const nombre = document.getElementById('nombreEmpleadaInput').value.trim();
    const dni = document.getElementById('dniEmpleadaInput').value.trim();

    if (!nombre) {
        mostrarNotificacion("¡Por favor ingresá el nombre de la profesional!", "warning");
        return;
    }

    if (dni){
        const dniRegex = /^\d{7,8}$/; 
        if (!dniRegex.test(dni)) {
            mostrarNotificacion("Por favor, ingresá un DNI válido (7 u 8 números).", "warning");
            return; 
        }
    }

    const url = idOculto 
        ? `http://localhost:3000/api/empleadas/${idOculto}` 
        : 'http://localhost:3000/api/empleadas';
        
    const metodoElegido = idOculto ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodoElegido,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Nombre_Ap: nombre, Dni: dni || null })
        });

        if (response.ok) {
            const mensajeExito = idOculto ? "¡Datos actualizados con éxito! ✏️" : "¡Profesional registrada con éxito! ✨";
            mostrarNotificacion(mensajeExito, "success");
            
            cerrarModalEmpleada();
            cargarEmpleadas(); 
        } else {
            mostrarNotificacion("Hubo un error al guardar en el servidor.", "error");
        }
    } catch (error) {
        console.error("Error guardando empleada:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
    }
}

// --- Cargar Empleadas (Dibuja las tarjetas) ---
async function cargarEmpleadas() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/empleadas');
        const empleadas = await respuesta.json();
        // ================================================================
        // NUEVO: Llenamos el desplegable de Profesionales en el modal de Turnos
        // ================================================================
        const selectEmpleada = document.getElementById('selectEmpleadaTurno');
        if (selectEmpleada) {
            // Limpiamos las opciones viejas
            selectEmpleada.innerHTML = '<option value="">Seleccione...</option>';
            
            // Agregamos a cada chica disponible
            empleadas.forEach(empleada => {
                const opcion = document.createElement('option');
                opcion.value = empleada.Id_Empleada; // El ID real de la base de datos
                opcion.textContent = empleada.Nombre_Ap; // El nombre que ve la clienta
                selectEmpleada.appendChild(opcion);
            });
        }
        // ================================================================
        
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
                        <button class="btn-icon" onclick="abrirModalEditarEmpleada('${empleada.Id_Empleada}', '${empleada.Nombre_Ap}', '${dniText}')">✏️ Editar</button>
                        <button class="btn-icon" style="color: #d9534f;" onclick="eliminarEmpleada(${empleada.Id_Empleada})">🗑️ Dar de baja</button>
                    </div>
                </div>
            `;
            contenedor.innerHTML += tarjetaHTML;
        });
    } catch (error) {
        console.error("Error conectando con la API de empleadas:", error);
    }
}

// --- Eliminar Empleada (Con Promesa Estética) ---
async function eliminarEmpleada(id) {
    const confirmacion = await pedirConfirmacion("¿Estás segura de que querés dar de baja a esta profesional? Esta acción no se puede deshacer.");
    
    if (!confirmacion) return; 

    try {
        const respuesta = await fetch(`http://localhost:3000/api/empleadas/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            mostrarNotificacion("Profesional dada de baja con éxito.", "success");
            cargarEmpleadas(); 
        } else {
            mostrarNotificacion("Hubo un error al intentar eliminar en la base de datos.", "error");
        }
    } catch (error) {
        console.error("Error eliminando empleada:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
    }
}   