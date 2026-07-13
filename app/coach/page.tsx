"use client";

import { useEffect, useState } from "react";

type CoachCard = {
  title: string;
  text: string;
  status: string;
};

const cards: CoachCard[] = [
  {
    title: "Команды",
    text: "Подключение к командам и переключение между тренерскими составами.",
    status: "Следующий этап",
  },
  {
    title: "Календарь",
    text: "Игры, тренировки, участники и управление посещаемостью.",
    status: "Следующий этап",
  },
  {
    title: "Состав",
    text: "Формирование звеньев, вратарей и публикация состава на событие.",
    status: "Следующий этап",
  },
];

export default function CoachPage() {
  const [ready, setReady] = useState(false);
  const [login, setLogin] = useState("");
  const [coachName, setCoachName] = useState("");
  const [specialization, setSpecialization] = useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      "";

    const storedRoles = localStorage.getItem("hm51_roles") || "[]";
    let roles: string[] = [];

    try {
      roles = JSON.parse(storedRoles);
    } catch {
      roles = [];
    }

    const activeRole = localStorage.getItem("hm51_active_role") || "";

    if (!token) {
      window.location.replace("/login");
      return;
    }

    if (!roles.includes("COACH") && activeRole !== "COACH") {
      window.location.replace("/login");
      return;
    }

    localStorage.setItem("hm51_active_role", "COACH");
    setLogin(localStorage.getItem("hm51_login") || "Тренер");
    setCoachName(localStorage.getItem("hm51_coach_name") || "");
    setSpecialization(localStorage.getItem("hm51_coach_specialization") || "Тренер");
    setReady(true);
  }, []);

  function logout() {
    localStorage.removeItem("hm51_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hm51_active_role");
    localStorage.removeItem("hm51_roles");
    localStorage.removeItem("hm51_gamer_team_id");
    window.location.replace("/login");
  }

  function switchRole() {
    window.location.href = "/role-select";
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#07110c] text-white/45">
        Проверяем доступ тренера…
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#07110c] text-white">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#24d7b3]">
              XM 5.1 · Модуль тренера
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              {coachName || login}
            </h1>
            <p className="mt-2 text-sm text-white/45">{specialization}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={switchRole}
              className="h-11 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white"
            >
              Сменить роль
            </button>
            <button
              type="button"
              onClick={logout}
              className="h-11 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 text-sm font-bold text-red-200"
            >
              Выйти
            </button>
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-[30px] border border-[#24d7b3]/20 bg-gradient-to-br from-[#18352c] to-[#111915] p-6 md:p-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-[#24d7b3]/15 px-3 py-1 text-xs font-black text-[#24d7b3]">
              Регистрация и вход подключены
            </span>
            <h2 className="mt-5 text-2xl font-black md:text-3xl">
              Учётная запись тренера работает
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              Веб-версия создаёт общую учётную запись XM 5.1, регистрирует профиль через раздел trainers и определяет роль после входа по данным сервера.
            </p>
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-[26px] border border-white/10 bg-[#121b16] p-5"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#24d7b3]/15 font-black text-[#24d7b3]">
                {card.title.slice(0, 1)}
              </div>
              <h3 className="mt-5 text-xl font-black">{card.title}</h3>
              <p className="mt-2 min-h-16 text-sm leading-6 text-white/45">{card.text}</p>
              <span className="mt-5 inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/40">
                {card.status}
              </span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
