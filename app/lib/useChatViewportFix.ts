"use client";

import { useEffect } from "react";

export function useChatViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const styleId = "hm51-chat-viewport-fix-style";
    let layoutHeight = 0;
    let resizeObserver: ResizeObserver | null = null;

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
          inset: 0 !important;
          width: 100vw !important;
          height: var(--hm51-chat-layout-height, 100dvh) !important;
          min-height: 0 !important;
          max-height: var(--hm51-chat-layout-height, 100dvh) !important;
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
          padding-bottom: calc(
            1.25rem +
            var(--hm51-chat-composer-height, 76px) +
            var(--hm51-chat-keyboard-inset, 0px)
          ) !important;
        }

        [data-hm51-chat-input="true"] {
          position: fixed !important;
          z-index: 70 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: var(--hm51-chat-keyboard-inset, 0px) !important;
          width: 100% !important;
          visibility: visible !important;
          transform: none !important;
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

      document.head.appendChild(style);
    }

    function getTextarea() {
      return document.querySelector('footer[data-hm51-chat-input="true"] textarea') as HTMLTextAreaElement | null;
    }

    function getFooter() {
      return document.querySelector('footer[data-hm51-chat-input="true"]') as HTMLElement | null;
    }

    function getMessages() {
      return document.querySelector('[data-hm51-chat-messages="true"]') as HTMLElement | null;
    }

    function textareaFocused() {
      return document.activeElement === getTextarea();
    }

    function currentFullHeight() {
      const viewport = window.visualViewport;
      return Math.max(
        1,
        Math.round(window.innerHeight || 0),
        Math.round(document.documentElement.clientHeight || 0),
        Math.round((viewport?.height || 0) + Math.max(0, viewport?.offsetTop || 0))
      );
    }

    function updateLayout() {
      const footer = getFooter();
      const messages = getMessages();
      const viewport = window.visualViewport;
      const isKeyboardOpen = textareaFocused();

      root.classList.add("hm51-chat-active");
      document.body.classList.toggle("hm51-chat-keyboard-open", isKeyboardOpen);

      if (!isKeyboardOpen) {
        layoutHeight = currentFullHeight();
      } else if (!layoutHeight) {
        layoutHeight = Math.max(window.screen.height || 0, currentFullHeight());
      }

      const visibleHeight = Math.max(1, Math.round(viewport?.height || window.innerHeight || layoutHeight));
      const rawInset = isKeyboardOpen ? Math.max(0, layoutHeight - visibleHeight) : 0;
      const maximumInset = Math.round(layoutHeight * 0.62);
      const keyboardInset = Math.min(rawInset, maximumInset);
      const composerHeight = Math.max(58, Math.round(footer?.getBoundingClientRect().height || 70));

      root.style.setProperty("--hm51-chat-layout-height", `${layoutHeight || currentFullHeight()}px`);
      root.style.setProperty("--hm51-chat-keyboard-inset", `${keyboardInset}px`);
      root.style.setProperty("--hm51-chat-composer-height", `${composerHeight}px`);

      if (isKeyboardOpen && messages) {
        const distanceFromBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
        if (distanceFromBottom < composerHeight + 180) {
          messages.scrollTop = messages.scrollHeight;
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

    ensureStyle();
    layoutHeight = currentFullHeight();
    updateLayout();

    const onResize = () => scheduleUpdate();
    const onViewportScroll = () => scheduleUpdate();
    const onFocusIn = () => scheduleUpdate();
    const onFocusOut = () => scheduleUpdate();
    const onInput = () => scheduleUpdate();
    const onOrientationChange = () => {
      layoutHeight = 0;
      window.setTimeout(scheduleUpdate, 300);
    };

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onViewportScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput);

    const footer = getFooter();
    if (footer && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => scheduleUpdate());
      resizeObserver.observe(footer);
    }

    return () => {
      resizeObserver?.disconnect();
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-layout-height");
      root.style.removeProperty("--hm51-chat-keyboard-inset");
      root.style.removeProperty("--hm51-chat-composer-height");
      document.body.classList.remove("hm51-chat-keyboard-open");

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
