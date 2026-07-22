"use client";

import { onMessage } from "firebase/messaging";
import { useEffect, useMemo, useRef, useState } from "react";
import { waitForFirebaseMessaging } from "../lib/firebaseMessagingReady";
import { restoreActiveSession } from "../lib/sessionManager";

type AnyObject = Record<string, any>;
type ConfirmationState = boolean | null;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateText(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthRange() {
  const now = new Date();
  return {
    date1: dateText(new Date(now.getFullYear(), now.getMonth(), 1)),
    date2: dateText(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
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

function confirmationValue(value: unknown): ConfirmationState {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  const normalized = clean(value).toLowerCase();
  if (["true", "1", "yes", "да", "confirmed"].includes(normalized)) return true;
  if (["false", "0", "no", "нет", "not confirmed", "not_confirmed"].includes(normalized)) {
    return false;
  }

  return null;
}

function eventType(event: AnyObject) {
  return clean(event.hm51_type || event.type).toLowerCase() === "training"
    ? "training"
    : "game";
}

function eventId(event: AnyObject) {
  return clean(event.hm51_id || event.ID || event.id);
}

function eventKey(event: AnyObject) {
  return `${eventType(event)}:${eventId(event)}`;
}

function confirmationText(value: ConfirmationState) {
  if (value === true) return "Вас утвердили";
  if (value === false) return "Вас не утвердили";
  return "Решение ещё не принято";
}

function confirmationClass(value: ConfirmationState) {
  if (value === true) return "border-[#20d1a8]/35 bg-[#20d1a8]/10 text-[#20d1a8]";
  if (value === false) return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100";
}

function pushIdentity(payload: unknown) {
  const data = payloadData(payload);
  return [
    eventName(payload),
    firstValue(data, ["game_id", "GAME_ID"]),
    firstValue(data, ["training_id", "TRAINING_ID", "tabid", "TABID"]),
    firstValue(data, ["confirmed", "CONFIRMED"]),
    firstValue(data, ["message_time", "MESSAGE_TIME", "time", "TIME"]),
  ].join("|");
}

export default function ConfirmationStatusPanel() {
  const [events, setEvents] = useState<AnyObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastPush, setLastPush] = useState("—");
  const [refreshCount, setRefreshCount] = useState(0);

  const tokenRef = useRef("");
  const eventsRef = useRef<AnyObject[]>([]);
  const handledPushes = useRef(new Set<string>());

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  async function loadEvents(background = false) {
    const token = tokenRef.current;
    if (!token) return;

    try {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({ token, ...monthRange() }),
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить статусы утверждения");
      }

      const nextEvents = Array.isArray(json.events) ? json.events : [];
      eventsRef.current = nextEvents;
      setEvents(nextEvents);
      setRefreshCount((value) => value + 1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось обновить статусы утверждения"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function applyConfirmationPush(payload: unknown) {
    const type = eventName(payload);
    if (!["GAMER CONFIRMATION", "GAME CONFIRMATION", "TRAINING CONFIRMATION"].includes(type)) {
      return;
    }

    const identity = pushIdentity(payload);
    if (identity && handledPushes.current.has(identity)) return;
    if (identity) {
      handledPushes.current.add(identity);
      if (handledPushes.current.size > 300) handledPushes.current.clear();
    }

    const data = payloadData(payload);
    const gameId = firstValue(data, ["game_id", "GAME_ID"]);
    const trainingId = firstValue(data, ["training_id", "TRAINING_ID", "tabid", "TABID"]);
    const rawConfirmed = data.confirmed ?? data.CONFIRMED;
    const confirmed = confirmationValue(rawConfirmed);
    const squad = firstValue(data, ["squad", "SQUAD"]);
    const pos = firstValue(data, ["pos", "POS", "position", "POSITION"]);

    const nextEvents = eventsRef.current.map((event) => {
      const matchesGame = gameId && eventType(event) === "game" && eventId(event) === gameId;
      const matchesTraining =
        trainingId && eventType(event) === "training" && eventId(event) === trainingId;

      if (!matchesGame && !matchesTraining) return event;

      return {
        ...event,
        ...(confirmed === null ? {} : { hm51_confirmed: confirmed }),
        ...(squad ? { hm51_squad: squad } : {}),
        ...(pos ? { hm51_pos: pos } : {}),
      };
    });

    eventsRef.current = nextEvents;
    setEvents(nextEvents);
    setLastPush(type);

    window.setTimeout(() => void loadEvents(true), 180);
  }

  useEffect(() => {
    const token = restoreActiveSession();
    if (!token) return;

    tokenRef.current = token;
    void loadEvents();
  }, []);

  useEffect(() => {
    if (!tokenRef.current) return;

    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "HM51_PUSH") return;
      applyConfirmationPush(event.data.payload);
    };

    const attachForeground = async () => {
      const messaging = await waitForFirebaseMessaging();
      if (!messaging || disposed) return;
      foregroundUnsubscribe = onMessage(messaging, applyConfirmationPush);
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
  }, []);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((left, right) => {
        const first = `${clean(left.hm51_date)} ${clean(left.hm51_time)}`;
        const second = `${clean(right.hm51_date)} ${clean(right.hm51_time)}`;
        return first.localeCompare(second);
      }),
    [events]
  );

  return (
    <section className="bg-[#121715] px-4 pb-16 text-white">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-[#2d332f] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">
              Проверка утверждения
            </p>
            <h2 className="mt-2 text-2xl font-black">Игры и тренировки</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/50">
              Статус читается из hm51_confirmed. Push обновляет его сразу, затем выполняется
              фоновая сверка календаря для получения звена и позиции.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadEvents(true)}
            disabled={refreshing || !tokenRef.current}
            className="h-11 rounded-[24px] bg-[#20d1a8] px-4 text-sm font-black text-[#121715] disabled:opacity-50"
          >
            {refreshing ? "Проверяем..." : "Обновить статусы"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#121715] p-4">
            <p className="text-xs font-bold text-white/40">Последний push подтверждения</p>
            <p className="mt-2 text-base font-black text-white">{lastPush}</p>
          </div>
          <div className="rounded-2xl bg-[#121715] p-4">
            <p className="text-xs font-bold text-white/40">Загрузок статусов</p>
            <p className="mt-2 text-base font-black text-white">{refreshCount}</p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {error}
          </p>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/15 border-t-[#20d1a8]" />
            <p className="mt-4 text-sm font-bold text-white/45">Загружаем статусы...</p>
          </div>
        ) : sortedEvents.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[#121715] p-4 text-sm font-semibold text-white/45">
            В текущем месяце нет игр и тренировок.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedEvents.map((event, index) => {
              const confirmed = confirmationValue(event.hm51_confirmed);
              const squad = clean(event.hm51_squad || event.SQUAD || event.squad);
              const pos = clean(event.hm51_pos || event.POS || event.pos);
              const type = eventType(event);

              return (
                <article key={eventKey(event) || index} className="rounded-2xl bg-[#121715] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-white">
                        {clean(event.hm51_title) || (type === "game" ? "Игра" : "Тренировка")}
                      </p>
                      <p className="mt-1 text-sm font-bold text-white/45">
                        {clean(event.hm51_date)} · {clean(event.hm51_time)}
                      </p>
                    </div>

                    <span className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-white/55">
                      {type === "game" ? "Игра" : "Тренировка"}
                    </span>
                  </div>

                  <div
                    className={`mt-4 rounded-2xl border p-4 text-sm font-black ${confirmationClass(
                      confirmed
                    )}`}
                  >
                    {confirmationText(confirmed)}
                  </div>

                  {(squad || pos) && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {squad && (
                        <p className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-white/65">
                          Звено: <strong className="text-white">{squad}</strong>
                        </p>
                      )}
                      {pos && (
                        <p className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-white/65">
                          Позиция: <strong className="text-white">{pos}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
