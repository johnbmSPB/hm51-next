"use client";

import { teamIdOf, teamNameOf } from "./chatApi";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

export default function ChatHeader({ chat }: { chat: Controller }) {
  return (
    <header
      className="z-40 shrink-0 border-b border-white/5 bg-[#121715]/95 px-4 pb-2 backdrop-blur"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
    >
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-black">Чат команды</h1>
      </div>

      {chat.teams.length > 1 && (
        <div className="mx-auto mt-3 flex max-w-md gap-2 overflow-x-auto pb-1 pr-1">
          {chat.teams.map((team, index) => {
            const id = teamIdOf(team);
            const active = id === chat.selectedTeamId;
            return (
              <button
                key={`${id}-${index}`}
                type="button"
                onClick={() => chat.setSelectedTeamId(id)}
                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black ${active ? "bg-[#20d1a8] text-[#07110c]" : "bg-white/5 text-white/55"}`}
              >
                {teamNameOf(team, index)}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
