export type PendingChatOperationKind = "send" | "edit" | "delete";

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export const PENDING_CHAT_QUEUE_VERSION = 4;
export const MAX_AUTOMATIC_MUTATION_ATTEMPTS = 2;

const QUEUE_PREFIX = "hm51_pending_chat_operations_";
const AUTO_SEND_ATTEMPT_PREFIX = "hm51_chat_auto_send_attempts_v1_";
const ATTEMPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 200;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function accountScope(accountId: string) {
  return clean(accountId) || "anonymous";
}

export function removeBeforeAutomaticAttempt(kind: PendingChatOperationKind) {
  return kind === "send";
}

export function retryAfterAutomaticFailure(
  kind: PendingChatOperationKind,
  attemptsAfterFailure = 1
) {
  if (kind === "send") return false;
  return attemptsAfterFailure < MAX_AUTOMATIC_MUTATION_ATTEMPTS;
}

export function removeUnsafePendingQueues(storage: KeyValueStore, accountId: string) {
  const scope = accountScope(accountId);
  storage.removeItem(`${QUEUE_PREFIX}${scope}`);
  storage.removeItem(`${QUEUE_PREFIX}v2_${scope}`);
  storage.removeItem(`${QUEUE_PREFIX}v3_${scope}`);
}

export function claimAutomaticSendAttempt(
  storage: KeyValueStore,
  accountId: string,
  clientId: string,
  now = Date.now()
) {
  const normalizedClientId = clean(clientId);
  if (!normalizedClientId) return false;

  const key = `${AUTO_SEND_ATTEMPT_PREFIX}${accountScope(accountId)}`;
  let attempts: Array<{ clientId: string; attemptedAt: number }> = [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    if (Array.isArray(parsed)) {
      attempts = parsed
        .map((item) => ({
          clientId: clean(item?.clientId),
          attemptedAt: Number(item?.attemptedAt) || 0,
        }))
        .filter(
          (item) =>
            !!item.clientId &&
            item.attemptedAt >= now - ATTEMPT_TTL_MS
        );
    }
  } catch {
    attempts = [];
  }

  if (attempts.some((item) => item.clientId === normalizedClientId)) return false;
  attempts.push({ clientId: normalizedClientId, attemptedAt: now });
  storage.setItem(key, JSON.stringify(attempts.slice(-MAX_ATTEMPTS)));
  return true;
}
