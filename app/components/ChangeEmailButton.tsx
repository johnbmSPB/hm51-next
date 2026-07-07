"use client";

import { useState } from "react";

type Props = {
  currentEmail?: string;
  onChanged?: (email: string) => void;
  className?: string;
};

function getToken() {
  return (
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    ""
  );
}

export default function ChangeEmailButton({
  currentEmail = "",
  onChanged,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const nextEmail = email.trim();

    if (!nextEmail || !nextEmail.includes("@")) {
      setMessage("Введите корректный email");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/send-email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          email: nextEmail,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.text || json.error || "Не удалось отправить код");
      }

      setStep("code");
      setMessage("Код отправлен на новый email");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка отправки кода"
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmAndChangeEmail() {
    const token = getToken();
    const nextEmail = email.trim();
    const checkCode = code.trim();

    if (!token) {
      setMessage("Вы не авторизованы");
      return;
    }

    if (!checkCode) {
      setMessage("Введите код из письма");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const checkResponse = await fetch("/api/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          email: nextEmail,
          code: checkCode,
        }),
      });

      const checkJson = await checkResponse.json();

      if (!checkResponse.ok || checkJson.result === false) {
        throw new Error(
          checkJson.text || checkJson.error || "Код подтверждения неверный"
        );
      }

      const changeResponse = await fetch("/api/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          email: nextEmail,
        }),
      });

      const changeJson = await changeResponse.json();

      if (!changeResponse.ok || changeJson.result === false) {
        throw new Error(
          changeJson.text || changeJson.error || "Не удалось изменить email"
        );
      }

      localStorage.setItem("hm51_register_email", nextEmail);

      onChanged?.(nextEmail);

      setMessage("Email успешно изменён");

      window.setTimeout(() => {
        setOpen(false);
        setStep("email");
        setEmail("");
        setCode("");
        setMessage("");
      }, 700);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка смены email"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStep("email");
          setEmail("");
          setCode("");
          setMessage("");
        }}
        className={className || "text-sm font-black text-[#20d1a8]"}
      >
        Сменить email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-sm rounded-[32px] bg-[#2d332f] p-5 text-white shadow-2xl">
            <p className="text-xl font-black">Сменить email</p>

            {currentEmail && (
              <p className="mt-2 text-xs font-semibold text-white/40">
                Текущий email: {currentEmail}
              </p>
            )}

            {step === "email" ? (
              <>
                <p className="mt-4 text-sm font-semibold text-white/60">
                  Введите новый email. На него будет отправлен код подтверждения.
                </p>

                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Новый email"
                  type="email"
                  className="mt-4 h-14 w-full rounded-2xl border border-white/10 bg-[#121715] px-4 text-base font-bold text-white outline-none"
                />

                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading}
                  className="mt-4 h-14 w-full rounded-[30px] bg-[#20d1a8] text-base font-black text-[#121715] disabled:opacity-50"
                >
                  {loading ? "Отправляем..." : "Отправить код"}
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-semibold text-white/60">
                  Введите код, который пришёл на новый email.
                </p>

                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Код из письма"
                  inputMode="numeric"
                  className="mt-4 h-14 w-full rounded-2xl border border-white/10 bg-[#121715] px-4 text-base font-bold text-white outline-none"
                />

                <button
                  type="button"
                  onClick={confirmAndChangeEmail}
                  disabled={loading}
                  className="mt-4 h-14 w-full rounded-[30px] bg-[#20d1a8] text-base font-black text-[#121715] disabled:opacity-50"
                >
                  {loading ? "Проверяем..." : "Подтвердить и изменить"}
                </button>
              </>
            )}

            {message && (
              <p className="mt-4 rounded-2xl bg-[#121715] p-3 text-sm font-bold text-white/70">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="mt-3 h-12 w-full rounded-[30px] bg-white/10 text-sm font-black text-white disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  );
}
