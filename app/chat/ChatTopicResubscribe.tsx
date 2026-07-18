"use client";

import { useEffect, useRef } from "react";
import { subscribeTeam, teamIdOf } from "./chatApi";
import { useChat } from "./ChatProvider";

const FCM_REGISTERED_EVENT = "hm51-fcm-registered";

export default function ChatTopicResubscribe() {
  const chat = useChat();
  const syncingRef = useRef(false);

  useEffect(() => {
    const syncTopics = async () => {
      if (syncingRef.current || !chat.token || chat.teams.length === 0) return;
      syncingRef.current = true;
      try {
        await Promise.allSettled(
          chat.teams
            .map(teamIdOf)
            .filter(Boolean)
            .map((teamId) => subscribeTeam(chat.token, teamId))
        );
      } finally {
        syncingRef.current = false;
      }
    };

    window.addEventListener(FCM_REGISTERED_EVENT, syncTopics);
    return () => window.removeEventListener(FCM_REGISTERED_EVENT, syncTopics);
  }, [chat.token, chat.teams]);

  return null;
}
