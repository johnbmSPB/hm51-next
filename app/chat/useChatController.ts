"use client";

import { useEffect, useRef, useState } from "react";
import { deleteTeamMessage, editTeamMessage, sendTeamMessage } from "./chatApi";
import { useChat } from "./ChatProvider";
import {
  rememberOutgoing,
  serverIdOf,
  type ChatMessage,
  type ChatQuote,
} from "./chatLocalStore";

function nowTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function useChatController() {
  const chat = useChat();
  const [messageText, setMessageText] = useState("");
  const [editingClientId, setEditingClientId] = useState("");
  const [quoteMessage, setQuoteMessage] = useState<ChatQuote | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const editingMessage = editingClientId
    ? chat.messages.find((message) => message.clientId === editingClientId) || null
    : null;
  const canSend = !!messageText.trim() && !!chat.selectedTeamId && (!!chat.token || !!editingMessage);

  useEffect(() => {
    setEditingClientId("");
    setQuoteMessage(null);
    setActionMessage(null);
    setMessageText("");
  }, [chat.selectedTeamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length]);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }

  async function saveEdit(body: string) {
    const original = chat.messages.find((message) => message.clientId === editingClientId);
    if (!original) return;

    const messageId = serverIdOf(original);
    if (!messageId) return;

    const targetTeamId = original.teamId || chat.selectedTeamId;
    const previousText = original.text;
    const previousEdited = original.edited;

    chat.updateTeamMessages(targetTeamId, (current) =>
      current.map((message) =>
        message.clientId === original.clientId ? { ...message, text: body, edited: true } : message
      )
    );
    setEditingClientId("");
    setMessageText("");

    try {
      await editTeamMessage(chat.token, targetTeamId, messageId, body);
    } catch {
      chat.updateTeamMessages(targetTeamId, (current) =>
        current.map((message) =>
          message.clientId === original.clientId
            ? { ...message, text: previousText, edited: previousEdited }
            : message
        )
      );
    }
  }

  async function sendMessage() {
    const body = messageText.trim();
    const targetTeamId = chat.selectedTeamId;
    if (!body || !targetTeamId) return;

    if (editingClientId) {
      await saveEdit(body);
      return;
    }

    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const optimistic: ChatMessage = {
      clientId,
      teamId: targetTeamId,
      author: "Вы",
      text: body,
      time: nowTime(),
      isMine: true,
      quote: quoteMessage ? { ...quoteMessage } : undefined,
      status: "sending",
    };

    chat.updateTeamMessages(targetTeamId, (current) => [...current, optimistic]);
    rememberOutgoing(targetTeamId, clientId, body);
    setMessageText("");
    setQuoteMessage(null);

    try {
      const messageId = await sendTeamMessage(chat.token, optimistic);
      chat.updateTeamMessages(targetTeamId, (current) =>
        current.map((message) =>
          message.clientId === clientId
            ? {
                ...message,
                messageId: messageId || message.messageId,
                status: messageId ? ("delivered" as const) : ("sent" as const),
              }
            : message
        )
      );
      rememberOutgoing(targetTeamId, clientId, body, messageId);
    } catch {
      chat.updateTeamMessages(targetTeamId, (current) =>
        current.map((message) =>
          message.clientId === clientId ? { ...message, status: "failed" as const } : message
        )
      );
    }
  }

  async function retryMessage(message: ChatMessage) {
    if (message.status !== "failed") return;
    setActionMessage(null);
    const targetTeamId = message.teamId || chat.selectedTeamId;

    chat.updateTeamMessages(targetTeamId, (current) =>
      current.map((item) =>
        item.clientId === message.clientId ? { ...item, status: "sending" as const } : item
      )
    );

    try {
      const messageId = await sendTeamMessage(chat.token, message);
      chat.updateTeamMessages(targetTeamId, (current) =>
        current.map((item) =>
          item.clientId === message.clientId
            ? {
                ...item,
                messageId: messageId || item.messageId,
                status: messageId ? ("delivered" as const) : ("sent" as const),
              }
            : item
        )
      );
      rememberOutgoing(targetTeamId, message.clientId, message.text, messageId);
    } catch {
      chat.updateTeamMessages(targetTeamId, (current) =>
        current.map((item) =>
          item.clientId === message.clientId ? { ...item, status: "failed" as const } : item
        )
      );
    }
  }

  async function deleteMessage(message: ChatMessage) {
    setActionMessage(null);
    const targetTeamId = message.teamId || chat.selectedTeamId;
    const originalIndex = chat.messages.findIndex((item) => item.clientId === message.clientId);

    chat.updateTeamMessages(targetTeamId, (current) =>
      current.filter((item) => item.clientId !== message.clientId)
    );

    const messageId = serverIdOf(message);
    if (!message.isMine || !messageId) return;

    try {
      await deleteTeamMessage(chat.token, targetTeamId, messageId);
    } catch {
      chat.updateTeamMessages(targetTeamId, (current) => {
        if (current.some((item) => item.clientId === message.clientId)) return current;
        const restored = [...current];
        restored.splice(Math.max(0, Math.min(originalIndex, restored.length)), 0, message);
        return restored;
      });
    }
  }

  function beginEditMessage(message: ChatMessage) {
    if (!message.isMine || !serverIdOf(message)) return;
    setActionMessage(null);
    setEditingClientId(message.clientId);
    setQuoteMessage(null);
    setMessageText(message.text);
    focusInput();
  }

  function quoteForReply(message: ChatMessage) {
    const messageId = serverIdOf(message);
    setActionMessage(null);
    if (!messageId) return;

    setQuoteMessage({
      messageId,
      author: message.isMine ? "Вы" : message.author || "Игрок",
      text: message.text,
    });
    setEditingClientId("");
    focusInput();
  }

  function cancelComposeMode() {
    setEditingClientId("");
    setQuoteMessage(null);
    setMessageText("");
  }

  return {
    ...chat,
    messageText,
    setMessageText,
    editingMessageId: editingClientId,
    editingMessage,
    quoteMessage,
    actionMessage,
    setActionMessage,
    inputRef,
    bottomRef,
    canSend,
    sendMessage,
    retryMessage,
    deleteMessage,
    beginEditMessage,
    quoteForReply,
    cancelComposeMode,
  };
}
