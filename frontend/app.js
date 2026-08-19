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
// 9 SECCIÓN: DASHBOARD Y MÉTRICAS
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
    cargarDatosDashboard()
    
    // Leer el anotador al arrancar
    const seccionGuardada = localStorage.getItem('emme_seccion_activa');
    if (seccionGuardada) {
        // Buscamos el botón que tenga ese mismo texto y le hacemos un "clic fantasma"
        const botonSeleccionado = Array.from(botonesMenu).find(b => b.textContent.trim() === seccionGuardada);
        if (botonSeleccionado) {
            botonSeleccionado.click();
        }
    }
    // 📅 Inicializar el calendario de rango (Flatpickr)
    const inputRango = document.getElementById('rangoFechasCustomDash');
    if (inputRango) {
        flatpickr(inputRango, {
            mode: "range",
            locale: "es", 
            dateFormat: "Y-m-d", 
            onChange: function(selectedDates, dateStr, instance) {
                // Cuando eligen LAS DOS fechas, llamamos al servidor
                if (selectedDates.length === 2) {
                    const desde = formatoFechaSQL(selectedDates[0]);
                    const hasta = formatoFechaSQL(selectedDates[1]);
                    cargarDatosDashboard(desde, hasta); 
                }
            }
        });
    }

    // Lógica del desplegable
    const selectFiltroDash = document.getElementById('filtroRapidoDash');
    if (selectFiltroDash) {
        selectFiltroDash.addEventListener('change', (e) => {
            if (e.target.value === 'personalizado') {
                inputRango.style.display = 'block';
            } else {
                inputRango.style.display = 'none';
                cargarDatosDashboard(); // Si elige un rango rápido, carga de nuevo
            }
        });
    }
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

// ---------------------------------------------------------
    // LÓGICA DE FILTROS ESTANDARIZADOS (Gastos e Ingresos)
    // ---------------------------------------------------------

    // Inicializar Flatpickr para Gastos
    const inputRangoGastos = document.getElementById('rangoFechaGastos');
    if (inputRangoGastos) {
        flatpickr(inputRangoGastos, {
            mode: "range",
            locale: "es",
            dateFormat: "Y-m-d",
            onChange: function(selectedDates) {
                if (selectedDates.length === 2) aplicarFiltrosGastos(); // Llama a tu función de filtrado
            }
        });
    }

    // Alternar vista de filtros en Gastos
    const modoGastos = document.getElementById('modoFechaGastos');
    if (modoGastos) {
        modoGastos.addEventListener('change', (e) => {
            if (e.target.value === 'rango') {
                document.getElementById('contenedorMesGastos').style.display = 'none';
                inputRangoGastos.style.display = 'block';
            } else {
                document.getElementById('contenedorMesGastos').style.display = 'flex';
                inputRangoGastos.style.display = 'none';
                aplicarFiltrosGastos(); // Recalcula si volvemos a "Mes"
            }
        });
    }

    // Inicializar Flatpickr para Ingresos
    const inputRangoIngresos = document.getElementById('rangoFechaIngresos');
    if (inputRangoIngresos) {
        flatpickr(inputRangoIngresos, {
            mode: "range",
            locale: "es",
            dateFormat: "Y-m-d",
            onChange: function(selectedDates) {
                if (selectedDates.length === 2) filtrarIngresos(); // Llama a tu función de filtrado
            }
        });
    }

    // Alternar vista de filtros en Ingresos
    const modoIngresos = document.getElementById('modoFechaIngresos');
    if (modoIngresos) {
        modoIngresos.addEventListener('change', (e) => {
            if (e.target.value === 'rango') {
                document.getElementById('contenedorMesIngresos').style.display = 'none';
                inputRangoIngresos.style.display = 'block';
            } else {
                document.getElementById('contenedorMesIngresos').style.display = 'flex';
                inputRangoIngresos.style.display = 'none';
                filtrarIngresos(); // Recalcula si volvemos a "Mes"
            }
        });
    }

// ==========================================================================
// 2. NAVEGACIÓN, MENÚ LATERAL Y PERSISTENCIA DE ESTADO
// ==========================================================================

const botonesMenu = document.querySelectorAll('.menu-item');
const seccionTurnos = document.getElementById('seccionTurnos');
const seccionClientas = document.getElementById('seccionClientas');
const seccionEmpleados = document.getElementById('seccionEmpleados');
const seccionGastos = document.getElementById('seccionGastos');
const seccionIngresos = document.getElementById('seccionIngresos');
const seccionResumenes = document.getElementById('seccionResumenes');

const tituloHeader = document.querySelector('.header h1');
const btnNuevoTurno = document.getElementById('btnNuevoTurno');
const btnNuevaClienta = document.getElementById('btnNuevaClienta');
const buscadorClientas = document.getElementById('buscadorClientas');
const buscadorEmpleadas = document.getElementById('buscadorEmpleadas');
const btnNuevaEmpleada = document.getElementById('btnNuevaEmpleada');
const btnNuevoGasto = document.getElementById('btnNuevoGasto');
const btnNuevoIngreso = document.getElementById('btnNuevoIngreso');

// Función principal del menú
botonesMenu.forEach(boton => {
    boton.addEventListener('click', () => {
        botonesMenu.forEach(b => b.classList.remove('active'));
        boton.classList.add('active');

        seccionTurnos.style.display = 'none';
        seccionClientas.style.display = 'none';
        seccionEmpleados.style.display = 'none';
        seccionGastos.style.display = 'none';
        if(seccionIngresos) seccionIngresos.style.display = 'none';
        if(seccionResumenes) seccionResumenes.style.display = 'none';

        btnNuevoTurno.style.display = 'none';
        btnNuevaClienta.style.display = 'none';
        btnNuevaEmpleada.style.display = 'none';
        btnNuevoGasto.style.display = 'none';
        buscadorClientas.style.display = 'none';
        if (btnNuevoIngreso) btnNuevoIngreso.style.display = 'none';
        
        // CORRECCIÓN: Ahora sí se oculta al cambiar de sección
        if (buscadorEmpleadas) buscadorEmpleadas.style.display = 'none'; 

        const opcionSeleccionada = boton.textContent.trim();

        // 🧠 MAGIA DE LA MASTER CLASS: Guardamos dónde hizo clic el usuario
        localStorage.setItem('emme_seccion_activa', opcionSeleccionada);

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
            if (buscadorEmpleadas) buscadorEmpleadas.style.display = 'block';
            cargarEmpleadas();

        } else if (opcionSeleccionada === 'Gastos') {
            seccionGastos.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Gastos';
            btnNuevoGasto.style.display = 'block'; 
            cargarGastos(); 
            
        } else if (opcionSeleccionada === 'Ingresos') {
            if(seccionIngresos) seccionIngresos.style.display = 'block';
            tituloHeader.textContent = 'Gestión de Ingresos';
            if (btnNuevoIngreso) btnNuevoIngreso.style.display = 'block'; // <-- AGREGAR ESTO
            cargarIngresos();
        } else if (opcionSeleccionada === 'Resúmenes') {
            if(seccionResumenes) seccionResumenes.style.display = 'block';
            tituloHeader.textContent = 'Panel de Control';
        }
    });
});

// Lógica del buscador de empleadas
if (buscadorEmpleadas) {
    buscadorEmpleadas.addEventListener('input', function(e) {
        const textoBuscado = e.target.value.toLowerCase();
        const tarjetas = document.querySelectorAll('#contenedorEmpleadas .card');
        
        tarjetas.forEach(tarjeta => {
            const nombre = tarjeta.querySelector('h3').textContent.toLowerCase();
            if (nombre.includes(textoBuscado)) {
                tarjeta.style.display = '';
            } else {
                tarjeta.style.display = 'none';
            }
        });
    });
}

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
        const inputNombreExpress = document.getElementById('nombreExpress');
        const inputApellidoExpress = document.getElementById('apellidoExpress');
        
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

    const inputSenaTurno = document.getElementById('senaTurnoInput');
    const montoSena = inputSenaTurno && inputSenaTurno.value ? parseFloat(inputSenaTurno.value) : 0;

    const fechaHoraCompleta = `${fecha}T${hora}:00`;
    const nuevoTurno = {
        Id_Clienta: parseInt(idClientaFinal), 
        Id_Empleada: parseInt(idEmpleada),
        Id_Servicio: parseInt(idServicio),
        Fecha_Hora: fechaHoraCompleta,
        Sena_Monto: montoSena 
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
                agendaHeader.innerHTML += `<div class="col-emp-${emp.Id_Empleada}" data-areas="${emp.Areas || ''}" style="font-weight: 600; color: #333;">${emp.Nombre_Ap}</div>`;
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
                // CAMBIO ACÁ: Agregamos la clase col-emp-${emp.Id_Empleada}
                htmlFilaEnPunto += `<div class="agenda-celda col-emp-${emp.Id_Empleada}" data-hora="${stringHoraEnPunto}" data-id-empleada="${emp.Id_Empleada}"></div>`;
            });
            
            filaEnPunto.innerHTML = htmlFilaEnPunto;
            agendaBody.appendChild(filaEnPunto);
            
            if (hora < horaFin) {
                let stringHoraMedia = hora.toString().padStart(2, '0') + ':30';
                let filaMediaHora = document.createElement('div');
                filaMediaHora.className = 'agenda-row';
                
                let htmlFilaMedia = `<div class="hora-col">${stringHoraMedia}</div>`;
                
                empleadas.forEach(emp => {
                    htmlFilaMedia += `<div class="agenda-celda col-emp-${emp.Id_Empleada}" data-hora="${stringHoraMedia}" data-id-empleada="${emp.Id_Empleada}"></div>`;
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

// NUEVA FUNCIÓN: Filtrar agenda al tocar los botones
function filtrarAgendaPorArea(areaSeleccionada, botonClickeado) {
    // 1. Efecto visual: despintar todos y pintar el seleccionado
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.border = '1px solid #ccc';
    });
    botonClickeado.style.background = '#e2e3e5';
    botonClickeado.style.border = 'none';

    // 2. Buscar todas las columnas del encabezado
    const headers = document.querySelectorAll('#agendaHeader > div:not(.hora-col)');

    headers.forEach(header => {
        const areasDeLaChica = header.getAttribute('data-areas');
        
        // Averiguar la clase que identifica a esta chica (ej. "col-emp-2")
        const claseColumna = Array.from(header.classList).find(c => c.startsWith('col-emp-'));
        const celdasDeLaChica = document.querySelectorAll(`.${claseColumna}`);

        // 3. Mostrar u ocultar dependiendo de si hace el servicio
        if (areaSeleccionada === 'Todo' || (areasDeLaChica && areasDeLaChica.includes(areaSeleccionada))) {
            header.style.display = ''; 
            celdasDeLaChica.forEach(celda => celda.style.display = ''); 
        } else {
            header.style.display = 'none';
            celdasDeLaChica.forEach(celda => celda.style.display = 'none');
        }
    });
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
            const minutosReales = fechaObj.getMinutes();
            const minutosCelda = minutosReales < 30 ? '00' : '30';
            const horaFormateada = `${horas}:${minutosCelda}`;
            
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
                    const senaPagada = turno.Sena_Monto || 0; // <--- Agregamos esto
                    abrirModalDetalleTurno(
                        turno.Id_Turno, 
                        turno.Nombre_Clienta, 
                        turno.Nombre_Servicio, 
                        precioServicio,
                        turno.Estado, 
                        turno.Color,
                        senaPagada
                    );
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

// Guarda la seña desde el detalle del turno sin tener que cobrar todo el servicio
async function guardarSenaIndependiente() {
    const idTurno = document.getElementById('idTurnoCobroOculto').value;
    const inputSena = document.getElementById('senaDetalleInput');
    const nuevaSena = parseFloat(inputSena.value) || 0;
    
    // Sacamos el nombre de la clienta del texto para usarlo en el concepto del Ingreso
    let nombreClienta = document.getElementById('nombreClientaCobro').textContent;
    nombreClienta = nombreClienta.replace('Clienta: ', '').trim();

    if (!idTurno) return;

    try {
        const respuesta = await fetch(`http://localhost:3000/api/turnos/${idTurno}/sena`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                Sena_Monto: nuevaSena, // <--- AHORA SÍ, CON EL NOMBRE CORRECTO
                Nombre_Clienta: nombreClienta 
            })
        });

        if (respuesta.ok) {
            mostrarNotificacion("¡Seña actualizada y registrada en Ingresos!", "success");
            
            const textoSena = document.getElementById('textoDetalleSena');
            if(textoSena) textoSena.textContent = `Seña abonada: -$${nuevaSena.toLocaleString('es-AR')}`;
            
        } else {
            mostrarNotificacion("Error al guardar la seña.", "error");
        }
    } catch (error) {
        console.error("Error guardando la seña:", error);
        mostrarNotificacion("Error de conexión.", "error");
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
                   <div class="card-actions" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px; justify-content: center; gap: 10px; display: flex;">
                        <!-- 1. Principal: Agendar Turno -->
                        <button class="btn-icon" style="color: var(--mostaza); font-weight: bold;" onclick="agendarTurnoRapido('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}')">+ Turno</button>
                        
                        <!-- 2. Secundario: Ver ficha -->
                        <button class="btn-icon" onclick="verPerfilClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}')">Ver</button>
                        
                        <!-- 3. Terciario: Editar -->
                        <button class="btn-icon" onclick="abrirModalEditarClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}', '${clienta.Fecha_Nac}', '${clienta.Telefono}', '${clienta.Ig}')">Editar</button>
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
                        <button class="btn-icon" style="color: var(--mostaza); font-weight: bold;" onclick="agendarTurnoRapido('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}')">+ Turno</button>
                        <button class="btn-icon" title="Ver Historial" onclick="verPerfilClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}')">Ver</button>
                        <button class="btn-icon" title="Editar" onclick="abrirModalEditarClienta('${clienta.Id_Clienta}', '${clienta.Nombre}', '${clienta.Apellido}', '${clienta.Fecha_Nac}', '${clienta.Telefono}', '${clienta.Ig}')">Editar</button>
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
            // Definimos las iniciales y el DNI
            const inicial = empleada.Nombre_Ap[0].toUpperCase();
            const dniText = empleada.DNI || empleada.dni || '-';

            // Armamos el textito de la última liquidación
            let infoUltimaLiq = '<span style="font-size: 12px; color: #aaa; font-style: italic;">Sin pagos previos registrados</span>';
            
            if (empleada.Ultima_Fecha_Liq) {
                const fechaObj = new Date(empleada.Ultima_Fecha_Liq);
                const fechaLimpia = fechaObj.toLocaleDateString('es-AR');
                const montoLimpio = empleada.Ultimo_Monto_Liq.toLocaleString('es-AR');
                
                infoUltimaLiq = `<span style="font-size: 12px; color: #666; font-weight: 500;">Última liq: <strong>$${montoLimpio}</strong> el ${fechaLimpia}</span>`;
            }

            // Armamos la tarjeta integrando el nuevo dato
            const tarjetaHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="avatar" style="background-color: var(--mostaza); color: white;">${inicial}</div>
                        <div class="client-info">
                            <h3>${empleada.Nombre_Ap}</h3>
                            <span>DNI: ${dniText}</span>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8f9fa; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-top: 15px; text-align: center;">
                        <span style="font-size: 13px; color: #666; display: block; margin-bottom: 5px;">Saldo Acumulado</span>
                        
                        <strong style="font-size: 26px; color: #28a745; display: block; margin-bottom: 5px;">
                            $${empleada.Saldo_Acumulado.toLocaleString('es-AR')}
                        </strong>
                        
                        <!-- ACÁ APARECE LA INFO DE LA ÚLTIMA LIQUIDACIÓN -->
                        <div style="margin-bottom: 15px; border-top: 1px dashed #ddd; padding-top: 8px;">
                            ${infoUltimaLiq}
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button class="btn-icon" style="background-color: #28a745; color: white; border: none; font-weight: bold; padding: 6px 12px;" onclick="liquidarSueldo(${empleada.Id_Empleada}, '${empleada.Nombre_Ap}')">Liquidar</button>
                            <button class="btn-icon" onclick="verDetalleSueldo(${empleada.Id_Empleada}, '${empleada.Nombre_Ap}')">Detalle</button>
                        </div>
                    </div>

                    <div class="card-actions" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px; justify-content: center;">
                        <button class="btn-icon" onclick="abrirModalEditarEmpleada('${empleada.Id_Empleada}', '${empleada.Nombre_Ap}', '${dniText}')"> Editar</button>
                        <button class="btn-icon" style="color: #d9534f;" onclick="eliminarEmpleada(${empleada.Id_Empleada})">Dar de baja</button>
                        <button class="btn-icon" onclick="abrirModalEspecialidades(${empleada.Id_Empleada}, '${empleada.Nombre_Ap}')">Configurar Áreas</button>
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

// --- Modal de Detalle de Sueldo ---
function cerrarModalDetalleSueldo() {
    const modal = document.getElementById('modalDetalleSueldo');
    if (modal) modal.classList.remove('active');
}

// Visualizar qué compone el saldo a favor
async function verDetalleSueldo(idEmpleada, nombre) {
    document.getElementById('tituloModalDetalleSueldo').textContent = `Detalle de ${nombre}`;
    const tbody = document.getElementById('tablaDetalleSueldoBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #888;">Cargando historial...</td></tr>';
    
    const modal = document.getElementById('modalDetalleSueldo');
    if (modal) modal.classList.add('active');

    try {
        const respuesta = await fetch(`http://localhost:3000/api/empleadas/${idEmpleada}/sueldo-detalle`);
        const detalles = await respuesta.json();
        
        tbody.innerHTML = '';
        
        if (detalles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #888;">No hay comisiones pendientes de cobro.</td></tr>';
            return;
        }
        
        detalles.forEach(d => {
            const fechaObj = new Date(d.Fecha_Hora);
            const fechaLimpia = fechaObj.toLocaleDateString('es-AR') + ' ' + fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${fechaLimpia}</td>
                    <td style="padding: 10px; font-weight: 500;">${d.Nombre_Clienta}</td>
                    <td style="padding: 10px; color: #555;">${d.Nombre_Servicio}</td>
                    <td style="padding: 10px; text-align: right;">$${d.Total_Abonado.toLocaleString('es-AR')}</td>
                    <td style="padding: 10px; text-align: center; color: var(--mostaza); font-weight: bold;">${d.Porcentaje_Comision * 100}%</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #28a745;">$${d.A_Cobrar.toLocaleString('es-AR')}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #d9534f; padding: 20px;">Error al cargar los datos.</td></tr>';
    }
}

// Vaciar la caja y registrar el pago
async function liquidarSueldo(idEmpleada, nombre) {
    const confirmacion = await pedirConfirmacion(`¿Confirmás la liquidación del sueldo pendiente para ${nombre}? Esta acción dejará su caja en cero.`);
    if (!confirmacion) return;

    try {
        const respuesta = await fetch(`http://localhost:3000/api/empleadas/${idEmpleada}/liquidar`, { 
            method: 'POST' 
        });
        
        if (respuesta.ok) {
            mostrarNotificacion("¡Sueldo liquidado con éxito!", "success");
            cargarEmpleadas(); 
        } else {
            mostrarNotificacion("Error al liquidar el sueldo o la caja ya estaba en cero.", "error");
        }
    } catch (error) {
        console.error(error);
        mostrarNotificacion("Error de conexión con el servidor.", "error");
    }
}

// --- Modal de Especialidades y Comisiones ---
function cerrarModalEspecialidades() {
    const modal = document.getElementById('modalEspecialidades');
    if (modal) modal.classList.remove('active');
}

async function abrirModalEspecialidades(idEmpleada, nombre) {
    document.getElementById('idEspecialidadOculto').value = idEmpleada;
    document.getElementById('tituloModalEspecialidades').textContent = `Áreas de ${nombre}`;
    
    const contenedor = document.getElementById('contenedorListaAreas');
    contenedor.innerHTML = '<p style="text-align:center; color:#888;">Cargando áreas...</p>';
    
    const modal = document.getElementById('modalEspecialidades');
    if (modal) modal.classList.add('active');

    try {
        const resAreas = await fetch('http://localhost:3000/api/areas');
        const areasDisponibles = await resAreas.json();
        
        const resAsignadas = await fetch(`http://localhost:3000/api/empleadas/${idEmpleada}/areas`);
        const areasAsignadas = await resAsignadas.json();
        
        contenedor.innerHTML = '';
        
        if(areasDisponibles.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; color:#888;">No hay áreas registradas en los servicios.</p>';
            return;
        }

        areasDisponibles.forEach(areaObj => {
            const nombreArea = areaObj.Area;
            const asignada = areasAsignadas.find(a => a.Area === nombreArea);
            
            const estaChequeado = asignada ? 'checked' : '';
            const comisionValor = asignada ? asignada.Porcentaje_Comision : '0.50'; 

            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'space-between';
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #f9f9f9';

            div.innerHTML = `
                <label style="display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer;">
                    <input type="checkbox" class="check-area" value="${nombreArea}" ${estaChequeado}>
                    ${nombreArea}
                </label>
                <div style="display:flex; align-items:center; gap:5px;">
                    <span style="font-size:12px; color:#666;">Comisión:</span>
                    <input type="number" step="0.05" min="0" max="1" class="input-comision" data-area="${nombreArea}" value="${comisionValor}" style="width: 70px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;" ${estaChequeado ? '' : 'disabled'}>
                </div>
            `;
            contenedor.appendChild(div);
        });

        // Activar o desactivar el porcentaje si tildan la casilla
        const checkboxes = contenedor.querySelectorAll('.check-area');
        checkboxes.forEach(chk => {
            chk.addEventListener('change', function() {
                const inputRelacionado = contenedor.querySelector(`.input-comision[data-area="${this.value}"]`);
                if (inputRelacionado) {
                    inputRelacionado.disabled = !this.checked;
                }
            });
        });

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = '<p style="text-align:center; color:#d9534f;">Error al cargar la información.</p>';
    }
}

async function guardarEspecialidades() {
    const idEmpleada = document.getElementById('idEspecialidadOculto').value;
    const contenedor = document.getElementById('contenedorListaAreas');
    
    const checkboxes = contenedor.querySelectorAll('.check-area:checked');
    const areasParaGuardar = [];

    checkboxes.forEach(chk => {
        const nombreArea = chk.value;
        const inputComision = contenedor.querySelector(`.input-comision[data-area="${nombreArea}"]`);
        const valorComision = inputComision ? parseFloat(inputComision.value) : 0.50;
        
        areasParaGuardar.push({
            area: nombreArea,
            comision: valorComision
        });
    });

    try {
        const respuesta = await fetch(`http://localhost:3000/api/empleadas/${idEmpleada}/areas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ areas: areasParaGuardar })
        });

        if (respuesta.ok) {
            mostrarNotificacion("Áreas actualizadas correctamente.", "success");
            cerrarModalEspecialidades();
        } else {
            mostrarNotificacion("Error al guardar la configuración.", "error");
        }
    } catch (error) {
        console.error(error);
        mostrarNotificacion("Error de conexión.", "error");
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
    const catSeleccionada = document.getElementById('filtroCategoriaGasto').value;
    const modoFecha = document.getElementById('modoFechaGastos').value;

    // Variables para el modo 'Mes y Año'
    const mesSeleccionado = document.getElementById('filtroMesGasto').value;
    const anioSeleccionado = document.getElementById('filtroAnioGasto').value;

    // Variables para el modo 'Rango Personalizado'
    const rangoValor = document.getElementById('rangoFechaGastos').value;
    let fechaDesde = null, fechaHasta = null;

    if (modoFecha === 'rango' && rangoValor) {
        // Flatpickr separa el rango con " a " o " to "
        if (rangoValor.includes(' a ')) {
            [fechaDesde, fechaHasta] = rangoValor.split(' a ');
        } else if (rangoValor.includes(' to ')) {
            [fechaDesde, fechaHasta] = rangoValor.split(' to ');
        } else if (rangoValor.length === 10) {
            fechaDesde = rangoValor;
            fechaHasta = rangoValor;
        }
    }

    const gastosFiltrados = memoriaGastos.filter(gasto => {
        // 1. Validar Filtro de Categoría
        const categoriaGasto = gasto.Nombre_Categoria || 'Sin tipo';
        const pasaFiltroCat = (catSeleccionada === 'todas') || (categoriaGasto === catSeleccionada);

        // 2. Validar Filtro de Fecha
        let pasaFiltroFecha = true;
        
        // Formateamos la fecha del gasto para que sea fácil de comparar (YYYY-MM-DD)
        const fechaObj = new Date(gasto.Fecha);
        const anioGasto = fechaObj.getUTCFullYear().toString();
        const mesGasto = fechaObj.getUTCMonth().toString();
        const diaStr = String(fechaObj.getUTCDate()).padStart(2, '0');
        const mesStr = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
        const fechaGastoFormateada = `${anioGasto}-${mesStr}-${diaStr}`;

        if (modoFecha === 'mes') {
            const pasaMes = (mesSeleccionado === 'todos') || (mesGasto === mesSeleccionado);
            const pasaAnio = (anioSeleccionado === 'todos') || (anioGasto === anioSeleccionado);
            pasaFiltroFecha = pasaMes && pasaAnio;
        } else if (modoFecha === 'rango' && fechaDesde && fechaHasta) {
            pasaFiltroFecha = (fechaGastoFormateada >= fechaDesde) && (fechaGastoFormateada <= fechaHasta);
        }

        return pasaFiltroCat && pasaFiltroFecha;
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
    // Actualizado al nuevo ID del HTML
    const inputBuscador = document.getElementById('buscadorIngresosTexto');
    const textoBuscado = inputBuscador ? inputBuscador.value.toLowerCase() : '';
    
    const modoFecha = document.getElementById('modoFechaIngresos').value;
    const mesSeleccionado = document.getElementById('filtroMesIngreso').value;
    const anioSeleccionado = document.getElementById('filtroAnioIngreso').value;
    
    const rangoValor = document.getElementById('rangoFechaIngresos').value;
    let fechaDesde = null, fechaHasta = null;

    if (modoFecha === 'rango' && rangoValor) {
        if (rangoValor.includes(' a ')) {
            [fechaDesde, fechaHasta] = rangoValor.split(' a ');
        } else if (rangoValor.includes(' to ')) {
            [fechaDesde, fechaHasta] = rangoValor.split(' to ');
        } else if (rangoValor.length === 10) {
            fechaDesde = rangoValor;
            fechaHasta = rangoValor;
        }
    }

    const filas = document.querySelectorAll('#tablaIngresosBody tr');
    let sumaTotal = 0; 

    filas.forEach(fila => {
        if (fila.cells.length === 1) return; // Ignora la fila de "Cargando..."

        const contenidoFila = fila.textContent.toLowerCase();
        const fechaFila = fila.getAttribute('data-fecha'); // Lee la fecha oculta en el HTML (YYYY-MM-DD)

        // 1. Filtro de Texto (Clienta, servicio, etc.)
        const cumpleTexto = contenidoFila.includes(textoBuscado);

        // 2. Filtro de Fecha
        let cumpleFecha = true;
        if (fechaFila) {
            if (modoFecha === 'mes') {
                const anioFila = fechaFila.substring(0, 4);
                const mesFila = (parseInt(fechaFila.substring(5, 7)) - 1).toString(); // De 01-12 a 0-11
                
                const pasaMes = (mesSeleccionado === 'todos') || (mesFila === mesSeleccionado);
                const pasaAnio = (anioSeleccionado === 'todos') || (anioFila === anioSeleccionado);
                cumpleFecha = pasaMes && pasaAnio;
            } else if (modoFecha === 'rango' && fechaDesde && fechaHasta) {
                cumpleFecha = (fechaFila >= fechaDesde) && (fechaFila <= fechaHasta);
            }
        }

        // Aplicamos el resultado y sumamos la plata
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

function abrirModalDetalleTurno(idTurno, nombreClienta, nombreServicio, precioBase, estado, color, sena = 0) {
    precioBaseActual = parseFloat(precioBase) || 0;
    const senaActual = parseFloat(sena) || 0;
    
    document.getElementById('idTurnoCobroOculto').value = idTurno;
    document.getElementById('nombreClientaCobro').textContent = `Clienta: ${nombreClienta}`;
    
    // Corregido: el parámetro se llama nombreServicio
    document.getElementById('servicioBaseCobro').textContent = `Servicio Base: ${nombreServicio}`;
    document.getElementById('precioBaseCobro').textContent = `Precio Base: $${precioBaseActual.toLocaleString('es-AR')}`;
    
    // --- NUEVO: Mostrar la seña en los campos ---
    const inputSena = document.getElementById('senaDetalleInput');
    if (inputSena) inputSena.value = senaActual;
    
    const textoDetalleSena = document.getElementById('textoDetalleSena');
    if (textoDetalleSena) {
        textoDetalleSena.textContent = `Seña abonada: -$${senaActual.toLocaleString('es-AR')}`;
    }
    // ------------------------------------------

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
    
    // Capturamos el botón de actualizar seña para poder bloquearlo si es necesario
    const btnActualizarSena = document.querySelector('button[onclick="guardarSenaIndependiente()"]');
    
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
        if (inputSena) inputSena.disabled = true;
        if (btnActualizarSena) btnActualizarSena.disabled = true;
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
        if (inputSena) inputSena.disabled = false;
        if (btnActualizarSena) btnActualizarSena.disabled = false;
        checkboxes.forEach(chk => chk.disabled = false);
    }

    document.getElementById('descuentoCobroInput').value = 0;
    checkboxes.forEach(chk => chk.checked = false);
    
    // Si la tenés definida, esto recalcula la matemática final
    if (typeof recalcularTotalCobro === 'function') {
        recalcularTotalCobro();
    }
    
    const modalDetalleTurno = document.getElementById('modalDetalleTurno');
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

    // LEEMOS EL VALOR REAL DE LA SEÑA DESDE EL INPUT
    const senaInput = document.getElementById('senaDetalleInput').value;
    const senaAbonada = senaInput ? parseFloat(senaInput) : 0;

    let totalFinal = precioBaseActual + sumaExtras - descuento - senaAbonada;
    
    if (totalFinal < 0) totalFinal = 0;

    document.getElementById('totalFinalCobro').textContent = `$${totalFinal.toLocaleString('es-AR')}`;
}

// Escuchamos cambios en Descuento
const inputDescuento = document.getElementById('descuentoCobroInput');
if (inputDescuento) {
    inputDescuento.addEventListener('input', recalcularTotalCobro);
}

// Escuchamos cambios en Seña para actualizar en tiempo real
const inputSenaDetalle = document.getElementById('senaDetalleInput');
if (inputSenaDetalle) {
    inputSenaDetalle.addEventListener('input', recalcularTotalCobro);
}

async function confirmarCobroTurno() {
    const idTurno = document.getElementById('idTurnoCobroOculto').value;
    const medioPago = document.getElementById('selectMedioPago').value;
    
    const descuentoInput = document.getElementById('descuentoCobroInput').value;
    const descuento = descuentoInput ? parseFloat(descuentoInput) : 0;
    
    // LEEMOS LA SEÑA ACÁ TAMBIÉN
    const senaInput = document.getElementById('senaDetalleInput').value;
    const senaAbonada = senaInput ? parseFloat(senaInput) : 0;
    
    const extrasSeleccionados = [];
    let sumaExtras = 0;
    
    const checkboxes = document.querySelectorAll('.check-extra:checked');
    checkboxes.forEach(chk => {
        extrasSeleccionados.push(parseInt(chk.getAttribute('data-id')));
        sumaExtras += parseFloat(chk.value);
    });

    let totalFinal = precioBaseActual + sumaExtras - descuento - senaAbonada;
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
    // 1. Limpiamos los campos
    document.getElementById('conceptoIngresoManual').value = '';
    document.getElementById('montoIngresoManual').value = '';
    
    // 2. Buscamos el modal en el HTML (asegurate de que el ID sea correcto)
    const modal = document.getElementById('modalNuevoIngreso');
    
    // 3. Lo abrimos
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error("¡Ojo! No encontré el modal. Revisá que el ID en el HTML sea 'modalNuevoIngreso'.");
    }
}

function cerrarModalNuevoIngreso() {
    const modal = document.getElementById('modalNuevoIngreso');
    if (modal) {
        modal.classList.remove('active');
    }
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

// ==========================================================================
// 9 SECCIÓN: DASHBOARD Y MÉTRICAS
// ==========================================================================

// Helper: Formatea una fecha de JS a 'YYYY-MM-DD'
const formatoFechaSQL = (fecha) => {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Obtiene las fechas de inicio y fin según el filtro rápido seleccionado
function obtenerFechasFiltroRapido(tipoFiltro) {
    const hoy = new Date();
    let desde = new Date();
    let hasta = new Date();

    if (tipoFiltro === 'hoy') {
        // 'desde' y 'hasta' ya son hoy
    } else if (tipoFiltro === 'ultimos_7_dias') {
        desde.setDate(hoy.getDate() - 7);
    } else if (tipoFiltro === 'este_mes') {
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (tipoFiltro === 'ultimo_mes') {
        desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0); // El día 0 es el último día del mes anterior
    }
    
    return { desde: formatoFechaSQL(desde), hasta: formatoFechaSQL(hasta) };
}

// Llama al servidor y actualiza las tarjetitas
async function cargarDatosDashboard(desdeCustom = null, hastaCustom = null) {
    let desde, hasta;

    if (desdeCustom && hastaCustom) {
        // Si usamos el calendario de rango (Flatpickr)
        desde = desdeCustom;
        hasta = hastaCustom;
    } else {
        // Si usamos el menú desplegable rápido
        const selectFiltro = document.getElementById('filtroRapidoDash');
        if (selectFiltro && selectFiltro.value !== 'personalizado') {
            const fechas = obtenerFechasFiltroRapido(selectFiltro.value);
            desde = fechas.desde;
            hasta = fechas.hasta;
        } else {
            return; // Está en 'personalizado' pero aún no eligió fechas, no hacemos nada
        }
    }

    try {
        const respuesta = await fetch(`http://localhost:3000/api/dashboard/kpis?desde=${desde}&hasta=${hasta}`);
        const kpis = await respuesta.json();

        // Actualizamos el HTML formateando los números con separadores de miles
        document.getElementById('dashIngresos').textContent = `$${kpis.Ingresos.toLocaleString('es-AR')}`;
        document.getElementById('dashGastos').textContent = `$${kpis.Gastos.toLocaleString('es-AR')}`;
        document.getElementById('dashSueldos').textContent = `$${kpis.Sueldos.toLocaleString('es-AR')}`;
        document.getElementById('dashGanancia').textContent = `$${kpis.GananciaNeta.toLocaleString('es-AR')}`;

        // Llamamos a que se dibuje el gráfico con las mismas fechas
        cargarGraficoDashboard(desde, hasta);

    } catch (error) {
        console.error("Error cargando métricas del dashboard:", error);
    }
}

// Variables globales para guardar los gráficos
let graficoIngresosInstancia = null;
let graficoTurnosInstancia = null;
let graficoServiciosInstancia = null;

// Llama al servidor y dibuja AMBOS gráficos
async function cargarGraficoDashboard(desde, hasta) {
    try {
        const respuesta = await fetch(`http://localhost:3000/api/dashboard/grafico-ingresos?desde=${desde}&hasta=${hasta}`);
        
        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        // ==========================================
        // DATOS PARA GRÁFICO 1 (Ingresos por fecha)
        // ==========================================
        const etiquetasIngresos = datos.map(d => d.Dia);
        const valoresIngresos = datos.map(d => d.Total);

        // ==========================================
        // DATOS PARA GRÁFICO 2 (Turnos por Día Fijo)
        // ==========================================
        const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const valoresTurnos = [0, 0, 0, 0, 0, 0, 0]; // Empezamos todo en cero

        // Recorremos los datos de la base de datos y los acomodamos en su día correspondiente
        datos.forEach(d => {
            if (d.Turnos > 0) {
                // Le agregamos la hora T00:00:00 para evitar que JavaScript se confunda con la zona horaria
                const fechaObj = new Date(d.FechaCompleta + 'T00:00:00');
                let diaIdx = fechaObj.getDay(); // JS nos devuelve: 0 = Domingo, 1 = Lunes, etc.
                
                // Lo acomodamos para que encaje con nuestro array (Lunes = 0, Domingo = 6)
                diaIdx = diaIdx === 0 ? 6 : diaIdx - 1;
                
                // Sumamos los turnos de esa fecha a la cajita de su día
                valoresTurnos[diaIdx] += d.Turnos;
            }
        });

        // ==========================================
        // 1. GRÁFICO DE INGRESOS (Ola Mostaza)
        // ==========================================
        const ctxIngresos = document.getElementById('graficoIngresos').getContext('2d');
        if (graficoIngresosInstancia) graficoIngresosInstancia.destroy();

        graficoIngresosInstancia = new Chart(ctxIngresos, {
            type: 'line', 
            data: {
                labels: etiquetasIngresos,
                datasets: [{
                    label: 'Ingresos ($)',
                    data: valoresIngresos,
                    borderColor: '#D4A347', 
                    backgroundColor: 'rgba(212, 163, 71, 0.2)', 
                    borderWidth: 3,
                    tension: 0.4, 
                    fill: true, 
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#D4A347',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' },
                        ticks: { callback: function(value) { return '$' + value.toLocaleString('es-AR'); } }
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        // ==========================================
        // 2. GRÁFICO DE TURNOS (Barras Fijas L a D)
        // ==========================================
        const ctxTurnos = document.getElementById('graficoTurnos').getContext('2d');
        if (graficoTurnosInstancia) graficoTurnosInstancia.destroy();

        graficoTurnosInstancia = new Chart(ctxTurnos, {
            type: 'bar', 
            data: {
                labels: diasSemana, 
                datasets: [{
                    label: 'Cantidad de Turnos',
                    data: valoresTurnos, 
                    backgroundColor: '#daab53', // ¡ACÁ ESTÁ EL COLOR ARENA/NUDE!
                    borderRadius: 6 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' },
                        ticks: { stepSize: 1 } 
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        // ==========================================
        // 3. GRÁFICO DE SERVICIOS ESTRELLA (Horizontal)
        // ==========================================
        const respServicios = await fetch(`http://localhost:3000/api/dashboard/servicios-estrella?desde=${desde}&hasta=${hasta}`);
        if (respServicios.ok) {
            const datosServicios = await respServicios.json();
            
            const etiquetasServicios = datosServicios.map(d => d.Nombre);
            const valoresCantidades = datosServicios.map(d => d.Cantidad);

            const ctxServicios = document.getElementById('graficoServicios').getContext('2d');
            if (graficoServiciosInstancia) graficoServiciosInstancia.destroy();

            graficoServiciosInstancia = new Chart(ctxServicios, {
                type: 'bar', 
                data: {
                    labels: etiquetasServicios,
                    datasets: [{
                        label: 'Veces realizado',
                        data: valoresCantidades,
                        backgroundColor: 'rgba(40, 167, 69, 0.7)', // El verde de la "Ganancia Neta"
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', // ESTO ES LA MAGIA QUE LO HACE HORIZONTAL
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { color: '#f0f0f0' },
                            ticks: { stepSize: 1 }
                        },
                        y: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error("Error cargando los gráficos:", error);
    }
}