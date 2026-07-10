"use client";

function hashValue(value: string) {
  let hash = 0;
  const source = String(value || "");

  for (let index = 0; index < source.length; index++) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

export function normalizeAccountKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-я0-9@._-]/gi, "_");
}

export function getAccountKeyByLogin(login: string) {
  return `login_${normalizeAccountKey(login)}`;
}

export function getCurrentAccountKey() {
  if (typeof window === "undefined") return "";

  const token =
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    "";

  if (token.trim()) {
    return `token_${hashValue(token)}`;
  }

  const login = localStorage.getItem("hm51_login") || "";

  if (login.trim()) {
    return getAccountKeyByLogin(login);
  }

  return "";
}

export function getScopedStorageKey(baseKey: string, accountKey = getCurrentAccountKey()) {
  const key = String(accountKey || "").trim();

  if (!key) {
    return `${baseKey}__no_account`;
  }

  return `${baseKey}__${key}`;
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
