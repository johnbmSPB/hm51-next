"use client";

import { useEffect } from "react";
import { teamIdOf } from "./chatApi";
import { reconcileChatTopicSubscriptions } from "../lib/chatTopicSubscriptions";
import { useChat } from "./ChatProvider";

const FCM_REGISTERED_EVENT = "hm51-fcm-registered";

export default function ChatTopicResubscribe() {
  const chat = useChat();

  useEffect(() => {
    const syncTopics = async () => {
      if (!chat.token || !chat.gamerId) return;
      await reconcileChatTopicSubscriptions(
        chat.token,
        chat.gamerId,
        chat.teams.map(teamIdOf).filter(Boolean)
      );
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void syncTopics();
    };

    void syncTopics();
    window.addEventListener(FCM_REGISTERED_EVENT, syncTopics);
    window.addEventListener("online", syncTopics);
    window.addEventListener("focus", syncTopics);
    window.addEventListener("pageshow", syncTopics);
    document.addEventListener("visibilitychange", syncWhenVisible);
    const retryTimer = window.setTimeout(syncWhenVisible, 10_000);

    return () => {
      window.removeEventListener(FCM_REGISTERED_EVENT, syncTopics);
      window.removeEventListener("online", syncTopics);
      window.removeEventListener("focus", syncTopics);
      window.removeEventListener("pageshow", syncTopics);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.clearTimeout(retryTimer);
    };
  }, [chat.token, chat.gamerId, chat.teams]);

  return null;
}
