import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeRateLimit,
  matchRateLimitPolicy,
  resetRateLimitStoreForTests,
} from "../app/lib/rateLimitPolicy.ts";
import { parseServerRoles } from "../app/lib/serverRoles.ts";

test("rate limit allows requests up to the configured limit and blocks the next one", () => {
  resetRateLimitStoreForTests();
  const policy = { id: "test", limit: 2, windowMs: 60_000 };

  assert.equal(consumeRateLimit("test:ip", policy, 1_000).allowed, true);
  assert.equal(consumeRateLimit("test:ip", policy, 1_001).allowed, true);
  const blocked = consumeRateLimit("test:ip", policy, 1_002);

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});

test("rate limit resets after the window expires", () => {
  resetRateLimitStoreForTests();
  const policy = { id: "test", limit: 1, windowMs: 1_000 };

  assert.equal(consumeRateLimit("test:ip", policy, 1_000).allowed, true);
  assert.equal(consumeRateLimit("test:ip", policy, 1_500).allowed, false);
  assert.equal(consumeRateLimit("test:ip", policy, 2_001).allowed, true);
});

test("sensitive endpoints have explicit policies", () => {
  assert.equal(matchRateLimitPolicy("/api/login")?.id, "login");
  assert.equal(matchRateLimitPolicy("/api/chat/team-send")?.id, "chat-send");
  assert.equal(matchRateLimitPolicy("/api/coach/delete-profile")?.limit, 5);
  assert.equal(matchRateLimitPolicy("/api/me"), null);
});

test("server role parser recognizes player and coach role formats", () => {
  assert.deepEqual(
    parseServerRoles([
      { ROLE: "TRAINER_ROLE" },
      { role: "GAMER_ROLE" },
      { ROLE: "UNKNOWN" },
    ]),
    ["COACH", "PLAYER"]
  );

  assert.deepEqual(
    parseServerRoles({ roles: ["COACH", "PLAYER", "COACH"] }),
    ["COACH", "PLAYER"]
  );
});

test("server role parser does not grant coach access from unrelated data", () => {
  assert.deepEqual(parseServerRoles({ role: "COACH" }), []);
  assert.deepEqual(parseServerRoles({ roles: ["ADMIN", "USER"] }), []);
  assert.deepEqual(parseServerRoles(null), []);
});
