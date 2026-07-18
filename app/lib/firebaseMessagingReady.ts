"use client";

import { getApps } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

let readyPromise: Promise<Messaging | null> | null = null;
let readyMessaging: Messaging | null = null;

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function waitForFirebaseMessaging(timeoutMs = 15_000) {
  if (readyMessaging) return Promise.resolve(readyMessaging);
  if (readyPromise) return readyPromise;

  const attempt = (async () => {
    if (!(await isSupported())) return null;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const app = getApps()[0];
      if (app) return getMessaging(app);
      await pause(100);
    }

    return null;
  })()
    .then((messaging) => {
      if (messaging) readyMessaging = messaging;
      return messaging;
    })
    .catch(() => null)
    .finally(() => {
      if (readyPromise === attempt) readyPromise = null;
    });

  readyPromise = attempt;
  return attempt;
}
