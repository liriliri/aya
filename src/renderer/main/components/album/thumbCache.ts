const DB_NAME = 'aya-album-thumbs'
const STORE = 'thumbs'
const VERSION = 1

interface IThumbRecord {
  key: string
  blob: Blob
}

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) {
    return dbPromise
  }
  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

export async function getThumb(key: string): Promise<Blob | null> {
  const db = await openDB()
  if (!db) {
    return null
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(key)
      request.onsuccess = () => {
        const record = request.result as IThumbRecord | undefined
        resolve(record ? record.blob : null)
      }
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function putThumb(key: string, blob: Blob): Promise<void> {
  const db = await openDB()
  if (!db) {
    return
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ key, blob } as IThumbRecord)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export async function clearThumbs(prefix?: string): Promise<void> {
  const db = await openDB()
  if (!db) {
    return
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      if (!prefix) {
        store.clear()
      } else {
        const request = store.openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            const record = cursor.value as IThumbRecord
            if (record.key.indexOf(prefix) === 0) {
              cursor.delete()
            }
            cursor.continue()
          }
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}
