"use client";

import { serverIdOf } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

export default function ChatActions({ chat }: { chat: Controller }) {
  const message = chat.actionMessage;
  if (!message) return null;
  const hasServerId = !!serverIdOf(message);
  const deleteForEveryone = message.isMine && hasServerId;

  function confirmDelete() {
    const confirmed = window.confirm(
      deleteForEveryone
        ? "Удалить сообщение у всех участников чата?"
        : "Удалить сообщение из истории на этом устройстве?"
    );
    if (confirmed) void chat.deleteMessage(message);
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end bg-black/45 px-3 pb-[max(16px,env(safe-area-inset-bottom))]"
      onClick={() => chat.setActionMessage(null)}
    >
      <div className="mx-auto w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="overflow-hidden rounded-[28px] bg-[#202622]">
          {hasServerId && (
            <button type="button" onClick={() => chat.quoteForReply(message)} className="h-14 w-full border-b border-white/5 px-5 text-left font-black text-white">
              Ответить
            </button>
          )}
          {message.isMine && hasServerId && (
            <button type="button" onClick={() => chat.beginEditMessage(message)} className="h-14 w-full border-b border-white/5 px-5 text-left font-black text-white">
              Изменить
            </button>
          )}
          {message.status === "failed" && (
            <button type="button" onClick={() => chat.retryMessage(message)} className="h-14 w-full border-b border-white/5 px-5 text-left font-black text-[#20d1a8]">
              Отправить повторно
            </button>
          )}
          <button type="button" onClick={confirmDelete} className="h-14 w-full px-5 text-left font-black text-red-300">
            {deleteForEveryone ? "Удалить у всех" : "Удалить из истории"}
          </button>
        </div>
        <button type="button" onClick={() => chat.setActionMessage(null)} className="mt-2 h-14 w-full rounded-[28px] bg-[#202622] font-black text-white/70">
          Отмена
        </button>
      </div>
    </div>
  );
}
