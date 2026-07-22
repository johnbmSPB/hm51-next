"use client";

import Link from "next/link";
import { onMessage } from "firebase/messaging";
import { useEffect, useMemo, useRef, useState } from "react";
import { reconcileChatTopicSubscriptions } from "../lib/chatTopicSubscriptions";
import { waitForFirebaseMessaging } from "../lib/firebaseMessagingReady";
import { restoreActiveSession } from "../lib/sessionManager";

type AnyObject = Record<string, any>;
type Tab = "calendar" | "profile" | "teams" | "log";

type PushLogItem = {
  id: string;
  event: string;
  receivedAt: string;
  action: string;
};

type RequestCounters = {
  profile: number;
  events: number;
};

const STALE_REFRESH_MS = 15 * 60 * 1000;
const MAX_PUSH_LOG = 30;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asArray(value: unknown): AnyObject[] {
  if (Array.isArray(value)) return value as AnyObject[];
  if (value && typeof value === "object") return Object.values(value as AnyObject);
  return [];
}

function boolValue(value: unknown) {
  const normalized = clean(value).toLowerCase();
  return value === true || value === 1 || normalized === "1" || normalized === "true";
}

function getGamer(data: AnyObject) {
  return (
    data.GAMER ||
    data.gamer ||
    data.PLAYER ||
    data.player ||
    data.USER ||
    data.user ||
    data.data?.GAMER ||
    data.data?.gamer ||
    data.data?.USER ||
    data.data?.user ||
    {}
  );
}

function gamerIdFromProfile(data: AnyObject) {
  const gamer = getGamer(data);
  return clean(
    gamer.ID ||
      gamer.id ||
      gamer.GAMER_ID ||
      gamer.gamer_id ||
      gamer.USER_ID ||
      gamer.user_id
  );
}

function teamIdOf(team: AnyObject) {
  return clean(
    team.TEAM_ID ||
      team.team_id ||
      team.TEAM ||
      team.team ||
      team.ID ||
      team.id ||
      team.TEAM_INFO?.TEAM_ID ||
      team.TEAM_INFO?.team_id
  );
}

function teamNameOf(team: AnyObject, index: number) {
  const info = team.TEAM_INFO || {};
  return (
    clean(info.NAME || info.name) ||
    clean(team.NAME || team.name || team.TEAM_NAME || team.team_name) ||
    `Команда ${index + 1}`
  );
}

function activeMembership(team: AnyObject) {
  const raw =
    team.ACTIVE_STATUS ??
    team.active_status ??
    team.ACTIVE ??
    team.active ??
    team.IS_ACTIVE ??
    team.is_active;

  if (raw === null || raw === undefined || raw === "") return true;

  return ![
    "0",
    "false",
    "no",
    "нет",
    "inactive",
    "deleted",
    "excluded",
  ].includes(clean(raw).toLowerCase());
}

function mergeActiveTeams(data: AnyObject) {
  const memberships = asArray(
    data.GAMER_TEAMS ||
      data.gamer_teams ||
      data.data?.GAMER_TEAMS ||
      data.data?.gamer_teams
  );
  const teams = asArray(
    data.TEAMS || data.teams || data.data?.TEAMS || data.data?.teams
  );
  const byId: Record<string, AnyObject> = {};

  teams.forEach((team) => {
    const id = teamIdOf(team);
    if (id) byId[id] = team;
  });

  if (memberships.length > 0) {
    return memberships.filter(activeMembership).map((membership) => {
      const id = teamIdOf(membership);
      const info = byId[id] || {};
      return { ...info, ...membership, TEAM_INFO: info };
    });
  }

  return teams.filter(activeMembership);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateText(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthRange(date = new Date()) {
  return {
    date1: dateText(new Date(date.getFullYear(), date.getMonth(), 1)),
    date2: dateText(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

function payloadData(payload: unknown): AnyObject {
  if (!payload || typeof payload !== "object") return {};
  const object = payload as AnyObject;
  return object.data && typeof object.data === "object" ? object.data : object;
}

function firstValue(data: AnyObject, keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && value !== "") return clean(value);
  }
  return "";
}

function eventName(payload: unknown) {
  const data = payloadData(payload);
  return firstValue(data, ["event", "EVENT", "type", "TYPE", "action", "ACTION"])
    .toUpperCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pushIdentity(payload: unknown) {
  const data = payloadData(payload);
  const explicit = firstValue(data, ["push_id", "PUSH_ID", "notification_id", "NOTIFICATION_ID"]);
  if (explicit) return explicit;

  return [
    eventName(payload),
    firstValue(data, ["game_id", "GAME_ID"]),
    firstValue(data, ["training_id", "TRAINING_ID", "tabid", "TABID"]),
    firstValue(data, ["team", "TEAM", "team_id", "TEAM_ID"]),
    firstValue(data, ["message_time", "MESSAGE_TIME", "time", "TIME"]),
    firstValue(data, ["confirmed", "CONFIRMED"]),
  ].join("|");
}

function eventKey(event: AnyObject) {
  return `${clean(event.hm51_type || event.type)}:${clean(event.hm51_id || event.ID || event.id)}`;
}

function sameEvent(event: AnyObject, type: "game" | "training", id: string) {
  return clean(event.hm51_type || event.type).toLowerCase() === type && clean(event.hm51_id || event.ID || event.id) === id;
}

function upsertEvent(events: AnyObject[], nextEvent: AnyObject) {
  const key = eventKey(nextEvent);
  const exists = events.some((event) => eventKey(event) === key);
  const next = exists
    ? events.map((event) => (eventKey(event) === key ? { ...event, ...nextEvent } : event))
    : [...events, nextEvent];

  return next.sort((left, right) => {
    const first = `${clean(left.hm51_date)} ${clean(left.hm51_time)}`;
    const second = `${clean(right.hm51_date)} ${clean(right.hm51_time)}`;
    return first.localeCompare(second);
  });
}

function applyCorePush(events: AnyObject[], payload: unknown) {
  const data = payloadData(payload);
  const event = eventName(payload);
  const teamId = firstValue(data, ["team", "TEAM", "team_id", "TEAM_ID"]);
  const gameId = firstValue(data, ["game_id", "GAME_ID"]);
  const trainingId = firstValue(data, ["training_id", "TRAINING_ID", "tabid", "TABID"]);

  if (event === "NEW GAME" && gameId) {
    return {
      events: upsertEvent(events, {
        hm51_type: "game",
        hm51_id: gameId,
        hm51_team_id: teamId,
        hm51_date: firstValue(data, ["game_date", "GAME_DATE"]) || dateText(new Date()),
        hm51_time: firstValue(data, ["game_time", "GAME_TIME"]) || "00:00",
        hm51_title: firstValue(data, ["rival_txt", "RIVAL_TXT", "rival", "RIVAL"]) || "Игра",
        hm51_stadium: firstValue(data, ["stadium", "STADIUM"]),
        hm51_address: firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]),
        hm51_note: firstValue(data, ["note", "NOTE"]),
        hm51_attendance: "",
        hm51_member_id: "",
      }),
      action: "Игра добавлена локально",
      refreshProfile: false,
      refreshEvents: false,
    };
  }

  if (event === "EDIT GAME" && gameId) {
    const found = events.some((item) => sameEvent(item, "game", gameId));
    const nextEvents = events.map((item) => {
      if (!sameEvent(item, "game", gameId)) return item;
      return {
        ...item,
        hm51_team_id: teamId || item.hm51_team_id,
        hm51_date: firstValue(data, ["game_date", "GAME_DATE"]) || item.hm51_date,
        hm51_time: firstValue(data, ["game_time", "GAME_TIME"]) || item.hm51_time,
        hm51_title:
          firstValue(data, ["rival_txt", "RIVAL_TXT", "rival", "RIVAL"]) ||
          item.hm51_title,
        hm51_stadium: firstValue(data, ["stadium", "STADIUM"]) || item.hm51_stadium,
        hm51_address:
          firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]) ||
          item.hm51_address,
        hm51_note: firstValue(data, ["note", "NOTE"]) || item.hm51_note,
      };
    });

    return {
      events: nextEvents,
      action: found ? "Игра изменена локально" : "Игра не найдена в памяти",
      refreshProfile: false,
      refreshEvents: !found,
    };
  }

  if (event === "DELETE GAME" && gameId) {
    return {
      events: events.filter((item) => !sameEvent(item, "game", gameId)),
      action: "Игра удалена локально",
      refreshProfile: false,
      refreshEvents: false,
    };
  }

  if (event === "NEW TRAINING" && trainingId) {
    return {
      events: upsertEvent(events, {
        hm51_type: "training",
        hm51_id: trainingId,
        hm51_team_id: teamId,
        hm51_date:
          firstValue(data, ["t_date", "T_DATE", "training_date", "TRAINING_DATE"]) ||
          dateText(new Date()),
        hm51_time:
          firstValue(data, ["t_time", "T_TIME", "training_time", "TRAINING_TIME"]) ||
          "00:00",
        hm51_title: "Тренировка",
        hm51_stadium: firstValue(data, ["stadium", "STADIUM"]),
        hm51_address: firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]),
        hm51_note: firstValue(data, ["note", "NOTE"]),
        hm51_duration: firstValue(data, ["duration", "DURATION"]),
        hm51_attendance: "",
        hm51_member_id: "",
      }),
      action: "Тренировка добавлена локально",
      refreshProfile: false,
      refreshEvents: false,
    };
  }

  if (event === "EDIT TRAINING" && trainingId) {
    const found = events.some((item) => sameEvent(item, "training", trainingId));
    const nextEvents = events.map((item) => {
      if (!sameEvent(item, "training", trainingId)) return item;
      return {
        ...item,
        hm51_team_id: teamId || item.hm51_team_id,
        hm51_date:
          firstValue(data, ["t_date", "T_DATE", "training_date", "TRAINING_DATE"]) ||
          item.hm51_date,
        hm51_time:
          firstValue(data, ["t_time", "T_TIME", "training_time", "TRAINING_TIME"]) ||
          item.hm51_time,
        hm51_stadium: firstValue(data, ["stadium", "STADIUM"]) || item.hm51_stadium,
        hm51_address:
          firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]) ||
          item.hm51_address,
        hm51_note: firstValue(data, ["note", "NOTE"]) || item.hm51_note,
        hm51_duration: firstValue(data, ["duration", "DURATION"]) || item.hm51_duration,
      };
    });

    return {
      events: nextEvents,
      action: found ? "Тренировка изменена локально" : "Тренировка не найдена в памяти",
      refreshProfile: false,
      refreshEvents: !found,
    };
  }

  if (event === "DELETE TRAINING" && trainingId) {
    return {
      events: events.filter((item) => !sameEvent(item, "training", trainingId)),
      action: "Тренировка удалена локально",
      refreshProfile: false,
      refreshEvents: false,
    };
  }

  if (event === "GAMER CONFIRMATION" && gameId) {
    const confirmed = firstValue(data, ["confirmed", "CONFIRMED"]).toLowerCase() === "true";
    const found = events.some((item) => sameEvent(item, "game", gameId));

    return {
      events: events.map((item) =>
        sameEvent(item, "game", gameId)
          ? { ...item, hm51_confirmed: confirmed }
          : item
      ),
      action: found
        ? `Подтверждение обновлено: ${confirmed ? "утверждён" : "не утверждён"}`
        : "Игра для подтверждения не найдена",
      refreshProfile: false,
      refreshEvents: true,
    };
  }

  if (event === "JOIN TO TEAM") {
    return {
      events,
      action: "Запрошено обновление команд и календаря",
      refreshProfile: true,
      refreshEvents: true,
    };
  }

  return {
    events,
    action: event ? "Push зарегистрирован без изменения core-store" : "Неизвестный push",
    refreshProfile: false,
    refreshEvents: false,
  };
}

function fullName(profile: AnyObject) {
  const gamer = getGamer(profile);
  return [
    gamer.FAMILY || gamer.family || gamer.LAST_NAME || gamer.last_name,
    gamer.NAME || gamer.name || gamer.FIRST_NAME || gamer.first_name,
    gamer.MIDNAME || gamer.midname || gamer.MIDDLE_NAME || gamer.middle_name,
  ]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

function formatSyncTime(timestamp: number) {
  if (!timestamp) return "ещё не выполнялась";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export default function DataLabClient() {
  const [tab, setTab] = useState<Tab>("calendar");
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<AnyObject>({});
  const [teams, setTeams] = useState<AnyObject[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [events, setEvents] = useState<AnyObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState("");
  const [pushCount, setPushCount] = useState(0);
  const [lastPushType, setLastPushType] = useState("—");
  const [lastSyncAt, setLastSyncAt] = useState(0);
  const [topicStatus, setTopicStatus] = useState("Ожидаем профиль и FCM-токен");
  const [requestCounters, setRequestCounters] = useState<RequestCounters>({
    profile: 0,
    events: 0,
  });
  const [pushLog, setPushLog] = useState<PushLogItem[]>([]);

  const handledPushes = useRef(new Set<string>());
  const lastFullRefreshRef = useRef(0);
  const tokenRef = useRef("");
  const profileRef = useRef<AnyObject>({});
  const eventsRef = useRef<AnyObject[]>([]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  async function loadProfile(currentToken: string) {
    setRequestCounters((old) => ({ ...old, profile: old.profile + 1 }));

    const response = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ token: currentToken }),
      cache: "no-store",
    });
    const json = await response.json();

    if (!response.ok || json.result === false) {
      throw new Error(json.error || "Не удалось загрузить профиль");
    }

    const nextTeams = mergeActiveTeams(json);
    setProfile(json);
    setTeams(nextTeams);
    setSelectedTeamId((old) => {
      if (old && nextTeams.some((team) => teamIdOf(team) === old)) return old;
      return teamIdOf(nextTeams[0] || {});
    });

    return json;
  }

  async function loadEvents(currentToken: string) {
    setRequestCounters((old) => ({ ...old, events: old.events + 1 }));
    const range = monthRange();
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ token: currentToken, ...range }),
      cache: "no-store",
    });
    const json = await response.json();

    if (!response.ok || json.result === false) {
      throw new Error(json.error || "Не удалось загрузить календарь");
    }

    setEvents(Array.isArray(json.events) ? json.events : []);
    return json;
  }

  async function refreshAll(currentToken = tokenRef.current, background = false) {
    if (!currentToken) return;

    try {
      if (background) setBackgroundLoading(true);
      else setLoading(true);
      setError("");
      await Promise.all([loadProfile(currentToken), loadEvents(currentToken)]);
      const now = Date.now();
      lastFullRefreshRef.current = now;
      setLastSyncAt(now);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Не удалось обновить данные"
      );
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  }

  async function refreshProfileAndTopics(currentToken = tokenRef.current) {
    if (!currentToken) return;
    try {
      setBackgroundLoading(true);
      const nextProfile = await loadProfile(currentToken);
      await syncTopics(currentToken, nextProfile);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Не удалось обновить команды"
      );
    } finally {
      setBackgroundLoading(false);
    }
  }

  async function refreshEventsOnly(currentToken = tokenRef.current) {
    if (!currentToken) return;
    try {
      setBackgroundLoading(true);
      await loadEvents(currentToken);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Не удалось обновить календарь"
      );
    } finally {
      setBackgroundLoading(false);
    }
  }

  async function syncTopics(currentToken: string, currentProfile = profileRef.current) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      setTopicStatus("Уведомления не разрешены — topic не синхронизирован");
      return;
    }

    const gamerId = gamerIdFromProfile(currentProfile);
    const activeTeams = mergeActiveTeams(currentProfile);
    const teamIds = activeTeams.map(teamIdOf).filter(Boolean);

    if (!currentToken || !gamerId) {
      setTopicStatus("Не удалось определить пользователя для topic");
      return;
    }

    try {
      setTopicStatus("Синхронизируем team topics...");
      await reconcileChatTopicSubscriptions(currentToken, gamerId, teamIds);
      setTopicStatus(
        teamIds.length > 0
          ? `Подписка активна: ${teamIds.map((id) => `team_${id}`).join(", ")}`
          : "Активных команд для подписки нет"
      );
    } catch {
      setTopicStatus("Не удалось синхронизировать team topics");
    }
  }

  function registerPushLog(payload: unknown, action: string) {
    const type = eventName(payload) || "UNKNOWN";
    const id = `${pushIdentity(payload)}-${Date.now()}`;
    const item: PushLogItem = {
      id,
      event: type,
      receivedAt: new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()),
      action,
    };

    setPushLog((old) => [item, ...old].slice(0, MAX_PUSH_LOG));
  }

  function handlePayload(payload: unknown) {
    const identity = pushIdentity(payload);
    if (identity && handledPushes.current.has(identity)) return;

    if (identity) {
      handledPushes.current.add(identity);
      if (handledPushes.current.size > 500) handledPushes.current.clear();
    }

    const result = applyCorePush(eventsRef.current, payload);
    eventsRef.current = result.events;
    setEvents(result.events);
    setPushCount((old) => old + 1);
    setLastPushType(eventName(payload) || "UNKNOWN");
    registerPushLog(payload, result.action);

    if (result.refreshProfile) {
      void refreshProfileAndTopics();
    }

    if (result.refreshEvents) {
      window.setTimeout(() => void refreshEventsOnly(), 150);
    }
  }

  useEffect(() => {
    const currentToken = restoreActiveSession();
    if (!currentToken) {
      window.location.replace("/login");
      return;
    }

    tokenRef.current = currentToken;
    setToken(currentToken);
    void refreshAll(currentToken);
  }, []);

  useEffect(() => {
    if (!token || !gamerIdFromProfile(profile)) return;

    const synchronize = () => void syncTopics(token, profile);
    synchronize();

    window.addEventListener("hm51-fcm-registered", synchronize);
    window.addEventListener("online", synchronize);

    return () => {
      window.removeEventListener("hm51-fcm-registered", synchronize);
      window.removeEventListener("online", synchronize);
    };
  }, [token, profile]);

  useEffect(() => {
    if (!token) return;

    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "HM51_PUSH") return;
      handlePayload(event.data.payload);
    };

    const attachForeground = async () => {
      try {
        const messaging = await waitForFirebaseMessaging();
        if (!messaging || disposed) return;
        foregroundUnsubscribe = onMessage(messaging, handlePayload);
      } catch {
        // Service Worker остаётся резервным каналом получения push.
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    }
    void attachForeground();

    return () => {
      disposed = true;
      foregroundUnsubscribe?.();
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
      }
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const refreshWhenStale = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFullRefreshRef.current < STALE_REFRESH_MS) return;
      void refreshAll(token, true);
    };

    const refreshAfterOnline = () => void refreshAll(token, true);

    window.addEventListener("focus", refreshWhenStale);
    window.addEventListener("pageshow", refreshWhenStale);
    window.addEventListener("online", refreshAfterOnline);
    document.addEventListener("visibilitychange", refreshWhenStale);

    return () => {
      window.removeEventListener("focus", refreshWhenStale);
      window.removeEventListener("pageshow", refreshWhenStale);
      window.removeEventListener("online", refreshAfterOnline);
      document.removeEventListener("visibilitychange", refreshWhenStale);
    };
  }, [token]);

  const selectedEvents = useMemo(() => {
    if (!selectedTeamId) return events;
    return events.filter(
      (event) => clean(event.hm51_team_id || event.TEAM_ID || event.team_id) === selectedTeamId
    );
  }, [events, selectedTeamId]);

  const gamesCount = selectedEvents.filter(
    (event) => clean(event.hm51_type).toLowerCase() === "game"
  ).length;
  const trainingsCount = selectedEvents.filter(
    (event) => clean(event.hm51_type).toLowerCase() === "training"
  ).length;
  const gamer = getGamer(profile);
  const gamerId = gamerIdFromProfile(profile);

  return (
    <main className="min-h-dvh bg-[#121715] px-4 pb-16 pt-6 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-[30px] border border-[#20d1a8]/25 bg-[#2d332f] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#20d1a8]">
                Экспериментальная ветка
              </p>
              <h1 className="mt-2 text-2xl font-black">Глобальные данные + push</h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/50">
                Основные экраны приложения не изменены. На этой странице профиль, команды и
                календарь загружаются один раз, а внутренние вкладки используют общую память.
              </p>
            </div>

            <Link
              href="/calendar"
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white"
            >
              Обычный календарь
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Запросы /api/me" value={String(requestCounters.profile)} />
            <Metric label="Запросы /api/events" value={String(requestCounters.events)} />
            <Metric label="Получено push" value={String(pushCount)} />
            <Metric label="Последний push" value={lastPushType} />
          </div>

          <div className="mt-3 rounded-2xl bg-[#121715] p-4 text-sm font-semibold text-white/60">
            <p>
              Последняя полная сверка: <strong className="text-white">{formatSyncTime(lastSyncAt)}</strong>
            </p>
            <p className="mt-2 break-words">
              Topics: <strong className="text-[#20d1a8]">{topicStatus}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshAll(token, true)}
            disabled={!token || backgroundLoading}
            className="mt-4 h-12 rounded-[26px] bg-[#20d1a8] px-5 text-sm font-black text-[#121715] disabled:opacity-50"
          >
            {backgroundLoading ? "Обновляем в фоне..." : "Проверить сервер вручную"}
          </button>
        </header>

        {error && (
          <section className="mt-4 rounded-3xl bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {error}
          </section>
        )}

        <nav className="mt-5 grid grid-cols-4 gap-2 rounded-[26px] bg-[#2d332f] p-2">
          <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>Календарь</TabButton>
          <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>Профиль</TabButton>
          <TabButton active={tab === "teams"} onClick={() => setTab("teams")}>Команды</TabButton>
          <TabButton active={tab === "log"} onClick={() => setTab("log")}>Push-журнал</TabButton>
        </nav>

        <section className="mt-5 rounded-[30px] bg-[#2d332f] p-5">
          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#20d1a8]" />
              <p className="mt-4 text-sm font-bold text-white/50">Первичная загрузка данных...</p>
            </div>
          ) : tab === "calendar" ? (
            <CalendarTab
              teams={teams}
              selectedTeamId={selectedTeamId}
              setSelectedTeamId={setSelectedTeamId}
              events={selectedEvents}
              gamesCount={gamesCount}
              trainingsCount={trainingsCount}
            />
          ) : tab === "profile" ? (
            <ProfileTab gamer={gamer} gamerId={gamerId} />
          ) : tab === "teams" ? (
            <TeamsTab teams={teams} />
          ) : (
            <PushLogTab items={pushLog} />
          )}
        </section>

        <p className="mt-4 rounded-2xl bg-yellow-400/10 p-4 text-sm font-semibold leading-6 text-yellow-100">
          Проверка метода: переключай четыре вкладки и следи за счётчиками запросов сверху.
          Они не должны увеличиваться. Счётчики меняются только после push, ручного обновления,
          восстановления интернета или возврата после 15 минут в фоне.
        </p>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#121715] p-4">
      <p className="text-xs font-bold text-white/40">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-white">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "min-h-11 rounded-2xl bg-[#20d1a8] px-2 text-xs font-black text-[#121715]"
          : "min-h-11 rounded-2xl px-2 text-xs font-black text-white/45"
      }
    >
      {children}
    </button>
  );
}

function CalendarTab({
  teams,
  selectedTeamId,
  setSelectedTeamId,
  events,
  gamesCount,
  trainingsCount,
}: {
  teams: AnyObject[];
  selectedTeamId: string;
  setSelectedTeamId: (value: string) => void;
  events: AnyObject[];
  gamesCount: number;
  trainingsCount: number;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">Память приложения</p>
          <h2 className="mt-1 text-2xl font-black">Календарь</h2>
        </div>

        <select
          value={selectedTeamId}
          onChange={(event) => setSelectedTeamId(event.target.value)}
          className="h-11 rounded-2xl border border-white/15 bg-[#121715] px-4 text-sm font-bold text-white"
        >
          {teams.map((team, index) => {
            const id = teamIdOf(team);
            return (
              <option key={id || index} value={id}>
                {teamNameOf(team, index)}
              </option>
            );
          })}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Игры" value={String(gamesCount)} />
        <Metric label="Тренировки" value={String(trainingsCount)} />
      </div>

      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <p className="rounded-2xl bg-[#121715] p-4 text-sm font-semibold text-white/45">
            Событий выбранной команды в текущем месяце нет.
          </p>
        ) : (
          events.map((event, index) => (
            <article key={eventKey(event) || index} className="rounded-2xl bg-[#121715] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-white">
                    {clean(event.hm51_title) ||
                      (clean(event.hm51_type) === "game" ? "Игра" : "Тренировка")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white/45">
                    {clean(event.hm51_date)} · {clean(event.hm51_time)}
                  </p>
                </div>
                <span className="rounded-xl bg-[#20d1a8]/10 px-3 py-2 text-xs font-black text-[#20d1a8]">
                  {clean(event.hm51_type) === "game" ? "Игра" : "Тренировка"}
                </span>
              </div>

              {(clean(event.hm51_stadium) || clean(event.hm51_address)) && (
                <p className="mt-3 text-sm font-semibold text-white/60">
                  {[clean(event.hm51_stadium), clean(event.hm51_address)].filter(Boolean).join(" · ")}
                </p>
              )}

              {(event.hm51_attendance || event.hm51_confirmed !== undefined) && (
                <p className="mt-3 text-xs font-bold text-white/40">
                  Посещение: {clean(event.hm51_attendance) || "не указано"} · Утверждение: {String(event.hm51_confirmed ?? "не указано")}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function ProfileTab({ gamer, gamerId }: { gamer: AnyObject; gamerId: string }) {
  const rows = [
    ["ФИО", [gamer.FAMILY || gamer.family, gamer.NAME || gamer.name, gamer.MIDNAME || gamer.midname].map(clean).filter(Boolean).join(" ")],
    ["ID игрока", gamerId],
    ["Логин", clean(gamer.LOGIN || gamer.login)],
    ["Email", clean(gamer.EMAIL || gamer.email)],
    ["Телефон", clean(gamer.TEL || gamer.tel || gamer.PHONE || gamer.phone)],
  ].filter(([, value]) => Boolean(value));

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">Без повторного /api/me</p>
      <h2 className="mt-1 text-2xl font-black">{fullName({ GAMER: gamer }) || "Профиль игрока"}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-[#121715] p-4">
            <p className="text-xs font-bold text-[#20d1a8]">{label}</p>
            <p className="mt-2 break-words text-sm font-black text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamsTab({ teams }: { teams: AnyObject[] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">Активные членства</p>
      <h2 className="mt-1 text-2xl font-black">Команды: {teams.length}</h2>
      <div className="mt-4 space-y-3">
        {teams.length === 0 ? (
          <p className="rounded-2xl bg-[#121715] p-4 text-sm font-semibold text-white/45">
            Активных команд нет.
          </p>
        ) : (
          teams.map((team, index) => (
            <article key={teamIdOf(team) || index} className="rounded-2xl bg-[#121715] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-white">{teamNameOf(team, index)}</p>
                  <p className="mt-1 text-sm font-bold text-white/45">ID: {teamIdOf(team)}</p>
                </div>
                <span className="rounded-xl bg-[#20d1a8]/10 px-3 py-2 text-xs font-black text-[#20d1a8]">
                  active
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function PushLogTab({ items }: { items: PushLogItem[] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">Проверка live-обновлений</p>
      <h2 className="mt-1 text-2xl font-black">Последние push</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-[#121715] p-4 text-sm font-semibold text-white/45">
            Push ещё не приходили. Оставь страницу открытой и создай или измени событие с другого устройства.
          </p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-2xl bg-[#121715] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black text-white">{item.event}</p>
                <span className="text-xs font-bold text-white/35">{item.receivedAt}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#20d1a8]">{item.action}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
