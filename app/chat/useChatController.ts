"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteTeamMessage,
  editTeamMessage,
  reportChatOperationError,
  sendTeamMessage,
} from "./chatApi";
import { useChat } from "./ChatProvider";
import { loadMessages } from "./chatSafeStore";
import {
  rememberOutgoing,
  serverIdOf,
  type ChatMessage,
  type ChatQuote,
} from "./chatLocalStore";

function nowTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

const SEND_TAP_GUARD_MS = 350;

export function useChatController() {
  const chat = useChat();
  const [messageText, setMessageText] = useState("");
  const [editingClientId, setEditingClientId] = useState("");
  const [quoteMessage, setQuoteMessage] = useState<ChatQuote | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const forceScrollToBottomRef = useRef(true);
  const sendGuardUntilRef = useRef(0);
  const deletingClientIdsRef = useRef(new Set<string>());
  const retryingClientIdsRef = useRef(new Set<string>());

  const editingMessage = editingClientId
    ? chat.messages.find((message) => message.clientId === editingClientId) || null
    : null;
  const canSend = !!messageText.trim() && !!chat.selectedTeamId && (!!chat.token || !!editingMessage);

  useEffect(() => {
    setEditingClientId("");
    setQuoteMessage(null);
    setActionMessage(null);
    setMessageText("");
    isNearBottomRef.current = true;
    forceScrollToBottomRef.current = true;
  }, [chat.selectedTeamId]);

  useEffect(() => {
    if (!forceScrollToBottomRef.current && !isNearBottomRef.current) return;

    let secondFrame = 0;
    let settleTimer = 0;

    const scrollListToBottom = () => {
      const container = messagesRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
      isNearBottomRef.current = true;
      forceScrollToBottomRef.current = false;
    };

    const firstFrame = window.requestAnimationFrame(() => {
      scrollListToBottom();
      secondFrame = window.requestAnimationFrame(scrollListToBottom);
    });

    settleTimer = window.setTimeout(scrollListToBottom, 120);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
    };
  }, [chat.messages.length, chat.selectedTeamId]);

  function onMessagesScroll() {
    const container = messagesRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= 120;
  }

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

    const now = Date.now();
    if (now < sendGuardUntilRef.current) return;
    sendGuardUntilRef.current = now + SEND_TAP_GUARD_MS;

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

    forceScrollToBottomRef.current = true;
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
                status: "sent" as const,
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
    if (message.status !== "failed" || retryingClientIdsRef.current.has(message.clientId)) return;
    retryingClientIdsRef.current.add(message.clientId);
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
                status: "sent" as const,
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
    } finally {
      retryingClientIdsRef.current.delete(message.clientId);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    setActionMessage(null);
    const targetTeamId = message.teamId || chat.selectedTeamId;
    const messageId = serverIdOf(message);

    if (!message.isMine || !messageId) {
      chat.updateTeamMessages(targetTeamId, (current) =>
        current.filter((item) => item.clientId !== message.clientId)
      );
      return;
    }

    if (deletingClientIdsRef.current.has(message.clientId)) return;
    deletingClientIdsRef.current.add(message.clientId);

    // История хранится локально: удаляем копию на iPhone сразу и не ждём
    // собственного push, который Web Push может не вернуть устройству-отправителю.
    chat.updateTeamMessages(targetTeamId, (current) =>
      current.filter(
        (item) =>
          item.clientId !== message.clientId &&
          serverIdOf(item) !== messageId
      )
    );

    try {
      await deleteTeamMessage(chat.token, targetTeamId, messageId);
    } catch {
      // Сервер мог успеть выполнить удаление и отправить push другим устройствам,
      // даже если его ответ потерялся или не прошёл проверку. Локальную копию
      // не восстанавливаем: пользователь явно удалил её с этого устройства.
    } finally {
      deletingClientIdsRef.current.delete(message.clientId);
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
    messagesRef,
    onMessagesScroll,
    canSend,
    sendMessage,
    retryMessage,
    deleteMessage,
    beginEditMessage,
    quoteForReply,
    cancelComposeMode,
  };
}
