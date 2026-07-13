"use client";

import { useEffect, useState } from "react";
import CoachBottomNav from "../components/CoachBottomNav";

export default function CoachMenuPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";

    if (!token) {
      window.location.replace("/login");
      return;
    }

    localStorage.setItem("hm51_active_role", "COACH");
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#121715] text-white/45">
        Загружаем меню…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header>
          <p className="text-sm text-white/40">ХМ 5.1 · Тренер</p>
          <h1 className="text-3xl font-black">Меню</h1>
        </header>

        <section className="mt-6 min-h-[62vh] rounded-3xl bg-[#2d332f]" />

        <CoachBottomNav active="menu" />
      </div>
    </main>
  );
}
