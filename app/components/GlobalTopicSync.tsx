"use client";

import { useEffect } from "react";
import { loadChatAccount, teamIdOf } from "../chat/chatApi";
import { reconcileChatTopicSubscriptions } from "../lib/chatTopicSubscriptions";
import { requestNotificationRefresh } from "../lib/notificationPreference";
import { restoreActiveSession } from "../lib/sessionManager";

const FCM_REGISTERED_EVENT = "hm51-fcm-registered";
const FCM_TOKEN_KEY = "hm51_web_fcm_token";

function unique(values: string[]) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

export default function GlobalTopicSync() {
  useEffect(() => {
    let disposed = false;
    let running: Promise<void> | null = null;
    let retryTimer: number | null = null;

    const scheduleRetry = (delay = 2_000) => {
      if (disposed) return;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void sync();
      }, delay);
    };

    const sync = () => {
      if (disposed || running) return running;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return null;
      }

      const token = restoreActiveSession();
      if (!token) return null;

      const fcmToken = localStorage.getItem(FCM_TOKEN_KEY) || "";
      if (!fcmToken) {
        requestNotificationRefresh();
        scheduleRetry();
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
            scheduleRetry(4_000);
            return;
          }

          await reconcileChatTopicSubscriptions(token, account.gamerId, teamIds);
        } catch {
          scheduleRetry(4_000);
        }
      })().finally(() => {
        running = null;
      });

      return running;
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };

    void sync();
    scheduleRetry(8_000);
    window.addEventListener(FCM_REGISTERED_EVENT, sync);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener(FCM_REGISTERED_EVENT, sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, []);

  return null;
}
