"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

function getToken() {
  return (
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    ""
  );
}

function findEmailBlock() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const emailButton = buttons.find(
    (button) => button.textContent?.trim().includes("Сменить email")
  );

  return emailButton?.closest("div.rounded-2xl") as HTMLDivElement | null;
}

export default function ProfileChangePassword() {
  const pathname = usePathname();
  const [mount, setMount] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (pathname !== "/home") {
      setMount(null);
      return;
    }

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const attach = () => {
      if (cancelled) return true;

      const emailBlock = findEmailBlock();
      if (!emailBlock) return false;

      let target = document.getElementById("hm51-profile-change-password-mount") as HTMLDivElement | null;

      if (!target) {
        target = document.createElement("div");
        target.id = "hm51-profile-change-password-mount";
        target.className = "mt-5";
        emailBlock.insertAdjacentElement("afterend", target);
      }

      setMount(target);
      return true;
    };

    if (!attach()) {
      observer = new MutationObserver(() => {
        if (attach()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      const target = document.getElementById("hm51-profile-change-password-mount");
      target?.remove();
      setMount(null);
    };
  }, [pathname]);

  const canSubmit = useMemo(
    () => Boolean(newPassword && repeatPassword && !loading),
    [newPassword, repeatPassword, loading]
  );

  async function changePassword() {
    const token = getToken();

    if (!token) {
      setMessage("Вы не авторизованы");
      return;
    }

    if (!newPassword) {
      setMessage("Введите новый пароль");
      return;
    }

    if (newPassword !== repeatPassword) {
      setMessage("Пароли не совпадают");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Не удалось изменить пароль");
      }

      setNewPassword("");
      setRepeatPassword("");
      setOpen(false);
      setMessage("Пароль успешно изменён");

      window.setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка смены пароля"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!mount) return null;

  return createPortal(
    <div className="rounded-2xl bg-[#121715] p-4">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setMessage("");
        }}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-black text-[#20d1a8]">
          Сменить пароль
        </span>
        <span className="text-2xl font-black text-[#20d1a8]">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <label className="block min-w-0 max-w-full overflow-hidden">
            <span className="mb-2 block px-[20px] text-base text-white">
              Новый пароль
            </span>
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Введите новый пароль"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="block h-12 w-full min-w-0 max-w-full box-border rounded-[10px] border border-white/30 bg-white/10 px-[14px] text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#20d1a8]"
            />
          </label>

          <label className="block min-w-0 max-w-full overflow-hidden">
            <span className="mb-2 block px-[20px] text-base text-white">
              Повторите новый пароль
            </span>
            <input
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              placeholder="Повторите новый пароль"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="block h-12 w-full min-w-0 max-w-full box-border rounded-[10px] border border-white/30 bg-white/10 px-[14px] text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#20d1a8]"
            />
          </label>

          <label className="flex items-center gap-3 text-sm font-semibold text-white/60">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="h-4 w-4 accent-[#20d1a8]"
            />
            Показать пароль
          </label>

          {message && (
            <p className="rounded-2xl bg-[#2d332f] p-3 text-sm font-bold text-[#20d1a8]">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={changePassword}
            disabled={!canSubmit}
            className="h-14 w-full rounded-[30px] bg-[#20d1a8] text-lg font-semibold text-[#121715] disabled:opacity-30"
          >
            {loading ? "Изменяем..." : "Изменить пароль"}
          </button>
        </div>
      )}

      {!open && message && (
        <p className="mt-3 rounded-2xl bg-[#2d332f] p-3 text-sm font-bold text-[#20d1a8]">
          {message}
        </p>
      )}
    </div>,
    mount
  );
}
