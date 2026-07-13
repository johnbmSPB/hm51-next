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
          height: var(--hm51-chat-height);
          min-height: var(--hm51-chat-height);
          overflow: hidden;
          overscroll-behavior: none;
        }

        [data-hm51-chat-main="true"] {
          height: var(--hm51-chat-height) !important;
          min-height: var(--hm51-chat-height) !important;
          max-height: var(--hm51-chat-height) !important;
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
      return document.querySelector(
        '[data-hm51-chat-messages="true"]'
      ) as HTMLElement | null;
    }

    function scrollMessagesBottom() {
      const messagesElement = getChatMessagesElement();

      if (messagesElement) {
        messagesElement.scrollTop = messagesElement.scrollHeight;
      }
    }

    function updateViewportHeight(shouldScrollBottom = false) {
      const height = Math.round(
        window.visualViewport?.height || window.innerHeight
      );

      root.style.setProperty("--hm51-chat-height", `${height}px`);
      root.classList.add("hm51-chat-active");

      if (shouldScrollBottom) {
        window.scrollTo(0, 0);

        setTimeout(() => {
          window.scrollTo(0, 0);
          scrollMessagesBottom();
        }, 50);

        setTimeout(() => {
          window.scrollTo(0, 0);
          scrollMessagesBottom();
        }, 250);
      }
    }

    ensureStyle();
    updateViewportHeight(true);

    const onResize = () => updateViewportHeight(true);
    const onScroll = () => updateViewportHeight(false);
    const onFocusIn = () => updateViewportHeight(false);
    const onFocusOut = () => updateViewportHeight(true);
    const onOrientationChange = () => {
      setTimeout(() => updateViewportHeight(true), 300);
    };

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-height");

      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}
