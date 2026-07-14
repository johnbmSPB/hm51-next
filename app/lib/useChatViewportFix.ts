"use client";

import { useEffect } from "react";

export function useChatViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const styleId = "hm51-chat-viewport-fix-style";
    let fullViewportHeight = Math.round(window.innerHeight || window.visualViewport?.height || 0);
    let lockedKeyboardBottom: number | null = null;
    let unlockTimer: number | null = null;

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

    function measuredKeyboardBottomOffset() {
      const visualViewport = window.visualViewport;
      const activeTextarea = textareaFocused();

      if (!activeTextarea || !visualViewport) return 0;

      fullViewportHeight = Math.max(
        fullViewportHeight,
        Math.round(window.innerHeight || 0),
        Math.round(visualViewport.height || 0)
      );

      const byInnerHeight = Math.round(
        (window.innerHeight || fullViewportHeight) - visualViewport.height - visualViewport.offsetTop
      );
      const byFullHeight = Math.round(fullViewportHeight - visualViewport.height - visualViewport.offsetTop);

      return Math.max(0, byInnerHeight, byFullHeight);
    }

    function keyboardBottomOffset(forceMeasure = false) {
      const activeTextarea = textareaFocused();
      if (!activeTextarea) return 0;
      if (!forceMeasure && lockedKeyboardBottom !== null) return lockedKeyboardBottom;
      return measuredKeyboardBottomOffset();
    }

    function updateKeyboardState(forceMeasure = false) {
      root.classList.add("hm51-chat-active");

      const activeTextarea = textareaFocused();
      const keyboardBottom = keyboardBottomOffset(forceMeasure);

      root.style.setProperty("--hm51-keyboard-bottom", `${keyboardBottom}px`);
      document.body.classList.toggle("hm51-chat-keyboard-open", activeTextarea);
    }

    function lockKeyboardOffset() {
      if (!textareaFocused()) return;
      lockedKeyboardBottom = measuredKeyboardBottomOffset();
      updateKeyboardState(false);
    }

    function updateDuringKeyboardOpen() {
      if (unlockTimer) window.clearTimeout(unlockTimer);
      lockedKeyboardBottom = null;

      updateKeyboardState(true);
      window.setTimeout(() => updateKeyboardState(true), 40);
      window.setTimeout(() => updateKeyboardState(true), 90);
      window.setTimeout(() => updateKeyboardState(true), 160);
      window.setTimeout(() => updateKeyboardState(true), 260);
      window.setTimeout(() => updateKeyboardState(true), 420);
      window.setTimeout(lockKeyboardOffset, 650);
    }

    function updateDuringKeyboardClose() {
      lockedKeyboardBottom = null;
      updateKeyboardState(true);
      unlockTimer = window.setTimeout(() => {
        lockedKeyboardBottom = null;
        root.style.setProperty("--hm51-keyboard-bottom", "0px");
        document.body.classList.remove("hm51-chat-keyboard-open");
      }, 300);
    }

    ensureStyle();
    updateKeyboardState(true);

    const onResize = () => {
      if (textareaFocused() && lockedKeyboardBottom !== null) return;
      updateKeyboardState(true);
    };
    const onFocusIn = () => updateDuringKeyboardOpen();
    const onFocusOut = () => updateDuringKeyboardClose();
    const onOrientationChange = () => {
      lockedKeyboardBottom = null;
      window.setTimeout(() => updateKeyboardState(true), 300);
    };

    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      if (unlockTimer) window.clearTimeout(unlockTimer);
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-keyboard-bottom");
      document.body.classList.remove("hm51-chat-keyboard-open");

      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}
