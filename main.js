// === Permiso de notificación al cargar la página ===
if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
}

// === Función para activar alarma (notificación + sonido) ===
function activarAlarma(mensaje = "¡Es hora de tomar tu medicamento!") {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Recordatorio", { body: mensaje });
    }
    // Sonido de teléfono antiguo
    const alarmaAudio = new Audio("https://upload.wikimedia.org/wikipedia/commons/6/6e/Telephone_Ring_1950s_UK.ogg");
    alarmaAudio.loop = true;
    alarmaAudio.play().catch(err => {
        alert("No se pudo reproducir el sonido de la alarma. Asegúrate de que tu teléfono no esté en silencio y que el navegador permita reproducir audio.");
    });

    let detener = document.createElement("button");
    detener.textContent = "Detener alarma";
    detener.style = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:10000;padding:20px 30px;background:#d32f2f;color:white;font-size:1.2em;border:none;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
    detener.onclick = () => {
        alarmaAudio.pause();
        alarmaAudio.currentTime = 0;
        detener.remove();
    };
    document.body.appendChild(detener);
}

// === Botón manual de prueba de alarma ===
const btnAlarma = document.getElementById("btn-activar-alarma");
if (btnAlarma) {
    btnAlarma.addEventListener("click", () => activarAlarma());
}

// === Lógica para recordatorios ===
const listaRecordatorios = document.getElementById("lista-recordatorios");
const formRecordatorio = document.getElementById("form-recordatorio");
let recordatorios = [];

// Cargar recordatorios de localStorage si existen
function cargarRecordatorios() {
    const guardados = localStorage.getItem("recordatorios");
    if (guardados) {
        recordatorios = JSON.parse(guardados);
    }
}

// Guardar recordatorios en localStorage
function guardarRecordatorios() {
    localStorage.setItem("recordatorios", JSON.stringify(recordatorios));
}

// Mostrar recordatorios en la lista
function mostrarRecordatorios() {
    listaRecordatorios.innerHTML = "";
    recordatorios.forEach((rec, idx) => {
        const li = document.createElement("li");
        li.className = "recordatorio-item";
        li.innerHTML = `
            <span>💊 ${rec.medicamento}</span>
            <span>⏰ ${rec.hora}</span>
            <button class="eliminar-btn" title="Eliminar" data-idx="${idx}">🗑</button>
        `;
        listaRecordatorios.appendChild(li);
    });
}

// Eliminar recordatorio
listaRecordatorios.addEventListener("click", function(e) {
    if (e.target.classList.contains("eliminar-btn")) {
        const idx = parseInt(e.target.getAttribute("data-idx"));
        recordatorios.splice(idx, 1);
        guardarRecordatorios();
        mostrarRecordatorios();
    }
});

// Programar alarma para cada recordatorio
function programarAlarmas() {
    recordatorios.forEach(rec => {
        programarAlarmaParaMedicamento(rec.hora, `¡Toma tu medicamento: ${rec.medicamento}!`);
    });
}

// Función para programar una alarma a una hora específica (formato "HH:MM")
function programarAlarmaParaMedicamento(hora, mensaje) {
    const ahora = new Date();
    const [h, m] = hora.split(':').map(Number);
    const objetivo = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m, 0, 0);
    let msParaAlarma = objetivo - ahora;
    if (msParaAlarma < 0) msParaAlarma += 24 * 60 * 60 * 1000; // Si ya pasó hoy, programa para mañana
    setTimeout(() => activarAlarma(mensaje), msParaAlarma);
}

// Manejo del envío del formulario
formRecordatorio.addEventListener("submit", function(e) {
    e.preventDefault();
    const medicamento = document.getElementById("medicamento").value.trim();
    const hora = document.getElementById("hora").value;
    if (!medicamento || !hora) return;
    recordatorios.push({ medicamento, hora });
    guardarRecordatorios();
    mostrarRecordatorios();
    programarAlarmas();
    formRecordatorio.reset();
});

// Inicialización al cargar
cargarRecordatorios();
mostrarRecordatorios();
programarAlarmas();
