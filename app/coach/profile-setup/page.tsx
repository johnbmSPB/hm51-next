"use client";

import { useEffect, useState } from "react";

const specializations = [
  "Главный тренер",
  "Помощник тренера",
  "Тренер вратарей",
  "Тренер по физической подготовке",
  "Дополнительный тренер",
];

type CoachPrefill = {
  family?: string;
  name?: string;
  midname?: string;
  birthday?: string;
  tel?: string;
  email?: string;
  login?: string;
};

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (!numbers) return "";

  let result = numbers[0];
  if (numbers.length >= 2) result += ` (${numbers.slice(1, 4)}`;
  if (numbers.length >= 4) result += ")";
  if (numbers.length >= 5) result += ` ${numbers.slice(4, 7)}`;
  if (numbers.length >= 8) result += `-${numbers.slice(7, 9)}`;
  if (numbers.length >= 10) result += `-${numbers.slice(9, 11)}`;

  return result;
}

function readRoles() {
  try {
    const stored = JSON.parse(localStorage.getItem("hm51_roles") || "[]");
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

function readPrefill(): CoachPrefill {
  try {
    return JSON.parse(localStorage.getItem("hm51_coach_prefill") || "{}");
  } catch {
    return {};
  }
}

export default function CoachProfileSetupPage() {
  const [surname, setSurname] = useState("");
  const [name, setName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [specialization, setSpecialization] = useState(specializations[0]);
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [fromPlayerProfile, setFromPlayerProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      "";

    if (!token) {
      window.location.replace("/login");
      return;
    }

    const source =
      new URLSearchParams(window.location.search).get("source") ||
      localStorage.getItem("hm51_coach_setup_source") ||
      "";

    const isFromPlayer = source.toLowerCase() === "player";
    const prefill = isFromPlayer ? readPrefill() : {};

    setFromPlayerProfile(isFromPlayer);
    setSurname(prefill.family || "");
    setName(prefill.name || "");
    setPatronymic(prefill.midname || "");
    setPhone(prefill.tel ? formatPhone(prefill.tel) : "");
    setBirthDate(prefill.birthday || "");
    setLogin(prefill.login || localStorage.getItem("hm51_login") || "");
    setEmail(
      prefill.email || localStorage.getItem("hm51_register_email") || ""
    );
  }, []);

  function returnToPlayerProfile() {
    localStorage.removeItem("hm51_coach_prefill");
    localStorage.removeItem("hm51_coach_setup_source");
    localStorage.setItem("hm51_active_role", "PLAYER");
    window.location.replace("/home");
  }

  async function saveProfile() {
    try {
      setMessage("");
      setIsLoading(true);

      const token =
        localStorage.getItem("hm51_token") ||
        localStorage.getItem("auth_token") ||
        "";

      const trimmedSurname = surname.trim();
      const trimmedName = name.trim();
      const trimmedPhone = phone.replace(/\D/g, "");
      const trimmedBirth = birthDate.trim();

      if (!token) throw new Error("Токен не найден. Войдите в приложение заново.");
      if (!trimmedSurname) throw new Error("Заполните поле: Фамилия");
      if (!trimmedName) throw new Error("Заполните поле: Имя");
      if (!trimmedPhone) throw new Error("Заполните поле: Телефон");
      if (!trimmedBirth) throw new Error("Заполните поле: Дата рождения");
      if (trimmedBirth < "1900-01-01" || trimmedBirth > today) {
        throw new Error("Введите корректную дату рождения");
      }
      if (!specialization) throw new Error("Выберите специализацию тренера");

      const response = await fetch("/api/coach/profile-reg-save", {
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
          tel: trimmedPhone,
          specialization,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось создать профиль тренера");
      }

      const serverRoles = Array.isArray(json.roles)
        ? json.roles.map(String)
        : [];
      const existingRoles = readRoles();
      const roles = Array.from(
        new Set([
          ...existingRoles,
          ...serverRoles,
          "COACH",
          ...(fromPlayerProfile ? ["PLAYER"] : []),
        ])
      );

      const fullName = [trimmedSurname, trimmedName, patronymic.trim()]
        .filter(Boolean)
        .join(" ");

      localStorage.setItem("hm51_roles", JSON.stringify(roles));
      localStorage.setItem("hm51_active_role", "COACH");
      localStorage.setItem("hm51_coach_specialization", specialization);
      localStorage.setItem("hm51_coach_name", fullName);
      localStorage.setItem(
        "hm51_coach_profile",
        JSON.stringify({
          family: trimmedSurname,
          name: trimmedName,
          midname: patronymic.trim(),
          birthday: trimmedBirth,
          tel: trimmedPhone,
          email,
          login,
          specialization,
        })
      );

      if (json.trainerId) {
        localStorage.setItem("hm51_trainer_id", String(json.trainerId));
      }

      localStorage.removeItem("hm51_register_role");
      localStorage.removeItem("hm51_coach_prefill");
      localStorage.removeItem("hm51_coach_setup_source");
      setMessage(json.message || "Профиль тренера создан");
      window.location.replace("/coach/profile");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения профиля");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#07110c] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-md flex-col">
        <header className="mb-7 pt-3">
          <p className="text-sm font-bold text-[#24d7b3]">ХМ 5.1 · Тренер</p>
          <h1 className="mt-2 text-3xl font-black">Профиль тренера</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">
            {fromPlayerProfile
              ? "Основные данные перенесены из профиля игрока. Проверьте их и выберите специализацию."
              : "Заполните основные данные. После сохранения учётная запись получит роль тренера."}
          </p>
        </header>

        {fromPlayerProfile && (
          <section className="mb-5 rounded-3xl border border-[#24d7b3]/25 bg-[#24d7b3]/10 p-4 text-sm leading-6 text-white/65">
            Профиль тренера будет добавлен к существующей учётной записи игрока. Логин и пароль останутся прежними.
          </section>
        )}

        {(login || email) && (
          <section className="mb-5 rounded-3xl border border-white/10 bg-[#121b16] p-4 text-sm text-white/60">
            {login && <p>Логин: <strong className="text-white">{login}</strong></p>}
            {email && <p className="mt-1">Email: <strong className="text-white">{email}</strong></p>}
          </section>
        )}

        <section className="space-y-5">
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

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/60">Дата рождения</span>
            <input
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              type="date"
              min="1900-01-01"
              max={today}
              className="hm-date-input block h-14 w-full min-w-0 rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none focus:border-[#24d7b3]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/60">Специализация</span>
            <select
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
              className="h-14 w-full rounded-2xl border border-white/15 bg-[#2b322d] px-4 text-base font-bold text-white outline-none focus:border-[#24d7b3]"
            >
              {specializations.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>

        {message && (
          <section className="mt-5 rounded-3xl bg-[#2b322d] p-4 text-center text-sm font-bold text-[#24d7b3]">
            {message}
          </section>
        )}

        <div className="flex-1" />

        <section className="mt-8 space-y-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={isLoading}
            className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black disabled:opacity-50"
          >
            {isLoading ? "Создаём профиль..." : "Сохранить профиль тренера"}
          </button>

          {fromPlayerProfile && (
            <button
              type="button"
              onClick={returnToPlayerProfile}
              disabled={isLoading}
              className="flex h-14 w-full items-center justify-center rounded-[30px] bg-[#2b322d] text-base font-black text-white disabled:opacity-50"
            >
              Вернуться в профиль игрока
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
