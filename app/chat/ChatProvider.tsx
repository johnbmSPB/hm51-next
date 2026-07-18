"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadChatAccount, subscribeTeam, type TeamObject } from "./chatApi";
import {
  applyPush,
  deletePushQueueRecord,
  loadMessages,
  parsePush,
  pushKey,
  readPushQueue,
  saveMessages,
  selectedTeamKey,
  setChatAccountScope,
  type ChatMessage,
  type PushApplyResult,
} from "./chatLocalStore";

type MessagesUpdater = (messages: ChatMessage[]) => ChatMessage[];

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

    if ("serviceWorker" in navigator) {
      const context = {
        type: "HM51_SET_CHAT_CONTEXT",
        gamerId,
        teamId: selectedTeamId,
        chatOpen: true,
      };
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.active?.postMessage(context);
          navigator.serviceWorker.controller?.postMessage(context);
        })
        .catch(() => {});
    }
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
    if (!gamerId || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;
    let foregroundAttaching = false;
    let queueProcessing = false;

    const handleFcmPayload = (payload: unknown): PushApplyResult => {
      const push = parsePush(payload);
      if (!push.teamId) return "ignored";

      const key = pushKey(push);
      if (handledPushes.current.has(key)) return "applied";

      const result = applyPush(push, gamerId);
      if (result !== "deferred") {
        handledPushes.current.add(key);
        if (handledPushes.current.size > 500) handledPushes.current.clear();
      }
      if (result === "applied") refreshMessages(push.teamId);
      return result;
    };

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "HM51_PUSH") handleFcmPayload(event.data.payload);
    };

    const inspectQueue = async () => {
      if (queueProcessing || disposed) return;
      queueProcessing = true;
      try {
        const records = await readPushQueue();
        for (const record of records) {
          if (disposed) break;
          const payload = record?.payload || record?.message || record;
          const result = handleFcmPayload(payload);
          if (result !== "deferred") await deletePushQueueRecord(String(record.id || ""));
        }
      } finally {
        queueProcessing = false;
      }
    };

    const attachForegroundFcm = async () => {
      if (foregroundAttaching || foregroundUnsubscribe || disposed) return;
      foregroundAttaching = true;
      try {
        const [firebaseApp, firebaseMessaging] = await Promise.all([
          import("firebase/app"),
          import("firebase/messaging"),
        ]);
        if (!(await firebaseMessaging.isSupported())) return;

        const startedAt = Date.now();
        while (!disposed && Date.now() - startedAt < 15_000) {
          const app = firebaseApp.getApps()[0];
          if (app) {
            foregroundUnsubscribe = firebaseMessaging.onMessage(
              firebaseMessaging.getMessaging(app),
              handleFcmPayload
            );
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
      } catch {
        // Следующая активация окна повторит подключение.
      } finally {
        foregroundAttaching = false;
      }
    };

    const retryForeground = () => attachForegroundFcm();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        attachForegroundFcm();
        inspectQueue();
      }
    };

    navigator.serviceWorker.register("/hm51-push-sw.js", { scope: "/" }).catch(() => {});
    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    window.addEventListener("focus", retryForeground);
    document.addEventListener("visibilitychange", onVisible);

    attachForegroundFcm();
    inspectQueue();
    const timer = window.setInterval(inspectQueue, 1200);

    return () => {
      disposed = true;
      foregroundUnsubscribe?.();
      window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
      window.removeEventListener("focus", retryForeground);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gamerId]);

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
