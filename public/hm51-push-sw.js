self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

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

function getValue(data, keys) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }

  return "";
}

function isTeamChatPayload(data) {
  const eventName = String(
    getValue(data, ["event", "EVENT", "type", "TYPE", "action", "ACTION"])
  )
    .toUpperCase()
    .replace(/[_-]/g, " ");

  const hasTeam = !!getValue(data, ["team", "TEAM", "team_id", "TEAM_ID"]);
  const hasText = !!getValue(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"]);

  return (
    eventName.includes("TEAM CHAT") ||
    eventName.includes("TEAM") && eventName.includes("CHAT") ||
    hasTeam && hasText
  );
}

async function broadcastPayload(payload) {
  const clientList = await clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of clientList) {
    client.postMessage({
      type: "HM51_PUSH",
      payload
    });
  }
}

self.addEventListener("push", function (event) {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = {
        raw: event.data ? event.data.text() : ""
      };
    } catch {
      payload = {};
    }
  }

  const data = payload.data || payload || {};

  let title =
    payload.notification?.title ||
    getValue(data, ["title", "TITLE"]) ||
    "ХМ 5.1";

  let body =
    payload.notification?.body ||
    getValue(data, ["body", "BODY", "text", "TEXT", "message", "MESSAGE"]) ||
    "Новое уведомление";

  if (isTeamChatPayload(data)) {
    const family = getValue(data, ["family", "FAMILY"]);
    const name = getValue(data, ["name", "NAME"]);
    const senderName = `${family} ${name}`.trim() || "Игрок";

    title = `Сообщение от ${senderName}`;
    body = decodeSafe(getValue(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"]));
  }

  event.waitUntil(
    Promise.all([
      broadcastPayload(payload),
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: {
          url: "/chat",
          payload
        }
      })
    ])
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
