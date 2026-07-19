"use client";

import { useEffect, useRef } from "react";
import { teamIdOf } from "./chatApi";
import { reconcileChatTopicSubscriptions } from "../lib/chatTopicSubscriptions";
import { useChat } from "./ChatProvider";

const FCM_REGISTERED_EVENT = "hm51-fcm-registered";

export default function ChatTopicResubscribe() {
  const chat = useChat();
  const syncingRef = useRef(false);

  useEffect(() => {
    const syncTopics = async () => {
      if (syncingRef.current || !chat.token || !chat.gamerId) return;
      syncingRef.current = true;
      try {
        await reconcileChatTopicSubscriptions(
          chat.token,
          chat.gamerId,
          chat.teams.map(teamIdOf).filter(Boolean)
        );
      } finally {
        syncingRef.current = false;
      }
    };

    window.addEventListener(FCM_REGISTERED_EVENT, syncTopics);
    return () => window.removeEventListener(FCM_REGISTERED_EVENT, syncTopics);
  }, [chat.token, chat.gamerId, chat.teams]);

  return null;
}
