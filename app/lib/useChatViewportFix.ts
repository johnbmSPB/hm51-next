"use client";

import { useEffect } from "react";

export function useChatViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const styleId = "hm51-chat-viewport-fix-style";
    let frame = 0;
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

        [data-hm51-chat-main="true"] {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          min-height: 0 !important;
          max-height: 100dvh !important;
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
          padding-bottom: calc(1.25rem + var(--hm51-chat-keyboard-space, 0px)) !important;
        }

        [data-hm51-chat-input="true"] {
          position: relative !important;
          z-index: 70 !important;
          flex: 0 0 auto !important;
          visibility: visible !important;
          transform: translate3d(0, var(--hm51-chat-input-shift, 0px), 0) !important;
          will-change: transform;
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

    function textareaFocused() {
      return document.activeElement === getTextarea();
    }

    function visibleViewportBottom() {
      const viewport = window.visualViewport;
      if (!viewport) return window.innerHeight;
      return viewport.offsetTop + viewport.height;
    }

    function applyMeasuredPosition() {
      const footer = getFooter();
      const isKeyboardOpen = textareaFocused();

      root.classList.add("hm51-chat-active");
      document.body.classList.toggle("hm51-chat-keyboard-open", isKeyboardOpen);

      root.style.setProperty("--hm51-chat-input-shift", "0px");
      root.style.setProperty("--hm51-chat-keyboard-space", "0px");

      if (!footer || !isKeyboardOpen) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const visibleBottom = visibleViewportBottom();
        const footerBottom = footer.getBoundingClientRect().bottom;
        const overlap = Math.max(0, Math.ceil(footerBottom - visibleBottom + 8));

        root.style.setProperty("--hm51-chat-input-shift", `${-overlap}px`);
        root.style.setProperty("--hm51-chat-keyboard-space", `${overlap}px`);

        const messages = document.querySelector('[data-hm51-chat-messages="true"]') as HTMLElement | null;
        if (messages) {
          const distanceFromBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
          if (distanceFromBottom < 140 + overlap) {
            messages.scrollTop = messages.scrollHeight;
          }
        }
      });
    }

    function scheduleUpdate() {
      applyMeasuredPosition();
      window.setTimeout(applyMeasuredPosition, 30);
      window.setTimeout(applyMeasuredPosition, 90);
      window.setTimeout(applyMeasuredPosition, 180);
      window.setTimeout(applyMeasuredPosition, 320);
      window.setTimeout(applyMeasuredPosition, 520);
    }

    ensureStyle();
    applyMeasuredPosition();

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

    const footer = getFooter();
    if (footer && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => scheduleUpdate());
      resizeObserver.observe(footer);
    }

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-chat-input-shift");
      root.style.removeProperty("--hm51-chat-keyboard-space");
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
