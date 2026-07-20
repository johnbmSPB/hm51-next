"use client";

import { getScopedItem } from "../lib/accountStorage";
import { useEffect } from "react";

const FORCE_MANUAL_LOGIN_KEY = "hm51_force_manual_login";

function isManualLoginRequired() {
  return localStorage.getItem(FORCE_MANUAL_LOGIN_KEY) === "1";
}

function isPasswordlessEnabled() {
  return getScopedItem("hm51_passwordless_enabled") === "true";
}

function getSavedToken() {
  return localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
}

export default function AppStartPage() {
  useEffect(() => {
    if (isManualLoginRequired()) {
      localStorage.removeItem("hm51_token");
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("hm51_token");
      sessionStorage.removeItem("auth_token");

      window.location.replace("/login");
      return;
    }

    const token = getSavedToken();

    if (isPasswordlessEnabled() && token) {
      localStorage.setItem("hm51_token", token);
      localStorage.setItem("auth_token", token);
      window.location.replace("/calendar");
      return;
    }

    window.location.replace("/login");
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[#07110c]">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full border-4 border-[#20E4C7] border-t-transparent" />
        <div className="text-2xl font-bold tracking-wide">XM 5.1</div>
        <div className="mt-1 text-sm text-white/60">Хоккейный менеджер</div>
      </div>
    </main>
  );
}
