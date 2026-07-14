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

let suppressServerSync = false;

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

function chatTeamIdFromKey(key: string) {
  if (!key.startsWith("hm51_chat_")) return "";
  return key.replace("hm51_chat_", "");
}

function parseMessages(raw: string | null): ChatMessage[] {
  try {
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function messageKey(message: ChatMessage) {
  return text(message.messID) || text(message.id);
}

function sameMessage(message: ChatMessage, messageId: string) {
  if (!messageId) return false;
  return text(message.id) === messageId || text(message.messID) === messageId;
}

function messageMap(list: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  list.forEach((message) => {
    const id = messageKey(message);
    if (id) map.set(id, message);
  });
  return map;
}

async function postJson(url: string, data: AnyObject) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify(data),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || json?.result === false) throw new Error(json?.error || "Сервер не принял действие");
  return json;
}

function selectedToken() {
  return localStorage.getItem("hm51_token") || "";
}

function chatMessages(teamId: string) {
  return parseMessages(localStorage.getItem(`hm51_chat_${teamId || "default"}`));
}

function findMessage(teamId: string, messageId: string) {
  return chatMessages(teamId).find((message) => sameMessage(message, messageId));
}

function quoteFromHistory(teamId: string, replyTo: string) {
  const quoted = findMessage(teamId, replyTo);
  if (!quoted) return null;

  return {
    id: text(quoted.messID) || text(quoted.id) || replyTo,
    text: text(quoted.text),
    author: quoted.isMine ? "Вы" : text(quoted.author) || "Игрок",
  };
}

function setChatStorageFromServer(key: string, value: string) {
  suppressServerSync = true;
  localStorage.setItem(key, value);
  window.setTimeout(() => {
    suppressServerSync = false;
  }, 0);
}

function replaceMessageText(teamId: string, messageId: string, nextText: string) {
  const key = `hm51_chat_${teamId || "default"}`;
  const list = parseMessages(localStorage.getItem(key));
  const updated = list.map((message) => {
    if (!sameMessage(message, messageId)) return message;
    return { ...message, id: text(message.id) || messageId, messID: text(message.messID) || messageId, text: nextText, edited: true };
  });
  setChatStorageFromServer(key, JSON.stringify(updated.slice(-250)));
}

function removeMessage(teamId: string, messageId: string) {
  const key = `hm51_chat_${teamId || "default"}`;
  const list = parseMessages(localStorage.getItem(key));
  const updated = list.filter((message) => !sameMessage(message, messageId));
  setChatStorageFromServer(key, JSON.stringify(updated.slice(-250)));
}

function patchReplyFields(teamId: string, messageId: string, replyTo: string, replyText: string, replySender: string) {
  if (!replyTo && !replyText) return false;

  const key = `hm51_chat_${teamId || "default"}`;
  const list = parseMessages(localStorage.getItem(key));
  let changed = false;

  const updated = list.map((message) => {
    if (!sameMessage(message, messageId)) return message;

    const nextQuote = {
      id: replyTo || message.quote?.id || "",
      text: replyText || message.quote?.text || "Цитируемое сообщение",
      author: replySender || message.quote?.author || "Сообщение",
    };

    changed = true;
    return {
      ...message,
      id: text(message.id) || messageId,
      messID: text(message.messID) || messageId,
      quote: nextQuote,
    };
  });

  if (changed) setChatStorageFromServer(key, JSON.stringify(updated.slice(-250)));
  return changed;
}

function payloadParts(payload: any) {
  const data = payload?.data || payload || {};
  const event = String(data.event || data.EVENT || data.type || data.TYPE || "").toUpperCase().replace(/[_-]/g, " ");
  const teamId = text(data.TEAM_ID || data.team_id || data.team || data.TEAM || payload?.TEAM_ID || payload?.teamId || payload?.team);
  const messageId = text(
    data.MESS_ID ||
      data.mess_id ||
      data.MESSAGE_ID ||
      data.message_id ||
      data.id ||
      data.ID ||
      payload?.message_id ||
      payload?.MESS_ID ||
      payload?.id
  );
  const body = normalize(
    data.NEW_TEXT ||
      data.new_text ||
      data.TEXT ||
      data.text ||
      data.MESSAGE ||
      data.message ||
      data.BODY ||
      data.body ||
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

  return { event, teamId, messageId, body, replyTo, replyText, replySender };
}

export default function ChatServerActionsBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const synced = new Set<string>();
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const originalFetch = window.fetch.bind(window);

    function syncLocalChange(key: string, oldRaw: string | null, newRaw: string) {
      if (suppressServerSync) return;

      const teamId = chatTeamIdFromKey(key);
      if (!teamId) return;

      const token = selectedToken();
      if (!token) return;

      const oldMessages = messageMap(parseMessages(oldRaw));
      const newMessages = messageMap(parseMessages(newRaw));

      oldMessages.forEach((oldMessage, id) => {
        const newMessage = newMessages.get(id);

        if (!newMessage && oldMessage.isMine) {
          const dedupeKey = `delete:${teamId}:${id}`;
          if (synced.has(dedupeKey)) return;
          synced.add(dedupeKey);
          postJson("/api/chat/team-delete", { token, teamId, messageId: id }).catch(() => {});
          return;
        }

        if (!newMessage || !newMessage.isMine) return;

        const oldText = normalize(oldMessage.text);
        const newText = normalize(newMessage.text);
        if (!newText || oldText === newText) return;

        const dedupeKey = `edit:${teamId}:${id}:${newText}`;
        if (synced.has(dedupeKey)) return;
        synced.add(dedupeKey);
        postJson("/api/chat/team-edit", { token, teamId, messageId: id, text: newText }).catch(() => {});
      });
    }

    window.localStorage.setItem = function patchedSetItem(key: string, value: string) {
      const oldRaw = window.localStorage.getItem(key);
      originalSetItem(key, value);
      syncLocalChange(key, oldRaw, value);
    };

    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("/api/chat/team-send") && init?.body && typeof init.body === "string") {
          const body = JSON.parse(init.body) as AnyObject;
          const teamId = text(body.teamId);
          const messID = text(body.messID);
          const replyTo = text(body.replyTo);
          const stored = teamId && messID ? findMessage(teamId, messID) : null;
          const quoted = teamId && replyTo ? quoteFromHistory(teamId, replyTo) : null;
          const quote = stored?.quote || quoted;

          if (quote) {
            body.replyTo = quote.id || replyTo || body.replyTo || "";
            body.replyText = quote.text || body.replyText || "";
            body.replyAuthor = quote.author || body.replyAuthor || "";
            body.replySender = quote.author || body.replySender || "";
            init = { ...init, body: JSON.stringify(body) };
          }
        }
      } catch {
        // Не ломаем обычный fetch.
      }

      return originalFetch(input, init);
    };

    function onSwMessage(event: MessageEvent) {
      if (event.data?.type !== "HM51_PUSH") return;

      const { event: pushEvent, teamId, messageId, body, replyTo, replyText, replySender } = payloadParts(event.data.payload);
      if (!teamId || !messageId) return;

      if (pushEvent === "TEAM CHAT MESSAGE EDITED" || pushEvent.includes("EDIT")) {
        if (body) replaceMessageText(teamId, messageId, body);
        window.setTimeout(() => window.location.reload(), 120);
        return;
      }

      if (pushEvent === "TEAM CHAT MESSAGE DELETED" || pushEvent.includes("DELETE")) {
        removeMessage(teamId, messageId);
        window.setTimeout(() => window.location.reload(), 120);
        return;
      }

      if (pushEvent === "TEAM CHAT" || pushEvent.includes("TEAM CHAT")) {
        window.setTimeout(() => {
          const changed = patchReplyFields(teamId, messageId, replyTo, replyText, replySender);
          if (changed) window.location.reload();
        }, 180);
      }
    }

    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      window.localStorage.setItem = originalSetItem;
      window.fetch = originalFetch;
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, []);

  return null;
}
