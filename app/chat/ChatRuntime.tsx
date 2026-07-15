"use client";

import { useEffect, useRef, useState } from "react";
import ClientChatPolished from "./ClientChatPolished";

type Obj = Record<string, any>;
type StoredMessage = {
  id?: string;
  messID?: string;
  clientId?: string;
  teamId?: string;
  author?: string;
  text?: string;
  time?: string;
  isMine?: boolean;
  edited?: boolean;
  status?: string;
  quote?: { id?: string; text?: string; author?: string };
};

type Push = {
  event: string;
  teamId: string;
  messageId: string;
  senderId: string;
  body: string;
  newText: string;
  family: string;
  name: string;
  time: string;
  replyTo: string;
  replyText: string;
  replySender: string;
};

const CHAT_PREFIX = "hm51_chat_";
const OUTBOX_KEY = "hm51_recent_outgoing_chat";
const ALIAS_KEY = "hm51_chat_server_id_map";
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
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return _; }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function parseList(raw: string | null): Obj[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function parseObject(raw: string | null): Record<string, string> {
  try {
    const value = JSON.parse(raw || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function asObject(value: unknown): Obj | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Obj;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function nestedObjects(payload: unknown) {
  const result: Obj[] = [];
  const queue: unknown[] = [payload];
  const seen = new Set<object>();
  while (queue.length && result.length < 40) {
    const current = asObject(queue.shift());
    if (!current || seen.has(current)) continue;
    seen.add(current);
    result.push(current);
    Object.values(current).forEach((value) => {
      if (value && (typeof value === "object" || typeof value === "string")) queue.push(value);
    });
  }
  return result;
}

function first(objects: Obj[], keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      if (object[key] !== undefined && object[key] !== null && str(object[key])) return object[key];
    }
  }
  return "";
}

function pushParts(payload: unknown): Push {
  const objects = nestedObjects(payload);
  return {
    event: str(first(objects, ["event", "EVENT", "type", "TYPE", "action", "ACTION"]))
      .toUpperCase().replace(/[_-]/g, " ") || "TEAM CHAT",
    teamId: str(first(objects, ["team", "TEAM", "team_id", "TEAM_ID", "teamId"])),
    messageId: str(first(objects, ["message_id", "MESSAGE_ID", "MESS_ID", "mess_id", "id", "ID"])),
    senderId: str(first(objects, ["sender_id", "SENDER_ID", "gamer_id", "GAMER_ID", "user_id", "USER_ID"])),
    body: normalize(first(objects, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"])),
    newText: normalize(first(objects, ["new_text", "NEW_TEXT"])),
    family: normalize(first(objects, ["family", "FAMILY", "last_name", "LAST_NAME"])),
    name: normalize(first(objects, ["name", "NAME", "first_name", "FIRST_NAME"])),
    time: str(first(objects, ["message_time", "MESSAGE_TIME", "time", "TIME"])),
    replyTo: str(first(objects, ["REPLY_TO", "reply_to", "replyTo", "QUOTE_ID", "quote_id"])),
    replyText: normalize(first(objects, ["REPLY_TEXT", "reply_text", "replyText", "QUOTE_TEXT", "quote_text"])),
    replySender: normalize(first(objects, ["REPLY_SENDER", "REPLY_AUTHOR", "reply_sender", "reply_author", "replySender", "replyAuthor"])),
  };
}

function messageIds(message: StoredMessage) {
  return [str(message.id), str(message.messID), str(message.clientId)].filter(Boolean);
}

function sameMessage(a: StoredMessage, b: StoredMessage) {
  const ids = new Set(messageIds(a));
  return messageIds(b).some((id) => ids.has(id));
}

function chatKey(teamId: string) { return `${CHAT_PREFIX}${teamId}`; }
function messages(teamId: string) { return parseList(localStorage.getItem(chatKey(teamId))) as StoredMessage[]; }

function resolveServerId(teamId: string, value: string) {
  let current = str(value);
  const aliases = parseObject(localStorage.getItem(ALIAS_KEY));
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    const next = str(aliases[`${teamId}:${current}`]);
    if (!next || next === current) break;
    current = next;
  }
  const outbox = parseList(localStorage.getItem(OUTBOX_KEY));
  const saved = outbox.slice().reverse().find((item) =>
    str(item.teamId) === teamId && (str(item.id) === current || str(item.serverId) === current || str(item.id) === str(value))
  );
  return str(saved?.serverId) || current;
}

function sentFromThisBrowser(push: Push) {
  const cutoff = Date.now() - 10 * 60 * 1000;
  return parseList(localStorage.getItem(OUTBOX_KEY)).some((item) => {
    if (str(item.teamId) !== push.teamId || Number(item.createdAt || 0) < cutoff) return false;
    if (push.messageId && str(item.serverId)) return str(item.serverId) === push.messageId;
    return !str(item.serverId) && normalize(item.text) === push.body;
  });
}

async function readQueuedPushes() {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<any[]>((resolve) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) { db.close(); resolve([]); return; }
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => { const result = Array.isArray(request.result) ? request.result : []; store.clear(); resolve(result); };
      request.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  } catch { return []; }
}

export default function ChatRuntime() {
  const [revision, setRevision] = useState(0);
  const snapshots = useRef(new Map<string, string>());
  const suppressOutgoing = useRef(false);

  useEffect(() => {
    let disposed = false;
    let gamerId = "";
    let foregroundUnsubscribe: (() => void) | undefined;
    const originalFetch = window.fetch.bind(window);
    const sentActions = new Set<string>();

    function chatKeys() {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || "";
        if (key.startsWith(CHAT_PREFIX)) result.push(key);
      }
      return result;
    }

    function store(teamId: string, list: StoredMessage[]) {
      suppressOutgoing.current = true;
      const raw = JSON.stringify(list.slice(-250));
      localStorage.setItem(chatKey(teamId), raw);
      snapshots.current.set(chatKey(teamId), raw);
      queueMicrotask(() => { suppressOutgoing.current = false; });
      setRevision((value) => value + 1);
    }

    function registerServerId(teamId: string, clientId: string, serverId: string) {
      if (!teamId || !clientId || !serverId) return;
      const aliases = parseObject(localStorage.getItem(ALIAS_KEY));
      aliases[`${teamId}:${clientId}`] = serverId;
      localStorage.setItem(ALIAS_KEY, JSON.stringify(aliases));
      const list = messages(teamId).map((message) => {
        if (!messageIds(message).includes(clientId)) return message;
        return { ...message, clientId, id: serverId, messID: serverId, status: "delivered" };
      });
      store(teamId, list);
    }

    window.fetch = function unifiedChatFetch(input: RequestInfo | URL, init?: RequestInit) {
      let meta: { teamId: string; clientId: string } | null = null;
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes("/api/chat/team-send") && typeof init?.body === "string") {
          const body = JSON.parse(init.body) as Obj;
          const teamId = str(body.teamId || body.TEAM_ID);
          const clientId = str(body.messID || body.MESS_ID);
          const rawReplyTo = str(body.replyTo || body.REPLY_TO);
          const list = messages(teamId);
          const outgoing = list.find((message) => messageIds(message).includes(clientId));
          const quoted = list.find((message) => messageIds(message).includes(rawReplyTo));
          const quote = outgoing?.quote || (quoted ? { id: rawReplyTo, text: quoted.text, author: quoted.isMine ? "Вы" : quoted.author } : undefined);
          const replyTo = resolveServerId(teamId, str(quote?.id) || rawReplyTo);
          const replyText = normalize(quote?.text || body.replyText || body.REPLY_TEXT);
          const replySender = normalize(quote?.author || body.replySender || body.REPLY_SENDER || body.replyAuthor);
          if (replyTo) { body.replyTo = replyTo; body.REPLY_TO = replyTo; }
          if (replyText) { body.replyText = replyText; body.REPLY_TEXT = replyText; }
          if (replySender) { body.replySender = replySender; body.replyAuthor = replySender; body.REPLY_SENDER = replySender; body.REPLY_AUTHOR = replySender; }
          init = { ...init, body: JSON.stringify(body) };
          meta = { teamId, clientId };
        }
      } catch (error) { console.error("HM51 send preparation failed", error); }

      return originalFetch(input, init).then(async (response) => {
        if (!meta) return response;
        try {
          const json = await response.clone().json();
          if (response.ok && json?.result !== false) {
            const serverId = str(json?.message_id || json?.MESSAGE_ID || json?.server?.message_id);
            if (serverId) registerServerId(meta.teamId, meta.clientId, serverId);
          }
        } catch {}
        return response;
      });
    };

    function applyPush(payload: unknown) {
      const push = pushParts(payload);
      if (!push.teamId || !push.messageId) return;
      const list = messages(push.teamId);

      if (push.event.includes("DELETE")) {
        const next = list.filter((message) => !messageIds(message).includes(push.messageId));
        if (next.length !== list.length) store(push.teamId, next);
        return;
      }

      if (push.event.includes("EDIT")) {
        const nextText = push.newText || push.body;
        if (!nextText) return;
        let changed = false;
        const next = list.map((message) => {
          if (!messageIds(message).includes(push.messageId)) return message;
          changed = true;
          return { ...message, text: nextText, edited: true };
        });
        if (changed) store(push.teamId, next);
        return;
      }

      if (!push.body || !push.event.includes("CHAT")) return;
      const quoted = push.replyTo ? list.find((message) => messageIds(message).includes(push.replyTo)) : undefined;
      const quote = push.replyTo || push.replyText ? {
        id: push.replyTo,
        text: push.replyText || normalize(quoted?.text) || "Цитируемое сообщение",
        author: push.replySender || (quoted ? (quoted.isMine ? "Вы" : normalize(quoted.author) || "Игрок") : "Сообщение"),
      } : undefined;
      const existing = list.find((message) => messageIds(message).includes(push.messageId));
      if (existing) {
        const next = list.map((message) => message === existing ? { ...message, quote: quote || message.quote, status: "delivered" } : message);
        store(push.teamId, next);
        return;
      }
      if (sentFromThisBrowser(push)) return;
      const isMine = !!gamerId && !!push.senderId && gamerId === push.senderId;
      store(push.teamId, [...list, {
        id: push.messageId,
        messID: push.messageId,
        teamId: push.teamId,
        author: isMine ? "Вы" : `${push.family} ${push.name}`.trim() || "Игрок",
        text: push.body,
        time: push.time ? push.time.slice(0, 5) : new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        isMine,
        status: "delivered",
        quote,
      }]);
    }

    async function postAction(url: string, body: Obj) {
      const response = await originalFetch(url, { method: "POST", headers: { "Content-Type": "application/json;charset=UTF-8" }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.result === false) throw new Error(json?.error || "Сервер не принял действие");
    }

    function compareLocal(key: string, oldRaw: string, newRaw: string) {
      const teamId = key.slice(CHAT_PREFIX.length);
      const token = localStorage.getItem("hm51_token") || "";
      if (!teamId || !token) return;
      const oldList = parseList(oldRaw) as StoredMessage[];
      const newList = parseList(newRaw) as StoredMessage[];
      oldList.filter((message) => message.isMine).forEach((oldMessage) => {
        const current = newList.find((message) => sameMessage(oldMessage, message));
        const messageId = resolveServerId(teamId, str(oldMessage.messID || oldMessage.id));
        if (!messageId) return;
        if (!current) {
          const id = `delete:${teamId}:${messageId}`;
          if (sentActions.has(id)) return;
          sentActions.add(id);
          postAction("/api/chat/team-delete", { token, teamId, messageId }).catch(() => store(teamId, oldList));
          return;
        }
        const oldText = normalize(oldMessage.text);
        const newText = normalize(current.text);
        if (!newText || oldText === newText) return;
        const id = `edit:${teamId}:${messageId}:${newText}`;
        if (sentActions.has(id)) return;
        sentActions.add(id);
        postAction("/api/chat/team-edit", { token, teamId, messageId, text: newText }).catch(() => store(teamId, oldList));
      });
    }

    function onServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type === "HM51_PUSH") applyPush(event.data.payload);
    }

    async function inspectQueue() {
      const records = await readQueuedPushes();
      records.forEach((record) => applyPush(record?.payload || record?.message || record));
    }

    async function loadGamerId() {
      const token = localStorage.getItem("hm51_token") || "";
      if (!token) return;
      try {
        const response = await originalFetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json;charset=UTF-8" }, body: JSON.stringify({ token }) });
        const json = await response.json();
        const gamer = json.GAMER || json.gamer || json.USER || json.user || json.data?.GAMER || json.data?.USER || {};
        gamerId = str(gamer.ID || gamer.id || gamer.GAMER_ID || gamer.gamer_id || gamer.USER_ID || gamer.user_id);
      } catch { gamerId = ""; }
    }

    async function attachForegroundFcm() {
      try {
        const [{ getApps }, messaging] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
        if (disposed || !(await messaging.isSupported())) return;
        const app = getApps()[0];
        if (!app) return;
        foregroundUnsubscribe = messaging.onMessage(messaging.getMessaging(app), applyPush);
      } catch {}
    }

    chatKeys().forEach((key) => snapshots.current.set(key, localStorage.getItem(key) || "[]"));
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    loadGamerId();
    attachForegroundFcm();
    inspectQueue();

    const queueTimer = window.setInterval(inspectQueue, 900);
    const actionTimer = window.setInterval(() => {
      if (suppressOutgoing.current) return;
      const keys = new Set([...snapshots.current.keys(), ...chatKeys()]);
      keys.forEach((key) => {
        const next = localStorage.getItem(key) || "[]";
        const previous = snapshots.current.get(key);
        if (previous === undefined) { snapshots.current.set(key, next); return; }
        if (previous === next) return;
        snapshots.current.set(key, next);
        compareLocal(key, previous, next);
      });
    }, 300);

    return () => {
      disposed = true;
      window.fetch = originalFetch;
      foregroundUnsubscribe?.();
      window.clearInterval(queueTimer);
      window.clearInterval(actionTimer);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, []);

  return <ClientChatPolished key={revision} />;
}
