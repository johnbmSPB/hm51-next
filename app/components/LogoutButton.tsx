"use client";

import { clearPasswordlessLogin } from "./AuthTokenGuard";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className = "" }: LogoutButtonProps) {
  async function logout() {
    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("hm51_token") ||
      sessionStorage.getItem("auth_token") ||
      "";

    // Сначала отписываем устройство от команд и отзываем FCM-токен.
    await clearPasswordlessLogin(token);

    const keysToRemove = [
      "hm51_register_email",
      "hm51_policy_accepted",
      "hm51_web_fcm_enabled",
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("hm51_chat_")) {
        localStorage.removeItem(key);
      }
    });

    sessionStorage.removeItem("hm51_gamer_team_id");
    window.location.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={className}
    >
      Выход
    </button>
  );
}
