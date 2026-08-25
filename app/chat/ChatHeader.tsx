"use client";

import { useEffect, useState } from "react";
import { teamIdOf, teamNameOf } from "./chatApi";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getChatUnreadCounts,
} from "./chatUnreadStore";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

export default function ChatHeader({ chat }: { chat: Controller }) {
  const [unreadByTeam, setUnreadByTeam] = useState<Record<string, number>>({});

  useEffect(() => {
    const refresh = () => setUnreadByTeam(getChatUnreadCounts());
    refresh();
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <header
      className="z-40 shrink-0 border-b border-white/5 bg-[#121715]/95 px-4 pb-2 backdrop-blur"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 6px)" }}
    >
      {chat.teams.length > 1 && (
        <div className="mx-auto flex max-w-md gap-2 overflow-x-auto pb-1 pr-1">
          {chat.teams.map((team, index) => {
            const id = teamIdOf(team);
            const active = id === chat.selectedTeamId;
            const unread = unreadByTeam[id] || 0;
            return (
              <button
                key={`${id}-${index}`}
                type="button"
                onClick={() => chat.setSelectedTeamId(id)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${active ? "bg-[#20d1a8] text-[#07110c]" : "bg-white/5 text-white/55"}`}
              >
                <span>{teamNameOf(team, index)}</span>
                {!active && unread > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff0a8a] px-1.5 text-[10px] font-black leading-none text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
