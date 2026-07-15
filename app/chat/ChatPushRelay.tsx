"use client";

import { useEffect } from "react";

const DB_NAME = "hm51-chat-db";
const STORE_NAME = "pushMessages";

function relay(payload: unknown) {
  if (!payload || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "HM51_PUSH",
          payload,
        },
      })
    );
  } catch {
    // Relay не должен ломать чат.
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readQueueWithoutDeleting() {
  if (typeof indexedDB === "undefined") return [];

  try {
    const db = await openDb();
    return await new Promise<any[]>((resolve) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve([]);
        return;
      }

      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => {
        resolve(Array.isArray(request.result) ? request.result : []);
      };
      request.onerror = () => resolve([]);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  } catch {
    return [];
  }
}

export default function ChatPushRelay() {
  useEffect(() => {
    let disposed = false;
    let foregroundUnsubscribe: (() => void) | undefined;
    const relayed = new Set<string>();

    function recordKey(record: any, index: number) {
      return String(
        record?.id ||
          record?.payload?.data?.message_id ||
          record?.payload?.data?.MESSAGE_ID ||
          record?.payload?.message_id ||
          `${record?.createdAt || ""}:${index}`
      );
    }

    async function inspect() {
      const records = await readQueueWithoutDeleting();
      records.forEach((record, index) => {
        const key = recordKey(record, index);
        if (key && relayed.has(key)) return;
        if (key) relayed.add(key);
        relay(record?.payload || record?.message || record);
      });

      if (relayed.size > 500) relayed.clear();
    }

    async function attachForegroundFcm() {
      try {
        const [{ getApps }, messaging] = await Promise.all([
          import("firebase/app"),
          import("firebase/messaging"),
        ]);

        if (disposed || !(await messaging.isSupported())) return;
        const app = getApps()[0];
        if (!app) return;

        foregroundUnsubscribe = messaging.onMessage(messaging.getMessaging(app), (payload: any) => {
          relay(payload);
        });
      } catch {
        // Фоновая очередь остаётся резервным каналом.
      }
    }

    function onForegroundEvent(event: Event) {
      relay((event as CustomEvent).detail);
    }

    window.addEventListener("HM51_FCM_MESSAGE", onForegroundEvent as EventListener);
    attachForegroundFcm();
    inspect();

    const timer = window.setInterval(inspect, 180);

    return () => {
      disposed = true;
      foregroundUnsubscribe?.();
      window.clearInterval(timer);
      window.removeEventListener("HM51_FCM_MESSAGE", onForegroundEvent as EventListener);
    };
  }, []);

  return null;
}
