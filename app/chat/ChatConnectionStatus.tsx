"use client";

import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

const safeAreaClass = "pt-[calc(env(safe-area-inset-top)+8px)] pb-2";

export default function ChatConnectionStatus({ chat }: { chat: Controller }) {
  if (!chat.isOnline) {
    return (
      <div className={`shrink-0 border-b border-amber-300/15 bg-amber-300/10 px-4 text-center text-xs font-black text-amber-100 ${safeAreaClass}`}>
        Нет сети. Сообщения отправятся после восстановления подключения.
      </div>
    );
  }

  if (chat.accountStatus === "loading") {
    return (
      <div className={`shrink-0 border-b border-white/5 bg-white/[0.03] px-4 text-center text-xs font-bold text-white/55 ${safeAreaClass}`}>
        Подключение…
      </div>
    );
  }

  if (chat.accountStatus === "error") {
    return (
      <div className={`flex shrink-0 items-center justify-center gap-3 border-b border-red-300/15 bg-red-300/10 px-4 text-xs font-bold text-red-50 ${safeAreaClass}`}>
        <span>{chat.accountError || "Не удалось загрузить команды"}</span>
        <button
          type="button"
          onClick={chat.retryAccount}
          className="rounded-xl bg-red-50/10 px-3 py-1.5 font-black text-white active:bg-red-50/20"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (chat.notificationPermission === "denied") {
    return (
      <div className={`shrink-0 border-b border-white/5 bg-white/[0.03] px-4 text-center text-xs font-bold text-white/50 ${safeAreaClass}`}>
        Уведомления отключены в настройках iPhone.
      </div>
    );
  }

  if (chat.accountStatus === "ready" && chat.teams.length === 0) {
    return (
      <div className={`shrink-0 border-b border-white/5 bg-white/[0.03] px-4 text-center text-xs font-bold text-white/50 ${safeAreaClass}`}>
        У вас пока нет доступных командных чатов.
      </div>
    );
  }

  return null;
}
