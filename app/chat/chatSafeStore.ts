import {
  applyPush as applyPushUnsafe,
  loadMessages,
  rememberOutgoing as rememberOutgoingUnsafe,
  saveMessages as saveMessagesUnsafe,
  type ChatMessage,
  type PushApplyResult,
  type PushParts,
} from "./chatLocalStore";

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
  type PushApplyResult,
  type PushParts,
} from "./chatLocalStore";

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
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
    }
    return;
  }

  for (const recent of candidates(messages)) {
    try {
      saveMessagesUnsafe(teamId, recent);
      return;
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
    }
  }
}

export function rememberOutgoing(
  teamId: string,
  clientId: string,
  body: string,
  messageId = ""
) {
  try {
    rememberOutgoingUnsafe(teamId, clientId, body, messageId);
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
  }
}

export function applyPush(push: PushParts, gamerId: string): PushApplyResult {
  try {
    return applyPushUnsafe(push, gamerId);
  } catch (error) {
    if (!isStorageQuotaError(error) || !push.teamId) throw error;
  }

  const current = loadMessages(push.teamId);
  for (const recent of candidates(current)) {
    try {
      saveMessagesUnsafe(push.teamId, recent);
      return applyPushUnsafe(push, gamerId);
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
    }
  }

  return "ignored";
}
