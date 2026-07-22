"use client";

import { useEffect } from "react";
import { reconcileChatTopicSubscriptions } from "../lib/chatTopicSubscriptions";
import { restoreActiveSession } from "../lib/sessionManager";

type AnyObject = Record<string, any>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asArray(value: unknown): AnyObject[] {
  if (Array.isArray(value)) return value as AnyObject[];
  if (value && typeof value === "object") return Object.values(value as AnyObject);
  return [];
}

function truthy(value: unknown) {
  if (value === true || value === 1) return true;
  return ["1", "true", "yes", "да", "active", "accepted", "approved"].includes(
    clean(value).toLowerCase()
  );
}

function getGamer(data: AnyObject) {
  return (
    data.GAMER ||
    data.gamer ||
    data.USER ||
    data.user ||
    data.data?.GAMER ||
    data.data?.gamer ||
    data.data?.USER ||
    data.data?.user ||
    {}
  );
}

function gamerId(data: AnyObject) {
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

function teamId(team: AnyObject) {
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

function activeTeamIds(data: AnyObject) {
  const memberships = asArray(
    data.GAMER_TEAMS ||
      data.gamer_teams ||
      data.data?.GAMER_TEAMS ||
      data.data?.gamer_teams
  );

  if (memberships.length === 0) {
    return [
      ...new Set(
        asArray(data.TEAMS || data.teams || data.data?.TEAMS || data.data?.teams)
          .map(teamId)
          .filter(Boolean)
      ),
    ];
  }

  return [
    ...new Set(
      memberships
        .filter((membership) => {
          const active = membership.ACTIVE_STATUS ?? membership.active_status;
          const pending = membership.WANT_JOIN ?? membership.want_join;
          return truthy(active) && !truthy(pending);
        })
        .map(teamId)
        .filter(Boolean)
    ),
  ];
}

export default function GlobalTopicSync() {
  useEffect(() => {
    let disposed = false;
    let running: Promise<void> | null = null;

    const sync = () => {
      if (disposed || running) return running;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return null;
      }

      const token = restoreActiveSession();
      if (!token) return null;

      running = (async () => {
        try {
          const response = await fetch("/api/me", {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=UTF-8" },
            body: JSON.stringify({ token }),
            cache: "no-store",
          });
          const json = await response.json();
          const accountId = gamerId(json);
          if (!response.ok || json?.result === false || !accountId) return;
          await reconcileChatTopicSubscriptions(token, accountId, activeTeamIds(json));
        } catch {
          // A later focus, reconnect or FCM registration retries the sync.
        }
      })().finally(() => {
        running = null;
      });

      return running;
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };

    void sync();
    const retry = window.setTimeout(syncWhenVisible, 8_000);
    window.addEventListener("hm51-fcm-registered", sync);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      disposed = true;
      window.clearTimeout(retry);
      window.removeEventListener("hm51-fcm-registered", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, []);

  return null;
}
