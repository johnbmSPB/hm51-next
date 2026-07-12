"use client";

import { useEffect } from "react";

const KEYBOARD_CLASS = "hm51-chat-keyboard-open";

function hideBottomNavForKeyboard() {
  document.body.classList.add(KEYBOARD_CLASS);
}

function showBottomNavAfterKeyboard() {
  document.body.classList.remove(KEYBOARD_CLASS);
}

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
  nav.style.removeProperty("display");
}

function showBottomNavStable() {
  showBottomNavAfterKeyboard();
  clearBottomNavInlineStyles();
  window.scrollTo(0, 0);
}

function resetViewport() {
  hideBottomNavForKeyboard();

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
  }, 120);

  window.setTimeout(showBottomNavStable, 420);
  window.setTimeout(showBottomNavStable, 760);
  window.setTimeout(showBottomNavStable, 1100);
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

    function onFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches('textarea[placeholder="Сообщение..."]')) {
        hideBottomNavForKeyboard();
        clearBottomNavInlineStyles();
      }
    }

    function onFocusOut(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.matches('textarea[placeholder="Сообщение..."]')) return;
      window.setTimeout(showBottomNavStable, 260);
      window.setTimeout(showBottomNavStable, 600);
      window.setTimeout(showBottomNavStable, 1000);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        window.setTimeout(showBottomNavStable, 120);
      }
    }

    document.addEventListener("click", onSendAction, true);
    document.addEventListener("touchend", onSendAction, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("visibilitychange", onVisibilityChange, true);

    clearBottomNavInlineStyles();
    showBottomNavAfterKeyboard();

    return () => {
      showBottomNavAfterKeyboard();
      document.removeEventListener("click", onSendAction, true);
      document.removeEventListener("touchend", onSendAction, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("visibilitychange", onVisibilityChange, true);
    };
  }, []);

  return null;
}
