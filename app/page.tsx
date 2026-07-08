"use client";

import { useEffect } from "react";

function getCookie(name: string) {
  return (
    document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

function isPasswordlessEnabled() {
  return (
    localStorage.getItem("hm51_passwordless_enabled") === "true" ||
    sessionStorage.getItem("hm51_passwordless_enabled") === "true" ||
    decodeURIComponent(getCookie("hm51_passwordless_enabled")) === "true"
  );
}

function getSavedToken() {
  return (
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    ""
  );
}

export default function StartPage() {
  useEffect(() => {
    const token = getSavedToken();

    if (isPasswordlessEnabled() && token) {
      localStorage.setItem("hm51_token", token);
      localStorage.setItem("auth_token", token);
      window.location.replace("/calendar");
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.href = "/login";
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-[#07110c]">
      <img
        src="/images/Start.jpg"
        alt="ХМ 5.1"
        className="block h-full w-full object-cover"
      />
    </main>
  );
}
