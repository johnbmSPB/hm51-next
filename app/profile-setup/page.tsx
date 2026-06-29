"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (!numbers) return "";

  let result = numbers[0];

  if (numbers.length >= 2) {
    result += " (";
    result += numbers.slice(1, 4);
  }

  if (numbers.length >= 4) {
    result += ")";
  }

  if (numbers.length >= 5) {
    result += " ";
    result += numbers.slice(4, 7);
  }

  if (numbers.length >= 8) {
    result += "-";
    result += numbers.slice(7, 9);
  }

  if (numbers.length >= 10) {
    result += "-";
    result += numbers.slice(9, 11);
  }

  return result;
}

export default function ProfileSetupPage() {
  const [surname, setSurname] = useState("");
  const [name, setName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("hm51_register_email") || "";
    setEmail(savedEmail);
  }, []);

  async function saveProfile() {
    try {
      setMessage("");
      setIsLoading(true);

      const trimmedSurname = surname.trim();
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      const trimmedBirth = birthDate.trim();

      if (!trimmedSurname) {
        throw new Error("Заполните поле: Фамилия");
      }

      if (!trimmedName) {
        throw new Error("Заполните поле: Имя");
      }

      if (!trimmedPhone) {
        throw new Error("Заполните поле: Телефон");
      }

      if (!trimmedBirth) {
        throw new Error("Заполните поле: Дата рождения");
      }

      const token =
        localStorage.getItem("hm51_token") ||
        localStorage.getItem("auth_token") ||
        "";

      if (!token) {
        throw new Error("Токен не найден. Нужно войти в приложение.");
      }

      if (!email) {
        throw new Error("Email не найден. Нужно пройти регистрацию заново.");
      }

      const response = await fetch("/api/profile-reg-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          family: trimmedSurname,
          name: trimmedName,
          midname: patronymic.trim(),
          birthday: trimmedBirth,
          tel: phone.replace(/\D/g, ""),
          email,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось сохранить профиль");
      }

      window.location.href = "/home";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения профиля");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#07110c] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-md flex-col">
        <section className="space-y-5 pt-8">
          <input
            value={surname}
            onChange={(event) => setSurname(event.target.value)}
            placeholder="Фамилия"
            className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24d7b3]"
          />

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Имя"
            className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24d7b3]"
          />

          <input
            value={patronymic}
            onChange={(event) => setPatronymic(event.target.value)}
            placeholder="Отчество"
            className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24d7b3]"
          />

          <input
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            placeholder="Телефон"
            inputMode="tel"
            className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24d7b3]"
          />

          <input
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            placeholder="Дата рождения"
            className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24d7b3]"
          />
        </section>

        {message && (
          <section className="mt-5 rounded-3xl bg-[#2b322d] p-4 text-center text-sm font-bold text-[#24d7b3]">
            {message}
          </section>
        )}

        <div className="flex-1" />

        <section className="space-y-4 pb-6">
          <button
            type="button"
            onClick={saveProfile}
            disabled={isLoading}
            className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black disabled:opacity-50"
          >
            {isLoading ? "Сохраняем..." : "Сохранить"}
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
