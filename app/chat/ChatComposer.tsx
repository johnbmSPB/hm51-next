"use client";

import { useLayoutEffect, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";
import { CHAT_MESSAGE_MAX_LENGTH } from "../lib/chatLimits";
import { normalizeText } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

const MIN_INPUT_HEIGHT = 44;
const MAX_INPUT_HEIGHT = 120;

function shortText(value: string, max = 96) {
  const normalized = normalizeText(value);
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const nextHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(textarea.scrollHeight, MAX_INPUT_HEIGHT));
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > MAX_INPUT_HEIGHT ? "auto" : "hidden";
}

export default function ChatComposer({ chat }: { chat: Controller }) {
  useLayoutEffect(() => {
    const textarea = chat.inputRef.current;
    if (textarea) resizeTextarea(textarea);
  }, [chat.messageText, chat.editingMessage, chat.quoteMessage, chat.inputRef]);

  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.currentTarget.value.slice(0, CHAT_MESSAGE_MAX_LENGTH);
    resizeTextarea(event.currentTarget);
    chat.setMessageText(nextValue);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void chat.sendMessage();
    }
  }

  function onSendPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!chat.canSend) return;
    void chat.sendMessage();
  }

  const showCounter = chat.messageText.length >= CHAT_MESSAGE_MAX_LENGTH - 400;
  const composeMode = chat.editingMessage || chat.quoteMessage;

  return (
    <footer data-hm51-chat-input="true" className="shrink-0 bg-transparent px-2 py-1">
      <div
        className={`mx-auto w-[calc(100%-24px)] max-w-md ${
          composeMode
            ? "overflow-hidden rounded-[30px] border border-white/10 bg-white/5"
            : "bg-transparent"
        }`}
      >
        {composeMode && (
          <div className="flex min-h-[58px] items-center gap-3 border-b border-white/8 px-3 py-2.5">
            <div className="h-10 w-1 shrink-0 rounded-full bg-[#20d1a8]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#20d1a8]">
                {chat.editingMessage
                  ? "Редактирование"
                  : `В ответ ${chat.quoteMessage?.author || "сообщение"}`}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white/50">
                {chat.editingMessage
                  ? shortText(chat.editingMessage.text)
                  : shortText(chat.quoteMessage?.text || "")}
              </p>
            </div>
            <button
              type="button"
              onClick={chat.cancelComposeMode}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-3xl font-light leading-none text-white/55 active:bg-white/10"
              aria-label="Отменить ответ"
            >
              ×
            </button>
          </div>
        )}

        <div
          data-hm51-chat-input-row="true"
          className={`relative flex items-end gap-2 p-1.5 ${
            composeMode
              ? "bg-transparent"
              : "rounded-[30px] border border-white/10 bg-white/5"
          }`}
        >
          <textarea
            ref={chat.inputRef}
            value={chat.messageText}
            onChange={onChange}
            onKeyDown={onKeyDown}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            placeholder={chat.editingMessage ? "Исправьте сообщение..." : chat.quoteMessage ? "Сообщение" : "Сообщение..."}
            rows={1}
            className="min-h-[44px] max-h-[120px] flex-1 resize-none overflow-y-hidden border-0 bg-transparent px-4 py-[10px] text-[17px] font-semibold leading-6 text-white outline-none placeholder:text-white/30"
          />
          {showCounter && (
            <span className="absolute bottom-[-18px] right-4 text-[10px] font-bold text-white/35">
              {chat.messageText.length}/{CHAT_MESSAGE_MAX_LENGTH}
            </span>
          )}
          <button
            type="button"
            onPointerDown={onSendPointerDown}
            disabled={!chat.canSend}
            className="flex h-11 w-11 shrink-0 touch-none select-none items-center justify-center rounded-full bg-[#20d1a8] text-2xl font-black leading-none text-[#07110c] disabled:opacity-35"
            aria-label="Отправить сообщение"
          >
            {chat.editingMessage ? "✓" : "›"}
          </button>
        </div>
      </div>
    </footer>
  );
}
