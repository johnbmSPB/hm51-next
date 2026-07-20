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
  pendingEdit?: boolean;
  createdAt?: number;
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
  recipientId: string;
  body: string;
  newText: string;
  family: string;
  name: string;
  time: string;
  replyTo: string;
  replyText: string;
  replySender: string;
};

export type PushApplyResult = "applied" | "ignored" | "deferred";

type Obj = Record<string, any>;

const CHAT_PREFIX = "hm51_chat_";
const OUTBOX_PREFIX = "hm51_recent_outgoing_chat_";
const SELECTED_TEAM_PREFIX = "hm51_selected_chat_team_id_";
const DELETED_MESSAGE_PREFIX = "hm51_deleted_chat_messages_v1_";
const DELETED_MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DELETED_MESSAGE_RECORDS = 300;

let activeGamerId = "";

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
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function scopeId(gamerId = activeGamerId) {
  return cleanText(gamerId) || "anonymous";
}

export function setChatAccountScope(gamerId: string) {
  activeGamerId = cleanText(gamerId);
}

export function selectedTeamKey(gamerId = activeGamerId) {
  return `${SELECTED_TEAM_PREFIX}${scopeId(gamerId)}`;
}

function outboxKey() {
  return `${OUTBOX_PREFIX}${scopeId()}`;
}

function deletedMessagesKey() {
  return `${DELETED_MESSAGE_PREFIX}${scopeId()}`;
}

export function chatKey(teamId: string) {
  return `${CHAT_PREFIX}${scopeId()}_${cleanText(teamId) || "default"}`;
}

function legacyChatKey(teamId: string) {
  return `${CHAT_PREFIX}${cleanText(teamId) || "default"}`;
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

export function messageTimestamp(value: unknown, fallback = 0) {
  const raw = cleanText(value);
  if (!raw) return fallback;

  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    const timestamp = raw.length === 10 ? numeric * 1000 : numeric;
    return Number.isFinite(timestamp) ? timestamp : fallback;
  }

  const timeOnly = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (timeOnly) {
    const date = new Date();
    date.setHours(Number(timeOnly[1]), Number(timeOnly[2]), Number(timeOnly[3] || 0), 0);
    return date.getTime();
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function sortChatMessages(messages: ChatMessage[]) {
  return messages
    .map((message, index) => ({ message, index }))
    .sort((left, right) => {
      const leftTime = Number(left.message.createdAt) || messageTimestamp(left.message.time);
      const rightTime = Number(right.message.createdAt) || messageTimestamp(right.message.time);
      if (leftTime && rightTime && leftTime !== rightTime) return leftTime - rightTime;
      return left.index - right.index;
    })
    .map(({ message }) => message);
}

function normalizeStoredMessage(raw: Obj, index: number): ChatMessage | null {
  const legacyId = cleanText(raw.id);
  const legacyServerId = cleanText(raw.messID);
  const explicitMessageId = cleanText(raw.messageId);
  const messageId = explicitMessageId || (legacyServerId && !legacyServerId.includes("-") ? legacyServerId : "");
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
    pendingEdit: !!raw.pendingEdit,
    createdAt: Number(raw.createdAt) || messageTimestamp(raw.time) || undefined,
    status: raw.status,
  };
}

function migrateLegacyHistory(teamId: string) {
  if (!activeGamerId) return;
  const scoped = chatKey(teamId);
  if (localStorage.getItem(scoped) !== null) return;
  const legacy = legacyChatKey(teamId);
  const legacyRaw = localStorage.getItem(legacy);
  if (legacyRaw === null) return;
  localStorage.setItem(scoped, legacyRaw);
  localStorage.removeItem(legacy);
}

export function loadMessages(teamId: string): ChatMessage[] {
  migrateLegacyHistory(teamId);
  const messages = parseList(localStorage.getItem(chatKey(teamId)))
    .map(normalizeStoredMessage)
    .filter(Boolean) as ChatMessage[];
  return sortChatMessages(messages);
}

export function saveMessages(teamId: string, messages: ChatMessage[]) {
  const canonical = sortChatMessages(messages).slice(-250).map((message) => ({
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
    pendingEdit: !!message.pendingEdit,
    createdAt: Number(message.createdAt) || messageTimestamp(message.time) || undefined,
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
  return parseList(localStorage.getItem(outboxKey())).filter((item) => Number(item.createdAt || 0) >= cutoff);
}

function saveOutbox(items: Obj[]) {
  localStorage.setItem(outboxKey(), JSON.stringify(items.slice(-80)));
}

function readDeletedMessages() {
  const cutoff = Date.now() - DELETED_MESSAGE_TTL_MS;
  return parseList(localStorage.getItem(deletedMessagesKey())).filter(
    (item) => Number(item.deletedAt || 0) >= cutoff && cleanText(item.teamId) && cleanText(item.id)
  );
}

function saveDeletedMessages(items: Obj[]) {
  localStorage.setItem(
    deletedMessagesKey(),
    JSON.stringify(items.slice(-MAX_DELETED_MESSAGE_RECORDS))
  );
}

export function rememberDeletedMessage(teamId: string, ids: string[]) {
  const normalizedTeamId = cleanText(teamId);
  const normalizedIds = [...new Set(ids.map(cleanText).filter(Boolean))];
  if (!normalizedTeamId || normalizedIds.length === 0) return;

  const idSet = new Set(normalizedIds);
  const current = readDeletedMessages().filter(
    (item) => cleanText(item.teamId) !== normalizedTeamId || !idSet.has(cleanText(item.id))
  );
  const deletedAt = Date.now();
  normalizedIds.forEach((id) => current.push({ teamId: normalizedTeamId, id, deletedAt }));
  saveDeletedMessages(current);
}

export function wasMessageDeleted(teamId: string, ids: string[]) {
  const normalizedTeamId = cleanText(teamId);
  const idSet = new Set(ids.map(cleanText).filter(Boolean));
  if (!normalizedTeamId || idSet.size === 0) return false;
  return readDeletedMessages().some(
    (item) => cleanText(item.teamId) === normalizedTeamId && idSet.has(cleanText(item.id))
  );
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

function primitive(value: unknown) {
  return ["string", "number", "boolean"].includes(typeof value) ? value : "";
}

function first(objects: Obj[], keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      const value = primitive(object[key]);
      if (cleanText(value)) return value;
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
    recipientId: cleanText(
      first(objects, [
        "recipient_id",
        "RECIPIENT_ID",
        "receiver_id",
        "RECEIVER_ID",
        "target_gamer_id",
        "TARGET_GAMER_ID",
        "to_gamer_id",
        "TO_GAMER_ID",
        "recipientId",
      ])
    ),
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
  const messageId = cleanText(first(objects, ["message_id", "MESSAGE_ID", "messageId"]));
  const clientId = cleanText(first(objects, ["client_id", "CLIENT_ID", "clientId", "MESS_ID", "mess_id"]));
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

export function applyPush(push: PushParts, gamerId: string): PushApplyResult {
  if (!push.teamId) return "ignored";
  const current = loadMessages(push.teamId);

  const actionIds = [push.messageId, push.clientId].filter(Boolean);

  if (push.event.includes("DELETE")) {
    if (actionIds.length === 0) return "ignored";
    rememberDeletedMessage(push.teamId, actionIds);
    const next = current.filter(
      (message) => !actionIds.some((id) => messageMatches(message, id))
    );
    if (next.length === current.length) return "applied";
    saveMessages(push.teamId, next);
    return "applied";
  }

  if (push.event.includes("EDIT")) {
    if (actionIds.length === 0) return "ignored";
    const replacement = push.newText || push.body;
    if (!replacement) return "ignored";
    let changed = false;
    const next = current.map((message) => {
      if (!actionIds.some((id) => messageMatches(message, id))) return message;
      changed = true;
      return { ...message, text: replacement, edited: true, pendingEdit: false };
    });
    if (!changed) return "deferred";
    saveMessages(push.teamId, next);
    return "applied";
  }

  if (!push.event.includes("CHAT") || !push.body) return "ignored";

  if (wasMessageDeleted(push.teamId, [push.messageId, push.clientId])) {
    return "ignored";
  }

  const quote = quoteFromPush(push, current);
  const fallbackPushClientId = `push:${push.pushId}`;
  const existing = current.find(
    (message) =>
      (!!push.messageId && message.messageId === push.messageId) ||
      (!!push.clientId && message.clientId === push.clientId) ||
      (!push.messageId &&
        !push.clientId &&
        message.clientId === fallbackPushClientId)
  );
  if (existing) {
    const next = current.map((message) =>
      message.clientId === existing.clientId
        ? {
            ...message,
            messageId: push.messageId || message.messageId,
            quote: quote || message.quote,
            status: "delivered" as const,
            createdAt: message.createdAt || messageTimestamp(push.time) || undefined,
          }
        : message
    );
    saveMessages(push.teamId, next);
    return "applied";
  }

  const outboxCandidates = readOutbox()
    .slice()
    .reverse()
    .filter((item) => cleanText(item.teamId) === push.teamId);
  let outgoing = outboxCandidates.find(
    (item) =>
      (!!push.clientId && cleanText(item.clientId) === push.clientId) ||
      (!!push.messageId && cleanText(item.messageId) === push.messageId)
  );

  if (!outgoing) {
    const textCandidates = outboxCandidates.filter(
      (item) => !cleanText(item.messageId) && normalizeText(item.text) === push.body
    );
    const localTextCandidates = current.filter(
      (message) =>
        message.isMine &&
        !serverIdOf(message) &&
        normalizeText(message.text) === push.body
    );
    if (textCandidates.length === 1 && localTextCandidates.length === 1) {
      outgoing = textCandidates[0];
    }
  }

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
        createdAt: message.createdAt || messageTimestamp(push.time) || undefined,
      };
    });
    if (found) {
      saveMessages(push.teamId, next);
      rememberOutgoing(push.teamId, outgoingClientId, push.body, push.messageId);
      return "applied";
    }
  }

  const isMine = !!gamerId && !!push.senderId && gamerId === push.senderId;
  const nextMessage: ChatMessage = {
    clientId: push.clientId || fallbackPushClientId,
    messageId: push.messageId || undefined,
    teamId: push.teamId,
    author: isMine ? "Вы" : `${push.family} ${push.name}`.trim() || "Игрок",
    text: push.body,
    time: push.time ||
      new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    createdAt: messageTimestamp(push.time) || Date.now(),
    isMine,
    quote,
    status: "delivered",
  };

  saveMessages(push.teamId, [...current, nextMessage]);
  return "applied";
}
