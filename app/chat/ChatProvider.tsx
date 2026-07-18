"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadChatAccount, subscribeTeam, type TeamObject } from "./chatApi";
import {
  SELECTED_TEAM_KEY,
  applyPush,
  drainPushQueue,
  loadMessages,
  parsePush,
  pushKey,
  type ChatMessage,
} from "./chatLocalStore";

type ChatContextValue = {
  token: string;
  teams: TeamObject[];
  selectedTeamId: string;
  setSelectedTeamId: (teamId: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
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
  const [teams, setTeams] = useState<TeamObject[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const selectedTeamRef = useRef("");
  const gamerIdRef = useRef("");
  const handledPushes = useRef(new Set<string>());

  function setSelectedTeamId(value: string) {
    setSelectedTeamIdState(value);
  }

  function refreshMessages(team = selectedTeamRef.current) {
    if (team && selectedTeamRef.current === team) setMessages(loadMessages(team));
  }

  useEffect(() => {
    const savedToken = localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
    if (!savedToken) {
      window.location.href = "/login";
      return;
    }

    const savedTeam = localStorage.getItem(SELECTED_TEAM_KEY) || "";
    setToken(savedToken);
    setSelectedTeamIdState(savedTeam);

    loadChatAccount(savedToken)
      .then(({ teams: loadedTeams, gamerId }) => {
        const validSaved = savedTeam && loadedTeams.some((team) => teamId(team) === savedTeam);
        gamerIdRef.current = gamerId;
        setTeams(loadedTeams);
        setSelectedTeamIdState(validSaved ? savedTeam : teamId(loadedTeams[0] || {}));
      })
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    selectedTeamRef.current = selectedTeamId;
    if (!selectedTeamId) return;
    localStorage.setItem(SELECTED_TEAM_KEY, selectedTeamId);
    setMessages(loadMessages(selectedTeamId));
    if (token) subscribeTeam(token, selectedTeamId).catch(() => {});

    if ("serviceWorker" in navigator) {
      const context = {
        type: "HM51_SET_CHAT_CONTEXT",
        gamerId: gamerIdRef.current,
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
  }, [selectedTeamId, token]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleFcmPayload = (payload: unknown) => {
      const push = parsePush(payload);
      if (!push.teamId) return;
      const key = pushKey(push);
      if (handledPushes.current.has(key)) return;
      handledPushes.current.add(key);
      if (handledPushes.current.size > 500) handledPushes.current.clear();
      if (applyPush(push, gamerIdRef.current)) refreshMessages(push.teamId);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "HM51_PUSH") handleFcmPayload(event.data.payload);
    };

    const inspectQueue = async () => {
      const records = await drainPushQueue();
      records.forEach((record) => handleFcmPayload(record?.payload || record?.message || record));
    };

    navigator.serviceWorker.register("/hm51-push-sw.js", { scope: "/" }).catch(() => {});
    navigator.serviceWorker.addEventListener("message", onMessage);
    inspectQueue();
    const timer = window.setInterval(inspectQueue, 1200);

    return () => {
      window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  const value = useMemo(
    () => ({ token, teams, selectedTeamId, setSelectedTeamId, messages, setMessages, refreshMessages }),
    [token, teams, selectedTeamId, messages]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
