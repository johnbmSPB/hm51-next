"use client";

import { useEffect } from "react";

export function useChatViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const styleId = "hm51-chat-viewport-fix-style";

    function ensureStyle() {
      if (document.getElementById(styleId)) return;

      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        html.hm51-chat-active,
        html.hm51-chat-active body {
          height: var(--hm51-chat-height, 100dvh);
          min-height: var(--hm51-chat-height, 100dvh);
          overflow: hidden;
          overscroll-behavior: none;
        }

        [data-hm51-chat-main="true"] {
          height: var(--hm51-chat-height, 100dvh) !important;
          min-height: var(--hm51-chat-height, 100dvh) !important;
          max-height: var(--hm51-chat-height, 100dvh) !important;
          overflow: hidden !important;
        }

        [data-hm51-chat-messages="true"] {
          min-height: 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          overflow-anchor: none !important;
          -webkit-overflow-scrolling: touch;
        }

        [data-hm51-chat-input="true"] {
          flex-shrink: 0 !important;
        }

        [data-hm51-chat-main="true"] input,
        [data-hm51-chat-main="true"] textarea {
          font-size: 16px !important;
        }
      `;

      document.head.appendChild(style);
    }

    function getTextarea() {
      return document.querySelector('footer[data-hm51-chat-input="true"] textarea') as HTMLTextAreaElement | null;
    }

    function textareaFocused() {
      return document.activeElement === getTextarea();
    }

    function visibleHeight() {
      return Math.max(320, Math.round(window.visualViewport?.height || window.innerHeight || 0));
    }

    function updateChatHeight() {
      root.classList.add("hm51-chat-active");
      root.style.setProperty("--hm51-chat-height", `${visibleHeight()}px`);
      document.body.classList.toggle("hm51-chat-keyboard-open", textareaFocused());
    }

    function scheduleUpdate() {
      updateChatHeight();
      window.setTimeout(updateChatHeight, 50);
      window.setTimeout(updateChatHeight, 160);
      window.setTimeout(updateChatHeight, 320);
    }

    ensureStyle();
    updateChatHeight();

    const onResize = () => updateChatHeight();
    const onFocusIn = () => scheduleUpdate();
    const onFocusOut = () => scheduleUpdate();
    const onOrientationChange = () => window.setTimeout(updateChatHeight, 300);

    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-height");
      document.body.classList.remove("hm51-chat-keyboard-open");

      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}
