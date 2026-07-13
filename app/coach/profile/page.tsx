"use client";

import { useEffect, useState } from "react";
import CoachBottomNav from "../components/CoachBottomNav";

type CoachProfile = {
  family?: string;
  name?: string;
  midname?: string;
  birthday?: string;
  tel?: string;
  email?: string;
  login?: string;
  specialization?: string;
};

function readRoles() {
  try {
    const value = JSON.parse(localStorage.getItem("hm51_roles") || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

function readProfile(): CoachProfile {
  let saved: CoachProfile = {};

  try {
    saved = JSON.parse(localStorage.getItem("hm51_coach_profile") || "{}");
  } catch {
    saved = {};
  }

  const storedName = localStorage.getItem("hm51_coach_name") || "";
  const nameParts = storedName.split(/\s+/).filter(Boolean);

  return {
    family: saved.family || nameParts[0] || "",
    name: saved.name || nameParts[1] || "",
    midname: saved.midname || nameParts.slice(2).join(" ") || "",
    birthday: saved.birthday || "",
    tel: saved.tel || "",
    email:
      saved.email ||
      localStorage.getItem("hm51_register_email") ||
      "",
    login: saved.login || localStorage.getItem("hm51_login") || "",
    specialization:
      saved.specialization ||
      localStorage.getItem("hm51_coach_specialization") ||
      "Тренер",
  };
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-[#121715] p-4">
      <p className="text-xs font-bold text-[#20d1a8]">{label}</p>
      <p className="mt-1 break-words text-base font-black text-white">
        {value || "Не указано"}
      </p>
    </div>
  );
}

export default function CoachProfilePage() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<CoachProfile>({});

  useEffect(() => {
    const token =
      localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
    const roles = readRoles();
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
    setProfile(readProfile());
    setReady(true);
  }, []);

  function logout() {
    localStorage.removeItem("hm51_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hm51_active_role");
    localStorage.removeItem("hm51_roles");
    window.location.replace("/login");
  }

  function switchRole() {
    window.location.href = "/role-select";
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#121715] text-white/45">
        Загружаем профиль…
      </main>
    );
  }

  const fullName = [profile.family, profile.name, profile.midname]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header>
          <p className="text-sm text-white/40">ХМ 5.1 · Тренер</p>
          <h1 className="text-3xl font-black">Профиль</h1>
        </header>

        <section className="mt-6 rounded-3xl bg-[#2d332f] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[#20d1a8] text-3xl font-black text-[#121715]">
              {(fullName || profile.login || "Т").slice(0, 1).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-white/40">
                {profile.specialization || "Тренер"}
              </p>
              <h2 className="mt-1 break-words text-2xl font-black">
                {fullName || profile.login || "Тренер"}
              </h2>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 rounded-3xl bg-[#2d332f] p-5">
          <InfoRow label="Фамилия" value={profile.family} />
          <InfoRow label="Имя" value={profile.name} />
          <InfoRow label="Отчество" value={profile.midname} />
          <InfoRow label="Дата рождения" value={profile.birthday} />
          <InfoRow label="Телефон" value={profile.tel} />
          <InfoRow label="Специализация" value={profile.specialization} />
          <InfoRow label="Логин" value={profile.login} />
          <InfoRow label="Email" value={profile.email} />
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={switchRole}
            className="h-14 rounded-[28px] bg-[#2d332f] px-3 text-sm font-black text-white"
          >
            Сменить роль
          </button>

          <button
            type="button"
            onClick={logout}
            className="h-14 rounded-[28px] bg-red-500/15 px-3 text-sm font-black text-red-200"
          >
            Выйти
          </button>
        </section>

        <CoachBottomNav active="profile" />
      </div>
    </main>
  );
}
