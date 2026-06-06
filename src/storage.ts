/**
 * Persistence layer: IndexedDB primary, LocalStorage fallback.
 * Stores best score, current stage, per-stage star rating.
 */

export interface SaveData {
  bestScore: number;
  maxStageReached: number;
  stageStars: Record<number, number>;
  totalStars: number;
  lastPlayed: number;
}

const DB_NAME = "whack-a-mole-db";
const DB_VERSION = 1;
const STORE = "savedata";
const KEY = "main";
const LS_KEY = "whack-a-mole:save:v1";

export const DEFAULT_SAVE: SaveData = {
  bestScore: 0,
  maxStageReached: 1,
  stageStars: {},
  totalStars: 0,
  lastPlayed: 0,
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn("[storage] IndexedDB open failed, falling back to LocalStorage");
        resolve(null);
      };
      req.onblocked = () => resolve(null);
    } catch (_e) {
      resolve(null);
    }
  });
  return dbPromise;
}

function lsLoad(): SaveData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as SaveData;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch (_e) {
    return { ...DEFAULT_SAVE };
  }
}

function lsSave(data: SaveData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (_e) {
    /* quota exceeded or disabled — silently ignore */
  }
}

export async function loadSave(): Promise<SaveData> {
  const db = await openDb();
  if (!db) return lsLoad();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const value = req.result as SaveData | undefined;
        if (!value) {
          // Migrate from LocalStorage if present
          const ls = lsLoad();
          resolve(ls);
        } else {
          resolve({ ...DEFAULT_SAVE, ...value });
        }
      };
      req.onerror = () => resolve(lsLoad());
    } catch (_e) {
      resolve(lsLoad());
    }
  });
}

export async function persistSave(data: SaveData): Promise<void> {
  // Always mirror to LocalStorage as backup
  lsSave(data);
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch (_e) {
      resolve();
    }
  });
}

export function recomputeTotalStars(data: SaveData): number {
  let total = 0;
  for (const k of Object.keys(data.stageStars)) {
    total += data.stageStars[Number(k)] ?? 0;
  }
  return total;
}
