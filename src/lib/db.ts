const DB_NAME = 'NuestroEspacioDB';
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB database with separate object stores for all modules.
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object store for relationship config (names, dates, hashed key)
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'id' });
      }
      // Object store for photo albums
      if (!db.objectStoreNames.contains('albums')) {
        db.createObjectStore('albums', { keyPath: 'id' });
      }
      // Object store for encrypted photo and video files
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      // Object store for romantic timeline memories
      if (!db.objectStoreNames.contains('timeline')) {
        db.createObjectStore('timeline', { keyPath: 'id' });
      }
      // Object store for sticky notes/love letters
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      // Object store for favorite songs
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
      }
      // Object store for unlocked romantic coupons
      if (!db.objectStoreNames.contains('coupons')) {
        db.createObjectStore('coupons', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Retrieves all items from a specified object store.
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Puts (inserts or updates) an item into a specified object store.
 */
export async function putToStore<T>(storeName: string, item: T): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deletes an item by ID from a specified object store.
 */
export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Clears all object stores in the database to allow resetting the database safely.
 */
export async function clearAllStores(): Promise<void> {
  const db = await initDB();
  const stores = ['config', 'albums', 'photos', 'timeline', 'messages', 'songs', 'coupons'];
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite');
    
    for (const storeName of stores) {
      transaction.objectStore(storeName).clear();
    }

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}
