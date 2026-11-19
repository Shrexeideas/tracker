import { WorkspaceCollectionName } from '../utils/sanitizers';

export const CLEARSPACE_DB_NAME = 'clearspace_local_v1';
export const CLEARSPACE_DB_VERSION = 1;

export const COLLECTION_STORES: WorkspaceCollectionName[] = [
  'areas',
  'tasks',
  'dailySchedules',
  'dailyTemplates',
  'studySchedules',
  'calendarEvents',
  'calendarMarkers',
  'goals',
  'journalEntries',
  'pulseChecks',
  'focusSessions',
  'expenses',
  'incomes',
  'monthlyReviews',
  'weeklyResets',
  'lifeTimeline',
  'cycleRecords',
  'cycleDailyLogs',
  'customTrackers',
  'customTrackerEntries',
  'trackerGoals',
];

export const META_STORE = 'meta';
export const SYNC_QUEUE_STORE = 'syncQueue';

export type AllStoreName = WorkspaceCollectionName | typeof META_STORE | typeof SYNC_QUEUE_STORE;

export interface LocalStorageEngine {
  readonly kind: 'IndexedDB' | 'MemoryFallback';
  open(): Promise<void>;
  getAll<T>(storeName: AllStoreName): Promise<T[]>;
  getByKey<T>(storeName: AllStoreName, key: string): Promise<T | null>;
  put<T>(storeName: AllStoreName, value: T): Promise<void>;
  putMany<T>(storeName: AllStoreName, values: T[]): Promise<void>;
  deleteByKey(storeName: AllStoreName, key: string): Promise<void>;
  clear(storeName: AllStoreName): Promise<void>;
}

/**
 * Memory fallback used in headless unit tests or environments where IndexedDB is disabled.
 */
export class InMemoryLocalEngine implements LocalStorageEngine {
  readonly kind = 'MemoryFallback' as const;
  private stores = new Map<AllStoreName, Map<string, unknown>>();

  constructor() {
    this.ensureStores();
  }

  private ensureStores() {
    for (const s of [...COLLECTION_STORES, META_STORE, SYNC_QUEUE_STORE] as AllStoreName[]) {
      if (!this.stores.has(s)) {
        this.stores.set(s, new Map());
      }
    }
  }

  async open(): Promise<void> {
    this.ensureStores();
  }

  private getKey(storeName: AllStoreName, value: any): string {
    if (storeName === META_STORE) return String(value.key);
    return String(value.id);
  }

  async getAll<T>(storeName: AllStoreName): Promise<T[]> {
    const store = this.stores.get(storeName);
    if (!store) return [];
    return Array.from(store.values()).map((v) => structuredClone(v) as T);
  }

  async getByKey<T>(storeName: AllStoreName, key: string): Promise<T | null> {
    const store = this.stores.get(storeName);
    if (!store) return null;
    const item = store.get(key);
    return item ? (structuredClone(item) as T) : null;
  }

  async put<T>(storeName: AllStoreName, value: T): Promise<void> {
    this.ensureStores();
    const store = this.stores.get(storeName)!;
    store.set(this.getKey(storeName, value), structuredClone(value));
  }

  async putMany<T>(storeName: AllStoreName, values: T[]): Promise<void> {
    this.ensureStores();
    const store = this.stores.get(storeName)!;
    for (const v of values) {
      store.set(this.getKey(storeName, v), structuredClone(v));
    }
  }

  async deleteByKey(storeName: AllStoreName, key: string): Promise<void> {
    const store = this.stores.get(storeName);
    store?.delete(key);
  }

  async clear(storeName: AllStoreName): Promise<void> {
    this.stores.get(storeName)?.clear();
  }
}

/**
 * Primary persistent IndexedDB engine for Clearspace Local-First mode.
 */
export class LocalDatabase implements LocalStorageEngine {
  readonly kind = 'IndexedDB' as const;
  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase> | null = null;

  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  async open(): Promise<void> {
    await this.getDb();
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise((resolve, reject) => {
      if (!LocalDatabase.isSupported()) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(CLEARSPACE_DB_NAME, CLEARSPACE_DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' });
        }
        if (!database.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          database.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
        }
        for (const col of COLLECTION_STORES) {
          if (!database.objectStoreNames.contains(col)) {
            database.createObjectStore(col, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.openPromise = null;
        };
        resolve(this.db);
      };

      request.onerror = () => {
        this.openPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB.'));
      };
    });

    return this.openPromise;
  }

  async getAll<T>(storeName: AllStoreName): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async getByKey<T>(storeName: AllStoreName, key: string): Promise<T | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: AllStoreName, value: T): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  async putMany<T>(storeName: AllStoreName, values: T[]): Promise<void> {
    if (values.length === 0) return;
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const v of values) {
        store.put(v);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB batch transaction aborted'));
    });
  }

  async deleteByKey(storeName: AllStoreName, key: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(storeName: AllStoreName): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
