import test from "node:test";
import assert from "node:assert/strict";

const {
  cancelEditsBeforeDelete,
  removeOperationIfRevision,
  updateQueuedSendText,
  upsertVersionedOperation,
} = await import("../app/chat/chatPendingQueueState.ts");

function operation(overrides = {}) {
  return {
    id: "edit:team-1:message-1",
    kind: "edit",
    teamId: "team-1",
    messageId: "message-1",
    createdAt: 100,
    revision: "revision-1",
    ...overrides,
  };
}

test("a newer edit replaces the queued text but preserves queue position", () => {
  const first = operation({ text: "Первый текст" });
  const second = operation({
    text: "Последний текст",
    createdAt: 200,
    revision: "revision-2",
  });

  const next = upsertVersionedOperation([first], second);

  assert.equal(next.length, 1);
  assert.equal(next[0].text, "Последний текст");
  assert.equal(next[0].revision, "revision-2");
  assert.equal(next[0].createdAt, 100);
});

test("completion of an old edit cannot remove a newer revision", () => {
  const newer = operation({ revision: "revision-new" });
  const staleResult = removeOperationIfRevision(
    [newer],
    newer.id,
    "revision-old"
  );

  assert.equal(staleResult.removed, false);
  assert.equal(staleResult.operations.length, 1);

  const currentResult = removeOperationIfRevision(
    staleResult.operations,
    newer.id,
    "revision-new"
  );
  assert.equal(currentResult.removed, true);
  assert.equal(currentResult.operations.length, 0);
});

test("delete cancels every queued edit for the same message only", () => {
  const sameMessageEdit = operation();
  const otherMessageEdit = operation({
    id: "edit:team-1:message-2",
    messageId: "message-2",
  });
  const sameMessageSend = operation({
    id: "send:client-1",
    kind: "send",
  });

  const next = cancelEditsBeforeDelete(
    [sameMessageEdit, otherMessageEdit, sameMessageSend],
    "team-1",
    "message-1"
  );

  assert.deepEqual(
    next.map((item) => item.id),
    ["edit:team-1:message-2", "send:client-1"]
  );
});

test("editing an offline message updates its queued send in place", () => {
  const queued = operation({
    id: "send:client-1",
    kind: "send",
    clientId: "client-1",
    messageId: "",
    text: "Старый текст",
  });
  const result = updateQueuedSendText(
    [queued],
    "client-1",
    "Новый текст",
    "revision-2"
  );

  assert.equal(result.updated, true);
  assert.equal(result.operations.length, 1);
  assert.equal(result.operations[0].text, "Новый текст");
  assert.equal(result.operations[0].revision, "revision-2");
});
