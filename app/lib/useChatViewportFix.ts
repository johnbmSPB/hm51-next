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
          inset: 0;
        }

        [data-hm51-chat-main="true"] {
          position: fixed !important;
          top: var(--hm51-chat-top, 0px) !important;
          left: var(--hm51-chat-left, 0px) !important;
          width: var(--hm51-chat-width, 100vw) !important;
          height: var(--hm51-chat-height, 100dvh) !important;
          min-height: 0 !important;
          max-height: var(--hm51-chat-height, 100dvh) !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          transform: translateZ(0);
          contain: layout paint;
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

    function viewportRect() {
      const viewport = window.visualViewport;
      const fallbackWidth = window.innerWidth || document.documentElement.clientWidth || 0;

      return {
        left: Math.max(0, Math.round(viewport?.offsetLeft || 0)),
        top: Math.max(0, Math.round(viewport?.offsetTop || 0)),
        width: Math.max(320, Math.round(viewport?.width || fallbackWidth || 0)),
        height: Math.max(320, Math.round(viewport?.height || window.innerHeight || 0)),
      };
    }

    function updateChatLayout() {
      const viewport = viewportRect();
      const isKeyboardOpen = textareaFocused();

      root.classList.add("hm51-chat-active");
      root.style.setProperty("--hm51-chat-top", `${viewport.top}px`);
      root.style.setProperty("--hm51-chat-left", `${viewport.left}px`);
      root.style.setProperty("--hm51-chat-width", `${viewport.width}px`);
      root.style.setProperty("--hm51-chat-height", `${viewport.height}px`);
      document.body.classList.toggle("hm51-chat-keyboard-open", isKeyboardOpen);
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
      root.style.removeProperty("--hm51-chat-top");
      root.style.removeProperty("--hm51-chat-left");
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
