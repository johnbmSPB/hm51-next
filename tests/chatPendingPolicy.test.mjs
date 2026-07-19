import test from "node:test";
import assert from "node:assert/strict";

const {
  PENDING_CHAT_QUEUE_VERSION,
  claimAutomaticSendAttempt,
  removeBeforeAutomaticAttempt,
  removeUnsafePendingQueues,
  retryAfterAutomaticFailure,
} = await import("../app/chat/chatPendingPolicy.ts");

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

test("pending send queue uses the safe v3 storage namespace", () => {
  assert.equal(PENDING_CHAT_QUEUE_VERSION, 3);
});

test("automatic send is removed before its single network attempt", () => {
  assert.equal(removeBeforeAutomaticAttempt("send"), true);
  assert.equal(removeBeforeAutomaticAttempt("edit"), false);
  assert.equal(removeBeforeAutomaticAttempt("delete"), false);
});

test("failed automatic sends require manual retry", () => {
  assert.equal(retryAfterAutomaticFailure("send"), false);
  assert.equal(retryAfterAutomaticFailure("edit"), true);
  assert.equal(retryAfterAutomaticFailure("delete"), true);
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

  removeUnsafePendingQueues(storage, "gamer-1");

  assert.equal(storage.getItem("hm51_pending_chat_operations_gamer-1"), null);
  assert.equal(storage.getItem("hm51_pending_chat_operations_v2_gamer-1"), null);
  assert.equal(storage.getItem("hm51_pending_chat_operations_v3_gamer-1"), "v3");
});
