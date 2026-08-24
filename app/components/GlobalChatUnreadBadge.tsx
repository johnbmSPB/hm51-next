"use client";

import { useEffect, useState } from "react";
import { parsePush } from "../chat/chatLocalStore";
import { readChatPushQueue } from "../chat/chatPushQueue";
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

    const nextText = total > 99 ? "99+" : String(total);
    const nextLabel = `${total} непрочитанных сообщений`;

    // MutationObserver следит за document.body. Не записываем то же значение
    // повторно: textContent/setAttribute сами создают мутации и могут зациклить
    // observer, заблокировав главный поток приложения.
    if (badge.textContent !== nextText) {
      badge.textContent = nextText;
    }
    if (badge.getAttribute("aria-label") !== nextLabel) {
      badge.setAttribute("aria-label", nextLabel);
    }
  });
}

function recordPayload(payload: unknown) {
  const push = parsePush(payload);
  if (!push.teamId || !push.body || !push.event.includes("CHAT")) return;
  if (push.event.includes("EDIT") || push.event.includes("DELETE")) return;

  recordChatUnread(
    push.teamId,
    push.messageId || push.clientId || push.pushId
  );
}

export default function GlobalChatUnreadBadge() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let disposed = false;
    const refresh = () => setTotal(getTotalChatUnread());

    const inspectQueuedPushes = async () => {
      if (disposed || window.location.pathname.startsWith("/chat")) return;
      const records = await readChatPushQueue();
      if (disposed) return;
      records.forEach((record) => recordPayload(record));
      refresh();
    };

    refresh();
    void inspectQueuedPushes();

    const onStorage = () => refresh();
    const onChanged = () => refresh();
    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (window.location.pathname.startsWith("/chat")) return;
      if (event.data?.type !== "HM51_PUSH") return;
      recordPayload(event.data.payload);
      refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void inspectQueuedPushes();
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void inspectQueuedPushes();
    }, 5000);

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", inspectQueuedPushes);
    window.addEventListener("pageshow", inspectQueuedPushes);
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", inspectQueuedPushes);
      window.removeEventListener("pageshow", inspectQueuedPushes);
      document.removeEventListener("visibilitychange", onVisible);
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
