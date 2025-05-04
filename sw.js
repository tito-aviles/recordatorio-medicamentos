// Función para manejar errores de forma centralizada
const handleError = (error, context) => {
  console.error(`Error en ${context}:`, error);
  return Promise.reject(error);
};

// Función para manejar promesas de forma segura
const handlePromise = async (promise, context) => {
  try {
    return await promise;
  } catch (error) {
    return handleError(error, context);
  }
};

// Manejo de errores global
self.addEventListener('error', function(event) {
  handleError(event.error, 'Service Worker');
  event.preventDefault();
});

self.addEventListener('unhandledrejection', function(event) {
  handleError(event.reason, 'Promesa no manejada');
  event.preventDefault();
});

// Service Worker para notificaciones push
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        console.log('Service Worker instalado');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Error durante la instalación:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        console.log('Service Worker activado');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('Error durante la activación:', error);
      })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.error('No hay datos en el evento push');
    return;
  }

  event.waitUntil(
    Promise.resolve()
      .then(async () => {
        let data;
        try {
          data = await event.data.json();
        } catch (error) {
          data = { body: await event.data.text() };
        }

        const options = {
          body: data.body || 'Es hora de tomar tu medicamento',
          icon: '/imagenes/icon.png',
          badge: '/imagenes/icon.png',
          vibrate: [100, 50, 100],
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
          },
          requireInteraction: true,
          actions: [
            {
              action: 'ver',
              title: 'Ver detalles'
            }
          ]
        };

        return self.registration.showNotification('Recordatorio de Medicación', options);
      })
      .catch(error => {
        console.error('Error al mostrar notificación:', error);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    Promise.resolve()
      .then(async () => {
        const clients = await self.clients.matchAll({ type: 'window' });
        
        for (const client of clients) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
      .catch(error => {
        console.error('Error al manejar clic en notificación:', error);
      })
  );
}); 