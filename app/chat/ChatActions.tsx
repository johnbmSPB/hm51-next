"use client";

import { serverIdOf } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

function messageTextOf(message: any) {
  const candidates = [
    message?.text,
    message?.message,
    message?.body,
    message?.content,
    message?.hm51_text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return "";
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function ChatActions({ chat }: { chat: Controller }) {
  const message = chat.actionMessage;
  if (!message) return null;
  const hasServerId = !!serverIdOf(message);
  const queued = chat.isQueuedMessage(message);
  const messageText = messageTextOf(message);

  const copyMessage = async () => {
    if (!messageText) return;

    try {
      await copyText(messageText);
      chat.setActionMessage(null);
    } catch (error) {
      console.error("Не удалось скопировать сообщение", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/45 px-3 pb-4" onClick={() => chat.setActionMessage(null)}>
      <div className="mx-auto w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="overflow-hidden rounded-[28px] bg-[#202622]">
          {(hasServerId || !!message.clientId) && (
            <button type="button" onClick={() => chat.quoteForReply(message)} className="h-14 w-full border-b border-white/5 px-5 text-left font-black text-white">
              Ответить
            </button>
          )}
          {messageText && (
            <button type="button" onClick={copyMessage} className="h-14 w-full border-b border-white/5 px-5 text-left font-black text-white">
              Скопировать сообщение
            </button>
          )}
          {chat.canEditMessage(message) && (
            <button type="button" onClick={() => chat.beginEditMessage(message)} className="h-14 w-full border-b border-white/5 px-5 text-left font-black text-white">
              Изменить
            </button>
          )}
          {message.status === "failed" && (
            <button type="button" onClick={() => chat.retryMessage(message)} className="h-14 w-full border-b border-white/5 px-5 text-left font-black text-[#20d1a8]">
              Отправить повторно
            </button>
          )}
          <button type="button" onClick={() => chat.deleteMessage(message)} className="h-14 w-full px-5 text-left font-black text-red-300">
            {message.isMine && hasServerId
              ? "Удалить у всех"
              : queued
                ? "Отменить отправку"
                : "Удалить с этого устройства"}
          </button>
        </div>
        <button type="button" onClick={() => chat.setActionMessage(null)} className="mt-2 h-14 w-full rounded-[28px] bg-[#202622] font-black text-white/70">
          Отмена
        </button>
      </div>
    </div>
  );
}
