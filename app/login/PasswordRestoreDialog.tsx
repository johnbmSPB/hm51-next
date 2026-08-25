"use client";

import { useEffect, useState } from "react";

function currentLoginValue() {
  const input = document.querySelector<HTMLInputElement>('input[placeholder="Логин"]');
  return input?.value?.trim() || "";
}

export default function PasswordRestoreDialog() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const interceptForgotPassword = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;

      const text = button.textContent?.trim() || "";
      if (!text.includes("Забыли пароль")) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setIdentifier(currentLoginValue());
      setMessage("");
      setSuccess(false);
      setOpen(true);
    };

    document.addEventListener("click", interceptForgotPassword, true);
    return () => document.removeEventListener("click", interceptForgotPassword, true);
  }, []);

  async function restore() {
    const value = identifier.trim();

    if (!value) {
      setSuccess(false);
      setMessage("Введите логин или действующий email");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setSuccess(false);

      const response = await fetch("/api/restore-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ identifier: value }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Не удалось восстановить пароль");
      }

      setSuccess(true);
      setMessage(json.message || "Пароль отправлен на Вашу электронную почту");
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "Ошибка восстановления пароля");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-5" onClick={() => !loading && setOpen(false)}>
      <section className="w-full max-w-sm rounded-[30px] bg-[#2b322d] p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Восстановление пароля</h2>
            <p className="mt-2 text-sm font-semibold leading-5 text-white/50">
              Введите логин или действующий email, который указан в вашем профиле.
            </p>
          </div>
          <button type="button" onClick={() => !loading && setOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-2xl text-white/60" aria-label="Закрыть">
            ×
          </button>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-bold text-white/65">Логин или email</span>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void restore();
              }
            }}
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            placeholder="Логин или email"
            className="h-14 w-full rounded-[14px] border border-white/20 bg-[#121715] px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#24d7b3]"
            autoFocus
          />
        </label>

        {message && (
          <div className={`mt-4 rounded-2xl p-3 text-sm font-bold ${success ? "bg-[#24d7b3]/15 text-[#24d7b3]" : "bg-red-500/15 text-red-200"}`}>
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={() => void restore()}
          disabled={loading}
          className="mt-5 h-14 w-full rounded-[20px] bg-[#24d7b3] text-base font-black text-black disabled:opacity-50"
        >
          {loading ? "Отправляем..." : "Восстановить пароль"}
        </button>
      </section>
    </div>
  );
}
