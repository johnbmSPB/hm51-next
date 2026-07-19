"use client";

import { onMessage } from "firebase/messaging";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { waitForFirebaseMessaging } from "../lib/firebaseMessagingReady";
import { loadChatAccount, subscribeTeam, type TeamObject } from "./chatApi";
import {
  applyPush,
  loadMessages,
  parsePush,
  pushKey,
  saveMessages,
  selectedTeamKey,
  setChatAccountScope,
  type ChatMessage,
  type PushApplyResult,
} from "./chatSafeStore";
import {
  deleteChatPushQueueRecord,
  ensureChatPushQueue,
  readChatPushQueue,
} from "./chatPushQueue";

type MessagesUpdater = (messages: ChatMessage[]) => ChatMessage[];

const DEFERRED_PUSH_TTL_MS = 10 * 60 * 1000;
const PUSH_QUEUE_FALLBACK_INTERVAL_MS = 20_000;

type ChatContextValue = {
  token: string;
  gamerId: string;
  teams: TeamObject[];
  selectedTeamId: string;
  setSelectedTeamId: (teamId: string) => void;
  messages: ChatMessage[];
  updateTeamMessages: (teamId: string, updater: MessagesUpdater) => ChatMessage[];
  refreshMessages: (teamId?: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used inside ChatProvider");
  return value;
}

function teamId(team: TeamObject) {
  return String(team.TEAM_ID || team.team_id || team.TEAM || team.team || team.ID || team.id || "");
}

function postChatContext(gamerId: string, selectedTeamId: string, chatOpen: boolean) {
  if (!("serviceWorker" in navigator)) return;
  const context = {
    type: "HM51_SET_CHAT_CONTEXT",
    gamerId,
    teamId: selectedTeamId,
    chatOpen,
  };
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage(context);
      navigator.serviceWorker.controller?.postMessage(context);
    })
    .catch(() => {});
}

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [gamerId, setGamerId] = useState("");
  const [teams, setTeams] = useState<TeamObject[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const selectedTeamRef = useRef("");
  const handledPushes = useRef(new Set<string>());

  function setSelectedTeamId(value: string) {
    setSelectedTeamIdState(value);
  }

  function refreshMessages(team = selectedTeamRef.current) {
    if (team && selectedTeamRef.current === team) setMessages(loadMessages(team));
  }

  function updateTeamMessages(team: string, updater: MessagesUpdater) {
    const current = loadMessages(team);
    const next = updater(current).slice(-250);
    saveMessages(team, next);
    if (selectedTeamRef.current === team) setMessages(next);
    return next;
  }

  useEffect(() => {
    const savedToken = localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
    if (!savedToken) {
      window.location.href = "/login";
      return;
    }

    setToken(savedToken);

    loadChatAccount(savedToken)
      .then(({ teams: loadedTeams, gamerId: loadedGamerId }) => {
        setChatAccountScope(loadedGamerId);
        setGamerId(loadedGamerId);

        const scopedSelectedKey = selectedTeamKey(loadedGamerId);
        const legacySelectedKey = "hm51_selected_chat_team_id";
        const savedTeam =
          localStorage.getItem(scopedSelectedKey) || localStorage.getItem(legacySelectedKey) || "";
        const validSaved = savedTeam && loadedTeams.some((team) => teamId(team) === savedTeam);
        const initialTeam = validSaved ? savedTeam : teamId(loadedTeams[0] || {});

        localStorage.setItem(scopedSelectedKey, initialTeam);
        localStorage.removeItem(legacySelectedKey);
        setTeams(loadedTeams);
        setSelectedTeamIdState(initialTeam);
      })
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    selectedTeamRef.current = selectedTeamId;
    if (!selectedTeamId || !gamerId) return;

    localStorage.setItem(selectedTeamKey(gamerId), selectedTeamId);
    setMessages(loadMessages(selectedTeamId));
    postChatContext(gamerId, selectedTeamId, true);

    return () => {
      postChatContext(gamerId, "", false);
    };
  }, [selectedTeamId, gamerId]);

  useEffect(() => {
    if (!token || teams.length === 0) return;
    Promise.allSettled(
      teams
        .map(teamId)
        .filter(Boolean)
        .map((id) => subscribeTeam(token, id))
    ).catch(() => {});
  }, [token, teams]);

  useEffect(() => {
    if (!gamerId || teams.length === 0 || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;
    let foregroundAttaching = false;
    let queueProcessing = false;
    let wakeTimer: number | undefined;
    const allowedTeamIds = teams.map(teamId).filter(Boolean);
    handledPushes.current.clear();

    const handleFcmPayload = (payload: unknown): PushApplyResult => {
      const push = parsePush(payload);
      if (!push.teamId) return "ignored";
      if (push.recipientId && String(push.recipientId) !== String(gamerId)) return "ignored";
      if (!allowedTeamIds.includes(push.teamId)) return "ignored";

      const key = pushKey(push);
      if (handledPushes.current.has(key)) return "applied";

      const result = applyPush(push, gamerId);
      if (result !== "deferred" && result !== "storage-failed") {
        handledPushes.current.add(key);
        if (handledPushes.current.size > 500) handledPushes.current.clear();
      }
      if (result === "applied") refreshMessages(push.teamId);
      return result;
    };

    const inspectQueue = async () => {
      if (queueProcessing || disposed) return;
      queueProcessing = true;
      try {
        await ensureChatPushQueue();
        const records = await readChatPushQueue(gamerId, allowedTeamIds);
        for (const record of records) {
          if (disposed) break;

          const recordId = String(record.id || "");
          const createdAt = Number(record.createdAt || 0);
          const push = parsePush(record);
          const result = handleFcmPayload(record);
          const expiredDeferredAction =
            result === "deferred" &&
            createdAt > 0 &&
            Date.now() - createdAt > DEFERRED_PUSH_TTL_MS &&
            (push.event.includes("EDIT") || push.event.includes("DELETE"));

          if (result === "applied" || result === "ignored" || expiredDeferredAction) {
            await deleteChatPushQueueRecord(recordId);
          }
        }
      } finally {
        queueProcessing = false;
      }
    };

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "HM51_PUSH") return;
      const result = handleFcmPayload(event.data.payload);
      if (result !== "storage-failed") {
        window.setTimeout(() => void inspectQueue(), 80);
      }
    };

    const attachForegroundFcm = async () => {
      if (foregroundAttaching || foregroundUnsubscribe || disposed) return;
      foregroundAttaching = true;
      try {
        const messaging = await waitForFirebaseMessaging();
        if (!messaging || disposed) return;
        foregroundUnsubscribe = onMessage(messaging, handleFcmPayload);
      } finally {
        foregroundAttaching = false;
      }
    };

    const wakeChat = () => {
      if (disposed) return;
      void attachForegroundFcm();
      void inspectQueue();
      refreshMessages();

      if (wakeTimer) window.clearTimeout(wakeTimer);
      wakeTimer = window.setTimeout(() => {
        void inspectQueue();
      }, 500);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") wakeChat();
    };

    navigator.serviceWorker
      .register("/hm51-push-sw.js", { scope: "/" })
      .then((registration) => registration.update())
      .catch(() => {});
    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    window.addEventListener("focus", wakeChat);
    window.addEventListener("pageshow", wakeChat);
    window.addEventListener("online", wakeChat);
    document.addEventListener("visibilitychange", onVisible);

    wakeChat();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void inspectQueue();
    }, PUSH_QUEUE_FALLBACK_INTERVAL_MS);

    return () => {
      disposed = true;
      foregroundUnsubscribe?.();
      window.clearInterval(timer);
      if (wakeTimer) window.clearTimeout(wakeTimer);
      navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
      window.removeEventListener("focus", wakeChat);
      window.removeEventListener("pageshow", wakeChat);
      window.removeEventListener("online", wakeChat);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gamerId, teams]);

  const value = useMemo(
    () => ({
      token,
      gamerId,
      teams,
      selectedTeamId,
      setSelectedTeamId,
      messages,
      updateTeamMessages,
      refreshMessages,
    }),
    [token, gamerId, teams, selectedTeamId, messages]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
