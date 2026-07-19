"use client";

import { useEffect, useState } from "react";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDiqKDv8h8lDD2wiaDPM57azBNxw2Dal3c",
  authDomain: "hockeymanager51.firebaseapp.com",
  projectId: "hockeymanager51",
  storageBucket: "hockeymanager51.firebasestorage.app",
  messagingSenderId: "354371414201",
  appId: "1:354371414201:web:5892b19ab60494471bd368",
};

const FIREBASE_VAPID_KEY = "BEGbxldkTRCHQqtTAALyKUczPAyk6fVhqO_o_dUN767p4eNMGyyVGFP205KBZyF4-Ax4Bc9tcvhyXJ9YVGkz5KY";
const DEVICE_ID_KEY = "hm51_web_device_id";
const FCM_REGISTERED_EVENT = "hm51-fcm-registered";
const FCM_RESET_EVENT = "hm51-fcm-reset";

function getUserToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
}

function getDeviceId() {
  if (typeof window === "undefined") return "";
  const saved = localStorage.getItem(DEVICE_ID_KEY);
  if (saved) return saved;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function hasUserToken() {
  return !!getUserToken();
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
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register("/hm51-push-sw.js", { scope: "/" });
  await registration.update();
  return await navigator.serviceWorker.ready;
}

async function refreshFcmToken() {
  if (!canUseNotifications() || Notification.permission !== "granted") return;
  const userToken = getUserToken();
  const deviceId = getDeviceId();
  if (!userToken || !deviceId) return;

  const lastRegister = Number(localStorage.getItem("hm51_fcm_last_register") || "0");
  if (Date.now() - lastRegister < 60_000) return;

  try {
    const readyRegistration = await registerServiceWorker();
    if (!readyRegistration) return;

    const [{ initializeApp, getApps }, messagingModule] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);

    const { getMessaging, getToken, isSupported } = messagingModule;
    if (!(await isSupported())) return;

    const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const fcmToken = await getToken(getMessaging(app), {
      vapidKey: FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: readyRegistration,
    });
    if (!fcmToken) return;

    const response = await fetch("/api/fcm/register", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({
        token: userToken,
        fcmToken,
        deviceId,
        platform: "web",
        deviceName: navigator.userAgent,
      }),
    });
    if (!response.ok) throw new Error("FCM registration failed");

    localStorage.setItem("hm51_web_fcm_token", fcmToken);
    localStorage.setItem("hm51_fcm_last_register", String(Date.now()));
    window.dispatchEvent(
      new CustomEvent(FCM_REGISTERED_EVENT, {
        detail: { fcmToken, deviceId },
      })
    );
  } catch {
    // Push не должен ломать вход в приложение.
  }
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
        refreshFcmToken();
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
    const onFocus = () => refreshFcmToken();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshFcmToken();
    };
    const onFcmReset = () => void refreshFcmToken();
    window.addEventListener("focus", onFocus);
    window.addEventListener(FCM_RESET_EVENT, onFcmReset);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(FCM_RESET_EVENT, onFcmReset);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function enableNotifications() {
    if (!canUseNotifications()) return;
    try {
      setBusy(true);
      const permission = await Notification.requestPermission();
      localStorage.setItem("hm51_notifications_first_prompt_done", "1");
      if (permission === "granted") await refreshFcmToken();
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
          <button type="button" onClick={enableNotifications} disabled={busy} className="flex-1 rounded-2xl bg-[#20d1a8] px-4 py-3 text-sm font-black text-[#07110c] disabled:opacity-50">
            {busy ? "Подключаю..." : "Разрешить"}
          </button>
          <button type="button" onClick={skip} disabled={busy} className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-black text-white/55 disabled:opacity-50">
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
