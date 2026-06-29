"use client";

import { useEffect, useState } from "react";

export default function HomeAppPage() {
  const [login, setLogin] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("hm51_token") || "";
    const savedLogin = localStorage.getItem("hm51_login") || "";

    setToken(savedToken);
    setLogin(savedLogin);

    if (!savedToken) {
      window.location.href = "/login";
    }
  }, []);

  function logout() {
    localStorage.removeItem("hm51_token");
    localStorage.removeItem("hm51_login");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#121715] px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/40">Добро пожаловать</p>
            <h1 className="text-2xl font-black">{login || "Игрок ХМ 5.1"}</h1>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-[#2d332f] px-4 py-3 text-sm font-bold text-white/60"
          >
            Выйти
          </button>
        </header>

        <section className="mt-8 rounded-3xl bg-[#2d332f] p-5">
          <h2 className="text-xl font-black">Ваша команда</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Здесь будет карточка команды, календарь игр, тренировок и заявки.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#121715] p-4">
              <p className="text-3xl font-black text-[#20d1a8]">0</p>
              <p className="mt-1 text-sm text-white/40">игр</p>
            </div>

            <div className="rounded-2xl bg-[#121715] p-4">
              <p className="text-3xl font-black text-[#ff0a8a]">0</p>
              <p className="mt-1 text-sm text-white/40">тренировок</p>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-white/10 p-4 text-xs text-white/30">
          Токен сохранён. Первые символы: {token.slice(0, 10)}...
        </div>
      </div>
    </main>
  );
}
