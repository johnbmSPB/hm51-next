"use client";

import { useEffect } from "react";

export function useChatViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const styleId = "hm51-chat-viewport-fix-style";
    let fullViewportHeight = Math.round(window.innerHeight || window.visualViewport?.height || 0);

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

    function lockWindowScroll() {
      if (!textareaFocused()) return;

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    }

    function keyboardBottomOffset() {
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

    function updateKeyboardState() {
      root.classList.add("hm51-chat-active");

      const activeTextarea = textareaFocused();
      const keyboardBottom = keyboardBottomOffset();

      root.style.setProperty("--hm51-keyboard-bottom", `${keyboardBottom}px`);
      document.body.classList.toggle("hm51-chat-keyboard-open", activeTextarea);

      lockWindowScroll();
    }

    function updateDuringKeyboardAnimation() {
      updateKeyboardState();
      window.setTimeout(updateKeyboardState, 40);
      window.setTimeout(updateKeyboardState, 90);
      window.setTimeout(updateKeyboardState, 160);
      window.setTimeout(updateKeyboardState, 260);
      window.setTimeout(updateKeyboardState, 420);
      window.setTimeout(updateKeyboardState, 650);
    }

    function onTypingEvent(event: Event) {
      const target = event.target as HTMLElement | null;
      if (!target?.matches('footer[data-hm51-chat-input="true"] textarea')) return;
      window.requestAnimationFrame(lockWindowScroll);
    }

    ensureStyle();
    updateKeyboardState();

    const onResize = () => updateKeyboardState();
    const onScroll = () => updateKeyboardState();
    const onFocusIn = () => updateDuringKeyboardAnimation();
    const onFocusOut = () => updateDuringKeyboardAnimation();
    const onOrientationChange = () => window.setTimeout(updateKeyboardState, 300);

    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);
    window.addEventListener("scroll", lockWindowScroll, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onTypingEvent, true);

    return () => {
      root.classList.remove("hm51-chat-active");
      root.style.removeProperty("--hm51-keyboard-bottom");
      document.body.classList.remove("hm51-chat-keyboard-open");

      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("scroll", lockWindowScroll, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onTypingEvent, true);
    };
  }, []);
}