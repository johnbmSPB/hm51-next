"use client";

import { useEffect } from "react";

function clearBottomNavInlineStyles() {
  const nav = document.querySelector<HTMLElement>('nav[data-chat-bottom-nav="true"]');
  if (!nav) return;

  nav.style.removeProperty("position");
  nav.style.removeProperty("bottom");
  nav.style.removeProperty("left");
  nav.style.removeProperty("right");
  nav.style.removeProperty("width");
  nav.style.removeProperty("max-width");
  nav.style.removeProperty("margin-left");
  nav.style.removeProperty("margin-right");
  nav.style.removeProperty("transform");
}

function resetViewport() {
  const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Сообщение..."]');
  textarea?.blur();

  const active = document.activeElement as HTMLElement | null;
  if (active && typeof active.blur === "function") active.blur();

  clearBottomNavInlineStyles();

  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    clearBottomNavInlineStyles();
  });

  window.setTimeout(() => {
    window.scrollTo(0, 0);
    clearBottomNavInlineStyles();
  }, 80);

  window.setTimeout(() => {
    window.scrollTo(0, 0);
    clearBottomNavInlineStyles();
  }, 260);

  window.setTimeout(() => {
    window.scrollTo(0, 0);
    clearBottomNavInlineStyles();
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
      window.setTimeout(clearBottomNavInlineStyles, 80);
    }

    document.addEventListener("click", onSendAction, true);
    document.addEventListener("touchend", onSendAction, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusout", onFocusOut, true);

    clearBottomNavInlineStyles();

    return () => {
      document.removeEventListener("click", onSendAction, true);
      document.removeEventListener("touchend", onSendAction, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);

  return null;
}
