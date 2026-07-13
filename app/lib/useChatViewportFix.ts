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
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          overscroll-behavior: none;
        }

        [data-hm51-chat-main="true"] {
          height: 100dvh !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
          overflow: hidden !important;
        }

        [data-hm51-chat-messages="true"] {
          min-height: 0 !important;
          overflow-y: auto !important;
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

    function getChatMessagesElement() {
      return document.querySelector('[data-hm51-chat-messages="true"]') as HTMLElement | null;
    }

    function getTextarea() {
      return document.querySelector('footer[data-hm51-chat-input="true"] textarea') as HTMLTextAreaElement | null;
    }

    function scrollMessagesBottom() {
      const messagesElement = getChatMessagesElement();
      if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight;
    }

    function updateKeyboardState(shouldScrollBottom = false) {
      root.classList.add("hm51-chat-active");

      const textareaFocused = document.activeElement === getTextarea();
      document.body.classList.toggle("hm51-chat-keyboard-open", textareaFocused);

      if (shouldScrollBottom) {
        window.setTimeout(scrollMessagesBottom, 50);
        window.setTimeout(scrollMessagesBottom, 250);
      }
    }

    function updateDuringKeyboardAnimation() {
      updateKeyboardState(false);
      window.setTimeout(() => updateKeyboardState(false), 80);
      window.setTimeout(() => updateKeyboardState(false), 180);
      window.setTimeout(() => updateKeyboardState(false), 320);
      window.setTimeout(() => updateKeyboardState(false), 520);
    }

    ensureStyle();
    updateKeyboardState(true);

    const onResize = () => updateKeyboardState(false);
    const onScroll = () => updateKeyboardState(false);
    const onFocusIn = () => updateDuringKeyboardAnimation();
    const onFocusOut = () => updateDuringKeyboardAnimation();
    const onOrientationChange = () => window.setTimeout(() => updateKeyboardState(true), 300);

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      root.classList.remove("hm51-chat-active");
      document.body.classList.remove("hm51-chat-keyboard-open");

      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}
