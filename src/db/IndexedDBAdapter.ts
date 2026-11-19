import { DEFAULT_TIMEZONE, generateId } from '../utils/logic';
import {
  sanitizeMetaPayload,
  sanitizeRecordPayload,
  stampSyncMeta,
  WorkspaceCollectionName,
  WorkspaceMetaName,
} from '../utils/sanitizers';
import {
  COLLECTION_STORES,
  InMemoryLocalEngine,
  LocalDatabase,
  LocalStorageEngine,
  META_STORE,
  SYNC_QUEUE_STORE,
} from './LocalDatabase';
import { DatabaseAdapter, SyncQueueEntry, WorkspaceSnapshot } from './types';

interface MetaRow<T = unknown> {
  key: string;
  value: T;
  updatedAt: string;
}

export function createDefaultWorkspaceSnapshot(userId = 'local_user'): WorkspaceSnapshot {
  return {
    profile: {
      userId,
      displayName: 'Clearspace Member',
      email: '',
      bio: '',
      avatarEmoji: '🌸',
    },
    preferences: {
      userId,
      timeFormat: '12h',
      timezone: DEFAULT_TIMEZONE,
      dayStartHour: 7,
      dayEndHour: 22,
      currency: 'INR',
      weekStartsOn: 'monday',
    },
    themeSettings: {
      userId,
      activeTheme: 'strawberry-milk',
      customAccent: '',
      decorativeStickers: true,
      compactMode: false,
      customThemes: [],
    },
    cycleSettings: {
      userId,
      predictionsEnabled: false,
      fertileWindowEnabled: false,
      pulseCheckBridgeEnabled: false,
      defaultCycleLength: 28,
      defaultPeriodLength: 5,
      reminderEnabled: false,
      reminderDaysBefore: 2,
      discreetReminderText: 'Self-care check-in upcoming',
      customSymptomCatalog: [],
    },
    dashboardTrackerPrefs: {
      userId,
      showSection: true,
      hiddenTrackerIds: [],
    },
    areas: [],
    tasks: [],
    dailySchedules: [],
    dailyTemplates: [],
    studySchedules: [],
    calendarEvents: [],
    calendarMarkers: [],
    goals: [],
    journalEntries: [],
    pulseChecks: [],
    focusSessions: [],
    expenses: [],
    incomes: [],
    monthlyReviews: [],
    weeklyResets: [],
    lifeTimeline: [],
    cycleRecords: [],
    cycleDailyLogs: [],
    customTrackers: [],
    customTrackerEntries: [],
    trackerGoals: [],
  };
}

export class IndexedDBAdapter implements DatabaseAdapter {
  private engine: LocalStorageEngine;
  private initialized = false;

  constructor(engine?: LocalStorageEngine) {
    if (engine) {
      this.engine = engine;
    } else if (LocalDatabase.isSupported()) {
      this.engine = new LocalDatabase();
    } else {
      this.engine = new InMemoryLocalEngine();
    }
  }

  get engineName(): 'IndexedDB' | 'MemoryFallback' {
    return this.engine.kind;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.engine.open();
    } catch {
      // If IndexedDB fails in private browsing / restricted iframe, degrade gracefully to memory fallback
      if (this.engine.kind === 'IndexedDB') {
        this.engine = new InMemoryLocalEngine();
        await this.engine.open();
      }
    }
    this.initialized = true;
  }

  private async enqueueSync(
    storeName: WorkspaceCollectionName | WorkspaceMetaName,
    recordId: string,
    operation: 'upsert' | 'delete',
    version: number
  ): Promise<void> {
    const entry: SyncQueueEntry = {
      id: generateId('sq'),
      storeName,
      recordId,
      operation,
      timestamp: new Date().toISOString(),
      version,
      status: 'pending',
    };
    await this.engine.put(SYNC_QUEUE_STORE, entry);
  }

  async getMeta<T>(key: string): Promise<T | null> {
    await this.init();
    const row = await this.engine.getByKey<MetaRow<T>>(META_STORE, key);
    return row ? row.value : null;
  }

  async setMeta<T>(key: string, value: T, recordQueue = true): Promise<void> {
    await this.init();
    const now = new Date().toISOString();
    const existing = await this.engine.getByKey<MetaRow<any>>(META_STORE, key);
    const nextVersion = ((existing?.value as any)?.version || 0) + 1;
    const payload =
      value && typeof value === 'object'
        ? { ...(value as Record<string, unknown>), updatedAt: now, version: nextVersion }
        : value;
    await this.engine.put(META_STORE, {
      key,
      value: payload,
      updatedAt: now,
    } satisfies MetaRow<typeof payload>);

    if (
      recordQueue &&
      ['profile', 'preferences', 'themeSettings', 'cycleSettings', 'dashboardTrackerPrefs'].includes(key)
    ) {
      await this.enqueueSync(key as WorkspaceMetaName, key, 'upsert', nextVersion);
    }
  }

  async loadWorkspace(userId = 'local_user'): Promise<WorkspaceSnapshot> {
    await this.init();
    const defaults = createDefaultWorkspaceSnapshot(userId);

    const [profile, preferences, themeSettings, cycleSettings, dashboardTrackerPrefs] = await Promise.all([
      this.getMeta<WorkspaceSnapshot['profile']>('profile'),
      this.getMeta<WorkspaceSnapshot['preferences']>('preferences'),
      this.getMeta<WorkspaceSnapshot['themeSettings']>('themeSettings'),
      this.getMeta<WorkspaceSnapshot['cycleSettings']>('cycleSettings'),
      this.getMeta<WorkspaceSnapshot['dashboardTrackerPrefs']>('dashboardTrackerPrefs'),
    ]);

    const snapshot: WorkspaceSnapshot = {
      ...defaults,
      profile: profile ? sanitizeMetaPayload('profile', userId, profile) as WorkspaceSnapshot['profile'] : defaults.profile,
      preferences: preferences
        ? sanitizeMetaPayload('preferences', userId, preferences) as WorkspaceSnapshot['preferences']
        : defaults.preferences,
      themeSettings: themeSettings
        ? sanitizeMetaPayload('themeSettings', userId, themeSettings) as WorkspaceSnapshot['themeSettings']
        : defaults.themeSettings,
      cycleSettings: cycleSettings
        ? sanitizeMetaPayload('cycleSettings', userId, cycleSettings) as WorkspaceSnapshot['cycleSettings']
        : defaults.cycleSettings,
      dashboardTrackerPrefs: dashboardTrackerPrefs
        ? sanitizeMetaPayload('dashboardTrackerPrefs', userId, dashboardTrackerPrefs) as WorkspaceSnapshot['dashboardTrackerPrefs']
        : defaults.dashboardTrackerPrefs,
    };

    const collectionResults = await Promise.all(
      COLLECTION_STORES.map(async (col) => [col, await this.engine.getAll<any>(col)] as const)
    );

    for (const [col, items] of collectionResults) {
      (snapshot as unknown as Record<string, unknown[]>)[col] = items;
    }

    return snapshot;
  }

  async upsertRecord<T extends { id: string }>(
    store: WorkspaceCollectionName,
    record: T,
    recordQueue = true
  ): Promise<T> {
    await this.init();
    const existing = await this.engine.getByKey<T & { createdAt?: unknown; version?: number }>(store, record.id);
    const cleaned = sanitizeRecordPayload(store, (record as any).userId || 'local_user', record);
    const stamped = stampSyncMeta(cleaned, existing || undefined) as unknown as T & { version: number };
    await this.engine.put(store, stamped);
    if (recordQueue) {
      await this.enqueueSync(store, stamped.id, 'upsert', stamped.version);
    }
    return stamped;
  }

  async bulkUpsert<T extends { id: string }>(
    store: WorkspaceCollectionName,
    records: T[],
    recordQueue = true
  ): Promise<T[]> {
    await this.init();
    if (records.length === 0) return [];
    const existingAll = await this.engine.getAll<T & { createdAt?: unknown; version?: number }>(store);
    const existingMap = new Map(existingAll.map((item) => [item.id, item]));

    const prepared: (T & { version: number })[] = [];
    for (const rec of records) {
      const cleaned = sanitizeRecordPayload(store, (rec as any).userId || 'local_user', rec);
      const stamped = stampSyncMeta(cleaned, existingMap.get(cleaned.id)) as unknown as T & { version: number };
      prepared.push(stamped);
    }

    await this.engine.putMany(store, prepared);
    if (recordQueue) {
      for (const item of prepared) {
        await this.enqueueSync(store, item.id, 'upsert', item.version);
      }
    }
    return prepared;
  }

  async deleteRecord(store: WorkspaceCollectionName, id: string, recordQueue = true): Promise<void> {
    await this.init();
    const existing = await this.engine.getByKey<{ version?: number }>(store, id);
    await this.engine.deleteByKey(store, id);
    if (recordQueue) {
      await this.enqueueSync(store, id, 'delete', (existing?.version || 0) + 1);
    }
  }

  async clearStore(store: WorkspaceCollectionName): Promise<void> {
    await this.init();
    await this.engine.clear(store);
  }

  async replaceWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
    await this.init();
    await this.setMeta('profile', snapshot.profile, true);
    await this.setMeta('preferences', snapshot.preferences, true);
    await this.setMeta('themeSettings', snapshot.themeSettings, true);
    await this.setMeta('cycleSettings', snapshot.cycleSettings, true);
    await this.setMeta('dashboardTrackerPrefs', snapshot.dashboardTrackerPrefs, true);

    for (const col of COLLECTION_STORES) {
      await this.engine.clear(col);
      const records = (snapshot as unknown as Record<string, any[]>)[col] || [];
      if (records.length > 0) {
        await this.bulkUpsert(col, records, true);
      }
    }
  }

  async getSyncQueue(): Promise<SyncQueueEntry[]> {
    await this.init();
    return this.engine.getAll<SyncQueueEntry>(SYNC_QUEUE_STORE);
  }

  async clearSyncQueue(ids?: string[]): Promise<void> {
    await this.init();
    if (!ids) {
      await this.engine.clear(SYNC_QUEUE_STORE);
      return;
    }
    for (const id of ids) {
      await this.engine.deleteByKey(SYNC_QUEUE_STORE, id);
    }
  }
}
