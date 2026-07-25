"use client";

import { useEffect, useState, type ReactNode } from "react";

type AccessState = "checking" | "allowed" | "denied";

function rememberCoachRole(roles: string[]) {
  const normalized = Array.from(
    new Set(
      roles
        .map((role) => String(role || "").trim().toUpperCase())
        .filter((role) => role === "PLAYER" || role === "COACH")
    )
  );

  if (!normalized.includes("COACH")) normalized.push("COACH");
  localStorage.setItem("hm51_roles", JSON.stringify(normalized));
  localStorage.setItem("hm51_active_role", "COACH");
}

export default function CoachAccessBoundary({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>("checking");

  useEffect(() => {
    let active = true;

    async function verifyAccess() {
      const token =
        localStorage.getItem("hm51_token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("hm51_token") ||
        sessionStorage.getItem("auth_token") ||
        "";

      if (!token) {
        window.location.replace("/login");
        return;
      }

      try {
        const response = await fetch("/api/coach/access", {
          method: "POST",
          headers: { "Content-Type": "application/json;charset=UTF-8" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });

        let json: any = {};
        try {
          json = await response.json();
        } catch {
          json = {};
        }

        if (!active) return;

        if (response.ok && json.result !== false && json.allowed === true) {
          rememberCoachRole(Array.isArray(json.roles) ? json.roles : []);
          setState("allowed");
          return;
        }

        setState("denied");

        if (response.status === 403) {
          localStorage.setItem("hm51_active_role", "PLAYER");
          window.location.replace("/calendar");
          return;
        }

        window.location.replace("/login");
      } catch {
        if (!active) return;
        setState("denied");
        window.location.replace("/login");
      }
    }

    void verifyAccess();

    return () => {
      active = false;
    };
  }, []);

  if (state !== "allowed") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#121715] text-white/50">
        {state === "checking" ? "Проверяем доступ тренера…" : "Доступ не подтверждён"}
      </main>
    );
  }

  return <>{children}</>;
}
