"use client";

import { useEffect, useState } from "react";

type AppRole = "PLAYER" | "COACH";

export default function RoleSelectPage() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      "";

    if (!token) {
      window.location.replace("/login");
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem("hm51_roles") || "[]");
      const normalized = Array.isArray(stored)
        ? stored.filter((item): item is AppRole => item === "PLAYER" || item === "COACH")
        : [];

      if (normalized.length === 1) {
        selectRole(normalized[0]);
        return;
      }

      setRoles(normalized);
      setReady(true);
    } catch {
      setRoles([]);
      setReady(true);
    }
  }, []);

  function selectRole(role: AppRole) {
    localStorage.setItem("hm51_active_role", role);
    window.location.replace(role === "COACH" ? "/coach" : "/calendar");
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#07110c] text-white/45">
        Загружаем роли…
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#07110c] px-6 py-8 text-white">
      <section className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#121b16] p-6 shadow-2xl">
        <p className="text-sm font-black text-[#24d7b3]">ХМ 5.1</p>
        <h1 className="mt-2 text-3xl font-black">Выберите роль</h1>
        <p className="mt-3 text-sm leading-6 text-white/45">
          У этой учётной записи несколько профилей. Выберите, в каком режиме открыть приложение.
        </p>

        <div className="mt-7 space-y-4">
          {roles.includes("PLAYER") && (
            <button
              type="button"
              onClick={() => selectRole("PLAYER")}
              className="flex min-h-20 w-full items-center justify-between rounded-3xl border border-white/10 bg-[#2b322d] px-5 text-left transition hover:border-[#24d7b3]/60"
            >
              <span>
                <strong className="block text-lg">Игрок</strong>
                <small className="mt-1 block text-white/40">Календарь, команда и участие в событиях</small>
              </span>
              <span className="text-2xl text-[#24d7b3]">›</span>
            </button>
          )}

          {roles.includes("COACH") && (
            <button
              type="button"
              onClick={() => selectRole("COACH")}
              className="flex min-h-20 w-full items-center justify-between rounded-3xl border border-[#24d7b3]/30 bg-[#24d7b3]/10 px-5 text-left transition hover:border-[#24d7b3]"
            >
              <span>
                <strong className="block text-lg">Тренер</strong>
                <small className="mt-1 block text-white/50">Команды, события и формирование состава</small>
              </span>
              <span className="text-2xl text-[#24d7b3]">›</span>
            </button>
          )}

          {roles.length === 0 && (
            <div className="rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-200">
              Сервер не вернул доступные роли. Выйдите и войдите заново.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.location.replace("/login")}
          className="mt-6 h-12 w-full rounded-3xl bg-white/5 text-sm font-bold text-white/70"
        >
          Вернуться ко входу
        </button>
      </section>
    </main>
  );
}
