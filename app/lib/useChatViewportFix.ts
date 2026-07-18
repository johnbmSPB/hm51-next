"use client";

import { useEffect } from "react";

const STYLE_ID = "hm51-chat-viewport-fix-style";

const CHAT_VIEWPORT_CSS = `
  html.hm51-chat-active,
  html.hm51-chat-active body {
    width: 100%;
    min-height: 100%;
    margin: 0;
    overflow: hidden;
    overscroll-behavior: none;
  }

  [data-hm51-chat-main="true"] {
    position: absolute !important;
    top: var(--hm51-chat-top, 0px) !important;
    left: var(--hm51-chat-left, 0px) !important;
    right: auto !important;
    bottom: auto !important;
    width: var(--hm51-chat-width, 100vw) !important;
    height: var(--hm51-chat-height, 100dvh) !important;
    min-height: 0 !important;
    max-height: var(--hm51-chat-height, 100dvh) !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    transform: none !important;
  }

  [data-hm51-chat-messages="true"] {
    position: relative !important;
    order: 2 !important;
    min-height: 0 !important;
    flex: 1 1 0 !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    overflow-anchor: none !important;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 1.25rem !important;
  }

  [data-hm51-chat-main="true"] > header {
    position: relative !important;
    order: 1 !important;
    flex: 0 0 auto !important;
  }

  [data-hm51-chat-input="true"] {
    position: relative !important;
    order: 3 !important;
    inset: auto !important;
    z-index: 50 !important;
    width: 100% !important;
    flex: 0 0 auto !important;
    visibility: visible !important;
    transform: none !important;
    margin: 0 !important;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }

  body.hm51-chat-keyboard-open [data-hm51-chat-input="true"] {
    padding-bottom: 8px;
  }

  [data-hm51-chat-main="true"] input,
  [data-hm51-chat-main="true"] textarea {
    font-size: 16px !important;
  }

  body.hm51-chat-keyboard-open [data-chat-bottom-nav="true"] {
    display: none !important;
  }
`;

export function useChatViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = CHAT_VIEWPORT_CSS;

    function getTextarea() {
      return document.querySelector(
        'footer[data-hm51-chat-input="true"] textarea'
      ) as HTMLTextAreaElement | null;
    }

    function getMessages() {
      return document.querySelector(
        '[data-hm51-chat-messages="true"]'
      ) as HTMLElement | null;
    }

    function textareaFocused() {
      return document.activeElement === getTextarea();
    }

    function updateLayout() {
      const viewport = window.visualViewport;
      const width = Math.max(
        1,
        Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth || 1)
      );
      const height = Math.max(
        1,
        Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 1)
      );
      const left = Math.max(0, Math.round(viewport?.offsetLeft || 0));
      const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
      const isKeyboardOpen = textareaFocused();

      root.classList.add("hm51-chat-active");
      root.style.setProperty("--hm51-chat-width", `${width}px`);
      root.style.setProperty("--hm51-chat-height", `${height}px`);
      root.style.setProperty("--hm51-chat-left", `${left}px`);
      root.style.setProperty("--hm51-chat-top", `${top}px`);
      document.body.classList.toggle("hm51-chat-keyboard-open", isKeyboardOpen);

      if (isKeyboardOpen) {
        const messages = getMessages();
        if (messages) {
          const distanceFromBottom =
            messages.scrollHeight - messages.scrollTop - messages.clientHeight;
          if (distanceFromBottom < 180) messages.scrollTop = messages.scrollHeight;
        }
      }
    }

    function scheduleUpdate() {
      updateLayout();
      window.setTimeout(updateLayout, 30);
      window.setTimeout(updateLayout, 90);
      window.setTimeout(updateLayout, 180);
      window.setTimeout(updateLayout, 320);
      window.setTimeout(updateLayout, 520);
    }

    updateLayout();

    const onResize = () => scheduleUpdate();
    const onViewportScroll = () => scheduleUpdate();
    const onFocusIn = () => scheduleUpdate();
    const onFocusOut = () => scheduleUpdate();
    const onInput = () => scheduleUpdate();
    const onOrientationChange = () => window.setTimeout(scheduleUpdate, 300);

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onViewportScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput);

    return () => {
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-width");
      root.style.removeProperty("--hm51-chat-height");
      root.style.removeProperty("--hm51-chat-left");
      root.style.removeProperty("--hm51-chat-top");
      document.body.classList.remove("hm51-chat-keyboard-open");
      style?.remove();

      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onViewportScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onInput);
    };
  }, []);
}
