"use client";

import {
  deleteTeamMessage,
  editTeamMessage,
  sendTeamMessage,
} from "./chatApi";
import type { ChatMessage, ChatQuote } from "./chatLocalStore";
import {
  PENDING_CHAT_QUEUE_VERSION,
  claimAutomaticSendAttempt,
  removeBeforeAutomaticAttempt,
  removeUnsafePendingQueues,
  retryAfterAutomaticFailure,
  type PendingChatOperationKind,
} from "./chatPendingPolicy";

type PendingKind = PendingChatOperationKind;

export type PendingChatOperation = {
  id: string;
  kind: PendingKind;
  accountId: string;
  teamId: string;
  clientId: string;
  messageId: string;
  text: string;
  quote?: ChatQuote;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  revision: string;
};

type FlushHandlers = {
  onSendSuccess?: (operation: PendingChatOperation, messageId: string) => void;
  onEditSuccess?: (operation: PendingChatOperation) => void;
  onEditFailure?: (operation: PendingChatOperation) => void;
  onDeleteFailure?: (operation: PendingChatOperation) => void;
  onSendFailure?: (operation: PendingChatOperation) => void;
};

const QUEUE_PREFIX = `hm51_pending_chat_operations_v${PENDING_CHAT_QUEUE_VERSION}_`;
const MAX_OPERATIONS = 100;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const INITIAL_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

let flushing = false;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function queueKey(accountId: string) {
  return `${QUEUE_PREFIX}${clean(accountId) || "anonymous"}`;
}

function normalizeOperation(raw: unknown): PendingChatOperation | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PendingChatOperation>;
  const kind = value.kind;
  if (kind !== "send" && kind !== "edit" && kind !== "delete") return null;

  const accountId = clean(value.accountId);
  const teamId = clean(value.teamId);
  const clientId = clean(value.clientId);
  const messageId = clean(value.messageId);
  const text = String(value.text ?? "").trim();
  const id = clean(value.id);
  if (!id || !accountId || !teamId) return null;
  if (kind === "send" && (!clientId || !text)) return null;
  if ((kind === "edit" || kind === "delete") && !messageId) return null;

  return {
    id,
    kind,
    accountId,
    teamId,
    clientId,
    messageId,
    text,
    quote: value.quote,
    createdAt: Number(value.createdAt) || Date.now(),
    attempts: Math.max(0, Number(value.attempts) || 0),
    nextAttemptAt: Math.max(0, Number(value.nextAttemptAt) || 0),
    revision: clean(value.revision) || `legacy:${clean(value.id)}`,
  };
}

export function readPendingChatOperations(accountId: string): PendingChatOperation[] {
  if (typeof localStorage === "undefined") return [];
  try {
    // v1/v2 could retry a server-accepted send when its HTTP confirmation
    // was lost. Drop both unsafe namespaces before reading the v3 queue.
    removeUnsafePendingQueues(localStorage, accountId);
    const parsed = JSON.parse(localStorage.getItem(queueKey(accountId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed
      .map(normalizeOperation)
      .filter((item): item is PendingChatOperation => !!item && item.createdAt >= cutoff)
      .slice(-MAX_OPERATIONS);
  } catch {
    return [];
  }
}

function writeOperations(accountId: string, operations: PendingChatOperation[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(queueKey(accountId), JSON.stringify(operations.slice(-MAX_OPERATIONS)));
}

function upsertOperation(operation: PendingChatOperation) {
  const current = readPendingChatOperations(operation.accountId);
  const existing = current.find((item) => item.id === operation.id);
  const next = current.filter((item) => item.id !== operation.id);
  next.push(existing ? { ...operation, createdAt: existing.createdAt } : operation);
  writeOperations(operation.accountId, next);
}

function operationRevision() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random()}`;
}

export function pendingSendId(clientId: string) {
  return `send:${clean(clientId)}`;
}

function pendingServerActionId(kind: "edit" | "delete", teamId: string, messageId: string) {
  return `${kind}:${clean(teamId)}:${clean(messageId)}`;
}

function nextTry() {
  return Date.now() + 30_000;
}

export function enqueuePendingSend(accountId: string, message: ChatMessage) {
  const operation: PendingChatOperation = {
    id: pendingSendId(message.clientId),
    kind: "send",
    accountId: clean(accountId),
    teamId: clean(message.teamId),
    clientId: clean(message.clientId),
    messageId: clean(message.messageId),
    text: String(message.text || "").trim(),
    quote: message.quote,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: nextTry(),
    revision: operationRevision(),
  };
  upsertOperation(operation);
  return operation.id;
}

export function enqueuePendingEdit(
  accountId: string,
  teamId: string,
  clientId: string,
  messageId: string,
  text: string
) {
  const operation: PendingChatOperation = {
    id: pendingServerActionId("edit", teamId, messageId),
    kind: "edit",
    accountId: clean(accountId),
    teamId: clean(teamId),
    clientId: clean(clientId),
    messageId: clean(messageId),
    text: String(text || "").trim(),
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    revision: operationRevision(),
  };
  upsertOperation(operation);
  return operation.id;
}

export function enqueuePendingDelete(
  accountId: string,
  teamId: string,
  clientId: string,
  messageId: string
) {
  const editId = pendingServerActionId("edit", teamId, messageId);
  removePendingChatOperation(accountId, editId);
  const operation: PendingChatOperation = {
    id: pendingServerActionId("delete", teamId, messageId),
    kind: "delete",
    accountId: clean(accountId),
    teamId: clean(teamId),
    clientId: clean(clientId),
    messageId: clean(messageId),
    text: "",
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    revision: operationRevision(),
  };
  upsertOperation(operation);
  return operation.id;
}

export function removePendingChatOperation(accountId: string, operationId: string) {
  const next = readPendingChatOperations(accountId).filter((item) => item.id !== operationId);
  writeOperations(accountId, next);
}

export function removePendingChatOperationIfCurrent(
  accountId: string,
  operationId: string,
  revision: string
) {
  const current = readPendingChatOperations(accountId);
  const matching = current.find((item) => item.id === operationId);
  if (!matching || matching.revision !== revision) return false;
  writeOperations(
    accountId,
    current.filter((item) => item.id !== operationId)
  );
  return true;
}

export function markPendingChatOperationFailed(
  accountId: string,
  operationId: string,
  revision = ""
) {
  const current = readPendingChatOperations(accountId);
  const next = current.map((item) => {
    if (item.id !== operationId || (revision && item.revision !== revision)) return item;
    const attempts = item.attempts + 1;
    const delay = Math.min(
      MAX_RETRY_DELAY_MS,
      INITIAL_RETRY_DELAY_MS * Math.pow(2, Math.min(attempts - 1, 6))
    );
    return { ...item, attempts, nextAttemptAt: Date.now() + delay };
  });
  writeOperations(accountId, next);
}

function asMessage(operation: PendingChatOperation): ChatMessage {
  return {
    clientId: operation.clientId,
    messageId: operation.messageId || undefined,
    teamId: operation.teamId,
    author: "Вы",
    text: operation.text,
    time: "",
    isMine: true,
    quote: operation.quote,
    status: "sending",
  };
}

export async function flushPendingChatOperations(
  accountId: string,
  token: string,
  handlers: FlushHandlers = {}
) {
  if (flushing || !clean(accountId) || !clean(token)) return;
  flushing = true;

  try {
    let processed = 0;
    while (processed < MAX_OPERATIONS) {
      const operation = readPendingChatOperations(accountId)
        .filter((item) => item.nextAttemptAt <= Date.now())
        .sort((left, right) => left.createdAt - right.createdAt)[0];
      if (!operation) break;
      processed += 1;

      try {
        if (operation.kind === "send") {
          if (removeBeforeAutomaticAttempt(operation.kind)) {
            removePendingChatOperationIfCurrent(
              accountId,
              operation.id,
              operation.revision
            );
          }
          if (!claimAutomaticSendAttempt(localStorage, accountId, operation.clientId)) {
            continue;
          }
          const messageId = await sendTeamMessage(token, asMessage(operation));
          handlers.onSendSuccess?.(operation, messageId);
          continue;
        }

        if (operation.kind === "edit") {
          await editTeamMessage(
            token,
            operation.teamId,
            operation.messageId,
            operation.text
          );
          if (
            removePendingChatOperationIfCurrent(
              accountId,
              operation.id,
              operation.revision
            )
          ) {
            handlers.onEditSuccess?.(operation);
          }
          continue;
        }

        await deleteTeamMessage(
          token,
          operation.teamId,
          operation.messageId
        );
        removePendingChatOperationIfCurrent(
          accountId,
          operation.id,
          operation.revision
        );
      } catch {
        const attemptsAfterFailure = operation.attempts + 1;
        if (
          retryAfterAutomaticFailure(
            operation.kind,
            attemptsAfterFailure
          )
        ) {
          markPendingChatOperationFailed(
            accountId,
            operation.id,
            operation.revision
          );
          continue;
        }

        removePendingChatOperationIfCurrent(
          accountId,
          operation.id,
          operation.revision
        );
        if (operation.kind === "send") {
          handlers.onSendFailure?.(operation);
        } else if (operation.kind === "edit") {
          handlers.onEditFailure?.(operation);
        } else {
          handlers.onDeleteFailure?.(operation);
        }
      }
    }
  } finally {
    flushing = false;
  }
}
