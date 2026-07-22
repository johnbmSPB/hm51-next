"use client";

import { onMessage } from "firebase/messaging";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { waitForFirebaseMessaging } from "../lib/firebaseMessagingReady";

type BoundaryScope = "profile" | "events" | "teams" | "calendar" | "all";
type AnyObject = Record<string, unknown>;

const SPORTS_EVENTS = new Set([
  "NEW GAME",
  "EDIT GAME",
  "DELETE GAME",
  "NEW TRAINING",
  "EDIT TRAINING",
  "DELETE TRAINING",
  "GAMER CONFIRMATION",
  "GAME CONFIRMATION",
  "TRAINING CONFIRMATION",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function payloadData(payload: unknown): AnyObject {
  if (!payload || typeof payload !== "object") return {};
  const object = payload as AnyObject;
  const nested = object.data;
  return nested && typeof nested === "object" ? (nested as AnyObject) : object;
}

function firstValue(data: AnyObject, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
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

function isChatEvent(eventName: string) {
  return eventName === "PRIVATE CHAT" || eventName.includes("TEAM CHAT");
}

function matchesScope(scope: BoundaryScope, eventName: string) {
  if (!eventName || isChatEvent(eventName)) return false;
  if (scope === "all") return true;
  if (scope === "calendar" || scope === "events") {
    return SPORTS_EVENTS.has(eventName) || eventName === "JOIN TO TEAM";
  }
  if (scope === "teams" || scope === "profile") {
    return eventName === "JOIN TO TEAM";
  }
  return false;
}

export default function DataRevisionBoundary({
  children,
  scope,
}: {
  children: ReactNode;
  scope: BoundaryScope;
}) {
  const [pushRevision, setPushRevision] = useState(0);
  const handledPushes = useRef(new Set<string>());
  const remountTimer = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;

    const handlePayload = (payload: unknown) => {
      const eventName = pushEventName(payload);
      if (!matchesScope(scope, eventName)) return;

      const identity = pushIdentity(payload);
      if (identity && handledPushes.current.has(identity)) return;
      if (identity) {
        handledPushes.current.add(identity);
        if (handledPushes.current.size > 500) handledPushes.current.clear();
      }

      if (remountTimer.current !== null) window.clearTimeout(remountTimer.current);
      remountTimer.current = window.setTimeout(() => {
        remountTimer.current = null;
        setPushRevision((value) => value + 1);
      }, 350);
    };

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
        // Service Worker remains the fallback channel.
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    }
    void attachForeground();

    return () => {
      disposed = true;
      foregroundUnsubscribe?.();
      if (remountTimer.current !== null) window.clearTimeout(remountTimer.current);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
      }
    };
  }, [scope]);

  return <div key={`${scope}-${pushRevision}`}>{children}</div>;
}
