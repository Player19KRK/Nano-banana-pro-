const DB_NAME = 'NanoLabPersistenceDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

export interface SavedImageFile {
  name: string;
  type: string;
  dataUrl: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveState(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`IndexedDB save failed for ${key}, falling back to localStorage:`, err);
    try {
      localStorage.setItem(`nanolab_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error(`localStorage save failed for ${key}:`, e);
    }
  }
}

export async function getState<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result !== undefined) {
          resolve(request.result as T);
        } else {
          // Check localStorage as fallback
          const local = localStorage.getItem(`nanolab_${key}`);
          if (local) {
            try {
              resolve(JSON.parse(local));
              return;
            } catch (e) {}
          }
          resolve(defaultValue);
        }
      };
      request.onerror = () => {
        const local = localStorage.getItem(`nanolab_${key}`);
        if (local) {
          try {
            resolve(JSON.parse(local));
            return;
          } catch (e) {}
        }
        resolve(defaultValue);
      };
    });
  } catch (err) {
    const local = localStorage.getItem(`nanolab_${key}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return defaultValue;
  }
}

export async function clearAllState(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (e) {
    console.error('IndexedDB clear failed:', e);
  }
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('nanolab_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('localStorage clear failed:', e);
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): File {
  const arr = dataUrl.split(',');
  const mime = mimeType || (arr[0].match(/:(.*?);/)?.[1] || 'image/png');
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}
