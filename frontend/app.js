// Backend API — puerto 7777 (ver backend/.env)
const API_BASE = 'http://localhost:7777/api';

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
    cargarCategoriasGasto()
    cargarExtrasDisponibles()
    inicializarFechaAgenda();
    inicializarAgendaDiaria();
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
const seccionGastos = document.getElementById('seccionGastos');
const seccionIngresos = document.getElementById('seccionIngresos'); 
const seccionConfiguracion = document.getElementById('seccionConfiguracion');

const tituloHeader = document.querySelector('.header h1');
const btnNuevoTurno = document.getElementById('btnNuevoTurno');
const btnNuevaClienta = document.getElementById('btnNuevaClienta');
const buscadorClientas = document.getElementById('buscadorClientas');
const btnNuevaEmpleada = document.getElementById('btnNuevaEmpleada');
const btnNuevoGasto = document.getElementById('btnNuevoGasto');

botonesMenu.forEach(boton => {
    boton.addEventListener('click', () => {
        // 1. Cambiar la pestaña activa en el menú lateral
        botonesMenu.forEach(b => b.classList.remove('active'));
        boton.classList.add('active');

        // 2. Ocultar TODAS las secciones centrales
        seccionTurnos.style.display = 'none';
        seccionClientas.style.display = 'none';
        seccionEmpleados.style.display = 'none';
        seccionGastos.style.display = 'none';
        // 2.1 Ocultamos la nueva sección
        if(seccionIngresos) seccionIngresos.style.display = 'none'; 
        if(seccionConfiguracion) seccionConfiguracion.style.display = 'none';

        // 3. APAGAR TODOS LOS BOTONES SUPERIORES POR DEFECTO
        btnNuevoTurno.style.display = 'none';
        btnNuevaClienta.style.display = 'none';
        btnNuevaEmpleada.style.display = 'none';
        btnNuevoGasto.style.display = 'none';
        buscadorClientas.style.display = 'none';

        // 4. Prender solo lo que corresponde según la pestaña
        const opcionSeleccionada = boton.textContent.trim();

        if (opcionSeleccionada === 'Turnos') {
            seccionTurnos.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Turnos';
            btnNuevoTurno.style.display = 'block'; 

        } else if (opcionSeleccionada === 'Clientas') {
            seccionClientas.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Clientas';
            btnNuevaClienta.style.display = 'block'; 
            buscadorClientas.style.display = 'block'; 
            cargarClientas();

        } else if (opcionSeleccionada === 'Empleados') {
            seccionEmpleados.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Empleados';
            btnNuevaEmpleada.style.display = 'block'; 
            cargarEmpleadas();

        } else if (opcionSeleccionada === 'Gastos') {
            seccionGastos.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Gastos';
            btnNuevoGasto.style.display = 'block'; 
            cargarGastos(); 
            
        // 4.1 Agregamos la lógica para la pestaña de Ingresos
        } else if (opcionSeleccionada === 'Ingresos') {
            if(seccionIngresos) seccionIngresos.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Ingresos';
            cargarIngresos();

        } else if (opcionSeleccionada === 'Configuración') {
            if(seccionConfiguracion) seccionConfiguracion.style.display = 'block';
            tituloHeader.textContent = 'Configuración del Sistema';
            cargarSeccionConfiguracion();
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
            events: 'http://localhost:7777/api/turnos',
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
        const respuesta = await fetch('http://localhost:7777/api/turnos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoTurno)
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Turno agendado con éxito! 📅✨", "success");
            cerrarModalTurno();
            location.reload();
        } else {
            // AHORA LEEMOS EL MENSAJE DEL BACKEND
            const mensajeError = await respuesta.text();
            // Mostramos el mensaje exacto que nos devolvió SQL/Node
            mostrarNotificacion(`Ups: ${mensajeError}`, "error");
        }
    } catch (error) {
        console.error("Error enviando el turno:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
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

    const fechaHoraCompleta = `${fecha}T${hora}:00`;
    const nuevoTurno = {
        Id_Clienta: parseInt(idClientaFinal), 
        Id_Empleada: parseInt(idEmpleada),
        Id_Servicio: parseInt(idServicio),
        Fecha_Hora: fechaHoraCompleta
    };

    try {
        const respuesta = await fetch('http://localhost:7777/api/turnos', {
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
        const respuesta = await fetch('http://localhost:7777/api/servicios');
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

// --- Inicializar y dibujar la Agenda Diaria ---
async function inicializarAgendaDiaria() {
    try {
        // 1. Buscamos a las profesionales en la base de datos
        const respuesta = await fetch('http://localhost:7777/api/empleadas');
        const empleadas = await respuesta.json();

        // 2. Dibujamos el Encabezado (Los nombres arriba)
        const agendaHeader = document.getElementById('agendaHeader');
        if (agendaHeader) {
            agendaHeader.innerHTML = '<div class="hora-col">Hora</div>';
            empleadas.forEach(emp => {
                // Asumimos que la columna de tu tabla se llama Nombre_Ap
                agendaHeader.innerHTML += `<div style="font-weight: 600; color: #333;">${emp.Nombre_Ap}</div>`;
            });
        }

        // 3. Dibujamos el Cuerpo (Las filas de 30 min y las celdas vacías)
        const agendaBody = document.getElementById('agendaBody');
        if (!agendaBody) return;
        
        agendaBody.innerHTML = ''; 
        
        const horaInicio = 9; // 09:00 hs
        const horaFin = 20;   // 20:00 hs
        
        for (let hora = horaInicio; hora <= horaFin; hora++) {
            // --- Bloque de la hora en punto (XX:00) ---
            let stringHoraEnPunto = hora.toString().padStart(2, '0') + ':00';
            let filaEnPunto = document.createElement('div');
            filaEnPunto.className = 'agenda-row hora-en-punto';
            
            let htmlFilaEnPunto = `<div class="hora-col">${stringHoraEnPunto}</div>`;
            
            // Creamos un "cuadradito" vacío por cada profesional para esta hora
            empleadas.forEach(emp => {
                htmlFilaEnPunto += `<div class="agenda-celda" data-hora="${stringHoraEnPunto}" data-id-empleada="${emp.Id_Empleada}"></div>`;
            });
            
            filaEnPunto.innerHTML = htmlFilaEnPunto;
            agendaBody.appendChild(filaEnPunto);
            
            // --- Bloque de la media hora (XX:30) ---
            if (hora < horaFin) {
                let stringHoraMedia = hora.toString().padStart(2, '0') + ':30';
                let filaMediaHora = document.createElement('div');
                filaMediaHora.className = 'agenda-row';
                
                let htmlFilaMedia = `<div class="hora-col">${stringHoraMedia}</div>`;
                
                // Creamos un "cuadradito" vacío por cada profesional para esta media hora
                empleadas.forEach(emp => {
                    htmlFilaMedia += `<div class="agenda-celda" data-hora="${stringHoraMedia}" data-id-empleada="${emp.Id_Empleada}"></div>`;
                });
                
                filaMediaHora.innerHTML = htmlFilaMedia;
                agendaBody.appendChild(filaMediaHora);
            }
        }
        // 4. Escuchar los cambios de fecha (Input manual y Flechas)
        const inputFecha = document.getElementById('fechaAgendaInput');
        const btnAnterior = document.getElementById('btnDiaAnterior');
        const btnSiguiente = document.getElementById('btnDiaSiguiente');

        if (inputFecha) {
            // Si elige la fecha en el calendario del input
            inputFecha.addEventListener('change', cargarTurnosAgenda);
            
            // Flecha para ATRÁS
            if (btnAnterior) {
                btnAnterior.addEventListener('click', () => {
                    // El 'T00:00:00' evita que el navegador se confunda con la zona horaria
                    const fechaActual = new Date(inputFecha.value + 'T00:00:00');
                    fechaActual.setDate(fechaActual.getDate() - 1);
                    
                    const yyyy = fechaActual.getFullYear();
                    const mm = String(fechaActual.getMonth() + 1).padStart(2, '0');
                    const dd = String(fechaActual.getDate()).padStart(2, '0');
                    
                    inputFecha.value = `${yyyy}-${mm}-${dd}`;
                    cargarTurnosAgenda(); // Inyectamos los turnos del nuevo día
                });
            }

            // Flecha para ADELANTE
            if (btnSiguiente) {
                btnSiguiente.addEventListener('click', () => {
                    const fechaActual = new Date(inputFecha.value + 'T00:00:00');
                    fechaActual.setDate(fechaActual.getDate() + 1);
                    
                    const yyyy = fechaActual.getFullYear();
                    const mm = String(fechaActual.getMonth() + 1).padStart(2, '0');
                    const dd = String(fechaActual.getDate()).padStart(2, '0');
                    
                    inputFecha.value = `${yyyy}-${mm}-${dd}`;
                    cargarTurnosAgenda(); // Inyectamos los turnos del nuevo día
                });
            }
        }

        // 5. Cargar los turnos del día de hoy por primera vez
        cargarTurnosAgenda();
    } catch (error) {
        console.error("Error al cargar la agenda diaria:", error);
    }
}

// --- Poner la fecha de hoy por defecto al cargar ---
function inicializarFechaAgenda() {
    const inputFecha = document.getElementById('fechaAgendaInput');
    if (inputFecha) {
        // Obtenemos la fecha actual y la formateamos a YYYY-MM-DD
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        
        inputFecha.value = `${yyyy}-${mm}-${dd}`;
    }
}

// --- Alternar entre Vista Diaria y Semanal ---
function cambiarVistaAgenda(vista) {
    const vistaDiaria = document.getElementById('vistaDiaria');
    const vistaSemanal = document.getElementById('vistaSemanal');
    const btnDiaria = document.getElementById('btnVistaDiaria');
    const btnSemanal = document.getElementById('btnVistaSemanal');

    if (vista === 'diaria') {
        vistaDiaria.style.display = 'block';
        vistaSemanal.style.display = 'none';
        
        btnDiaria.classList.add('active');
        btnSemanal.classList.remove('active');
    } else {
        vistaDiaria.style.display = 'none';
        vistaSemanal.style.display = 'block';
        
        btnSemanal.classList.add('active');
        btnDiaria.classList.remove('active');
    }
}

// --- Cargar y dibujar los turnos en la grilla ---
async function cargarTurnosAgenda() {
    const inputFecha = document.getElementById('fechaAgendaInput');
    if (!inputFecha || !inputFecha.value) return;

    try {
        const respuesta = await fetch(`http://localhost:7777/api/turnos/fecha/${inputFecha.value}`);
        const turnos = await respuesta.json();

        // 1. Limpieza: Borramos las tarjetitas que ya estaban dibujadas
        document.querySelectorAll('.turno-card').forEach(card => card.remove());

        // TRUCO DE DEBUG: Ver en consola qué estamos recibiendo
        console.log("Turnos para el día:", turnos);

        // 2. Dibujamos los nuevos turnos
        turnos.forEach(turno => {
            // SOLUCIÓN ZONA HORARIA: Convertimos a Objeto Date y le pedimos la hora local
            const fechaObj = new Date(turno.Fecha_Hora);
            const horas = fechaObj.getHours().toString().padStart(2, '0');
            const minutos = fechaObj.getMinutes().toString().padStart(2, '0');
            const horaFormateada = `${horas}:${minutos}`; 
            
            // Buscamos la coordenada exacta
            const celdaDestino = document.querySelector(`.agenda-celda[data-hora="${horaFormateada}"][data-id-empleada="${turno.Id_Empleada}"]`);

            if (celdaDestino) {
                celdaDestino.style.position = 'relative'; 

                // Matemática visual: 2 píxeles por cada minuto
                const alturaPixeles = (turno.Duracion_Minutos || 30) * 2; // El || 30 es un seguro por si falla la base

                const tarjeta = document.createElement('div');
                tarjeta.className = 'turno-card';
                tarjeta.style.height = `${alturaPixeles}px`;
                tarjeta.style.cursor = 'pointer';

                tarjeta.onclick = () => {
                    const precioServicio = turno.Precio_Base || 0; 
                    abrirModalDetalleTurno(
                        turno.Id_Turno, 
                        turno.Nombre_Clienta, 
                        turno.Nombre_Servicio, 
                        precioServicio,
                        turno.Estado, 
                        turno.Color);
                };
                tarjeta.innerHTML = `
                    <div class="turno-titulo">${turno.Nombre_Clienta}</div>
                    <div class="turno-detalle">${turno.Nombre_Servicio}</div>
                `;

                celdaDestino.appendChild(tarjeta);
            } else {
                console.warn(`No se encontró la celda para las ${horaFormateada} y empleada ID: ${turno.Id_Empleada}`);
            }
        });
    } catch (error) {
        console.error("Error inyectando turnos en la agenda:", error);
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
        const respuesta = await fetch(`http://localhost:7777/api/clientas/${idClienta}/historial`);
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

// --- Alternar Vistas de Clientas ---
function cambiarVistaClientas(vista) {
    const vistaTarjetas = document.getElementById('vistaClientasTarjetas');
    const vistaLista = document.getElementById('vistaClientasListado');
    const btnTarjetas = document.getElementById('btnVistaTarjetas');
    const btnLista = document.getElementById('btnVistaLista');

    if (vista === 'tarjetas') {
        vistaTarjetas.style.display = 'grid'; // O el display que use tu clase cards-grid
        vistaLista.style.display = 'none';
        btnTarjetas.classList.add('active');
        btnLista.classList.remove('active');
    } else {
        vistaTarjetas.style.display = 'none';
        vistaLista.style.display = 'block';
        btnLista.classList.add('active');
        btnTarjetas.classList.remove('active');
    }
}

// --- Cargar Clientas (Genera tarjetas y filas simultáneamente) ---
async function cargarClientas() {
    try {
        const respuesta = await fetch('http://localhost:7777/api/clientas');
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

        // 2. Traer los dos contenedores
        const contenedorTarjetas = document.getElementById('vistaClientasTarjetas');
        const tbodyLista = document.getElementById('tablaClientasBody');
        
        if (contenedorTarjetas) contenedorTarjetas.innerHTML = '';
        if (tbodyLista) tbodyLista.innerHTML = '';
        
        clientas.forEach(clienta => {
            let fechaNac = '-';
            if (clienta.Fecha_Nac) {
                fechaNac = new Date(clienta.Fecha_Nac).toLocaleDateString('es-AR');
            }
            const iniciales = `${clienta.Nombre[0]}${clienta.Apellido[0]}`.toUpperCase();

            // A. DIBUJAR TARJETA
            const tarjetaHTML = `
                <div class="card item-clienta-busqueda"> <!-- Clase unificada para buscar -->
                    <div class="card-header">
                        <div class="avatar">${iniciales}</div>
                        <div class="client-info">
                            <h3 class="nombre-para-buscar">${clienta.Nombre} ${clienta.Apellido}</h3>
                            <span>Cumple: ${fechaNac}</span>
                        </div>
                    </div>
                    <div class="visit-info">
                        <p>Instagram: <strong>${clienta.Ig || '-'}</strong></p>
                        <p>Teléfono: <strong>${clienta.Telefono || '-'}</strong></p>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="abrirModalEditarClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}', '${clienta.Fecha_Nac}', '${clienta.Telefono}', '${clienta.Ig}')">✏️</button>
                        <button class="btn-icon" onclick="verPerfilClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}')">👁️</button>
                        <button class="btn-icon" style="color: var(--mostaza); border-color: var(--mostaza);" onclick="agendarTurnoRapido('${clienta.Id_Clienta}')">+ Turno</button>
                    </div>
                </div>
            `;
            if (contenedorTarjetas) contenedorTarjetas.innerHTML += tarjetaHTML;

            // B. DIBUJAR FILA DE LISTA
            const filaHTML = `
                <tr class="item-clienta-busqueda" style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 15px; font-weight: bold; color: #333;" class="nombre-para-buscar">${clienta.Nombre} ${clienta.Apellido}</td>
                    <td style="padding: 12px 15px;">${clienta.Telefono || '-'}</td>
                    <td style="padding: 12px 15px;">${clienta.Ig || '-'}</td>
                    <td style="padding: 12px 15px;">${fechaNac}</td>
                    <td style="padding: 12px 15px; text-align: center;">
                        <button class="btn-icon" title="Editar" onclick="abrirModalEditarClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}', '${clienta.Fecha_Nac}', '${clienta.Telefono}', '${clienta.Ig}')">✏️</button>
                        <button class="btn-icon" title="Ver Historial" onclick="verPerfilClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}')">👁️</button>
                        <button class="btn-icon" title="Agendar Turno" style="color: var(--mostaza);" onclick="agendarTurnoRapido('${clienta.Id_Clienta}')">📅</button>
                    </td>
                </tr>
            `;
            if (tbodyLista) tbodyLista.innerHTML += filaHTML;
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
        ? `http://localhost:7777/api/clientas/${idOculto}` 
        : 'http://localhost:7777/api/clientas';
        
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

// --- Buscador de Clientas Universal ---
const inputBuscador = document.getElementById('buscadorClientas');
if (inputBuscador) {
    inputBuscador.addEventListener('input', function(evento) {
        const textoBuscado = evento.target.value.toLowerCase();
        
        // Agarramos TANTO las tarjetas COMO las filas de la tabla
        const elementosClienta = document.querySelectorAll('.item-clienta-busqueda');
        
        elementosClienta.forEach(elemento => {
            const nombreClienta = elemento.querySelector('.nombre-para-buscar').textContent.toLowerCase();
            if (nombreClienta.includes(textoBuscado)) {
                elemento.style.display = ''; // Lo vuelve a mostrar en su formato original
            } else {
                elemento.style.display = 'none'; // Lo oculta
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
        ? `http://localhost:7777/api/empleadas/${idOculto}` 
        : 'http://localhost:7777/api/empleadas';
        
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
        const respuesta = await fetch('http://localhost:7777/api/empleadas');
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

// ==========================================================================
// 6. MÓDULO DE GASTOS
// ==========================================================================

const modalGasto = document.getElementById('modalNuevoGasto');

function abrirModalGasto() {
    if (modalGasto) modalGasto.classList.add('active');
}

function cerrarModalGasto() {
    if (modalGasto) modalGasto.classList.remove('active');
}

if (modalGasto) {
    modalGasto.addEventListener('click', function(e) {
        if(e.target === modalGasto) cerrarModalGasto();
    });
}

function prepararNuevoGasto() {
    document.getElementById('idGastoOculto').value = '';
    document.getElementById('descGastoInput').value = '';
    document.getElementById('montoGastoInput').value = '';
    document.getElementById('selectCategoriaGasto').value = '';
    
    // Ponemos la fecha de hoy por defecto
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    document.getElementById('fechaGastoInput').value = `${yyyy}-${mm}-${dd}`;
    
    document.getElementById('tituloModalGasto').textContent = 'Registrar Nuevo Gasto';
    abrirModalGasto();
}

// Llenar el desplegable con las categorías de SQL
async function cargarCategoriasGasto() {
    try {
        const respuesta = await fetch('http://localhost:7777/api/categorias-gastos');
        const categorias = await respuesta.json();
        
        const select = document.getElementById('selectCategoriaGasto');
        if (select) {
            select.innerHTML = '<option value="">Seleccione...</option>';
            categorias.forEach(cat => {
                select.innerHTML += `<option value="${cat.Id_Categoria}">${cat.Nombre}</option>`;
            });
        }
    } catch (error) {
        console.error("Error conectando con la API de categorías:", error);
    }
}

// Variable global para guardar todos los gastos en memoria
let memoriaGastos = [];

// Llenar el desplegable con las categorías (Actualizado para llenar también el filtro)
async function cargarCategoriasGasto() {
    try {
        const respuesta = await fetch('http://localhost:7777/api/categorias-gastos');
        const categorias = await respuesta.json();
        
        const selectModal = document.getElementById('selectCategoriaGasto');
        const selectFiltro = document.getElementById('filtroCategoriaGasto');
        
        if (selectModal) {
            selectModal.innerHTML = '<option value="">Seleccione...</option>';
            categorias.forEach(cat => selectModal.innerHTML += `<option value="${cat.Id_Categoria}">${cat.Nombre}</option>`);
        }
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="todas">Todas las categorías</option>';
            categorias.forEach(cat => selectFiltro.innerHTML += `<option value="${cat.Nombre}">${cat.Nombre}</option>`);
        }
    } catch (error) {
        console.error("Error conectando con la API de categorías:", error);
    }
}

// Traer los gastos de la base de datos
async function cargarGastos() {
    try {
        const respuesta = await fetch('http://localhost:7777/api/gastos');
        memoriaGastos = await respuesta.json(); // Guardamos todo en memoria
        aplicarFiltrosGastos(); // Dibujamos pasando por el filtro
    } catch (error) {
        console.error("Error conectando con la API de gastos:", error);
    }
}

// Función que filtra y dibuja la tabla (AHORA CON AÑO)
function aplicarFiltrosGastos() {
    const mesSeleccionado = document.getElementById('filtroMesGasto').value;
    const catSeleccionada = document.getElementById('filtroCategoriaGasto').value;
    
    // Capturamos el año (si existe el filtro, si no, 'todos')
    const filtroAnio = document.getElementById('filtroAnioGasto');
    const anioSeleccionado = filtroAnio ? filtroAnio.value : 'todos';
    
    const gastosFiltrados = memoriaGastos.filter(gasto => {
        const fechaObj = new Date(gasto.Fecha);
        const mesGasto = fechaObj.getUTCMonth().toString();
        const anioGasto = fechaObj.getUTCFullYear().toString(); // Extraemos el año
        const categoriaGasto = gasto.Nombre_Categoria || 'Sin tipo';
        
        const pasaFiltroMes = (mesSeleccionado === 'todos') || (mesGasto === mesSeleccionado);
        const pasaFiltroCat = (catSeleccionada === 'todas') || (categoriaGasto === catSeleccionada);
        const pasaFiltroAnio = (anioSeleccionado === 'todos') || (anioGasto === anioSeleccionado);
        
        return pasaFiltroMes && pasaFiltroCat && pasaFiltroAnio;
    });
    
    dibujarTablaGastos(gastosFiltrados);
}

// Función exclusiva para pintar el HTML
function dibujarTablaGastos(listaGastos) {
    const tbody = document.getElementById('tablaGastosBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (listaGastos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #888;">No se encontraron gastos para estos filtros.</td></tr>';
        return;
    }

    listaGastos.forEach(gasto => {
        const fechaObj = new Date(gasto.Fecha);
        const fechaLimpia = new Date(fechaObj.getTime() + fechaObj.getTimezoneOffset() * 60000).toLocaleDateString('es-AR');
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #eee";
        
        tr.innerHTML = `
            <td style="padding: 12px;">${fechaLimpia}</td>
            <td style="padding: 12px;"><span style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #555;">${gasto.Nombre_Categoria || 'Sin tipo'}</span></td>
            <td style="padding: 12px;">${gasto.Descripcion}</td>
            <td style="padding: 12px; font-weight: bold; color: #d9534f;">$${gasto.Monto.toLocaleString('es-AR')}</td>
            <td style="padding: 12px; text-align: center;">
                <button class="btn-icon" style="color: #d9534f;" onclick="eliminarGasto(${gasto.Id_Gasto})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Guardar el Gasto en la base de datos
async function guardarGasto() {
    const desc = document.getElementById('descGastoInput').value.trim();
    const fecha = document.getElementById('fechaGastoInput').value;
    const monto = document.getElementById('montoGastoInput').value;
    const idCategoria = document.getElementById('selectCategoriaGasto').value;

    if (!desc || !fecha || !monto) {
        mostrarNotificacion("Por favor completá los campos obligatorios (*).", "warning");
        return;
    }

    const nuevoGasto = {
        Fecha: fecha,
        Descripcion: desc,
        Monto: parseFloat(monto),
        Id_Categoria: idCategoria ? parseInt(idCategoria) : null
    };

    try {
        const respuesta = await fetch('http://localhost:7777/api/gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoGasto)
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Gasto registrado con éxito! 💸", "success");
            cerrarModalGasto();
            cargarGastos(); 
        } else {
            mostrarNotificacion("Hubo un error al guardar el gasto.", "error");
        }
    } catch (error) {
        console.error("Error en el envío:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
    }
}

async function eliminarGasto(id) {
    const confirmacion = await pedirConfirmacion("¿Estás segura de que querés borrar este registro de gasto?");
    if (!confirmacion) return;

    try {
        const respuesta = await fetch(`http://localhost:7777/api/gastos/${id}`, { method: 'DELETE' });
        if (respuesta.ok) {
            mostrarNotificacion("Gasto eliminado con éxito.", "success");
            cargarGastos();
        } else {
            mostrarNotificacion("No se pudo eliminar el gasto.", "error");
        }
    } catch (error) {
        mostrarNotificacion("Error de conexión.", "error");
    }
}

// --- Eliminar Empleada (Con Promesa Estética) ---
async function eliminarEmpleada(id) {
    const confirmacion = await pedirConfirmacion("¿Estás segura de que querés dar de baja a esta profesional? Esta acción no se puede deshacer.");
    
    if (!confirmacion) return; 

    try {
        const respuesta = await fetch(`http://localhost:7777/api/empleadas/${id}`, {
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

// --- Lógica del Modal de Nueva Categoría ---
const modalCategoria = document.getElementById('modalNuevaCategoria');

function abrirModalNuevaCategoria() {
    document.getElementById('nombreNuevaCategoriaInput').value = '';
    if (modalCategoria) modalCategoria.classList.add('active');
}

function cerrarModalNuevaCategoria() {
    if (modalCategoria) modalCategoria.classList.remove('active');
}

async function guardarNuevaCategoria() {
    const nombre = document.getElementById('nombreNuevaCategoriaInput').value.trim();
    
    if (!nombre) {
        mostrarNotificacion("Por favor, escribí un nombre para la categoría.", "warning");
        return;
    }

    try {
        const respuesta = await fetch('http://localhost:7777/api/categorias-gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Nombre: nombre })
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Categoría creada con éxito!", "success");
            cerrarModalNuevaCategoria();
            
            // Volvemos a cargar las categorías para que aparezca en el desplegable
            await cargarCategoriasGasto(); 
        } else {
            mostrarNotificacion("Hubo un error al guardar la categoría.", "error");
        }
    } catch (error) {
        console.error("Error conectando con el servidor:", error);
        mostrarNotificacion("Error de conexión.", "error");
    }
}

// ==========================================================================
// 7. MÓDULO DE INGRESOS
// ==========================================================================
async function cargarIngresos() {
    try {
        const respuesta = await fetch('http://localhost:7777/api/ingresos');
        const ingresos = await respuesta.json();
        
        const tbody = document.getElementById('tablaIngresosBody');
        if (!tbody) return;

        tbody.innerHTML = ''; 

        if (ingresos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Aún no hay cobros registrados.</td></tr>`;
            return;
        }

        ingresos.forEach(ingreso => {
            // 1. EXTRAEMOS LA FECHA SEGURA (YYYY-MM-DD)
            const fechaCorta = ingreso.Fecha.split('T')[0]; 
            
            // 2. LA FORMATEAMOS PARA QUE SE VEA LINDA (DD/MM/YYYY)
            const partes = fechaCorta.split('-');
            const fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;

            // Lógica para diferenciar turnos de ingresos manuales
            const clientaMostrar = ingreso.Nombre_Clienta ? ingreso.Nombre_Clienta : '<span style="color:#aaa;">- Mostrador -</span>';
            const servicioMostrar = ingreso.Concepto ? `Extra: ${ingreso.Concepto}` : ingreso.Nombre_Servicio;

            // 3. ARMAMOS LA FILA Y LE GUARDAMOS LA FECHA INVISIBLE (data-fecha)
            const filaHTML = `
                <tr style="border-bottom: 1px solid #eee;" data-fecha="${fechaCorta}">
                    <td style="padding: 12px;">${fechaFormateada}</td>
                    <td style="padding: 12px; font-weight: 500;">${clientaMostrar}</td>
                    <td style="padding: 12px; color: #555;">${servicioMostrar}</td>
                    <td style="padding: 12px;">
                        <span style="background: #eef2f5; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${ingreso.Medio_Pago}</span>
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">
                        $${ingreso.Monto_Total.toLocaleString('es-AR')}
                    </td>
                </tr>
            `;
            tbody.innerHTML += filaHTML;
        }); 
        // Una vez que se cargan todos los datos, llamamos al filtro para que calcule el total inicial
        filtrarIngresos();

    } catch (error) {
        console.error("Error al cargar los ingresos:", error);
        document.getElementById('tablaIngresosBody').innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error al cargar los datos.</td></tr>`;
    }
}

// Función para filtrar los ingresos y sumar el total visible
function filtrarIngresos() {
    const textoBuscado = document.getElementById('filtroIngresos').value.toLowerCase();
    const fechaBuscadaInput = document.getElementById('filtroFechaIngresos').value; 

    const filas = document.querySelectorAll('#tablaIngresosBody tr');
    let sumaTotal = 0; // Arrancamos el contador en 0

    filas.forEach(fila => {
        if (fila.cells.length === 1) return; // Ignorar la fila de "Cargando..."

        const contenidoFila = fila.textContent.toLowerCase();
        const fechaFila = fila.getAttribute('data-fecha'); 

        const cumpleTexto = contenidoFila.includes(textoBuscado);
        const cumpleFecha = fechaBuscadaInput === "" || fechaFila === fechaBuscadaInput;

        if (cumpleTexto && cumpleFecha) {
            fila.style.display = '';
            
            // Si la fila se muestra, extraemos el número y lo sumamos
            // La plata está en la última columna (índice 4)
            const textoMonto = fila.cells[4].textContent;
            
            // Limpiamos el texto para que JavaScript entienda que es un número
            // (Le sacamos el símbolo $, los puntos de los miles, y convertimos la coma en punto decimal si hubiera)
            const numeroLimpio = parseFloat(textoMonto.replace('$', '').replace(/\./g, '').replace(',', '.'));
            
            if (!isNaN(numeroLimpio)) {
                sumaTotal += numeroLimpio;
            }
        } else {
            fila.style.display = 'none';
        }
    });

    // Escribimos el resultado final en nuestro nuevo pie de tabla
    const celdaTotal = document.getElementById('totalIngresosFiltrados');
    if (celdaTotal) {
        celdaTotal.textContent = '$' + sumaTotal.toLocaleString('es-AR');
    }
}

// ==========================================================================
// 8. MÓDULO DE COBRO Y EXTRAS
// ==========================================================================

const modalDetalleTurno = document.getElementById('modalDetalleTurno');
let precioBaseActual = 0;
const SENA_ABONADA = 8000; // Valor fijo de la seña

function abrirModalDetalleTurno(idTurno, nombreClienta, servicioBase, precioBase, estado, color) {
    precioBaseActual = parseFloat(precioBase) || 0;
    
    document.getElementById('idTurnoCobroOculto').value = idTurno;
    document.getElementById('nombreClientaCobro').textContent = `Clienta: ${nombreClienta}`;
    document.getElementById('servicioBaseCobro').textContent = `Servicio Base: ${servicioBase}`;
    document.getElementById('precioBaseCobro').textContent = `Precio Base: $${precioBaseActual.toLocaleString('es-AR')}`;
    
    // Cargamos el color y el estado
    // Limpiamos el input para que puedan escribir uno nuevo
    document.getElementById('colorTurnoInput').value = '';
    
    // Armamos la lista de colores guardados
    const contenedorColores = document.getElementById('listaColoresGuardados');
    contenedorColores.innerHTML = ''; // Limpiar anteriores
    
    if (color) {
        // Separamos los colores por el palito ' | ' que le pusimos en la base de datos
        const arrayColores = color.split(' | ');
        arrayColores.forEach(c => {
            contenedorColores.innerHTML += `<span style="background: #e2e3e5; color: #383d41; padding: 4px 10px; border-radius: 15px; font-size: 12px;"> ${c}</span>`;
        });
    }
    const badgeEstado = document.getElementById('estadoTurnoBadge');
    badgeEstado.textContent = estado || 'Pendiente';
    
    // Referencias a los botones e inputs
    const btnCobrar = document.getElementById('btnConfirmarCobro'); // Asegurate que tu botón HTML tenga este ID
    const btnGuardar = document.getElementById('btnGuardarDetalles');
    const inputColor = document.getElementById('colorTurnoInput');
    const inputDescuento = document.getElementById('descuentoCobroInput');
    const checkboxes = document.querySelectorAll('.check-extra');
    
    // LÓGICA DE BLOQUEO SI YA ESTÁ PAGADO
    if (estado === 'Pagado') {
        badgeEstado.style.background = '#d4edda';
        badgeEstado.style.color = '#155724';
        
        btnCobrar.disabled = true;
        btnCobrar.style.background = '#ccc';
        btnCobrar.textContent = 'Turno ya cobrado';
        btnCobrar.style.cursor = 'not-allowed';
        
        btnGuardar.style.display = 'none';
        inputColor.disabled = true;
        inputDescuento.disabled = true;
        checkboxes.forEach(chk => chk.disabled = true);
    } else {
        // Si está pendiente o en progreso, dejamos todo habilitado
        badgeEstado.style.background = estado === 'En progreso' ? '#cce5ff' : '#ffeeba';
        badgeEstado.style.color = estado === 'En progreso' ? '#004085' : '#856404';
        
        btnCobrar.disabled = false;
        btnCobrar.style.background = '#28a745'; 
        btnCobrar.textContent = 'Confirmar y Cobrar';
        btnCobrar.style.cursor = 'pointer';
        
        btnGuardar.style.display = 'inline-block';
        inputColor.disabled = false;
        inputDescuento.disabled = false;
        checkboxes.forEach(chk => chk.disabled = false);
    }

    document.getElementById('descuentoCobroInput').value = 0;
    checkboxes.forEach(chk => chk.checked = false);
    recalcularTotalCobro();
    
    if (modalDetalleTurno) modalDetalleTurno.classList.add('active');
}

// Nueva función que usan las chicas para guardar el color sin cobrar
async function guardarDetallesTurno() {
    const idTurno = document.getElementById('idTurnoCobroOculto').value;
    const colorElegido = document.getElementById('colorTurnoInput').value;
    
    if (!colorElegido.trim()) {
        mostrarNotificacion("Escribí un color primero", "error");
        return;
    }
    
    try {
        const respuesta = await fetch(`http://localhost:7777/api/turnos/${idTurno}/detalles`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Color: colorElegido })
        });
        
        if (respuesta.ok) {
            mostrarNotificacion("¡Color agregado!", "success");
            
            // Acá hacemos lo que pediste: recargamos la página cortito para que todo se actualice
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            mostrarNotificacion("Hubo un error al guardar.", "error");
        }
    } catch (error) {
        console.error(error);
        mostrarNotificacion("Error de conexión.", "error");
    }
}

function cerrarModalDetalleTurno() {
    if (modalDetalleTurno) modalDetalleTurno.classList.remove('active');
}

if (modalDetalleTurno) {
    modalDetalleTurno.addEventListener('click', function(e) {
        if(e.target === modalDetalleTurno) cerrarModalDetalleTurno();
    });
}

// Traer la lista de extras desde SQL y armar los checkboxes
async function cargarExtrasDisponibles() {
    try {
        const respuesta = await fetch('http://localhost:7777/api/extras');
        const extras = await respuesta.json();

        const contenedor = document.getElementById('contenedorExtras');
        if (!contenedor) return;

        contenedor.innerHTML = ''; // Limpiar el texto "Cargando..."

        extras.forEach(extra => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #f9f9f9';

            div.innerHTML = `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                    <input type="checkbox" class="check-extra" value="${extra.Precio}" data-id="${extra.Id_Extra}" onchange="recalcularTotalCobro()" style="cursor: pointer;">
                    ${extra.Nombre}
                </label>
                <span style="color: #888; font-size: 13px;">+$${extra.Precio.toLocaleString('es-AR')}</span>
            `;
            contenedor.appendChild(div);
        });
    } catch (error) {
        console.error("Error cargando extras:", error);
    }
}

// LA MAGIA DE LA SUMA: Se ejecuta cada vez que tildan un extra o cambian el descuento
function recalcularTotalCobro() {
    let sumaExtras = 0;
    
    // Sumar todos los extras que estén tildados en ese momento
    const checkboxes = document.querySelectorAll('.check-extra:checked');
    checkboxes.forEach(chk => {
        sumaExtras += parseFloat(chk.value);
    });

    // Obtener lo que hayan tipeado en "Descuento"
    const descuentoInput = document.getElementById('descuentoCobroInput').value;
    const descuento = descuentoInput ? parseFloat(descuentoInput) : 0;

    // Fórmula: Precio Base + Extras - Descuento - Seña
    let totalFinal = precioBaseActual + sumaExtras - descuento - SENA_ABONADA;
    
    // Evitar que el total dé negativo
    if (totalFinal < 0) totalFinal = 0;

    // Pintar el resultado verde gigante en el HTML
    document.getElementById('totalFinalCobro').textContent = `$${totalFinal.toLocaleString('es-AR')}`;
}

// Escuchar si tipean en la cajita de descuento para recalcular en vivo
const inputDescuento = document.getElementById('descuentoCobroInput');
if (inputDescuento) {
    inputDescuento.addEventListener('input', recalcularTotalCobro);
}

// Función para mandar la plata a la base de datos
async function confirmarCobroTurno() {
    // 1. Recolectar la información básica
    const idTurno = document.getElementById('idTurnoCobroOculto').value;
    const medioPago = document.getElementById('selectMedioPago').value;
    
    const descuentoInput = document.getElementById('descuentoCobroInput').value;
    const descuento = descuentoInput ? parseFloat(descuentoInput) : 0;
    
    // 2. Recolectar los IDs de los extras que están tildados
    const extrasSeleccionados = [];
    let sumaExtras = 0;
    
    const checkboxes = document.querySelectorAll('.check-extra:checked');
    checkboxes.forEach(chk => {
        extrasSeleccionados.push(parseInt(chk.getAttribute('data-id')));
        sumaExtras += parseFloat(chk.value);
    });

    // 3. Calcular el total exacto que se va a enviar
    let totalFinal = precioBaseActual + sumaExtras - descuento - SENA_ABONADA;
    if (totalFinal < 0) totalFinal = 0;

    // Armamos el paquetito de datos para enviar
    const datosCobro = {
        idTurno: parseInt(idTurno),
        montoTotal: totalFinal,
        medioPago: medioPago,
        descuento: descuento,
        extras: extrasSeleccionados
    };

    try {
        // Le tocamos la puerta al backend
        const respuesta = await fetch('http://localhost:7777/api/cobrar-turno', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosCobro)
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Cobro registrado con éxito!", "success"); 
            cerrarModalDetalleTurno();

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            mostrarNotificacion("Hubo un error al intentar cobrar.", "error");
        }
    } catch (error) {
        console.error("Error conectando con el servidor:", error);
        mostrarNotificacion("Error de conexión con el servidor.", "error");
    }
}

const modalNuevoIngreso = document.getElementById('modalNuevoIngreso');

function abrirModalNuevoIngreso() {
    document.getElementById('conceptoIngresoManual').value = '';
    document.getElementById('montoIngresoManual').value = '';
    if (modalNuevoIngreso) modalNuevoIngreso.classList.add('active');
}

function cerrarModalNuevoIngreso() {
    if (modalNuevoIngreso) modalNuevoIngreso.classList.remove('active');
}

async function guardarIngresoManual() {
    const concepto = document.getElementById('conceptoIngresoManual').value;
    const monto = document.getElementById('montoIngresoManual').value;
    const medioPago = document.getElementById('pagoIngresoManual').value;

    if (!concepto || !monto) {
        mostrarNotificacion("Por favor completá el concepto y el monto.", "error");
        return;
    }

    try {
        const respuesta = await fetch('http://localhost:7777/api/ingresos/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Concepto: concepto,
                Monto_Total: parseFloat(monto),
                Medio_Pago: medioPago
            })
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Ingreso extra registrado!", "success");
            cerrarModalNuevoIngreso();
            cargarIngresos(); // Recarga la tabla al instante sin recargar la página entera
        } else {
            mostrarNotificacion("Error al guardar el ingreso.", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error de conexión.", "error");
    }
}

// ==========================================================================
// MÓDULO DE CONFIGURACIÓN
// ==========================================================================

const CONFIG_STORAGE_KEY = 'emme_config_local';
let configWaPollInterval = null;

function detenerPollWhatsApp() {
    if (configWaPollInterval) {
        clearInterval(configWaPollInterval);
        configWaPollInterval = null;
    }
}

function iniciarPollWhatsApp() {
    detenerPollWhatsApp();
    configWaPollInterval = setInterval(() => {
        actualizarEstadoWhatsApp();
    }, 2500);
}

function actualizarUiQrWhatsApp(status) {
    const qrContainer = document.getElementById('configQrContainer');
    const qrEspera = document.getElementById('configQrEspera');
    const qrConectado = document.getElementById('configQrConectado');
    const qrEsperaTexto = document.getElementById('configQrEsperaTexto');

    if (qrContainer) qrContainer.style.display = 'none';
    if (qrConectado) qrConectado.style.display = 'none';
    if (qrEspera) qrEspera.style.display = 'none';

    if (status === 'ready') {
        if (qrConectado) qrConectado.style.display = 'block';
        detenerPollWhatsApp();
        return;
    }

    if (status === 'disabled') {
        if (qrEspera) {
            qrEspera.style.display = 'flex';
            if (qrEsperaTexto) qrEsperaTexto.textContent = 'WhatsApp deshabilitado en el servidor (WHATSAPP_ENABLED=false).';
        }
        detenerPollWhatsApp();
        return;
    }

    if (status === 'qr') {
        renderizarQrWhatsApp();
        return;
    }

    if (status === 'connecting' || status === 'disconnected' || status === 'error') {
        if (qrEspera) {
            qrEspera.style.display = 'flex';
            const textos = {
                connecting: 'Conectando con WhatsApp...',
                disconnected: 'Desconectado. Tocá «Reiniciar conexión» para generar un QR.',
                error: 'Error de conexión. Probá «Borrar sesión y reconectar».'
            };
            if (qrEsperaTexto) qrEsperaTexto.textContent = textos[status] || 'Verificando estado...';
        }
    }
}

async function renderizarQrWhatsApp() {
    const qrContainer = document.getElementById('configQrContainer');
    const qrEspera = document.getElementById('configQrEspera');
    const qrEsperaTexto = document.getElementById('configQrEsperaTexto');
    const qrImage = document.getElementById('configQrImage');

    if (!qrContainer) return;

    try {
        const respuesta = await fetch(`${API_BASE}/whatsapp/qr`);
        const data = respuesta.ok ? await respuesta.json() : null;

        if (data?.qr_image && qrImage) {
            if (qrEspera) qrEspera.style.display = 'none';
            qrContainer.style.display = 'block';
            qrImage.src = data.qr_image;
            qrImage.style.display = 'block';
            return;
        }

        if (data?.status === 'qr') {
            if (qrEspera) {
                qrEspera.style.display = 'flex';
                if (qrEsperaTexto) qrEsperaTexto.textContent = 'Generando código QR...';
            }
            qrContainer.style.display = 'none';
            return;
        }

        qrContainer.style.display = 'none';
    } catch (error) {
        console.error('Error renderizando QR:', error);
        if (qrEspera) {
            qrEspera.style.display = 'flex';
            if (qrEsperaTexto) qrEsperaTexto.textContent = 'Error al cargar el QR. Tocá «Actualizar estado».';
        }
    }
}

function getConfigLocal() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function setConfigLocal(data) {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ ...getConfigLocal(), ...data }));
}

function cambiarTabConfig(tab) {
    document.querySelectorAll('.config-tabs .btn-tab').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.configTab === tab);
    });

    const paneles = {
        general: 'configPanelGeneral',
        whatsapp: 'configPanelWhatsapp',
        servicios: 'configPanelServicios',
        agenda: 'configPanelAgenda'
    };

    Object.entries(paneles).forEach(([id, panelId]) => {
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.toggle('config-panel-active', id === tab);
    });

    if (tab === 'whatsapp') {
        actualizarEstadoWhatsApp();
        iniciarPollWhatsApp();
    } else {
        detenerPollWhatsApp();
    }
    if (tab === 'servicios') cargarCatalogoConfig();
}

function formatearEstadoWhatsApp(status) {
    const mapa = {
        ready: { texto: '● Conectado', clase: 'config-badge--ok' },
        connecting: { texto: '● Conectando...', clase: 'config-badge--pending' },
        qr: { texto: '● Esperando QR', clase: 'config-badge--pending' },
        disconnected: { texto: '● Desconectado', clase: 'config-badge--error' },
        error: { texto: '● Error', clase: 'config-badge--error' },
        disabled: { texto: '● Deshabilitado', clase: 'config-badge--off' }
    };
    return mapa[status] || { texto: '● ' + status, clase: 'config-badge--off' };
}

function actualizarBadgeWhatsApp(status) {
    const badge = document.getElementById('configWaBadge');
    if (!badge) return;
    const { texto, clase } = formatearEstadoWhatsApp(status);
    badge.textContent = texto;
    badge.className = 'config-badge ' + clase;
}

function armarPreviewRecordatorio(nombreLocal, direccion) {
    const ahora = new Date();
    ahora.setDate(ahora.getDate() + 1);
    ahora.setHours(10, 30, 0, 0);

    const fecha = ahora.toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const hora = ahora.toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit', hour12: false
    });

    return (
        `Hola Ana! 💅\n\n` +
        `Te recordamos tu turno en *${nombreLocal || 'EMME Beauty'}*:\n\n` +
        `💅 Manicura Semipermanente\n` +
        `👤 Con Mili\n` +
        `📅 ${fecha} a las ${hora}\n` +
        `📍 ${direccion || '—'}\n\n` +
        `¡Te esperamos!\n` +
        `— ${nombreLocal || 'EMME Beauty'}`
    );
}

async function actualizarEstadoWhatsApp() {
    const perfilEl = document.getElementById('configWaPerfil');
    const numeroEl = document.getElementById('configWaNumero');
    const dbEl = document.getElementById('configDbEstado');
    const previewEl = document.getElementById('configPreviewMensaje');

    try {
        const [healthRes, waRes] = await Promise.all([
            fetch(`${API_BASE.replace('/api', '')}/api/health`),
            fetch(`${API_BASE}/whatsapp/info`)
        ]);

        const health = healthRes.ok ? await healthRes.json() : null;
        const waInfo = waRes.ok ? await waRes.json() : null;

        const status = waInfo?.status || health?.whatsapp || 'disconnected';
        actualizarBadgeWhatsApp(status);
        actualizarUiQrWhatsApp(status);

        if (perfilEl) {
            perfilEl.textContent = waInfo?.cuenta?.nombre_perfil || health?.emme?.nombre_perfil || '—';
        }
        if (numeroEl) {
            numeroEl.textContent = waInfo?.cuenta?.numero || health?.emme?.numero || '—';
        }
        if (dbEl) {
            dbEl.textContent = health?.database === 'connected' ? 'Conectada' : 'Modo demo';
        }

        const nombreLocal = document.getElementById('configNombreLocal')?.value
            || waInfo?.negocio
            || health?.emme?.negocio_configurado
            || 'EMME Beauty';
        const direccion = waInfo?.direccion
            || health?.emme?.direccion
            || document.getElementById('configDireccion')?.value
            || '';

        const direccionInput = document.getElementById('configDireccion');
        if (direccionInput && (waInfo?.direccion || health?.emme?.direccion)) {
            direccionInput.value = waInfo?.direccion || health.emme.direccion;
        }

        if (previewEl) {
            previewEl.textContent = armarPreviewRecordatorio(nombreLocal, direccion);
        }

        if (status === 'qr') {
            await renderizarQrWhatsApp();
        }
    } catch (error) {
        console.error('Error obteniendo estado WhatsApp:', error);
        actualizarBadgeWhatsApp('error');
        actualizarUiQrWhatsApp('error');
        if (previewEl) previewEl.textContent = 'No se pudo conectar con el servidor.';
    }
}

async function reiniciarWhatsApp(limpiarSesion) {
    const mensajeConfirmacion = limpiarSesion
        ? '¿Borrar la sesión de WhatsApp y generar un código QR nuevo? Vas a tener que escanearlo de nuevo.'
        : '¿Reiniciar la conexión de WhatsApp?';

    const confirmado = await pedirConfirmacion(mensajeConfirmacion);
    if (!confirmado) return;

    try {
        const respuesta = await fetch(`${API_BASE}/whatsapp/reiniciar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limpiar_sesion: limpiarSesion })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            mostrarNotificacion(data.mensaje || 'Reinicio iniciado.', 'warning');
            iniciarPollWhatsApp();
            setTimeout(() => actualizarEstadoWhatsApp(), 1500);
        } else {
            mostrarNotificacion(data.error || 'No se pudo reiniciar WhatsApp.', 'error');
        }
    } catch (error) {
        console.error('Error reiniciando WhatsApp:', error);
        mostrarNotificacion('Error de conexión con el servidor.', 'error');
    }
}

async function cargarDatosGeneralesConfig() {
    const local = getConfigLocal();

    document.getElementById('configTelefono').value = local.telefono || '';
    document.getElementById('configInstagram').value = local.instagram || '';
    document.getElementById('configDescripcion').value = local.descripcion || '';
    document.getElementById('configHorasRecordatorio').value = local.horasRecordatorio || 24;

    let nombreLocal = '';
    let direccion = '';

    try {
        const respuesta = await fetch(`${API_BASE}/whatsapp/info`);
        if (respuesta.ok) {
            const data = await respuesta.json();
            if (data.negocio) nombreLocal = data.negocio;
            if (data.direccion) direccion = data.direccion;
        }
    } catch { /* silencioso */ }

    try {
        const respuesta = await fetch(`${API_BASE.replace('/api', '')}/api/health`);
        if (respuesta.ok) {
            const health = await respuesta.json();
            if (health.emme?.negocio_configurado) nombreLocal = health.emme.negocio_configurado;
            if (health.emme?.direccion) direccion = health.emme.direccion;
        }
    } catch { /* silencioso */ }

    document.getElementById('configNombreLocal').value = nombreLocal;

    const direccionInput = document.getElementById('configDireccion');
    direccionInput.value = direccion;

    const previewEl = document.getElementById('configPreviewMensaje');
    if (previewEl) {
        previewEl.textContent = armarPreviewRecordatorio(nombreLocal, direccion);
    }
}

function cargarDatosAgendaConfig() {
    const local = getConfigLocal();
    const agenda = local.agenda || {};

    document.getElementById('configApertura').value = agenda.apertura || '09:30';
    document.getElementById('configCierre').value = agenda.cierre || '21:30';
    document.getElementById('configBloque').value = agenda.bloque || '30';

    const diasActivos = new Set(agenda.dias || [1, 2, 3, 4, 5, 6]);
    document.querySelectorAll('.config-dia').forEach((btn) => {
        const dia = parseInt(btn.dataset.dia, 10);
        btn.classList.toggle('active', diasActivos.has(dia));
    });
}

async function cargarCatalogoConfig() {
    const tbodyServicios = document.getElementById('configTablaServicios');
    const tbodyExtras = document.getElementById('configTablaExtras');

    try {
        const [serviciosRes, extrasRes] = await Promise.all([
            fetch(`${API_BASE}/servicios`),
            fetch(`${API_BASE}/extras`)
        ]);

        const servicios = serviciosRes.ok ? await serviciosRes.json() : [];
        const extras = extrasRes.ok ? await extrasRes.json() : [];

        if (tbodyServicios) {
            if (servicios.length === 0) {
                tbodyServicios.innerHTML = '<tr><td class="config-table-empty">No hay servicios registrados.</td></tr>';
            } else {
                tbodyServicios.innerHTML = servicios.map((s) =>
                    `<tr><td>${s.Nombre}</td></tr>`
                ).join('');
            }
        }

        if (tbodyExtras) {
            if (extras.length === 0) {
                tbodyExtras.innerHTML = '<tr><td colspan="2" class="config-table-empty">No hay extras registrados.</td></tr>';
            } else {
                tbodyExtras.innerHTML = extras.map((e) =>
                    `<tr>
                        <td>${e.Nombre}</td>
                        <td style="text-align: right; font-weight: 500; color: var(--mostaza);">$${Number(e.Precio).toLocaleString('es-AR')}</td>
                    </tr>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Error cargando catálogo:', error);
        if (tbodyServicios) {
            tbodyServicios.innerHTML = '<tr><td class="config-table-empty">Error al cargar servicios.</td></tr>';
        }
        if (tbodyExtras) {
            tbodyExtras.innerHTML = '<tr><td colspan="2" class="config-table-empty">Error al cargar extras.</td></tr>';
        }
    }
}

function guardarConfigGeneral() {
    setConfigLocal({
        telefono: document.getElementById('configTelefono').value.trim(),
        instagram: document.getElementById('configInstagram').value.trim(),
        descripcion: document.getElementById('configDescripcion').value.trim(),
        horasRecordatorio: parseInt(document.getElementById('configHorasRecordatorio').value, 10) || 24
    });

    mostrarNotificacion('Configuración general guardada.', 'success');
}

function guardarConfigAgenda() {
    const dias = [];
    document.querySelectorAll('.config-dia.active').forEach((btn) => {
        dias.push(parseInt(btn.dataset.dia, 10));
    });

    setConfigLocal({
        agenda: {
            apertura: document.getElementById('configApertura').value,
            cierre: document.getElementById('configCierre').value,
            bloque: document.getElementById('configBloque').value,
            dias
        }
    });

    mostrarNotificacion('Preferencias de agenda guardadas.', 'success');
}

async function enviarMensajePruebaWhatsApp() {
    const telefono = document.getElementById('configPruebaTelefono').value.trim();
    const nombre = document.getElementById('configPruebaNombre').value.trim() || 'Prueba';

    if (!telefono) {
        mostrarNotificacion('Ingresá un teléfono para la prueba.', 'warning');
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/whatsapp/probar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono, nombre })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            mostrarNotificacion('Mensaje de prueba enviado correctamente.', 'success');
        } else {
            mostrarNotificacion(data.error || 'No se pudo enviar el mensaje.', 'error');
        }
    } catch (error) {
        console.error('Error enviando prueba WhatsApp:', error);
        mostrarNotificacion('Error de conexión con el servidor.', 'error');
    }
}

function cargarSeccionConfiguracion() {
    cargarDatosGeneralesConfig();
    cargarDatosAgendaConfig();
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.config-dia').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
        });
    });

    const horasInput = document.getElementById('configHorasRecordatorio');
    if (horasInput) {
        horasInput.addEventListener('change', () => {
            setConfigLocal({ horasRecordatorio: parseInt(horasInput.value, 10) || 24 });
        });
    }
});