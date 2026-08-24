"use client";

import { useEffect, useRef } from "react";
import { teamIdOf } from "./chatApi";
import { loadMessages, messageIds } from "./chatLocalStore";
import { useChat } from "./ChatProvider";
import { recordChatUnread } from "./chatUnreadStore";

function stableMessageKey(message: ReturnType<typeof loadMessages>[number]) {
  return messageIds(message)[0] || `${message.teamId}|${message.createdAt || message.time}|${message.text}`;
}

export default function ChatUnreadController() {
  const chat = useChat();
  const knownByTeamRef = useRef<Record<string, Set<string>>>({});
  const initializedTeamsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!chat.gamerId || chat.teams.length === 0) return;

    const scan = () => {
      chat.teams.forEach((team) => {
        const teamId = teamIdOf(team);
        if (!teamId) return;

        const messages = loadMessages(teamId);
        const known = knownByTeamRef.current[teamId] || new Set<string>();

        if (!initializedTeamsRef.current.has(teamId)) {
          messages.forEach((message) => known.add(stableMessageKey(message)));
          knownByTeamRef.current[teamId] = known;
          initializedTeamsRef.current.add(teamId);
          return;
        }

        messages.forEach((message) => {
          const key = stableMessageKey(message);
          if (known.has(key)) return;
          known.add(key);

          if (!message.isMine) {
            recordChatUnread(teamId, key);
          }
        });

        knownByTeamRef.current[teamId] = known;
      });
    };

    scan();
    const timer = window.setInterval(scan, 700);
    const onFocus = () => scan();
    const onVisible = () => {
      if (document.visibilityState === "visible") scan();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [chat.gamerId, chat.teams]);

  return null;
}
