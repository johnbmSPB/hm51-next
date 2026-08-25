"use client";

import { useMemo } from "react";
import ChatMessageList from "./ChatMessageList";
import { serverIdOf, type ChatMessage } from "./chatLocalStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

function numericServerId(message: ChatMessage) {
  const id = serverIdOf(message);
  if (!/^\d+$/.test(id)) return null;
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

function orderMessagesByServerId(messages: ChatMessage[]) {
  return messages
    .map((message, index) => ({ message, index, id: numericServerId(message) }))
    .sort((left, right) => {
      if (left.id !== null && right.id !== null) {
        if (left.id < right.id) return -1;
        if (left.id > right.id) return 1;
        return left.index - right.index;
      }

      // Сообщение без server ID — это локальное pending/optimistic сообщение.
      // Оно должно оставаться после уже подтверждённых серверных сообщений.
      if (left.id !== null) return -1;
      if (right.id !== null) return 1;
      return left.index - right.index;
    })
    .map(({ message }) => message);
}

export default function ChatMessageListById({ chat }: { chat: Controller }) {
  const orderedMessages = useMemo(
    () => orderMessagesByServerId(chat.messages),
    [chat.messages]
  );

  const orderedChat = useMemo(
    () => ({ ...chat, messages: orderedMessages }),
    [chat, orderedMessages]
  );

  return <ChatMessageList chat={orderedChat} />;
}
