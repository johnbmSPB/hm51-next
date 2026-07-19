"use client";

import { Fragment } from "react";
import { normalizeText, type ChatMessage } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

function shortText(value: string, max = 90) {
  const normalized = normalizeText(value);
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function messageDate(value: string) {
  const raw = String(value || "").trim();

  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    const date = new Date(raw.length === 10 ? numeric * 1000 : numeric);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const sqlMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (sqlMatch) {
    const date = new Date(
      Number(sqlMatch[1]),
      Number(sqlMatch[2]) - 1,
      Number(sqlMatch[3]),
      Number(sqlMatch[4]),
      Number(sqlMatch[5]),
      Number(sqlMatch[6] || 0)
    );
    if (!Number.isNaN(date.getTime())) return date;
  }

  const parsed = new Date(raw);
  if (raw && !Number.isNaN(parsed.getTime())) return parsed;

  const timeMatch = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)/);
  const today = new Date();
  if (timeMatch) today.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  return today;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  return target.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: target.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatMessageTime(value: string) {
  const date = messageDate(value);
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function statusMarks(message: ChatMessage) {
  if (!message.isMine) return "";
  if (message.status === "sending") return "…";
  if (message.status === "failed") return "!";
  if (message.status === "delivered" || message.status === "read") return "✓✓";
  return "✓";
}

export default function ChatMessageList({ chat }: { chat: Controller }) {
  let previousDateKey = "";

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

        {chat.messages.map((message) => {
          const marks = statusMarks(message);
          const failed = message.status === "failed";
          const editing = chat.editingMessageId === message.clientId;
          const date = messageDate(message.time);
          const currentDateKey = dateKey(date);
          const showDate = currentDateKey !== previousDateKey;
          previousDateKey = currentDateKey;

          return (
            <Fragment key={`${message.clientId}-${message.time}`}>
              {showDate && (
                <div className="my-1 flex justify-center">
                  <span className="rounded-full bg-white/7 px-3 py-1 text-[11px] font-black text-white/45">
                    {dateLabel(date)}
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

                  {message.quote && (
                    <div className={`mb-2 rounded-2xl border-l-4 px-3 py-2 text-xs font-bold ${message.isMine ? "border-[#07110c]/40 bg-[#07110c]/10 text-[#07110c]/70" : "border-[#20d1a8]/70 bg-white/5 text-white/55"}`}>
                      <span className="block text-[11px] uppercase tracking-[0.18em] opacity-70">{message.quote.author}</span>
                      <span className="mt-1 block leading-4">{shortText(message.quote.text, 96)}</span>
                    </div>
                  )}

                  <p className="text-[17px] font-semibold leading-6">
                    <span className="whitespace-pre-wrap">{message.text}</span>
                    <span className="ml-2 inline-flex shrink-0 items-baseline gap-1 align-baseline text-[11px] font-black opacity-65">
                      <span>{formatMessageTime(message.time)}</span>
                      {message.edited && <span>изм.</span>}
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
