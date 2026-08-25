import {
  applyPush as applyPushUnsafe,
  loadMessages,
  rememberDeletedMessage as rememberDeletedMessageUnsafe,
  rememberOutgoing as rememberOutgoingUnsafe,
  saveMessages as saveMessagesUnsafe,
  type ChatMessage,
  type PushApplyResult as UnsafePushApplyResult,
  type PushParts,
} from "./chatLocalStore";

export {
  cleanText,
  normalizeText,
  parsePush,
  pushKey,
  selectedTeamKey,
  serverIdOf,
  sortChatMessages,
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

export function saveMessages(teamId: string, messages: ChatMessage[]) {
  if (messages.length === 0) {
    try {
      saveMessagesUnsafe(teamId, []);
      return true;
    } catch (error) {
      console.warn("Chat local save failed", teamId, error);
      return false;
    }
  }

  for (const recent of candidates(messages)) {
    try {
      saveMessagesUnsafe(teamId, recent);
      return true;
    } catch (error) {
      if (!isStorageQuotaError(error)) {
        console.warn("Chat local save failed", teamId, error);
        return false;
      }
    }
  }

  console.warn("Chat local save failed: storage quota", teamId);
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
    console.warn("Chat outgoing cache save failed", teamId, error);
    return false;
  }
}

export function rememberDeletedMessage(teamId: string, ids: string[]) {
  try {
    rememberDeletedMessageUnsafe(teamId, ids);
    return true;
  } catch (error) {
    console.warn("Chat deleted-message cache save failed", teamId, error);
    return false;
  }
}

export function applyPush(push: PushParts, gamerId: string): PushApplyResult {
  try {
    return applyPushUnsafe(push, gamerId);
  } catch (error) {
    if (!isStorageQuotaError(error) || !push.teamId) {
      console.warn("Chat push local apply failed", push.teamId, error);
      return "storage-failed";
    }
  }

  const current = loadMessages(push.teamId);
  for (const recent of candidates(current)) {
    try {
      saveMessagesUnsafe(push.teamId, recent);
      return applyPushUnsafe(push, gamerId);
    } catch (error) {
      if (!isStorageQuotaError(error)) {
        console.warn("Chat push local apply failed", push.teamId, error);
        return "storage-failed";
      }
    }
  }

  return "storage-failed";
}
