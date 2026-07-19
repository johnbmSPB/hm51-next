import test from "node:test";
import assert from "node:assert/strict";

const {
  PENDING_CHAT_QUEUE_VERSION,
  removeBeforeAutomaticAttempt,
  retryAfterAutomaticFailure,
} = await import("../app/chat/chatPendingPolicy.ts");

test("pending send queue uses the safe v2 storage namespace", () => {
  assert.equal(PENDING_CHAT_QUEUE_VERSION, 2);
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
