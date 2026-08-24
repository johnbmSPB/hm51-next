export const CHAT_UNREAD_CHANGED_EVENT = "hm51-chat-unread-changed";

type TeamUnread = {
  count: number;
  seenIds: string[];
};

type UnreadState = {
  teams: Record<string, TeamUnread>;
};

const STORAGE_PREFIX = "hm51_chat_unread_v1_";
const MAX_SEEN_IDS = 120;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function tokenScope() {
  if (typeof window === "undefined") return "server";
  const token =
    window.localStorage.getItem("hm51_token") ||
    window.localStorage.getItem("auth_token") ||
    "anonymous";

  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function storageKey() {
  return `${STORAGE_PREFIX}${tokenScope()}`;
}

function emptyState(): UnreadState {
  return { teams: {} };
}

export function readChatUnreadState(): UnreadState {
  if (typeof window === "undefined") return emptyState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey()) || "{}");
    const teams = parsed?.teams && typeof parsed.teams === "object" ? parsed.teams : {};
    const normalized: Record<string, TeamUnread> = {};

    Object.entries(teams).forEach(([teamId, raw]) => {
      const item = raw as Partial<TeamUnread>;
      const count = Math.max(0, Number(item?.count) || 0);
      const seenIds = Array.isArray(item?.seenIds)
        ? item.seenIds.map(clean).filter(Boolean).slice(-MAX_SEEN_IDS)
        : [];
      if (count > 0 || seenIds.length > 0) normalized[clean(teamId)] = { count, seenIds };
    });

    return { teams: normalized };
  } catch {
    return emptyState();
  }
}

function writeState(state: UnreadState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(CHAT_UNREAD_CHANGED_EVENT));
}

export function getChatUnreadCounts() {
  const state = readChatUnreadState();
  return Object.fromEntries(
    Object.entries(state.teams).map(([teamId, item]) => [teamId, Math.max(0, item.count || 0)])
  ) as Record<string, number>;
}

export function getTotalChatUnread() {
  return Object.values(getChatUnreadCounts()).reduce((sum, count) => sum + count, 0);
}

export function recordChatUnread(teamIdValue: string, uniqueIdValue: string) {
  const teamId = clean(teamIdValue);
  const uniqueId = clean(uniqueIdValue);
  if (!teamId || !uniqueId || typeof window === "undefined") return false;

  const state = readChatUnreadState();
  const current = state.teams[teamId] || { count: 0, seenIds: [] };
  if (current.seenIds.includes(uniqueId)) return false;

  state.teams[teamId] = {
    count: current.count + 1,
    seenIds: [...current.seenIds, uniqueId].slice(-MAX_SEEN_IDS),
  };
  writeState(state);
  return true;
}

export function markChatTeamRead(teamIdValue: string) {
  const teamId = clean(teamIdValue);
  if (!teamId || typeof window === "undefined") return;

  const state = readChatUnreadState();
  const current = state.teams[teamId];
  if (!current || current.count === 0) return;

  state.teams[teamId] = { ...current, count: 0 };
  writeState(state);
}
