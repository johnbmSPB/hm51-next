"use client";

import { useEffect, useRef } from "react";
import { loadTeamHistoryFromServer } from "./chatHistoryApi";
import {
  loadMessages,
  messageIds,
  serverIdOf,
  sortChatMessages,
  wasMessageDeleted,
  type ChatMessage,
} from "./chatLocalStore";
import {
  getLastServerHistoryId,
  saveLastServerHistoryId,
} from "./chatServerCursor";
import { useChat } from "./ChatProvider";

function mergeHistory(teamId: string, local: ChatMessage[], history: ChatMessage[]) {
  const next = [...local];

  for (const serverMessage of history) {
    const serverId = serverIdOf(serverMessage);
    if (!serverId) continue;
    if (wasMessageDeleted(teamId, [serverId])) continue;

    const existingIndex = next.findIndex((message) =>
      messageIds(message).includes(serverId)
    );

    if (existingIndex < 0) {
      next.push(serverMessage);
      continue;
    }

    const existing = next[existingIndex];
    next[existingIndex] = {
      ...serverMessage,
      clientId: existing.clientId || serverMessage.clientId,
      messageId: serverId,
      text: existing.pendingEdit ? existing.text : serverMessage.text,
      edited: existing.edited || serverMessage.edited,
      pendingEdit: existing.pendingEdit,
      status:
        existing.status === "queued" ||
        existing.status === "sending" ||
        existing.status === "failed" ||
        existing.status === "unknown"
          ? existing.status
          : "delivered",
      quote: serverMessage.quote || existing.quote,
    };
  }

  return sortChatMessages(next).slice(-250);
}

export default function ChatHistorySync() {
  const chat = useChat();
  const loadedTeamsRef = useRef(new Set<string>());
  const inFlightTeamsRef = useRef(new Set<string>());
  const accountRef = useRef("");

  useEffect(() => {
    if (accountRef.current === chat.gamerId) return;

    accountRef.current = chat.gamerId;
    loadedTeamsRef.current.clear();
    inFlightTeamsRef.current.clear();
  }, [chat.gamerId]);

  useEffect(() => {
    const teamId = chat.selectedTeamId;

    if (!chat.token || !chat.gamerId || !teamId) return;
    if (loadedTeamsRef.current.has(teamId)) return;
    if (inFlightTeamsRef.current.has(teamId)) return;

    inFlightTeamsRef.current.add(teamId);

    void (async () => {
      try {
        const local = loadMessages(teamId);
        const listId = Array.from(
          new Set(local.map(serverIdOf).filter(Boolean))
        ).slice(-250);

        // LAST_ID — отдельный серверный курсор истории.
        // Он НЕ вычисляется из push, локального кэша или отправленных сообщений.
        const lastId = getLastServerHistoryId(chat.gamerId, teamId);

        const result = await loadTeamHistoryFromServer(
          chat.token,
          teamId,
          chat.gamerId,
          lastId,
          listId
        );

        if (result.messages.length > 0) {
          chat.updateTeamMessages(teamId, (current) =>
            mergeHistory(teamId, current, result.messages)
          );
        }

        // Обновляем LAST_ID только значением, полученным из ответа серверной истории.
        saveLastServerHistoryId(chat.gamerId, teamId, result.lastServerId);

        loadedTeamsRef.current.add(teamId);
      } catch (error) {
        console.warn("Chat history sync failed", teamId, error);
      } finally {
        inFlightTeamsRef.current.delete(teamId);
      }
    })();
  }, [chat.token, chat.gamerId, chat.selectedTeamId]);

  return null;
}
