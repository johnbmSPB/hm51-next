"use client";

import { teamIdOf, teamNameOf } from "./chatApi";
import type { useChatController } from "./useChatController";

type Controller = ReturnType<typeof useChatController>;

export default function ChatHeader({ chat }: { chat: Controller }) {
  const selectedIndex = chat.teams.findIndex((team) => teamIdOf(team) === chat.selectedTeamId);
  const selectedTeam = selectedIndex >= 0 ? chat.teams[selectedIndex] : null;
  const selectedName = selectedTeam ? teamNameOf(selectedTeam, selectedIndex) : "Командный чат";

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#121715]/95 px-4 pb-3 pt-6 backdrop-blur">
      <div className="mx-auto max-w-md pr-28">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#20d1a8]/70">ХМ 5.1</p>
        <h1 className="mt-1 text-2xl font-black">Чат команды</h1>
        <p className="mt-1 text-sm font-semibold text-white/45">{selectedName}</p>
      </div>

      {chat.teams.length > 1 && (
        <div className="mx-auto mt-4 flex max-w-md gap-2 overflow-x-auto pb-1 pr-1">
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
