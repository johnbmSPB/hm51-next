import {
  CHAT_PUSH_QUEUE_MAX_AGE_MS,
  CHAT_PUSH_QUEUE_MAX_RECORDS,
} from "../lib/chatLimits";

export type ChatPushQueueRecord = {
  id: string;
  createdAt?: number;
  accountId?: string;
  teamId?: string;
  payload?: unknown;
  message?: unknown;
  [key: string]: unknown;
};

const DB_NAME = "hm51-chat-db";
const DB_VERSION = 4;
const PUSH_STORE = "pushMessages";
const SETTINGS_STORE = "settings";

function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function ensureIndexes(store: IDBObjectStore) {
  if (!store.indexNames.contains("accountId")) store.createIndex("accountId", "accountId", { unique: false });
  if (!store.indexNames.contains("teamId")) store.createIndex("teamId", "teamId", { unique: false });
  if (!store.indexNames.contains("createdAt")) store.createIndex("createdAt", "createdAt", { unique: false });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(PUSH_STORE)
        ? request.transaction?.objectStore(PUSH_STORE)
        : db.createObjectStore(PUSH_STORE, { keyPath: "id" });
      if (store) ensureIndexes(store);
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Chat IndexedDB upgrade is blocked"));
  });
}

async function pruneDatabase(db: IDBDatabase) {
  await new Promise<void>((resolve) => {
    const transaction = db.transaction(PUSH_STORE, "readwrite");
    const store = transaction.objectStore(PUSH_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (Array.isArray(request.result) ? request.result : []) as ChatPushQueueRecord[];
      const cutoff = Date.now() - CHAT_PUSH_QUEUE_MAX_AGE_MS;
      const fresh = records
        .filter((record) => Number(record.createdAt || 0) >= cutoff)
        .sort((left, right) => Number(left.createdAt || 0) - Number(right.createdAt || 0));
      const keepIds = new Set(fresh.slice(-CHAT_PUSH_QUEUE_MAX_RECORDS).map((record) => String(record.id)));

      records.forEach((record) => {
        const id = String(record.id || "");
        if (id && !keepIds.has(id)) store.delete(id);
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

export async function ensureChatPushQueue() {
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  await pruneDatabase(db);
  db.close();
}

function requestRecords(
  store: IDBObjectStore,
  accountId: string
): Promise<ChatPushQueueRecord[]> {
  return new Promise((resolve) => {
    if (!accountId || !store.indexNames.contains("accountId")) {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result || []) as ChatPushQueueRecord[]);
      request.onerror = () => resolve([]);
      return;
    }

    const index = store.index("accountId");
    const ownRequest = index.getAll(accountId);
    const unscopedRequest = index.getAll("");
    let own: ChatPushQueueRecord[] | null = null;
    let unscoped: ChatPushQueueRecord[] | null = null;

    const finish = () => {
      if (own && unscoped) resolve([...own, ...unscoped]);
    };
    ownRequest.onsuccess = () => {
      own = (ownRequest.result || []) as ChatPushQueueRecord[];
      finish();
    };
    ownRequest.onerror = () => {
      own = [];
      finish();
    };
    unscopedRequest.onsuccess = () => {
      unscoped = (unscopedRequest.result || []) as ChatPushQueueRecord[];
      finish();
    };
    unscopedRequest.onerror = () => {
      unscoped = [];
      finish();
    };
  });
}

export async function readChatPushQueue(
  accountId = "",
  allowedTeamIds: string[] = []
): Promise<ChatPushQueueRecord[]> {
  if (typeof indexedDB === "undefined") return [];

  try {
    const db = await openDatabase();
    return await new Promise<ChatPushQueueRecord[]>((resolve) => {
      const transaction = db.transaction(PUSH_STORE, "readonly");
      const store = transaction.objectStore(PUSH_STORE);
      const wantedAccount = clean(accountId);
      const allowedTeams = new Set(allowedTeamIds.map(clean).filter(Boolean));

      requestRecords(store, wantedAccount).then((records) => {
        const filtered = records.filter((record) => {
          const recordAccount = clean(
            record.accountId || record.recipientId || record.recipientGamerId || record.gamerId
          );
          if (recordAccount && wantedAccount && recordAccount !== wantedAccount) return false;
          const recordTeam = clean(record.teamId);
          return allowedTeams.size === 0 || !recordTeam || allowedTeams.has(recordTeam);
        });
        resolve(
          filtered
            .slice(-CHAT_PUSH_QUEUE_MAX_RECORDS)
            .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
        );
      });

      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

export async function deleteChatPushQueueRecord(recordId: string) {
  if (!recordId || typeof indexedDB === "undefined") return;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(PUSH_STORE, "readwrite");
      transaction.objectStore(PUSH_STORE).delete(recordId);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Запись останется для следующего холодного запуска.
  }
}
