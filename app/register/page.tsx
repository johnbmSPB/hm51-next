"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const roles = [
  "Игрок",
  "Вратарь",
  "Тренер",
  "Администратор",
];

function createEmailCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email: string) {
  return email.includes("@") && email.includes(".");
}

export default function RegisterPage() {
  const [role, setRole] = useState("Игрок");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const [generatedCode, setGeneratedCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const [message, setMessage] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const policyUntil = Number(sessionStorage.getItem("hm51_policy_until") || "0");

    if (policyUntil > Date.now()) {
      window.location.replace("/policy");
    }
  }, []);

  async function sendEmailCode() {
    try {
      setSendingCode(true);
      setMessage("");

      if (!isValidEmail(email)) {
        throw new Error("Введите корректную электронную почту");
      }

      const code = createEmailCode();

      const response = await fetch("/api/send-email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось отправить код");
      }

      setGeneratedCode(code);
      setEnteredCode("");
      setEmailConfirmed(false);
      setCodeSent(true);

      setMessage("Код отправлен на электронную почту");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка отправки кода");
    } finally {
      setSendingCode(false);
    }
  }

  function checkEmailCode() {
    setMessage("");

    if (!codeSent || !generatedCode) {
      setMessage("Сначала получите код на почту");
      return;
    }

    if (!enteredCode.trim()) {
      setMessage("Введите код из письма");
      return;
    }

    if (enteredCode.trim() !== generatedCode) {
      setEmailConfirmed(false);
      setMessage("Неверный код подтверждения");
      return;
    }

    setEmailConfirmed(true);
    setMessage("Почта подтверждена");
  }


  async function registerUser() {
    try {
      setRegistering(true);
      setMessage("");

      if (!login.trim()) {
        throw new Error("Введите логин");
      }

      if (!isValidEmail(email)) {
        throw new Error("Введите корректную электронную почту");
      }

      if (!password.trim()) {
        throw new Error("Введите пароль");
      }

      if (password !== passwordRepeat) {
        throw new Error("Пароли не совпадают");
      }

      if (!emailConfirmed) {
        throw new Error("Сначала подтвердите электронную почту");
      }

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
        throw new Error(json.error || json.message || "Не удалось зарегистрироваться");
      }

      const token =
        json.token ||
        json.new_token ||
        json?.raw?.token ||
        json?.raw?.new_token ||
        "";

      if (token) {
        localStorage.setItem("hm51_token", token);
        localStorage.setItem("auth_token", token);
      }

      localStorage.setItem("hm51_register_email", email);

      setMessage("Регистрация успешно завершена");

      sessionStorage.setItem(
        "hm51_policy_until",
        String(Date.now() + 30000)
      );

      window.location.replace("/policy");
      return;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка регистрации");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#07110c] px-6 py-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="mb-7">
          <p className="text-sm font-bold text-[#24d7b3]">ХМ 5.1</p>
          <h1 className="mt-2 text-3xl font-black">Регистрация</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Создайте аккаунт и подтвердите электронную почту.
          </p>
        </header>

        {message && (
          <section className="mb-5 rounded-2xl bg-[#2b322d] p-4 text-sm font-bold text-[#24d7b3]">
            {message}
          </section>
        )}

        <section className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/70">
              Роль
            </span>

            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-14 w-full rounded-2xl border border-white/20 bg-[#2b322d] px-4 text-base font-bold text-white outline-none focus:border-[#24d7b3]"
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/70">
              Логин
            </span>

            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="Введите логин"
              autoCapitalize="none"
              className="h-14 w-full rounded-2xl border border-white/20 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#24d7b3]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/70">
              Электронная почта
            </span>

            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailConfirmed(false);
                setCodeSent(false);
                setGeneratedCode("");
                setEnteredCode("");
              }}
              placeholder="mail@example.com"
              type="email"
              autoCapitalize="none"
              className="h-14 w-full rounded-2xl border border-white/20 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#24d7b3]"
            />
          </label>

          <button
            type="button"
            onClick={sendEmailCode}
            disabled={sendingCode}
            className="h-12 w-full rounded-[24px] bg-[#24d7b3] text-sm font-black text-black disabled:opacity-50"
          >
            {sendingCode ? "Отправляем..." : "Получить код на почту"}
          </button>

          {codeSent && (
            <div className="rounded-3xl bg-[#2b322d] p-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/70">
                  Код из письма
                </span>

                <input
                  value={enteredCode}
                  onChange={(event) => {
                    setEnteredCode(event.target.value);
                    setEmailConfirmed(false);
                  }}
                  placeholder="Введите код"
                  inputMode="numeric"
                  className="h-14 w-full rounded-2xl border border-white/20 bg-[#07110c] px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#24d7b3]"
                />
              </label>

              <button
                type="button"
                onClick={checkEmailCode}
                className={
                  emailConfirmed
                    ? "mt-4 h-12 w-full rounded-[24px] bg-[#24d7b3] text-sm font-black text-black"
                    : "mt-4 h-12 w-full rounded-[24px] bg-white/10 text-sm font-black text-white"
                }
              >
                {emailConfirmed ? "Почта подтверждена" : "Подтвердить почту"}
              </button>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/70">
              Пароль
            </span>

            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введите пароль"
              type="password"
              className="h-14 w-full rounded-2xl border border-white/20 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#24d7b3]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/70">
              Повторите пароль
            </span>

            <input
              value={passwordRepeat}
              onChange={(event) => setPasswordRepeat(event.target.value)}
              placeholder="Повторите пароль"
              type="password"
              className="h-14 w-full rounded-2xl border border-white/20 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#24d7b3]"
            />
          </label>

          <button
            onClick={registerUser}
            disabled={registering || !emailConfirmed}
            className="h-14 w-full rounded-[30px] bg-[#24d7b3] text-lg font-black text-black disabled:opacity-40"
          >
            {registering ? "Регистрируем..." : "Зарегистрироваться"}
          </button>

          <Link
            href="/login"
            className="flex h-14 w-full items-center justify-center rounded-[30px] bg-[#2b322d] text-base font-black text-white"
          >
            Уже есть аккаунт
          </Link>
        </section>
      </div>
    </main>
  );
}
