"use client";

import Link from "next/link";
import { useState } from "react";

function MessageCard({
  title,
  buttonTitle = "Назад",
  onTap,
}: {
  title: string;
  buttonTitle?: string;
  onTap: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-[332px] rounded-[28px] border border-[#2d332f] bg-[#2d3333] px-5 py-6 text-center shadow-2xl">
        <p className="whitespace-pre-line text-[23px] font-bold leading-7 text-white">
          {title}
        </p>

        <button
          onClick={onTap}
          className="mt-7 h-11 w-full rounded-full bg-[#20d1a8] text-lg font-semibold text-black"
        >
          {buttonTitle}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRestoringPassword, setIsRestoringPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function loginUser() {
    try {
      setMessage("");

      const trimmedLogin = login.trim();
      const trimmedPassword = password.trim();

      if (!trimmedLogin) {
        setMessage("Введите логин");
        return;
      }

      if (!trimmedPassword) {
        setMessage("Введите пароль");
        return;
      }

      setIsLoggingIn(true);

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          login: trimmedLogin,
          username: trimmedLogin,
          password: trimmedPassword,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Неверный логин или пароль");
      }

      localStorage.setItem("hm51_token", json.new_token);
      localStorage.setItem("hm51_login", trimmedLogin);

      if (json.gamerTeamId) {
        localStorage.setItem("hm51_gamer_team_id", String(json.gamerTeamId));
      }

      window.location.href = "/calendar";
    } catch (error) {
      localStorage.removeItem("hm51_token");
      localStorage.removeItem("hm51_gamer_team_id");

      setMessage(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function forgotPassword() {
    try {
      setMessage("");

      const trimmedLogin = login.trim();

      if (!trimmedLogin) {
        setMessage("Введите логин");
        return;
      }

      setIsRestoringPassword(true);

      const response = await fetch("/api/restore-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          login: trimmedLogin,
          username: trimmedLogin,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Ошибка восстановления пароля");
      }

      setMessage(json.message || "Логин и пароль отправлены на почту");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка восстановления пароля");
    } finally {
      setIsRestoringPassword(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#121715] px-6 py-8 text-white">
      {message && (
        <MessageCard
          title={message}
          buttonTitle="Назад"
          onTap={() => setMessage("")}
        />
      )}

      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center">
        <section className="rounded-[32px] bg-[#2d332f] px-5 py-8 shadow-2xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold text-white/40">ХМ 5.1</p>
            <h1 className="mt-2 text-4xl font-black">Вход</h1>
            <p className="mt-3 text-sm leading-6 text-white/45">
              Войдите в профиль игрока, тренера или администратора команды.
            </p>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block px-[26px] text-base text-white">
                Введите логин
              </span>

              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="Логин"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-12 w-full rounded-[10px] border border-white/30 bg-white/10 px-[14px] text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#20d1a8]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block px-[26px] text-base text-white">
                Введите пароль
              </span>

              <div className="flex h-12 items-center rounded-[10px] border border-white/30 bg-white/10 focus-within:border-[#20d1a8]">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Пароль"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-full min-w-0 flex-1 bg-transparent px-[14px] text-base font-semibold text-white outline-none placeholder:text-white/30"
                />

                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="px-4 text-sm font-black text-[#20d1a8]"
                >
                  {isPasswordVisible ? "Скрыть" : "Показать"}
                </button>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={forgotPassword}
            disabled={isRestoringPassword}
            className="mt-4 w-full text-right text-sm font-semibold text-white/45 disabled:opacity-50"
          >
            {isRestoringPassword ? "Отправляем..." : "Забыли пароль?"}
          </button>

          <div className="mt-6 flex gap-2">
            <button
              onClick={loginUser}
              disabled={isLoggingIn}
              className="h-14 flex-[2] rounded-l-[30px] rounded-r-[10px] bg-[#20d1a8] text-[25px] font-semibold text-[#121715] disabled:opacity-50"
            >
              {isLoggingIn ? "..." : "Войти"}
            </button>

            <button
              type="button"
              onClick={() => setMessage("Вход через VK / ID подключим следующим шагом")}
              className="h-14 flex-1 rounded-l-[10px] rounded-r-[30px] bg-[#20d1a8] text-sm font-black text-[#121715]"
            >
              VK / ID
            </button>
          </div>

          <Link
            href="/register"
            className="mt-4 flex h-14 items-center justify-center rounded-[30px] bg-[#121715] text-xl font-semibold text-white"
          >
            Регистрация
          </Link>
        </section>
      </div>
    </main>
  );
}
