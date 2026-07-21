"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PwaStartRedirect() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (pathname !== "/") return;

    const navigatorWithStandalone =
      navigator as Navigator & {
        standalone?: boolean;
      };

    const installed =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.matchMedia(
        "(display-mode: fullscreen)"
      ).matches ||
      navigatorWithStandalone.standalone === true;

    if (installed) {
      window.location.replace("/app-start");
    }
  }, [pathname]);

  return null;
}
