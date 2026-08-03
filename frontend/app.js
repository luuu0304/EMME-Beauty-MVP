// ==========================================================================
// ÍNDICE DEL DOCUMENTO
// 1. UTILIDADES GLOBALES Y NOTIFICACIONES
// 2. NAVEGACIÓN Y MENÚ LATERAL
// 3. MÓDULO DE TURNOS Y CALENDARIO
// 4. MÓDULO DE CLIENTAS (Incluye Perfil e Historial)
// 5. MÓDULO DE EMPLEADAS
// 6. MÓDULO DE GASTOS
// 7. MÓDULO DE INGRESOS
// 8. MÓDULO DE COBRO Y EXTRAS
// ==========================================================================


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
    cargarCategoriasGasto();
    cargarExtrasDisponibles();
    inicializarFechaAgenda();
    inicializarAgendaDiaria();
});

// Sistema de Confirmación Personalizado (Promesa)
function pedirConfirmacion(mensaje) {
    return new Promise((resolve) => {
        const modalConf = document.getElementById('modalConfirmacion');
        const textoConf = document.getElementById('textoConfirmacion');
        const btnAceptar = document.getElementById('btnAceptarConfirmacion');
        const btnCancelar = document.getElementById('btnCancelarConfirmacion');

        textoConf.textContent = mensaje;
        modalConf.classList.add('active');

        btnAceptar.onclick = () => {
            modalConf.classList.remove('active');
            resolve(true);
        };

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

const tituloHeader = document.querySelector('.header h1');
const btnNuevoTurno = document.getElementById('btnNuevoTurno');
const btnNuevaClienta = document.getElementById('btnNuevaClienta');
const buscadorClientas = document.getElementById('buscadorClientas');
const btnNuevaEmpleada = document.getElementById('btnNuevaEmpleada');
const btnNuevoGasto = document.getElementById('btnNuevoGasto');

botonesMenu.forEach(boton => {
    boton.addEventListener('click', () => {
        botonesMenu.forEach(b => b.classList.remove('active'));
        boton.classList.add('active');

        seccionTurnos.style.display = 'none';
        seccionClientas.style.display = 'none';
        seccionEmpleados.style.display = 'none';
        seccionGastos.style.display = 'none';
        if(seccionIngresos) seccionIngresos.style.display = 'none'; 

        btnNuevoTurno.style.display = 'none';
        btnNuevaClienta.style.display = 'none';
        btnNuevaEmpleada.style.display = 'none';
        btnNuevoGasto.style.display = 'none';
        buscadorClientas.style.display = 'none';

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
            
        } else if (opcionSeleccionada === 'Ingresos') {
            if(seccionIngresos) seccionIngresos.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Ingresos';
            cargarIngresos();
        }
    });
});


// ==========================================================================
// 3. MÓDULO DE TURNOS Y CALENDARIO
// ==========================================================================

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

const inputFechaTurno = document.getElementById('fechaTurnoInput');
if (inputFechaTurno) {
    const hoy = new Date().toISOString().split('T')[0];
    inputFechaTurno.setAttribute('min', hoy);
}

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

async function filtrarProfesionalesPorServicio() {
    const idServicio = document.getElementById('servicioTurno').value;
    const selectEmpleada = document.getElementById('empleadaTurno');
    
    if (!idServicio) {
        selectEmpleada.innerHTML = '<option value="">Elegí el servicio primero...</option>';
        selectEmpleada.disabled = true;
        selectEmpleada.style.backgroundColor = "#f8f9fa";
        return;
    }

    try {
        const respuesta = await fetch(`http://localhost:3000/api/empleadas/servicio/${idServicio}`);
        const empleadasHabilitadas = await respuesta.json();
        
        selectEmpleada.innerHTML = '<option value="">Seleccioná a la profesional...</option>';
        
        if (empleadasHabilitadas.length === 0) {
            selectEmpleada.innerHTML = '<option value="">Ninguna profesional habilitada</option>';
            selectEmpleada.disabled = true;
            return;
        }

        empleadasHabilitadas.forEach(emp => {
            const opcion = document.createElement('option');
            opcion.value = emp.Id_Empleada;
            opcion.textContent = `${emp.Nombre} ${emp.Apellido}`;
            selectEmpleada.appendChild(opcion);
        });
        
        selectEmpleada.disabled = false;
        selectEmpleada.style.backgroundColor = "#ffffff";
        
    } catch (error) {
        console.error("Error al buscar profesionales:", error);
    }
}

async function guardarTurno() {
    let idClientaFinal;
    const grupoExpress = document.getElementById('grupoClientaExpress');

    if (grupoExpress && (grupoExpress.style.display === 'block' || grupoExpress.style.display === '')) {
        const inputNombreExpress = document.getElementById('inputNombreExpress');
        const inputApellidoExpress = document.getElementById('inputApellidoExpress');
        
        const nombreExp = inputNombreExpress ? inputNombreExpress.value.trim() : '';
        const apellidoExp = inputApellidoExpress ? inputApellidoExpress.value.trim() : '';
        
        if (!nombreExp || !apellidoExp) {
            mostrarNotificacion("Por favor, completá nombre y apellido de la nueva clienta.", "warning");
            return; 
        }
        
        try {
            const respuestaClienta = await fetch('http://localhost:3000/api/clientas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Nombre: nombreExp, Apellido: apellidoExp, Telefono: "", Email: "" })
            });

            if (respuestaClienta.ok) {
                const dataClienta = await respuestaClienta.json();
                idClientaFinal = dataClienta.id || dataClienta.Id_Clienta; 
            } else {
                mostrarNotificacion("Hubo un error al registrar la clienta nueva.", "error");
                return;
            }
        } catch (error) {
            console.error("Error creando clienta:", error);
            mostrarNotificacion("No se pudo conectar con el servidor.", "error");
            return;
        }
    } else {
        const selectClienta = document.getElementById('selectClientaTurno');
        idClientaFinal = selectClienta ? selectClienta.value : null;
        if (!idClientaFinal) {
            mostrarNotificacion("Por favor, seleccioná una clienta de la lista.", "warning");
            return;
        }
    }

    const idServicio = document.getElementById('servicioTurno').value;
    const idEmpleada = document.getElementById('empleadaTurno').value;
    const fecha = document.getElementById('fechaTurnoInput').value;
    const hora = document.getElementById('horaTurnoInput').value;

    if (!idClientaFinal || !idEmpleada || !idServicio || !fecha || !hora) {
        mostrarNotificacion("¡Por favor completá todos los campos para agendar el turno!", "warning");
        return;
    }

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
        const respuesta = await fetch('http://localhost:3000/api/turnos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoTurno)
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Turno agendado con éxito! 📅✨", "success");
            cerrarModalTurno();
            setTimeout(() => { location.reload(); }, 1200);
        } else {
            const mensajeError = await respuesta.text();
            mostrarNotificacion(`Error: ${mensajeError}`, "error");
        }
    } catch (error) {
        console.error("Error enviando el turno:", error);
        mostrarNotificacion("No se pudo conectar con el servidor.", "error");
    }
}

function agendarTurnoRapido(idClienta) {
    const grupoSeleccion = document.getElementById('grupoSeleccionClienta');
    const grupoExpress = document.getElementById('grupoClientaExpress');
    
    if (grupoSeleccion && grupoExpress) {
        grupoExpress.style.display = 'none';
        grupoSeleccion.style.display = 'block';
    }

    const selectClienta = document.getElementById('selectClientaTurno');
    if (selectClienta) {
        selectClienta.value = idClienta;
    }

    abrirModalTurno();
}

async function cargarServicios() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/servicios');
        const servicios = await respuesta.json();
        
        const selectServicio = document.getElementById('servicioTurno');
        if (selectServicio) {
            selectServicio.innerHTML = '<option value="">Seleccione un servicio...</option>';
            
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

async function inicializarAgendaDiaria() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/empleadas');
        const empleadas = await respuesta.json();

        const agendaHeader = document.getElementById('agendaHeader');
        if (agendaHeader) {
            agendaHeader.innerHTML = '<div class="hora-col">Hora</div>';
            empleadas.forEach(emp => {
                agendaHeader.innerHTML += `<div style="font-weight: 600; color: #333;">${emp.Nombre_Ap}</div>`;
            });
        }

        const agendaBody = document.getElementById('agendaBody');
        if (!agendaBody) return;
        
        agendaBody.innerHTML = ''; 
        
        const horaInicio = 9; 
        const horaFin = 20;   
        
        for (let hora = horaInicio; hora <= horaFin; hora++) {
            let stringHoraEnPunto = hora.toString().padStart(2, '0') + ':00';
            let filaEnPunto = document.createElement('div');
            filaEnPunto.className = 'agenda-row hora-en-punto';
            
            let htmlFilaEnPunto = `<div class="hora-col">${stringHoraEnPunto}</div>`;
            
            empleadas.forEach(emp => {
                htmlFilaEnPunto += `<div class="agenda-celda" data-hora="${stringHoraEnPunto}" data-id-empleada="${emp.Id_Empleada}"></div>`;
            });
            
            filaEnPunto.innerHTML = htmlFilaEnPunto;
            agendaBody.appendChild(filaEnPunto);
            
            if (hora < horaFin) {
                let stringHoraMedia = hora.toString().padStart(2, '0') + ':30';
                let filaMediaHora = document.createElement('div');
                filaMediaHora.className = 'agenda-row';
                
                let htmlFilaMedia = `<div class="hora-col">${stringHoraMedia}</div>`;
                
                empleadas.forEach(emp => {
                    htmlFilaMedia += `<div class="agenda-celda" data-hora="${stringHoraMedia}" data-id-empleada="${emp.Id_Empleada}"></div>`;
                });
                
                filaMediaHora.innerHTML = htmlFilaMedia;
                agendaBody.appendChild(filaMediaHora);
            }
        }
        
        const inputFecha = document.getElementById('fechaAgendaInput');
        const btnAnterior = document.getElementById('btnDiaAnterior');
        const btnSiguiente = document.getElementById('btnDiaSiguiente');

        if (inputFecha) {
            inputFecha.addEventListener('change', cargarTurnosAgenda);
            
            if (btnAnterior) {
                btnAnterior.addEventListener('click', () => {
                    const fechaActual = new Date(inputFecha.value + 'T00:00:00');
                    fechaActual.setDate(fechaActual.getDate() - 1);
                    
                    const yyyy = fechaActual.getFullYear();
                    const mm = String(fechaActual.getMonth() + 1).padStart(2, '0');
                    const dd = String(fechaActual.getDate()).padStart(2, '0');
                    
                    inputFecha.value = `${yyyy}-${mm}-${dd}`;
                    cargarTurnosAgenda(); 
                });
            }

            if (btnSiguiente) {
                btnSiguiente.addEventListener('click', () => {
                    const fechaActual = new Date(inputFecha.value + 'T00:00:00');
                    fechaActual.setDate(fechaActual.getDate() + 1);
                    
                    const yyyy = fechaActual.getFullYear();
                    const mm = String(fechaActual.getMonth() + 1).padStart(2, '0');
                    const dd = String(fechaActual.getDate()).padStart(2, '0');
                    
                    inputFecha.value = `${yyyy}-${mm}-${dd}`;
                    cargarTurnosAgenda(); 
                });
            }
        }

        cargarTurnosAgenda();
    } catch (error) {
        console.error("Error al cargar la agenda diaria:", error);
    }
}

function inicializarFechaAgenda() {
    const inputFecha = document.getElementById('fechaAgendaInput');
    if (inputFecha) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        
        inputFecha.value = `${yyyy}-${mm}-${dd}`;
    }
}

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

async function cargarTurnosAgenda() {
    const inputFecha = document.getElementById('fechaAgendaInput');
    if (!inputFecha || !inputFecha.value) return;

    try {
        const respuesta = await fetch(`http://localhost:3000/api/turnos/fecha/${inputFecha.value}`);
        const turnos = await respuesta.json();

        document.querySelectorAll('.turno-card').forEach(card => card.remove());

        turnos.forEach(turno => {
            const fechaObj = new Date(turno.Fecha_Hora);
            const horas = fechaObj.getHours().toString().padStart(2, '0');
            const minutos = fechaObj.getMinutes().toString().padStart(2, '0');
            const horaFormateada = `${horas}:${minutos}`; 
            
            const celdaDestino = document.querySelector(`.agenda-celda[data-hora="${horaFormateada}"][data-id-empleada="${turno.Id_Empleada}"]`);

            if (celdaDestino) {
                celdaDestino.style.position = 'relative'; 

                const alturaPixeles = (turno.Duracion_Minutos || 30) * 2; 

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
            }
        });
    } catch (error) {
        console.error("Error inyectando turnos en la agenda:", error);
    }
}


// ==========================================================================
// 4. MÓDULO DE CLIENTAS
// ==========================================================================

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

function abrirModalEditarClienta(id, nombre, apellido, fechaNac, telefono, ig) {
    document.getElementById('idClientaOculto').value = id; 
    document.getElementById('nombreInput').value = nombre;
    document.getElementById('apellidoInput').value = apellido;
    
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


// --- Lógica del Historial Estético (Modal Perfil) ---
function cerrarModalPerfil() {
    const modalPerfil = document.getElementById('modalPerfilClienta');
    if (modalPerfil) {
        modalPerfil.classList.remove('active');
    }
}

window.addEventListener('click', function(e) {
    const modalPerfil = document.getElementById('modalPerfilClienta');
    if (e.target === modalPerfil) {
        cerrarModalPerfil();
    }
});

async function verPerfilClienta(idClienta, nombre, apellido) {
    document.getElementById('nombrePerfilClienta').textContent = `Historial de ${nombre} ${apellido}`;
    
    const listaHistorial = document.getElementById('listaHistorialClienta');
    listaHistorial.innerHTML = '<p style="text-align:center; color:#888;">Cargando historial...</p>';
    
    const modalPerfil = document.getElementById('modalPerfilClienta');
    if (modalPerfil) {
        modalPerfil.classList.add('active');
    }

    try {
        const respuesta = await fetch(`http://localhost:3000/api/clientas/${idClienta}/historial`);
        const historial = await respuesta.json();

        listaHistorial.innerHTML = ''; 

        if (historial.length === 0) {
            listaHistorial.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">Esta clienta aún no tiene turnos registrados.</p>';
            return;
        }

        historial.forEach(turno => {
            const fechaObj = new Date(turno.Fecha_Hora);
            const fechaLimpia = fechaObj.toLocaleDateString('es-AR');
            const horaLimpia = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            let tagsHTML = '';
            if (turno.Color) {
                const detalles = turno.Color.split(',');
                detalles.forEach(detalle => {
                    tagsHTML += `<span style="background: #f0e6d2; color: #8b6d3b; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; margin-right: 5px; display: inline-block; margin-top: 8px;">${detalle.trim()}</span>`;
                });
            }

            const itemHTML = `
                <div style="background-color: #f9f9f9; border-left: 4px solid var(--mostaza); padding: 10px 15px; margin-bottom: 10px; border-radius: 4px;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${turno.Nombre_Servicio}</div>
                    <div style="font-size: 13px; color: #666; display: flex; justify-content: space-between;">
                        <span>Fecha: ${fechaLimpia} a las ${horaLimpia} hs</span>
                        <span>Profesional: ${turno.Nombre_Ap}</span>
                    </div>
                    <div>
                        ${tagsHTML}
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

function cambiarVistaClientas(vista) {
    const vistaTarjetas = document.getElementById('vistaClientasTarjetas');
    const vistaLista = document.getElementById('vistaClientasListado');
    const btnTarjetas = document.getElementById('btnVistaTarjetas');
    const btnLista = document.getElementById('btnVistaLista');

    if (vista === 'tarjetas') {
        vistaTarjetas.style.display = 'grid'; 
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

async function cargarClientas() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/clientas');
        const clientas = await respuesta.json();
        
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

            const tarjetaHTML = `
                <div class="card item-clienta-busqueda"> 
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

const inputBuscador = document.getElementById('buscadorClientas');
if (inputBuscador) {
    inputBuscador.addEventListener('input', function(evento) {
        const textoBuscado = evento.target.value.toLowerCase();
        
        const elementosClienta = document.querySelectorAll('.item-clienta-busqueda');
        
        elementosClienta.forEach(elemento => {
            const nombreClienta = elemento.querySelector('.nombre-para-buscar').textContent.toLowerCase();
            if (nombreClienta.includes(textoBuscado)) {
                elemento.style.display = ''; 
            } else {
                elemento.style.display = 'none'; 
            }
        });
    });
}


// ==========================================================================
// 5. MÓDULO DE EMPLEADAS
// ==========================================================================

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

function prepararNuevaEmpleada() {
    document.getElementById('idEmpleadaOculto').value = ''; 
    document.getElementById('nombreEmpleadaInput').value = '';
    document.getElementById('dniEmpleadaInput').value = '';
    
    document.getElementById('tituloModalEmpleada').textContent = 'Registrar Nueva Profesional';
    document.getElementById('btnGuardarEmpleada').textContent = 'Registrar';
    
    abrirModalEmpleada();
}

function abrirModalEditarEmpleada(id, nombre, dni) {
    document.getElementById('idEmpleadaOculto').value = id; 
    document.getElementById('nombreEmpleadaInput').value = nombre;
    document.getElementById('dniEmpleadaInput').value = (dni === '-' || !dni) ? '' : dni;
    
    document.getElementById('tituloModalEmpleada').textContent = 'Editar Profesional';
    document.getElementById('btnGuardarEmpleada').textContent = 'Actualizar';
    
    abrirModalEmpleada();
}

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

async function cargarEmpleadas() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/empleadas');
        const empleadas = await respuesta.json();

        const selectEmpleada = document.getElementById('selectEmpleadaTurno');
        if (selectEmpleada) {
            selectEmpleada.innerHTML = '<option value="">Seleccione...</option>';
            empleadas.forEach(empleada => {
                const opcion = document.createElement('option');
                opcion.value = empleada.Id_Empleada; 
                opcion.textContent = empleada.Nombre_Ap; 
                selectEmpleada.appendChild(opcion);
            });
        }
        
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
    
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    document.getElementById('fechaGastoInput').value = `${yyyy}-${mm}-${dd}`;
    
    document.getElementById('tituloModalGasto').textContent = 'Registrar Nuevo Gasto';
    abrirModalGasto();
}

let memoriaGastos = [];

async function cargarCategoriasGasto() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/categorias-gastos');
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

async function cargarGastos() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/gastos');
        memoriaGastos = await respuesta.json(); 
        aplicarFiltrosGastos(); 
    } catch (error) {
        console.error("Error conectando con la API de gastos:", error);
    }
}

function aplicarFiltrosGastos() {
    const mesSeleccionado = document.getElementById('filtroMesGasto').value;
    const catSeleccionada = document.getElementById('filtroCategoriaGasto').value;
    const filtroAnio = document.getElementById('filtroAnioGasto');
    const anioSeleccionado = filtroAnio ? filtroAnio.value : 'todos';
    
    const gastosFiltrados = memoriaGastos.filter(gasto => {
        const fechaObj = new Date(gasto.Fecha);
        const mesGasto = fechaObj.getUTCMonth().toString();
        const anioGasto = fechaObj.getUTCFullYear().toString(); 
        const categoriaGasto = gasto.Nombre_Categoria || 'Sin tipo';
        
        const pasaFiltroMes = (mesSeleccionado === 'todos') || (mesGasto === mesSeleccionado);
        const pasaFiltroCat = (catSeleccionada === 'todas') || (categoriaGasto === catSeleccionada);
        const pasaFiltroAnio = (anioSeleccionado === 'todos') || (anioGasto === anioSeleccionado);
        
        return pasaFiltroMes && pasaFiltroCat && pasaFiltroAnio;
    });
    
    dibujarTablaGastos(gastosFiltrados);
}

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
        const respuesta = await fetch('http://localhost:3000/api/gastos', {
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
        const respuesta = await fetch(`http://localhost:3000/api/gastos/${id}`, { method: 'DELETE' });
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
        const respuesta = await fetch('http://localhost:3000/api/categorias-gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Nombre: nombre })
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Categoría creada con éxito!", "success");
            cerrarModalNuevaCategoria();
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
        const respuesta = await fetch('http://localhost:3000/api/ingresos');
        const ingresos = await respuesta.json();
        
        const tbody = document.getElementById('tablaIngresosBody');
        if (!tbody) return;

        tbody.innerHTML = ''; 

        if (ingresos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Aún no hay cobros registrados.</td></tr>`;
            return;
        }

        ingresos.forEach(ingreso => {
            const fechaCorta = ingreso.Fecha.split('T')[0]; 
            const partes = fechaCorta.split('-');
            const fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;

            const clientaMostrar = ingreso.Nombre_Clienta ? ingreso.Nombre_Clienta : '<span style="color:#aaa;">- Mostrador -</span>';
            const servicioMostrar = ingreso.Concepto ? `Extra: ${ingreso.Concepto}` : ingreso.Nombre_Servicio;

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
        
        filtrarIngresos();

    } catch (error) {
        console.error("Error al cargar los ingresos:", error);
        document.getElementById('tablaIngresosBody').innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error al cargar los datos.</td></tr>`;
    }
}

function filtrarIngresos() {
    const textoBuscado = document.getElementById('filtroIngresos').value.toLowerCase();
    const fechaBuscadaInput = document.getElementById('filtroFechaIngresos').value; 

    const filas = document.querySelectorAll('#tablaIngresosBody tr');
    let sumaTotal = 0; 

    filas.forEach(fila => {
        if (fila.cells.length === 1) return; 

        const contenidoFila = fila.textContent.toLowerCase();
        const fechaFila = fila.getAttribute('data-fecha'); 

        const cumpleTexto = contenidoFila.includes(textoBuscado);
        const cumpleFecha = fechaBuscadaInput === "" || fechaFila === fechaBuscadaInput;

        if (cumpleTexto && cumpleFecha) {
            fila.style.display = '';
            
            const textoMonto = fila.cells[4].textContent;
            const numeroLimpio = parseFloat(textoMonto.replace('$', '').replace(/\./g, '').replace(',', '.'));
            
            if (!isNaN(numeroLimpio)) {
                sumaTotal += numeroLimpio;
            }
        } else {
            fila.style.display = 'none';
        }
    });

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
const SENA_ABONADA = 8000; 

function abrirModalDetalleTurno(idTurno, nombreClienta, servicioBase, precioBase, estado, color) {
    precioBaseActual = parseFloat(precioBase) || 0;
    
    document.getElementById('idTurnoCobroOculto').value = idTurno;
    document.getElementById('nombreClientaCobro').textContent = `Clienta: ${nombreClienta}`;
    document.getElementById('servicioBaseCobro').textContent = `Servicio Base: ${servicioBase}`;
    document.getElementById('precioBaseCobro').textContent = `Precio Base: $${precioBaseActual.toLocaleString('es-AR')}`;
    
    document.getElementById('colorTurnoInput').value = '';
    
    const contenedorColores = document.getElementById('listaColoresGuardados');
    contenedorColores.innerHTML = ''; 
    
    if (color) {
        const arrayColores = color.split(' | ');
        arrayColores.forEach(c => {
            contenedorColores.innerHTML += `<span style="background: #e2e3e5; color: #383d41; padding: 4px 10px; border-radius: 15px; font-size: 12px;"> ${c}</span>`;
        });
    }
    const badgeEstado = document.getElementById('estadoTurnoBadge');
    badgeEstado.textContent = estado || 'Pendiente';
    
    const btnCobrar = document.getElementById('btnConfirmarCobro'); 
    const btnGuardar = document.getElementById('btnGuardarDetalles');
    const inputColor = document.getElementById('colorTurnoInput');
    const inputDescuento = document.getElementById('descuentoCobroInput');
    const checkboxes = document.querySelectorAll('.check-extra');
    
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

async function guardarDetallesTurno() {
    const idTurno = document.getElementById('idTurnoCobroOculto').value;
    const colorElegido = document.getElementById('colorTurnoInput').value;
    
    if (!colorElegido.trim()) {
        mostrarNotificacion("Escribí un color primero", "error");
        return;
    }
    
    try {
        const respuesta = await fetch(`http://localhost:3000/api/turnos/${idTurno}/detalles`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Color: colorElegido })
        });
        
        if (respuesta.ok) {
            mostrarNotificacion("¡Color agregado!", "success");
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

async function cargarExtrasDisponibles() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/extras');
        const extras = await respuesta.json();

        const contenedor = document.getElementById('contenedorExtras');
        if (!contenedor) return;

        contenedor.innerHTML = ''; 

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

function recalcularTotalCobro() {
    let sumaExtras = 0;
    
    const checkboxes = document.querySelectorAll('.check-extra:checked');
    checkboxes.forEach(chk => {
        sumaExtras += parseFloat(chk.value);
    });

    const descuentoInput = document.getElementById('descuentoCobroInput').value;
    const descuento = descuentoInput ? parseFloat(descuentoInput) : 0;

    let totalFinal = precioBaseActual + sumaExtras - descuento - SENA_ABONADA;
    
    if (totalFinal < 0) totalFinal = 0;

    document.getElementById('totalFinalCobro').textContent = `$${totalFinal.toLocaleString('es-AR')}`;
}

const inputDescuento = document.getElementById('descuentoCobroInput');
if (inputDescuento) {
    inputDescuento.addEventListener('input', recalcularTotalCobro);
}

async function confirmarCobroTurno() {
    const idTurno = document.getElementById('idTurnoCobroOculto').value;
    const medioPago = document.getElementById('selectMedioPago').value;
    
    const descuentoInput = document.getElementById('descuentoCobroInput').value;
    const descuento = descuentoInput ? parseFloat(descuentoInput) : 0;
    
    const extrasSeleccionados = [];
    let sumaExtras = 0;
    
    const checkboxes = document.querySelectorAll('.check-extra:checked');
    checkboxes.forEach(chk => {
        extrasSeleccionados.push(parseInt(chk.getAttribute('data-id')));
        sumaExtras += parseFloat(chk.value);
    });

    let totalFinal = precioBaseActual + sumaExtras - descuento - SENA_ABONADA;
    if (totalFinal < 0) totalFinal = 0;

    const datosCobro = {
        idTurno: parseInt(idTurno),
        montoTotal: totalFinal,
        medioPago: medioPago,
        descuento: descuento,
        extras: extrasSeleccionados
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/cobrar-turno', {
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
        const respuesta = await fetch('http://localhost:3000/api/ingresos/manual', {
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
            cargarIngresos(); 
        } else {
            mostrarNotificacion("Error al guardar el ingreso.", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error de conexión.", "error");
    }
}