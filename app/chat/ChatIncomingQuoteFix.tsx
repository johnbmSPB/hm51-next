"use client";

import { useEffect } from "react";

type Message = {
  id?: string;
  messID?: string;
  clientId?: string;
  text?: string;
  author?: string;
  isMine?: boolean;
  quote?: {
    id?: string;
    text?: string;
    author?: string;
  };
};

type QuotePayload = {
  teamId: string;
  messageId: string;
  replyTo: string;
  replyText: string;
  replySender: string;
};

const PREFIX = "hm51_chat_";
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

function parseMessages(raw: string | null): Message[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function parseObject(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function payloadObjects(payload: unknown) {
  const result: Record<string, any>[] = [];
  const queue: unknown[] = [payload];
  const seen = new Set<object>();

  while (queue.length > 0 && result.length < 40) {
    const current = queue.shift();
    const object = parseObject(current);
    if (!object || seen.has(object)) continue;

    seen.add(object);
    result.push(object);

    ["message", "payload", "data", "notification", "webpush", "android", "apns"].forEach((key) => {
      if (object[key] !== undefined) queue.push(object[key]);
    });

    Object.values(object).forEach((value) => {
      if (value && (typeof value === "object" || typeof value === "string")) queue.push(value);
    });
  }

  return result;
}

function first(objects: Record<string, any>[], keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];
      if (value !== undefined && value !== null && str(value)) return value;
    }
  }
  return "";
}

function payloadParts(payload: unknown): QuotePayload {
  const objects = payloadObjects(payload);

  return {
    teamId: str(first(objects, ["team", "TEAM", "team_id", "TEAM_ID", "teamId"])),
    messageId: str(first(objects, ["message_id", "MESSAGE_ID", "MESS_ID", "mess_id", "id", "ID"])),
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

function ids(message: Message) {
  return [str(message.id), str(message.messID), str(message.clientId)].filter(Boolean);
}

function matches(message: Message, messageId: string) {
  return ids(message).includes(str(messageId));
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

export default function ChatIncomingQuoteFix() {
  useEffect(() => {
    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;
    const pending = new Map<string, QuotePayload>();

    function repair(parts: QuotePayload) {
      if (!parts.teamId || !parts.messageId || !parts.replyTo) return false;

      const key = `${PREFIX}${parts.teamId}`;
      const messages = parseMessages(localStorage.getItem(key));
      const target = messages.find((message) => matches(message, parts.messageId));
      if (!target) return false;

      const quoted = messages.find((message) => matches(message, parts.replyTo));
      const quoteText = parts.replyText || normalize(quoted?.text) || normalize(target.quote?.text) || "Цитируемое сообщение";
      const quoteAuthor =
        parts.replySender ||
        (quoted ? (quoted.isMine ? "Вы" : normalize(quoted.author) || "Игрок") : normalize(target.quote?.author) || "Сообщение");

      const updated = messages.map((message) => {
        if (!matches(message, parts.messageId)) return message;
        return {
          ...message,
          quote: {
            id: parts.replyTo,
            text: quoteText,
            author: quoteAuthor,
          },
        };
      });

      localStorage.setItem(key, JSON.stringify(updated.slice(-250)));
      return true;
    }

    function rememberPayload(payload: unknown) {
      const parts = payloadParts(payload);
      if (!parts.teamId || !parts.messageId || !parts.replyTo) return;
      pending.set(`${parts.teamId}:${parts.messageId}`, parts);
    }

    function processPending() {
      let changed = false;

      pending.forEach((parts, key) => {
        if (!repair(parts)) return;
        pending.delete(key);
        changed = true;
      });

      if (changed) window.setTimeout(() => window.location.reload(), 50);
    }

    function onServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type !== "HM51_PUSH") return;
      rememberPayload(event.data.payload);
      processPending();
    }

    function onForegroundMessage(event: Event) {
      rememberPayload((event as CustomEvent).detail);
      processPending();
    }

    async function inspectQueue() {
      const payloads = await queuedPayloads();
      payloads.forEach(rememberPayload);
      processPending();
    }

    async function attachForegroundFcm() {
      try {
        const [{ getApps }, messagingModule] = await Promise.all([
          import("firebase/app"),
          import("firebase/messaging"),
        ]);

        if (disposed) return;
        const { getMessaging, onMessage, isSupported } = messagingModule;
        if (!(await isSupported())) return;
        const app = getApps()[0];
        if (!app) return;

        foregroundUnsubscribe = onMessage(getMessaging(app), (payload: any) => {
          rememberPayload(payload);
          processPending();
        });
      } catch {
        // Цитирование не должно ломать чат при отсутствии foreground FCM.
      }
    }

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    window.addEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);

    attachForegroundFcm();
    inspectQueue();

    const pendingTimer = window.setInterval(processPending, 250);
    const queueTimer = window.setInterval(inspectQueue, 700);

    return () => {
      disposed = true;
      foregroundUnsubscribe?.();
      window.clearInterval(pendingTimer);
      window.clearInterval(queueTimer);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      window.removeEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);
    };
  }, []);

  return null;
}
