"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

let appInstance: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

export function ensureFirebaseApp(config: FirebaseOptions) {
  if (appInstance) return appInstance;
  appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
  return appInstance;
}

export function ensureFirebaseMessaging(config: FirebaseOptions) {
  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => (supported ? getMessaging(ensureFirebaseApp(config)) : null))
      .catch(() => null);
  }
  return messagingPromise;
}
