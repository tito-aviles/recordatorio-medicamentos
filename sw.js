self.addEventListener('push', (event) => {
  event.waitUntil(
    Promise.resolve()
      .then(async () => {
        let data;
        if (event.data) {
          try {
            data = await event.data.json();
          } catch (error) {
            data = { body: await event.data.text() };
          }
        } else {
          data = { body: 'Es hora de tomar tu medicamento' }; // Fallback
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
