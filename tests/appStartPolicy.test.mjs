import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAppStartDecision,
  resolveBiometricStartSession,
  resolvePasswordlessStartSession,
} from "../app/lib/appStartPolicy.ts";

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

test("biometric start requires enabled state, login and token", () => {
  assert.equal(
    resolveBiometricStartSession({
      enabled: false,
      token: "biometric-token",
      login: "player@example.com",
    }),
    null
  );

  assert.equal(
    resolveBiometricStartSession({
      enabled: true,
      token: "biometric-token",
      login: "",
    }),
    null
  );
});

test("biometric authentication has priority over passwordless startup", () => {
  assert.deepEqual(
    resolveAppStartDecision(
      {
        enabled: true,
        token: " biometric-token ",
        login: " player@example.com ",
      },
      {
        enabled: true,
        token: "passwordless-token",
        login: "player@example.com",
      }
    ),
    {
      mode: "biometric",
      token: "biometric-token",
      login: "player@example.com",
    }
  );
});

test("PWA falls back to passwordless only when biometric startup is unavailable", () => {
  assert.deepEqual(
    resolveAppStartDecision(
      {
        enabled: false,
        token: "",
        login: "player@example.com",
      },
      {
        enabled: true,
        token: "passwordless-token",
        login: "player@example.com",
      }
    ),
    {
      mode: "passwordless",
      token: "passwordless-token",
      login: "player@example.com",
    }
  );
});

test("PWA opens manual login when neither automatic method is available", () => {
  assert.deepEqual(
    resolveAppStartDecision(
      { enabled: false, token: "", login: "" },
      { enabled: false, token: "", login: "" }
    ),
    { mode: "login" }
  );
});
