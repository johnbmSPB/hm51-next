export type ChatQuote = {
  id: string;
  author: string;
  text: string;
};

export type ChatMessage = {
  id: string;
  messID?: string;
  clientId?: string;
  teamId: string;
  author: string;
  text: string;
  time: string;
  isMine: boolean;
  quote?: ChatQuote;
  edited?: boolean;
  status?: "sending" | "failed" | "sent" | "delivered" | "read";
};

export type PushParts = {
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

type Obj = Record<string, any>;

const CHAT_PREFIX = "hm51_chat_";
const OUTBOX_KEY = "hm51_recent_outgoing_chat";
export const SELECTED_TEAM_KEY = "hm51_selected_chat_team_id";
export const CHAT_DB_NAME = "hm51-chat-db";
export const CHAT_STORE_NAME = "pushMessages";

export function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  const result = String(value).trim();
  return result === "." ? "" : result;
}

export function normalizeText(value: unknown) {
  return cleanText(value)
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

export function chatKey(teamId: string) {
  return `${CHAT_PREFIX}${teamId || "default"}`;
}

function parseList(raw: string | null): Obj[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function loadMessages(teamId: string): ChatMessage[] {
  return parseList(localStorage.getItem(chatKey(teamId))) as ChatMessage[];
}

export function saveMessages(teamId: string, messages: ChatMessage[]) {
  localStorage.setItem(chatKey(teamId), JSON.stringify(messages.slice(-250)));
}

export function messageIds(message: ChatMessage) {
  return [cleanText(message.id), cleanText(message.messID), cleanText(message.clientId)].filter(Boolean);
}

export function messageMatches(message: ChatMessage, id: string) {
  return messageIds(message).includes(cleanText(id));
}

export function serverIdOf(message: ChatMessage) {
  return cleanText(message.messID) || cleanText(message.id);
}

function readOutbox() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  return parseList(localStorage.getItem(OUTBOX_KEY)).filter((item) => Number(item.createdAt || 0) >= cutoff);
}

function saveOutbox(items: Obj[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-80)));
}

export function rememberOutgoing(teamId: string, clientId: string, body: string, serverId = "") {
  const items = readOutbox().filter(
    (item) => !(cleanText(item.teamId) === teamId && cleanText(item.clientId || item.id) === clientId)
  );
  items.push({ teamId, clientId, id: clientId, serverId, text: normalizeText(body), createdAt: Date.now() });
  saveOutbox(items);
}

function parseObject(value: unknown): Obj | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Obj;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function nestedObjects(payload: unknown) {
  const result: Obj[] = [];
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

function first(objects: Obj[], keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      if (object[key] !== undefined && object[key] !== null && cleanText(object[key])) return object[key];
    }
  }
  return "";
}

function stableId(parts: Omit<PushParts, "messageId">) {
  const source = `${parts.teamId}|${parts.senderId}|${parts.event}|${parts.body}|${parts.newText}|${parts.time}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `push_${hash}`;
}

export function parsePush(payload: unknown): PushParts {
  const objects = nestedObjects(payload);
  const partial = {
    event:
      cleanText(first(objects, ["event", "EVENT", "type", "TYPE", "action", "ACTION"]))
        .toUpperCase()
        .replace(/[_-]/g, " ") || "TEAM CHAT",
    teamId: cleanText(first(objects, ["team", "TEAM", "team_id", "TEAM_ID", "teamId"])),
    senderId: cleanText(first(objects, ["sender_id", "SENDER_ID", "gamer_id", "GAMER_ID", "user_id", "USER_ID"])),
    body: normalizeText(first(objects, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"])),
    newText: normalizeText(first(objects, ["new_text", "NEW_TEXT"])),
    family: normalizeText(first(objects, ["family", "FAMILY", "last_name", "LAST_NAME"])),
    name: normalizeText(first(objects, ["name", "NAME", "first_name", "FIRST_NAME"])),
    time: cleanText(first(objects, ["message_time", "MESSAGE_TIME", "time", "TIME", "message_date", "MESSAGE_DATE"])),
    replyTo: cleanText(first(objects, ["REPLY_TO", "reply_to", "replyTo", "QUOTE_ID", "quote_id"])),
    replyText: normalizeText(first(objects, ["REPLY_TEXT", "reply_text", "replyText", "QUOTE_TEXT", "quote_text"])),
    replySender: normalizeText(
      first(objects, ["REPLY_SENDER", "REPLY_AUTHOR", "reply_sender", "reply_author", "replySender", "replyAuthor"])
    ),
  };
  const messageId = cleanText(first(objects, ["message_id", "MESSAGE_ID", "MESS_ID", "mess_id"]));
  return { ...partial, messageId: messageId || stableId(partial) };
}

export function pushKey(push: PushParts) {
  return [push.event, push.teamId, push.messageId, push.body, push.newText, push.replyTo].join("|");
}

function quoteFromPush(push: PushParts, messages: ChatMessage[]): ChatQuote | undefined {
  if (!push.replyTo && !push.replyText) return undefined;
  const quoted = push.replyTo ? messages.find((message) => messageMatches(message, push.replyTo)) : undefined;
  return {
    id: push.replyTo,
    text: push.replyText || normalizeText(quoted?.text) || "Цитируемое сообщение",
    author: push.replySender || (quoted ? (quoted.isMine ? "Вы" : quoted.author || "Игрок") : "Сообщение"),
  };
}

export function applyPush(push: PushParts, gamerId: string) {
  if (!push.teamId) return false;
  const current = loadMessages(push.teamId);

  if (push.event.includes("DELETE")) {
    const next = current.filter((message) => !messageMatches(message, push.messageId));
    if (next.length === current.length) return false;
    saveMessages(push.teamId, next);
    return true;
  }

  if (push.event.includes("EDIT")) {
    const replacement = push.newText || push.body;
    if (!replacement) return false;
    let changed = false;
    const next = current.map((message) => {
      if (!messageMatches(message, push.messageId)) return message;
      changed = true;
      return { ...message, text: replacement, edited: true };
    });
    if (changed) saveMessages(push.teamId, next);
    return changed;
  }

  if (!push.event.includes("CHAT") || !push.body) return false;

  const quote = quoteFromPush(push, current);
  const existing = current.find((message) => messageMatches(message, push.messageId));
  if (existing) {
    const next = current.map((message) =>
      message === existing ? { ...message, quote: quote || message.quote, status: "delivered" as const } : message
    );
    saveMessages(push.teamId, next);
    return true;
  }

  const outgoing = readOutbox()
    .slice()
    .reverse()
    .find((item) => {
      if (cleanText(item.teamId) !== push.teamId) return false;
      if (cleanText(item.serverId) && cleanText(item.serverId) === push.messageId) return true;
      return !cleanText(item.serverId) && normalizeText(item.text) === push.body;
    });

  if (outgoing) {
    const clientId = cleanText(outgoing.clientId || outgoing.id);
    let found = false;
    const next = current.map((message) => {
      if (!messageMatches(message, clientId)) return message;
      found = true;
      return {
        ...message,
        clientId,
        id: push.messageId,
        messID: push.messageId,
        quote: quote || message.quote,
        status: "delivered" as const,
      };
    });
    if (found) {
      saveMessages(push.teamId, next);
      rememberOutgoing(push.teamId, clientId, push.body, push.messageId);
      return true;
    }
  }

  const isMine = !!gamerId && !!push.senderId && gamerId === push.senderId;
  const nextMessage: ChatMessage = {
    id: push.messageId,
    messID: push.messageId,
    teamId: push.teamId,
    author: isMine ? "Вы" : `${push.family} ${push.name}`.trim() || "Игрок",
    text: push.body,
    time: push.time ? push.time.slice(0, 5) : new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    isMine,
    quote,
    status: "delivered",
  };

  saveMessages(push.teamId, [...current, nextMessage]);
  return true;
}

function openChatDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CHAT_DB_NAME, 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function drainPushQueue() {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openChatDb();
    return await new Promise<any[]>((resolve) => {
      if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
        db.close();
        resolve([]);
        return;
      }
      const transaction = db.transaction(CHAT_STORE_NAME, "readwrite");
      const store = transaction.objectStore(CHAT_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = Array.isArray(request.result) ? request.result : [];
        store.clear();
        resolve(result);
      };
      request.onerror = () => resolve([]);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  } catch {
    return [];
  }
}
