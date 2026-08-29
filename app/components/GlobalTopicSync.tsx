"use client";

import { useEffect } from "react";
import { loadChatAccount, teamIdOf } from "../chat/chatApi";
import { reconcileChatTopicSubscriptions } from "../lib/chatTopicSubscriptions";
import { requestNotificationRefresh } from "../lib/notificationPreference";
import { restoreActiveSession } from "../lib/sessionManager";

const FCM_REGISTERED_EVENT = "hm51-fcm-registered";
const FCM_TOKEN_KEY = "hm51_web_fcm_token";
const MIN_SYNC_INTERVAL_MS = 30_000;
const RETRY_WITHOUT_FCM_MS = 30_000;
const RETRY_INCOMPLETE_PROFILE_MS = 60_000;
const RETRY_AFTER_ERROR_MS = 60_000;
const PERIODIC_SYNC_MS = 5 * 60_000;

function unique(values: string[]) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

export default function GlobalTopicSync() {
  useEffect(() => {
    let disposed = false;
    let running: Promise<void> | null = null;
    let retryTimer: number | null = null;
    let lastSyncAttemptAt = 0;

    const scheduleRetry = (delay: number) => {
      if (disposed) return;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void sync(true);
      }, delay);
    };

    const sync = (force = false) => {
      if (disposed || running) return running;
      if (!force && Date.now() - lastSyncAttemptAt < MIN_SYNC_INTERVAL_MS) return null;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return null;
      }

      const token = restoreActiveSession();
      if (!token) return null;

      lastSyncAttemptAt = Date.now();

      const fcmToken = localStorage.getItem(FCM_TOKEN_KEY) || "";
      if (!fcmToken) {
        requestNotificationRefresh();
        scheduleRetry(RETRY_WITHOUT_FCM_MS);
        return null;
      }

      running = (async () => {
        try {
          const account = await loadChatAccount(token);
          if (disposed) return;

          const teamIds = unique(account.teams.map(teamIdOf));

          // Не отправляем пустой список при временно неполном /api/me,
          // иначе можно случайно отписать устройство от рабочих team_<ID>.
          if (!account.gamerId || teamIds.length === 0) {
            scheduleRetry(RETRY_INCOMPLETE_PROFILE_MS);
            return;
          }

          await reconcileChatTopicSubscriptions(token, account.gamerId, teamIds);

          // Topic-синхронизация является фоновой задачей. Повторная проверка
          // нужна редко и не должна конкурировать с календарём/профилем/чатом.
          scheduleRetry(PERIODIC_SYNC_MS);
        } catch {
          scheduleRetry(RETRY_AFTER_ERROR_MS);
        }
      })().finally(() => {
        running = null;
      });

      return running;
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const syncAfterFcmRegistration = () => void sync(true);
    const syncAfterReconnect = () => void sync(true);
    const syncOnFocus = () => void sync();
    const syncOnPageShow = () => void sync();

    void sync(true);
    window.addEventListener(FCM_REGISTERED_EVENT, syncAfterFcmRegistration);
    window.addEventListener("online", syncAfterReconnect);
    window.addEventListener("focus", syncOnFocus);
    window.addEventListener("pageshow", syncOnPageShow);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener(FCM_REGISTERED_EVENT, syncAfterFcmRegistration);
      window.removeEventListener("online", syncAfterReconnect);
      window.removeEventListener("focus", syncOnFocus);
      window.removeEventListener("pageshow", syncOnPageShow);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, []);

  return null;
}
