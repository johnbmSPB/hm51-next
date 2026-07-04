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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
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
