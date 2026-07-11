self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

const CHAT_DB_NAME = "hm51-chat-db";
const CHAT_STORE_NAME = "pushMessages";
const SETTINGS_STORE_NAME = "settings";

let chatContext = {
  gamerId: "",
  teamId: "",
  chatOpen: false,
};

self.addEventListener("message", function (event) {
  const data = event.data || {};

  if (data.type === "HM51_SET_CHAT_CONTEXT") {
    chatContext = {
      gamerId: data.gamerId ? String(data.gamerId) : "",
      teamId: data.teamId ? String(data.teamId) : "",
      chatOpen: !!data.chatOpen,
    };

    event.waitUntil(saveChatContext(chatContext));
  }
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
    if (data && data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }

  return "";
}

function randomId() {
  try {
    if (self.crypto && self.crypto.randomUUID) return self.crypto.randomUUID();
  } catch {}

  return `${Date.now()}-${Math.random()}`;
}

function openChatDb() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(CHAT_DB_NAME, 2);

    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
        db.createObjectStore(CHAT_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function saveChatContext(context) {
  try {
    const db = await openChatDb();
    await new Promise(function (resolve) {
      const tx = db.transaction(SETTINGS_STORE_NAME, "readwrite");
      const store = tx.objectStore(SETTINGS_STORE_NAME);
      store.put({ key: "chatContext", ...context, updatedAt: Date.now() });
      tx.oncomplete = function () {
        db.close();
        resolve();
      };
      tx.onerror = function () {
        db.close();
        resolve();
      };
    });
  } catch {}
}

async function readChatContext() {
  try {
    const db = await openChatDb();
    return await new Promise(function (resolve) {
      const tx = db.transaction(SETTINGS_STORE_NAME, "readonly");
      const store = tx.objectStore(SETTINGS_STORE_NAME);
      const request = store.get("chatContext");
      request.onsuccess = function () {
        db.close();
        const value = request.result || {};
        resolve({
          gamerId: value.gamerId ? String(value.gamerId) : chatContext.gamerId || "",
          teamId: value.teamId ? String(value.teamId) : chatContext.teamId || "",
          chatOpen: !!value.chatOpen,
        });
      };
      request.onerror = function () {
        db.close();
        resolve(chatContext);
      };
    });
  } catch {
    return chatContext;
  }
}

function getSenderId(payload) {
  const data = payload && payload.data ? payload.data : payload || {};

  return String(
    getValue(data, ["GAMER_ID", "gamer_id", "SENDER_ID", "sender_id", "USER_ID", "user_id", "AUTHOR_ID", "author_id"])
  ).trim();
}

function normalizePushPayload(payload) {
  const data = payload && payload.data ? payload.data : payload || {};
  const notification = payload?.notification || payload?.webpush?.notification || {};

  const teamId = String(
    getValue(data, ["team", "TEAM", "team_id", "TEAM_ID"]) ||
      getValue(payload, ["team", "TEAM", "team_id", "TEAM_ID"])
  ).trim();

  const body = decodeSafe(
    getValue(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"]) ||
      notification.body ||
      payload?.body ||
      ""
  );

  const eventName = String(
    getValue(data, ["event", "EVENT", "type", "TYPE", "action", "ACTION"]) || "TEAM CHAT"
  )
    .toUpperCase()
    .replace(/[_-]/g, " ");

  const looksLikeTeamChat =
    eventName.includes("TEAM CHAT") ||
    (eventName.includes("TEAM") && eventName.includes("CHAT")) ||
    eventName.includes("MESSAGE") ||
    (!!teamId && !!body);

  if (!looksLikeTeamChat || !teamId || !body) return null;

  const id = String(
    getValue(data, ["message_id", "MESSAGE_ID", "MESS_ID", "mess_id", "id", "ID"]) ||
      getValue(payload, ["message_id", "MESSAGE_ID", "MESS_ID", "mess_id", "id", "ID"]) ||
      randomId()
  );

  return {
    id,
    teamId,
    text: body,
    createdAt: Date.now(),
    payload,
  };
}

async function storeChatPush(payload) {
  const normalized = normalizePushPayload(payload);
  if (!normalized) return;

  const db = await openChatDb();

  await new Promise(function (resolve) {
    const tx = db.transaction(CHAT_STORE_NAME, "readwrite");
    const store = tx.objectStore(CHAT_STORE_NAME);

    store.put(normalized);

    tx.oncomplete = function () {
      db.close();
      resolve();
    };

    tx.onerror = function () {
      db.close();
      resolve();
    };
  });
}

function isTeamChatPayload(data, payload) {
  const normalized = normalizePushPayload(payload || data);
  return !!normalized;
}

async function getClientList() {
  return await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
}

function isChatClientVisible(client) {
  try {
    const url = new URL(client.url);
    const isChatUrl = url.pathname === "/chat" || url.pathname.startsWith("/chat/");
    return isChatUrl && client.visibilityState === "visible";
  } catch {
    return false;
  }
}

async function broadcastPayload(payload, clientList) {
  const list = clientList || (await getClientList());

  for (const client of list) {
    client.postMessage({
      type: "HM51_PUSH",
      payload,
    });
  }
}

async function handlePush(payload) {
  const context = await readChatContext();
  const senderId = getSenderId(payload);

  if (senderId && context.gamerId && String(senderId) === String(context.gamerId)) {
    return;
  }

  const data = payload.data || payload || {};
  const clientList = await getClientList();
  const chatIsVisible = clientList.some(isChatClientVisible);

  let title =
    payload.notification?.title ||
    payload.title ||
    getValue(data, ["title", "TITLE"]) ||
    "ХМ 5.1";

  let body =
    payload.notification?.body ||
    payload.body ||
    getValue(data, ["body", "BODY", "text", "TEXT", "message", "MESSAGE"]) ||
    "Новое уведомление";

  const targetUrl =
    payload.url ||
    payload.notification?.click_action ||
    getValue(data, ["url", "URL", "link", "LINK"]) ||
    "/chat";

  if (isTeamChatPayload(data, payload)) {
    const family = getValue(data, ["family", "FAMILY"]);
    const name = getValue(data, ["name", "NAME"]);
    const senderName = `${family} ${name}`.trim() || "Игрок";

    title = `Сообщение от ${senderName}`;
    body = decodeSafe(
      getValue(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"]) ||
        payload.notification?.body ||
        payload.body ||
        "Новое сообщение"
    );
  }

  const tasks = [storeChatPush(payload), broadcastPayload(payload, clientList)];

  if (!chatIsVisible) {
    tasks.push(
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: {
          url: targetUrl,
          payload,
        },
      })
    );
  }

  await Promise.all(tasks);
}

self.addEventListener("push", function (event) {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = {
        raw: event.data ? event.data.text() : "",
      };
    } catch {
      payload = {};
    }
  }

  event.waitUntil(handlePush(payload));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus().then(function () {
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
          });
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
