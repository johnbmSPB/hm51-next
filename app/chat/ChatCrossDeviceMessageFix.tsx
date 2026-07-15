"use client";

import { useEffect } from "react";

type AnyObject = Record<string, any>;

type StoredMessage = {
  id?: string;
  messID?: string;
  clientId?: string;
  teamId?: string;
  author?: string;
  text?: string;
  time?: string;
  isMine?: boolean;
  status?: string;
  quote?: {
    id?: string;
    text?: string;
    author?: string;
  };
};

type PushParts = {
  event: string;
  teamId: string;
  messageId: string;
  senderId: string;
  body: string;
  family: string;
  name: string;
  time: string;
  replyTo: string;
  replyText: string;
  replySender: string;
};

const CHAT_PREFIX = "hm51_chat_";
const OUTBOX_KEY = "hm51_recent_outgoing_chat";
const DB_NAME = "hm51-chat-db";
const STORE_NAME = "pushMessages";

function str(value: unknown) {
  if (value === null || value === undefined) return "";
  const result = String(value).trim();
  return result === "." ? "" : result;
}

function normalize(value: unknown) {
  return str(value)
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function parseList(raw: string | null): AnyObject[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function parseObject(value: unknown): AnyObject | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as AnyObject;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function nestedObjects(payload: unknown) {
  const result: AnyObject[] = [];
  const queue: unknown[] = [payload];
  const seen = new Set<object>();

  while (queue.length > 0 && result.length < 40) {
    const object = parseObject(queue.shift());
    if (!object || seen.has(object)) continue;
    seen.add(object);
    result.push(object);

    Object.values(object).forEach((value) => {
      if (value && (typeof value === "object" || typeof value === "string")) queue.push(value);
    });
  }

  return result;
}

function first(objects: AnyObject[], keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];
      if (value !== undefined && value !== null && str(value)) return value;
    }
  }
  return "";
}

function parts(payload: unknown): PushParts {
  const objects = nestedObjects(payload);

  return {
    event: str(first(objects, ["event", "EVENT", "type", "TYPE", "action", "ACTION"]))
      .toUpperCase()
      .replace(/[_-]/g, " "),
    teamId: str(first(objects, ["team", "TEAM", "team_id", "TEAM_ID", "teamId"])),
    messageId: str(first(objects, ["message_id", "MESSAGE_ID", "MESS_ID", "mess_id", "id", "ID"])),
    senderId: str(first(objects, ["sender_id", "SENDER_ID", "gamer_id", "GAMER_ID", "user_id", "USER_ID"])),
    body: normalize(first(objects, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"])),
    family: normalize(first(objects, ["family", "FAMILY", "last_name", "LAST_NAME"])),
    name: normalize(first(objects, ["name", "NAME", "first_name", "FIRST_NAME"])),
    time: str(first(objects, ["message_time", "MESSAGE_TIME", "time", "TIME"])),
    replyTo: str(first(objects, ["REPLY_TO", "reply_to", "replyTo", "QUOTE_ID", "quote_id"])),
    replyText: normalize(first(objects, ["REPLY_TEXT", "reply_text", "replyText", "QUOTE_TEXT", "quote_text"])),
    replySender: normalize(
      first(objects, [
        "REPLY_SENDER",
        "REPLY_AUTHOR",
        "reply_sender",
        "reply_author",
        "replySender",
        "replyAuthor",
        "QUOTE_AUTHOR",
        "quote_author",
      ])
    ),
  };
}

function gamerIdFromMe(data: AnyObject) {
  const gamer = data.GAMER || data.gamer || data.USER || data.user || data.data?.GAMER || data.data?.USER || {};
  return str(gamer.ID || gamer.id || gamer.GAMER_ID || gamer.gamer_id || gamer.USER_ID || gamer.user_id);
}

function messageIds(message: StoredMessage) {
  return [str(message.id), str(message.messID), str(message.clientId)].filter(Boolean);
}

function sentFromThisBrowser(push: PushParts) {
  const cutoff = Date.now() - 5 * 60 * 1000;
  const outbox = parseList(localStorage.getItem(OUTBOX_KEY));

  return outbox.some((item) => {
    if (str(item.teamId) !== push.teamId || Number(item.createdAt || 0) < cutoff) return false;
    const savedServerId = str(item.serverId);
    if (push.messageId && savedServerId) return savedServerId === push.messageId;
    return !savedServerId && normalize(item.text) === push.body;
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queuedPayloads() {
  if (typeof indexedDB === "undefined") return [];

  try {
    const db = await openDb();
    return await new Promise<any[]>((resolve) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve([]);
        return;
      }

      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const records = Array.isArray(request.result) ? request.result : [];
        resolve(records.map((record) => record?.payload || record?.message || record));
      };
      request.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  } catch {
    return [];
  }
}

export default function ChatCrossDeviceMessageFix() {
  useEffect(() => {
    let disposed = false;
    let gamerId = "";
    let foregroundUnsubscribe: (() => void) | undefined;
    const pending = new Map<string, PushParts>();

    async function loadGamerId() {
      const token = localStorage.getItem("hm51_token") || "";
      if (!token) return;

      try {
        const response = await fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json;charset=UTF-8" },
          body: JSON.stringify({ token }),
        });
        const json = await response.json();
        gamerId = gamerIdFromMe(json);
      } catch {
        gamerId = "";
      }
    }

    function remember(payload: unknown) {
      const push = parts(payload);
      if (!push.teamId || !push.messageId || !push.body) return;
      if (!push.event.includes("TEAM CHAT") || push.event.includes("EDIT") || push.event.includes("DELETE")) return;
      pending.set(`${push.teamId}:${push.messageId}`, push);
    }

    function apply(push: PushParts) {
      const key = `${CHAT_PREFIX}${push.teamId}`;
      const messages = parseList(localStorage.getItem(key)) as StoredMessage[];
      if (messages.some((message) => messageIds(message).includes(push.messageId))) return true;
      if (sentFromThisBrowser(push)) return true;

      const isMine = !!gamerId && !!push.senderId && gamerId === push.senderId;
      const quoted = push.replyTo
        ? messages.find((message) => messageIds(message).includes(push.replyTo))
        : undefined;

      const next: StoredMessage = {
        id: push.messageId,
        messID: push.messageId,
        teamId: push.teamId,
        author: isMine ? "Вы" : `${push.family} ${push.name}`.trim() || "Игрок",
        text: push.body,
        time: push.time ? push.time.slice(0, 5) : new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        isMine,
        status: "delivered",
        quote:
          push.replyTo || push.replyText
            ? {
                id: push.replyTo,
                text: push.replyText || normalize(quoted?.text) || "Цитируемое сообщение",
                author:
                  push.replySender ||
                  (quoted ? (quoted.isMine ? "Вы" : normalize(quoted.author) || "Игрок") : "Сообщение"),
              }
            : undefined,
      };

      localStorage.setItem(key, JSON.stringify([...messages, next].slice(-250)));
      return true;
    }

    function processPending() {
      let changed = false;
      pending.forEach((push, key) => {
        const storageKey = `${CHAT_PREFIX}${push.teamId}`;
        const before = localStorage.getItem(storageKey) || "[]";
        if (!apply(push)) return;
        pending.delete(key);
        const after = localStorage.getItem(storageKey) || "[]";
        if (before !== after) changed = true;
      });
      if (changed) window.setTimeout(() => window.location.reload(), 50);
    }

    function onServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type !== "HM51_PUSH") return;
      remember(event.data.payload);
      window.setTimeout(processPending, 250);
    }

    function onForegroundMessage(event: Event) {
      remember((event as CustomEvent).detail);
      window.setTimeout(processPending, 250);
    }

    async function inspectQueue() {
      const payloads = await queuedPayloads();
      payloads.forEach(remember);
      processPending();
    }

    async function attachForegroundFcm() {
      try {
        const [{ getApps }, messagingModule] = await Promise.all([
          import("firebase/app"),
          import("firebase/messaging"),
        ]);
        if (disposed || !(await messagingModule.isSupported())) return;
        const app = getApps()[0];
        if (!app) return;
        foregroundUnsubscribe = messagingModule.onMessage(messagingModule.getMessaging(app), (payload: any) => {
          remember(payload);
          window.setTimeout(processPending, 250);
        });
      } catch {
        // Дополнительная синхронизация не должна ломать чат.
      }
    }

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    window.addEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);

    loadGamerId().finally(() => {
      inspectQueue();
      processPending();
    });
    attachForegroundFcm();

    const queueTimer = window.setInterval(inspectQueue, 900);

    return () => {
      disposed = true;
      foregroundUnsubscribe?.();
      window.clearInterval(queueTimer);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      window.removeEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);
    };
  }, []);

  return null;
}
