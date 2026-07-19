import {
  applyPush as applyPushUnsafe,
  loadMessages,
  rememberOutgoing as rememberOutgoingUnsafe,
  saveMessages as saveMessagesUnsafe,
  type ChatMessage,
  type PushApplyResult as UnsafePushApplyResult,
  type PushParts,
} from "./chatLocalStore";
import { isChatPushHidden } from "./chatMessageMeta";

export {
  cleanText,
  normalizeText,
  parsePush,
  pushKey,
  selectedTeamKey,
  serverIdOf,
  setChatAccountScope,
  type ChatMessage,
  type ChatQuote,
  type PushParts,
} from "./chatLocalStore";

export type PushApplyResult = UnsafePushApplyResult | "storage-failed";

export { loadMessages };

const HISTORY_LIMITS = [250, 200, 150, 100, 60, 30, 10];

function isStorageQuotaError(error: unknown) {
  const candidate = error as { name?: unknown; code?: unknown } | null;
  const name = String(candidate?.name || "");
  const code = Number(candidate?.code || 0);
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014
  );
}

function candidates(messages: ChatMessage[]) {
  const capped = messages.slice(-250);
  const limits = [...new Set([capped.length, ...HISTORY_LIMITS])]
    .filter((limit) => limit > 0 && limit <= capped.length)
    .sort((left, right) => right - left);
  return limits.map((limit) => capped.slice(-limit));
}

function fullTimestamp(value: string) {
  const raw = String(value || "").trim();

  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    const date = new Date(raw.length === 10 ? numeric * 1000 : numeric);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const sqlMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (sqlMatch) {
    const date = new Date(
      Number(sqlMatch[1]),
      Number(sqlMatch[2]) - 1,
      Number(sqlMatch[3]),
      Number(sqlMatch[4]),
      Number(sqlMatch[5]),
      Number(sqlMatch[6] || 0)
    );
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const parsed = new Date(raw);
  if (raw && !Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const timeMatch = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
  if (timeMatch) {
    const date = new Date();
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3] || 0), 0);
    return date.toISOString();
  }

  return new Date().toISOString();
}

function hasStoredDate(value: string) {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw) || /^\d{10,13}$/.test(raw);
}

function stampAppliedPush(push: PushParts) {
  if (!push.teamId || !push.event.includes("CHAT") || push.event.includes("EDIT") || push.event.includes("DELETE")) {
    return;
  }

  const expectedIds = new Set(
    [push.messageId, push.clientId, push.pushId ? `push:${push.pushId}` : ""].filter(Boolean)
  );
  if (expectedIds.size === 0) return;

  const current = loadMessages(push.teamId);
  let changed = false;
  const timestamp = fullTimestamp(push.time);
  const next = current.map((message) => {
    const matches =
      expectedIds.has(String(message.messageId || "")) ||
      expectedIds.has(String(message.clientId || ""));
    if (!matches || hasStoredDate(message.time)) return message;
    changed = true;
    return { ...message, time: timestamp };
  });

  if (changed) saveMessagesUnsafe(push.teamId, next);
}

function applyAndStamp(push: PushParts, gamerId: string) {
  const result = applyPushUnsafe(push, gamerId);
  if (result === "applied") stampAppliedPush(push);
  return result;
}

export function saveMessages(teamId: string, messages: ChatMessage[]) {
  if (messages.length === 0) {
    try {
      saveMessagesUnsafe(teamId, []);
      return true;
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
      return false;
    }
  }

  for (const recent of candidates(messages)) {
    try {
      saveMessagesUnsafe(teamId, recent);
      return true;
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
    }
  }

  return false;
}

export function rememberOutgoing(
  teamId: string,
  clientId: string,
  body: string,
  messageId = ""
) {
  try {
    rememberOutgoingUnsafe(teamId, clientId, body, messageId);
    return true;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
    return false;
  }
}

export function applyPush(push: PushParts, gamerId: string): PushApplyResult {
  if (isChatPushHidden(gamerId, push)) return "ignored";

  try {
    return applyAndStamp(push, gamerId);
  } catch (error) {
    if (!isStorageQuotaError(error) || !push.teamId) throw error;
  }

  const current = loadMessages(push.teamId);
  for (const recent of candidates(current)) {
    try {
      saveMessagesUnsafe(push.teamId, recent);
      return applyAndStamp(push, gamerId);
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
    }
  }

  return "storage-failed";
}
