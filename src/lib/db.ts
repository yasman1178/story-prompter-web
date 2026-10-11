import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "story-prompter";
const DB_VERSION = 1;
const KV_STORE = "kv";
const IMAGE_STORE = "images";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
        if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get(KV_STORE, key)) as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put(KV_STORE, value, key);
}

export interface StoredImage {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: number;
}

export async function putImage(image: StoredImage): Promise<void> {
  const db = await getDb();
  await db.put(IMAGE_STORE, image);
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDb();
  return (await db.get(IMAGE_STORE, id)) as StoredImage | undefined;
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(IMAGE_STORE, id);
}

export async function allImageIds(): Promise<string[]> {
  const db = await getDb();
  return (await db.getAllKeys(IMAGE_STORE)) as string[];
}

export type StoredAsset = StoredImage;

export async function putAsset(asset: StoredAsset): Promise<void> {
  return putImage(asset);
}

export async function getAsset(id: string): Promise<StoredAsset | undefined> {
  return getImage(id);
}

export async function deleteAsset(id: string): Promise<void> {
  return deleteImage(id);
}
