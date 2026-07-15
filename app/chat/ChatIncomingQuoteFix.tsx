"use client";

import { useEffect } from "react";

type Message = {
  id?: string;
  messID?: string;
  clientId?: string;
  text?: string;
  author?: string;
  isMine?: boolean;
  quote?: {
    id?: string;
    text?: string;
    author?: string;
  };
};

const PREFIX = "hm51_chat_";

function str(value: unknown) {
  if (value === null || value === undefined) return "";
  const result = String(value).trim();
  return result === "." ? "" : result;
}

function normalize(value: unknown) {
  return str(value)
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function parse(raw: string | null): Message[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function ids(message: Message) {
  return [str(message.id), str(message.messID), str(message.clientId)].filter(Boolean);
}

function matches(message: Message, messageId: string) {
  return ids(message).includes(str(messageId));
}

function payloadParts(payload: any) {
  let data = payload?.data || payload || {};
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }

  const teamId = str(data.team || data.TEAM || data.team_id || data.TEAM_ID || payload?.teamId);
  const messageId = str(
    data.message_id || data.MESSAGE_ID || data.MESS_ID || data.mess_id || data.id || data.ID || payload?.message_id
  );
  const replyTo = str(data.REPLY_TO || data.reply_to || data.replyTo || data.QUOTE_ID || data.quote_id);
  const replyText = normalize(data.REPLY_TEXT || data.reply_text || data.replyText || data.QUOTE_TEXT || data.quote_text);
  const replySender = normalize(
    data.REPLY_SENDER ||
      data.REPLY_AUTHOR ||
      data.reply_sender ||
      data.reply_author ||
      data.replySender ||
      data.replyAuthor ||
      data.QUOTE_AUTHOR ||
      data.quote_author
  );

  return { teamId, messageId, replyTo, replyText, replySender };
}

export default function ChatIncomingQuoteFix() {
  useEffect(() => {
    let disposed = false;

    function repairTeam(teamId: string, targetMessageId = "", pushQuote?: ReturnType<typeof payloadParts>) {
      const key = `${PREFIX}${teamId}`;
      const messages = parse(localStorage.getItem(key));
      let changed = false;

      const updated = messages.map((message) => {
        if (targetMessageId && !matches(message, targetMessageId)) return message;

        const replyTo = str(pushQuote?.replyTo || message.quote?.id);
        if (!replyTo) return message;

        const quoted = messages.find((candidate) => matches(candidate, replyTo));
        const quoteText =
          normalize(pushQuote?.replyText) ||
          normalize(quoted?.text) ||
          normalize(message.quote?.text) ||
          "Цитируемое сообщение";
        const quoteAuthor =
          normalize(pushQuote?.replySender) ||
          (quoted ? (quoted.isMine ? "Вы" : normalize(quoted.author) || "Игрок") : normalize(message.quote?.author) || "Сообщение");

        if (
          str(message.quote?.id) === replyTo &&
          normalize(message.quote?.text) === quoteText &&
          normalize(message.quote?.author) === quoteAuthor
        ) {
          return message;
        }

        changed = true;
        return {
          ...message,
          quote: { id: replyTo, text: quoteText, author: quoteAuthor },
        };
      });

      if (!changed) return false;
      localStorage.setItem(key, JSON.stringify(updated.slice(-250)));
      return true;
    }

    function repairAll() {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        if (!key.startsWith(PREFIX)) continue;
        repairTeam(key.slice(PREFIX.length));
      }
    }

    function applyPayload(payload: any) {
      const parts = payloadParts(payload);
      if (!parts.teamId || !parts.messageId || !parts.replyTo) return;
      const delays = [0, 100, 300, 800, 1500];
      let index = 0;

      const attempt = () => {
        if (disposed) return;
        if (repairTeam(parts.teamId, parts.messageId, parts)) {
          window.setTimeout(() => window.location.reload(), 50);
          return;
        }
        index += 1;
        if (index < delays.length) window.setTimeout(attempt, delays[index] - delays[index - 1]);
      };

      attempt();
    }

    function onServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type === "HM51_PUSH") applyPayload(event.data.payload);
    }

    function onForegroundMessage(event: Event) {
      applyPayload((event as CustomEvent).detail);
    }

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    window.addEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);
    const repairTimer = window.setInterval(repairAll, 500);
    repairAll();

    return () => {
      disposed = true;
      window.clearInterval(repairTimer);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      window.removeEventListener("HM51_FCM_MESSAGE", onForegroundMessage as EventListener);
    };
  }, []);

  return null;
}
