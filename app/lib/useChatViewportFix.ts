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
          display: flex !important;
          flex-direction: column !important;
          height: var(--hm51-chat-height, 100dvh) !important;
          min-height: var(--hm51-chat-height, 100dvh) !important;
          max-height: var(--hm51-chat-height, 100dvh) !important;
          overflow: hidden !important;
        }

        [data-hm51-chat-messages="true"] {
          min-height: 0 !important;
          flex: 1 1 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          overflow-anchor: none !important;
          -webkit-overflow-scrolling: touch;
        }

        [data-hm51-chat-input="true"] {
          flex: 0 0 auto !important;
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

    function getFooter() {
      return document.querySelector('footer[data-hm51-chat-input="true"]') as HTMLElement | null;
    }

    function textareaFocused() {
      return document.activeElement === getTextarea();
    }

    function viewportRect() {
      const viewport = window.visualViewport;
      return {
        top: Math.round(viewport?.offsetTop || 0),
        height: Math.max(320, Math.round(viewport?.height || window.innerHeight || 0)),
      };
    }

    function footerHeight() {
      const footer = getFooter();
      return Math.max(58, Math.round(footer?.offsetHeight || 62));
    }

    function updateChatLayout() {
      const viewport = viewportRect();
      const isKeyboardOpen = textareaFocused();
      const inputTop = Math.max(0, viewport.top + viewport.height - footerHeight() - 8);

      root.classList.add("hm51-chat-active");
      root.style.setProperty("--hm51-chat-height", `${viewport.height}px`);
      root.style.setProperty("--hm51-chat-input-top", `${inputTop}px`);
      document.body.classList.toggle("hm51-chat-keyboard-open", isKeyboardOpen);
    }

    function scheduleUpdate() {
      updateChatLayout();
      window.setTimeout(updateChatLayout, 50);
      window.setTimeout(updateChatLayout, 160);
      window.setTimeout(updateChatLayout, 320);
      window.setTimeout(updateChatLayout, 520);
    }

    ensureStyle();
    updateChatLayout();

    const onResize = () => updateChatLayout();
    const onViewportScroll = () => updateChatLayout();
    const onFocusIn = () => scheduleUpdate();
    const onFocusOut = () => scheduleUpdate();
    const onOrientationChange = () => window.setTimeout(updateChatLayout, 300);

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onViewportScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-height");
      root.style.removeProperty("--hm51-chat-input-top");
      document.body.classList.remove("hm51-chat-keyboard-open");

      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onViewportScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}
