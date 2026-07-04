"use client";

import { useState } from "react";
import Link from "next/link";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDiqKDv8h8lDD2wiaDPM57azBNxw2Dal3c",
  authDomain: "hockeymanager51.firebaseapp.com",
  projectId: "hockeymanager51",
  storageBucket: "hockeymanager51.firebasestorage.app",
  messagingSenderId: "354371414201",
  appId: "1:354371414201:web:5892b19ab60494471bd368",
};

const FIREBASE_VAPID_KEY =
  "BEGbxldkTRCHQqtTAALyKUczPAyk6fVhqO_o_dUN767p4eNMGyyVGFP205KBZyF4-Ax4Bc9tcvhyXJ9YVGkz5KY";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function short(value: string) {
  if (!value) return "";
  if (value.length <= 28) return value;
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

export default function PushDebugPage() {
  const [log, setLog] = useState<string[]>([]);
  const [fcmToken, setFcmToken] = useState("");
  const [webPushEndpoint, setWebPushEndpoint] = useState("");
  const [registerResponse, setRegisterResponse] = useState<any>(null);

  function add(message: string) {
    setLog((old) => [`${new Date().toLocaleTimeString("ru-RU")} — ${message}`, ...old]);
  }

  function getToken() {
    return localStorage.getItem("hm51_token") || "";
  }

  function isStandalone() {
    const nav = window.navigator as any;

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      nav.standalone === true
    );
  }

  async function runDiagnostics() {
    try {
      setLog([]);
      setFcmToken("");
      setWebPushEndpoint("");
      setRegisterResponse(null);

      add(`URL: ${window.location.href}`);
      add(`Standalone/PWA: ${isStandalone() ? "ДА" : "НЕТ"}`);
      add(`UserAgent: ${navigator.userAgent}`);
      add(`HTTPS: ${window.location.protocol === "https:" ? "ДА" : "НЕТ"}`);
      add(`Notification: ${"Notification" in window ? "есть" : "нет"}`);
      add(`ServiceWorker: ${"serviceWorker" in navigator ? "есть" : "нет"}`);
      add(`PushManager: ${"PushManager" in window ? "есть" : "нет"}`);

      if (!("Notification" in window)) {
        add("СТОП: Notification API нет");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        add("СТОП: Service Worker нет");
        return;
      }

      if (!("PushManager" in window)) {
        add("СТОП: PushManager нет");
        return;
      }

      add(`Notification.permission ДО: ${Notification.permission}`);

      const permission = await Notification.requestPermission();
      add(`Notification.permission ПОСЛЕ: ${permission}`);

      if (permission !== "granted") {
        add("СТОП: уведомления не разрешены");
        return;
      }

      const registration = await navigator.serviceWorker.register("/hm51-push-sw.js");
      add(`ServiceWorker registered: ${registration.scope}`);

      try {
        await registration.showNotification("ХМ 5.1 — тест", {
          body: "Если это уведомление видно, разрешение iPhone работает.",
          icon: "/icons/icon-192.png",
        });
        add("Локальное уведомление отправлено");
      } catch (error: any) {
        add(`Локальное уведомление ошибка: ${error?.message || String(error)}`);
      }

      try {
        const rawSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(FIREBASE_VAPID_KEY),
        });

        const endpoint = rawSubscription.endpoint || "";
        setWebPushEndpoint(endpoint);
        add(`Standard Web Push endpoint: ${short(endpoint)}`);

        if (endpoint.includes("push.apple.com")) {
          add("ВАЖНО: это Apple Web Push endpoint. iPhone PWA Web Push работает.");
        }
      } catch (error: any) {
        add(`Standard Web Push subscribe ошибка: ${error?.message || String(error)}`);
      }

      try {
        const [{ initializeApp, getApps }, messagingModule] = await Promise.all([
          import("firebase/app"),
          import("firebase/messaging"),
        ]);

        const { getMessaging, getToken, isSupported } = messagingModule;

        const supported = await isSupported();
        add(`Firebase Messaging isSupported: ${supported ? "ДА" : "НЕТ"}`);

        if (supported) {
          const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
          const messaging = getMessaging(app);

          const token = await getToken(messaging, {
            vapidKey: FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });

          setFcmToken(token || "");
          add(`Firebase FCM token: ${token ? short(token) : "пусто"}`);

          const userToken = getTokenFromStorage();

          if (!userToken) {
            add("СТОП: hm51_token не найден, надо войти в аккаунт");
            return;
          }

          if (token) {
            const response = await fetch("/api/fcm/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json;charset=UTF-8",
              },
              body: JSON.stringify({
                token: userToken,
                fcmToken: token,
              }),
            });

            const json = await response.json();
            setRegisterResponse(json);

            add(`/api/fcm/register status: ${response.status}`);
            add(`/api/fcm/register result: ${JSON.stringify(json).slice(0, 240)}`);
          }
        }
      } catch (error: any) {
        add(`Firebase Messaging ошибка: ${error?.message || String(error)}`);
      }
    } catch (error: any) {
      add(`ОБЩАЯ ОШИБКА: ${error?.message || String(error)}`);
    }
  }

  function getTokenFromStorage() {
    return localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
  }

  async function copyReport() {
    const report = {
      url: typeof window !== "undefined" ? window.location.href : "",
      standalone: typeof window !== "undefined" ? isStandalone() : false,
      notificationPermission:
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "no Notification API",
      fcmToken,
      webPushEndpoint,
      registerResponse,
      log,
    };

    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    add("Отчёт скопирован");
  }

  return (
    <main className="min-h-screen bg-[#07110c] px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">ХМ 5.1</p>
            <h1 className="text-3xl font-black">Push Debug</h1>
          </div>

          <Link
            href="/chat"
            className="rounded-2xl bg-[#2d332f] px-4 py-3 text-xs font-black text-white/60"
          >
            Чат
          </Link>
        </header>

        <section className="mt-6 space-y-3">
          <button
            type="button"
            onClick={runDiagnostics}
            className="h-14 w-full rounded-3xl bg-[#20d1a8] text-base font-black text-[#07110c]"
          >
            Запустить диагностику
          </button>

          <button
            type="button"
            onClick={copyReport}
            className="h-14 w-full rounded-3xl bg-[#2d332f] text-base font-black text-white"
          >
            Скопировать отчёт
          </button>
        </section>

        {fcmToken && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-4">
            <p className="text-xs font-bold text-[#20d1a8]">FCM token</p>
            <p className="mt-2 break-all text-xs text-white/60">{fcmToken}</p>
          </section>
        )}

        {webPushEndpoint && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-4">
            <p className="text-xs font-bold text-[#20d1a8]">Web Push endpoint</p>
            <p className="mt-2 break-all text-xs text-white/60">{webPushEndpoint}</p>
          </section>
        )}

        <section className="mt-5 rounded-3xl bg-[#121715] p-4">
          <p className="text-sm font-black text-white">Лог</p>

          <div className="mt-3 space-y-2">
            {log.length === 0 && (
              <p className="text-sm font-semibold text-white/35">
                Нажмите «Запустить диагностику».
              </p>
            )}

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
