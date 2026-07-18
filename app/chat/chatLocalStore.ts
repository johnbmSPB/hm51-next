export type ChatQuote = {
  messageId: string;
  author: string;
  text: string;
  id?: string;
};

export type ChatMessage = {
  clientId: string;
  messageId?: string;
  teamId: string;
  author: string;
  text: string;
  time: string;
  isMine: boolean;
  quote?: ChatQuote;
  edited?: boolean;
  status?: "sending" | "failed" | "sent" | "delivered" | "read";
  id?: string;
  messID?: string;
};

export type PushParts = {
  event: string;
  teamId: string;
  messageId: string;
  clientId: string;
  pushId: string;
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

function stableLocalId(source: string) {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `local_${hash}`;
}

function normalizeQuote(raw: Obj | undefined): ChatQuote | undefined {
  if (!raw) return undefined;
  const messageId = cleanText(raw.messageId || raw.id);
  const quoteText = normalizeText(raw.text);
  if (!messageId && !quoteText) return undefined;
  return {
    messageId,
    author: normalizeText(raw.author) || "Сообщение",
    text: quoteText || "Цитируемое сообщение",
  };
}

function normalizeStoredMessage(raw: Obj, index: number): ChatMessage | null {
  const legacyId = cleanText(raw.id);
  const legacyServerId = cleanText(raw.messID);
  const messageId = cleanText(raw.messageId) || legacyServerId;
  const clientId =
    cleanText(raw.clientId) ||
    (legacyId && legacyId !== messageId ? legacyId : "") ||
    (messageId ? `server:${messageId}` : stableLocalId(`${raw.teamId}|${raw.time}|${raw.text}|${index}`));
  const teamId = cleanText(raw.teamId);
  const body = normalizeText(raw.text);
  if (!clientId || !teamId || !body) return null;

  return {
    clientId,
    messageId: messageId || undefined,
    teamId,
    author: normalizeText(raw.author) || (raw.isMine ? "Вы" : "Игрок"),
    text: body,
    time: cleanText(raw.time),
    isMine: !!raw.isMine,
    quote: normalizeQuote(raw.quote),
    edited: !!raw.edited,
    status: raw.status,
  };
}

export function loadMessages(teamId: string): ChatMessage[] {
  return parseList(localStorage.getItem(chatKey(teamId)))
    .map(normalizeStoredMessage)
    .filter(Boolean) as ChatMessage[];
}

export function saveMessages(teamId: string, messages: ChatMessage[]) {
  const canonical = messages.slice(-250).map((message) => ({
    clientId: cleanText(message.clientId),
    messageId: cleanText(message.messageId) || undefined,
    teamId: cleanText(message.teamId),
    author: normalizeText(message.author),
    text: normalizeText(message.text),
    time: cleanText(message.time),
    isMine: !!message.isMine,
    quote: message.quote
      ? {
          messageId: cleanText(message.quote.messageId || message.quote.id),
          author: normalizeText(message.quote.author),
          text: normalizeText(message.quote.text),
        }
      : undefined,
    edited: !!message.edited,
    status: message.status,
  }));
  localStorage.setItem(chatKey(teamId), JSON.stringify(canonical));
}

export function messageIds(message: ChatMessage) {
  return [
    cleanText(message.clientId),
    cleanText(message.messageId),
    cleanText(message.id),
    cleanText(message.messID),
  ].filter(Boolean);
}

export function messageMatches(message: ChatMessage, id: string) {
  return messageIds(message).includes(cleanText(id));
}

export function serverIdOf(message: ChatMessage) {
  return cleanText(message.messageId || message.messID);
}

function readOutbox() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  return parseList(localStorage.getItem(OUTBOX_KEY)).filter((item) => Number(item.createdAt || 0) >= cutoff);
}

function saveOutbox(items: Obj[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-80)));
}

export function rememberOutgoing(teamId: string, clientId: string, body: string, messageId = "") {
  const items = readOutbox().filter(
    (item) => !(cleanText(item.teamId) === teamId && cleanText(item.clientId) === clientId)
  );
  items.push({ teamId, clientId, messageId, text: normalizeText(body), createdAt: Date.now() });
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

function stablePushId(parts: Obj) {
  return stableLocalId(
    `${parts.teamId}|${parts.senderId}|${parts.event}|${parts.body}|${parts.newText}|${parts.time}`
  );
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
  const messageId = cleanText(first(objects, ["message_id", "MESSAGE_ID"]));
  const clientId = cleanText(first(objects, ["client_id", "CLIENT_ID", "MESS_ID", "mess_id"]));
  return { ...partial, messageId, clientId, pushId: messageId || clientId || stablePushId(partial) };
}

export function pushKey(push: PushParts) {
  return [push.event, push.teamId, push.pushId, push.body, push.newText, push.replyTo].join("|");
}

function quoteFromPush(push: PushParts, messages: ChatMessage[]): ChatQuote | undefined {
  if (!push.replyTo && !push.replyText) return undefined;
  const quoted = push.replyTo ? messages.find((message) => messageMatches(message, push.replyTo)) : undefined;
  return {
    messageId: push.replyTo,
    text: push.replyText || normalizeText(quoted?.text) || "Цитируемое сообщение",
    author: push.replySender || (quoted ? (quoted.isMine ? "Вы" : quoted.author || "Игрок") : "Сообщение"),
  };
}

export function applyPush(push: PushParts, gamerId: string) {
  if (!push.teamId) return false;
  const current = loadMessages(push.teamId);

  if (push.event.includes("DELETE")) {
    if (!push.messageId) return false;
    const next = current.filter((message) => !messageMatches(message, push.messageId));
    if (next.length === current.length) return false;
    saveMessages(push.teamId, next);
    return true;
  }

  if (push.event.includes("EDIT")) {
    if (!push.messageId) return false;
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
  const existing = current.find(
    (message) =>
      (!!push.messageId && message.messageId === push.messageId) ||
      (!!push.clientId && message.clientId === push.clientId)
  );
  if (existing) {
    const next = current.map((message) =>
      message.clientId === existing.clientId
        ? {
            ...message,
            messageId: push.messageId || message.messageId,
            quote: quote || message.quote,
            status: "delivered" as const,
          }
        : message
    );
    saveMessages(push.teamId, next);
    return true;
  }

  const outgoing = readOutbox()
    .slice()
    .reverse()
    .find((item) => {
      if (cleanText(item.teamId) !== push.teamId) return false;
      if (push.clientId && cleanText(item.clientId) === push.clientId) return true;
      if (push.messageId && cleanText(item.messageId) === push.messageId) return true;
      return !cleanText(item.messageId) && normalizeText(item.text) === push.body;
    });

  if (outgoing) {
    const outgoingClientId = cleanText(outgoing.clientId);
    let found = false;
    const next = current.map((message) => {
      if (message.clientId !== outgoingClientId) return message;
      found = true;
      return {
        ...message,
        messageId: push.messageId || message.messageId,
        quote: quote || message.quote,
        status: "delivered" as const,
      };
    });
    if (found) {
      saveMessages(push.teamId, next);
      rememberOutgoing(push.teamId, outgoingClientId, push.body, push.messageId);
      return true;
    }
  }

  const isMine = !!gamerId && !!push.senderId && gamerId === push.senderId;
  const nextMessage: ChatMessage = {
    clientId: push.clientId || `push:${push.pushId}`,
    messageId: push.messageId || undefined,
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
