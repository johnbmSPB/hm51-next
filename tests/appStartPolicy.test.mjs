import assert from "node:assert/strict";
import test from "node:test";

import { resolvePasswordlessStartSession } from "../app/lib/appStartPolicy.ts";

test("PWA start rejects a disabled passwordless session even when a token remains", () => {
  assert.equal(
    resolvePasswordlessStartSession({
      enabled: false,
      token: "stale-active-token",
      login: "player@example.com",
    }),
    null
  );
});

test("PWA start rejects an enabled passwordless session without a token", () => {
  assert.equal(
    resolvePasswordlessStartSession({
      enabled: true,
      token: "",
      login: "player@example.com",
    }),
    null
  );
});

test("PWA start accepts only an explicitly enabled passwordless session", () => {
  assert.deepEqual(
    resolvePasswordlessStartSession({
      enabled: true,
      token: "  saved-token  ",
      login: "  player@example.com  ",
    }),
    {
      token: "saved-token",
      login: "player@example.com",
    }
  );
});
