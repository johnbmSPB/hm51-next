export type ChatPushQueueRecord = {
  id: string;
  createdAt?: number;
  payload?: unknown;
  message?: unknown;
  [key: string]: unknown;
};

const DB_NAME = "hm51-chat-db";
const DB_VERSION = 3;
const PUSH_STORE = "pushMessages";
const SETTINGS_STORE = "settings";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PUSH_STORE)) {
        db.createObjectStore(PUSH_STORE, { keyPath: "id" });
      }
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

export async function ensureChatPushQueue() {
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  db.close();
}

export async function readChatPushQueue(): Promise<ChatPushQueueRecord[]> {
  if (typeof indexedDB === "undefined") return [];

  try {
    const db = await openDatabase();
    return await new Promise<ChatPushQueueRecord[]>((resolve) => {
      const transaction = db.transaction(PUSH_STORE, "readonly");
      const request = transaction.objectStore(PUSH_STORE).getAll();

      request.onsuccess = () => {
        const records = (Array.isArray(request.result) ? request.result : []) as ChatPushQueueRecord[];
        resolve(records.slice().sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)));
      };
      request.onerror = () => resolve([]);
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
