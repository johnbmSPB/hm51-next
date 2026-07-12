import Link from "next/link";
import ChatViewportFix from "./ChatViewportFix";
import ClientChatPolished from "./ClientChatPolished";

export default function ChatPage() {
  return (
    <>
      <ClientChatPolished />
      <ChatViewportFix />

      <nav
        data-chat-bottom-nav="true"
        className="fixed inset-x-3 bottom-5 z-[60] mx-auto grid max-w-md grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl shadow-black/40"
      >
        <Link href="/calendar" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">
          Календарь
        </Link>
        <Link href="/home" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">
          Профиль
        </Link>
        <Link href="/find-team" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">
          Найти
        </Link>
        <Link href="/chat" className="rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]">
          Чат
        </Link>
        <Link href="/settings" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">
          Настройки
        </Link>
      </nav>
    </>
  );
}
