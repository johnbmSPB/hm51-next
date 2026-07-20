"use client";

export const NOTIFICATIONS_ENABLED_KEY = "hm51_notifications_enabled";
export const NOTIFICATION_SETTINGS_CHANGED_EVENT =
  "hm51-notification-settings-changed";
export const FCM_RESET_EVENT = "hm51-fcm-reset";

export type EffectiveNotificationState =
  | NotificationPermission
  | "disabled"
  | "unsupported";

export function notificationsSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function notificationsPreferenceEnabled() {
  if (typeof window === "undefined") return true;

  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== "0";
}

export function setNotificationsPreference(enabled: boolean) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    NOTIFICATIONS_ENABLED_KEY,
    enabled ? "1" : "0"
  );

  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_SETTINGS_CHANGED_EVENT, {
      detail: { enabled },
    })
  );
}

export function currentEffectiveNotificationState(): EffectiveNotificationState {
  if (!notificationsSupported()) return "unsupported";

  if (!notificationsPreferenceEnabled()) {
    return "disabled";
  }

  return Notification.permission;
}

export function requestNotificationRefresh() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("hm51_fcm_last_register");
  window.dispatchEvent(new CustomEvent(FCM_RESET_EVENT));
}
