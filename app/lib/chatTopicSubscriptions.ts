"use client";

import { deleteToken } from "firebase/messaging";
import { setTeamTopic } from "../chat/chatApi";
import { waitForFirebaseMessaging } from "./firebaseMessagingReady";

const TOPIC_STATE_KEY = "hm51_chat_topic_subscriptions_v1";
const FCM_TOKEN_KEY = "hm51_web_fcm_token";
const DEVICE_ID_KEY = "hm51_web_device_id";
const LEGACY_RESET_KEY = "hm51_chat_topic_legacy_reset_v1";
const FCM_RESET_EVENT = "hm51-fcm-reset";

type TopicEntry = {
  accountId: string;
  fcmToken: string;
  deviceId: string;
  teamIds: string[];
};

type TopicState = {
  version: 1;
  entries: TopicEntry[];
};

let activeReconciliation: Promise<void> | null = null;
let pendingReconciliation: {
  token: string;
  accountId: string;
  desiredTeamIds: string[];
} | null = null;

function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function unique(values: unknown[]) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function readState(): TopicState {
  if (typeof window === "undefined") return { version: 1, entries: [] };

  try {
    const parsed = JSON.parse(localStorage.getItem(TOPIC_STATE_KEY) || "");
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
      return { version: 1, entries: [] };
    }

    const entries = parsed.entries
      .map((entry: Partial<TopicEntry>) => ({
        accountId: clean(entry.accountId),
        fcmToken: clean(entry.fcmToken),
        deviceId: clean(entry.deviceId),
        teamIds: unique(Array.isArray(entry.teamIds) ? entry.teamIds : []),
      }))
      .filter((entry: TopicEntry) => entry.teamIds.length > 0);

    return { version: 1, entries };
  } catch {
    return { version: 1, entries: [] };
  }
}

function writeState(entries: TopicEntry[]) {
  if (typeof window === "undefined") return;

  const normalized = entries
    .map((entry) => ({
      accountId: clean(entry.accountId),
      fcmToken: clean(entry.fcmToken),
      deviceId: clean(entry.deviceId),
      teamIds: unique(entry.teamIds),
    }))
    .filter((entry) => entry.teamIds.length > 0);

  if (normalized.length === 0) {
    localStorage.removeItem(TOPIC_STATE_KEY);
    return;
  }

  localStorage.setItem(
    TOPIC_STATE_KEY,
    JSON.stringify({ version: 1, entries: normalized } satisfies TopicState)
  );
}

function sameDevice(left: TopicEntry, right: TopicEntry) {
  if (left.fcmToken && right.fcmToken) return left.fcmToken === right.fcmToken;
  if (left.deviceId && right.deviceId) return left.deviceId === right.deviceId;
  return !left.fcmToken && !right.fcmToken && !left.deviceId && !right.deviceId;
}

async function resetLegacyFcmTokenIfNeeded() {
  if (localStorage.getItem(LEGACY_RESET_KEY) === "1") return false;

  const existingToken = clean(localStorage.getItem(FCM_TOKEN_KEY));
  if (!existingToken) {
    localStorage.setItem(LEGACY_RESET_KEY, "1");
    return false;
  }

  try {
    const messaging = await waitForFirebaseMessaging(4_000);
    if (!messaging || !(await deleteToken(messaging))) return false;

    localStorage.removeItem(FCM_TOKEN_KEY);
    localStorage.removeItem("hm51_fcm_last_register");
    localStorage.setItem(LEGACY_RESET_KEY, "1");
    window.dispatchEvent(new CustomEvent(FCM_RESET_EVENT));
    return true;
  } catch {
    // Повторим миграцию при следующем открытии чата.
    return false;
  }
}

async function reconcile(
  token: string,
  accountId: string,
  desiredTeamIds: string[]
) {
  const normalizedToken = clean(token);
  const normalizedAccount = clean(accountId);
  if (!normalizedToken || !normalizedAccount) return;

  if (await resetLegacyFcmTokenIfNeeded()) return;

  const current: TopicEntry = {
    accountId: normalizedAccount,
    fcmToken: clean(localStorage.getItem(FCM_TOKEN_KEY)),
    deviceId: clean(localStorage.getItem(DEVICE_ID_KEY)),
    teamIds: unique(desiredTeamIds),
  };

  const previous = readState().entries;
  const retained: TopicEntry[] = [];

  for (const entry of previous) {
    const desiredForEntry =
      entry.accountId === current.accountId && sameDevice(entry, current)
        ? current.teamIds
        : [];
    const staleTeamIds = entry.teamIds.filter(
      (teamId) => !desiredForEntry.includes(teamId)
    );

    const results = await Promise.allSettled(
      staleTeamIds.map((teamId) =>
        setTeamTopic(normalizedToken, teamId, "unsubscribe", {
          fcmToken: entry.fcmToken,
          deviceId: entry.deviceId,
        })
      )
    );

    const failedTeamIds = staleTeamIds.filter(
      (_, index) => results[index]?.status === "rejected"
    );

    if (failedTeamIds.length > 0) {
      retained.push({ ...entry, teamIds: failedTeamIds });
    }
  }

  const subscriptionResults = await Promise.allSettled(
    current.teamIds.map((teamId) =>
      setTeamTopic(normalizedToken, teamId, "subscribe", {
        fcmToken: current.fcmToken,
        deviceId: current.deviceId,
      })
    )
  );
  const subscribedTeamIds = current.teamIds.filter(
    (_, index) => subscriptionResults[index]?.status === "fulfilled"
  );

  const withoutCurrent = retained.filter(
    (entry) => !(entry.accountId === current.accountId && sameDevice(entry, current))
  );
  if (subscribedTeamIds.length > 0) {
    withoutCurrent.push({ ...current, teamIds: subscribedTeamIds });
  }
  writeState(withoutCurrent);
}

export function reconcileChatTopicSubscriptions(
  token: string,
  accountId: string,
  desiredTeamIds: string[]
) {
  pendingReconciliation = {
    token,
    accountId,
    desiredTeamIds: [...desiredTeamIds],
  };
  if (activeReconciliation) return activeReconciliation;

  const task = (async () => {
    while (pendingReconciliation) {
      const next = pendingReconciliation;
      pendingReconciliation = null;
      await reconcile(next.token, next.accountId, next.desiredTeamIds);
    }
  })().finally(() => {
    if (activeReconciliation === task) activeReconciliation = null;
  });
  activeReconciliation = task;
  return task;
}

export async function unsubscribeChatTeam(token: string, teamId: string) {
  const normalizedTeamId = clean(teamId);
  if (!clean(token) || !normalizedTeamId) return;

  const state = readState();
  const matchingEntries = state.entries.filter((entry) =>
    entry.teamIds.includes(normalizedTeamId)
  );

  const targets =
    matchingEntries.length > 0
      ? matchingEntries
      : [
          {
            accountId: "",
            fcmToken: clean(localStorage.getItem(FCM_TOKEN_KEY)),
            deviceId: clean(localStorage.getItem(DEVICE_ID_KEY)),
            teamIds: [normalizedTeamId],
          },
        ];

  await Promise.allSettled(
    targets.map((entry) =>
      setTeamTopic(token, normalizedTeamId, "unsubscribe", {
        fcmToken: entry.fcmToken,
        deviceId: entry.deviceId,
      })
    )
  );

  writeState(
    state.entries
      .map((entry) => ({
        ...entry,
        teamIds: entry.teamIds.filter((id) => id !== normalizedTeamId),
      }))
      .filter((entry) => entry.teamIds.length > 0)
  );
}

export async function cleanupChatPushSubscriptions(token: string) {
  if (typeof window === "undefined") return;

  const normalizedToken = clean(token);
  const entries = readState().entries;
  const unsubscribeTasks = normalizedToken
    ? entries.flatMap((entry) =>
        entry.teamIds.map((teamId) =>
          setTeamTopic(normalizedToken, teamId, "unsubscribe", {
            fcmToken: entry.fcmToken,
            deviceId: entry.deviceId,
          })
        )
      )
    : [];

  const revokeFcmToken = (async () => {
    try {
      const messaging = await waitForFirebaseMessaging(4_000);
      if (messaging) await deleteToken(messaging);
    } catch {
      // Серверная отписка от topics остаётся основным механизмом очистки.
    }
  })();

  await Promise.allSettled([...unsubscribeTasks, revokeFcmToken]);

  localStorage.removeItem(TOPIC_STATE_KEY);
  localStorage.removeItem(FCM_TOKEN_KEY);
  localStorage.removeItem("hm51_fcm_last_register");
}
