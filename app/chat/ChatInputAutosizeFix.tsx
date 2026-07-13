"use client";

import { useEffect } from "react";

const MAX_INPUT_HEIGHT = 104;
const MIN_INPUT_HEIGHT = 40;

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";

  const nextHeight = Math.max(
    MIN_INPUT_HEIGHT,
    Math.min(textarea.scrollHeight, MAX_INPUT_HEIGHT)
  );

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > MAX_INPUT_HEIGHT ? "auto" : "hidden";
}

export default function ChatInputAutosizeFix() {
  useEffect(() => {
    function getTextarea() {
      return document.querySelector<HTMLTextAreaElement>(
        'footer[data-hm51-chat-input="true"] textarea'
      );
    }

    function resizeCurrentTextarea() {
      const textarea = getTextarea();
      if (!textarea) return;
      resizeTextarea(textarea);
    }

    function onInput(event: Event) {
      const target = event.target as HTMLTextAreaElement | null;
      if (!target?.matches('footer[data-hm51-chat-input="true"] textarea')) return;
      resizeTextarea(target);
    }

    document.addEventListener("input", onInput, true);
    document.addEventListener("focusin", onInput, true);

    const interval = window.setInterval(resizeCurrentTextarea, 250);
    window.requestAnimationFrame(resizeCurrentTextarea);
    window.setTimeout(resizeCurrentTextarea, 80);

    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("focusin", onInput, true);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
