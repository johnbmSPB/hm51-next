"use client";

import { useEffect, useRef } from "react";
import { teamIdOf } from "./chatApi";
import { loadTeamHistoryFromServer } from "./chatHistoryApi";
import {
  loadMessages,
  messageIds,
  serverIdOf,
  sortChatMessages,
  wasMessageDeleted,
  type ChatMessage,
} from "./chatLocalStore";
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

  useEffect(() => {
    if (!chat.token || !chat.gamerId || chat.teams.length === 0) return;

    let disposed = false;

    const syncTeam = async (teamId: string) => {
      if (!teamId || loadedTeamsRef.current.has(teamId)) return;
      loadedTeamsRef.current.add(teamId);

      const local = loadMessages(teamId);
      const listId = Array.from(
        new Set(local.map(serverIdOf).filter(Boolean))
      ).slice(-250);
      const lastId =
        [...local].reverse().map(serverIdOf).find(Boolean) || "0";

      try {
        const history = await loadTeamHistoryFromServer(
          chat.token,
          teamId,
          chat.gamerId,
          lastId,
          listId
        );
        if (disposed || history.length === 0) return;

        chat.updateTeamMessages(teamId, (current) =>
          mergeHistory(teamId, current, history)
        );
      } catch (error) {
        loadedTeamsRef.current.delete(teamId);
        console.warn("Chat history sync failed", teamId, error);
      }
    };

    const selected = chat.selectedTeamId;
    const allTeamIds = chat.teams.map(teamIdOf).filter(Boolean);

    void (async () => {
      if (selected) await syncTeam(selected);
      for (const teamId of allTeamIds) {
        if (disposed) break;
        if (teamId === selected) continue;
        await syncTeam(teamId);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [chat.token, chat.gamerId, chat.teams, chat.selectedTeamId]);

  return null;
}
