import test from "node:test";
import assert from "node:assert/strict";

const {
  PENDING_CHAT_QUEUE_VERSION,
  claimAutomaticSendAttempt,
  removeBeforeAutomaticAttempt,
  removeUnsafePendingQueues,
  retryAfterAutomaticFailure,
} = await import("../app/chat/chatPendingPolicy.ts");
const {
  ChatRequestError,
  chatErrorKind,
  httpChatErrorKind,
  isRetryableChatError,
} = await import("../app/chat/chatErrors.ts");

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test("pending mutation queue uses the safe v4 storage namespace", () => {
  assert.equal(PENDING_CHAT_QUEUE_VERSION, 4);
});

test("automatic send is removed before its single network attempt", () => {
  assert.equal(removeBeforeAutomaticAttempt("send"), true);
  assert.equal(removeBeforeAutomaticAttempt("edit"), false);
  assert.equal(removeBeforeAutomaticAttempt("delete"), false);
});

test("send is not retried and edit/delete stop after two failures", () => {
  assert.equal(retryAfterAutomaticFailure("send", 1), false);
  assert.equal(retryAfterAutomaticFailure("edit", 1), true);
  assert.equal(retryAfterAutomaticFailure("delete", 1), true);
  assert.equal(retryAfterAutomaticFailure("edit", 2), false);
  assert.equal(retryAfterAutomaticFailure("delete", 2), false);
});

test("one client id can claim only one automatic send attempt", () => {
  const storage = new MemoryStorage();
  assert.equal(claimAutomaticSendAttempt(storage, "gamer-1", "client-1", 1000), true);
  assert.equal(claimAutomaticSendAttempt(storage, "gamer-1", "client-1", 1001), false);
  assert.equal(claimAutomaticSendAttempt(storage, "gamer-1", "client-2", 1002), true);
  assert.equal(claimAutomaticSendAttempt(storage, "gamer-2", "client-1", 1003), true);
});

test("unsafe v1 and v2 queues are removed without touching v3", () => {
  const storage = new MemoryStorage();
  storage.setItem("hm51_pending_chat_operations_gamer-1", "v1");
  storage.setItem("hm51_pending_chat_operations_v2_gamer-1", "v2");
  storage.setItem("hm51_pending_chat_operations_v3_gamer-1", "v3");
  storage.setItem("hm51_pending_chat_operations_v4_gamer-1", "v4");

  removeUnsafePendingQueues(storage, "gamer-1");

  assert.equal(storage.getItem("hm51_pending_chat_operations_gamer-1"), null);
  assert.equal(storage.getItem("hm51_pending_chat_operations_v2_gamer-1"), null);
  assert.equal(storage.getItem("hm51_pending_chat_operations_v3_gamer-1"), null);
  assert.equal(storage.getItem("hm51_pending_chat_operations_v4_gamer-1"), "v4");
});

test("only temporary transport and HTTP errors are retryable", () => {
  assert.equal(httpChatErrorKind(408), "transient");
  assert.equal(httpChatErrorKind(429), "transient");
  assert.equal(httpChatErrorKind(503), "transient");
  assert.equal(httpChatErrorKind(400), "permanent");
  assert.equal(httpChatErrorKind(401), "permanent");
  assert.equal(httpChatErrorKind(403), "permanent");
  assert.equal(isRetryableChatError(new ChatRequestError("offline", "transient")), true);
  assert.equal(isRetryableChatError(new ChatRequestError("denied", "permanent", 403)), false);
});

test("an unknown result is not retried automatically", () => {
  const error = new ChatRequestError("timeout after request", "unknown-result");
  assert.equal(chatErrorKind(error), "unknown-result");
  assert.equal(isRetryableChatError(error), false);
});
