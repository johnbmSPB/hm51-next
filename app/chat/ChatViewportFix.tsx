"use client";

import { useEffect } from "react";

function resetBottomNav() {
  const nav = document.querySelector<HTMLElement>('nav[data-chat-bottom-nav="true"]');
  if (!nav) return;

  nav.style.position = "fixed";
  nav.style.bottom = "1.25rem";
  nav.style.left = "50%";
  nav.style.right = "auto";
  nav.style.width = "calc(100% - 24px)";
  nav.style.maxWidth = "28rem";
  nav.style.transform = "translateX(-50%)";
}

function resetViewport() {
  const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Сообщение..."]');
  textarea?.blur();

  const active = document.activeElement as HTMLElement | null;
  if (active && typeof active.blur === "function") active.blur();

  resetBottomNav();

  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    resetBottomNav();
  });

  window.setTimeout(() => {
    window.scrollTo(0, 0);
    resetBottomNav();
  }, 80);

  window.setTimeout(() => {
    window.scrollTo(0, 0);
    resetBottomNav();
  }, 260);

  window.setTimeout(() => {
    window.scrollTo(0, 0);
    resetBottomNav();
  }, 600);
}

export default function ChatViewportFix() {
  useEffect(() => {
    function onSendAction(event: Event) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('button[aria-label="Отправить сообщение"]')) return;
      window.setTimeout(resetViewport, 0);
      window.setTimeout(resetViewport, 180);
      window.setTimeout(resetViewport, 500);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('textarea[placeholder="Сообщение..."]')) {
        window.setTimeout(resetViewport, 0);
        window.setTimeout(resetViewport, 180);
        window.setTimeout(resetViewport, 500);
      }
    }

    function onFocusOut() {
      window.setTimeout(resetViewport, 80);
    }

    document.addEventListener("click", onSendAction, true);
    document.addEventListener("touchend", onSendAction, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusout", onFocusOut, true);
    window.visualViewport?.addEventListener("resize", resetBottomNav);
    window.visualViewport?.addEventListener("scroll", resetBottomNav);

    resetBottomNav();

    return () => {
      document.removeEventListener("click", onSendAction, true);
      document.removeEventListener("touchend", onSendAction, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusout", onFocusOut, true);
      window.visualViewport?.removeEventListener("resize", resetBottomNav);
      window.visualViewport?.removeEventListener("scroll", resetBottomNav);
    };
  }, []);

  return null;
}
