"use client";

import { useEffect, useRef, useState } from "react";
import {
  authenticateWithBiometricByLogin,
  getBiometricTokenByLogin,
  isBiometricEnabledByLogin,
} from "../lib/biometric";
import { resolveAppStartDecision } from "../lib/appStartPolicy";
import {
  readPasswordlessSession,
  setActiveSession,
} from "../lib/sessionManager";
import {
  getRegistrationContinuationPath,
  isRegistrationPending,
} from "../lib/registrationProgress";

const FORCE_MANUAL_LOGIN_KEY = "hm51_force_manual_login";

function authenticatedRedirect() {
  return localStorage.getItem("hm51_active_role") === "COACH"
    ? "/coach"
    : "/calendar";
}

export default function AppStartPage() {
  const startedRef = useRef(false);
  const [statusText, setStatusText] = useState("Подготавливаем вход...");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let active = true;

    async function startApplication() {
      const savedLogin = localStorage.getItem("hm51_login") || "";
      const biometricToken = savedLogin
        ? getBiometricTokenByLogin(savedLogin)
        : "";

      const decision = resolveAppStartDecision(
        {
          enabled:
            Boolean(savedLogin) &&
            isBiometricEnabledByLogin(savedLogin),
          token: biometricToken,
          login: savedLogin,
        },
        readPasswordlessSession(savedLogin)
      );

      if (decision.mode === "biometric") {
        try {
          setStatusText("Подтвердите вход на устройстве");
          await authenticateWithBiometricByLogin(decision.login);

          if (!active) return;

          localStorage.removeItem(FORCE_MANUAL_LOGIN_KEY);
          setActiveSession(decision.token, decision.login);

          if (isRegistrationPending()) {
            window.location.replace(
              getRegistrationContinuationPath()
            );
            return;
          }

          window.location.replace(authenticatedRedirect());
          return;
        } catch {
          if (!active) return;

          localStorage.setItem(FORCE_MANUAL_LOGIN_KEY, "1");
          sessionStorage.setItem(
            "hm51_passwordless_skip_until",
            String(Date.now() + 5 * 60 * 1000)
          );
          window.location.replace("/login");
          return;
        }
      }

      if (decision.mode === "passwordless") {
        setActiveSession(decision.token, decision.login);

        if (isRegistrationPending()) {
          window.location.replace(
            getRegistrationContinuationPath()
          );
          return;
        }

        window.location.replace(authenticatedRedirect());
        return;
      }

      window.location.replace("/login");
    }

    void startApplication();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[#07110c]">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full border-4 border-[#20E4C7] border-t-transparent" />
        <div className="text-2xl font-bold tracking-wide">
          XM 5.1
        </div>
        <div className="mt-2 text-sm font-semibold text-white/60">
          {statusText}
        </div>
      </div>
    </main>
  );
}
