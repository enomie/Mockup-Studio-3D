/** Minimal IndexedDB access for the saved project (one record) and user image files. */

const DB_NAME = 'mockup-studio-3d';
const DB_VERSION = 1;
const PROJECT_STORE = 'project';
const IMAGE_STORE = 'image-blobs';
const PROJECT_KEY = 'current';

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(request.error ?? new Error('IndexedDB request failed')); };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { resolve(); };
    transaction.onerror = () => { reject(transaction.error ?? new Error('IndexedDB transaction failed')); };
    transaction.onabort = () => { reject(transaction.error ?? new Error('IndexedDB transaction aborted')); };
  });
}

export function isProjectDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {db.createObjectStore(PROJECT_STORE);}
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {db.createObjectStore(IMAGE_STORE);}
    };
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Cannot open IndexedDB'));
    };
  });
  return dbPromise;
}

export async function readProjectRecord(): Promise<unknown> {
  const db = await openDb();
  const transaction = db.transaction(PROJECT_STORE, 'readonly');
  return requestToPromise(transaction.objectStore(PROJECT_STORE).get(PROJECT_KEY));
}

export async function readImageBlobs(ids: readonly string[]): Promise<Map<string, Blob>> {
  const db = await openDb();
  const store = db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE);
  const result = new Map<string, Blob>();
  await Promise.all(ids.map(async (id) => {
    const blob = await requestToPromise(store.get(id) as IDBRequest<Blob | undefined>);
    if (blob) {result.set(id, blob);}
  }));
  return result;
}

export async function listImageBlobIds(): Promise<string[]> {
  const db = await openDb();
  const store = db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE);
  const keys = await requestToPromise(store.getAllKeys());
  return keys.map(String);
}

/** Writes the project record, adds new image files and deletes files no longer used. */
export async function writeProject(
  record: unknown,
  addImages: ReadonlyMap<string, Blob>,
  deleteImageIds: readonly string[],
): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction([PROJECT_STORE, IMAGE_STORE], 'readwrite');
  transaction.objectStore(PROJECT_STORE).put(record, PROJECT_KEY);
  const images = transaction.objectStore(IMAGE_STORE);
  for (const [id, blob] of addImages) {images.put(blob, id);}
  for (const id of deleteImageIds) {images.delete(id);}
  await transactionDone(transaction);
}

export async function clearProjectDb(): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction([PROJECT_STORE, IMAGE_STORE], 'readwrite');
  transaction.objectStore(PROJECT_STORE).clear();
  transaction.objectStore(IMAGE_STORE).clear();
  await transactionDone(transaction);
}
