"use client";

import { setActiveSession } from "../lib/sessionManager";

import {
  getRegistrationContinuationPath,
  markRegistrationPending,
} from "../lib/registrationProgress";

export default function AcceptPolicyButton() {
  function acceptPolicy() {
    localStorage.setItem(
      "hm51_policy_accepted",
      "true"
    );

    const role =
      localStorage.getItem(
        "hm51_register_role"
      ) || "Игрок";

    const login =
      localStorage.getItem(
        "hm51_login"
      ) || "";

    const email =
      localStorage.getItem(
        "hm51_register_email"
      ) || "";

    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      "";

    if (!token) {
      window.location.replace("/login");
      return;
    }

    setActiveSession(
      token,
      login
    );

    markRegistrationPending({
      login,
      role,
      email,
    });

    window.location.replace(
      getRegistrationContinuationPath()
    );
  }

  return (
    <button
      type="button"
      onClick={acceptPolicy}
      className="flex h-14 w-full items-center justify-center rounded-[30px] bg-[#24d7b3] text-lg font-black text-black"
    >
      Принять
    </button>
  );
}
