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
          width: 100%;
          height: 100%;
          min-height: 100%;
          margin: 0;
          overflow: hidden;
          overscroll-behavior: none;
        }

        html.hm51-chat-active body {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }

        [data-hm51-chat-main="true"] {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          width: var(--hm51-chat-width, 100vw) !important;
          height: var(--hm51-chat-height, 100dvh) !important;
          min-height: 0 !important;
          max-height: var(--hm51-chat-height, 100dvh) !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }

        [data-hm51-chat-messages="true"] {
          min-height: 0 !important;
          flex: 1 1 auto !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          overflow-anchor: none !important;
          -webkit-overflow-scrolling: touch;
        }

        [data-hm51-chat-input="true"] {
          position: relative !important;
          z-index: 50 !important;
          flex: 0 0 auto !important;
          visibility: visible !important;
          transform: translateZ(0);
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }

        body.hm51-chat-keyboard-open [data-hm51-chat-input="true"] {
          padding-bottom: 12px;
        }

        [data-hm51-chat-main="true"] input,
        [data-hm51-chat-main="true"] textarea {
          font-size: 16px !important;
        }

        body.hm51-chat-keyboard-open [data-chat-bottom-nav="true"] {
          display: none !important;
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

    function viewportSize() {
      const viewport = window.visualViewport;
      const fallbackWidth = window.innerWidth || document.documentElement.clientWidth || 1;
      const fallbackHeight = window.innerHeight || document.documentElement.clientHeight || 1;

      return {
        width: Math.max(1, Math.round(viewport?.width || fallbackWidth)),
        height: Math.max(1, Math.round(viewport?.height || fallbackHeight)),
      };
    }

    function updateChatLayout() {
      const viewport = viewportSize();
      const isKeyboardOpen = textareaFocused();

      root.classList.add("hm51-chat-active");
      root.style.setProperty("--hm51-chat-width", `${viewport.width}px`);
      root.style.setProperty("--hm51-chat-height", `${viewport.height}px`);
      document.body.classList.toggle("hm51-chat-keyboard-open", isKeyboardOpen);

      if (isKeyboardOpen && (window.scrollX !== 0 || window.scrollY !== 0)) {
        window.scrollTo(0, 0);
      }
    }

    function scheduleUpdate() {
      updateChatLayout();
      window.setTimeout(updateChatLayout, 30);
      window.setTimeout(updateChatLayout, 90);
      window.setTimeout(updateChatLayout, 180);
      window.setTimeout(updateChatLayout, 320);
      window.setTimeout(updateChatLayout, 520);
    }

    ensureStyle();
    updateChatLayout();

    const onResize = () => scheduleUpdate();
    const onViewportScroll = () => updateChatLayout();
    const onFocusIn = () => scheduleUpdate();
    const onFocusOut = () => scheduleUpdate();
    const onOrientationChange = () => window.setTimeout(scheduleUpdate, 300);

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onViewportScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-width");
      root.style.removeProperty("--hm51-chat-height");
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
