"use client";

import { useEffect } from "react";

const INPUT_HEIGHT = 40;

function fixTextareaHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = `${INPUT_HEIGHT}px`;
  textarea.style.minHeight = `${INPUT_HEIGHT}px`;
  textarea.style.maxHeight = `${INPUT_HEIGHT}px`;
  textarea.style.overflowY = "auto";
}

export default function ChatInputAutosizeFix() {
  useEffect(() => {
    function getTextarea() {
      return document.querySelector<HTMLTextAreaElement>(
        'footer[data-hm51-chat-input="true"] textarea'
      );
    }

    function apply() {
      const textarea = getTextarea();
      if (!textarea) return;
      fixTextareaHeight(textarea);
    }

    function onFocusOrInput(event: Event) {
      const target = event.target as HTMLTextAreaElement | null;
      if (!target?.matches('footer[data-hm51-chat-input="true"] textarea')) return;
      fixTextareaHeight(target);
    }

    document.addEventListener("focusin", onFocusOrInput, true);
    document.addEventListener("input", onFocusOrInput, true);

    window.requestAnimationFrame(apply);
    window.setTimeout(apply, 80);
    window.setTimeout(apply, 300);

    return () => {
      document.removeEventListener("focusin", onFocusOrInput, true);
      document.removeEventListener("input", onFocusOrInput, true);
    };
  }, []);

  return null;
}
