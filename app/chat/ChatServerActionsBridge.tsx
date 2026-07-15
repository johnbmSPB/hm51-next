"use client";

import { useEffect } from "react";

type AnyObject = Record<string, any>;

type ChatMessage = {
  id?: string;
  messID?: string;
  clientId?: string;
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

const SERVER_ID_MAP_KEY = "hm51_chat_server_id_map";

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
  return (
    text(message.id) === messageId ||
    text(message.messID) === messageId ||
    text(message.clientId) === messageId
  );
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
    return {
      ...message,
      id: text(message.id) || messageId,
      messID: text(message.messID) || messageId,
      text: nextText,
      edited: true,
    };
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

  if (changed) setChatStorageFromServer(key, JSON.stringify(updated.slice(-250)));
  return changed;
}

function payloadParts(payload: any) {
  const data = payload?.data || payload || {};
  const event = String(data.event || data.EVENT || data.type || data.TYPE || "")
    .toUpperCase()
    .replace(/[_-]/g, " ");
  const teamId = text(
    data.TEAM_ID ||
      data.team_id ||
      data.team ||
      data.TEAM ||
      payload?.TEAM_ID ||
      payload?.teamId ||
      payload?.team
  );
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

    let savedAliases: Record<string, string> = {};
    try {
      const parsed = JSON.parse(localStorage.getItem(SERVER_ID_MAP_KEY) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) savedAliases = parsed;
    } catch {
      savedAliases = {};
    }

    const serverIds = new Map<string, string>(Object.entries(savedAliases));

    function aliasKey(teamId: string, messageId: string) {
      return `${teamId}:${messageId}`;
    }

    function resolveServerId(teamId: string, messageId: string) {
      let current = text(messageId);
      const visited = new Set<string>();

      while (current && !visited.has(current)) {
        visited.add(current);
        const next = text(serverIds.get(aliasKey(teamId, current)));
        if (!next || next === current) break;
        current = next;
      }

      return current;
    }

    function rewriteMessageIds(teamId: string, raw: string) {
      const rewritten = parseMessages(raw).map((message) => {
        const originalId = text(message.clientId) || text(message.id) || text(message.messID);
        const currentId = text(message.messID) || text(message.id);
        const serverId = resolveServerId(teamId, currentId || originalId);
        const quoteId = resolveServerId(teamId, text(message.quote?.id));

        if (!serverId && !quoteId) return message;

        return {
          ...message,
          clientId: originalId || undefined,
          id: serverId || text(message.id),
          messID: serverId || text(message.messID) || text(message.id),
          quote: message.quote
            ? {
                ...message.quote,
                id: quoteId || text(message.quote.id),
              }
            : undefined,
        };
      });

      return JSON.stringify(rewritten.slice(-250));
    }

    function registerServerId(teamId: string, clientId: string, serverId: string) {
      const cleanClientId = text(clientId);
      const cleanServerId = text(serverId);
      if (!teamId || !cleanClientId || !cleanServerId || cleanClientId === cleanServerId) return;

      serverIds.set(aliasKey(teamId, cleanClientId), cleanServerId);
      originalSetItem(SERVER_ID_MAP_KEY, JSON.stringify(Object.fromEntries(serverIds)));

      const key = `hm51_chat_${teamId || "default"}`;
      const currentRaw = localStorage.getItem(key) || "[]";
      const rewritten = rewriteMessageIds(teamId, currentRaw);
      if (rewritten !== currentRaw) {
        suppressServerSync = true;
        originalSetItem(key, rewritten);
        window.setTimeout(() => {
          suppressServerSync = false;
        }, 0);
      }
    }

    function rollbackLocalChange(key: string, oldRaw: string | null, error: unknown) {
      console.error("HM51 chat server sync failed", error);
      suppressServerSync = true;
      originalSetItem(key, oldRaw || "[]");
      window.setTimeout(() => {
        suppressServerSync = false;
        window.location.reload();
      }, 30);
    }

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
        const serverMessageId = resolveServerId(teamId, id);

        if (!newMessage && oldMessage.isMine) {
          const dedupeKey = `delete:${teamId}:${serverMessageId}`;
          if (synced.has(dedupeKey)) return;
          synced.add(dedupeKey);
          postJson("/api/chat/team-delete", {
            token,
            teamId,
            messageId: serverMessageId,
          }).catch((error) => rollbackLocalChange(key, oldRaw, error));
          return;
        }

        if (!newMessage || !newMessage.isMine) return;

        const oldText = normalize(oldMessage.text);
        const newText = normalize(newMessage.text);
        if (!newText || oldText === newText) return;

        const dedupeKey = `edit:${teamId}:${serverMessageId}:${newText}`;
        if (synced.has(dedupeKey)) return;
        synced.add(dedupeKey);
        postJson("/api/chat/team-edit", {
          token,
          teamId,
          messageId: serverMessageId,
          text: newText,
        }).catch((error) => rollbackLocalChange(key, oldRaw, error));
      });
    }

    window.localStorage.setItem = function patchedSetItem(key: string, value: string) {
      const oldRaw = window.localStorage.getItem(key);
      const teamId = chatTeamIdFromKey(key);
      const finalValue = teamId ? rewriteMessageIds(teamId, value) : value;
      originalSetItem(key, finalValue);
      syncLocalChange(key, oldRaw, finalValue);
    };

    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
      let sendMeta: { teamId: string; clientId: string } | null = null;

      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("/api/chat/team-send") && init?.body && typeof init.body === "string") {
          const body = JSON.parse(init.body) as AnyObject;
          const teamId = text(body.teamId);
          const clientId = text(body.messID);
          const rawReplyTo = text(body.replyTo);
          const replyTo = resolveServerId(teamId, rawReplyTo);
          const stored = teamId && clientId ? findMessage(teamId, resolveServerId(teamId, clientId) || clientId) : null;
          const quoted = teamId && replyTo ? quoteFromHistory(teamId, replyTo) : null;
          const quote = stored?.quote || quoted;

          body.replyTo = replyTo || rawReplyTo || "";

          if (quote) {
            body.replyText = quote.text || body.replyText || "";
            body.replyAuthor = quote.author || body.replyAuthor || "";
            body.replySender = quote.author || body.replySender || "";
          }

          sendMeta = { teamId, clientId };
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // Не ломаем обычный fetch.
      }

      const request = originalFetch(input, init);
      if (!sendMeta) return request;

      return request.then((response) => {
        response
          .clone()
          .json()
          .then((json) => {
            if (!response.ok || json?.result === false) return;
            const serverId = text(json?.message_id || json?.MESSAGE_ID || json?.server?.message_id);
            if (serverId) registerServerId(sendMeta!.teamId, sendMeta!.clientId, serverId);
          })
          .catch(() => {});

        return response;
      });
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
