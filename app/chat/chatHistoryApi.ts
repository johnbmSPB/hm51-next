import { type ChatMessage } from "./chatLocalStore";

export type TeamHistoryResult = {
  messages: ChatMessage[];
  lastServerId: string;
};

export async function loadTeamHistoryFromServer(
  token: string,
  teamId: string,
  gamerId: string,
  lastId: string,
  listId: string[]
): Promise<TeamHistoryResult> {
  const response = await fetch("/api/chat/team-history", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    cache: "no-store",
    body: JSON.stringify({ token, teamId, gamerId, lastId, listId }),
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Не удалось разобрать историю сообщений");
  }

  if (!response.ok || json?.result === false) {
    throw new Error(String(json?.error || "Не удалось загрузить историю сообщений"));
  }

  return {
    messages: Array.isArray(json?.messages) ? (json.messages as ChatMessage[]) : [],
    lastServerId: String(json?.lastServerId || lastId || "0"),
  };
}
