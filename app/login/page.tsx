"use client";

import {
  authenticateWithBiometric,
  canUseBiometric,
  getBiometricToken,
  isBiometricEnabled,
  saveBiometricToken,
} from "../lib/biometric";


import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function signIn() {
    try {
      setLoading(true);
      setMessage("");

      if (!login.trim()) {
        throw new Error("Введите логин");
      }

      if (!password.trim()) {
        throw new Error("Введите пароль");
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          login,
          username: login,
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
      localStorage.setItem("hm51_login", login);

      if (isBiometricEnabled()) {
        saveBiometricToken(token);
      }

      const gamerTeamId = extractGamerTeamId(json);

      if (gamerTeamId) {
        localStorage.setItem("hm51_gamer_team_id", gamerTeamId);
      }

      window.location.href = "/calendar";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setLoading(false);
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

  return (
    <main className="hm-phone-screen relative w-full overflow-y-auto overflow-x-hidden text-white">
      <TopStars />

      <div className="relative z-10 flex min-h-dvh w-full flex-col px-7 pb-5 pt-[205px]">
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

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-3 block text-[19px] font-normal text-white">
              Введите логин
            </span>

            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
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

        <div className="mt-auto">
          <div className="grid grid-cols-[1fr_104px] gap-3">
            <button
              onClick={signIn}
              disabled={loading}
              className="h-[62px] rounded-[20px] bg-[#24d7b3] text-[25px] font-black text-black shadow-[0_6px_0_rgba(0,0,0,0.25)] disabled:opacity-50"
            >
              {loading ? "..." : "Войти"}
            </button>

            <button
              type="button"
              onClick={() => setMessage("Вход через VK подключим позже")}
              className="flex h-[62px] items-center justify-center gap-3 rounded-[20px] bg-[#24d7b3] text-[25px] font-black text-black shadow-[0_6px_0_rgba(0,0,0,0.25)]"
            >
              VK
              <span className="text-[18px]">⌄</span>
            </button>
          </div>

          <Link
            href="/register"
            className="mt-5 flex h-[64px] w-full items-center justify-center rounded-[24px] bg-[#2b322d] text-[22px] font-black text-white"
          >
            Регистрация
          </Link>
        </div>
      </div>
    </main>
  );
}
