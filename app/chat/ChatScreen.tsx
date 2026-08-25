"use client";

import ChatActions from "./ChatActions";
import ChatComposer from "./ChatComposer";
import ChatConnectionStatus from "./ChatConnectionStatus";
import ChatHeader from "./ChatHeader";
import ChatHistorySync from "./ChatHistorySync";
import ChatMessageList from "./ChatMessageList";
import ChatUnreadController from "./ChatUnreadController";
import { useChatController } from "./useChatController";

export default function ChatScreen() {
  const chat = useChatController();

  return (
    <main data-hm51-chat-main="true" className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#121715] text-white">
      <ChatUnreadController />
      <ChatHistorySync />
      <ChatHeader chat={chat} />
      <ChatConnectionStatus chat={chat} />
      <ChatMessageList chat={chat} />
      <ChatComposer chat={chat} />
      <ChatActions chat={chat} />
    </main>
  );
}
