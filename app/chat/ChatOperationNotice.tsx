"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatOperationNotice() {
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const nextMessage = String(customEvent.detail?.message || "Не удалось выполнить действие.").trim();

      if (timerRef.current) window.clearTimeout(timerRef.current);
      setMessage(nextMessage);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined;
        setMessage("");
      }, 6000);
    };

    window.addEventListener("hm51-chat-operation-error", onError);
    return () => {
      window.removeEventListener("hm51-chat-operation-error", onError);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+72px)] z-[80] w-[calc(100%-24px)] max-w-md -translate-x-1/2"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-400/40 bg-[#4b1f23]/95 px-4 py-3 text-sm font-bold text-red-50 shadow-2xl shadow-black/40 backdrop-blur">
        <span>{message}</span>
        <button
          type="button"
          onClick={() => setMessage("")}
          className="shrink-0 rounded-lg px-2 py-1 text-base leading-none text-red-100/70 active:bg-white/10"
          aria-label="Закрыть сообщение об ошибке"
        >
          ×
        </button>
      </div>
    </div>
  );
}
