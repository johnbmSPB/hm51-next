"use client";

import { useEffect } from "react";
import { useChatViewportFix } from "../lib/useChatViewportFix";

function textareaFocused() {
  const textarea = document.querySelector<HTMLTextAreaElement>(
    'footer[data-hm51-chat-input="true"] textarea'
  );

  return !!textarea && document.activeElement === textarea;
}

function scrollMessagesToBottom() {
  const messages = document.querySelector<HTMLElement>(
    '[data-hm51-chat-messages="true"]'
  );

  if (!messages) return;
  messages.scrollTop = messages.scrollHeight;
}

function scheduleBottomScroll() {
  if (!textareaFocused()) return;

  scrollMessagesToBottom();

  window.requestAnimationFrame(() => {
    scrollMessagesToBottom();
    window.requestAnimationFrame(scrollMessagesToBottom);
  });

  [40, 100, 180, 320, 520].forEach((delay) => {
    window.setTimeout(() => {
      if (textareaFocused()) scrollMessagesToBottom();
    }, delay);
  });
}

export default function ChatViewportFix() {
  useChatViewportFix();

  useEffect(() => {
    const messages = document.querySelector<HTMLElement>(
      '[data-hm51-chat-messages="true"]'
    );
    const input = document.querySelector<HTMLElement>(
      '[data-hm51-chat-input="true"]'
    );

    if (!messages || !input) return;

    const messageObserver = new MutationObserver(() => {
      scheduleBottomScroll();
    });

    messageObserver.observe(messages, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const inputResizeObserver = new ResizeObserver(() => {
      scheduleBottomScroll();
    });
    inputResizeObserver.observe(input);

    const onViewportChange = () => scheduleBottomScroll();
    const onInput = () => scheduleBottomScroll();

    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
    input.addEventListener("input", onInput);

    return () => {
      messageObserver.disconnect();
      inputResizeObserver.disconnect();
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      input.removeEventListener("input", onInput);
    };
  }, []);

  return null;
}
