"use client";

import { useEffect, useState } from "react";
import { serverIdOf } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

export default function ChatActions({ chat }: { chat: Controller }) {
  const message = chat.actionMessage;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setConfirmingDelete(false);
  }, [message?.clientId]);

  if (!message) return null;
  const hasServerId = !!serverIdOf(message);
  const deleteForEveryone = message.isMine && hasServerId;

  function close() {
    setConfirmingDelete(false);
    chat.setActionMessage(null);
  }

  if (confirmingDelete) {
    return (
      <div className="fixed inset-0 z-[90] flex items-end bg-black/55 px-3 pb-[max(16px,env(safe-area-inset-bottom))]" onClick={close}>
        <div className="mx-auto w-full max-w-md" onClick={(event) => event.stopPropagation()}>
          <div className="rounded-[28px] bg-[#202622] p-5 text-white shadow-2xl shadow-black/50">
            <p className="text-lg font-black">
              {deleteForEveryone ? "Удалить сообщение у всех?" : "Удалить сообщение из истории?"}
            </p>
            <p className="mt-2 text-sm font-semibold leading-5 text-white/55">
              {deleteForEveryone
                ? "Сообщение исчезнет у всех участников командного чата."
                : "Сообщение будет скрыто только на этом устройстве и не появится снова при повторном push."}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void chat.deleteMessage(message)}
                className="flex-1 rounded-2xl bg-red-500/90 px-4 py-3 font-black text-white active:bg-red-500"
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 rounded-2xl bg-white/5 px-4 py-3 font-black text-white/70 active:bg-white/10"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/45 px-3 pb-[max(16px,env(safe-area-inset-bottom))]" onClick={close}>
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
          <button type="button" onClick={() => setConfirmingDelete(true)} className="h-14 w-full px-5 text-left font-black text-red-300">
            {deleteForEveryone ? "Удалить у всех" : "Удалить из истории"}
          </button>
        </div>
        <button type="button" onClick={close} className="mt-2 h-14 w-full rounded-[28px] bg-[#202622] font-black text-white/70">
          Отмена
        </button>
      </div>
    </div>
  );
}
