"use client";

import { useEffect } from "react";

type AnyObject = Record<string, any>;

type ChatMessage = {
  id?: string;
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

function normalize(value: any) {
  return text(value).replace(/\s+/g, " ").trim();
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

function messageMap(list: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  list.forEach((message) => {
    const id = text(message.id);
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

function findMessage(teamId: string, messageId: string) {
  const list = parseMessages(localStorage.getItem(`hm51_chat_${teamId || "default"}`));
  return list.find((message) => String(message.id) === String(messageId));
}

function replaceMessageText(teamId: string, messageId: string, nextText: string) {
  const key = `hm51_chat_${teamId || "default"}`;
  const list = parseMessages(localStorage.getItem(key));
  const updated = list.map((message) => {
    if (String(message.id) !== String(messageId)) return message;
    return { ...message, text: nextText, edited: true };
  });
  localStorage.setItem(key, JSON.stringify(updated.slice(-250)));
}

function removeMessage(teamId: string, messageId: string) {
  const key = `hm51_chat_${teamId || "default"}`;
  const list = parseMessages(localStorage.getItem(key));
  const updated = list.filter((message) => String(message.id) !== String(messageId));
  localStorage.setItem(key, JSON.stringify(updated.slice(-250)));
}

function payloadParts(payload: any) {
  const data = payload?.data || payload || {};
  const event = String(data.event || data.EVENT || data.type || data.TYPE || "").toUpperCase().replace(/[_-]/g, " ");
  const teamId = text(data.TEAM_ID || data.team_id || data.team || data.TEAM || payload?.TEAM_ID || payload?.teamId);
  const messageId = text(data.MESS_ID || data.mess_id || data.MESSAGE_ID || data.message_id || data.id || data.ID || payload?.message_id || payload?.MESS_ID);
  const body = normalize(data.TEXT || data.text || data.MESSAGE || data.message || data.BODY || data.body || payload?.body);

  return { event, teamId, messageId, body };
}

export default function ChatServerActionsBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const synced = new Set<string>();
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const originalFetch = window.fetch.bind(window);

    function syncLocalChange(key: string, oldRaw: string | null, newRaw: string) {
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
          const stored = teamId && messID ? findMessage(teamId, messID) : null;

          if (stored?.quote) {
            body.replyText = stored.quote.text || body.replyText || "";
            body.replyAuthor = stored.quote.author || body.replyAuthor || "";
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

      const { event: pushEvent, teamId, messageId, body } = payloadParts(event.data.payload);
      if (!teamId || !messageId) return;

      if (pushEvent.includes("EDIT")) {
        if (body) replaceMessageText(teamId, messageId, body);
        window.setTimeout(() => window.location.reload(), 120);
        return;
      }

      if (pushEvent.includes("DELETE")) {
        removeMessage(teamId, messageId);
        window.setTimeout(() => window.location.reload(), 120);
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
