importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDiqKDv8h8lDD2wiaDPM57azBNxw2Dal3c",
  authDomain: "hockeymanager51.firebaseapp.com",
  projectId: "hockeymanager51",
  storageBucket: "hockeymanager51.firebasestorage.app",
  messagingSenderId: "354371414201",
  appId: "1:354371414201:web:5892b19ab60494471bd368"
});

const messaging = firebase.messaging();

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

messaging.onBackgroundMessage(function (payload) {
  const data = payload.data || {};
  const event = data.event || data.type || "";

  let title = payload.notification?.title || "ХМ 5.1";
  let body = payload.notification?.body || "Новое уведомление";

  if (event === "TEAM CHAT") {
    const family = data.family || "";
    const name = data.name || "";
    const senderName = `${family} ${name}`.trim() || "Игрок";

    title = `Сообщение от ${senderName}`;
    body = decodeSafe(data.text || "");
  }

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: "/chat",
      payload
    }
  });
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
