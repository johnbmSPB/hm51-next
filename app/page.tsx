"use client";

import { useEffect } from "react";

export default function StartPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = "/login";
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex h-[100svh] w-screen items-center justify-center overflow-hidden bg-[#07110c]">
      <img
        src="/images/Start.jpg"
        alt="ХМ 5.1"
        className="h-full w-full object-contain"
      />
    </main>
  );
}
