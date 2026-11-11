/**
 * Keeps the in-progress AI inspection (photos + fields) on the device, so that
 * if Android/iOS reloads the page while the camera is open, nothing is lost.
 * Uses IndexedDB because 20 photos are too large for localStorage.
 */
export type InspectionDraft = {
  photos: string[];
  assetName: string;
  notes: string;
  odometer: string;
  report: unknown | null;
  kind?: string;
  driver?: string;
  fuel?: number | null;
  updatedAt: number;
};

const DB_NAME = "watheeq-drafts";
const STORE = "inspection";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadDraft(userId: string): Promise<InspectionDraft | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(userId);
      req.onsuccess = () => resolve((req.result as InspectionDraft | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveDraft(userId: string, draft: Omit<InspectionDraft, "updatedAt">) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ ...draft, updatedAt: Date.now() }, userId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearDraft(userId: string) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(userId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
