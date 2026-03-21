self.addEventListener("push", function (event) {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch(e) {}

  const title = data.title || "Nova Notificação";
  const options = {
    body: data.body || "Você tem uma nova mensagem no CRM Miner.",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    data: { url: data.url || "/" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(event.notification.data.url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
