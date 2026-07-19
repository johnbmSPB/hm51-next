"use client";

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { waitForFirebaseMessaging } from "./firebaseMessagingReady";

export function ensureFirebaseApp(config: FirebaseOptions) {
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export function ensureFirebaseMessaging(_config: FirebaseOptions) {
  return waitForFirebaseMessaging();
}
