import test from "node:test";
import assert from "node:assert/strict";

const { deterministicChatPushId } = await import("../app/chat/chatPushIdentity.ts");

const base = {
  accountId: "gamer-1",
  teamId: "team-1",
  eventName: "TEAM CHAT EDIT",
  messageId: "server-1",
  clientId: "client-1",
  senderId: "gamer-1",
  body: "Новый текст",
  time: "2026-07-20T10:00:00Z",
  replyTo: "",
};

test("the same FCM event always receives the same queue id", () => {
  assert.equal(deterministicChatPushId(base), deterministicChatPushId({ ...base }));
});

test("different edits of one message receive different queue ids", () => {
  assert.notEqual(
    deterministicChatPushId(base),
    deterministicChatPushId({ ...base, body: "Ещё более новый текст" })
  );
});

test("queue identity is isolated by recipient account", () => {
  assert.notEqual(
    deterministicChatPushId(base),
    deterministicChatPushId({ ...base, accountId: "gamer-2" })
  );
});
