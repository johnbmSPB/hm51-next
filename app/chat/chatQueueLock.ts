type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type QueueLease = {
  owner: string;
  expiresAt: number;
};

const LOCK_PREFIX = "hm51_chat_queue_lock_v1_";
const LEASE_MS = 30_000;
const VERIFY_DELAY_MS = 35;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function lockKey(accountId: string) {
  return `${LOCK_PREFIX}${clean(accountId) || "anonymous"}`;
}

function readLease(storage: KeyValueStore, accountId: string): QueueLease | null {
  try {
    const value = JSON.parse(storage.getItem(lockKey(accountId)) || "null");
    if (!value || typeof value !== "object") return null;
    const owner = clean(value.owner);
    const expiresAt = Number(value.expiresAt) || 0;
    return owner && expiresAt ? { owner, expiresAt } : null;
  } catch {
    return null;
  }
}

export function tryAcquireChatQueueLease(
  storage: KeyValueStore,
  accountId: string,
  owner: string,
  now = Date.now()
) {
  const current = readLease(storage, accountId);
  if (current && current.owner !== owner && current.expiresAt > now) return false;
  storage.setItem(lockKey(accountId), JSON.stringify({ owner, expiresAt: now + LEASE_MS }));
  return readLease(storage, accountId)?.owner === owner;
}

export function renewChatQueueLease(
  storage: KeyValueStore,
  accountId: string,
  owner: string,
  now = Date.now()
) {
  if (readLease(storage, accountId)?.owner !== owner) return false;
  storage.setItem(lockKey(accountId), JSON.stringify({ owner, expiresAt: now + LEASE_MS }));
  return true;
}

export function releaseChatQueueLease(storage: KeyValueStore, accountId: string, owner: string) {
  if (readLease(storage, accountId)?.owner === owner) storage.removeItem(lockKey(accountId));
}

function ownerId() {
  try {
    if (crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random()}`;
}

async function withStorageLease<T>(accountId: string, task: () => Promise<T>) {
  const owner = ownerId();
  if (!tryAcquireChatQueueLease(localStorage, accountId, owner)) return undefined;

  await new Promise((resolve) => window.setTimeout(resolve, VERIFY_DELAY_MS));
  if (readLease(localStorage, accountId)?.owner !== owner) return undefined;

  const heartbeat = window.setInterval(() => {
    renewChatQueueLease(localStorage, accountId, owner);
  }, LEASE_MS / 3);

  try {
    return await task();
  } finally {
    window.clearInterval(heartbeat);
    releaseChatQueueLease(localStorage, accountId, owner);
  }
}

export async function withChatQueueLock<T>(accountId: string, task: () => Promise<T>) {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    try {
      return await locks.request(
        `hm51-chat-queue:${clean(accountId)}`,
        { mode: "exclusive", ifAvailable: true },
        async (lock) => (lock ? task() : undefined)
      );
    } catch {
      // Старые версии WebKit могут объявлять navigator.locks,
      // но не поддерживать ifAvailable. В этом случае используем аренду.
    }
  }
  return withStorageLease(accountId, task);
}
