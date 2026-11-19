import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { applyThemeToDocument } from '../themes/themes';
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
import {
  DEFAULT_TIMEZONE,
  generateId,
  getDateStringInTimezone,
  LegacyScanReport,
  sanitizeId,
} from '../utils/logic';
import {
  sanitizeMetaPayload,
  sanitizeRecordPayload,
  stampSyncMeta,
  WorkspaceCollectionName,
} from '../utils/sanitizers';
import { createDefaultWorkspaceSnapshot, IndexedDBAdapter } from '../db/IndexedDBAdapter';
import {
  applyBackupImport,
  createBackupBundle,
  createMooncycleBackupBundle,
  ImportSummary,
  validateAndPreviewBackup,
} from '../db/BackupService';
import { MigrationService } from '../db/MigrationService';
import {
  BackupExportOptions,
  BackupValidationResult,
  ImportMode,
  WorkspaceSnapshot,
} from '../db/types';

export type SyncStatus = 'local-ready' | 'saving' | 'error';

export type { ImportSummary };

interface DataContextValue extends WorkspaceSnapshot {
  loadingData: boolean;
  syncStatus: SyncStatus;
  storageEngine: 'IndexedDB' | 'MemoryFallback';
  pendingSyncCount: number;
  lastError: string | null;
  todayDate: string;
  isCloudSynced: boolean;
  clearError: () => void;

  // Profile, Preferences & Theme
  updateProfileData: (patch: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  updateThemeSettings: (patch: Partial<ThemeSettings>) => Promise<void>;

  // Areas
  saveArea: (area: Omit<Area, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;

  // Tasks
  saveTask: (task: Omit<Task, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  toggleTaskComplete: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Daily Schedules & Templates
  saveScheduleBlock: (block: Omit<DailyScheduleBlock, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  toggleScheduleBlockComplete: (block: DailyScheduleBlock, actualMinutes?: number) => Promise<void>;
  deleteScheduleBlock: (blockId: string) => Promise<void>;
  saveDailyTemplate: (tpl: Omit<DailyTemplate, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteDailyTemplate: (templateId: string) => Promise<void>;

  // Study Schedules
  saveStudySchedule: (study: Omit<StudySchedule, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteStudySchedule: (studyId: string) => Promise<void>;

  // Calendar Events & Markers
  saveCalendarEvent: (ev: Omit<CalendarEvent, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  saveCalendarMarker: (marker: Omit<CalendarMarker, 'id' | 'userId'> & { id?: string }) => Promise<void>;

  // Goals
  saveGoal: (goal: Omit<Goal, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  // Journal
  saveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;

  // Pulse Checks
  savePulseCheck: (check: Omit<PulseCheck, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deletePulseCheck: (checkId: string) => Promise<void>;

  // Focus Sessions
  logFocusSession: (session: Omit<FocusSession, 'id' | 'userId'>) => Promise<void>;
  deleteFocusSession: (sessionId: string) => Promise<void>;

  // Money Tracker
  saveExpense: (rec: Omit<MoneyRecord, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  saveIncome: (rec: Omit<MoneyRecord, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;

  // Reviews & Timeline
  saveMonthlyReview: (rev: Omit<MonthlyReview, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  saveWeeklyReset: (reset: Omit<WeeklyReset, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  saveTimelineItem: (item: Omit<LifeTimelineItem, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  deleteTimelineItem: (id: string) => Promise<void>;

  // Mooncycle (Private Period & Cycle Tracker — isolated from Dashboard & Timeline)
  updateCycleSettings: (patch: Partial<CycleSettings>) => Promise<void>;
  saveCycleRecord: (rec: Omit<CycleRecord, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  deleteCycleRecord: (id: string) => Promise<void>;
  saveCycleDailyLog: (log: Omit<CycleDailyLog, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  deleteCycleDailyLog: (id: string) => Promise<void>;
  exportMooncycleJson: () => ReturnType<typeof createMooncycleBackupBundle>;
  deleteAllMooncycleData: () => Promise<void>;

  // My Trackers
  updateDashboardTrackerPrefs: (patch: Partial<DashboardTrackerPreferences>) => Promise<void>;
  saveCustomTracker: (tracker: Omit<CustomTracker, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  deleteCustomTracker: (trackerId: string, deleteAssociatedData?: boolean) => Promise<void>;
  saveCustomTrackerEntry: (entry: Omit<CustomTrackerEntry, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  deleteCustomTrackerEntry: (entryId: string) => Promise<void>;
  saveTrackerGoal: (goal: Omit<TrackerGoal, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  deleteTrackerGoal: (goalId: string) => Promise<void>;

  // Migration & Backup
  scanLegacyStorage: () => LegacyScanReport;
  importLegacyBundle: (bundle: Partial<ClearspaceBackupBundle>) => Promise<ImportSummary>;
  clearLegacyLocalStorageKeys: (keys: string[]) => void;
  exportBackupJson: (options?: BackupExportOptions) => ClearspaceBackupBundle;
  validateBackupJson: (raw: unknown) => BackupValidationResult;
  importBackupJson: (bundle: ClearspaceBackupBundle, mode?: ImportMode) => Promise<ImportSummary>;
}

const DataContext = createContext<DataContextValue | null>(null);
const LOCAL_USER_ID = 'local_user';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const adapterRef = useRef<IndexedDBAdapter | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = new IndexedDBAdapter();
  }
  const adapter = adapterRef.current;

  const [state, setState] = useState<WorkspaceSnapshot>(() => createDefaultWorkspaceSnapshot(LOCAL_USER_ID));
  const [loadingData, setLoadingData] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-ready');
  const [storageEngine, setStorageEngine] = useState<'IndexedDB' | 'MemoryFallback'>('IndexedDB');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshQueueCount = useCallback(async () => {
    try {
      const q = await adapter.getSyncQueue();
      setPendingSyncCount(q.filter((item) => item.status === 'pending').length);
    } catch {
      // Ignore queue count read issues
    }
  }, [adapter]);

  // Boot local IndexedDB workspace and automatically migrate any pre-existing v1 localStorage workspace once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await adapter.init();
        await MigrationService.autoMigrateWorkspaceV1(adapter);
        const loaded = await adapter.loadWorkspace(LOCAL_USER_ID);
        const queue = await adapter.getSyncQueue();
        if (!active) return;
        setState(loaded);
        setStorageEngine(adapter.engineName);
        setPendingSyncCount(queue.filter((item) => item.status === 'pending').length);
        setSyncStatus('local-ready');
      } catch (err) {
        if (!active) return;
        setLastError(err instanceof Error ? err.message : String(err));
        setSyncStatus('error');
      } finally {
        if (active) setLoadingData(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [adapter]);

  // Apply active theme + overrides + custom theme settings smoothly to DOM
  useEffect(() => {
    applyThemeToDocument(
      state.themeSettings.activeTheme,
      state.themeSettings.customAccent,
      state.themeSettings
    );
  }, [state.themeSettings]);

  const todayDate = useMemo(
    () => getDateStringInTimezone(new Date(), state.preferences.timezone || DEFAULT_TIMEZONE),
    [state.preferences.timezone]
  );

  const persistOp = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setSyncStatus('saving');
      setLastError(null);
      try {
        const res = await fn();
        await refreshQueueCount();
        setSyncStatus('local-ready');
        return res;
      } catch (err) {
        setSyncStatus('error');
        setLastError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    [refreshQueueCount]
  );

  const upsertStateList = <T extends { id: string }>(key: WorkspaceCollectionName, item: T) => {
    setState((prev) => {
      const list = prev[key] as unknown as T[];
      const exists = list.some((x) => x.id === item.id);
      return {
        ...prev,
        [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item],
      };
    });
  };

  const removeStateList = <T extends { id: string }>(key: WorkspaceCollectionName, id: string) => {
    setState((prev) => {
      const list = prev[key] as unknown as T[];
      return { ...prev, [key]: list.filter((x) => x.id !== id) };
    });
  };

  // Profile, Preferences, Theme Settings
  const updateProfileData = useCallback(
    async (patch: Partial<UserProfile>) => {
      const next = sanitizeMetaPayload('profile', LOCAL_USER_ID, {
        ...state.profile,
        ...patch,
      }) as UserProfile;
      setState((prev) => ({ ...prev, profile: next }));
      await persistOp(() => adapter.setMeta('profile', next, true));
    },
    [state.profile, adapter, persistOp]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      const next = sanitizeMetaPayload('preferences', LOCAL_USER_ID, {
        ...state.preferences,
        ...patch,
      }) as UserPreferences;
      setState((prev) => ({ ...prev, preferences: next }));
      await persistOp(() => adapter.setMeta('preferences', next, true));
    },
    [state.preferences, adapter, persistOp]
  );

  const updateThemeSettings = useCallback(
    async (patch: Partial<ThemeSettings>) => {
      const next = sanitizeMetaPayload('themeSettings', LOCAL_USER_ID, {
        ...state.themeSettings,
        ...patch,
      }) as ThemeSettings;
      setState((prev) => ({ ...prev, themeSettings: next }));
      await persistOp(() => adapter.setMeta('themeSettings', next, true));
    },
    [state.themeSettings, adapter, persistOp]
  );

  // Timeline helper (excludes Mooncycle strictly)
  const saveTimelineItem = useCallback(
    async (item: Omit<LifeTimelineItem, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(item.id, 'tl');
      const cleaned = sanitizeRecordPayload('lifeTimeline', LOCAL_USER_ID, { ...item, id }) as LifeTimelineItem;
      const stamped = stampSyncMeta(cleaned, state.lifeTimeline.find((x) => x.id === id)) as LifeTimelineItem;
      upsertStateList('lifeTimeline', stamped);
      await persistOp(() => adapter.upsertRecord('lifeTimeline', stamped));
    },
    [state.lifeTimeline, adapter, persistOp]
  );

  const recordCompletionToTimeline = useCallback(
    async (
      sourceType: LifeTimelineItem['sourceType'],
      sourceId: string,
      title: string,
      category: string,
      description = ''
    ) => {
      const tlId = sanitizeId(`tl_${sourceType}_${sourceId}`, 'tl');
      if (state.lifeTimeline.some((item) => item.id === tlId)) return;
      await saveTimelineItem({
        id: tlId,
        date: todayDate,
        title,
        description,
        category: category || 'Personal',
        sourceType,
        sourceId,
      });
    },
    [state.lifeTimeline, todayDate, saveTimelineItem]
  );

  // Areas
  const saveArea = useCallback(
    async (area: Omit<Area, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(area.id, 'area');
      const existing = state.areas.find((a) => a.id === id);
      const cleaned = sanitizeRecordPayload('areas', LOCAL_USER_ID, { ...area, id }) as Area;
      const saved = await persistOp(() => adapter.upsertRecord('areas', cleaned));
      upsertStateList('areas', saved);

      const renamedTasks =
        existing && existing.name !== saved.name
          ? state.tasks
              .filter((t) => t.areaId === id || t.areaName === existing.name)
              .map((t) => ({ ...t, areaId: id, areaName: saved.name }))
          : [];

      if (renamedTasks.length > 0) {
        const updatedTasks = await persistOp(() => adapter.bulkUpsert('tasks', renamedTasks));
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => updatedTasks.find((u) => u.id === t.id) || t),
        }));
      }
    },
    [state.areas, state.tasks, adapter, persistOp]
  );

  const deleteArea = useCallback(
    async (areaId: string) => {
      removeStateList('areas', areaId);
      await persistOp(() => adapter.deleteRecord('areas', areaId));
    },
    [adapter, persistOp]
  );

  // Tasks
  const saveTask = useCallback(
    async (task: Omit<Task, 'id' | 'userId'> & { id?: string }): Promise<string> => {
      const id = sanitizeId(task.id, 'tsk');
      const cleaned = sanitizeRecordPayload('tasks', LOCAL_USER_ID, { ...task, id }) as Task;
      const saved = await persistOp(() => adapter.upsertRecord('tasks', cleaned));
      upsertStateList('tasks', saved);
      if (saved.completed) {
        await recordCompletionToTimeline('task', id, `Completed task: ${saved.title}`, saved.areaName || 'Tasks');
      }
      return id;
    },
    [adapter, persistOp, recordCompletionToTimeline]
  );

  const toggleTaskComplete = useCallback(
    async (task: Task) => {
      const nextCompleted = !task.completed;
      const completedAt = nextCompleted ? new Date().toISOString() : '';
      const updated = { ...task, completed: nextCompleted, completedAt };
      upsertStateList('tasks', updated);
      const saved = await persistOp(() => adapter.upsertRecord('tasks', updated));
      upsertStateList('tasks', saved);
      if (nextCompleted) {
        await recordCompletionToTimeline('task', task.id, `Completed task: ${task.title}`, task.areaName || 'Tasks');
      }
    },
    [adapter, persistOp, recordCompletionToTimeline]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      removeStateList('tasks', taskId);
      await persistOp(() => adapter.deleteRecord('tasks', taskId));
    },
    [adapter, persistOp]
  );

  // Daily Schedules & Templates
  const saveScheduleBlock = useCallback(
    async (block: Omit<DailyScheduleBlock, 'id' | 'userId'> & { id?: string }): Promise<string> => {
      const id = sanitizeId(block.id, 'blk');
      const cleaned = sanitizeRecordPayload('dailySchedules', LOCAL_USER_ID, { ...block, id }) as DailyScheduleBlock;
      const saved = await persistOp(() => adapter.upsertRecord('dailySchedules', cleaned));
      upsertStateList('dailySchedules', saved);
      return id;
    },
    [adapter, persistOp]
  );

  const toggleScheduleBlockComplete = useCallback(
    async (block: DailyScheduleBlock, actualMinutes?: number) => {
      const nextCompleted = !block.completed;
      const completedAt = nextCompleted ? new Date().toISOString() : '';
      const actualDurationMinutes =
        nextCompleted && typeof actualMinutes === 'number'
          ? actualMinutes
          : nextCompleted
            ? block.actualDurationMinutes || block.durationMinutes
            : 0;
      const updated = { ...block, completed: nextCompleted, completedAt, actualDurationMinutes };
      const saved = await persistOp(() => adapter.upsertRecord('dailySchedules', updated));
      upsertStateList('dailySchedules', saved);
      if (nextCompleted && !block.isBreak) {
        await recordCompletionToTimeline(
          'schedule',
          block.id,
          `Completed block: ${block.title}`,
          block.category || 'Daily Plan',
          `${block.startTime}–${block.endTime}`
        );
      }
    },
    [adapter, persistOp, recordCompletionToTimeline]
  );

  const deleteScheduleBlock = useCallback(
    async (blockId: string) => {
      removeStateList('dailySchedules', blockId);
      await persistOp(() => adapter.deleteRecord('dailySchedules', blockId));
    },
    [adapter, persistOp]
  );

  const saveDailyTemplate = useCallback(
    async (tpl: Omit<DailyTemplate, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(tpl.id, 'tpl');
      const cleaned = sanitizeRecordPayload('dailyTemplates', LOCAL_USER_ID, { ...tpl, id }) as DailyTemplate;
      const saved = await persistOp(() => adapter.upsertRecord('dailyTemplates', cleaned));
      upsertStateList('dailyTemplates', saved);
    },
    [adapter, persistOp]
  );

  const deleteDailyTemplate = useCallback(
    async (templateId: string) => {
      removeStateList('dailyTemplates', templateId);
      await persistOp(() => adapter.deleteRecord('dailyTemplates', templateId));
    },
    [adapter, persistOp]
  );

  // Study Schedules
  const saveStudySchedule = useCallback(
    async (study: Omit<StudySchedule, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(study.id, 'std');
      const cleaned = sanitizeRecordPayload('studySchedules', LOCAL_USER_ID, { ...study, id }) as StudySchedule;
      const saved = await persistOp(() => adapter.upsertRecord('studySchedules', cleaned));
      upsertStateList('studySchedules', saved);
      if (saved.completed) {
        await recordCompletionToTimeline(
          'study',
          id,
          `Completed study module: ${saved.subject}${saved.moduleName ? ` — ${saved.moduleName}` : ''}`,
          'Study'
        );
      }
    },
    [adapter, persistOp, recordCompletionToTimeline]
  );

  const deleteStudySchedule = useCallback(
    async (studyId: string) => {
      removeStateList('studySchedules', studyId);
      await persistOp(() => adapter.deleteRecord('studySchedules', studyId));
    },
    [adapter, persistOp]
  );

  // Calendar Events & Markers
  const saveCalendarEvent = useCallback(
    async (ev: Omit<CalendarEvent, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(ev.id, 'cev');
      const cleaned = sanitizeRecordPayload('calendarEvents', LOCAL_USER_ID, { ...ev, id }) as CalendarEvent;
      const saved = await persistOp(() => adapter.upsertRecord('calendarEvents', cleaned));
      upsertStateList('calendarEvents', saved);
    },
    [adapter, persistOp]
  );

  const deleteCalendarEvent = useCallback(
    async (eventId: string) => {
      removeStateList('calendarEvents', eventId);
      await persistOp(() => adapter.deleteRecord('calendarEvents', eventId));
    },
    [adapter, persistOp]
  );

  const saveCalendarMarker = useCallback(
    async (marker: Omit<CalendarMarker, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(marker.id || `mk_${marker.date}`, 'mk');
      const cleaned = sanitizeRecordPayload('calendarMarkers', LOCAL_USER_ID, { ...marker, id }) as CalendarMarker;
      const saved = await persistOp(() => adapter.upsertRecord('calendarMarkers', cleaned));
      upsertStateList('calendarMarkers', saved);
    },
    [adapter, persistOp]
  );

  // Goals
  const saveGoal = useCallback(
    async (goal: Omit<Goal, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(goal.id, 'gol');
      const cleaned = sanitizeRecordPayload('goals', LOCAL_USER_ID, { ...goal, id }) as Goal;
      const saved = await persistOp(() => adapter.upsertRecord('goals', cleaned));
      upsertStateList('goals', saved);
      if (saved.completed) {
        await recordCompletionToTimeline('goal', id, `Achieved goal: ${saved.title}`, saved.category || 'Goals');
      }
    },
    [adapter, persistOp, recordCompletionToTimeline]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      removeStateList('goals', goalId);
      await persistOp(() => adapter.deleteRecord('goals', goalId));
    },
    [adapter, persistOp]
  );

  // Journal
  const saveJournalEntry = useCallback(
    async (entry: Omit<JournalEntry, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(entry.id, 'jrn');
      const cleaned = sanitizeRecordPayload('journalEntries', LOCAL_USER_ID, { ...entry, id }) as JournalEntry;
      const saved = await persistOp(() => adapter.upsertRecord('journalEntries', cleaned));
      upsertStateList('journalEntries', saved);
    },
    [adapter, persistOp]
  );

  const deleteJournalEntry = useCallback(
    async (entryId: string) => {
      removeStateList('journalEntries', entryId);
      await persistOp(() => adapter.deleteRecord('journalEntries', entryId));
    },
    [adapter, persistOp]
  );

  // Pulse Checks
  const savePulseCheck = useCallback(
    async (check: Omit<PulseCheck, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(check.id || `pls_${check.date}_${check.period}`, 'pls');
      const cleaned = sanitizeRecordPayload('pulseChecks', LOCAL_USER_ID, { ...check, id }) as PulseCheck;
      const saved = await persistOp(() => adapter.upsertRecord('pulseChecks', cleaned));
      upsertStateList('pulseChecks', saved);
    },
    [adapter, persistOp]
  );

  const deletePulseCheck = useCallback(
    async (checkId: string) => {
      removeStateList('pulseChecks', checkId);
      await persistOp(() => adapter.deleteRecord('pulseChecks', checkId));
    },
    [adapter, persistOp]
  );

  // Focus Sessions
  const logFocusSession = useCallback(
    async (session: Omit<FocusSession, 'id' | 'userId'>) => {
      const id = generateId('foc');
      const cleaned = sanitizeRecordPayload('focusSessions', LOCAL_USER_ID, { ...session, id }) as FocusSession;
      const saved = await persistOp(() => adapter.upsertRecord('focusSessions', cleaned));
      upsertStateList('focusSessions', saved);
    },
    [adapter, persistOp]
  );

  const deleteFocusSession = useCallback(
    async (sessionId: string) => {
      removeStateList('focusSessions', sessionId);
      await persistOp(() => adapter.deleteRecord('focusSessions', sessionId));
    },
    [adapter, persistOp]
  );

  // Money Tracker
  const saveExpense = useCallback(
    async (rec: Omit<MoneyRecord, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(rec.id, 'exp');
      const cleaned = sanitizeRecordPayload('expenses', LOCAL_USER_ID, { ...rec, id }) as MoneyRecord;
      const saved = await persistOp(() => adapter.upsertRecord('expenses', cleaned));
      upsertStateList('expenses', saved);
    },
    [adapter, persistOp]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      removeStateList('expenses', id);
      await persistOp(() => adapter.deleteRecord('expenses', id));
    },
    [adapter, persistOp]
  );

  const saveIncome = useCallback(
    async (rec: Omit<MoneyRecord, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(rec.id, 'inc');
      const cleaned = sanitizeRecordPayload('incomes', LOCAL_USER_ID, { ...rec, id }) as MoneyRecord;
      const saved = await persistOp(() => adapter.upsertRecord('incomes', cleaned));
      upsertStateList('incomes', saved);
    },
    [adapter, persistOp]
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      removeStateList('incomes', id);
      await persistOp(() => adapter.deleteRecord('incomes', id));
    },
    [adapter, persistOp]
  );

  // Monthly Review, Weekly Reset, Life Timeline
  const saveMonthlyReview = useCallback(
    async (rev: Omit<MonthlyReview, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(rev.id || `mrev_${rev.monthKey}`, 'mrev');
      const cleaned = sanitizeRecordPayload('monthlyReviews', LOCAL_USER_ID, { ...rev, id }) as MonthlyReview;
      const saved = await persistOp(() => adapter.upsertRecord('monthlyReviews', cleaned));
      upsertStateList('monthlyReviews', saved);
    },
    [adapter, persistOp]
  );

  const saveWeeklyReset = useCallback(
    async (reset: Omit<WeeklyReset, 'id' | 'userId'> & { id?: string }) => {
      const id = sanitizeId(reset.id || `wres_${reset.weekKey}`, 'wres');
      const cleaned = sanitizeRecordPayload('weeklyResets', LOCAL_USER_ID, { ...reset, id }) as WeeklyReset;
      const saved = await persistOp(() => adapter.upsertRecord('weeklyResets', cleaned));
      upsertStateList('weeklyResets', saved);
    },
    [adapter, persistOp]
  );

  const deleteTimelineItem = useCallback(
    async (id: string) => {
      removeStateList('lifeTimeline', id);
      await persistOp(() => adapter.deleteRecord('lifeTimeline', id));
    },
    [adapter, persistOp]
  );

  // ============================================================
  // MOONCYCLE — Private Period & Menstrual Cycle Tracker
  // ============================================================
  const updateCycleSettings = useCallback(
    async (patch: Partial<CycleSettings>) => {
      const next = sanitizeMetaPayload('cycleSettings', LOCAL_USER_ID, {
        ...state.cycleSettings,
        ...patch,
      }) as CycleSettings;
      setState((prev) => ({ ...prev, cycleSettings: next }));
      await persistOp(() => adapter.setMeta('cycleSettings', next, true));
    },
    [state.cycleSettings, adapter, persistOp]
  );

  const saveCycleRecord = useCallback(
    async (rec: Omit<CycleRecord, 'id' | 'userId'> & { id?: string }): Promise<string> => {
      const id = sanitizeId(rec.id, 'cyc');
      const cleaned = sanitizeRecordPayload('cycleRecords', LOCAL_USER_ID, { ...rec, id }) as CycleRecord;
      const saved = await persistOp(() => adapter.upsertRecord('cycleRecords', cleaned));
      upsertStateList('cycleRecords', saved);
      return id;
    },
    [adapter, persistOp]
  );

  const deleteCycleRecord = useCallback(
    async (id: string) => {
      removeStateList('cycleRecords', id);
      await persistOp(() => adapter.deleteRecord('cycleRecords', id));
    },
    [adapter, persistOp]
  );

  const saveCycleDailyLog = useCallback(
    async (log: Omit<CycleDailyLog, 'id' | 'userId'> & { id?: string }): Promise<string> => {
      const id = sanitizeId(log.id || `cdl_${log.date}`, 'cdl');
      const cleaned = sanitizeRecordPayload('cycleDailyLogs', LOCAL_USER_ID, { ...log, id }) as CycleDailyLog;
      const saved = await persistOp(() => adapter.upsertRecord('cycleDailyLogs', cleaned));
      upsertStateList('cycleDailyLogs', saved);
      return id;
    },
    [adapter, persistOp]
  );

  const deleteCycleDailyLog = useCallback(
    async (id: string) => {
      removeStateList('cycleDailyLogs', id);
      await persistOp(() => adapter.deleteRecord('cycleDailyLogs', id));
    },
    [adapter, persistOp]
  );

  const exportMooncycleJson = useCallback(() => createMooncycleBackupBundle(state), [state]);

  const deleteAllMooncycleData = useCallback(async () => {
    const resetSettings = sanitizeMetaPayload('cycleSettings', LOCAL_USER_ID, {}) as CycleSettings;
    setState((prev) => ({
      ...prev,
      cycleSettings: resetSettings,
      cycleRecords: [],
      cycleDailyLogs: [],
    }));
    await persistOp(async () => {
      await adapter.clearStore('cycleRecords');
      await adapter.clearStore('cycleDailyLogs');
      await adapter.setMeta('cycleSettings', resetSettings, true);
    });
  }, [adapter, persistOp]);

  // ============================================================
  // MY TRACKERS — Custom Activity Tracking System
  // ============================================================
  const updateDashboardTrackerPrefs = useCallback(
    async (patch: Partial<DashboardTrackerPreferences>) => {
      const next = sanitizeMetaPayload('dashboardTrackerPrefs', LOCAL_USER_ID, {
        ...state.dashboardTrackerPrefs,
        ...patch,
      }) as DashboardTrackerPreferences;
      setState((prev) => ({ ...prev, dashboardTrackerPrefs: next }));
      await persistOp(() => adapter.setMeta('dashboardTrackerPrefs', next, true));
    },
    [state.dashboardTrackerPrefs, adapter, persistOp]
  );

  const saveCustomTracker = useCallback(
    async (tracker: Omit<CustomTracker, 'id' | 'userId'> & { id?: string }): Promise<string> => {
      const id = sanitizeId(tracker.id, 'trk');
      const cleaned = sanitizeRecordPayload('customTrackers', LOCAL_USER_ID, { ...tracker, id }) as CustomTracker;
      const saved = await persistOp(() => adapter.upsertRecord('customTrackers', cleaned));
      upsertStateList('customTrackers', saved);
      return id;
    },
    [adapter, persistOp]
  );

  const deleteCustomTracker = useCallback(
    async (trackerId: string, deleteAssociatedData = true) => {
      removeStateList('customTrackers', trackerId);
      const entryIds = deleteAssociatedData
        ? state.customTrackerEntries.filter((e) => e.trackerId === trackerId).map((e) => e.id)
        : [];
      const goalIds = deleteAssociatedData
        ? state.trackerGoals.filter((g) => g.trackerId === trackerId).map((g) => g.id)
        : [];

      if (deleteAssociatedData) {
        setState((prev) => ({
          ...prev,
          customTrackerEntries: prev.customTrackerEntries.filter((e) => e.trackerId !== trackerId),
          trackerGoals: prev.trackerGoals.filter((g) => g.trackerId !== trackerId),
        }));
      }

      await persistOp(async () => {
        await adapter.deleteRecord('customTrackers', trackerId);
        for (const eid of entryIds) {
          await adapter.deleteRecord('customTrackerEntries', eid);
        }
        for (const gid of goalIds) {
          await adapter.deleteRecord('trackerGoals', gid);
        }
      });
    },
    [state.customTrackerEntries, state.trackerGoals, adapter, persistOp]
  );

  const saveCustomTrackerEntry = useCallback(
    async (entry: Omit<CustomTrackerEntry, 'id' | 'userId'> & { id?: string }): Promise<string> => {
      const id = sanitizeId(entry.id, 'tre');
      const cleaned = sanitizeRecordPayload('customTrackerEntries', LOCAL_USER_ID, { ...entry, id }) as CustomTrackerEntry;
      const saved = await persistOp(() => adapter.upsertRecord('customTrackerEntries', cleaned));
      upsertStateList('customTrackerEntries', saved);
      return id;
    },
    [adapter, persistOp]
  );

  const deleteCustomTrackerEntry = useCallback(
    async (entryId: string) => {
      removeStateList('customTrackerEntries', entryId);
      await persistOp(() => adapter.deleteRecord('customTrackerEntries', entryId));
    },
    [adapter, persistOp]
  );

  const saveTrackerGoal = useCallback(
    async (goal: Omit<TrackerGoal, 'id' | 'userId'> & { id?: string }): Promise<string> => {
      const id = sanitizeId(goal.id, 'trg');
      const cleaned = sanitizeRecordPayload('trackerGoals', LOCAL_USER_ID, { ...goal, id }) as TrackerGoal;
      const saved = await persistOp(() => adapter.upsertRecord('trackerGoals', cleaned));
      upsertStateList('trackerGoals', saved);
      return id;
    },
    [adapter, persistOp]
  );

  const deleteTrackerGoal = useCallback(
    async (goalId: string) => {
      removeStateList('trackerGoals', goalId);
      await persistOp(() => adapter.deleteRecord('trackerGoals', goalId));
    },
    [adapter, persistOp]
  );

  // ============================================================
  // MIGRATION & BACKUP
  // ============================================================
  const scanLegacyStorage = useCallback(() => MigrationService.scanLegacyStorage(), []);

  const importLegacyBundle = useCallback(
    async (bundle: Partial<ClearspaceBackupBundle>): Promise<ImportSummary> => {
      const summary = await persistOp(() => MigrationService.importLegacyBundle(adapter, state, bundle));
      const refreshed = await adapter.loadWorkspace(LOCAL_USER_ID);
      setState(refreshed);
      return summary;
    },
    [adapter, state, persistOp]
  );

  const clearLegacyLocalStorageKeys = useCallback((keys: string[]) => {
    for (const k of keys) {
      window.localStorage.removeItem(k);
    }
  }, []);

  const exportBackupJson = useCallback(
    (options: BackupExportOptions = { includeMooncycle: true, includeTrackers: true }) =>
      createBackupBundle(state, options),
    [state]
  );

  const validateBackupJson = useCallback((raw: unknown) => validateAndPreviewBackup(raw), []);

  const importBackupJson = useCallback(
    async (bundle: ClearspaceBackupBundle, mode: ImportMode = 'merge'): Promise<ImportSummary> => {
      const summary = await persistOp(() => applyBackupImport(adapter, state, bundle, mode, LOCAL_USER_ID));
      const refreshed = await adapter.loadWorkspace(LOCAL_USER_ID);
      setState(refreshed);
      return summary;
    },
    [adapter, state, persistOp]
  );

  return (
    <DataContext.Provider
      value={{
        ...state,
        loadingData,
        syncStatus,
        storageEngine,
        pendingSyncCount,
        lastError,
        todayDate,
        isCloudSynced: false,
        clearError: () => setLastError(null),
        updateProfileData,
        updatePreferences,
        updateThemeSettings,
        saveArea,
        deleteArea,
        saveTask,
        toggleTaskComplete,
        deleteTask,
        saveScheduleBlock,
        toggleScheduleBlockComplete,
        deleteScheduleBlock,
        saveDailyTemplate,
        deleteDailyTemplate,
        saveStudySchedule,
        deleteStudySchedule,
        saveCalendarEvent,
        deleteCalendarEvent,
        saveCalendarMarker,
        saveGoal,
        deleteGoal,
        saveJournalEntry,
        deleteJournalEntry,
        savePulseCheck,
        deletePulseCheck,
        logFocusSession,
        deleteFocusSession,
        saveExpense,
        deleteExpense,
        saveIncome,
        deleteIncome,
        saveMonthlyReview,
        saveWeeklyReset,
        saveTimelineItem,
        deleteTimelineItem,
        updateCycleSettings,
        saveCycleRecord,
        deleteCycleRecord,
        saveCycleDailyLog,
        deleteCycleDailyLog,
        exportMooncycleJson,
        deleteAllMooncycleData,
        updateDashboardTrackerPrefs,
        saveCustomTracker,
        deleteCustomTracker,
        saveCustomTrackerEntry,
        deleteCustomTrackerEntry,
        saveTrackerGoal,
        deleteTrackerGoal,
        scanLegacyStorage,
        importLegacyBundle,
        clearLegacyLocalStorageKeys,
        exportBackupJson,
        validateBackupJson,
        importBackupJson,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
