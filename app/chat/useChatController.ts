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
  const [editingMessageId, setEditingMessageId] = useState("");
  const [quoteMessage, setQuoteMessage] = useState<ChatQuote | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const editingMessage = editingMessageId
    ? chat.messages.find((message) => messageMatches(message, editingMessageId)) || null
    : null;
  const canSend = !!messageText.trim() && !!chat.selectedTeamId && (!!chat.token || !!editingMessage);

  useEffect(() => {
    setEditingMessageId("");
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
    const original = chat.messages.find((message) => messageMatches(message, editingMessageId));
    if (!original) return;
    const previous = chat.messages;
    const updated = chat.messages.map((message) =>
      messageMatches(message, editingMessageId) ? { ...message, text: body, edited: true } : message
    );

    chat.setMessages(updated);
    saveMessages(chat.selectedTeamId, updated);
    setEditingMessageId("");
    setMessageText("");

    try {
      await editTeamMessage(chat.token, chat.selectedTeamId, serverIdOf(original), body);
    } catch {
      saveMessages(chat.selectedTeamId, previous);
      chat.setMessages(previous);
    }
  }

  async function sendMessage() {
    const body = messageText.trim();
    if (!body || !chat.selectedTeamId) return;

    if (editingMessageId) {
      await saveEdit(body);
      return;
    }

    const clientId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    const optimistic: ChatMessage = {
      id: clientId,
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
      const serverId = await sendTeamMessage(chat.token, optimistic);
      const delivered = loadMessages(chat.selectedTeamId).map((message) =>
        messageMatches(message, clientId)
          ? { ...message, clientId, id: serverId, messID: serverId, status: "delivered" as const }
          : message
      );
      saveMessages(chat.selectedTeamId, delivered);
      rememberOutgoing(chat.selectedTeamId, clientId, body, serverId);
      chat.setMessages(delivered);
    } catch {
      const failed = loadMessages(chat.selectedTeamId).map((message) =>
        messageMatches(message, clientId) ? { ...message, status: "failed" as const } : message
      );
      saveMessages(chat.selectedTeamId, failed);
      chat.setMessages(failed);
    }
  }

  async function retryMessage(message: ChatMessage) {
    if (message.status !== "failed") return;
    setActionMessage(null);
    const clientId = message.clientId || message.id;
    const sending = chat.messages.map((item) =>
      messageMatches(item, message.id) ? { ...item, status: "sending" as const } : item
    );
    chat.setMessages(sending);
    saveMessages(chat.selectedTeamId, sending);

    try {
      const serverId = await sendTeamMessage(chat.token, { ...message, clientId });
      const delivered = loadMessages(chat.selectedTeamId).map((item) =>
        messageMatches(item, message.id)
          ? { ...item, clientId, id: serverId, messID: serverId, status: "delivered" as const }
          : item
      );
      saveMessages(chat.selectedTeamId, delivered);
      rememberOutgoing(chat.selectedTeamId, clientId, message.text, serverId);
      chat.setMessages(delivered);
    } catch {
      const failed = loadMessages(chat.selectedTeamId).map((item) =>
        messageMatches(item, message.id) ? { ...item, status: "failed" as const } : item
      );
      saveMessages(chat.selectedTeamId, failed);
      chat.setMessages(failed);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    setActionMessage(null);
    const previous = chat.messages;
    const next = chat.messages.filter((item) => !messageMatches(item, message.id));
    chat.setMessages(next);
    saveMessages(chat.selectedTeamId, next);
    if (!message.isMine) return;

    try {
      await deleteTeamMessage(chat.token, chat.selectedTeamId, serverIdOf(message));
    } catch {
      saveMessages(chat.selectedTeamId, previous);
      chat.setMessages(previous);
    }
  }

  function beginEditMessage(message: ChatMessage) {
    if (!message.isMine) return;
    setActionMessage(null);
    setEditingMessageId(message.id);
    setQuoteMessage(null);
    setMessageText(message.text);
    focusInput();
  }

  function quoteForReply(message: ChatMessage) {
    setActionMessage(null);
    setQuoteMessage({
      id: serverIdOf(message),
      author: message.isMine ? "Вы" : message.author || "Игрок",
      text: message.text,
    });
    setEditingMessageId("");
    focusInput();
  }

  function cancelComposeMode() {
    setEditingMessageId("");
    setQuoteMessage(null);
    setMessageText("");
  }

  return {
    ...chat,
    messageText,
    setMessageText,
    editingMessageId,
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
