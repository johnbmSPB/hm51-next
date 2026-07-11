"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type AnyObject = Record<string, any>;

type ChatMessage = {
  id: string;
  teamId: string;
  author: string;
  text: string;
  time: string;
  isMine: boolean;
  status?: "sending" | "failed" | "sent" | "read";
};

const CHAT_DB_NAME = "hm51-chat-db";
const CHAT_STORE_NAME = "pushMessages";

function text(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function arr(value: any): AnyObject[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") return Object.values(value);
  return [];
}

function pick(data: any, keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function teamIdOf(team: AnyObject) {
  return (
    text(team.TEAM_ID) ||
    text(team.team_id) ||
    text(team.TEAM) ||
    text(team.team) ||
    text(team.ID) ||
    text(team.id) ||
    text(team.TEAM_INFO?.TEAM_ID) ||
    text(team.TEAM_INFO?.team_id)
  );
}

function teamNameOf(team: AnyObject, index: number) {
  const info = team.TEAM_INFO || {};
  return text(info.NAME) || text(info.name) || text(team.NAME) || text(team.name) || `Команда ${index + 1}`;
}

function activeMembership(team: AnyObject) {
  const raw = team.ACTIVE_STATUS ?? team.active_status ?? team.ACTIVE ?? team.active;
  if (raw === null || raw === undefined || raw === "") return true;
  return !["0", "false", "no", "нет", "inactive", "deleted"].includes(String(raw).toLowerCase());
}

function mergeTeams(data: AnyObject) {
  const gamerTeams = arr(data.GAMER_TEAMS || data.gamer_teams || data.data?.GAMER_TEAMS || data.data?.gamer_teams);
  const teams = arr(data.TEAMS || data.teams || data.data?.TEAMS || data.data?.teams);
  const byId: Record<string, AnyObject> = {};

  teams.forEach((team) => {
    const id = teamIdOf(team);
    if (id) byId[id] = team;
  });

  if (gamerTeams.length > 0) {
    return gamerTeams.filter(activeMembership).map((gamerTeam) => {
      const id = teamIdOf(gamerTeam);
      const info = byId[id] || {};
      return { ...info, ...gamerTeam, TEAM_INFO: info };
    });
  }

  return teams.filter(activeMembership);
}

function gamerIdFromMe(data: AnyObject) {
  const gamer = data.GAMER || data.gamer || data.USER || data.user || data.data?.GAMER || data.data?.USER || {};
  return text(gamer.ID) || text(gamer.id) || text(gamer.GAMER_ID) || text(gamer.gamer_id) || text(gamer.USER_ID) || text(gamer.user_id);
}

function nowTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function storageKey(teamId: string) {
  return `hm51_chat_${teamId || "default"}`;
}

function decodeSafe(value: string) {
  return String(value || "").replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return _;
    }
  });
}

function senderIdFromPayload(payload: any) {
  const data = payload?.data || payload || {};
  return text(pick(data, ["GAMER_ID", "gamer_id", "SENDER_ID", "sender_id", "USER_ID", "user_id", "AUTHOR_ID", "author_id"]));
}

function messageFromPush(payload: any, gamerId: string): ChatMessage | null {
  const data = payload?.data || payload || {};
  const notification = payload?.notification || payload?.webpush?.notification || {};
  const teamId = text(pick(data, ["team", "TEAM", "team_id", "TEAM_ID"]) || pick(payload, ["team", "TEAM", "team_id", "TEAM_ID"]));
  const body = decodeSafe(text(pick(data, ["text", "TEXT", "message", "MESSAGE", "body", "BODY"]) || notification.body || payload?.body));
  const event = String(pick(data, ["event", "EVENT", "type", "TYPE", "action", "ACTION"]) || "TEAM CHAT")
    .toUpperCase()
    .replace(/[_-]/g, " ");

  if (!teamId || !body) return null;
  if (!event.includes("TEAM CHAT") && !event.includes("CHAT") && !event.includes("MESSAGE")) return null;

  const sender = senderIdFromPayload(payload);
  if (gamerId && sender && String(sender) === String(gamerId)) return null;

  const id =
    text(pick(data, ["MESS_ID", "mess_id", "MESSAGE_ID", "message_id", "ID", "id"])) ||
    text(pick(payload, ["MESS_ID", "mess_id", "MESSAGE_ID", "message_id", "ID", "id"])) ||
    `${Date.now()}-${Math.random()}`;

  const family = text(pick(data, ["FAMILY", "family", "LAST_NAME", "last_name"]));
  const name = text(pick(data, ["NAME", "name", "FIRST_NAME", "first_name"]));
  const fallbackAuthor = String(notification.title || "").replace(/^Сообщение от\s+/i, "").trim();

  return {
    id,
    teamId,
    author: `${family} ${name}`.trim() || fallbackAuthor || "Игрок",
    text: body,
    time: text(pick(data, ["TIME", "time", "MESSAGE_TIME", "message_time", "DATE", "date"])) || nowTime(),
    isMine: false,
    status: "sent",
  };
}

function mergeMessages(oldList: ChatMessage[], newList: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  oldList.forEach((message) => map.set(message.id, message));
  newList.forEach((message) => map.set(message.id, { ...map.get(message.id), ...message }));
  return Array.from(map.values()).slice(-250);
}

function saveMessagesForTeam(teamId: string, list: ChatMessage[]) {
  localStorage.setItem(storageKey(teamId), JSON.stringify(list.slice(-250)));
}

function loadMessagesForTeam(teamId: string): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(teamId)) || "[]");
  } catch {
    return [];
  }
}

function openChatDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CHAT_DB_NAME, 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
        db.createObjectStore(CHAT_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredPushPayloads() {
  if (typeof indexedDB === "undefined") return [];

  const db = await openChatDb();

  return new Promise<any[]>((resolve) => {
    const tx = db.transaction(CHAT_STORE_NAME, "readwrite");
    const store = tx.objectStore(CHAT_STORE_NAME);
    const getAll = store.getAll();

    getAll.onsuccess = () => {
      const records = Array.isArray(getAll.result) ? getAll.result : [];
      store.clear();
      resolve(records);
    };

    getAll.onerror = () => resolve([]);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export default function ClientChatLocal() {
  const [token, setToken] = useState("");
  const [teams, setTeams] = useState<AnyObject[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [gamerId, setGamerId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedTeamIndex = teams.findIndex((team) => String(teamIdOf(team)) === String(selectedTeamId));
  const selectedTeam = selectedTeamIndex >= 0 ? teams[selectedTeamIndex] : null;
  const selectedTeamName = selectedTeam ? teamNameOf(selectedTeam, selectedTeamIndex) : "Командный чат";
  const canSend = !!messageText.trim() && !!selectedTeamId && !!token;

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
    setMessages(loadMessagesForTeam(selectedTeamId));
  }, [selectedTeamId]);

  useEffect(() => {
    if (!token || !selectedTeamId) return;

    subscribeTeam(token, selectedTeamId);
    importStoredPushes();

    const timer = window.setInterval(importStoredPushes, 3000);
    return () => window.clearInterval(timer);
  }, [token, selectedTeamId, gamerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/hm51-push-sw.js", { scope: "/" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!gamerId && !selectedTeamId) return;

    const message = {
      type: "HM51_SET_CHAT_CONTEXT",
      gamerId,
      teamId: selectedTeamId,
      chatOpen: true,
    };

    navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage(message);
        navigator.serviceWorker.controller?.postMessage(message);
      })
      .catch(() => {});

    return () => {
      const closedMessage = {
        type: "HM51_SET_CHAT_CONTEXT",
        gamerId,
        teamId: selectedTeamId,
        chatOpen: false,
      };
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.active?.postMessage(closedMessage);
          navigator.serviceWorker.controller?.postMessage(closedMessage);
        })
        .catch(() => {});
    };
  }, [gamerId, selectedTeamId]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    function onSwMessage(event: MessageEvent) {
      if (event.data?.type !== "HM51_PUSH") return;
      const message = messageFromPush(event.data.payload, gamerId);
      if (!message) return;
      saveIncoming(message);
    }

    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [gamerId, selectedTeamId]);

  function saveIncoming(message: ChatMessage) {
    const oldList = loadMessagesForTeam(message.teamId);
    const updated = mergeMessages(oldList, [message]);
    saveMessagesForTeam(message.teamId, updated);

    if (String(message.teamId) === String(selectedTeamId)) {
      setMessages(updated);
    }
  }

  async function importStoredPushes() {
    try {
      const records = await readStoredPushPayloads();
      const incoming = records
        .map((record) => messageFromPush(record.payload || record.message || record, gamerId))
        .filter(Boolean) as ChatMessage[];

      if (incoming.length === 0) return;

      const byTeam = new Map<string, ChatMessage[]>();
      incoming.forEach((message) => {
        byTeam.set(message.teamId, [...(byTeam.get(message.teamId) || []), message]);
      });

      byTeam.forEach((list, teamId) => {
        const updated = mergeMessages(loadMessagesForTeam(teamId), list);
        saveMessagesForTeam(teamId, updated);
        if (String(teamId) === String(selectedTeamId)) {
          setMessages(updated);
        }
      });
    } catch {
      // Локальная история не должна ломать чат.
    }
  }

  async function loadTeams(currentToken: string) {
    try {
      const response = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({ token: currentToken }),
      });
      const json = await response.json();
      if (!response.ok || json.result === false) throw new Error(json.error || "Команды не загружены");

      const list = mergeTeams(json);
      setTeams(list);
      setGamerId(gamerIdFromMe(json));
      setSelectedTeamId(teamIdOf(list[0] || {}) || "");
    } catch {
      setTeams([]);
    }
  }

  async function subscribeTeam(currentToken: string, teamId: string) {
    try {
      await fetch("/api/chat/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({ token: currentToken, teamId, action: "subscribe" }),
      });
    } catch {
      // Topic-подписка не должна мешать самому чату.
    }
  }

  async function sendMessage() {
    if (!canSend) return;

    const tempId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const body = messageText.trim();
    const optimistic: ChatMessage = {
      id: tempId,
      teamId: selectedTeamId,
      author: "Вы",
      text: body,
      time: nowTime(),
      isMine: true,
      status: "sending",
    };

    const next = mergeMessages(messages, [optimistic]);
    setMessages(next);
    saveMessagesForTeam(selectedTeamId, next);
    setMessageText("");

    try {
      const response = await fetch("/api/chat/team-send", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({ token, teamId: selectedTeamId, text: body, messID: tempId }),
      });
      const json = await response.json();
      if (!response.ok || json.result === false) throw new Error(json.error || "Сервер не принял сообщение");

      setMessages((current) => {
        const updated = current.map((m) => (m.id === tempId ? { ...m, id: json.message_id || tempId, status: "read" as const } : m));
        saveMessagesForTeam(selectedTeamId, updated);
        return updated;
      });
      setTimeout(importStoredPushes, 800);
    } catch {
      setMessages((current) => {
        const updated = current.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m));
        saveMessagesForTeam(selectedTeamId, updated);
        return updated;
      });
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#121715] text-white">
      <Link
        href="/calendar"
        className="fixed right-4 top-4 z-50 rounded-2xl border border-white/10 bg-[#20d1a8] px-4 py-3 text-xs font-black text-[#07110c] shadow-lg shadow-black/30"
      >
        Календарь
      </Link>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#121715]/95 px-4 pb-4 pt-6 backdrop-blur">
        <div className="mx-auto max-w-md pr-28">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#20d1a8]/70">ХМ 5.1</p>
          <h1 className="mt-1 text-2xl font-black">Чат команды</h1>
          <p className="mt-1 text-sm font-semibold text-white/45">{selectedTeamName}</p>

          {teams.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {teams.map((team, index) => {
                const id = teamIdOf(team);
                const active = String(id) === String(selectedTeamId);
                return (
                  <button
                    key={`${id}-${index}`}
                    type="button"
                    onClick={() => setSelectedTeamId(id)}
                    className={`shrink-0 rounded-2xl px-4 py-3 text-xs font-black ${active ? "bg-[#20d1a8] text-[#07110c]" : "bg-white/5 text-white/50"}`}
                  >
                    {teamNameOf(team, index)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {messages.length === 0 && (
            <div className="rounded-3xl bg-white/5 p-5 text-sm font-semibold text-white/45">
              История хранится только на этом iPhone. Напишите первое сообщение в команду.
            </div>
          )}

          {messages.map((message) => (
            <div key={`${message.id}-${message.time}`} className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] rounded-3xl px-4 py-3 ${message.isMine ? "bg-[#20d1a8] text-[#07110c]" : "bg-white/8 text-white"}`}>
                {!message.isMine && <p className="mb-1 text-xs font-black text-[#20d1a8]">{message.author}</p>}
                <p className="whitespace-pre-wrap text-sm font-semibold leading-5">{message.text}</p>
                <div className="mt-2 flex justify-end gap-2 text-[10px] font-black opacity-55">
                  <span>{message.time}</span>
                  {message.status === "sending" && <span>отправка</span>}
                  {message.status === "failed" && <span>ошибка</span>}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </section>

      <footer className="sticky bottom-0 border-t border-white/5 bg-[#121715]/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-end gap-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none placeholder:text-white/30"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canSend}
            className="h-12 w-12 shrink-0 rounded-3xl bg-[#20d1a8] text-lg font-black text-[#07110c] disabled:opacity-35"
            aria-label="Отправить сообщение"
          >
            ›
          </button>
        </div>
      </footer>
    </main>
  );
}
