export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("Service Worker registrado com sucesso:", registration.scope);
      return registration;
    } catch (error) {
      console.error("Falha ao registrar Service Worker:", error);
      return null;
    }
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Erro ao solicitar permissão de push:", error);
    return "denied";
  }
}

// Função mock para teste local enquanto não há Push Server
export function sendLocalPushMock(title, body) {
  if (Notification.permission === "granted" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: "/favicon.ico"
      });
    });
  }
}
