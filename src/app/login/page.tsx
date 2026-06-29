"use client";

import Link from "next/link";
import { useState } from "react";
import { loginUser } from "../../lib/api";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginUser(login.trim(), password);

      localStorage.setItem("hm51_token", result.token);
      localStorage.setItem("hm51_login", login.trim());

      window.location.href = "/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#121715] px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-white/50">
          ← Назад
        </Link>

        <div className="mt-8">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#20d1a8] text-2xl font-black text-[#121715]">
            ХМ
          </div>

          <h1 className="text-3xl font-black">Вход</h1>
          <p className="mt-2 text-sm text-white/50">
            Войдите в аккаунт ХМ 5.1
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm text-white/60">Логин</span>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#2d332f] px-4 py-4 outline-none focus:border-[#20d1a8]"
              placeholder="Введите логин"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/60">Пароль</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#2d332f] px-4 py-4 outline-none focus:border-[#20d1a8]"
              placeholder="Введите пароль"
              type="password"
              required
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#20d1a8] px-5 py-4 font-black text-[#121715] disabled:opacity-50"
          >
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/50">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-bold text-[#20d1a8]">
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </main>
  );
}
