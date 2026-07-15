"use client";

import { useLayoutEffect } from "react";

type AnyObject = Record<string, any>;

type StoredMessage = {
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

const ALIAS_KEY = "hm51_chat_server_id_map";
const OUTBOX_KEY = "hm51_recent_outgoing_chat";

function str(value: unknown) {
  if (value === null || value === undefined) return "";
  const result = String(value).trim();
  return result === "." ? "" : result;
}

function parseList(raw: string | null): AnyObject[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function parseObject(raw: string | null): Record<string, string> {
  try {
    const value = JSON.parse(raw || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function ids(message: StoredMessage) {
  return [str(message.id), str(message.messID), str(message.clientId)].filter(Boolean);
}

function resolveServerId(teamId: string, value: string) {
  let current = str(value);
  if (!current) return "";

  const aliases = parseObject(localStorage.getItem(ALIAS_KEY));
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const next = str(aliases[`${teamId}:${current}`]);
    if (!next || next === current) break;
    current = next;
  }

  const outbox = parseList(localStorage.getItem(OUTBOX_KEY));
  const saved = outbox
    .slice()
    .reverse()
    .find(
      (item) =>
        str(item.teamId) === teamId &&
        (str(item.id) === current || str(item.serverId) === current || str(item.id) === str(value))
    );

  return str(saved?.serverId) || current;
}

function messages(teamId: string): StoredMessage[] {
  return parseList(localStorage.getItem(`hm51_chat_${teamId || "default"}`)) as StoredMessage[];
}

function findMessage(teamId: string, messageId: string) {
  const wanted = str(messageId);
  return messages(teamId).find((message) => ids(message).includes(wanted));
}

export default function ChatQuoteTransportFix() {
  useLayoutEffect(() => {
    const previousFetch = window.fetch.bind(window);

    window.fetch = function quoteAwareFetch(input: RequestInfo | URL, init?: RequestInit) {
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("/api/chat/team-send") && typeof init?.body === "string") {
          const body = JSON.parse(init.body) as AnyObject;
          const teamId = str(body.teamId || body.TEAM_ID);
          const clientMessageId = str(body.messID || body.MESS_ID);
          const rawReplyTo = str(body.replyTo || body.REPLY_TO);

          if (teamId && rawReplyTo) {
            const outgoing = clientMessageId ? findMessage(teamId, clientMessageId) : undefined;
            const quoted = findMessage(teamId, rawReplyTo);
            const quote = outgoing?.quote ||
              (quoted
                ? {
                    id: rawReplyTo,
                    text: str(quoted.text),
                    author: quoted.isMine ? "Вы" : str(quoted.author) || "Игрок",
                  }
                : undefined);

            const replyTo = resolveServerId(teamId, str(quote?.id) || rawReplyTo);
            const replyText = str(quote?.text) || str(body.replyText || body.REPLY_TEXT);
            const replySender = str(quote?.author) || str(body.replySender || body.REPLY_SENDER || body.replyAuthor);

            body.replyTo = replyTo;
            body.REPLY_TO = replyTo;

            if (replyText) {
              body.replyText = replyText;
              body.REPLY_TEXT = replyText;
            }

            if (replySender) {
              body.replySender = replySender;
              body.replyAuthor = replySender;
              body.REPLY_SENDER = replySender;
              body.REPLY_AUTHOR = replySender;
            }

            init = { ...init, body: JSON.stringify(body) };
          }
        }
      } catch (error) {
        console.error("HM51 quote transport error", error);
      }

      return previousFetch(input, init);
    };

    return () => {
      window.fetch = previousFetch;
    };
  }, []);

  return null;
}
