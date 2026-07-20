const CHAT_CLIENT_RELEASE = "chat-mutations-v4-2026-07-20-r1";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    await self.clients.claim();
    const clientList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    for (const client of clientList) {
      try {
        const url = new URL(client.url);
        const isChat = url.pathname === "/chat" || url.pathname.startsWith("/chat/");
        if (!isChat || url.searchParams.get("hm51_release") === CHAT_CLIENT_RELEASE) continue;
        url.searchParams.set("hm51_release", CHAT_CLIENT_RELEASE);
        if (typeof client.navigate === "function") await client.navigate(url.href);
      } catch {}
    }
  })());
});

const CHAT_DB_NAME = "hm51-chat-db";
const CHAT_DB_VERSION = 4;
const CHAT_STORE_NAME = "pushMessages";
const SETTINGS_STORE_NAME = "settings";
const ACTIVE_GAMER_SETTING = "activeGamerId";
const MAX_QUEUE_RECORDS = 800;
const MAX_QUEUE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

let chatContext = { gamerId: "", teamId: "", chatOpen: false };

self.addEventListener("message", function (event) {
  const data = event.data || {};
  if (data.type !== "HM51_SET_CHAT_CONTEXT") return;

  chatContext = {
    gamerId: data.gamerId ? String(data.gamerId) : "",
    teamId: data.teamId ? String(data.teamId) : "",
    chatOpen: !!data.chatOpen,
  };

  const persist = persistActiveGamerId(chatContext.gamerId);
  if (typeof event.waitUntil === "function") event.waitUntil(persist);
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

function stableChatPushHash(parts) {
  const source = parts.map(function (value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }).join("\u001f");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36);
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

function getRecipientId(payload) {
  const keys = [
    "recipient_id", "RECIPIENT_ID", "receiver_id", "RECEIVER_ID",
    "target_gamer_id", "TARGET_GAMER_ID", "to_gamer_id", "TO_GAMER_ID", "recipientId",
  ];
  return String(getPrimitiveValue(getData(payload), keys) || getPrimitiveValue(payload, keys)).trim();
}

function getEventName(payload) {
  const keys = ["event", "EVENT", "type", "TYPE", "action", "ACTION"];
  return String(getPrimitiveValue(getData(payload), keys) || getPrimitiveValue(payload, keys) || "TEAM CHAT")
    .toUpperCase()
    .replace(/[_-]/g, " ");
}

function getTeamId(payload) {
  return String(
    getPrimitiveValue(getData(payload), ["team", "TEAM", "team_id", "TEAM_ID", "teamId"]) ||
    getPrimitiveValue(payload, ["team", "TEAM", "team_id", "TEAM_ID", "teamId"])
  ).trim();
}

function getMessageId(payload) {
  return String(
    getPrimitiveValue(getData(payload), ["message_id", "MESSAGE_ID", "messageId"]) ||
    getPrimitiveValue(payload, ["message_id", "MESSAGE_ID"]) || ""
  ).trim();
}

function getClientId(payload) {
  return String(
    getPrimitiveValue(getData(payload), ["client_id", "CLIENT_ID", "clientId", "MESS_ID", "mess_id"]) ||
    getPrimitiveValue(payload, ["client_id", "CLIENT_ID", "MESS_ID", "mess_id"]) || ""
  ).trim();
}

function getMessageBody(payload) {
  const data = getData(payload);
  const notification = payload?.notification || payload?.webpush?.notification || {};
  return decodeSafe(
    getPrimitiveValue(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY", "new_text", "NEW_TEXT"]) ||
    getPrimitiveValue(notification, ["body", "BODY", "message", "MESSAGE", "text", "TEXT"]) ||
    getPrimitiveValue(payload, ["body", "BODY", "message", "MESSAGE", "text", "TEXT"]) || ""
  );
}

function getMessageTime(payload) {
  const keys = ["message_time", "MESSAGE_TIME", "time", "TIME", "message_date", "MESSAGE_DATE"];
  return String(getPrimitiveValue(getData(payload), keys) || getPrimitiveValue(payload, keys)).trim();
}

function getReplyTo(payload) {
  const keys = ["REPLY_TO", "reply_to", "replyTo", "QUOTE_ID", "quote_id"];
  return String(getPrimitiveValue(getData(payload), keys) || getPrimitiveValue(payload, keys)).trim();
}

function looksLikeChatPayload(payload) {
  const eventName = getEventName(payload);
  const teamId = getTeamId(payload);
  return (
    eventName.includes("TEAM CHAT") ||
    (eventName.includes("TEAM") && eventName.includes("CHAT")) ||
    (!!teamId && (!!getMessageBody(payload) || !!getMessageId(payload) || !!getClientId(payload)))
  );
}

function queueRecord(payload, fallbackAccountId) {
  const teamId = getTeamId(payload);
  if (!looksLikeChatPayload(payload) || !teamId) return null;

  const eventName = getEventName(payload);
  const messageId = getMessageId(payload);
  const clientId = getClientId(payload);
  const createdAt = Date.now();
  const accountId = getRecipientId(payload) || fallbackAccountId || "";
  const senderId = getSenderId(payload);
  const text = getMessageBody(payload);
  const messageTime = getMessageTime(payload);
  const replyTo = getReplyTo(payload);
  const identity = stableChatPushHash([
    accountId,
    teamId,
    eventName,
    messageId,
    clientId,
    senderId,
    text,
    messageTime,
    replyTo,
  ]);

  return {
    id: `queue_${identity}`,
    accountId,
    teamId,
    messageId,
    clientId,
    eventName,
    text,
    messageTime,
    replyTo,
    createdAt,
    payload,
  };
}

function ensureQueueIndexes(store) {
  if (!store.indexNames.contains("accountId")) store.createIndex("accountId", "accountId", { unique: false });
  if (!store.indexNames.contains("teamId")) store.createIndex("teamId", "teamId", { unique: false });
  if (!store.indexNames.contains("createdAt")) store.createIndex("createdAt", "createdAt", { unique: false });
}

function openChatDb() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(CHAT_DB_NAME, CHAT_DB_VERSION);

    request.onupgradeneeded = function () {
      const db = request.result;
      const store = db.objectStoreNames.contains(CHAT_STORE_NAME)
        ? request.transaction?.objectStore(CHAT_STORE_NAME)
        : db.createObjectStore(CHAT_STORE_NAME, { keyPath: "id" });
      if (store) ensureQueueIndexes(store);
      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = function () {
      const db = request.result;
      db.onversionchange = function () { db.close(); };
      resolve(db);
    };
    request.onerror = function () { reject(request.error); };
    request.onblocked = function () { reject(new Error("Chat IndexedDB upgrade is blocked")); };
  });
}

async function persistActiveGamerId(gamerId) {
  try {
    const db = await openChatDb();
    await new Promise(function (resolve) {
      const tx = db.transaction(SETTINGS_STORE_NAME, "readwrite");
      tx.objectStore(SETTINGS_STORE_NAME).put({ key: ACTIVE_GAMER_SETTING, value: gamerId || "" });
      tx.oncomplete = function () { db.close(); resolve(); };
      tx.onerror = function () { db.close(); resolve(); };
    });
  } catch {}
}

async function readActiveGamerId() {
  try {
    const db = await openChatDb();
    return await new Promise(function (resolve) {
      const tx = db.transaction(SETTINGS_STORE_NAME, "readonly");
      const request = tx.objectStore(SETTINGS_STORE_NAME).get(ACTIVE_GAMER_SETTING);
      request.onsuccess = function () { resolve(request.result?.value ? String(request.result.value) : ""); };
      request.onerror = function () { resolve(""); };
      tx.oncomplete = function () { db.close(); };
      tx.onerror = function () { db.close(); resolve(""); };
    });
  } catch {
    return "";
  }
}

function pruneQueueStore(store) {
  const request = store.getAll();
  request.onsuccess = function () {
    const records = Array.isArray(request.result) ? request.result : [];
    const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
    const fresh = records
      .filter(function (record) { return Number(record.createdAt || 0) >= cutoff; })
      .sort(function (a, b) { return Number(a.createdAt || 0) - Number(b.createdAt || 0); });
    const keepIds = new Set(fresh.slice(-MAX_QUEUE_RECORDS).map(function (record) { return String(record.id); }));
    records.forEach(function (record) {
      const id = String(record.id || "");
      if (id && !keepIds.has(id)) store.delete(id);
    });
  };
}

async function storeChatPush(payload, activeAccountId) {
  const record = queueRecord(payload, activeAccountId);
  if (!record) return;

  try {
    const db = await openChatDb();
    await new Promise(function (resolve) {
      const tx = db.transaction(CHAT_STORE_NAME, "readwrite");
      const store = tx.objectStore(CHAT_STORE_NAME);
      store.put(record);
      pruneQueueStore(store);
      tx.oncomplete = function () { db.close(); resolve(); };
      tx.onerror = function () { db.close(); resolve(); };
    });
  } catch {}
}

async function getClientList() {
  return await clients.matchAll({ type: "window", includeUncontrolled: true });
}

function isChatClientVisible(client) {
  try {
    const url = new URL(client.url);
    return (url.pathname === "/chat" || url.pathname.startsWith("/chat/")) && client.visibilityState === "visible";
  } catch {
    return false;
  }
}

async function broadcastPayload(payload, clientList) {
  const list = clientList || (await getClientList());
  for (const client of list) client.postMessage({ type: "HM51_PUSH", payload });
}

function makeNotification(payload) {
  const data = getData(payload);
  let title =
    getPrimitiveValue(payload?.notification || {}, ["title", "TITLE"]) ||
    getPrimitiveValue(payload, ["title", "TITLE"]) ||
    getPrimitiveValue(data, ["title", "TITLE"]) || "ХМ 5.1";
  let body = getMessageBody(payload) || "Новое уведомление";

  if (looksLikeChatPayload(payload)) {
    const senderName = `${getPrimitiveValue(data, ["family", "FAMILY"])} ${getPrimitiveValue(data, ["name", "NAME"])}`.trim() || "Игрок";
    title = `Сообщение от ${senderName}`;
    body = getMessageBody(payload) || "Новое сообщение";
  }
  return { title, body };
}

function safeChatUrl(value) {
  try {
    const url = new URL(String(value || "/chat"), self.location.origin);
    if (url.origin !== self.location.origin) return "/chat";
    if (!(url.pathname === "/chat" || url.pathname.startsWith("/chat/"))) return "/chat";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/chat";
  }
}

async function handlePush(payload) {
  const clientList = await getClientList();
  const chatIsVisible = clientList.some(isChatClientVisible);
  const persistedGamerId = chatContext.gamerId || (await readActiveGamerId());
  const senderId = getSenderId(payload);
  const isOwn = !!senderId && !!persistedGamerId && String(senderId) === String(persistedGamerId);
  const rawTargetUrl =
    getPrimitiveValue(payload, ["url", "URL"]) ||
    getPrimitiveValue(payload?.notification || {}, ["click_action", "url", "URL"]) ||
    getPrimitiveValue(getData(payload), ["url", "URL", "link", "LINK"]) || "/chat";
  const targetUrl = safeChatUrl(rawTargetUrl);
  const { title, body } = makeNotification(payload);
  const tasks = [storeChatPush(payload, persistedGamerId), broadcastPayload(payload, clientList)];

  if (!chatIsVisible && !isOwn) {
    tasks.push(
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: targetUrl, payload },
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
  const targetUrl = safeChatUrl(event.notification.data?.url || "/chat");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus().then(function () {
            if ("navigate" in client) return client.navigate(targetUrl);
          });
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
