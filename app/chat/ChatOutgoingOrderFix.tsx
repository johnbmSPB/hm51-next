"use client";

import { useEffect } from "react";
import { useChat } from "./ChatProvider";
import { normalizeText, type ChatMessage } from "./chatLocalStore";

function isPending(status: ChatMessage["status"]) {
  return status === "sending" || status === "sent";
}

function isConfirmed(status: ChatMessage["status"]) {
  return status === "delivered" || status === "read";
}

export default function ChatOutgoingOrderFix() {
  const chat = useChat();

  useEffect(() => {
    const current = chat.messages;
    const next = current.map((message) => ({ ...message }));
    let changed = false;

    for (let later = 0; later < next.length; later += 1) {
      const confirmed = next[later];
      if (!confirmed.isMine || !isConfirmed(confirmed.status)) continue;

      const confirmedText = normalizeText(confirmed.text);
      const earlier = next.findIndex(
        (candidate, index) =>
          index < later &&
          candidate.isMine &&
          isPending(candidate.status) &&
          normalizeText(candidate.text) === confirmedText
      );

      if (earlier < 0) continue;

      const pendingStatus = next[earlier].status;
      next[earlier] = { ...next[earlier], status: confirmed.status };
      next[later] = { ...next[later], status: pendingStatus };
      changed = true;
    }

    if (changed && chat.selectedTeamId) {
      chat.updateTeamMessages(chat.selectedTeamId, () => next);
    }
  }, [chat.messages, chat.selectedTeamId]);

  return null;
}
