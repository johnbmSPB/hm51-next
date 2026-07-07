"use client";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className = "" }: LogoutButtonProps) {
  function logout() {
    const keysToRemove = [
      "hm51_token",
      "auth_token",
      "hm51_register_email",
      "hm51_policy_accepted",
      "hm51_web_fcm_token",
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

    sessionStorage.clear();

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
