"use client";

import { useEffect } from "react";

export default function StartPage() {
  useEffect(() => {
    const token = localStorage.getItem("hm51_token") || "";

    if (token) {
      window.location.href = "/calendar";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121715] px-6 text-white">
      <div className="text-center">
        <p className="text-sm text-white/40">ХМ 5.1</p>
        <h1 className="mt-2 text-3xl font-black">Загрузка...</h1>
      </div>
    </main>
  );
}
