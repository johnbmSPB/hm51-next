"use client";

import { useEffect } from "react";

type Message = {
  id?: string;
  messID?: string;
  clientId?: string;
  text?: string;
  isMine?: boolean;
};

const PREFIX = "hm51_chat_";
const OUTBOX = "hm51_recent_outgoing_chat";
const ALIASES = "hm51_chat_server_id_map";

function str(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseList(raw: string | null): any[] {
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

function messageIds(message: Message) {
  return [str(message.id), str(message.messID), str(message.clientId)].filter(Boolean);
}

function resolveServerId(teamId: string, message: Message) {
  const aliases = parseObject(localStorage.getItem(ALIASES));
  const outbox = parseList(localStorage.getItem(OUTBOX));

  for (const rawId of messageIds(message)) {
    let id = rawId;
    const alias = str(aliases[`${teamId}:${id}`]);
    if (alias) id = alias;

    const saved = outbox
      .slice()
      .reverse()
      .find((item) => str(item.teamId) === teamId && (str(item.id) === id || str(item.serverId) === id));

    const serverId = str(saved?.serverId);
    if (serverId) return serverId;
    if (id) return id;
  }

  return "";
}

function sameMessage(first: Message, second: Message) {
  const firstIds = new Set(messageIds(first));
  return messageIds(second).some((id) => firstIds.has(id));
}

export default function ChatOutgoingActionsPollingFix() {
  useEffect(() => {
    const snapshots = new Map<string, string>();
    const sent = new Set<string>();

    function chatKeys() {
      const result: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        if (key.startsWith(PREFIX)) result.push(key);
      }
      return result;
    }

    async function post(url: string, body: Record<string, string>) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.result === false) throw new Error(json?.error || "Ошибка синхронизации");
    }

    function restore(key: string, oldRaw: string, error: unknown) {
      console.error("HM51 action sync failed", error);
      localStorage.setItem(key, oldRaw);
      snapshots.set(key, oldRaw);
      window.setTimeout(() => window.location.reload(), 50);
    }

    function process(key: string, oldRaw: string, newRaw: string) {
      const teamId = key.slice(PREFIX.length);
      const token = localStorage.getItem("hm51_token") || "";
      if (!teamId || !token) return;

      const oldMessages = parseList(oldRaw) as Message[];
      const newMessages = parseList(newRaw) as Message[];

      oldMessages.forEach((oldMessage) => {
        if (!oldMessage.isMine) return;
        const current = newMessages.find((message) => sameMessage(oldMessage, message));
        const messageId = resolveServerId(teamId, oldMessage);
        if (!messageId) return;

        if (!current) {
          const keyId = `delete:${teamId}:${messageId}`;
          if (sent.has(keyId)) return;
          sent.add(keyId);
          post("/api/chat/team-delete", { token, teamId, messageId }).catch((error) => restore(key, oldRaw, error));
          return;
        }

        const oldText = str(oldMessage.text);
        const newText = str(current.text);
        if (!newText || oldText === newText) return;

        const keyId = `edit:${teamId}:${messageId}:${newText}`;
        if (sent.has(keyId)) return;
        sent.add(keyId);
        post("/api/chat/team-edit", { token, teamId, messageId, text: newText }).catch((error) => restore(key, oldRaw, error));
      });
    }

    chatKeys().forEach((key) => snapshots.set(key, localStorage.getItem(key) || "[]"));

    const timer = window.setInterval(() => {
      const keys = new Set([...snapshots.keys(), ...chatKeys()]);
      keys.forEach((key) => {
        const next = localStorage.getItem(key) || "[]";
        const previous = snapshots.get(key);
        if (previous === undefined) {
          snapshots.set(key, next);
          return;
        }
        if (previous === next) return;
        snapshots.set(key, next);
        process(key, previous, next);
      });
    }, 300);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
