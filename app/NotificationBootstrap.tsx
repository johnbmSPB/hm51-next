"use client";

import { useEffect, useState } from "react";

function hasUserToken() {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem("hm51_token") || localStorage.getItem("auth_token"));
}

function canUseNotifications() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.register("/hm51-push-sw.js", {
    scope: "/",
  });

  await registration.update();
  await navigator.serviceWorker.ready;
}

export default function NotificationBootstrap() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canUseNotifications()) return;

    let disposed = false;
    let attempts = 0;

    const check = () => {
      if (disposed) return;
      attempts += 1;

      if (!hasUserToken()) {
        if (attempts > 90) window.clearInterval(timer);
        return;
      }

      if (Notification.permission === "granted") {
        window.clearInterval(timer);
        registerServiceWorker().catch(() => {});
        return;
      }

      if (Notification.permission === "default") {
        const alreadyAsked = localStorage.getItem("hm51_notifications_first_prompt_done") === "1";
        if (!alreadyAsked) {
          window.clearInterval(timer);
          setVisible(true);
        }
      }
    };

    const timer = window.setInterval(check, 1000);
    check();

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  async function enableNotifications() {
    if (!canUseNotifications()) return;

    try {
      setBusy(true);
      const permission = await Notification.requestPermission();
      localStorage.setItem("hm51_notifications_first_prompt_done", "1");

      if (permission === "granted") {
        await registerServiceWorker();
      }

      setVisible(false);
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    localStorage.setItem("hm51_notifications_first_prompt_done", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] px-4 pb-5">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#121715] p-5 text-white shadow-2xl shadow-black/50">
        <p className="text-lg font-black">Включить уведомления?</p>
        <p className="mt-2 text-sm font-semibold leading-5 text-white/55">
          ХМ 5.1 сможет присылать сообщения команды, когда приложение закрыто или свёрнуто.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={enableNotifications}
            disabled={busy}
            className="flex-1 rounded-2xl bg-[#20d1a8] px-4 py-3 text-sm font-black text-[#07110c] disabled:opacity-50"
          >
            {busy ? "Подключаю..." : "Разрешить"}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-black text-white/55 disabled:opacity-50"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
