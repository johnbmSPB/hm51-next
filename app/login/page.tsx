"use client";

import { getAccountKeyByLogin, getScopedItem, setScopedItem } from "../lib/accountStorage";
import {
  authenticateWithBiometricByLogin,
  getBiometricTokenByLogin,
  isBiometricEnabled,
  isBiometricEnabledByLogin,
  saveBiometricToken,
} from "../lib/biometric";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type AppRole = "PLAYER" | "COACH";

const FORCE_MANUAL_LOGIN_KEY = "hm51_force_manual_login";

function isManualLoginRequired() {
  if (typeof window === "undefined") return false;

  return localStorage.getItem(FORCE_MANUAL_LOGIN_KEY) === "1";
}

function clearManualLoginRequirement() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(FORCE_MANUAL_LOGIN_KEY);
  sessionStorage.removeItem("hm51_passwordless_skip_until");
}

function valueToText(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function extractToken(json: any) {
  return (
    valueToText(json?.token) ||
    valueToText(json?.new_token) ||
    valueToText(json?.TOKEN) ||
    valueToText(json?.NEW_TOKEN) ||
    valueToText(json?.data?.token) ||
    valueToText(json?.data?.new_token)
  );
}

function extractGamerTeamId(json: any) {
  const direct = valueToText(json?.gamerTeamId || json?.gamer_team_id);
  if (direct) return direct;

  const gamerTeams =
    json?.GAMER_TEAMS ||
    json?.gamer_teams ||
    json?.profile?.GAMER_TEAMS ||
    json?.data?.GAMER_TEAMS ||
    [];

  if (Array.isArray(gamerTeams) && gamerTeams.length > 0) {
    const first = gamerTeams[0];

    return (
      valueToText(first?.ID) ||
      valueToText(first?.id) ||
      valueToText(first?.GAMER_TEAM_ID) ||
      valueToText(first?.gamer_team_id)
    );
  }

  return "";
}

function normalizeRoles(value: any): AppRole[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.flatMap((item) => {
        const role = String(item?.role || item?.ROLE || item || "").toUpperCase();
        if (role === "COACH" || role === "TRAINER_ROLE") return ["COACH" as const];
        if (role === "PLAYER" || role === "GAMER_ROLE") return ["PLAYER" as const];
        return [];
      })
    )
  );
}

function isCoachProfileDisabled() {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .some((item) => item === "hm51_coach_profile_disabled=1");
}

function filterAvailableRoles(roles: AppRole[]) {
  return isCoachProfileDisabled()
    ? roles.filter((role) => role !== "COACH")
    : roles;
}

function extractRoles(json: any): AppRole[] {
  const serverRoles = normalizeRoles(
    json?.roles ||
      json?.ROLES ||
      json?.data?.roles ||
      json?.data?.ROLES
  );

  if (serverRoles.length > 0) {
    return filterAvailableRoles(serverRoles);
  }

  try {
    return filterAvailableRoles(
      normalizeRoles(JSON.parse(localStorage.getItem("hm51_roles") || "[]"))
    );
  } catch {
    return [];
  }
}

function getStoredRoleRedirect() {
  const activeRole = localStorage.getItem("hm51_active_role");

  if (activeRole === "COACH" && !isCoachProfileDisabled()) {
    return "/coach";
  }

  return "/calendar";
}

function roleRedirect(role: AppRole) {
  return role === "COACH" ? "/coach" : "/calendar";
}

function getLastActiveRole(roles: AppRole[]): AppRole | null {
  const savedRole = localStorage.getItem("hm51_active_role");

  if (
    savedRole === "COACH" &&
    roles.includes("COACH") &&
    !isCoachProfileDisabled()
  ) {
    return "COACH";
  }

  if (savedRole === "PLAYER" && roles.includes("PLAYER")) {
    return "PLAYER";
  }

  return null;
}

function TopStars() {
  return (
    <div className="absolute right-7 top-[88px] z-10">
      <div className="relative h-[90px] w-[110px]">
        <Image
          src="/images/Image.png"
          alt="Звезда"
          width={78}
          height={78}
          className="absolute right-6 top-0 h-[78px] w-[78px] object-contain"
          priority
        />
        <Image
          src="/images/Image.png"
          alt="Звезда"
          width={28}
          height={28}
          className="absolute right-0 top-[48px] h-[28px] w-[28px] object-contain"
          priority
        />
      </div>
    </div>
  );
}

function getPasswordlessLoginData(login: string) {
  const accountLogin = login.trim() || localStorage.getItem("hm51_login") || "";
  const accountKey = getAccountKeyByLogin(accountLogin);

  const scopedEnabled = getScopedItem("hm51_passwordless_enabled", accountKey) === "true";
  const scopedToken = getScopedItem("hm51_passwordless_token", accountKey) || "";

  const globalEnabled = localStorage.getItem("hm51_passwordless_enabled_global") === "true";
  const globalLogin = localStorage.getItem("hm51_passwordless_login_global") || "";
  const globalToken = localStorage.getItem("hm51_passwordless_token_global") || "";

  if (scopedEnabled && scopedToken) {
    return { enabled: true, token: scopedToken, login: accountLogin };
  }

  if (globalEnabled && globalToken && (!globalLogin || globalLogin === accountLogin)) {
    return { enabled: true, token: globalToken, login: accountLogin || globalLogin };
  }

  return { enabled: false, token: "", login: accountLogin };
}

function RoleGlyph({ role }: { role: AppRole }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#24d7b3]/15 text-lg font-black text-[#24d7b3]">
      {role === "COACH" ? "Т" : "И"}
    </span>
  );
}

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSkipped, setBiometricSkipped] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const biometricOpeningRef = useRef(false);
  const biometricLastOpenAtRef = useRef(0);

  useEffect(() => {
    const savedLogin = localStorage.getItem("hm51_login") || "";
    const forceManualLogin = isManualLoginRequired();

    const skipUntil = Number(
      sessionStorage.getItem("hm51_passwordless_skip_until") || "0"
    );

    const skipAutoLogin =
      forceManualLogin || Date.now() < skipUntil;

    if (!skipAutoLogin) {
      sessionStorage.removeItem("hm51_passwordless_skip_until");
    }

    // Удаляем старый флаг от предыдущей версии приложения.
    localStorage.removeItem("hm51_passwordless_manual_logout");

    if (forceManualLogin) {
      setLogin(savedLogin);
      setBiometricEnabled(false);
      setBiometricSkipped(true);
      setMessage(
        "Автоматический вход временно отключён. Введите логин и пароль повторно."
      );
      return;
    }

    const passwordless = skipAutoLogin
      ? { enabled: false, token: "", login: savedLogin }
      : getPasswordlessLoginData(savedLogin);

    if (passwordless.enabled && passwordless.token) {
      localStorage.setItem("hm51_token", passwordless.token);
      localStorage.setItem("auth_token", passwordless.token);
      localStorage.setItem("hm51_login", passwordless.login || savedLogin);

      const storedRoles = extractRoles({});
      const lastActiveRole = getLastActiveRole(storedRoles);

      if (lastActiveRole) {
        localStorage.setItem("hm51_active_role", lastActiveRole);
        window.location.href = roleRedirect(lastActiveRole);
        return;
      }

      if (storedRoles.length >= 2) {
        setAvailableRoles(storedRoles);
        setProfileMenuOpen(true);
        setLogin(passwordless.login || savedLogin);
        return;
      }

      if (storedRoles.length === 1) {
        localStorage.setItem("hm51_active_role", storedRoles[0]);
        window.location.href = roleRedirect(storedRoles[0]);
        return;
      }

      window.location.href = getStoredRoleRedirect();
      return;
    }

    const enabled =
      Boolean(savedLogin) &&
      isBiometricEnabledByLogin(savedLogin) &&
      Boolean(getBiometricTokenByLogin(savedLogin));

    setLogin(savedLogin);
    setBiometricEnabled(enabled);
  }, []);

  function continueWithProfiles(roles: AppRole[], fallbackRedirect: string) {
    if (roles.length > 0) {
      localStorage.setItem("hm51_roles", JSON.stringify(roles));
    }

    const lastActiveRole = getLastActiveRole(roles);

    if (lastActiveRole) {
      localStorage.setItem("hm51_active_role", lastActiveRole);
      window.location.href = roleRedirect(lastActiveRole);
      return;
    }

    if (roles.length >= 2) {
      setAvailableRoles(roles);
      setProfileMenuOpen(true);
      return;
    }

    if (roles.length === 1) {
      localStorage.setItem("hm51_active_role", roles[0]);
      window.location.href = roleRedirect(roles[0]);
      return;
    }

    window.location.href = fallbackRedirect;
  }

  function selectProfile(role: AppRole) {
    if (!availableRoles.includes(role)) return;

    localStorage.setItem("hm51_active_role", role);
    setProfileMenuOpen(false);
    window.location.href = roleRedirect(role);
  }

  function resetProfileSelection() {
    setAvailableRoles([]);
    setProfileMenuOpen(false);
  }


  async function autoSignInWithBiometric(savedLogin: string) {
    if (!savedLogin) return;

    const token = getBiometricTokenByLogin(savedLogin);

    if (!token || !isBiometricEnabledByLogin(savedLogin)) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await authenticateWithBiometricByLogin(savedLogin);

      localStorage.removeItem("hm51_passwordless_manual_logout");
      localStorage.setItem("hm51_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("hm51_login", savedLogin);

      window.location.href = "/calendar";
    } catch {
      setLoading(false);
    }
  }

  async function signIn() {
    try {
      setLoading(true);
      setMessage("");
      resetProfileSelection();

      const normalizedLogin = login.trim();

      if (!normalizedLogin) {
        throw new Error("Введите логин");
      }

      if (!password.trim()) {
        if (isManualLoginRequired()) {
          throw new Error(
            "После ошибки входа необходимо ввести пароль повторно."
          );
        }

        const passwordless = getPasswordlessLoginData(normalizedLogin);

        if (passwordless.enabled && passwordless.token) {
          clearManualLoginRequirement();
          localStorage.removeItem("hm51_passwordless_manual_logout");

          localStorage.setItem("hm51_token", passwordless.token);
          localStorage.setItem("auth_token", passwordless.token);
          localStorage.setItem("hm51_login", passwordless.login || normalizedLogin);

          const storedRoles = extractRoles({});
          continueWithProfiles(storedRoles, getStoredRoleRedirect());
          return;
        }

        throw new Error("Введите пароль");
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          login: normalizedLogin,
          username: normalizedLogin,
          password,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Ошибка входа");
      }

      const token = extractToken(json);

      if (!token) {
        throw new Error("Сервер не вернул токен");
      }

      localStorage.setItem("hm51_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("hm51_login", normalizedLogin);
      localStorage.removeItem("hm51_passwordless_manual_logout");

      // Ручный вход успешно подтверждён.
      clearManualLoginRequirement();

      const accountKey = getAccountKeyByLogin(normalizedLogin);

      if (getScopedItem("hm51_passwordless_enabled", accountKey) === "true") {
        setScopedItem("hm51_passwordless_token", token, accountKey);
      }

      // Обновляем также резервный глобальный токен,
      // иначе при следующем запуске мог снова использоваться старый.
      const globalPasswordlessEnabled =
        localStorage.getItem("hm51_passwordless_enabled_global") === "true";

      const globalPasswordlessLogin =
        localStorage.getItem("hm51_passwordless_login_global") || "";

      if (
        globalPasswordlessEnabled &&
        (!globalPasswordlessLogin ||
          globalPasswordlessLogin === normalizedLogin)
      ) {
        localStorage.setItem(
          "hm51_passwordless_login_global",
          normalizedLogin
        );

        localStorage.setItem(
          "hm51_passwordless_token_global",
          token
        );
      }

      if (isBiometricEnabled(accountKey)) {
        saveBiometricToken(token, accountKey);
      }

      const gamerTeamId = extractGamerTeamId(json);

      if (gamerTeamId) {
        localStorage.setItem("hm51_gamer_team_id", gamerTeamId);
      } else {
        localStorage.removeItem("hm51_gamer_team_id");
      }

      const roles = extractRoles(json);
      const fallbackRedirect = valueToText(json?.redirect) || getStoredRoleRedirect();
      continueWithProfiles(roles, fallbackRedirect);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithBiometric() {
    const now = Date.now();

    if (biometricOpeningRef.current || biometricSkipped) return;
    if (now - biometricLastOpenAtRef.current < 5000) return;

    biometricLastOpenAtRef.current = now;

    try {
      biometricOpeningRef.current = true;
      setLoading(true);
      setMessage("");

      const accountLogin = login.trim() || localStorage.getItem("hm51_login") || "";
      const token = getBiometricTokenByLogin(accountLogin);

      if (!accountLogin || !token || !isBiometricEnabledByLogin(accountLogin)) {
        setBiometricEnabled(false);
        return;
      }

      await authenticateWithBiometricByLogin(accountLogin);

      localStorage.setItem("hm51_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("hm51_login", accountLogin);
      clearManualLoginRequirement();

      const storedRoles = extractRoles({});
      continueWithProfiles(storedRoles, getStoredRoleRedirect());
    } catch {
      setBiometricSkipped(true);
      setMessage("");
    } finally {
      biometricOpeningRef.current = false;
      setLoading(false);
    }
  }

  function handleLoginFocus() {
    const now = Date.now();

    if (biometricOpeningRef.current || biometricSkipped) return;
    if (now - biometricLastOpenAtRef.current < 5000) return;

    const accountLogin = login.trim() || localStorage.getItem("hm51_login") || "";

    if (
      biometricEnabled &&
      accountLogin &&
      getBiometricTokenByLogin(accountLogin) &&
      isBiometricEnabledByLogin(accountLogin)
    ) {
      signInWithBiometric();
    }
  }

  async function restorePassword() {
    try {
      setRestoring(true);
      setMessage("");

      if (!login.trim()) {
        throw new Error("Введите логин, потом нажмите «Забыли пароль?»");
      }

      const response = await fetch("/api/restore-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          login,
          username: login,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Не удалось восстановить пароль");
      }

      setMessage(json.message || "Инструкция по восстановлению отправлена на email");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка восстановления пароля");
    } finally {
      setRestoring(false);
    }
  }

  const canChooseProfile = availableRoles.length >= 2;

  return (
    <main className="hm-phone-screen relative w-full overflow-y-auto overflow-x-hidden text-white">
      <TopStars />

      <div className="relative z-10 flex min-h-dvh w-full flex-col px-7 pb-5 pt-[185px]">
        <h1 className="text-center text-[25px] font-normal leading-[1.08] tracking-[-1px] text-white">
          Добро пожаловать
          <br />
          на лёд!
        </h1>

        {message && (
          <div className="mt-6 rounded-2xl bg-red-500/15 p-4 text-sm font-bold text-red-200">
            {message}
          </div>
        )}

        {!biometricEnabled && (
          <>
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-3 block text-[19px] font-normal text-white">
                  Введите логин
                </span>

                <input
                  value={login}
                  onChange={(event) => {
                    setLogin(event.target.value);
                    resetProfileSelection();
                  }}
                  placeholder="Логин"
                  autoCapitalize="none"
                  className="h-[56px] w-full rounded-[13px] border border-white/25 bg-[#2b322d] px-5 text-[18px] font-bold text-white outline-none placeholder:text-white/20 focus:border-[#24d7b3]"
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-[19px] font-normal text-white">
                  Введите пароль
                </span>

                <div className="flex h-[56px] items-center rounded-[13px] border border-white/25 bg-[#2b322d] focus-within:border-[#24d7b3]">
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      resetProfileSelection();
                    }}
                    placeholder="Пароль"
                    type={showPassword ? "text" : "password"}
                    className="h-full min-w-0 flex-1 bg-transparent px-5 text-[18px] font-bold text-white outline-none placeholder:text-white/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-full w-[62px] items-center justify-center text-[#24d7b3]"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? "👁" : "◉"}
                  </button>
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={restorePassword}
              disabled={restoring}
              className="mt-5 text-left text-[19px] font-normal text-[#24d7b3] disabled:opacity-50"
            >
              {restoring ? "Отправляем..." : "Забыли пароль?"}
            </button>
          </>
        )}

        {biometricEnabled && (
          <div className="mt-7 rounded-[26px] bg-[#2b322d] p-5 text-center">
            <div className="text-5xl">◉</div>

            <p className="mt-3 text-xl font-black text-white">
              Вход по Face ID
            </p>

            <p className="mt-2 text-sm font-semibold leading-5 text-white/45">
              Нажмите кнопку ниже и подтвердите вход лицом.
            </p>
          </div>
        )}

        <div className="relative mt-7">
          {profileMenuOpen && canChooseProfile && (
            <section className="absolute bottom-[74px] right-0 z-40 w-[260px] rounded-[24px] border border-white/15 bg-[#202722] p-3 shadow-2xl">
              <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Выберите профиль
              </p>

              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => selectProfile(role)}
                    className="flex w-full items-center gap-3 rounded-[18px] bg-[#2b322d] p-3 text-left transition hover:bg-[#343d36]"
                  >
                    <RoleGlyph role={role} />
                    <span className="min-w-0">
                      <strong className="block text-base font-black text-white">
                        {role === "COACH" ? "Тренер" : "Игрок"}
                      </strong>
                      <small className="mt-0.5 block text-xs text-white/40">
                        {role === "COACH"
                          ? "Календарь и управление командами"
                          : "Команда, календарь и участие"}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-[1fr_104px] gap-3">
            <button
              onClick={biometricEnabled ? signInWithBiometric : signIn}
              disabled={loading}
              className="h-[62px] rounded-[20px] bg-[#24d7b3] text-[25px] font-black text-black shadow-[0_6px_0_rgba(0,0,0,0.25)] disabled:opacity-50"
            >
              {loading ? "..." : biometricEnabled ? "Войти по Face ID" : "Войти"}
            </button>

            <button
              type="button"
              onClick={() => setProfileMenuOpen((current) => !current)}
              disabled={!canChooseProfile || loading}
              aria-label="Выбрать профиль"
              aria-expanded={profileMenuOpen}
              className="flex h-[62px] items-center justify-center gap-2 rounded-[20px] bg-[#24d7b3] text-black shadow-[0_6px_0_rgba(0,0,0,0.25)] disabled:cursor-default disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-7 w-7 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 20c.8-4.2 3.3-6.3 7.5-6.3s6.7 2.1 7.5 6.3" />
              </svg>
              <span className={`text-[18px] transition ${profileMenuOpen ? "rotate-180" : ""}`}>
                ⌄
              </span>
            </button>
          </div>

          {biometricEnabled && (
            <button
              type="button"
              onClick={() => {
                setBiometricSkipped(true);
                setBiometricEnabled(false);
                setPassword("");
              }}
              className="mt-4 flex h-[52px] w-full items-center justify-center rounded-[20px] bg-[#2b322d] text-base font-black text-white/65"
            >
              Войти логином и паролем
            </button>
          )}

          {!biometricEnabled && (
            <Link
              href="/register"
              className="mt-5 flex h-[64px] w-full items-center justify-center rounded-[24px] bg-[#2b322d] text-[22px] font-black text-white"
            >
              Регистрация
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
