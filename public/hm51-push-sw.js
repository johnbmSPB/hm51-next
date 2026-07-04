function decodeSafe(text) {
  if (!text) return "";

  return String(text).replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_, hex) {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return _;
    }
  });
}

self.addEventListener("push", function (event) {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const data = payload.data || payload || {};
  const eventName = data.event || data.type || "";

  let title =
    payload.notification?.title ||
    data.title ||
    "ХМ 5.1";

  let body =
    payload.notification?.body ||
    data.body ||
    "Новое уведомление";

  if (eventName === "TEAM CHAT") {
    const family = data.family || "";
    const name = data.name || "";
    const senderName = `${family} ${name}`.trim() || "Игрок";

    title = `Сообщение от ${senderName}`;
    body = decodeSafe(data.text || "");
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {
        url: "/chat",
        payload
      }
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate("/chat");
          return;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("/chat");
      }
    })
  );
});
