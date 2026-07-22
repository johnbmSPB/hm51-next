import { readFileSync, writeFileSync } from "node:fs";

const path = "app/lib/AppDataProvider.tsx";
let text = readFileSync(path, "utf8");
let changed = false;

function replaceOnce(oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one anchor, found ${count}`);
  }
  text = text.replace(oldValue, newValue);
  changed = true;
}

if (text.includes('import { reconcileChatTopicSubscriptions } from "./chatTopicSubscriptions";\n')) {
  replaceOnce(
    'import { reconcileChatTopicSubscriptions } from "./chatTopicSubscriptions";\n',
    "",
    "topic import"
  );
}

const legacyProfileHelpers = `function asArray(value: unknown): AnyObject[] {
  if (Array.isArray(value)) return value as AnyObject[];
  if (value && typeof value === "object") return Object.values(value as AnyObject);
  return [];
}

function pad(value: number) {
`;
if (text.includes(legacyProfileHelpers)) {
  replaceOnce(
    legacyProfileHelpers,
    `function pad(value: number) {
`,
    "asArray helper"
  );
}

const boolAndProfileHelpers = `function boolValue(value: unknown) {
  if (value === true || value === 1) return true;
  const normalized = clean(value).toLowerCase();
  return ["1", "true", "yes", "да", "active", "accepted", "approved"].includes(
    normalized
  );
}

function confirmationValue(value: unknown): boolean | null {
`;
if (text.includes(boolAndProfileHelpers)) {
  replaceOnce(
    boolAndProfileHelpers,
    `function confirmationValue(value: unknown): boolean | null {
`,
    "bool helper"
  );
}

const profileTopicHelpers = `function getGamer(data: AnyObject) {
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

`;
if (text.includes(profileTopicHelpers)) {
  replaceOnce(profileTopicHelpers, "", "profile topic helpers");
}

const syncCallback = `  const syncTopicsFromProfile = useCallback(async (profile: AnyObject) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const token = restoreActiveSession();
    const gamerId = gamerIdFromProfile(profile);
    if (!token || !gamerId) return;
    await reconcileChatTopicSubscriptions(token, gamerId, activeTeamIdsFromProfile(profile));
  }, []);

`;
if (text.includes(syncCallback)) {
  replaceOnce(syncCallback, "", "provider topic callback");
}

const refreshRecordTopicBlock = `          if (captured.url === "/api/me" && isSuccessfulJsonResponse(captured)) {
            try {
              await syncTopicsFromProfile(JSON.parse(captured.body));
            } catch {
              // Topic synchronization must not block data refresh.
            }
          }
`;
if (text.includes(refreshRecordTopicBlock)) {
  replaceOnce(refreshRecordTopicBlock, "", "refresh record topic sync");
}

if (text.includes("    [captureResponse, syncTopicsFromProfile, writeRecord]\n")) {
  replaceOnce(
    "    [captureResponse, syncTopicsFromProfile, writeRecord]\n",
    "    [captureResponse, writeRecord]\n",
    "refreshRecord dependencies"
  );
}

if (text.includes("      if (isSuccessfulJsonResponse(record)) await syncTopicsFromProfile(JSON.parse(record.body));\n")) {
  replaceOnce(
    "      if (isSuccessfulJsonResponse(record)) await syncTopicsFromProfile(JSON.parse(record.body));\n",
    "",
    "refreshProfile topic sync"
  );
}

if (text.includes("  }, [captureResponse, recordsForUrl, refreshRecord, syncTopicsFromProfile]);\n")) {
  replaceOnce(
    "  }, [captureResponse, recordsForUrl, refreshRecord, syncTopicsFromProfile]);\n",
    "  }, [captureResponse, recordsForUrl, refreshRecord]);\n",
    "refreshProfile dependencies"
  );
}

const combinedEffect = `  useEffect(() => {
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
`;

const staleOnlyEffect = `  useEffect(() => {
    const refreshWhenStale = () => {
      if (document.visibilityState !== "visible") return;
      const newest = [...cacheRef.current.values()].reduce(
        (latest, record) => Math.max(latest, record.savedAt),
        0
      );
      if (!newest || Date.now() - newest > STALE_PROFILE_MS) void refreshAll();
    };

    window.addEventListener("online", refreshAll);
    window.addEventListener("focus", refreshWhenStale);
    window.addEventListener("pageshow", refreshWhenStale);
    document.addEventListener("visibilitychange", refreshWhenStale);

    return () => {
      window.removeEventListener("online", refreshAll);
      window.removeEventListener("focus", refreshWhenStale);
      window.removeEventListener("pageshow", refreshWhenStale);
      document.removeEventListener("visibilitychange", refreshWhenStale);
    };
  }, [refreshAll]);
`;

if (text.includes(combinedEffect)) {
  replaceOnce(combinedEffect, staleOnlyEffect, "combined topic/stale effect");
}

if (changed) writeFileSync(path, text);
console.log(changed ? "Single global topic sync migration applied." : "Single global topic sync migration already applied.");
