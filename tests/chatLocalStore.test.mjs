import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  #values = new Map();

  clear() {
    this.#values.clear();
  }

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  setItem(key, value) {
    this.#values.set(String(key), String(value));
  }
}

globalThis.localStorage = new MemoryStorage();

const {
  applyPush,
  loadMessages,
  parsePush,
  rememberOutgoing,
  rememberDeletedMessage,
  saveMessages,
  setChatAccountScope,
  sortChatMessages,
} = await import("../app/chat/chatLocalStore.ts");

function reset() {
  localStorage.clear();
  setChatAccountScope("gamer-test");
}

function message(overrides = {}) {
  return {
    clientId: "client-1",
    teamId: "team-1",
    author: "Вы",
    text: "Тест",
    time: "12:00",
    isMine: true,
    status: "sent",
    ...overrides,
  };
}

test("parsePush recognizes MESSAGE_ID and legacy MESS_ID separately", () => {
  reset();
  const push = parsePush({
    EVENT: "TEAM_CHAT",
    TEAM_ID: "team-1",
    MESSAGE_ID: "server-42",
    MESS_ID: "client-42",
    TEXT: "Привет",
  });

  assert.equal(push.messageId, "server-42");
  assert.equal(push.clientId, "client-42");
});

test("ISO time is preserved and messages are sorted chronologically", () => {
  reset();
  saveMessages("team-1", [
    message({
      clientId: "later",
      text: "Позже",
      time: "2026-07-19T12:10:00Z",
      createdAt: Date.parse("2026-07-19T12:10:00Z"),
    }),
    message({
      clientId: "earlier",
      text: "Раньше",
      time: "2026-07-19T12:05:00Z",
      createdAt: Date.parse("2026-07-19T12:05:00Z"),
    }),
  ]);

  const stored = loadMessages("team-1");
  assert.deepEqual(stored.map((item) => item.clientId), ["earlier", "later"]);
  assert.equal(stored[0].time, "2026-07-19T12:05:00Z");
});

test("incoming ISO timestamp is not truncated to a year prefix", () => {
  reset();
  const result = applyPush(
    parsePush({
      EVENT: "TEAM_CHAT",
      TEAM_ID: "team-1",
      MESSAGE_ID: "server-1",
      SENDER_ID: "other-gamer",
      TEXT: "Новое сообщение",
      MESSAGE_TIME: "2026-07-19T12:05:00Z",
    }),
    "gamer-test"
  );

  assert.equal(result, "applied");
  assert.equal(loadMessages("team-1")[0].time, "2026-07-19T12:05:00Z");
});

test("identical outgoing texts are reconciled by client id without swapping messages", () => {
  reset();
  const first = message({ clientId: "client-1", text: "Одинаково", status: "sending" });
  const second = message({ clientId: "client-2", text: "Одинаково", status: "sending" });
  saveMessages("team-1", [first, second]);
  rememberOutgoing("team-1", first.clientId, first.text);
  rememberOutgoing("team-1", second.clientId, second.text);

  applyPush(
    parsePush({
      EVENT: "TEAM_CHAT",
      TEAM_ID: "team-1",
      MESSAGE_ID: "server-2",
      CLIENT_ID: "client-2",
      SENDER_ID: "gamer-test",
      TEXT: "Одинаково",
    }),
    "gamer-test"
  );

  const stored = loadMessages("team-1");
  assert.equal(stored.find((item) => item.clientId === "client-1")?.messageId, undefined);
  assert.equal(stored.find((item) => item.clientId === "client-2")?.messageId, "server-2");
});

test("edit and delete push actions match both server and client identifiers", () => {
  reset();
  saveMessages("team-1", [
    message({ clientId: "client-a", messageId: "server-a", text: "A" }),
    message({ clientId: "client-b", messageId: "server-b", text: "B" }),
  ]);

  assert.equal(
    applyPush(
      parsePush({
        EVENT: "TEAM_CHAT_EDIT",
        TEAM_ID: "team-1",
        MESSAGE_ID: "server-a",
        NEW_TEXT: "A изменено",
      }),
      "gamer-test"
    ),
    "applied"
  );
  assert.equal(loadMessages("team-1")[0].text, "A изменено");

  assert.equal(
    applyPush(
      parsePush({
        EVENT: "TEAM_CHAT_DELETE",
        TEAM_ID: "team-1",
        MESS_ID: "client-b",
      }),
      "gamer-test"
    ),
    "applied"
  );
  assert.deepEqual(loadMessages("team-1").map((item) => item.clientId), ["client-a"]);
});

test("stable ordering keeps insertion order for equal timestamps", () => {
  const sorted = sortChatMessages([
    message({ clientId: "one", createdAt: 1000 }),
    message({ clientId: "two", createdAt: 1000 }),
  ]);
  assert.deepEqual(sorted.map((item) => item.clientId), ["one", "two"]);
});


test("the same idless push replayed by the 20 second poll is stored once", () => {
  reset();
  const payload = {
    EVENT: "TEAM_CHAT",
    TEAM_ID: "team-1",
    SENDER_ID: "other-gamer",
    TEXT: "Один push без идентификаторов",
    MESSAGE_TIME: "2026-07-19T12:15:00Z",
  };
  const push = parsePush(payload);

  assert.equal(applyPush(push, "gamer-test"), "applied");
  assert.equal(applyPush(push, "gamer-test"), "applied");

  const stored = loadMessages("team-1");
  assert.equal(stored.length, 1);
  assert.equal(stored[0].clientId, `push:${push.pushId}`);
});

test("parsePush recognizes normalized camelCase ids from IndexedDB records", () => {
  reset();
  const push = parsePush({
    eventName: "TEAM CHAT",
    teamId: "team-1",
    messageId: "server-camel",
    clientId: "client-camel",
    text: "Из очереди",
  });

  assert.equal(push.messageId, "server-camel");
  assert.equal(push.clientId, "client-camel");
});

test("a delayed original push cannot resurrect a locally deleted message", () => {
  reset();
  saveMessages("team-1", [
    message({ clientId: "client-deleted", messageId: "server-deleted", text: "Удалить" }),
  ]);
  rememberDeletedMessage("team-1", ["client-deleted", "server-deleted"]);
  saveMessages("team-1", []);

  const result = applyPush(
    parsePush({
      EVENT: "TEAM_CHAT",
      TEAM_ID: "team-1",
      MESSAGE_ID: "server-deleted",
      CLIENT_ID: "client-deleted",
      SENDER_ID: "gamer-test",
      TEXT: "Удалить",
    }),
    "gamer-test"
  );

  assert.equal(result, "ignored");
  assert.deepEqual(loadMessages("team-1"), []);
});

test("an incoming delete push creates a tombstone before a delayed original push", () => {
  reset();
  saveMessages("team-1", [
    message({ clientId: "client-remote-delete", messageId: "server-remote-delete" }),
  ]);

  assert.equal(
    applyPush(
      parsePush({
        EVENT: "TEAM_CHAT_DELETE",
        TEAM_ID: "team-1",
        MESSAGE_ID: "server-remote-delete",
      }),
      "gamer-test"
    ),
    "applied"
  );

  assert.equal(
    applyPush(
      parsePush({
        EVENT: "TEAM_CHAT",
        TEAM_ID: "team-1",
        MESSAGE_ID: "server-remote-delete",
        TEXT: "Тест",
      }),
      "gamer-test"
    ),
    "ignored"
  );
  assert.deepEqual(loadMessages("team-1"), []);
});

test("a delete push arriving before the message is handled once and blocks the later message", () => {
  reset();
  assert.equal(
    applyPush(
      parsePush({
        EVENT: "TEAM_CHAT_DELETE",
        TEAM_ID: "team-1",
        MESSAGE_ID: "server-delete-first",
      }),
      "gamer-test"
    ),
    "applied"
  );
  assert.equal(
    applyPush(
      parsePush({
        EVENT: "TEAM_CHAT",
        TEAM_ID: "team-1",
        MESSAGE_ID: "server-delete-first",
        TEXT: "Не должно появиться",
      }),
      "gamer-test"
    ),
    "ignored"
  );
  assert.deepEqual(loadMessages("team-1"), []);
});
