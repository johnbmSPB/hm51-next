import test from "node:test";
import assert from "node:assert/strict";

const { buildTeamMessageRequest } = await import("../app/chat/teamMessagePayload.ts");

test("team replies follow Android and send only REPLY_TO metadata", () => {
  const requestBody = buildTeamMessageRequest("token", {
    clientId: "client-reply",
    teamId: "team-1",
    text: " Ответ ",
    quote: {
      messageId: "server-original",
      author: "Иванов Иван",
      text: "Исходное сообщение",
    },
  });

  assert.deepEqual(requestBody, {
    token: "token",
    teamId: "team-1",
    text: "Ответ",
    clientId: "client-reply",
    replyTo: "server-original",
  });
});
