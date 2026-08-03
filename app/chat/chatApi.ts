import { CHAT_MESSAGE_MAX_LENGTH } from "../lib/chatLimits";
import { cleanText, type ChatMessage } from "./chatLocalStore";
import { ChatRequestError, httpChatErrorKind } from "./chatErrors";
import { buildTeamMessageRequest } from "./teamMessagePayload";

export type TeamObject = Record<string, any>;

const CHAT_REQUEST_TIMEOUT_MS = 15_000;

function array(value: unknown): TeamObject[] {
  if (Array.isArray(value)) return value as TeamObject[];
  if (value && typeof value === "object") return Object.values(value as TeamObject);
  return [];
}

export function teamIdOf(team: TeamObject) {
  return (
    cleanText(team.TEAM_ID) ||
    cleanText(team.team_id) ||
    cleanText(team.TEAM) ||
    cleanText(team.team) ||
    cleanText(team.ID) ||
    cleanText(team.id) ||
    cleanText(team.TEAM_INFO?.TEAM_ID) ||
    cleanText(team.TEAM_INFO?.team_id)
  );
}

export function teamNameOf(team: TeamObject, index: number) {
  const info = team.TEAM_INFO || {};
  return cleanText(info.NAME) || cleanText(info.name) || cleanText(team.NAME) || cleanText(team.name) || `Команда ${index + 1}`;
}

function activeMembership(team: TeamObject) {
  const raw = team.ACTIVE_STATUS ?? team.active_status ?? team.ACTIVE ?? team.active;
  if (raw === null || raw === undefined || raw === "") return true;
  return !["0", "false", "no", "нет", "inactive", "deleted"].includes(String(raw).toLowerCase());
}

function mergeTeams(data: TeamObject) {
  const gamerTeams = array(data.GAMER_TEAMS || data.gamer_teams || data.data?.GAMER_TEAMS || data.data?.gamer_teams);
  const teams = array(data.TEAMS || data.teams || data.data?.TEAMS || data.data?.teams);
  const byId: Record<string, TeamObject> = {};

  teams.forEach((team) => {
    const id = teamIdOf(team);
    if (id) byId[id] = team;
  });

  if (gamerTeams.length > 0) {
    return gamerTeams.filter(activeMembership).map((membership) => {
      const id = teamIdOf(membership);
      const info = byId[id] || {};
      return { ...info, ...membership, TEAM_INFO: info };
    });
  }

  return teams.filter(activeMembership);
}

function gamerIdFromMe(data: TeamObject) {
  const gamer = data.GAMER || data.gamer || data.USER || data.user || data.data?.GAMER || data.data?.USER || {};
  return cleanText(gamer.ID) || cleanText(gamer.id) || cleanText(gamer.GAMER_ID) || cleanText(gamer.gamer_id) || cleanText(gamer.USER_ID) || cleanText(gamer.user_id);
}

export function reportChatOperationError(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hm51-chat-operation-error", { detail: { message } }));
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function jsonRequest(url: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let json: TeamObject;
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid response shape");
      }
      json = parsed as TeamObject;
    } catch {
      if (!response.ok) {
        throw new ChatRequestError(
          "Сервер не принял запрос",
          httpChatErrorKind(response.status),
          response.status
        );
      }
      throw new ChatRequestError(
        "Результат операции не удалось подтвердить",
        "unknown-result",
        response.status
      );
    }

    if (!response.ok || json.result === false) {
      const status = response.status || 400;
      throw new ChatRequestError(
        cleanText(json.error) || "Сервер не принял запрос",
        response.ok ? "permanent" : httpChatErrorKind(status),
        status
      );
    }
    return json;
  } catch (error) {
    if (isAbortError(error)) {
      throw new ChatRequestError(
        "Сервер не ответил в течение 15 секунд",
        "unknown-result"
      );
    }
    if (error instanceof TypeError) {
      throw new ChatRequestError("Нет соединения с сервером", "transient");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadChatAccount(token: string) {
  const json = await jsonRequest("/api/me", { token });
  const gamerId = gamerIdFromMe(json);
  if (!gamerId) throw new Error("Не удалось определить пользователя");
  return { teams: mergeTeams(json), gamerId };
}

type TeamTopicAction = "subscribe" | "unsubscribe";

type TeamTopicOptions = {
  fcmToken?: string;
  deviceId?: string;
};

export async function setTeamTopic(
  token: string,
  teamId: string,
  action: TeamTopicAction,
  options: TeamTopicOptions = {}
) {
  const fcmToken =
    options.fcmToken ??
    (typeof window !== "undefined"
      ? localStorage.getItem("hm51_web_fcm_token") || ""
      : "");
  const deviceId =
    options.deviceId ??
    (typeof window !== "undefined"
      ? localStorage.getItem("hm51_web_device_id") || ""
      : "");

  await jsonRequest("/api/chat/topic", {
    token,
    teamId,
    action,
    fcmToken,
    deviceId,
    platform: "web",
  });
}

export function subscribeTeam(token: string, teamId: string) {
  return setTeamTopic(token, teamId, "subscribe");
}

export async function sendTeamMessage(token: string, message: ChatMessage) {
  const text = message.text.trim();
  if (text.length > CHAT_MESSAGE_MAX_LENGTH) throw new Error(`Сообщение длиннее ${CHAT_MESSAGE_MAX_LENGTH} символов`);

  const json = await jsonRequest("/api/chat/team-send", buildTeamMessageRequest(token, message));
  return cleanText(json.message_id || json.MESSAGE_ID || json.ID);
}

export async function editTeamMessage(token: string, teamId: string, messageId: string, messageText: string) {
  if (!messageId) throw new Error("У сообщения ещё нет серверного messageId");
  if (messageText.trim().length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new Error(`Сообщение длиннее ${CHAT_MESSAGE_MAX_LENGTH} символов`);
  }
  await jsonRequest("/api/chat/team-edit", { token, teamId, messageId, text: messageText });
}

export async function deleteTeamMessage(token: string, teamId: string, messageId: string) {
  if (!messageId) throw new Error("У сообщения ещё нет серверного messageId");
  await jsonRequest("/api/chat/team-delete", { token, teamId, messageId });
}
