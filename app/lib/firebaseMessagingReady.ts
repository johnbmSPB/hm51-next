"use client";

import { getApps } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

let readyPromise: Promise<Messaging | null> | null = null;

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function waitForFirebaseMessaging(timeoutMs = 15_000) {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    if (!(await isSupported())) return null;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const app = getApps()[0];
      if (app) return getMessaging(app);
      await pause(100);
    }

    return null;
  })().catch(() => null);

  return readyPromise;
}
