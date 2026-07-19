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
