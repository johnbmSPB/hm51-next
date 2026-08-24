"use client";

import { useEffect, useState } from "react";
import { parsePush } from "../chat/chatLocalStore";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getTotalChatUnread,
  recordChatUnread,
} from "../chat/chatUnreadStore";

function renderBadges(total: number) {
  const links = Array.from(
    document.querySelectorAll('a[href="/chat"], a[href^="/chat?"]')
  ) as HTMLAnchorElement[];

  links.forEach((link) => {
    let badge = link.querySelector('[data-hm51-global-chat-unread="true"]') as HTMLSpanElement | null;

    if (total <= 0) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement("span");
      badge.dataset.hm51GlobalChatUnread = "true";
      badge.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "min-width:18px",
        "height:18px",
        "margin-left:5px",
        "padding:0 5px",
        "border-radius:999px",
        "background:#ff0a8a",
        "color:#fff",
        "font-size:10px",
        "line-height:18px",
        "font-weight:900",
        "vertical-align:middle",
        "box-shadow:0 0 0 2px rgba(18,23,21,.9)",
      ].join(";");
      link.appendChild(badge);
    }

    badge.textContent = total > 99 ? "99+" : String(total);
    badge.setAttribute("aria-label", `${total} непрочитанных сообщений`);
  });
}

export default function GlobalChatUnreadBadge() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const refresh = () => setTotal(getTotalChatUnread());
    refresh();

    const onStorage = () => refresh();
    const onChanged = () => refresh();
    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (window.location.pathname.startsWith("/chat")) return;
      if (event.data?.type !== "HM51_PUSH") return;

      const push = parsePush(event.data.payload);
      if (!push.teamId || !push.body || !push.event.includes("CHAT")) return;
      if (push.event.includes("EDIT") || push.event.includes("DELETE")) return;

      recordChatUnread(
        push.teamId,
        push.messageId || push.clientId || push.pushId
      );
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, onChanged);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, onChanged);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    renderBadges(total);
    const observer = new MutationObserver(() => renderBadges(total));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [total]);

  return null;
}
