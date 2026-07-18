"use client";

import { useEffect } from "react";

const OUTBOX_PREFIX = "hm51_recent_outgoing_chat_";
const FALLBACK_LIMITS = [40, 20, 10, 5, 1];

export default function ChatOutboxQuotaGuard() {
  useEffect(() => {
    const originalSetItem = Storage.prototype.setItem;

    function guardedSetItem(this: Storage, key: string, value: string) {
      try {
        originalSetItem.call(this, key, value);
        return;
      } catch (error) {
        if (this !== window.localStorage || !String(key).startsWith(OUTBOX_PREFIX)) {
          throw error;
        }
      }

      let items: unknown[] = [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        return;
      }

      for (const limit of FALLBACK_LIMITS) {
        try {
          originalSetItem.call(this, key, JSON.stringify(items.slice(-limit)));
          return;
        } catch {
          // Пробуем сохранить ещё более короткую очередь.
        }
      }
    }

    Storage.prototype.setItem = guardedSetItem;
    return () => {
      if (Storage.prototype.setItem === guardedSetItem) {
        Storage.prototype.setItem = originalSetItem;
      }
    };
  }, []);

  return null;
}
