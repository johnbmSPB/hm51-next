"use client";

export function normalizeAccountKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-я0-9@._-]/gi, "_");
}

export function getCurrentAccountKey() {
  if (typeof window === "undefined") return "";

  const login = localStorage.getItem("hm51_login") || "";

  if (login.trim()) {
    return normalizeAccountKey(login);
  }

  return "";
}

export function getAccountKeyByLogin(login: string) {
  return normalizeAccountKey(login);
}

export function getScopedStorageKey(baseKey: string, accountKey = getCurrentAccountKey()) {
  const key = normalizeAccountKey(accountKey);

  if (!key) {
    return `${baseKey}_no_account`;
  }

  return `${baseKey}_${key}`;
}

export function getScopedItem(baseKey: string, accountKey?: string) {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(getScopedStorageKey(baseKey, accountKey));
}

export function setScopedItem(baseKey: string, value: string, accountKey?: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem(getScopedStorageKey(baseKey, accountKey), value);
}

export function removeScopedItem(baseKey: string, accountKey?: string) {
  if (typeof window === "undefined") return;

  localStorage.removeItem(getScopedStorageKey(baseKey, accountKey));
}
