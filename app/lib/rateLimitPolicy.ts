export type RateLimitPolicy = {
  id: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  "/api/login": { id: "login", limit: 20, windowMs: 15 * 60_000 },
  "/api/register": { id: "register", limit: 10, windowMs: 60 * 60_000 },
  "/api/send-email-code": { id: "email-code", limit: 8, windowMs: 15 * 60_000 },
  "/api/restore-password": { id: "restore-password", limit: 8, windowMs: 60 * 60_000 },
  "/api/change-email": { id: "change-email", limit: 10, windowMs: 60 * 60_000 },
  "/api/chat/team-send": { id: "chat-send", limit: 90, windowMs: 60_000 },
  "/api/join-team": { id: "join-team", limit: 15, windowMs: 60 * 60_000 },
  "/api/coach/access": { id: "coach-access", limit: 120, windowMs: 60_000 },
  "/api/coach/profile-save": { id: "coach-profile-save", limit: 30, windowMs: 60 * 60_000 },
  "/api/coach/delete-profile": { id: "coach-profile-delete", limit: 5, windowMs: 60 * 60_000 },
  "/api/webauthn/register/options": { id: "webauthn-register-options", limit: 10, windowMs: 60 * 60_000 },
  "/api/webauthn/register/verify": { id: "webauthn-register-verify", limit: 10, windowMs: 60 * 60_000 },
  "/api/webauthn/authenticate/options": { id: "webauthn-auth-options", limit: 30, windowMs: 15 * 60_000 },
  "/api/webauthn/authenticate/verify": { id: "webauthn-auth-verify", limit: 30, windowMs: 15 * 60_000 },
  "/api/webauthn/rebind": { id: "webauthn-rebind", limit: 10, windowMs: 60 * 60_000 },
  "/api/webauthn/disable": { id: "webauthn-disable", limit: 10, windowMs: 60 * 60_000 },
};

declare global {
  var __hm51RateLimitStore: Map<string, RateLimitEntry> | undefined;
  var __hm51RateLimitOperations: number | undefined;
}

const store = globalThis.__hm51RateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__hm51RateLimitStore = store;

function cleanupExpired(now: number) {
  globalThis.__hm51RateLimitOperations = (globalThis.__hm51RateLimitOperations ?? 0) + 1;
  if (globalThis.__hm51RateLimitOperations % 200 !== 0) return;

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) store.delete(key);
  }
}

export function matchRateLimitPolicy(pathname: string) {
  return RATE_LIMIT_POLICIES[pathname] ?? null;
}

export function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now()
): RateLimitResult {
  cleanupExpired(now);

  const current = store.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + policy.windowMs }
    : current;

  entry.count += 1;
  store.set(key, entry);

  return {
    allowed: entry.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function resetRateLimitStoreForTests() {
  store.clear();
  globalThis.__hm51RateLimitOperations = 0;
}
