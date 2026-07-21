"use client";

import { useEffect } from "react";
import { restoreActiveSession } from "../lib/sessionManager";
import {
  getRegistrationContinuationPath,
  isRegistrationPending,
} from "../lib/registrationProgress";

export default function AppStartPage() {
  useEffect(() => {
    const token = restoreActiveSession();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    if (isRegistrationPending()) {
      window.location.replace(
        getRegistrationContinuationPath()
      );

      return;
    }

    window.location.replace("/calendar");
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[#07110c]">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full border-4 border-[#20E4C7] border-t-transparent" />
        <div className="text-2xl font-bold tracking-wide">
          XM 5.1
        </div>
        <div className="mt-1 text-sm text-white/60">
          Хоккейный менеджер
        </div>
      </div>
    </main>
  );
}
