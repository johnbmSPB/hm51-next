function cursorKey(gamerId: string, teamId: string) {
  return `hm51_chat_last_server_id_${String(gamerId || "").trim()}_${String(teamId || "").trim()}`;
}

export function getLastServerHistoryId(gamerId: string, teamId: string) {
  if (typeof window === "undefined" || !gamerId || !teamId) return "0";
  return localStorage.getItem(cursorKey(gamerId, teamId)) || "0";
}

export function saveLastServerHistoryId(
  gamerId: string,
  teamId: string,
  serverLastId: string
) {
  if (typeof window === "undefined" || !gamerId || !teamId) return;

  const next = String(serverLastId || "").trim();
  if (!next || next === "0") return;

  const key = cursorKey(gamerId, teamId);
  const current = localStorage.getItem(key) || "0";

  const currentNumber = Number.parseInt(current, 10);
  const nextNumber = Number.parseInt(next, 10);

  if (Number.isFinite(currentNumber) && Number.isFinite(nextNumber)) {
    if (nextNumber > currentNumber) localStorage.setItem(key, String(nextNumber));
    return;
  }

  if (next !== current) localStorage.setItem(key, next);
}
