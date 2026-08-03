"use client";

import { Fragment } from "react";
import { isRenderableQuote, normalizeText, type ChatMessage } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

function shortText(value: string, max = 90) {
  const normalized = normalizeText(value);
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function parseMessageDate(message: ChatMessage) {
  const createdAt = Number(message.createdAt);
  if (Number.isFinite(createdAt) && createdAt > 0) {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const raw = String(message.time || "").trim();
  if (!raw) return null;

  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    const date = new Date(raw.length === 10 ? numeric * 1000 : numeric);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const timeMatch = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
  if (timeMatch) {
    const date = new Date();
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3] || 0), 0);
    return date;
  }

  return null;
}

function localDateKey(date: Date | null) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMessageDate(date: Date) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const dateKey = localDateKey(date);

  if (dateKey === todayKey) return "Сегодня";
  if (dateKey === localDateKey(yesterday)) return "Вчера";

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function formatMessageTime(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const unixMatch = raw.match(/^\d{10,13}$/);
  if (unixMatch) {
    const numeric = Number(raw);
    const date = new Date(raw.length === 10 ? numeric * 1000 : numeric);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
  }

  const timeMatch = raw.match(/(?:^|[T\s])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?:$|[.\sZ+-])/i)
    || raw.match(/^([01]?\d|2[0-3]):([0-5]\d)/);

  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  return raw.length <= 5 ? raw : "";
}

function statusMarks(message: ChatMessage) {
  if (!message.isMine) return "";
  if (message.status === "queued") return "ждёт сеть";
  if (message.status === "sending") return "…";
  if (message.status === "unknown") return "?";
  if (message.status === "failed") return "!";
  if (message.status === "delivered" || message.status === "read") return "✓✓";
  return "✓";
}

export default function ChatMessageList({ chat }: { chat: Controller }) {
  return (
    <section
      ref={chat.messagesRef}
      data-hm51-chat-messages="true"
      onScroll={chat.onMessagesScroll}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
    >
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {chat.messages.length === 0 && (
          <div className="rounded-3xl bg-white/5 p-5 text-base font-semibold text-white/45">
            История хранится только на этом устройстве. Напишите первое сообщение в команду.
          </div>
        )}

        {chat.messages.map((message, index) => {
          const marks = statusMarks(message);
          const failed = message.status === "failed" || message.status === "unknown";
          const editing = chat.editingMessageId === message.clientId;
          const displayTime = formatMessageTime(message.time);
          const messageDate = parseMessageDate(message);
          const previousDate = index > 0 ? parseMessageDate(chat.messages[index - 1]) : null;
          const showDateSeparator = !!messageDate && localDateKey(messageDate) !== localDateKey(previousDate);
          const dateLabel = messageDate ? formatMessageDate(messageDate) : "";

          return (
            <Fragment key={`${message.clientId}-${message.createdAt || message.time}`}>
              {showDateSeparator && dateLabel && (
                <div className="my-1 flex justify-center" aria-label={`Дата сообщений: ${dateLabel}`}>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-white/55 shadow-sm backdrop-blur-sm">
                    {dateLabel}
                  </span>
                </div>
              )}

              <div className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}>
                <button
                  type="button"
                  onClick={() => chat.setActionMessage(message)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    chat.setActionMessage(message);
                  }}
                  className={`max-w-[92%] rounded-3xl px-4 py-3 text-left transition active:scale-[0.98] ${editing ? "ring-2 ring-white/35" : ""} ${message.isMine ? "bg-[#20d1a8] text-[#07110c]" : "bg-white/8 text-white"}`}
                >
                  {!message.isMine && <p className="mb-1 text-sm font-black text-[#20d1a8]">{message.author}</p>}

                  {isRenderableQuote(message.quote) && message.quote && (
                    <div className={`mb-2 rounded-2xl border-l-4 px-3 py-2 text-xs font-bold ${message.isMine ? "border-[#07110c]/40 bg-[#07110c]/10 text-[#07110c]/70" : "border-[#20d1a8]/70 bg-white/5 text-white/55"}`}>
                      <span className="block text-[11px] uppercase tracking-[0.18em] opacity-70">{message.quote.author}</span>
                      <span className="mt-1 block leading-4">{shortText(message.quote.text, 96)}</span>
                    </div>
                  )}

                  <p className="text-[17px] font-semibold leading-6">
                    <span className="whitespace-pre-wrap">{message.text}</span>
                    <span className="ml-2 inline-flex shrink-0 items-baseline gap-1 align-baseline text-[11px] font-black opacity-65">
                      {displayTime && <span>{displayTime}</span>}
                      {message.edited && <span>{message.pendingEdit ? "изм. ожид." : "изм."}</span>}
                      {marks && <span className={failed ? "text-red-700" : ""}>{marks}</span>}
                    </span>
                  </p>
                </button>
              </div>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
