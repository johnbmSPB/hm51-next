"use client";

import { useEffect } from "react";

type AnyObject = Record<string, any>;

type ChatMessage = {
  id?: string;
  messID?: string;
  teamId?: string;
  text?: string;
  author?: string;
  isMine?: boolean;
  edited?: boolean;
  quote?: {
    id?: string;
    author?: string;
    text?: string;
  };
};

function text(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function decodeSafe(value: any) {
  return text(value).replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return _;
    }
  });
}

function normalize(value: any) {
  return decodeSafe(value).replace(/\s+/g, " ").trim();
}

function parseMessages(raw: string | null): ChatMessage[] {
  try {
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function sameMessage(message: ChatMessage, messageId: string) {
  if (!messageId) return false;
  return text(message.id) === messageId || text(message.messID) === messageId;
}

function chatKey(teamId: string) {
  return `hm51_chat_${teamId || "default"}`;
}

function payloadData(payload: any): AnyObject {
  return payload?.data || payload || {};
}

function parts(payload: any) {
  const data = payloadData(payload);

  const event = text(data.event || data.EVENT || data.type || data.TYPE || data.action || data.ACTION)
    .toUpperCase()
    .replace(/[_-]/g, " ");

  const teamId = text(
    data.team ||
      data.TEAM ||
      data.team_id ||
      data.TEAM_ID ||
      payload?.team ||
      payload?.TEAM ||
      payload?.teamId ||
      payload?.TEAM_ID
  );

  const messageId = text(
    data.message_id ||
      data.MESSAGE_ID ||
      data.MESS_ID ||
      data.mess_id ||
      data.id ||
      data.ID ||
      payload?.message_id ||
      payload?.MESSAGE_ID ||
      payload?.MESS_ID ||
      payload?.id
  );

  const newText = normalize(
    data.new_text ||
      data.NEW_TEXT ||
      data.text ||
      data.TEXT ||
      data.message ||
      data.MESSAGE ||
      data.body ||
      data.BODY ||
      payload?.new_text ||
      payload?.body
  );

  const replyTo = text(data.REPLY_TO || data.reply_to || data.QUOTE_ID || data.quote_id || payload?.REPLY_TO);
  const replyText = normalize(data.REPLY_TEXT || data.reply_text || data.QUOTE_TEXT || data.quote_text || payload?.REPLY_TEXT);
  const replySender = normalize(
    data.REPLY_SENDER ||
      data.REPLY_AUTHOR ||
      data.reply_sender ||
      data.reply_author ||
      data.QUOTE_AUTHOR ||
      data.quote_author ||
      payload?.REPLY_SENDER ||
      payload?.REPLY_AUTHOR
  );

  return { event, teamId, messageId, newText, replyTo, replyText, replySender };
}

function writeMessages(teamId: string, messages: ChatMessage[]) {
  localStorage.setItem(chatKey(teamId), JSON.stringify(messages.slice(-250)));
}

function updateCurrentStateByReload() {
  window.setTimeout(() => window.location.reload(), 120);
}

function applyEdited(teamId: string, messageId: string, newText: string) {
  if (!teamId || !messageId || !newText) return false;

  const messages = parseMessages(localStorage.getItem(chatKey(teamId)));
  let changed = false;

  const updated = messages.map((message) => {
    if (!sameMessage(message, messageId)) return message;
    changed = true;
    return {
      ...message,
      id: text(message.id) || messageId,
      messID: text(message.messID) || messageId,
      text: newText,
      edited: true,
    };
  });

  if (changed) writeMessages(teamId, updated);
  return changed;
}

function applyDeleted(teamId: string, messageId: string) {
  if (!teamId || !messageId) return false;

  const messages = parseMessages(localStorage.getItem(chatKey(teamId)));
  const updated = messages.filter((message) => !sameMessage(message, messageId));

  if (updated.length === messages.length) return false;

  writeMessages(teamId, updated);
  return true;
}

function applyReplyPatch(teamId: string, messageId: string, replyTo: string, replyText: string, replySender: string) {
  if (!teamId || !messageId || (!replyTo && !replyText)) return false;

  const messages = parseMessages(localStorage.getItem(chatKey(teamId)));
  let changed = false;

  const updated = messages.map((message) => {
    if (!sameMessage(message, messageId)) return message;

    changed = true;
    return {
      ...message,
      id: text(message.id) || messageId,
      messID: text(message.messID) || messageId,
      quote: {
        id: replyTo || message.quote?.id || "",
        text: replyText || message.quote?.text || "Цитируемое сообщение",
        author: replySender || message.quote?.author || "Сообщение",
      },
    };
  });

  if (changed) writeMessages(teamId, updated);
  return changed;
}

function applyAndroidPush(payload: any) {
  const { event, teamId, messageId, newText, replyTo, replyText, replySender } = parts(payload);
  if (!teamId || !messageId) return false;

  if (event === "TEAM CHAT MESSAGE EDITED" || event.includes("EDIT")) {
    return applyEdited(teamId, messageId, newText);
  }

  if (event === "TEAM CHAT MESSAGE DELETED" || event.includes("DELETE")) {
    return applyDeleted(teamId, messageId);
  }

  if (event === "TEAM CHAT" || event.includes("TEAM CHAT")) {
    return applyReplyPatch(teamId, messageId, replyTo, replyText, replySender);
  }

  return false;
}

function applyWithRetries(payload: any) {
  const delays = [0, 120, 350, 900, 1600];

  delays.forEach((delay) => {
    window.setTimeout(() => {
      const changed = applyAndroidPush(payload);
      if (changed) updateCurrentStateByReload();
    }, delay);
  });
}

export default function ChatAndroidPushActionsFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;

    function onServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type !== "HM51_PUSH") return;
      applyWithRetries(event.data.payload);
    }

    function onForegroundMessage(event: Event) {
      const payload = (event as CustomEvent).detail;
      if (!payload) return;
      applyWithRetries(payload);
    }

    async function attachForegroundFcm() {
      try {
        const [{ getApps }, messagingModule] = await Promise.all([
          import("firebase/app"),
          import("firebase/messaging"),
        ]);

        if (disposed) return;

        const { getMessaging, onMessage, isSupported } = messagingModule;
        const supported = await isSupported();
        const app = getApps()[0];

        if (!supported || !app || typeof onMessage !== "function") return;

        const messaging = getMessaging(app);
        foregroundUnsubscribe = onMessage(messaging, (payload: any) => {
          applyWithRetries(payload);
        });
      } catch {
        // Foreground FCM не должен ломать чат.
      }
    }

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    window.addEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);

    attachForegroundFcm();
    const retryTimer = window.setTimeout(attachForegroundFcm, 2500);

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      foregroundUnsubscribe?.();
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      window.removeEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);
    };
  }, []);

  return null;
}
