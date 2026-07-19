export type PendingChatOperationKind = "send" | "edit" | "delete";

export const PENDING_CHAT_QUEUE_VERSION = 2;

export function removeBeforeAutomaticAttempt(kind: PendingChatOperationKind) {
  return kind === "send";
}

export function retryAfterAutomaticFailure(kind: PendingChatOperationKind) {
  return kind !== "send";
}
