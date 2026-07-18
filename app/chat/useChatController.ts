"use client";

import { useEffect, useRef, useState } from "react";
import { deleteTeamMessage, editTeamMessage, sendTeamMessage } from "./chatApi";
import { useChat } from "./ChatProvider";
import {
  loadMessages,
  messageMatches,
  rememberOutgoing,
  saveMessages,
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

    const previous = chat.messages;
    const updated = chat.messages.map((message) =>
      message.clientId === editingClientId ? { ...message, text: body, edited: true } : message
    );

    chat.setMessages(updated);
    saveMessages(chat.selectedTeamId, updated);
    setEditingClientId("");
    setMessageText("");

    try {
      await editTeamMessage(chat.token, chat.selectedTeamId, messageId, body);
    } catch {
      saveMessages(chat.selectedTeamId, previous);
      chat.setMessages(previous);
    }
  }

  async function sendMessage() {
    const body = messageText.trim();
    if (!body || !chat.selectedTeamId) return;

    if (editingClientId) {
      await saveEdit(body);
      return;
    }

    const clientId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    const optimistic: ChatMessage = {
      clientId,
      teamId: chat.selectedTeamId,
      author: "Вы",
      text: body,
      time: nowTime(),
      isMine: true,
      quote: quoteMessage ? { ...quoteMessage } : undefined,
      status: "sending",
    };

    const next = [...chat.messages, optimistic].slice(-250);
    chat.setMessages(next);
    saveMessages(chat.selectedTeamId, next);
    rememberOutgoing(chat.selectedTeamId, clientId, body);
    setMessageText("");
    setQuoteMessage(null);

    try {
      const messageId = await sendTeamMessage(chat.token, optimistic);
      const delivered = loadMessages(chat.selectedTeamId).map((message) =>
        message.clientId === clientId
          ? {
              ...message,
              messageId: messageId || message.messageId,
              status: messageId ? ("delivered" as const) : ("sent" as const),
            }
          : message
      );
      saveMessages(chat.selectedTeamId, delivered);
      rememberOutgoing(chat.selectedTeamId, clientId, body, messageId);
      chat.setMessages(delivered);
    } catch {
      const failed = loadMessages(chat.selectedTeamId).map((message) =>
        message.clientId === clientId ? { ...message, status: "failed" as const } : message
      );
      saveMessages(chat.selectedTeamId, failed);
      chat.setMessages(failed);
    }
  }

  async function retryMessage(message: ChatMessage) {
    if (message.status !== "failed") return;
    setActionMessage(null);
    const sending = chat.messages.map((item) =>
      item.clientId === message.clientId ? { ...item, status: "sending" as const } : item
    );
    chat.setMessages(sending);
    saveMessages(chat.selectedTeamId, sending);

    try {
      const messageId = await sendTeamMessage(chat.token, message);
      const delivered = loadMessages(chat.selectedTeamId).map((item) =>
        item.clientId === message.clientId
          ? {
              ...item,
              messageId: messageId || item.messageId,
              status: messageId ? ("delivered" as const) : ("sent" as const),
            }
          : item
      );
      saveMessages(chat.selectedTeamId, delivered);
      rememberOutgoing(chat.selectedTeamId, message.clientId, message.text, messageId);
      chat.setMessages(delivered);
    } catch {
      const failed = loadMessages(chat.selectedTeamId).map((item) =>
        item.clientId === message.clientId ? { ...item, status: "failed" as const } : item
      );
      saveMessages(chat.selectedTeamId, failed);
      chat.setMessages(failed);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    setActionMessage(null);
    const previous = chat.messages;
    const next = chat.messages.filter((item) => item.clientId !== message.clientId);
    chat.setMessages(next);
    saveMessages(chat.selectedTeamId, next);

    const messageId = serverIdOf(message);
    if (!message.isMine || !messageId) return;

    try {
      await deleteTeamMessage(chat.token, chat.selectedTeamId, messageId);
    } catch {
      saveMessages(chat.selectedTeamId, previous);
      chat.setMessages(previous);
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
    setActionMessage(null);
    setQuoteMessage({
      messageId: serverIdOf(message),
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
