"use client";

import { useEffect, useState } from "react";
import { cleanupChatPushSubscriptions } from "../lib/chatTopicSubscriptions";
import {
  currentEffectiveNotificationState,
  NOTIFICATION_SETTINGS_CHANGED_EVENT,
  notificationsSupported,
  requestNotificationRefresh,
  setNotificationsPreference,
  type EffectiveNotificationState,
} from "../lib/notificationPreference";

function getUserToken() {
  return (
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("hm51_token") ||
    sessionStorage.getItem("auth_token") ||
    ""
  );
}

function notificationStatusText(state: EffectiveNotificationState) {
  if (state === "granted") return "Уведомления включены";
  if (state === "disabled") return "Уведомления выключены";
  if (state === "denied") {
    return "Уведомления запрещены в настройках устройства";
  }
  if (state === "default") {
    return "Разрешение на уведомления ещё не выдано";
  }

  return "Уведомления не поддерживаются на этом устройстве";
}

export default function NotificationSettings() {
  const [state, setState] =
    useState<EffectiveNotificationState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function updateState() {
    setState(currentEffectiveNotificationState());
  }

  useEffect(() => {
    updateState();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        updateState();
      }
    };

    window.addEventListener("focus", updateState);
    window.addEventListener(
      NOTIFICATION_SETTINGS_CHANGED_EVENT,
      updateState
    );
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", updateState);
      window.removeEventListener(
        NOTIFICATION_SETTINGS_CHANGED_EVENT,
        updateState
      );
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function enableNotifications() {
    setMessage("");

    if (!notificationsSupported()) {
      setMessage(
        "Это устройство или браузер не поддерживает push-уведомления."
      );
      return;
    }

    if (Notification.permission === "denied") {
      setNotificationsPreference(true);
      updateState();

      setMessage(
        "Доступ к уведомлениям запрещён системой. Откройте настройки телефона, найдите ХМ 5.1 или используемый браузер и разрешите уведомления."
      );
      return;
    }

    try {
      setBusy(true);
      setNotificationsPreference(true);

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      localStorage.setItem(
        "hm51_notifications_first_prompt_done",
        "1"
      );

      if (permission !== "granted") {
        setNotificationsPreference(false);
        updateState();

        setMessage(
          "Уведомления не были разрешены. Пока они выключены, чат не получает новые сообщения."
        );
        return;
      }

      requestNotificationRefresh();
      updateState();

      setMessage(
        "Уведомления включены. Подключение чата обновляется."
      );
    } catch {
      setMessage(
        "Не удалось включить уведомления. Проверьте настройки браузера или телефона."
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    try {
      setBusy(true);
      setMessage("");

      // Сначала ставим запрет, чтобы глобальный обработчик
      // не успел повторно зарегистрировать FCM-токен.
      setNotificationsPreference(false);

      await cleanupChatPushSubscriptions(getUserToken());

      updateState();

      setMessage(
        "Уведомления выключены. Пока они выключены, чат не работает."
      );
    } finally {
      setBusy(false);
    }
  }

  const enabled = state === "granted";

  return (
    <section className="mt-6 rounded-[32px] bg-[#2d332f] p-5">
      <button
        type="button"
        disabled={busy}
        onClick={
          enabled
            ? disableNotifications
            : enableNotifications
        }
        className="flex w-full items-center justify-between gap-4 rounded-3xl bg-[#121715] p-4 text-left disabled:opacity-60"
      >
        <div className="pr-4">
          <p className="text-lg font-black text-white">
            Уведомления и чат
          </p>

          <p className="mt-2 text-sm font-semibold leading-5 text-white/45">
            Уведомления используются для получения новых сообщений
            командного чата.
          </p>
        </div>

        <div
          className={
            enabled
              ? "flex h-8 min-w-14 items-center justify-end rounded-full bg-[#20d1a8] p-1"
              : "flex h-8 min-w-14 items-center justify-start rounded-full bg-white/15 p-1"
          }
        >
          <div className="h-6 w-6 rounded-full bg-white shadow-lg" />
        </div>
      </button>

      <p
        className={
          enabled
            ? "mt-4 rounded-2xl bg-[#20d1a8]/10 p-3 text-sm font-bold text-[#20d1a8]"
            : state === "denied"
              ? "mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200"
              : "mt-4 rounded-2xl bg-yellow-400/10 p-3 text-sm font-bold text-yellow-200"
        }
      >
        {busy ? "Изменяем настройки..." : notificationStatusText(state)}
      </p>

      {!enabled && (
        <p className="mt-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-sm font-semibold leading-5 text-yellow-100">
          Без разрешённых уведомлений чат не получает новые
          сообщения и работает некорректно.
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm font-semibold leading-5 text-white/65">
          {message}
        </p>
      )}
    </section>
  );
}
