"use client";

import Link from "next/link";
import { useState } from "react";
import { registerUser } from "../../lib/api";

const roles = [
  { id: "player", title: "Игрок" },
  { id: "goalkeeper", title: "Вратарь" },
  { id: "coach", title: "Тренер" },
];

export default function RegisterPage() {
  const [role, setRole] = useState("player");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!policyAccepted) {
      setError("Нужно принять политику обработки данных");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        role,
        login: login.trim(),
        email: email.trim(),
        password,
      });

      setSuccess("Регистрация отправлена. Теперь можно войти.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
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

          <h1 className="text-3xl font-black">Регистрация</h1>
          <p className="mt-2 text-sm text-white/50">
            Создайте аккаунт для ХМ 5.1
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <p className="mb-2 text-sm text-white/60">Выберите роль</p>

            <div className="grid grid-cols-3 gap-2">
              {roles.map((item) => {
                const selected = role === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id)}
                    className={
                      selected
                        ? "rounded-2xl bg-[#20d1a8] px-3 py-4 text-sm font-black text-[#121715]"
                        : "rounded-2xl bg-[#2d332f] px-3 py-4 text-sm font-bold text-white/70"
                    }
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-sm text-white/60">Логин</span>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#2d332f] px-4 py-4 outline-none focus:border-[#20d1a8]"
              placeholder="Придумайте логин"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/60">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#2d332f] px-4 py-4 outline-none focus:border-[#20d1a8]"
              placeholder="Введите email"
              type="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/60">Пароль</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#2d332f] px-4 py-4 outline-none focus:border-[#20d1a8]"
              placeholder="Придумайте пароль"
              type="password"
              required
            />
          </label>

          <label className="flex gap-3 rounded-2xl bg-[#2d332f] px-4 py-4">
            <input
              checked={policyAccepted}
              onChange={(event) => setPolicyAccepted(event.target.checked)}
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span className="text-sm leading-6 text-white/70">
              Я принимаю политику обработки персональных данных и условия
              использования ХМ 5.1
            </span>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-[#20d1a8]/30 bg-[#20d1a8]/10 px-4 py-3 text-sm text-[#20d1a8]">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#20d1a8] px-5 py-4 font-black text-[#121715] disabled:opacity-50"
          >
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/50">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-bold text-[#20d1a8]">
            Войти
          </Link>
        </div>
      </div>
    </main>
  );
}
