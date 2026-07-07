"use client";

import { useState } from "react";

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ||
  "BN0QH_AeZG8vXuW4RGxsrMnBZxMHfwmz9SlcC41uGkeLajASc0u5cywkgrfZmhjsWqqKJJ4FEmn4m55DDemgtpk";

function toUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isStandalone() {
  const nav = window.navigator as any;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function short(value: string) {
  if (!value) return "";
  if (value.length <= 36) return value;
  return `${value.slice(0, 20)}...${value.slice(-12)}`;
}

export default function IosPushTestPage() {
  const [log, setLog] = useState<string[]>([]);
  const [endpoint, setEndpoint] = useState("");

  function add(message: string) {
    setLog((old) => [`${new Date().toLocaleTimeString("ru-RU")} — ${message}`, ...old]);
  }

  async function runTest() {
    try {
      setLog([]);
      setEndpoint("");

      add(`URL: ${window.location.href}`);
      add(`iPhone/iPad: ${isIOS() ? "ДА" : "НЕТ"}`);
      add(`Standalone/PWA: ${isStandalone() ? "ДА" : "НЕТ"}`);
      add(`Notification.permission ДО: ${Notification.permission}`);

      if (!isStandalone()) {
        add("Для iPhone откройте приложение с иконки на экране Домой");
      }

      const permission = await Notification.requestPermission();
      add(`Notification.permission ПОСЛЕ: ${permission}`);

      if (permission !== "granted") {
        add("Уведомления не разрешены");
        return;
      }

      const registration = await navigator.serviceWorker.register("/hm51-push-sw.js", {
        scope: "/",
      });

      await registration.update();
      await navigator.serviceWorker.ready;
      add(`ServiceWorker: ${registration.scope}`);

      const oldSub = await registration.pushManager.getSubscription();

      if (oldSub) {
        add(`Удаляю старую подписку: ${short(oldSub.endpoint)}`);
        await oldSub.unsubscribe();
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(PUBLIC_KEY),
      });

      setEndpoint(sub.endpoint);
      add(`Новая подписка: ${short(sub.endpoint)}`);

      const response = await fetch("/api/web-push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          subscription: sub,
          title: "ХМ 5.1",
          body: "Тестовое уведомление на iPhone",
        }),
      });

      const json = await response.json();
      add(`/api/web-push/test status: ${response.status}`);
      add(`/api/web-push/test result: ${JSON.stringify(json).slice(0, 240)}`);
    } catch (error: any) {
      add(`ОШИБКА: ${error?.message || String(error)}`);
    }
  }

  return (
    <main className="min-h-screen bg-[#07110c] px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <p className="text-sm text-white/40">ХМ 5.1</p>
        <h1 className="text-3xl font-black">iPhone Push Test</h1>

        <button
          type="button"
          onClick={runTest}
          className="mt-6 h-14 w-full rounded-3xl bg-[#20d1a8] text-base font-black text-[#07110c]"
        >
          Проверить iPhone Push
        </button>

        {endpoint && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-4">
            <p className="text-xs font-bold text-[#20d1a8]">Endpoint</p>
            <p className="mt-2 break-all text-xs text-white/60">{endpoint}</p>
          </section>
        )}

        <section className="mt-5 rounded-3xl bg-[#121715] p-4">
          <p className="text-sm font-black">Лог</p>
          <div className="mt-3 space-y-2">
            {log.map((item, index) => (
              <p
                key={`${item}-${index}`}
                className="break-words rounded-2xl bg-[#2d332f] p-3 text-xs font-semibold leading-5 text-white/70"
              >
                {item}
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
