const form = document.getElementById('med-form');
const lista = document.getElementById('lista-medicamentos');
const borrarTodoBtn = document.getElementById('borrar-todo');

let medicamentos = [];

// Función para mostrar mensajes al usuario
function mostrarMensaje(mensaje, tipo = 'info') {
  const mensajeElement = document.createElement('div');
  mensajeElement.className = `mensaje mensaje-${tipo}`;
  mensajeElement.textContent = mensaje;
  document.body.insertBefore(mensajeElement, form);
  setTimeout(() => mensajeElement.remove(), 3000);
}

// Función para manejar errores de forma centralizada
function manejarError(error, contexto) {
  console.error(`Error en ${contexto}:`, error);
  mostrarMensaje(`Error en ${contexto}: ${error.message}`, 'error');
  return Promise.reject(error);
}

// Función para inicializar el Service Worker
async function inicializarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker no soportado');
    return;
  }

  try {
    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registrado:', registration);

    // Esperar a que el Service Worker esté activo
    if (registration.active) {
      console.log('Service Worker activo');
      await configurarNotificacionesPush(registration);
    } else {
      registration.addEventListener('activate', async () => {
        console.log('Service Worker activado');
        await configurarNotificacionesPush(registration);
      });
    }
  } catch (error) {
    console.error('Error al registrar Service Worker:', error);
  }
}

// Función para mostrar notificaciones
async function mostrarNotificacion(mensaje) {
  if (!('Notification' in window)) {
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    const notification = new Notification('Recordatorio de Medicación', {
      body: mensaje,
      icon: '/imagenes/icon.png',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Error al mostrar notificación:', error);
  }
}

// Función para configurar notificaciones push
async function configurarNotificacionesPush(registration) {
  try {
    // Solicitar permisos de notificación
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permiso de notificaciones denegado');
      return;
    }

    // Verificar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Generar VAPID keys (reemplaza con tus propias claves)
      const vapidPublicKey = 'TU_CLAVE_PUBLICA_VAPID';
      
      // Suscribir al usuario
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Usuario suscrito a notificaciones push:', subscription);
    }

    return subscription;
  } catch (error) {
    console.error('Error al configurar notificaciones push:', error);
  }
}

// Función para convertir la clave VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Función para cargar medicamentos
async function cargarMedicamentos() {
  try {
    const data = localStorage.getItem('medicamentos');
    if (!data) return [];

    const medicamentos = JSON.parse(data);
    medicamentos.forEach((med, index) => mostrarMedicamento(med, index));
    return medicamentos;
  } catch (error) {
    return manejarError(error, 'cargar medicamentos');
  }
}

// Inicialización al cargar la página
window.onload = () => {
  // Cargar medicamentos guardados
  const data = localStorage.getItem('medicamentos');
  if (data) {
    try {
      medicamentos = JSON.parse(data);
      medicamentos.forEach((med, index) => mostrarMedicamento(med, index));
    } catch (error) {
      console.error('Error al cargar medicamentos:', error);
      medicamentos = [];
    }
  }

  // Inicializar Service Worker
  inicializarServiceWorker();
};

// Función para mostrar el estado de la alarma
function mostrarEstadoAlarma(medicamento, activada) {
  const medItem = document.querySelector(`[data-medicamento="${medicamento.nombre}"]`);
  if (medItem) {
    const estadoAlarma = medItem.querySelector('.estado-alarma') || document.createElement('span');
    estadoAlarma.className = 'estado-alarma';
    estadoAlarma.textContent = activada ? '🔔 Alarma activa' : '🔕 Alarma inactiva';
    
    if (!medItem.querySelector('.estado-alarma')) {
      medItem.appendChild(estadoAlarma);
    }
  }
}

// Función para programar una alarma
async function programarAlarma(medicamento) {
  try {
    // Verificar si el navegador soporta la API de alarmas
    if (!('alarms' in chrome)) {
      console.log('La API de alarmas no está disponible');
      return false;
    }

    // Calcular la hora de la próxima alarma
    const ahora = new Date();
    const proximaAlarma = new Date(ahora.getTime() + medicamento.intervalo);

    // Crear la alarma
    await chrome.alarms.create(`medicamento-${medicamento.nombre}`, {
      when: proximaAlarma.getTime(),
      periodInMinutes: medicamento.intervalo / 60000
    });

    console.log(`Alarma programada para ${medicamento.nombre} a las ${proximaAlarma.toLocaleTimeString()}`);
    mostrarEstadoAlarma(medicamento, true);
    mostrarMensaje(`Alarma activada para ${medicamento.nombre}`, 'success');
    return true;
  } catch (error) {
    console.error('Error al programar la alarma:', error);
    mostrarMensaje('Error al programar la alarma', 'error');
    return false;
  }
}

// Función para cancelar una alarma
async function cancelarAlarma(nombreMedicamento) {
  try {
    if ('alarms' in chrome) {
      await chrome.alarms.clear(`medicamento-${nombreMedicamento}`);
      console.log(`Alarma cancelada para ${nombreMedicamento}`);
      const medicamento = medicamentos.find(m => m.nombre === nombreMedicamento);
      if (medicamento) {
        mostrarEstadoAlarma(medicamento, false);
        mostrarMensaje(`Alarma desactivada para ${nombreMedicamento}`, 'info');
      }
    }
  } catch (error) {
    console.error('Error al cancelar la alarma:', error);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nombre = document.getElementById('nombre').value.trim();
  const dosis = document.getElementById('dosis').value.trim();
  const intervaloInput = document.getElementById('intervalo').value.trim();
  
  // Validaciones
  if (!nombre || !dosis || !intervaloInput) {
    mostrarMensaje('Por favor, completa todos los campos', 'error');
    return;
  }
  
  const intervalo = parseInt(intervaloInput) * 60000;
  if (isNaN(intervalo) || intervalo <= 0) {
    mostrarMensaje('Por favor, ingresa un intervalo válido', 'error');
    return;
  }

  const medicamento = { nombre, dosis, intervalo };
  
  try {
    // Agregar el medicamento a la lista
    medicamentos.push(medicamento);
    localStorage.setItem('medicamentos', JSON.stringify(medicamentos));
    
    // Mostrar el medicamento en la interfaz
    mostrarMedicamento(medicamento, medicamentos.length - 1);
    
    // Programar la alarma
    const alarmaProgramada = await programarAlarma(medicamento);
    
    if (alarmaProgramada) {
      mostrarMensaje('Medicamento agregado correctamente', 'success');
    } else {
      mostrarMensaje('Medicamento agregado, pero la alarma no pudo ser programada', 'warning');
    }
    
    form.reset();
  } catch (error) {
    console.error('Error al guardar medicamento:', error);
    mostrarMensaje('Error al guardar el medicamento', 'error');
    // Revertir la adición del medicamento en caso de error
    medicamentos.pop();
  }
});

function mostrarMedicamento({ nombre, dosis, intervalo }, index) {
  const medItem = document.createElement('div');
  medItem.className = 'med-item';
  medItem.dataset.medicamento = nombre;
  medItem.innerHTML = `
    <div class="med-info">
      <strong>${nombre}</strong> - ${dosis} cada ${intervalo / 60000} min
    </div>
    <div class="med-actions">
      <span class="estado-alarma">🔕 Alarma inactiva</span>
      <button onclick="eliminarMedicamento(${index})">Eliminar</button>
    </div>
  `;
  lista.appendChild(medItem);
}

function eliminarMedicamento(index) {
  if (index >= 0 && index < medicamentos.length) {
    const medicamento = medicamentos[index];
    medicamentos.splice(index, 1);
    try {
      localStorage.setItem('medicamentos', JSON.stringify(medicamentos));
      // Cancelar la alarma
      cancelarAlarma(medicamento.nombre);
      recargarLista();
      mostrarMensaje('Medicamento eliminado correctamente', 'success');
    } catch (error) {
      console.error('Error al eliminar medicamento:', error);
      mostrarMensaje('Error al eliminar el medicamento', 'error');
    }
  }
}

borrarTodoBtn.addEventListener('click', () => {
  if (confirm("¿Seguro que quieres borrar todos los medicamentos?")) {
    // Cancelar todas las alarmas
    medicamentos.forEach(med => cancelarAlarma(med.nombre));
    medicamentos = [];
    try {
      localStorage.removeItem('medicamentos');
      recargarLista();
      mostrarMensaje('Todos los medicamentos han sido eliminados', 'success');
    } catch (error) {
      console.error('Error al eliminar todos los medicamentos:', error);
      mostrarMensaje('Error al eliminar los medicamentos', 'error');
    }
  }
});

function recargarLista() {
  lista.innerHTML = '';
  medicamentos.forEach((med, index) => mostrarMedicamento(med, index));
}

// Función para compartir por WhatsApp
function compartirPorWhatsApp() {
  const medicamentos = JSON.parse(localStorage.getItem('medicamentos') || '[]');
  let mensaje = '📋 Mi Lista de Medicamentos:\n\n';
  
  medicamentos.forEach((med, index) => {
    mensaje += `${index + 1}. ${med.nombre} - ${med.dosis} cada ${med.intervalo / 60000} minutos\n`;
  });
  
  mensaje += '\n💊 Recordatorio de Medicamentos by Gerardo López';
  
  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// Evento para el botón de compartir
document.getElementById('compartir-whatsapp').addEventListener('click', compartirPorWhatsApp);

// Evento para el botón de prueba de notificación
document.getElementById('prueba-notificacion').addEventListener('click', () => {
  mostrarNotificacion('Esta es una prueba de notificación');
});