"use client";

import { useEffect, useRef } from "react";
import { teamIdOf } from "./chatApi";
import { loadTeamHistoryFromServer } from "./chatHistoryApi";
import {
  loadMessages,
  messageIds,
  serverIdOf,
  wasMessageDeleted,
  type ChatMessage,
} from "./chatLocalStore";
import {
  getLastServerHistoryId,
  saveLastServerHistoryId,
} from "./chatServerCursor";
import { useChat } from "./ChatProvider";

function numericId(value: string) {
  const normalized = String(value || "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

function pushListIdsAfterLastId(local: ChatMessage[], lastId: string) {
  const last = numericId(lastId) ?? 0n;
  const unique = new Set<string>();

  for (const message of local) {
    // LIST_ID — только уже полученные/подтверждённые сообщения с серверным ID,
    // которые находятся после текущего серверного LAST_ID.
    // Исторические сообщения <= LAST_ID и локальные pending/sent сюда не входят.
    if (message.status !== "delivered" && message.status !== "read") continue;

    const id = serverIdOf(message);
    const numeric = numericId(id);
    if (numeric === null || numeric <= last) continue;
    unique.add(id);
  }

  return [...unique].sort((left, right) => {
    const leftId = numericId(left) ?? 0n;
    const rightId = numericId(right) ?? 0n;
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
}

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

  // Здесь не сортируем по времени. Источником порядка является server message ID.
  // Экран чата отдельно выводит объединённый список по ID.
  return next.slice(-250);
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
    if (!chat.token || !chat.gamerId || chat.teams.length === 0) return;

    let disposed = false;

    const allTeamIds = Array.from(
      new Set([
        chat.selectedTeamId,
        ...chat.teams.map(teamIdOf),
      ].filter(Boolean))
    );

    const syncTeam = async (teamId: string) => {
      if (!teamId) return;
      if (loadedTeamsRef.current.has(teamId)) return;
      if (inFlightTeamsRef.current.has(teamId)) return;

      inFlightTeamsRef.current.add(teamId);

      try {
        const local = loadMessages(teamId);

        // Первый запуск: ключа ещё нет -> LAST_ID = 0.
        // Далее используем только сохранённый серверный курсор этой команды.
        const lastId = getLastServerHistoryId(chat.gamerId, teamId);

        // LIST_ID — перечень push/подтверждённых серверных ID после LAST_ID.
        const listId = pushListIdsAfterLastId(local, lastId);

        const result = await loadTeamHistoryFromServer(
          chat.token,
          teamId,
          chat.gamerId,
          lastId,
          listId
        );

        // LAST_ID обновляется только ID последнего сообщения массива,
        // который реально вернул get_team_history.php.
        saveLastServerHistoryId(chat.gamerId, teamId, result.lastServerId);

        // Затем сравниваем серверный массив с локальным по ID
        // и добавляем/обновляем недостающие сообщения.
        if (result.messages.length > 0) {
          chat.updateTeamMessages(teamId, (current) =>
            mergeHistory(teamId, current, result.messages)
          );
        }

        loadedTeamsRef.current.add(teamId);
      } catch (error) {
        console.warn("Chat history sync failed", teamId, error);
      } finally {
        inFlightTeamsRef.current.delete(teamId);
      }
    };

    void (async () => {
      // Сначала открытая команда, затем обязательно каждая остальные команда.
      for (const teamId of allTeamIds) {
        if (disposed) break;
        await syncTeam(teamId);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [chat.token, chat.gamerId, chat.teams, chat.selectedTeamId]);

  return null;
}
