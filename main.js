// Permiso de notificación
if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission().then(permission => {
        console.log("Permiso de notificación:", permission);
    });
}

// --- SONIDO INMEDIATO AL PULSAR "ACTIVAR SONIDOS" ---
let audioHabilitado = false;
const btnEnableSound = document.getElementById('btn-enable-sound');
btnEnableSound.addEventListener('click', function() {
    const audio = new Audio('./sonidos/ascent.mp3');
    audio.loop = true;
    audio.play().then(() => {
        audioHabilitado = true;
        document.body.setAttribute('data-audio-enabled', 'true');
        btnEnableSound.remove();
        mostrarPanelAlarma(audio, '¡Sonido activado! Ahora las alarmas sonarán.');
    }).catch((e) => {
        alert('No se pudo activar el sonido. Intenta de nuevo.');
        console.error(e);
    });
});

function mostrarPanelAlarma(audioElement, mensaje) {
    const alarmPanel = document.createElement('div');
    alarmPanel.className = 'alarm-panel';
    alarmPanel.innerHTML = `
        <div class="alarm-content">
            <p><i class="fas fa-bell"></i> ${mensaje}</p>
            <div class="alarm-actions">
                <button id="stop-alarm" class="btn btn-danger"><i class="fas fa-stop"></i> Detener</button>
                <button id="snooze-alarm" class="btn btn-primary"><i class="fas fa-clock"></i> Posponer 5 min</button>
            </div>
        </div>
    `;
    document.body.appendChild(alarmPanel);

    const stopAlarm = () => {
        if (audioElement) {
            if (typeof audioElement.pause === 'function') {
                audioElement.pause();
                audioElement.currentTime = 0;
            } else if (typeof audioElement.stop === 'function') {
                audioElement.stop();
            }
        }
        alarmPanel.remove();
    };

    document.getElementById('stop-alarm').addEventListener('click', stopAlarm);
    document.getElementById('snooze-alarm').addEventListener('click', () => {
        stopAlarm();
        setTimeout(() => {
            // Al posponer, vuelve a mostrar el panel y sonido
            const newAudio = new Audio('./sonidos/ascent.mp3');
            newAudio.loop = true;
            newAudio.play();
            mostrarPanelAlarma(newAudio, mensaje);
        }, 300000); // 5 minutos
    });
}

// Ajustes para móviles (safe-area)
function adjustForMobile() {
    if (window.innerWidth <= 640) {
        document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 0px)');
        document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)');
    }
}
window.addEventListener('load', adjustForMobile);
window.addEventListener('resize', adjustForMobile);

// --- FUNCION DE ALARMA (para recordatorios y prueba) ---
function activarAlarma(mensaje = "¡Es hora de tomar tu medicamento!") {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("MediTrack - Recordatorio", { 
            body: mensaje,
            vibrate: [200, 100, 200]
        });
    }

    if (!audioHabilitado) {
        alert('Debes pulsar "ACTIVAR SONIDOS" antes para escuchar la alarma.');
        return;
    }

    let audioElement = new Audio('./sonidos/ascent.mp3');
    audioElement.loop = true;
    audioElement.play().catch(e => {
        // fallback beep
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start();
            audioElement = { stop: () => oscillator.stop() };
        } catch (error) {
            console.error("Error con Web Audio API:", error);
        }
    });

    mostrarPanelAlarma(audioElement, mensaje);
}

// --- RECORDATORIOS ---
const listaRecordatorios = document.getElementById("lista-recordatorios");
const formRecordatorio = document.getElementById("form-recordatorio");
let recordatorios = JSON.parse(localStorage.getItem("recordatorios")) || [];
let alarmTimeouts = [];
function limpiarAlarmas() {
    alarmTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    alarmTimeouts = [];
}

function mostrarRecordatorios() {
    listaRecordatorios.innerHTML = recordatorios.map((rec, idx) => `
        <li class="recordatorio-item">
            <div class="medicamento">
                <i class="fas fa-pills"></i>
                <span>${rec.medicamento}</span>
            </div>
            <div class="hora">
                <i class="far fa-clock"></i>
                <span>${rec.hora}</span>
            </div>
            <button class="eliminar-btn" data-idx="${idx}">
                <i class="fas fa-trash"></i>
            </button>
        </li>
    `).join('');
}

function programarAlarmas() {
    limpiarAlarmas();
    recordatorios.forEach(rec => {
        const ahora = new Date();
        const [horas, minutos] = rec.hora.split(':').map(Number);
        const horaAlarma = new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            horas,
            minutos
        );
        let msRestantes = horaAlarma - ahora;
        if (msRestantes < 0) msRestantes += 86400000;
        const timeoutId = setTimeout(() => activarAlarma(`¡Toma tu ${rec.medicamento}!`), msRestantes);
        alarmTimeouts.push(timeoutId);
    });
}

// --- EVENTOS ---
formRecordatorio.addEventListener('submit', e => {
    e.preventDefault();
    const medicamento = document.getElementById("medicamento").value.trim();
    const hora = document.getElementById("hora").value;
    if (medicamento && hora) {
        recordatorios.push({ medicamento, hora });
        localStorage.setItem("recordatorios", JSON.stringify(recordatorios));
        mostrarRecordatorios();
        programarAlarmas();
        formRecordatorio.reset();
    }
});

listaRecordatorios.addEventListener('click', e => {
    if (e.target.closest('.eliminar-btn')) {
        const idx = e.target.closest('.eliminar-btn').dataset.idx;
        recordatorios.splice(idx, 1);
        localStorage.setItem("recordatorios", JSON.stringify(recordatorios));
        mostrarRecordatorios();
        programarAlarmas();
    }
});

document.getElementById('btn-activar-alarma').addEventListener('click', () => {
    if(audioHabilitado) {
        activarAlarma("¡Esta es una prueba de la alarma!");
    } else {
        alert("Primero pulsa ACTIVAR SONIDOS para que la alarma funcione.");
    }
});

// --- INICIALIZACION ---
document.addEventListener('DOMContentLoaded', () => {
    mostrarRecordatorios();
    programarAlarmas();
    adjustForMobile();
});
