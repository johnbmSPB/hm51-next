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
    margin-bottom: 4px !important;
    padding-bottom: 8px !important;
    z-index: 0 !important;
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
    margin: 0 0 var(--hm51-chat-nav-space, 0px) 0 !important;
    padding-top: 0 !important;
    padding-bottom: 2px !important;
  }

  body.hm51-chat-keyboard-open [data-hm51-chat-input="true"] {
    margin-bottom: 0 !important;
    padding-bottom: 6px !important;
  }

  body.hm51-chat-keyboard-open [data-hm51-chat-messages="true"] {
    margin-bottom: 3px !important;
    padding-bottom: 6px !important;
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

    let frameId = 0;
    let settleTimerShort = 0;
    let settleTimerLong = 0;
    let orientationTimer = 0;

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

    function getBottomNav() {
      return document.querySelector(
        'nav[data-chat-bottom-nav="true"]'
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
      const viewportBottom = top + height;
      const bottomNav = getBottomNav();
      const navRect = bottomNav?.getBoundingClientRect();
      const navSpace =
        !isKeyboardOpen && navRect
          ? Math.max(0, Math.round(viewportBottom - navRect.top + 8))
          : 0;

      root.classList.add("hm51-chat-active");
      root.style.setProperty("--hm51-chat-width", `${width}px`);
      root.style.setProperty("--hm51-chat-height", `${height}px`);
      root.style.setProperty("--hm51-chat-left", `${left}px`);
      root.style.setProperty("--hm51-chat-top", `${top}px`);
      root.style.setProperty("--hm51-chat-nav-space", `${navSpace}px`);
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

    function requestLayoutFrame() {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateLayout();
      });
    }

    function clearSettleTimers() {
      if (settleTimerShort) window.clearTimeout(settleTimerShort);
      if (settleTimerLong) window.clearTimeout(settleTimerLong);
      settleTimerShort = 0;
      settleTimerLong = 0;
    }

    function scheduleLayout(settle = false) {
      requestLayoutFrame();
      if (!settle) return;

      clearSettleTimers();
      settleTimerShort = window.setTimeout(() => {
        settleTimerShort = 0;
        requestLayoutFrame();
      }, 90);
      settleTimerLong = window.setTimeout(() => {
        settleTimerLong = 0;
        requestLayoutFrame();
      }, 260);
    }

    updateLayout();

    const onResize = () => scheduleLayout(true);
    const onViewportScroll = () => scheduleLayout(false);
    const onFocusIn = () => scheduleLayout(true);
    const onFocusOut = () => scheduleLayout(true);
    const onInput = () => scheduleLayout(false);
    const onOrientationChange = () => {
      if (orientationTimer) window.clearTimeout(orientationTimer);
      scheduleLayout(true);
      orientationTimer = window.setTimeout(() => {
        orientationTimer = 0;
        scheduleLayout(true);
      }, 300);
    };

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onViewportScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      clearSettleTimers();
      if (orientationTimer) window.clearTimeout(orientationTimer);

      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-width");
      root.style.removeProperty("--hm51-chat-height");
      root.style.removeProperty("--hm51-chat-left");
      root.style.removeProperty("--hm51-chat-top");
      root.style.removeProperty("--hm51-chat-nav-space");
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
