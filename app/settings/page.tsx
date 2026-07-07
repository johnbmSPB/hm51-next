"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function getPasswordlessEnabled() {
  if (typeof window === "undefined") return false;

  const localValue = localStorage.getItem("hm51_passwordless_enabled");
  const cookieValue = document.cookie
    .split("; ")
    .find((item) => item.startsWith("hm51_passwordless_enabled="))
    ?.split("=")[1];

  return localValue === "true" || cookieValue === "true";
}

function savePasswordlessEnabled(value: boolean) {
  const stringValue = String(value);

  localStorage.setItem("hm51_passwordless_enabled", stringValue);
  sessionStorage.setItem("hm51_passwordless_enabled", stringValue);

  document.cookie =
    `hm51_passwordless_enabled=${stringValue}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function SettingsPage() {
  const [passwordlessEnabled, setPasswordlessEnabled] = useState(false);

  useEffect(() => {
    const saved = getPasswordlessEnabled();

    setPasswordlessEnabled(saved);

    if (saved) {
      savePasswordlessEnabled(true);
    }
  }, []);

  function togglePasswordless() {
    const nextValue = !passwordlessEnabled;

    setPasswordlessEnabled(nextValue);
    savePasswordlessEnabled(nextValue);
  }

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">ХМ 5.1</p>
            <h1 className="text-3xl font-black">Настройки</h1>
          </div>

          <Link
            href="/menu"
            className="rounded-2xl bg-[#20d1a8] px-4 py-3 text-xs font-black text-[#121715]"
          >
            Назад
          </Link>
        </header>

        <section className="mt-6 rounded-[32px] bg-[#2d332f] p-5">
          <button
            type="button"
            onClick={togglePasswordless}
            className="flex w-full items-center justify-between gap-4 rounded-3xl bg-[#121715] p-4 text-left"
          >
            <div className="pr-4">
              <p className="text-lg font-black text-white">
                Вход без пароля
              </p>

              <p className="mt-2 text-sm font-semibold leading-5 text-white/45">
                Если включено, приложение будет открываться без ввода логина и пароля,
                пока сохранён ваш вход.
              </p>
            </div>

            <div
              className={
                passwordlessEnabled
                  ? "flex h-8 min-w-14 items-center justify-end rounded-full bg-[#20d1a8] p-1"
                  : "flex h-8 min-w-14 items-center justify-start rounded-full bg-white/15 p-1"
              }
            >
              <div className="h-6 w-6 rounded-full bg-white shadow-lg" />
            </div>
          </button>

          <p
            className={
              passwordlessEnabled
                ? "mt-4 rounded-2xl bg-[#20d1a8]/10 p-3 text-sm font-bold text-[#20d1a8]"
                : "mt-4 rounded-2xl bg-white/5 p-3 text-sm font-bold text-white/45"
            }
          >
            {passwordlessEnabled
              ? "Вход без пароля включён"
              : "Вход без пароля выключен"}
          </p>
        </section>

        <nav className="fixed bottom-5 left-1/2 grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl">
          <Link href="/calendar" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Календарь</Link>
          <Link href="/home" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Профиль</Link>
          <Link href="/find-team" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Найти</Link>
          <Link href="/chat" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Чат</Link>
          <Link href="/menu" className="rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]">Меню</Link>
        </nav>
      </div>
    </main>
  );
}
