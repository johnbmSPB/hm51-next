"use client";

import Link from "next/link";
import { useState } from "react";

const roles = ["Игрок", "Вратарь", "Тренер", "Администратор"];

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

export default function RegisterPage() {
  const [role, setRole] = useState("");
  const [isRoleOpen, setIsRoleOpen] = useState(false);

  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [isCodeFieldVisible, setIsCodeFieldVisible] = useState(false);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);

  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [message, setMessage] = useState("");

  const isEmailValid = email.includes("@") && email.includes(".");

  async function sendCode() {
    try {
      setMessage("");

      if (!isEmailValid) {
        setMessage("Введите корректный email");
        return;
      }

      setIsSendingCode(true);

      const response = await fetch("/api/send-email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ email }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Не удалось отправить код");
      }

      setIsCodeFieldVisible(true);
      setMessage(json.message || "Код отправлен на почту");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка отправки кода");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function checkCode() {
    try {
      setMessage("");

      if (!emailCode.trim()) {
        setMessage("Введите код из письма");
        return;
      }

      setIsCheckingCode(true);

      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          email,
          code: emailCode,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Неверный код подтверждения");
      }

      setIsEmailConfirmed(true);
      setMessage(json.message || "Email подтверждён");
    } catch (error) {
      setIsEmailConfirmed(false);
      setMessage(error instanceof Error ? error.message : "Ошибка проверки кода");
    } finally {
      setIsCheckingCode(false);
    }
  }

  async function registerUser() {
    try {
      setMessage("");

      if (!role) {
        setMessage("Выберите роль");
        return;
      }

      if (!login.trim()) {
        setMessage("Придумайте логин");
        return;
      }

      if (!email.trim()) {
        setMessage("Введите email");
        return;
      }

      if (!isEmailConfirmed) {
        setMessage("Подтвердите электронную почту");
        return;
      }

      if (!password.trim()) {
        setMessage("Придумайте пароль");
        return;
      }

      setIsRegistering(true);

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          role,
          login,
          username: login,
          email,
          password,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Ошибка регистрации");
      }

      setMessage("Регистрация выполнена. Теперь можно войти.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка регистрации");
    } finally {
      setIsRegistering(false);
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
            <h1 className="mt-2 text-4xl font-black">Регистрация</h1>
            <p className="mt-3 text-sm leading-6 text-white/45">
              Создайте профиль для работы с командой.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <span className="mb-2 block px-[26px] text-base text-white">
                Выберите роль
              </span>

              <button
                type="button"
                onClick={() => setIsRoleOpen(!isRoleOpen)}
                className="flex h-12 w-full items-center justify-between rounded-[10px] border border-white/30 bg-white/10 px-[14px] text-left text-base font-semibold text-white"
              >
                <span className={role ? "text-white" : "text-white/30"}>
                  {role || "Роль"}
                </span>

                <span className="text-white/60">
                  {isRoleOpen ? "▲" : "▼"}
                </span>
              </button>

              {isRoleOpen && (
                <div className="mt-2 overflow-hidden rounded-[10px] border border-white/30 bg-white/10">
                  {roles.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setRole(item);
                        setIsRoleOpen(false);
                      }}
                      className="block w-full px-[14px] py-3 text-left text-base font-semibold text-white hover:bg-white/10"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block px-[26px] text-base text-white">
                Придумайте логин
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

            <div>
              <span className="mb-2 block text-base text-white">
                Введите и подтвердите электронную почту
              </span>

              <div className="flex h-14 items-center rounded-[14px] bg-white/10 px-4">
                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setIsEmailConfirmed(false);
                  }}
                  placeholder="Example@mail.ru"
                  type="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/30"
                />

                <div
                  className={
                    isEmailConfirmed
                      ? "flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#20d1a8] text-sm font-black text-black"
                      : isEmailValid
                        ? "flex h-[26px] w-[26px] items-center justify-center rounded-md border border-gray-400 text-sm font-black text-gray-400"
                        : "flex h-[26px] w-[26px] items-center justify-center rounded-md border border-white/60 text-sm font-black text-white/40"
                  }
                >
                  ✓
                </div>
              </div>

              {isEmailValid && !isEmailConfirmed && (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={isSendingCode}
                  className="mt-2 h-11 w-full rounded-[14px] bg-white/10 text-[17px] font-semibold text-[#20d1a8] disabled:opacity-50"
                >
                  {isSendingCode ? "Отправляем..." : "Получить код"}
                </button>
              )}

              {isCodeFieldVisible && !isEmailConfirmed && (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-white/75">Код из письма</p>

                  <div className="flex h-14 items-center gap-3 rounded-[14px] bg-white/10 px-4">
                    <input
                      value={emailCode}
                      onChange={(event) => setEmailCode(event.target.value)}
                      placeholder="Введите код"
                      inputMode="numeric"
                      className="h-full min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/30"
                    />

                    <button
                      type="button"
                      onClick={checkCode}
                      disabled={isCheckingCode}
                      className="rounded-xl bg-[#20d1a8] px-3 py-2 text-sm font-black text-black disabled:opacity-50"
                    >
                      {isCheckingCode ? "..." : "ОК"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block px-[26px] text-base text-white">
                Придумайте пароль
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
            onClick={registerUser}
            disabled={isRegistering}
            className="mt-7 h-14 w-full rounded-[30px] bg-[#20d1a8] text-xl font-semibold text-[#121715] disabled:opacity-50"
          >
            {isRegistering ? "Регистрируем..." : "Зарегистрироваться"}
          </button>

          <Link
            href="/login"
            className="mt-4 flex h-14 items-center justify-center rounded-[30px] bg-[#121715] text-lg font-semibold text-white"
          >
            Уже есть аккаунт? Войти
          </Link>
        </section>
      </div>
    </main>
  );
}
