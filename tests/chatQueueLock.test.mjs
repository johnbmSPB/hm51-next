import test from "node:test";
import assert from "node:assert/strict";

const {
  releaseChatQueueLease,
  renewChatQueueLease,
  tryAcquireChatQueueLease,
} = await import("../app/chat/chatQueueLock.ts");

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("only one window can own an active chat queue lease", () => {
  const storage = new MemoryStorage();
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-a", 1000), true);
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-b", 1001), false);
  assert.equal(renewChatQueueLease(storage, "gamer-1", "window-b", 1002), false);
});

test("the owner releases the lease for the next window", () => {
  const storage = new MemoryStorage();
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-a", 1000), true);
  releaseChatQueueLease(storage, "gamer-1", "window-b");
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-b", 1001), false);
  releaseChatQueueLease(storage, "gamer-1", "window-a");
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-b", 1002), true);
});

test("an expired lease can be recovered after a crashed window", () => {
  const storage = new MemoryStorage();
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-a", 1000), true);
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-b", 31_001), true);
});

test("locks for different accounts do not block each other", () => {
  const storage = new MemoryStorage();
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-1", "window-a", 1000), true);
  assert.equal(tryAcquireChatQueueLease(storage, "gamer-2", "window-b", 1001), true);
});
