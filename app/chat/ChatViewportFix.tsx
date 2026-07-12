"use client";

import { useEffect } from "react";

function resetViewport() {
  const active = document.activeElement as HTMLElement | null;
  if (active && typeof active.blur === "function") active.blur();

  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });

  window.setTimeout(() => window.scrollTo(0, 0), 80);
  window.setTimeout(() => window.scrollTo(0, 0), 260);
}

export default function ChatViewportFix() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('button[aria-label="Отправить сообщение"]')) return;
      window.setTimeout(resetViewport, 0);
      window.setTimeout(resetViewport, 180);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('textarea[placeholder="Сообщение..."]')) {
        window.setTimeout(resetViewport, 0);
        window.setTimeout(resetViewport, 180);
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
