"use client";

import { onMessage } from "firebase/messaging";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { reconcileChatTopicSubscriptions } from "./chatTopicSubscriptions";
import { waitForFirebaseMessaging } from "./firebaseMessagingReady";
import {
  cacheProfileResponse,
  readCachedProfileResponse,
  restoreActiveSession,
} from "./sessionManager";

type AnyObject = Record<string, any>;

type CacheRecord = {
  key: string;
  url: string;
  requestBody: string;
  savedAt: number;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: string;
};

type RevisionScope = "profile" | "events" | "teams" | "all";

type AppDataContextValue = {
  profileRevision: number;
  eventsRevision: number;
  teamsRevision: number;
  lastPushType: string;
  lastSyncAt: number;
  refreshProfile: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshAll: () => Promise<void>;
  invalidate: (scope: RevisionScope) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

const SESSION_CACHE_KEY = "hm51_app_data_runtime_cache_v1";
const MAX_CACHE_RECORDS = 18;
const STALE_PROFILE_MS = 15 * 60 * 1000;
const STALE_EVENTS_MS = 10 * 60 * 1000;
const STALE_TEAMS_MS = 10 * 60 * 1000;
const CACHEABLE_ENDPOINTS = new Set([
  "/api/me",
  "/api/events",
  "/api/find-teams",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asArray(value: unknown): AnyObject[] {
  if (Array.isArray(value)) return value as AnyObject[];
  if (value && typeof value === "object") return Object.values(value as AnyObject);
  return [];
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateText(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    date1: dateText(new Date(now.getFullYear(), now.getMonth(), 1)),
    date2: dateText(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function boolValue(value: unknown) {
  if (value === true || value === 1) return true;
  const normalized = clean(value).toLowerCase();
  return ["1", "true", "yes", "да", "active", "accepted", "approved"].includes(
    normalized
  );
}

function confirmationValue(value: unknown): boolean | null {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = clean(value).toLowerCase();
  if (["true", "1", "yes", "да", "confirmed"].includes(normalized)) return true;
  if (["false", "0", "no", "нет", "not confirmed", "not_confirmed"].includes(normalized)) {
    return false;
  }
  return null;
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

function activeTeamIdsFromProfile(data: AnyObject) {
  const memberships = asArray(
    data.GAMER_TEAMS ||
      data.gamer_teams ||
      data.data?.GAMER_TEAMS ||
      data.data?.gamer_teams
  );
  const teams = asArray(data.TEAMS || data.teams || data.data?.TEAMS || data.data?.teams);

  if (memberships.length === 0) {
    return [...new Set(teams.map(teamIdOf).filter(Boolean))];
  }

  return [
    ...new Set(
      memberships
        .filter((membership) => {
          const active = membership.ACTIVE_STATUS ?? membership.active_status;
          const pending = membership.WANT_JOIN ?? membership.want_join;
          return boolValue(active) && !boolValue(pending);
        })
        .map(teamIdOf)
        .filter(Boolean)
    ),
  ];
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

function pushEventName(payload: unknown) {
  const data = payloadData(payload);
  return firstValue(data, ["event", "EVENT", "type", "TYPE", "action", "ACTION"])
    .toUpperCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isChatPush(eventName: string) {
  return eventName === "PRIVATE CHAT" || eventName.includes("TEAM CHAT");
}

function pushIdentity(payload: unknown) {
  const data = payloadData(payload);
  const explicit = firstValue(data, [
    "push_id",
    "PUSH_ID",
    "notification_id",
    "NOTIFICATION_ID",
  ]);
  if (explicit) return explicit;

  return [
    pushEventName(payload),
    firstValue(data, ["game_id", "GAME_ID"]),
    firstValue(data, ["training_id", "TRAINING_ID", "tabid", "TABID"]),
    firstValue(data, ["team", "TEAM", "team_id", "TEAM_ID"]),
    firstValue(data, ["confirmed", "CONFIRMED"]),
    firstValue(data, ["message_time", "MESSAGE_TIME", "time", "TIME"]),
  ].join("|");
}

function normalizeBody(body: BodyInit | null | undefined) {
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  return "";
}

function endpointFromInput(input: RequestInfo | URL) {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    return new URL(raw, window.location.origin).pathname;
  } catch {
    return raw;
  }
}

function cacheKey(url: string, requestBody: string) {
  let normalizedBody = requestBody;
  try {
    const parsed = JSON.parse(requestBody || "{}");
    normalizedBody = JSON.stringify(
      Object.keys(parsed)
        .sort()
        .reduce<Record<string, unknown>>((result, key) => {
          result[key] = parsed[key];
          return result;
        }, {})
    );
  } catch {
    // Form body remains unchanged.
  }
  return `${url}|${normalizedBody}`;
}

function responseFromRecord(record: CacheRecord) {
  return new Response(record.body, {
    status: record.status,
    statusText: record.statusText,
    headers: record.headers,
  });
}

function cacheMaxAge(url: string) {
  if (url === "/api/me") return STALE_PROFILE_MS;
  if (url === "/api/events") return STALE_EVENTS_MS;
  return STALE_TEAMS_MS;
}

function readPersistedCache() {
  if (typeof window === "undefined") return new Map<string, CacheRecord>();
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || "[]");
    if (!Array.isArray(parsed)) return new Map<string, CacheRecord>();
    return new Map(
      parsed
        .filter((record) => record && typeof record === "object" && record.key)
        .map((record) => [record.key, record as CacheRecord])
    );
  } catch {
    return new Map<string, CacheRecord>();
  }
}

function persistCache(cache: Map<string, CacheRecord>) {
  if (typeof window === "undefined") return;
  const records = [...cache.values()]
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(0, MAX_CACHE_RECORDS);
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(records));
  } catch {
    // Runtime cache continues in memory if sessionStorage is full.
  }
}

function eventType(event: AnyObject) {
  return clean(event.hm51_type || event.type).toLowerCase() === "training"
    ? "training"
    : "game";
}

function eventId(event: AnyObject) {
  return clean(event.hm51_id || event.ID || event.id);
}

function sameEvent(event: AnyObject, type: "game" | "training", id: string) {
  return eventType(event) === type && eventId(event) === id;
}

function eventDate(event: AnyObject) {
  return clean(
    event.hm51_date ||
      event.date ||
      event.GAME_DATE ||
      event.game_date ||
      event.TRAINING_DATE ||
      event.training_date
  ).slice(0, 10);
}

function withinRange(value: string, date1: string, date2: string) {
  if (!value || !date1 || !date2) return true;
  return value >= date1 && value <= date2;
}

function sortEvents(events: AnyObject[]) {
  return [...events].sort((left, right) => {
    const first = `${eventDate(left)} ${clean(left.hm51_time || left.time)}`;
    const second = `${eventDate(right)} ${clean(right.hm51_time || right.time)}`;
    return first.localeCompare(second);
  });
}

function parseRecordJson(record: CacheRecord) {
  try {
    const json = JSON.parse(record.body);
    return json && typeof json === "object" ? json : null;
  } catch {
    return null;
  }
}

function requestJson(record: CacheRecord) {
  try {
    const json = JSON.parse(record.requestBody || "{}");
    return json && typeof json === "object" ? json : {};
  } catch {
    return {};
  }
}

function updateEventsForPush(record: CacheRecord, payload: unknown) {
  const json = parseRecordJson(record);
  if (!json || !Array.isArray(json.events)) {
    return { record, changed: false, needsRefresh: true };
  }

  const request = requestJson(record);
  const date1 = clean(request.date1);
  const date2 = clean(request.date2);
  const data = payloadData(payload);
  const eventName = pushEventName(payload);
  const teamId = firstValue(data, ["team", "TEAM", "team_id", "TEAM_ID"]);
  const gameId = firstValue(data, ["game_id", "GAME_ID"]);
  const trainingId = firstValue(data, ["training_id", "TRAINING_ID", "tabid", "TABID"]);
  let events = json.events as AnyObject[];
  let changed = false;
  let needsRefresh = false;

  if (eventName === "NEW GAME" && gameId) {
    const nextDate = firstValue(data, ["game_date", "GAME_DATE"]);
    if (withinRange(nextDate, date1, date2)) {
      const nextEvent = {
        hm51_type: "game",
        hm51_id: gameId,
        hm51_team_id: teamId,
        hm51_date: nextDate,
        hm51_time: firstValue(data, ["game_time", "GAME_TIME"]),
        hm51_title:
          firstValue(data, ["rival_txt", "RIVAL_TXT", "rival", "RIVAL"]) || "Игра",
        hm51_stadium: firstValue(data, ["stadium", "STADIUM"]),
        hm51_address: firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]),
        hm51_note: firstValue(data, ["note", "NOTE"]),
        hm51_attendance: "",
        hm51_member_id: "",
        hm51_confirmed: null,
        hm51_squad: "",
        hm51_pos: "",
      };
      events = events.some((item) => sameEvent(item, "game", gameId))
        ? events.map((item) =>
            sameEvent(item, "game", gameId) ? { ...item, ...nextEvent } : item
          )
        : [...events, nextEvent];
      changed = true;
    }
  } else if (eventName === "EDIT GAME" && gameId) {
    let found = false;
    events = events
      .map((item) => {
        if (!sameEvent(item, "game", gameId)) return item;
        found = true;
        const next = {
          ...item,
          hm51_team_id: teamId || item.hm51_team_id,
          hm51_date: firstValue(data, ["game_date", "GAME_DATE"]) || item.hm51_date,
          hm51_time: firstValue(data, ["game_time", "GAME_TIME"]) || item.hm51_time,
          hm51_title:
            firstValue(data, ["rival_txt", "RIVAL_TXT", "rival", "RIVAL"]) ||
            item.hm51_title,
          hm51_stadium:
            firstValue(data, ["stadium", "STADIUM"]) || item.hm51_stadium,
          hm51_address:
            firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]) ||
            item.hm51_address,
          hm51_note: firstValue(data, ["note", "NOTE"]) || item.hm51_note,
        };
        return next;
      })
      .filter((item) => withinRange(eventDate(item), date1, date2));
    changed = found;
    needsRefresh = !found;
  } else if (eventName === "DELETE GAME" && gameId) {
    const before = events.length;
    events = events.filter((item) => !sameEvent(item, "game", gameId));
    changed = events.length !== before;
  } else if (eventName === "NEW TRAINING" && trainingId) {
    const nextDate = firstValue(data, [
      "t_date",
      "T_DATE",
      "training_date",
      "TRAINING_DATE",
    ]);
    if (withinRange(nextDate, date1, date2)) {
      const nextEvent = {
        hm51_type: "training",
        hm51_id: trainingId,
        hm51_team_id: teamId,
        hm51_date: nextDate,
        hm51_time: firstValue(data, [
          "t_time",
          "T_TIME",
          "training_time",
          "TRAINING_TIME",
        ]),
        hm51_title: "Тренировка",
        hm51_stadium: firstValue(data, ["stadium", "STADIUM"]),
        hm51_address: firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]),
        hm51_note: firstValue(data, ["note", "NOTE"]),
        hm51_duration: firstValue(data, ["duration", "DURATION"]),
        hm51_attendance: "",
        hm51_member_id: "",
        hm51_confirmed: null,
        hm51_squad: "",
        hm51_pos: "",
      };
      events = events.some((item) => sameEvent(item, "training", trainingId))
        ? events.map((item) =>
            sameEvent(item, "training", trainingId) ? { ...item, ...nextEvent } : item
          )
        : [...events, nextEvent];
      changed = true;
    }
  } else if (eventName === "EDIT TRAINING" && trainingId) {
    let found = false;
    events = events
      .map((item) => {
        if (!sameEvent(item, "training", trainingId)) return item;
        found = true;
        return {
          ...item,
          hm51_team_id: teamId || item.hm51_team_id,
          hm51_date:
            firstValue(data, ["t_date", "T_DATE", "training_date", "TRAINING_DATE"]) ||
            item.hm51_date,
          hm51_time:
            firstValue(data, ["t_time", "T_TIME", "training_time", "TRAINING_TIME"]) ||
            item.hm51_time,
          hm51_stadium:
            firstValue(data, ["stadium", "STADIUM"]) || item.hm51_stadium,
          hm51_address:
            firstValue(data, ["stad_addr", "STAD_ADDR", "address", "ADDRESS"]) ||
            item.hm51_address,
          hm51_note: firstValue(data, ["note", "NOTE"]) || item.hm51_note,
          hm51_duration:
            firstValue(data, ["duration", "DURATION"]) || item.hm51_duration,
        };
      })
      .filter((item) => withinRange(eventDate(item), date1, date2));
    changed = found;
    needsRefresh = !found;
  } else if (eventName === "DELETE TRAINING" && trainingId) {
    const before = events.length;
    events = events.filter((item) => !sameEvent(item, "training", trainingId));
    changed = events.length !== before;
  } else if (
    ["GAMER CONFIRMATION", "GAME CONFIRMATION", "TRAINING CONFIRMATION"].includes(
      eventName
    )
  ) {
    const confirmed = confirmationValue(data.confirmed ?? data.CONFIRMED);
    const squad = firstValue(data, ["squad", "SQUAD"]);
    const pos = firstValue(data, ["pos", "POS", "position", "POSITION"]);
    let found = false;
    events = events.map((item) => {
      const matchesGame = gameId && sameEvent(item, "game", gameId);
      const matchesTraining = trainingId && sameEvent(item, "training", trainingId);
      if (!matchesGame && !matchesTraining) return item;
      found = true;
      return {
        ...item,
        ...(confirmed === null ? {} : { hm51_confirmed: confirmed }),
        ...(squad ? { hm51_squad: squad } : {}),
        ...(pos ? { hm51_pos: pos } : {}),
      };
    });
    changed = found;
    needsRefresh = true;
  }

  if (!changed) return { record, changed: false, needsRefresh };

  const nextJson = {
    ...json,
    events: sortEvents(events),
    gamesCount: events.filter((item) => eventType(item) === "game").length,
    trainingsCount: events.filter((item) => eventType(item) === "training").length,
  };

  return {
    record: { ...record, body: JSON.stringify(nextJson), savedAt: Date.now() },
    changed: true,
    needsRefresh,
  };
}

function isSuccessfulJsonResponse(record: CacheRecord) {
  if (record.status < 200 || record.status >= 300) return false;
  try {
    const json = JSON.parse(record.body);
    return json?.result !== false;
  } catch {
    return false;
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Map<string, CacheRecord>>(new Map());
  const originalFetchRef = useRef<typeof window.fetch | null>(null);
  const handledPushesRef = useRef(new Set<string>());
  const revalidatingRef = useRef(new Map<string, Promise<void>>());
  const fallbackRefreshTimerRef = useRef<number | null>(null);
  const [profileRevision, setProfileRevision] = useState(0);
  const [eventsRevision, setEventsRevision] = useState(0);
  const [teamsRevision, setTeamsRevision] = useState(0);
  const [lastPushType, setLastPushType] = useState("—");
  const [lastSyncAt, setLastSyncAt] = useState(0);

  const bumpForUrl = useCallback((url: string) => {
    if (url === "/api/me") {
      setProfileRevision((value) => value + 1);
      setTeamsRevision((value) => value + 1);
    } else if (url === "/api/events") {
      setEventsRevision((value) => value + 1);
    } else if (url === "/api/find-teams") {
      setTeamsRevision((value) => value + 1);
    }
  }, []);

  const writeRecord = useCallback(
    (record: CacheRecord, bump = true) => {
      cacheRef.current.set(record.key, record);
      persistCache(cacheRef.current);
      if (record.url === "/api/me") {
        try {
          const request = JSON.parse(record.requestBody || "{}");
          const json = JSON.parse(record.body);
          if (request.token && json) cacheProfileResponse(clean(request.token), json);
        } catch {
          // Runtime cache is still valid even if the compatibility cache fails.
        }
      }
      if (bump) bumpForUrl(record.url);
    },
    [bumpForUrl]
  );

  const captureResponse = useCallback(
    async (url: string, requestBody: string, response: Response) => {
      const cloned = response.clone();
      const body = await cloned.text();
      const record: CacheRecord = {
        key: cacheKey(url, requestBody),
        url,
        requestBody,
        savedAt: Date.now(),
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body,
      };
      if (isSuccessfulJsonResponse(record)) writeRecord(record);
      return record;
    },
    [writeRecord]
  );

  const syncTopicsFromProfile = useCallback(async (profile: AnyObject) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const token = restoreActiveSession();
    const gamerId = gamerIdFromProfile(profile);
    if (!token || !gamerId) return;
    await reconcileChatTopicSubscriptions(token, gamerId, activeTeamIdsFromProfile(profile));
  }, []);

  const refreshRecord = useCallback(
    async (record: CacheRecord, bump = true) => {
      const originalFetch = originalFetchRef.current;
      if (!originalFetch) return;
      if (revalidatingRef.current.has(record.key)) {
        await revalidatingRef.current.get(record.key);
        return;
      }

      const task = (async () => {
        try {
          const response = await originalFetch(record.url, {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=UTF-8" },
            body: record.requestBody,
            cache: "no-store",
          });
          const captured = await captureResponse(record.url, record.requestBody, response);
          if (captured.url === "/api/me" && isSuccessfulJsonResponse(captured)) {
            try {
              await syncTopicsFromProfile(JSON.parse(captured.body));
            } catch {
              // Topic synchronization must not block data refresh.
            }
          }
          if (!bump) writeRecord(captured, false);
          setLastSyncAt(Date.now());
        } catch {
          // Keep stale cached data if the server is temporarily unavailable.
        }
      })().finally(() => {
        revalidatingRef.current.delete(record.key);
      });

      revalidatingRef.current.set(record.key, task);
      await task;
    },
    [captureResponse, syncTopicsFromProfile, writeRecord]
  );

  const recordsForUrl = useCallback((url: string) => {
    return [...cacheRef.current.values()].filter((record) => record.url === url);
  }, []);

  const refreshProfile = useCallback(async () => {
    const records = recordsForUrl("/api/me");
    if (records.length > 0) {
      await Promise.all(records.map((record) => refreshRecord(record)));
      return;
    }

    const token = restoreActiveSession();
    const originalFetch = originalFetchRef.current;
    if (!token || !originalFetch) return;
    const requestBody = JSON.stringify({ token });
    try {
      const response = await originalFetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: requestBody,
        cache: "no-store",
      });
      const record = await captureResponse("/api/me", requestBody, response);
      if (isSuccessfulJsonResponse(record)) await syncTopicsFromProfile(JSON.parse(record.body));
      setLastSyncAt(Date.now());
    } catch {
      // Existing screens keep their current cached state.
    }
  }, [captureResponse, recordsForUrl, refreshRecord, syncTopicsFromProfile]);

  const refreshEvents = useCallback(async () => {
    const records = recordsForUrl("/api/events");
    if (records.length > 0) {
      await Promise.all(records.map((record) => refreshRecord(record)));
      return;
    }

    const token = restoreActiveSession();
    const originalFetch = originalFetchRef.current;
    if (!token || !originalFetch) return;
    const requestBody = JSON.stringify({ token, ...currentMonthRange() });
    try {
      const response = await originalFetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: requestBody,
        cache: "no-store",
      });
      await captureResponse("/api/events", requestBody, response);
      setLastSyncAt(Date.now());
    } catch {
      // Existing screens keep their current cached state.
    }
  }, [captureResponse, recordsForUrl, refreshRecord]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProfile(), refreshEvents()]);
  }, [refreshEvents, refreshProfile]);

  const invalidate = useCallback((scope: RevisionScope) => {
    const urls =
      scope === "all"
        ? ["/api/me", "/api/events", "/api/find-teams"]
        : scope === "profile"
          ? ["/api/me"]
          : scope === "events"
            ? ["/api/events"]
            : ["/api/find-teams"];

    for (const [key, record] of cacheRef.current.entries()) {
      if (urls.includes(record.url)) cacheRef.current.delete(key);
    }
    persistCache(cacheRef.current);
    urls.forEach(bumpForUrl);
  }, [bumpForUrl]);

  const scheduleFallbackRefresh = useCallback(() => {
    if (fallbackRefreshTimerRef.current !== null) {
      window.clearTimeout(fallbackRefreshTimerRef.current);
    }
    fallbackRefreshTimerRef.current = window.setTimeout(() => {
      fallbackRefreshTimerRef.current = null;
      void refreshAll();
    }, 400);
  }, [refreshAll]);

  const handlePush = useCallback(
    (payload: unknown) => {
      const eventName = pushEventName(payload);
      if (!eventName || isChatPush(eventName)) return;

      const identity = pushIdentity(payload);
      if (identity && handledPushesRef.current.has(identity)) return;
      if (identity) {
        handledPushesRef.current.add(identity);
        if (handledPushesRef.current.size > 500) handledPushesRef.current.clear();
      }

      setLastPushType(eventName);

      let changedEvents = false;
      let needsEventRefresh = false;
      for (const record of recordsForUrl("/api/events")) {
        const result = updateEventsForPush(record, payload);
        if (result.changed) {
          writeRecord(result.record, false);
          changedEvents = true;
        }
        if (result.needsRefresh) needsEventRefresh = true;
      }
      if (changedEvents) setEventsRevision((value) => value + 1);

      if (eventName === "JOIN TO TEAM") {
        void refreshAll();
        return;
      }

      if (
        [
          "NEW GAME",
          "EDIT GAME",
          "DELETE GAME",
          "NEW TRAINING",
          "EDIT TRAINING",
          "DELETE TRAINING",
        ].includes(eventName)
      ) {
        if (!changedEvents || needsEventRefresh) void refreshEvents();
        return;
      }

      if (
        ["GAMER CONFIRMATION", "GAME CONFIRMATION", "TRAINING CONFIRMATION"].includes(
          eventName
        )
      ) {
        window.setTimeout(() => void refreshEvents(), 180);
        return;
      }

      scheduleFallbackRefresh();
    },
    [recordsForUrl, refreshAll, refreshEvents, scheduleFallbackRefresh, writeRecord]
  );

  useEffect(() => {
    cacheRef.current = readPersistedCache();

    const originalFetch = window.fetch.bind(window);
    originalFetchRef.current = originalFetch;

    const cachedProfile = readCachedProfileResponse(restoreActiveSession(), Number.MAX_SAFE_INTEGER);
    if (cachedProfile) {
      const token = restoreActiveSession();
      const requestBody = JSON.stringify({ token });
      const record: CacheRecord = {
        key: cacheKey("/api/me", requestBody),
        url: "/api/me",
        requestBody,
        savedAt: Date.now(),
        status: 200,
        statusText: "OK",
        headers: [["content-type", "application/json"]],
        body: JSON.stringify(cachedProfile),
      };
      writeRecord(record, false);
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = endpointFromInput(input);
      const method = clean(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const requestBody = normalizeBody(init?.body);

      if (method !== "POST" || !CACHEABLE_ENDPOINTS.has(url) || !requestBody) {
        const response = await originalFetch(input, init);

        if (method === "POST" && response.ok && url.startsWith("/api/") && !url.startsWith("/api/chat/")) {
          const mutationPath = url.toLowerCase();
          if (
            mutationPath.includes("join") ||
            mutationPath.includes("leave-team") ||
            mutationPath.includes("profile") ||
            mutationPath.includes("delete-profile")
          ) {
            window.setTimeout(() => void refreshProfile(), 120);
          }
          if (
            mutationPath.includes("attendance") ||
            mutationPath.includes("agree") ||
            mutationPath.includes("game") ||
            mutationPath.includes("training") ||
            mutationPath.includes("event")
          ) {
            window.setTimeout(() => void refreshEvents(), 120);
          }
        }

        return response;
      }

      const key = cacheKey(url, requestBody);
      const cached = cacheRef.current.get(key);
      if (cached) {
        if (Date.now() - cached.savedAt > cacheMaxAge(url)) {
          void refreshRecord(cached);
        }
        return responseFromRecord(cached);
      }

      const response = await originalFetch(input, init);
      await captureResponse(url, requestBody, response);
      return response;
    };

    const token = restoreActiveSession();
    if (token) {
      void refreshProfile();
      void refreshEvents();
    }

    return () => {
      window.fetch = originalFetch;
      originalFetchRef.current = null;
      if (fallbackRefreshTimerRef.current !== null) {
        window.clearTimeout(fallbackRefreshTimerRef.current);
      }
    };
  }, [captureResponse, refreshEvents, refreshProfile, refreshRecord, writeRecord]);

  useEffect(() => {
    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "HM51_PUSH") return;
      handlePush(event.data.payload);
    };

    const attachForeground = async () => {
      try {
        const messaging = await waitForFirebaseMessaging();
        if (!messaging || disposed) return;
        foregroundUnsubscribe = onMessage(messaging, handlePush);
      } catch {
        // Service Worker remains the fallback push channel.
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
  }, [handlePush]);

  useEffect(() => {
    const syncTopics = async () => {
      const record = recordsForUrl("/api/me").sort((a, b) => b.savedAt - a.savedAt)[0];
      if (!record) return;
      try {
        await syncTopicsFromProfile(JSON.parse(record.body));
      } catch {
        // A later FCM registration or profile refresh will retry.
      }
    };

    const refreshWhenStale = () => {
      if (document.visibilityState !== "visible") return;
      const newest = [...cacheRef.current.values()].reduce(
        (latest, record) => Math.max(latest, record.savedAt),
        0
      );
      if (!newest || Date.now() - newest > STALE_PROFILE_MS) void refreshAll();
    };

    void syncTopics();
    window.addEventListener("hm51-fcm-registered", syncTopics);
    window.addEventListener("online", refreshAll);
    window.addEventListener("focus", refreshWhenStale);
    window.addEventListener("pageshow", refreshWhenStale);
    document.addEventListener("visibilitychange", refreshWhenStale);

    return () => {
      window.removeEventListener("hm51-fcm-registered", syncTopics);
      window.removeEventListener("online", refreshAll);
      window.removeEventListener("focus", refreshWhenStale);
      window.removeEventListener("pageshow", refreshWhenStale);
      document.removeEventListener("visibilitychange", refreshWhenStale);
    };
  }, [recordsForUrl, refreshAll, syncTopicsFromProfile]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      profileRevision,
      eventsRevision,
      teamsRevision,
      lastPushType,
      lastSyncAt,
      refreshProfile,
      refreshEvents,
      refreshAll,
      invalidate,
    }),
    [
      profileRevision,
      eventsRevision,
      teamsRevision,
      lastPushType,
      lastSyncAt,
      refreshProfile,
      refreshEvents,
      refreshAll,
      invalidate,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
