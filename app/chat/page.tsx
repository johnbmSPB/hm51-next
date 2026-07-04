"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type AnyObject = Record<string, any>;

type ChatMessage = {
  id: string;
  teamId: string;
  author: string;
  text: string;
  time: string;
  isMine: boolean;
  messID?: string;
  status?: "sending" | "failed" | "sent" | "read";
};

function valueToText(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toArray(value: any): AnyObject[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") return Object.values(value);
  return [];
}

function getTeamId(team: AnyObject) {
  return (
    valueToText(team.TEAM_ID) ||
    valueToText(team.team_id) ||
    valueToText(team.TEAM) ||
    valueToText(team.team) ||
    valueToText(team.ID) ||
    valueToText(team.id) ||
    valueToText(team.TEAM_INFO?.TEAM_ID) ||
    valueToText(team.TEAM_INFO?.team_id) ||
    ""
  );
}

function getTeamName(team: AnyObject, index: number) {
  const teamInfo = team.TEAM_INFO || {};

  return (
    valueToText(teamInfo.NAME) ||
    valueToText(teamInfo.name) ||
    valueToText(team.NAME) ||
    valueToText(team.name) ||
    valueToText(team.TEAM_NAME) ||
    valueToText(team.team_name) ||
    `Команда ${index + 1}`
  );
}

function isActiveTeamMembership(team: AnyObject) {
  const raw =
    team.ACTIVE_STATUS ??
    team.active_status ??
    team.ACTIVE ??
    team.active ??
    team.IS_ACTIVE ??
    team.is_active;

  if (raw === null || raw === undefined || raw === "") {
    return true;
  }

  const value = String(raw).trim().toLowerCase();

  return ![
    "0",
    "false",
    "no",
    "нет",
    "inactive",
    "deleted",
    "excluded",
  ].includes(value);
}

function mergeTeams(data: AnyObject) {
  const gamerTeams = toArray(
    data.GAMER_TEAMS ||
      data.gamer_teams ||
      data.data?.GAMER_TEAMS ||
      data.data?.gamer_teams
  );

  const teams = toArray(
    data.TEAMS ||
      data.teams ||
      data.data?.TEAMS ||
      data.data?.teams
  );

  const teamsById: Record<string, AnyObject> = {};

  teams.forEach((team) => {
    const teamId = getTeamId(team);
    if (teamId) teamsById[teamId] = team;
  });

  if (gamerTeams.length > 0) {
    return gamerTeams
      .filter(isActiveTeamMembership)
      .map((gamerTeam) => {
        const teamId = getTeamId(gamerTeam);
        const teamInfo = teamsById[teamId] || {};

        return {
          ...teamInfo,
          ...gamerTeam,
          TEAM_INFO: teamInfo,
        };
      });
  }

  return teams.filter(isActiveTeamMembership);
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function chatStorageKey(teamId: string) {
  return `hm51_chat_${teamId || "default"}`;
}

function mergeChatMessages(localMessages: ChatMessage[], serverMessages: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();

  localMessages.forEach((message) => {
    map.set(message.messID || message.id, message);
  });

  serverMessages.forEach((message) => {
    const key = message.messID || message.id;
    const local = map.get(key);

    if (local?.status === "failed" || local?.status === "sending") {
      map.set(key, {
        ...message,
        status: local.status,
      });
    } else {
      map.set(key, message);
    }
  });

  return Array.from(map.values());
}

function getGamerIdFromMe(data: AnyObject) {
  const gamer =
    data.GAMER ||
    data.gamer ||
    data.USER ||
    data.user ||
    data.data?.GAMER ||
    data.data?.gamer ||
    data.data?.USER ||
    data.data?.user ||
    {};

  return (
    valueToText(gamer.ID) ||
    valueToText(gamer.id) ||
    valueToText(gamer.GAMER_ID) ||
    valueToText(gamer.gamer_id) ||
    valueToText(gamer.USER_ID) ||
    valueToText(gamer.user_id) ||
    ""
  );
}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDiqKDv8h8lDD2wiaDPM57azBNxw2Dal3c",
  authDomain: "hockeymanager51.firebaseapp.com",
  projectId: "hockeymanager51",
  storageBucket: "hockeymanager51.firebasestorage.app",
  messagingSenderId: "354371414201",
  appId: "1:354371414201:web:5892b19ab60494471bd368",
};

const FIREBASE_VAPID_KEY =
  "BEGbxldkTRCHQqtTAALyKUczPAyk6fVhqO_o_dUN767p4eNMGyyVGFP205KBZyF4-Ax4Bc9tcvhyXJ9YVGkz5KY";

function decodeSafe(text: string) {
  if (!text) return "";

  return String(text).replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return _;
    }
  });
}

function getPushValue(data: any, keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function messageFromTeamChatPush(payload: any, gamerId: string): ChatMessage | null {
  const data = payload?.data || payload || {};

  const eventName = String(
    getPushValue(data, ["event", "EVENT", "type", "TYPE", "action", "ACTION"])
  )
    .toUpperCase()
    .replace(/[_-]/g, " ");

  const teamId = String(
    getPushValue(data, ["team", "TEAM", "team_id", "TEAM_ID"])
  );

  const text = String(
    getPushValue(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"])
  );

  const looksLikeTeamChat =
    eventName.includes("TEAM CHAT") ||
    (eventName.includes("TEAM") && eventName.includes("CHAT")) ||
    (!!teamId && !!text);

  if (!looksLikeTeamChat) return null;
  if (!teamId) return null;

  const id = String(
    getPushValue(data, [
      "message_id",
      "MESSAGE_ID",
      "MESS_ID",
      "mess_id",
      "id",
      "ID",
    ]) || `${Date.now()}`
  );

  const senderId = String(
    getPushValue(data, ["sender_id", "SENDER_ID", "gamer_id", "GAMER_ID", "user_id", "USER_ID"])
  );

  const isMine = !!gamerId && senderId === String(gamerId);

  const family = getPushValue(data, ["family", "FAMILY"]);
  const name = getPushValue(data, ["name", "NAME"]);
  const author = isMine ? "Вы" : `${family} ${name}`.trim() || "Игрок";

  return {
    id,
    messID: id,
    teamId,
    author,
    text: decodeSafe(text),
    time: String(getPushValue(data, ["message_time", "MESSAGE_TIME", "time", "TIME"]) || formatTime()),
    isMine,
    status: isMine ? "read" : "sent",
  };
}

function demoMessages(teamId: string): ChatMessage[] {
  return [
    {
      id: "demo-1",
      teamId,
      author: "Ivan",
      text: "Го сегодня катка?",
      time: "18:42",
      isMine: false,
    },
    {
      id: "demo-2",
      teamId,
      author: "Max",
      text: "Я за, давайте после 20:00",
      time: "18:43",
      isMine: false,
    },
    {
      id: "demo-3",
      teamId,
      author: "Вы",
      text: "Ок, я тоже буду",
      time: "18:44",
      isMine: true,
      status: "read",
    },
  ];
}

export default function ChatPage() {
  const [token, setToken] = useState("");
  const [teams, setTeams] = useState<AnyObject[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [gamerId, setGamerId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedTeamIndex = teams.findIndex(
    (team) => String(getTeamId(team)) === String(selectedTeamId)
  );

  const selectedTeam = selectedTeamIndex >= 0 ? teams[selectedTeamIndex] : null;

  const selectedTeamName = selectedTeam
    ? getTeamName(selectedTeam, selectedTeamIndex)
    : "Командный чат";

  const trimmedMessage = messageText.trim();

  useEffect(() => {
    const savedToken = localStorage.getItem("hm51_token") || "";

    if (!savedToken) {
      window.location.href = "/login";
      return;
    }

    setToken(savedToken);
    loadTeams(savedToken);
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;

    const saved = localStorage.getItem(chatStorageKey(selectedTeamId));

    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        const initial = demoMessages(selectedTeamId);
        setMessages(initial);
        localStorage.setItem(chatStorageKey(selectedTeamId), JSON.stringify(initial));
      }
    } else {
      const initial = demoMessages(selectedTeamId);
      setMessages(initial);
      localStorage.setItem(chatStorageKey(selectedTeamId), JSON.stringify(initial));
    }
  }, [selectedTeamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedTeamId]);

  async function loadTeams(currentToken: string) {
    try {
      setLoading(true);

      const response = await fetch("/api/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ token: currentToken }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        setTeams([]);
        return;
      }

      setGamerId(getGamerIdFromMe(json));

      const mergedTeams = mergeTeams(json);
      setTeams(mergedTeams);

      const firstTeam = mergedTeams[0] || {};
      const firstTeamId = getTeamId(firstTeam);

      setSelectedTeamId(firstTeamId || "");
    } finally {
      setLoading(false);
    }
  }

  function saveMessages(nextMessages: ChatMessage[]) {
    setMessages(nextMessages);
    localStorage.setItem(chatStorageKey(selectedTeamId), JSON.stringify(nextMessages));
  }

  async function sendMessage() {
    if (!trimmedMessage || !selectedTeamId || !token) return;

    const tempId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;

    const textToSend = trimmedMessage;

    const newMessage: ChatMessage = {
      id: tempId,
      messID: tempId,
      teamId: selectedTeamId,
      author: "Вы",
      text: textToSend,
      time: formatTime(),
      isMine: true,
      status: "sending",
    };

    saveMessages([...messages, newMessage]);
    setMessageText("");

    try {
      const response = await fetch("/api/chat/team-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          teamId: selectedTeamId,
          text: textToSend,
          messID: tempId,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Сервер не принял сообщение");
      }

      setMessages((current) => {
        const serverId = json.message_id || tempId;

        const updated = current.map((message) =>
          message.id === tempId
            ? {
                ...message,
                id: serverId,
                messID: serverId,
                status: "read" as const,
              }
            : message
        );

        localStorage.setItem(chatStorageKey(selectedTeamId), JSON.stringify(updated));
        return updated;
      });
    } catch {
      setMessages((current) => {
        const updated = current.map((message) =>
          message.id === tempId
            ? {
                ...message,
                status: "failed" as const,
              }
            : message
        );

        localStorage.setItem(chatStorageKey(selectedTeamId), JSON.stringify(updated));
        return updated;
      });
    }
  }

  async function enablePush() {
    if (!token) {
      setPushStatus("Сначала нужно войти в аккаунт");
      return;
    }

    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      setPushStatus("Этот браузер не поддерживает уведомления");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      setPushStatus("Service Worker не поддерживается");
      return;
    }

    try {
      setPushStatus("Запрашиваем разрешение...");

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setPushStatus("Уведомления не разрешены");
        return;
      }

      const [{ initializeApp, getApps }, messagingModule] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);

      const { getMessaging, getToken, onMessage, isSupported } = messagingModule;

      const supported = await isSupported();

      if (!supported) {
        setPushStatus("Firebase Push не поддерживается на этом устройстве");
        return;
      }

      const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);

      const registration = await navigator.serviceWorker.register(
        "/hm51-push-sw.js",
        { scope: "/" }
      );

      await registration.update();

      const readyRegistration = await navigator.serviceWorker.ready;

      const messaging = getMessaging(app);

      const webFcmToken = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: readyRegistration,
      });

      if (!webFcmToken) {
        setPushStatus("Не удалось получить Web FCM токен");
        return;
      }

      const response = await fetch("/api/fcm/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          fcmToken: webFcmToken,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Сервер не сохранил FCM токен");
      }

      localStorage.setItem("hm51_web_fcm_token", webFcmToken);
      localStorage.setItem("hm51_web_fcm_enabled", "true");

      setPushEnabled(true);
      setPushStatus("Push включён");

      onMessage(messaging, (payload) => {
        const message = messageFromTeamChatPush(payload, gamerId);

        if (!message) return;

        const storageKey = chatStorageKey(message.teamId);
        const saved = localStorage.getItem(storageKey);

        let savedMessages: ChatMessage[] = [];

        try {
          savedMessages = saved ? JSON.parse(saved) : [];
        } catch {
          savedMessages = [];
        }

        const updatedSaved = mergeChatMessages(savedMessages, [message]);
        localStorage.setItem(storageKey, JSON.stringify(updatedSaved));

        if (String(message.teamId) === String(selectedTeamId)) {
          setMessages((current) => mergeChatMessages(current, [message]));
        }
      });
    } catch (error: any) {
      setPushStatus(error?.message || "Ошибка включения Push");
    }
  }

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    function handleServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type !== "HM51_PUSH") return;

      console.log("HM51_PUSH_FROM_SW", event.data.payload);

      const message = messageFromTeamChatPush(event.data.payload, gamerId);

      if (!message) return;

      const storageKey = chatStorageKey(message.teamId);
      const saved = localStorage.getItem(storageKey);

      let savedMessages: ChatMessage[] = [];

      try {
        savedMessages = saved ? JSON.parse(saved) : [];
      } catch {
        savedMessages = [];
      }

      const updatedSaved = mergeChatMessages(savedMessages, [message]);
      localStorage.setItem(storageKey, JSON.stringify(updatedSaved));

      if (String(message.teamId) === String(selectedTeamId)) {
        setMessages((current) => mergeChatMessages(current, [message]));
      }
    }

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [gamerId, selectedTeamId]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#121715] text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#121715]/95 px-5 pb-4 pt-6 backdrop-blur">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white/35">Командный чат</p>
              <h1 className="truncate text-2xl font-black">
                {selectedTeamName}
              </h1>

              <p className="mt-1 text-xs font-semibold text-white/35">
                {teams.length > 0 ? `${teams.length} команд` : "Команды не найдены"}
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20d1a8] text-lg font-black text-[#121715]">
              {selectedTeamName.slice(0, 1).toUpperCase()}
            </div>
          </div>

          {teams.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {teams.map((team, index) => {
                const teamId = getTeamId(team);
                const isActive = String(teamId) === String(selectedTeamId);

                return (
                  <button
                    key={`${teamId}-${index}`}
                    type="button"
                    onClick={() => setSelectedTeamId(teamId)}
                    className={
                      isActive
                        ? "shrink-0 rounded-2xl bg-[#20d1a8] px-4 py-2 text-sm font-black text-[#121715]"
                        : "shrink-0 rounded-2xl bg-[#2d332f] px-4 py-2 text-sm font-bold text-white/60"
                    }
                  >
                    {getTeamName(team, index)}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-4 rounded-3xl bg-[#2d332f] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">
                  Push для чата
                </p>
                <p className="mt-1 text-xs font-semibold text-white/40">
                  {pushStatus || "Включите, чтобы получать сообщения"}
                </p>
              </div>

              <button
                type="button"
                onClick={enablePush}
                className={
                  pushEnabled
                    ? "shrink-0 rounded-2xl bg-[#20d1a8] px-4 py-2 text-xs font-black text-[#121715]"
                    : "shrink-0 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white/70"
                }
              >
                {pushEnabled ? "Включено" : "Включить"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col px-3 pb-36 pt-4">
        {loading && (
          <div className="mt-6 rounded-3xl bg-[#2d332f] p-5 text-sm font-bold text-white/50">
            Загружаем чат...
          </div>
        )}

        {!loading && teams.length === 0 && (
          <div className="mt-6 rounded-3xl bg-[#2d332f] p-5 text-sm font-bold text-white/50">
            У вас пока нет активных команд для чата.
          </div>
        )}

        {!loading && teams.length > 0 && (
          <div className="space-y-2">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const showAuthor =
                !message.isMine &&
                (!previous || previous.author !== message.author);

              return (
                <div
                  key={message.id}
                  className={
                    message.isMine
                      ? "flex justify-end pl-14"
                      : "flex justify-start pr-14"
                  }
                >
                  <div
                    className={
                      message.isMine
                        ? "max-w-full rounded-[22px] rounded-br-md bg-[#20d1a8] px-3.5 py-2.5 text-[#121715]"
                        : "max-w-full rounded-[22px] rounded-bl-md bg-[#2d332f] px-3.5 py-2.5 text-white"
                    }
                  >
                    {showAuthor && (
                      <p className="mb-1 text-xs font-black text-[#20d1a8]">
                        {message.author}
                      </p>
                    )}

                    <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-5">
                      {message.text}
                    </p>

                    <div
                      className={
                        message.isMine
                          ? "mt-1 flex items-center justify-end gap-1 text-[10px] font-bold text-[#121715]/55"
                          : "mt-1 flex items-center justify-end gap-1 text-[10px] font-bold text-white/35"
                      }
                    >
                      <span>{message.time}</span>
                      {message.isMine && (
                        <span>
                          {message.status === "sending"
                            ? "⏳"
                            : message.status === "failed"
                              ? "❌"
                              : message.status === "read"
                                ? "✓✓"
                                : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        )}
      </section>

      <section className="fixed bottom-[78px] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-3">
        <div className="flex items-end gap-2 rounded-[28px] bg-[#2d332f] p-2 shadow-2xl">
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение"
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] bg-[#121715] px-4 py-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={!trimmedMessage || !selectedTeamId}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20d1a8] text-xl font-black text-[#121715] disabled:bg-white/10 disabled:text-white/25"
          >
            ↑
          </button>
        </div>
      </section>

      <nav className="fixed bottom-5 left-1/2 z-30 grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl">
        <Link href="/calendar" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Календарь</Link>
        <Link href="/home" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Профиль</Link>
        <Link href="/find-team" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Найти</Link>
        <Link href="/chat" className="rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]">Чат</Link>
        <Link href="/menu" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Меню</Link>
      </nav>
    </main>
  );
}
