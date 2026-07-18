self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

const CHAT_DB_NAME = "hm51-chat-db";
const CHAT_DB_VERSION = 3;
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

function getPrimitiveValue(data, keys) {
  for (const key of keys) {
    const value = data ? data[key] : undefined;
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      ["string", "number", "boolean"].includes(typeof value)
    ) {
      return value;
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

function getData(payload) {
  return payload && payload.data ? payload.data : payload || {};
}

function getSenderId(payload) {
  const data = getData(payload);
  return String(
    getPrimitiveValue(data, ["GAMER_ID", "gamer_id", "SENDER_ID", "sender_id", "USER_ID", "user_id", "AUTHOR_ID", "author_id"])
  ).trim();
}

function getEventName(payload) {
  const data = getData(payload);

  return String(
    getPrimitiveValue(data, ["event", "EVENT", "type", "TYPE", "action", "ACTION"]) ||
      getPrimitiveValue(payload, ["event", "EVENT", "type", "TYPE", "action", "ACTION"]) ||
      "TEAM CHAT"
  )
    .toUpperCase()
    .replace(/[_-]/g, " ");
}

function getTeamId(payload) {
  const data = getData(payload);

  return String(
    getPrimitiveValue(data, ["team", "TEAM", "team_id", "TEAM_ID"]) ||
      getPrimitiveValue(payload, ["team", "TEAM", "team_id", "TEAM_ID", "teamId"])
  ).trim();
}

function getMessageId(payload) {
  const data = getData(payload);

  return String(
    getPrimitiveValue(data, ["message_id", "MESSAGE_ID"]) ||
      getPrimitiveValue(payload, ["message_id", "MESSAGE_ID"]) ||
      ""
  ).trim();
}

function getClientId(payload) {
  const data = getData(payload);

  return String(
    getPrimitiveValue(data, ["client_id", "CLIENT_ID", "MESS_ID", "mess_id"]) ||
      getPrimitiveValue(payload, ["client_id", "CLIENT_ID", "MESS_ID", "mess_id"]) ||
      ""
  ).trim();
}

function getMessageBody(payload) {
  const data = getData(payload);
  const notification = payload?.notification || payload?.webpush?.notification || {};

  return decodeSafe(
    getPrimitiveValue(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY", "new_text", "NEW_TEXT"]) ||
      getPrimitiveValue(notification, ["body", "BODY", "message", "MESSAGE", "text", "TEXT"]) ||
      getPrimitiveValue(payload, ["body", "BODY", "message", "MESSAGE", "text", "TEXT"]) ||
      ""
  );
}

function looksLikeChatPayload(payload) {
  const eventName = getEventName(payload);
  const teamId = getTeamId(payload);
  const body = getMessageBody(payload);
  const messageId = getMessageId(payload);
  const clientId = getClientId(payload);

  return (
    eventName.includes("TEAM CHAT") ||
    (eventName.includes("TEAM") && eventName.includes("CHAT")) ||
    (!!teamId && (!!body || !!messageId || !!clientId))
  );
}

function queueRecord(payload) {
  const teamId = getTeamId(payload);
  if (!looksLikeChatPayload(payload) || !teamId) return null;

  const eventName = getEventName(payload);
  const messageId = getMessageId(payload);
  const clientId = getClientId(payload);
  const createdAt = Date.now();
  const identity = messageId || clientId || randomId();

  return {
    id: `queue_${teamId}_${eventName}_${identity}_${createdAt}_${randomId()}`,
    teamId,
    messageId,
    clientId,
    eventName,
    text: getMessageBody(payload),
    createdAt,
    payload,
  };
}

function openChatDb() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(CHAT_DB_NAME, CHAT_DB_VERSION);

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
      const db = request.result;
      db.onversionchange = function () {
        db.close();
      };
      resolve(db);
    };

    request.onerror = function () {
      reject(request.error);
    };

    request.onblocked = function () {
      reject(new Error("Chat IndexedDB upgrade is blocked"));
    };
  });
}

async function storeChatPush(payload) {
  const record = queueRecord(payload);
  if (!record) return;

  try {
    const db = await openChatDb();
    await new Promise(function (resolve) {
      const tx = db.transaction(CHAT_STORE_NAME, "readwrite");
      tx.objectStore(CHAT_STORE_NAME).put(record);
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

function makeNotification(payload) {
  const data = getData(payload);
  let title =
    getPrimitiveValue(payload?.notification || {}, ["title", "TITLE"]) ||
    getPrimitiveValue(payload, ["title", "TITLE"]) ||
    getPrimitiveValue(data, ["title", "TITLE"]) ||
    "ХМ 5.1";
  let body = getMessageBody(payload) || "Новое уведомление";

  if (looksLikeChatPayload(payload)) {
    const family = getPrimitiveValue(data, ["family", "FAMILY"]);
    const name = getPrimitiveValue(data, ["name", "NAME"]);
    const senderName = `${family} ${name}`.trim() || "Игрок";
    title = `Сообщение от ${senderName}`;
    body = getMessageBody(payload) || "Новое сообщение";
  }

  return { title, body };
}

async function handlePush(payload) {
  const clientList = await getClientList();
  const chatIsVisible = clientList.some(isChatClientVisible);
  const senderId = getSenderId(payload);
  const isOwn = !!senderId && !!chatContext.gamerId && String(senderId) === String(chatContext.gamerId);

  const targetUrl =
    getPrimitiveValue(payload, ["url", "URL"]) ||
    getPrimitiveValue(payload?.notification || {}, ["click_action", "url", "URL"]) ||
    getPrimitiveValue(getData(payload), ["url", "URL", "link", "LINK"]) ||
    "/chat";

  const { title, body } = makeNotification(payload);
  const tasks = [storeChatPush(payload), broadcastPayload(payload, clientList)];

  if (!chatIsVisible && !isOwn) {
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
      payload = { raw: event.data ? event.data.text() : "" };
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
