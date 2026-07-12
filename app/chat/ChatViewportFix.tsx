"use client";

import { useEffect } from "react";

const KEYBOARD_CLASS = "hm51-chat-keyboard-open";

function getChatTextarea() {
  return document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Сообщение..."]');
}

function isChatTextareaFocused() {
  const active = document.activeElement as HTMLElement | null;
  return !!active?.matches?.('textarea[placeholder="Сообщение..."]');
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
  nav.style.removeProperty("visibility");
  nav.style.removeProperty("opacity");
  nav.style.removeProperty("pointer-events");
}

export default function ChatViewportFix() {
  useEffect(() => {
    let fullViewportHeight = window.visualViewport?.height || window.innerHeight || 0;
    let revealTimer: number | undefined;

    function viewportHeight() {
      return window.visualViewport?.height || window.innerHeight || 0;
    }

    function rememberFullViewport() {
      const current = viewportHeight();
      if (!isChatTextareaFocused() && current > fullViewportHeight) {
        fullViewportHeight = current;
      }
    }

    function keyboardLooksOpen() {
      const current = viewportHeight();
      if (!fullViewportHeight || !current) return isChatTextareaFocused();
      return isChatTextareaFocused() || current < fullViewportHeight - 90;
    }

    function hideBottomNav() {
      if (revealTimer) window.clearTimeout(revealTimer);
      document.body.classList.add(KEYBOARD_CLASS);
      clearBottomNavInlineStyles();
    }

    function showBottomNavOnlyWhenKeyboardClosed() {
      clearBottomNavInlineStyles();
      rememberFullViewport();

      if (keyboardLooksOpen()) {
        document.body.classList.add(KEYBOARD_CLASS);
        if (revealTimer) window.clearTimeout(revealTimer);
        revealTimer = window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 120);
        return;
      }

      document.body.classList.remove(KEYBOARD_CLASS);
      window.scrollTo(0, 0);
      clearBottomNavInlineStyles();
    }

    function closeKeyboardAndWait() {
      hideBottomNav();

      const textarea = getChatTextarea();
      textarea?.blur();

      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") active.blur();

      window.requestAnimationFrame(showBottomNavOnlyWhenKeyboardClosed);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 160);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 360);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 700);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 1100);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 1500);
    }

    function onSendAction(event: Event) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('button[aria-label="Отправить сообщение"]')) return;
      closeKeyboardAndWait();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('textarea[placeholder="Сообщение..."]')) closeKeyboardAndWait();
    }

    function onFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches('textarea[placeholder="Сообщение..."]')) hideBottomNav();
    }

    function onFocusOut(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.matches('textarea[placeholder="Сообщение..."]')) return;
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 120);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 360);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 700);
      window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 1100);
    }

    function onViewportChange() {
      if (keyboardLooksOpen()) {
        hideBottomNav();
      } else {
        showBottomNavOnlyWhenKeyboardClosed();
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        window.setTimeout(showBottomNavOnlyWhenKeyboardClosed, 150);
      }
    }

    document.addEventListener("click", onSendAction, true);
    document.addEventListener("touchend", onSendAction, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("visibilitychange", onVisibilityChange, true);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);

    clearBottomNavInlineStyles();
    document.body.classList.remove(KEYBOARD_CLASS);

    return () => {
      if (revealTimer) window.clearTimeout(revealTimer);
      document.body.classList.remove(KEYBOARD_CLASS);
      document.removeEventListener("click", onSendAction, true);
      document.removeEventListener("touchend", onSendAction, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("visibilitychange", onVisibilityChange, true);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    };
  }, []);

  return null;
}
