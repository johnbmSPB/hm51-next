"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/privacy-policy",
  "/policy",
  "/profile-setup",
  "/coach/profile-setup",
  "/team-code",
  "/connecting-team",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons")
  );
}

export function clearPasswordlessLogin() {
  if (typeof window === "undefined") return;

  Object.keys(localStorage).forEach((key) => {
    if (key.includes("hm51_passwordless")) {
      localStorage.removeItem(key);
    }
  });

  localStorage.setItem("hm51_passwordless_manual_logout", "true");
}

export default function AuthTokenGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isPublicPath(pathname)) return;

    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("hm51_token") ||
      sessionStorage.getItem("auth_token") ||
      "";

    if (!token) {
      localStorage.removeItem("hm51_token");
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("hm51_token");
      sessionStorage.removeItem("auth_token");

      window.location.href = "/login";
    }
  }, [pathname]);

  return null;
}
