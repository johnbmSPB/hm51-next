"use client";

import {
  getAccountKeyByLogin,
  getScopedItem,
  removeScopedItem,
  setScopedItem,
} from "./accountStorage";

const FORCE_MANUAL_LOGIN_KEY = "hm51_force_manual_login";
const PROFILE_CACHE_KEY = "hm51_profile_cache_v1";
const PROFILE_CACHE_MAX_AGE_MS = 60_000;

export type PasswordlessSession = {
  enabled: boolean;
  token: string;
  login: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function getActiveSessionToken() {
  if (typeof window === "undefined") return "";

  return clean(
    localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("hm51_token") ||
      sessionStorage.getItem("auth_token") ||
      ""
  );
}

export function setActiveSession(token: string, login = "") {
  if (typeof window === "undefined") return;

  const normalizedToken = clean(token);
  const normalizedLogin = clean(login);

  if (!normalizedToken) return;

  localStorage.setItem("hm51_token", normalizedToken);
  localStorage.setItem("auth_token", normalizedToken);

  sessionStorage.setItem("hm51_token", normalizedToken);
  sessionStorage.setItem("auth_token", normalizedToken);

  if (normalizedLogin) {
    localStorage.setItem("hm51_login", normalizedLogin);
  }
}

export function readPasswordlessSession(login = ""): PasswordlessSession {
  if (typeof window === "undefined") {
    return {
      enabled: false,
      token: "",
      login: "",
    };
  }

  const requestedLogin =
    clean(login) ||
    clean(localStorage.getItem("hm51_login"));

  if (requestedLogin) {
    const accountKey = getAccountKeyByLogin(requestedLogin);

    const scopedEnabled =
      getScopedItem(
        "hm51_passwordless_enabled",
        accountKey
      ) === "true";

    const scopedToken =
      getScopedItem(
        "hm51_passwordless_token",
        accountKey
      ) || "";

    if (scopedEnabled && scopedToken) {
      return {
        enabled: true,
        token: scopedToken,
        login: requestedLogin,
      };
    }
  }

  const globalEnabled =
    localStorage.getItem(
      "hm51_passwordless_enabled_global"
    ) === "true";

  const globalLogin =
    clean(
      localStorage.getItem(
        "hm51_passwordless_login_global"
      )
    );

  const globalToken =
    clean(
      localStorage.getItem(
        "hm51_passwordless_token_global"
      )
    );

  const globalLoginMatches =
    !requestedLogin ||
    !globalLogin ||
    globalLogin === requestedLogin;

  if (
    globalEnabled &&
    globalToken &&
    globalLoginMatches
  ) {
    return {
      enabled: true,
      token: globalToken,
      login: requestedLogin || globalLogin,
    };
  }

  return {
    enabled: false,
    token: "",
    login: requestedLogin,
  };
}

export function restoreActiveSession(login = "") {
  if (typeof window === "undefined") return "";

  if (
    localStorage.getItem(
      FORCE_MANUAL_LOGIN_KEY
    ) === "1"
  ) {
    return "";
  }

  const activeToken = getActiveSessionToken();

  if (activeToken) {
    return activeToken;
  }

  const passwordless = readPasswordlessSession(login);

  if (!passwordless.enabled || !passwordless.token) {
    return "";
  }

  setActiveSession(
    passwordless.token,
    passwordless.login
  );

  return passwordless.token;
}

export function saveAuthenticatedSession(
  token: string,
  login: string
) {
  if (typeof window === "undefined") return;

  const normalizedToken = clean(token);
  const normalizedLogin = clean(login);

  if (!normalizedToken) return;

  setActiveSession(
    normalizedToken,
    normalizedLogin
  );

  if (normalizedLogin) {
    const accountKey =
      getAccountKeyByLogin(normalizedLogin);

    const scopedEnabled =
      getScopedItem(
        "hm51_passwordless_enabled",
        accountKey
      ) === "true";

    if (scopedEnabled) {
      setScopedItem(
        "hm51_passwordless_token",
        normalizedToken,
        accountKey
      );
    }
  }

  const globalEnabled =
    localStorage.getItem(
      "hm51_passwordless_enabled_global"
    ) === "true";

  const globalLogin =
    clean(
      localStorage.getItem(
        "hm51_passwordless_login_global"
      )
    );

  if (
    globalEnabled &&
    normalizedLogin &&
    (!globalLogin || globalLogin === normalizedLogin)
  ) {
    localStorage.setItem(
      "hm51_passwordless_login_global",
      normalizedLogin
    );

    localStorage.setItem(
      "hm51_passwordless_token_global",
      normalizedToken
    );
  }
}

export function clearProfileCache() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(PROFILE_CACHE_KEY);
}

export function clearActiveSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("hm51_token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("hm51_gamer_team_id");

  sessionStorage.removeItem("hm51_token");
  sessionStorage.removeItem("auth_token");

  clearProfileCache();
}

export function invalidateStoredSession(login = "") {
  if (typeof window === "undefined") return;

  const savedLogin =
    clean(login) ||
    clean(localStorage.getItem("hm51_login"));

  clearActiveSession();

  if (savedLogin) {
    const accountKey =
      getAccountKeyByLogin(savedLogin);

    // Режим входа сохраняем включённым,
    // но удаляем только недействительные токены.
    removeScopedItem(
      "hm51_passwordless_token",
      accountKey
    );

    removeScopedItem(
      "hm51_biometric_token",
      accountKey
    );
  }

  localStorage.removeItem(
    "hm51_passwordless_token_global"
  );
}

export function cacheProfileResponse(
  token: string,
  payload: any
) {
  if (typeof window === "undefined") return;

  const normalizedToken = clean(token);

  if (
    !normalizedToken ||
    !payload ||
    typeof payload !== "object"
  ) {
    return;
  }

  try {
    sessionStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({
        token: normalizedToken,
        savedAt: Date.now(),
        payload,
      })
    );
  } catch {
    // Кэш вспомогательный. Ошибка сохранения
    // не должна блокировать вход в приложение.
  }
}

export function readCachedProfileResponse(
  token: string,
  maxAgeMs = PROFILE_CACHE_MAX_AGE_MS
): any | null {
  if (typeof window === "undefined") return null;

  const normalizedToken = clean(token);

  if (!normalizedToken) return null;

  try {
    const raw =
      sessionStorage.getItem(PROFILE_CACHE_KEY);

    if (!raw) return null;

    const record = JSON.parse(raw);

    const cacheToken = clean(record?.token);
    const savedAt = Number(record?.savedAt) || 0;
    const payload = record?.payload;

    if (
      cacheToken !== normalizedToken ||
      !savedAt ||
      Date.now() - savedAt > maxAgeMs ||
      !payload ||
      typeof payload !== "object"
    ) {
      clearProfileCache();
      return null;
    }

    return payload;
  } catch {
    clearProfileCache();
    return null;
  }
}
