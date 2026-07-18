"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { normalizeText } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

function shortText(value: string, max = 96) {
  const normalized = normalizeText(value);
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

export default function ChatComposer({ chat }: { chat: Controller }) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void chat.sendMessage();
    }
  }

  function onSendPointerDown(event: PointerEvent<HTMLButtonElement>) {
    // На iPhone обычный click приходит уже после blur textarea и закрытия
    // клавиатуры. Нижняя панель успевает сдвинуться, поэтому первый tap
    // теряется. Отправляем до blur и не даём браузеру снять фокус с поля.
    event.preventDefault();
    event.stopPropagation();
    if (!chat.canSend) return;
    void chat.sendMessage();
  }

  return (
    <footer data-hm51-chat-input="true" className="shrink-0 border-t border-white/5 bg-[#121715]/95 px-2 py-3 backdrop-blur">
      {(chat.editingMessage || chat.quoteMessage) && (
        <div className="mx-auto mb-2 flex w-[calc(100%-24px)] max-w-md items-start justify-between gap-3 rounded-3xl bg-white/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#20d1a8]/75">
              {chat.editingMessage ? "Редактирование" : `Ответ на ${chat.quoteMessage?.author || "сообщение"}`}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white/55">
              {chat.editingMessage
                ? shortText(chat.editingMessage.text)
                : shortText(chat.quoteMessage?.text || "")}
            </p>
          </div>
          <button
            type="button"
            onClick={chat.cancelComposeMode}
            className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white/55"
          >
            ×
          </button>
        </div>
      )}

      <div data-hm51-chat-input-row="true" className="mx-auto flex w-[calc(100%-24px)] max-w-md items-center gap-2 rounded-[30px] border border-white/10 bg-white/5 p-1.5">
        <textarea
          ref={chat.inputRef}
          value={chat.messageText}
          onChange={(event) => chat.setMessageText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={chat.editingMessage ? "Исправьте сообщение..." : chat.quoteMessage ? "Ответить..." : "Сообщение..."}
          rows={1}
          className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-4 py-[10px] text-[17px] font-semibold leading-6 text-white outline-none placeholder:text-white/30"
        />
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
    </footer>
  );
}
