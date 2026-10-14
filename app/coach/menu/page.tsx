"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CoachBottomNav from "../components/CoachBottomNav";

const menuItems = [
  {
    href: "/coach/demo",
    icon: "◫",
    title: "Живой макет кабинета тренера",
    text: "Явка, состав по звеньям, цвета маек, утверждение, лёд, услуги, подкатки и сборы.",
    accent: true,
  },
  {
    href: "/coach/profile",
    icon: "◉",
    title: "Профиль тренера",
    text: "Личные данные, специализация и переключение ролей.",
  },
  {
    href: "/coach/find-team",
    icon: "⌕",
    title: "Найти команду",
    text: "Поиск команд и подключение тренера к составу.",
  },
  {
    href: "/coach/chat",
    icon: "◌",
    title: "Командный чат",
    text: "Сообщения игрокам и организационная информация.",
  },
];

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

        <section className="mt-6 space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.accent
                  ? "block rounded-3xl border border-[#20d1a8]/30 bg-[#20d1a8]/10 p-5"
                  : "block rounded-3xl bg-[#2d332f] p-5"
              }
            >
              <div className="flex items-center gap-4">
                <span
                  className={
                    item.accent
                      ? "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#20d1a8] text-2xl font-black text-[#121715]"
                      : "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#121715] text-2xl font-black text-white/70"
                  }
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-black">{item.title}</span>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-white/40">
                    {item.text}
                  </span>
                </span>
                <span className={item.accent ? "text-xl text-[#20d1a8]" : "text-xl text-white/25"}>
                  →
                </span>
              </div>
            </Link>
          ))}
        </section>

        <CoachBottomNav active="menu" />
      </div>
    </main>
  );
}
