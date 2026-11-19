import {
  Area,
  CalendarEvent,
  CalendarMarker,
  ClearspaceBackupBundle,
  CycleDailyLog,
  CycleRecord,
  CycleSettings,
  CustomTracker,
  CustomTrackerEntry,
  DailyScheduleBlock,
  DailyTemplate,
  DashboardTrackerPreferences,
  FocusSession,
  Goal,
  JournalEntry,
  LifeTimelineItem,
  MoneyRecord,
  MonthlyReview,
  PulseCheck,
  StudySchedule,
  Task,
  ThemeSettings,
  TrackerGoal,
  UserPreferences,
  UserProfile,
  WeeklyReset,
} from '../types/clearspace';
import { WorkspaceCollectionName, WorkspaceMetaName } from '../utils/sanitizers';

export interface WorkspaceSnapshot {
  profile: UserProfile;
  preferences: UserPreferences;
  themeSettings: ThemeSettings;
  cycleSettings: CycleSettings;
  dashboardTrackerPrefs: DashboardTrackerPreferences;
  areas: Area[];
  tasks: Task[];
  dailySchedules: DailyScheduleBlock[];
  dailyTemplates: DailyTemplate[];
  studySchedules: StudySchedule[];
  calendarEvents: CalendarEvent[];
  calendarMarkers: CalendarMarker[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  pulseChecks: PulseCheck[];
  focusSessions: FocusSession[];
  expenses: MoneyRecord[];
  incomes: MoneyRecord[];
  monthlyReviews: MonthlyReview[];
  weeklyResets: WeeklyReset[];
  lifeTimeline: LifeTimelineItem[];
  cycleRecords: CycleRecord[];
  cycleDailyLogs: CycleDailyLog[];
  customTrackers: CustomTracker[];
  customTrackerEntries: CustomTrackerEntry[];
  trackerGoals: TrackerGoal[];
}

export interface SyncQueueEntry {
  id: string;
  storeName: WorkspaceCollectionName | WorkspaceMetaName;
  recordId: string;
  operation: 'upsert' | 'delete';
  timestamp: string;
  version: number;
  status: 'pending' | 'synced' | 'conflict';
}

export interface DatabaseAdapter {
  readonly engineName: 'IndexedDB' | 'MemoryFallback';
  init(): Promise<void>;
  loadWorkspace(userId?: string): Promise<WorkspaceSnapshot>;
  getMeta<T>(key: string): Promise<T | null>;
  setMeta<T>(key: string, value: T, recordQueue?: boolean): Promise<void>;
  upsertRecord<T extends { id: string }>(
    store: WorkspaceCollectionName,
    record: T,
    recordQueue?: boolean
  ): Promise<T>;
  bulkUpsert<T extends { id: string }>(
    store: WorkspaceCollectionName,
    records: T[],
    recordQueue?: boolean
  ): Promise<T[]>;
  deleteRecord(
    store: WorkspaceCollectionName,
    id: string,
    recordQueue?: boolean
  ): Promise<void>;
  clearStore(store: WorkspaceCollectionName): Promise<void>;
  replaceWorkspace(snapshot: WorkspaceSnapshot): Promise<void>;
  getSyncQueue(): Promise<SyncQueueEntry[]>;
  clearSyncQueue(ids?: string[]): Promise<void>;
}

/**
 * FutureCloudAdapter defines the contract for reconnecting a remote database
 * (e.g. Firebase Firestore, Supabase, or custom API) in a future release
 * without modifying feature modules. Implementations must resolve conflicts
 * explicitly and never silently overwrite newer local data.
 */
export interface ConflictResolutionResult<T> {
  winner: 'local' | 'remote' | 'merged';
  resolved: T;
  reason: string;
}

export interface FutureCloudAdapter {
  readonly providerName: string;
  isConfigured(): boolean;
  pushPendingChanges(
    queue: SyncQueueEntry[],
    localSnapshot: WorkspaceSnapshot
  ): Promise<{ syncedIds: string[]; failedIds: string[] }>;
  pullRemoteChanges(sinceIso?: string): Promise<Partial<ClearspaceBackupBundle>>;
  resolveConflict<T extends { updatedAt?: unknown; version?: number }>(
    localRecord: T,
    remoteRecord: T
  ): ConflictResolutionResult<T>;
}

export interface BackupExportOptions {
  includeMooncycle: boolean;
  includeTrackers: boolean;
}

export interface BackupPreview {
  version: string;
  exportedAt: string;
  counts: {
    areas: number;
    tasks: number;
    dailySchedules: number;
    dailyTemplates: number;
    studySchedules: number;
    calendarEvents: number;
    calendarMarkers: number;
    goals: number;
    journalEntries: number;
    pulseChecks: number;
    focusSessions: number;
    expenses: number;
    incomes: number;
    monthlyReviews: number;
    weeklyResets: number;
    lifeTimeline: number;
    cycleRecords: number;
    cycleDailyLogs: number;
    customTrackers: number;
    customTrackerEntries: number;
    trackerGoals: number;
  };
  totalRecords: number;
  hasMooncycleData: boolean;
  hasTrackerData: boolean;
  sampleTitles: string[];
}

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview: BackupPreview | null;
  bundle: ClearspaceBackupBundle | null;
}

export type ImportMode = 'merge' | 'replace';
