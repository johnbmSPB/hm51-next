import { cleanText, type ChatMessage, type PushParts } from "./chatLocalStore";

type HiddenRecord = {
  keys: string[];
  createdAt: number;
};

const HIDDEN_PREFIX = "hm51_chat_hidden_";
const HIDDEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const HIDDEN_LIMIT = 300;

function storageKey(gamerId: string, teamId: string) {
  return `${HIDDEN_PREFIX}${cleanText(gamerId) || "anonymous"}_${cleanText(teamId) || "default"}`;
}

function readHidden(gamerId: string, teamId: string): HiddenRecord[] {
  if (typeof localStorage === "undefined") return [];
  const cutoff = Date.now() - HIDDEN_TTL_MS;

  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(gamerId, teamId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object" && Number(item.createdAt || 0) >= cutoff)
      .map((item) => ({
        keys: Array.isArray(item.keys) ? item.keys.map(cleanText).filter(Boolean) : [],
        createdAt: Number(item.createdAt || 0),
      }))
      .filter((item) => item.keys.length > 0)
      .slice(-HIDDEN_LIMIT);
  } catch {
    return [];
  }
}

function writeHidden(gamerId: string, teamId: string, records: HiddenRecord[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(gamerId, teamId), JSON.stringify(records.slice(-HIDDEN_LIMIT)));
  } catch {
    // Скрытие сообщения не должно ломать чат при переполненном localStorage.
  }
}

function messageKeys(message: ChatMessage) {
  return [
    cleanText(message.messageId),
    cleanText(message.clientId),
    cleanText(message.id),
    cleanText(message.messID),
  ].filter(Boolean);
}

function pushKeys(push: PushParts) {
  return [
    cleanText(push.messageId),
    cleanText(push.clientId),
    push.pushId ? `push:${cleanText(push.pushId)}` : "",
  ].filter(Boolean);
}

export function hideChatMessage(gamerId: string, teamId: string, message: ChatMessage) {
  const keys = messageKeys(message);
  if (keys.length === 0) return;

  const keySet = new Set(keys);
  const records = readHidden(gamerId, teamId).filter(
    (record) => !record.keys.some((key) => keySet.has(key))
  );
  records.push({ keys, createdAt: Date.now() });
  writeHidden(gamerId, teamId, records);
}

export function isChatPushHidden(gamerId: string, push: PushParts) {
  if (!push.teamId) return false;
  const keys = new Set(pushKeys(push));
  if (keys.size === 0) return false;
  return readHidden(gamerId, push.teamId).some((record) =>
    record.keys.some((key) => keys.has(key))
  );
}
