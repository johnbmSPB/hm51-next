"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cleanupChatPushSubscriptions } from "../lib/chatTopicSubscriptions";
import {
  cacheProfileResponse,
  clearActiveSession,
  invalidateStoredSession,
  restoreActiveSession,
  setActiveSession,
} from "../lib/sessionManager";
import {
  getRegistrationContinuationPath,
  isRegistrationPending,
} from "../lib/registrationProgress";

const FORCE_MANUAL_LOGIN_KEY = "hm51_force_manual_login";

const PUBLIC_PATHS = [
  "/",
  "/app-start",
  "/login",
  "/register",
  "/privacy-policy",
  "/policy",
];

const TOKEN_ONLY_PATHS = [
  "/profile-setup",
  "/coach/profile-setup",
  "/team-code",
  "/connecting-team",
];

type GuardStatus =
  | "checking"
  | "allowed"
  | "missing"
  | "invalid"
  | "offline";

type GuardState = {
  path: string;
  status: GuardStatus;
  message: string;
};

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") {
    return pathname || "/";
  }

  return pathname.replace(/\/+$/, "");
}

function isPublicPath(pathname: string) {
  const normalized = normalizePath(pathname);

  if (PUBLIC_PATHS.includes(normalized)) {
    return true;
  }

  return (
    normalized.startsWith("/api") ||
    normalized.startsWith("/_next") ||
    normalized.startsWith("/images") ||
    normalized.startsWith("/icons")
  );
}

function isTokenOnlyPath(pathname: string) {
  return TOKEN_ONLY_PATHS.includes(normalizePath(pathname));
}

function getStoredToken() {
  const token = restoreActiveSession();

  if (token) {
    setActiveSession(
      token,
      localStorage.getItem("hm51_login") || ""
    );

    return token;
  }

  if (localStorage.getItem(FORCE_MANUAL_LOGIN_KEY) === "1") {
    return "";
  }

  const fallbackToken =
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    "";

  if (fallbackToken) {
    setActiveSession(
      fallbackToken,
      localStorage.getItem("hm51_login") || ""
    );
  }

  return fallbackToken;
}

function clearStoredTokens() {
  clearActiveSession();
}

function requireManualLogin(invalidatePersistentToken = false) {
  if (typeof window === "undefined") return;

  localStorage.setItem(FORCE_MANUAL_LOGIN_KEY, "1");
  sessionStorage.setItem(
    "hm51_passwordless_skip_until",
    String(Date.now() + 24 * 60 * 60 * 1000)
  );

  if (invalidatePersistentToken) {
    invalidateStoredSession();
  } else {
    clearActiveSession();
  }
}

function LoadingScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#121715] px-6 text-white">
      <section className="w-full max-w-sm rounded-[30px] bg-[#2d332f] p-6 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#20d1a8]" />
        <p className="mt-5 text-xl font-black">Проверяем вход</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/50">
          Загружаем данные пользователя...
        </p>
      </section>
    </main>
  );
}

function AccessErrorScreen({
  title,
  message,
  canRetry,
  onRetry,
  onLogin,
}: {
  title: string;
  message: string;
  canRetry: boolean;
  onRetry: () => void;
  onLogin: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#121715] px-6 text-white">
      <section className="w-full max-w-sm rounded-[30px] bg-[#2d332f] p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/15 text-3xl">!</div>
        <h1 className="mt-5 text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/60">{message}</p>
        <div className="mt-6 space-y-3">
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-14 w-full rounded-[28px] bg-[#20d1a8] text-base font-black text-[#121715]"
            >
              Повторить
            </button>
          )}
          <button
            type="button"
            onClick={onLogin}
            className="h-14 w-full rounded-[28px] bg-[#121715] text-base font-black text-white"
          >
            Войти повторно
          </button>
        </div>
      </section>
    </main>
  );
}

export async function clearPasswordlessLogin(tokenOverride = "") {
  if (typeof window === "undefined") return;

  const token =
    tokenOverride ||
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("hm51_token") ||
    sessionStorage.getItem("auth_token") ||
    "";

  if (token) {
    await cleanupChatPushSubscriptions(token);
  }

  // Явный выход из профиля должен всегда требовать следующий ручной вход,
  // даже если настройка «Вход без пароля» остаётся включённой.
  localStorage.setItem(FORCE_MANUAL_LOGIN_KEY, "1");
  sessionStorage.setItem(
    "hm51_passwordless_skip_until",
    String(Date.now() + 24 * 60 * 60 * 1000)
  );

  clearStoredTokens();
}

export default function AuthTokenGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const [attempt, setAttempt] = useState(0);
  const [guardState, setGuardState] = useState<GuardState>({
    path: "",
    status: "checking",
    message: "",
  });

  useEffect(() => {
    if (!pathname || isPublicPath(pathname)) {
      setGuardState({ path: pathname, status: "allowed", message: "" });
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function checkAccess() {
      setGuardState({ path: pathname, status: "checking", message: "" });

      if (isRegistrationPending() && !isTokenOnlyPath(pathname)) {
        window.location.replace(getRegistrationContinuationPath());
        return;
      }

      const token = getStoredToken();

      if (!token) {
        if (active) {
          setGuardState({
            path: pathname,
            status: "missing",
            message: "Сессия не найдена. Войдите в приложение повторно.",
          });
        }
        return;
      }

      if (isTokenOnlyPath(pathname)) {
        if (active) {
          setGuardState({ path: pathname, status: "allowed", message: "" });
        }
        return;
      }

      try {
        const response = await fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json;charset=UTF-8" },
          body: JSON.stringify({ token }),
          cache: "no-store",
          signal: controller.signal,
        });

        let json: any = {};
        try {
          json = await response.json();
        } catch {
          json = {};
        }

        if (response.ok && json?.result !== false) {
          cacheProfileResponse(token, json);
          if (active) {
            setGuardState({ path: pathname, status: "allowed", message: "" });
          }
          return;
        }

        if ([401, 403].includes(response.status)) {
          requireManualLogin(true);
          if (active) {
            setGuardState({
              path: pathname,
              status: "invalid",
              message: "Сессия завершена или токен недействителен. Войдите повторно.",
            });
          }
          return;
        }

        if (active) {
          setGuardState({
            path: pathname,
            status: "offline",
            message:
              json?.error ||
              "Не удалось загрузить профиль. Проверьте подключение к интернету. Если интернет работает, войдите повторно.",
          });
        }
      } catch {
        if (controller.signal.aborted) return;
        if (active) {
          setGuardState({
            path: pathname,
            status: "offline",
            message: "Нет связи с сервером. Проверьте подключение к интернету и повторите попытку.",
          });
        }
      }
    }

    void checkAccess();

    return () => {
      active = false;
      controller.abort();
    };
  }, [pathname, attempt]);

  if (!pathname || isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (guardState.path !== pathname || guardState.status === "checking") {
    return <LoadingScreen />;
  }

  if (guardState.status === "allowed") {
    return <>{children}</>;
  }

  const title =
    guardState.status === "offline"
      ? "Не удалось загрузить приложение"
      : "Нужно войти повторно";

  return (
    <AccessErrorScreen
      title={title}
      message={guardState.message}
      canRetry={guardState.status === "offline"}
      onRetry={() => setAttempt((value) => value + 1)}
      onLogin={() => {
        requireManualLogin();
        window.location.replace("/login");
      }}
    />
  );
}
