"use client";

import Link from "next/link";
import { useState } from "react";
import {
  clearRegistrationPending,
} from "../lib/registrationProgress";

export default function TeamCodePage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [debugAnswer, setDebugAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function bindTeam() {
    try {
      setMessage("");
      setDebugAnswer("");
      setIsLoading(true);

      const phoneDigits = phone.replace(/\D/g, "");
      const cleanCode = code.trim();

      if (!phoneDigits) {
        throw new Error("Введите номер телефона");
      }

      if (!cleanCode) {
        throw new Error("Введите код подтверждения");
      }

      const token =
        localStorage.getItem("hm51_token") ||
        localStorage.getItem("auth_token") ||
        "";

      if (!token) {
        throw new Error("Токен не найден. Нужно войти в приложение.");
      }

      const response = await fetch("/api/bind-team-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          tel: phoneDigits,
          code: cleanCode,
        }),
      });

      const json = await response.json();
      setDebugAnswer(JSON.stringify(json, null, 2));

      if (!response.ok || json.result === false) {
        console.log("BindByTelCode server answer:", json);
        throw new Error(json.text || "Не подходит проверочный код или номер телефона");
      }

      console.log("BindByTelCode server answer:", json);
      setMessage(json.text || "Игрок успешно подключён к команде");

      clearRegistrationPending();

      window.setTimeout(() => {
        window.location.href = "/home";
      }, 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка подключения к команде");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#07110c] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-md flex-col">
        <section className="pt-8 text-center">
          <h1 className="text-[28px] font-black leading-[36px]">
            Код подтверждения
          </h1>

          <p className="mt-4 text-[17px] font-semibold leading-7 text-white/55">
            Введите номер телефона и код, который выдал администратор вашей команды.
          </p>
        </section>

        <section className="mt-10 space-y-5">
          <input
            value={phone}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, "");
              setPhone(digitsOnly);
            }}
            placeholder="Телефон"
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24d7b3]"
          />

          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Код подтверждения"
            inputMode="numeric"
            className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24d7b3]"
          />
        </section>

        {message && (
          <section className="mt-5 rounded-3xl bg-[#2b322d] p-4 text-center text-sm font-bold text-[#24d7b3]">
            {message}
          </section>
        )}

        {debugAnswer && (
          <section className="mt-4 rounded-3xl bg-black/40 p-4 text-left text-xs font-bold text-white/80">
            <div className="mb-2 text-[#24d7b3]">Ответ сервера:</div>
            <pre className="whitespace-pre-wrap break-words">{debugAnswer}</pre>
          </section>
        )}

        <div className="flex-1" />

        <section className="space-y-4 pb-6">
          <button
            type="button"
            onClick={bindTeam}
            disabled={isLoading}
            className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black disabled:opacity-50"
          >
            {isLoading ? "Подключаем..." : "Подключиться к команде"}
          </button>

          <Link
            href="/connecting-team"
            className="flex h-[56px] w-full items-center justify-center rounded-[30px] bg-[#2b322d] text-base font-black text-white"
          >
            Назад
          </Link>
        </section>
      </div>
    </main>
  );
}
