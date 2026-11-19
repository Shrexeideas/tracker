import { ClearspaceBackupBundle } from '../types/clearspace';
import { mergeWithoutDuplicates, sanitizeId } from '../utils/logic';
import {
  sanitizeMetaPayload,
  sanitizeRecordPayload,
  WorkspaceCollectionName,
} from '../utils/sanitizers';
import { createDefaultWorkspaceSnapshot } from './IndexedDBAdapter';
import {
  BackupExportOptions,
  BackupPreview,
  BackupValidationResult,
  DatabaseAdapter,
  ImportMode,
  WorkspaceSnapshot,
} from './types';

export interface ImportSummary {
  added: number;
  skipped: number;
  details: string[];
  mode: ImportMode;
}

const COLLECTION_DEDUP_KEYS: [WorkspaceCollectionName, ((item: any) => string) | undefined][] = [
  ['areas', (x) => (x.name || '').toLowerCase()],
  ['tasks', (x) => `${(x.title || '').toLowerCase()}|${x.dueDate || ''}`],
  ['dailySchedules', (x) => `${x.date}|${x.startTime}|${x.title}`],
  ['dailyTemplates', (x) => (x.name || '').toLowerCase()],
  ['studySchedules', (x) => `${x.subject}|${x.moduleName || ''}`],
  ['calendarEvents', (x) => `${x.date}|${x.title}`],
  ['calendarMarkers', (x) => x.date],
  ['goals', (x) => (x.title || '').toLowerCase()],
  ['journalEntries', (x) => `${x.date}|${x.title}`],
  ['pulseChecks', (x) => `${x.date}|${x.period}`],
  ['focusSessions', (x) => `${x.completedAt}|${x.taskTitle}`],
  ['expenses', (x) => `${x.date}|${x.title}|${x.amount}`],
  ['incomes', (x) => `${x.date}|${x.title}|${x.amount}`],
  ['monthlyReviews', (x) => x.monthKey],
  ['weeklyResets', (x) => x.weekKey],
  ['lifeTimeline', (x) => `${x.date}|${x.title}`],
  ['cycleRecords', (x) => `${x.startDate}|${x.endDate || ''}`],
  ['cycleDailyLogs', (x) => x.date],
  ['customTrackers', (x) => (x.name || '').toLowerCase()],
  ['customTrackerEntries', (x) => `${x.trackerId}|${x.date}|${x.time || ''}|${x.id || ''}`],
  ['trackerGoals', (x) => `${x.trackerId}|${(x.title || '').toLowerCase()}`],
];

export function createBackupBundle(
  snapshot: WorkspaceSnapshot,
  options: BackupExportOptions = { includeMooncycle: true, includeTrackers: true }
): ClearspaceBackupBundle {
  const bundle: ClearspaceBackupBundle = {
    version: '3.1.0',
    exportedAt: new Date().toISOString(),
    storageEngine: 'IndexedDB',
    profile: snapshot.profile,
    preferences: snapshot.preferences,
    themeSettings: snapshot.themeSettings,
    areas: snapshot.areas,
    tasks: snapshot.tasks,
    dailySchedules: snapshot.dailySchedules,
    dailyTemplates: snapshot.dailyTemplates,
    studySchedules: snapshot.studySchedules,
    calendarEvents: snapshot.calendarEvents,
    calendarMarkers: snapshot.calendarMarkers,
    goals: snapshot.goals,
    journalEntries: snapshot.journalEntries,
    pulseChecks: snapshot.pulseChecks,
    focusSessions: snapshot.focusSessions,
    expenses: snapshot.expenses,
    incomes: snapshot.incomes,
    monthlyReviews: snapshot.monthlyReviews,
    weeklyResets: snapshot.weeklyResets,
    lifeTimeline: snapshot.lifeTimeline,
  };

  if (options.includeMooncycle) {
    bundle.cycleSettings = snapshot.cycleSettings;
    bundle.cycleRecords = snapshot.cycleRecords;
    bundle.cycleDailyLogs = snapshot.cycleDailyLogs;
  }

  if (options.includeTrackers) {
    bundle.customTrackers = snapshot.customTrackers;
    bundle.customTrackerEntries = snapshot.customTrackerEntries;
    bundle.trackerGoals = snapshot.trackerGoals;
    bundle.dashboardTrackerPrefs = snapshot.dashboardTrackerPrefs;
  }

  return bundle;
}

export function createMooncycleBackupBundle(snapshot: WorkspaceSnapshot) {
  return {
    version: '3.1.0-mooncycle',
    exportedAt: new Date().toISOString(),
    module: 'mooncycle',
    cycleSettings: snapshot.cycleSettings,
    cycleRecords: snapshot.cycleRecords,
    cycleDailyLogs: snapshot.cycleDailyLogs,
  };
}

export function validateAndPreviewBackup(input: unknown): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let rawObj: any = input;
  if (typeof input === 'string') {
    try {
      rawObj = JSON.parse(input);
    } catch {
      return {
        valid: false,
        errors: ['Invalid JSON syntax. Please select a valid Clearspace JSON export file.'],
        warnings: [],
        preview: null,
        bundle: null,
      };
    }
  }

  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
    return {
      valid: false,
      errors: ['Backup payload must be a JSON object.'],
      warnings: [],
      preview: null,
      bundle: null,
    };
  }

  const recognizedArrayKeys: WorkspaceCollectionName[] = [
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

  const hasAnyArray = recognizedArrayKeys.some((k) => Array.isArray(rawObj[k]));
  const hasAnyMeta = Boolean(
    rawObj.profile ||
      rawObj.preferences ||
      rawObj.themeSettings ||
      rawObj.cycleSettings ||
      rawObj.dashboardTrackerPrefs
  );

  if (!hasAnyArray && !hasAnyMeta) {
    errors.push('This JSON file does not contain any recognized Clearspace collections or settings.');
    return { valid: false, errors, warnings, preview: null, bundle: null };
  }

  for (const key of recognizedArrayKeys) {
    if (key in rawObj && rawObj[key] !== undefined && !Array.isArray(rawObj[key])) {
      warnings.push(`Field "${key}" was not an array and will be skipped.`);
    }
  }

  const getArr = <T,>(k: WorkspaceCollectionName): T[] => (Array.isArray(rawObj[k]) ? rawObj[k] : []);

  const normalized: ClearspaceBackupBundle = {
    version: typeof rawObj.version === 'string' ? rawObj.version : 'legacy',
    exportedAt: typeof rawObj.exportedAt === 'string' ? rawObj.exportedAt : new Date().toISOString(),
    profile: rawObj.profile && typeof rawObj.profile === 'object' ? rawObj.profile : undefined,
    preferences: rawObj.preferences && typeof rawObj.preferences === 'object' ? rawObj.preferences : undefined,
    themeSettings: rawObj.themeSettings && typeof rawObj.themeSettings === 'object' ? rawObj.themeSettings : undefined,
    areas: getArr('areas'),
    tasks: getArr('tasks'),
    dailySchedules: getArr('dailySchedules'),
    dailyTemplates: getArr('dailyTemplates'),
    studySchedules: getArr('studySchedules'),
    calendarEvents: getArr('calendarEvents'),
    calendarMarkers: getArr('calendarMarkers'),
    goals: getArr('goals'),
    journalEntries: getArr('journalEntries'),
    pulseChecks: getArr('pulseChecks'),
    focusSessions: getArr('focusSessions'),
    expenses: getArr('expenses'),
    incomes: getArr('incomes'),
    monthlyReviews: getArr('monthlyReviews'),
    weeklyResets: getArr('weeklyResets'),
    lifeTimeline: getArr('lifeTimeline'),
    cycleSettings: rawObj.cycleSettings && typeof rawObj.cycleSettings === 'object' ? rawObj.cycleSettings : undefined,
    cycleRecords: getArr('cycleRecords'),
    cycleDailyLogs: getArr('cycleDailyLogs'),
    customTrackers: getArr('customTrackers'),
    customTrackerEntries: getArr('customTrackerEntries'),
    trackerGoals: getArr('trackerGoals'),
    dashboardTrackerPrefs:
      rawObj.dashboardTrackerPrefs && typeof rawObj.dashboardTrackerPrefs === 'object'
        ? rawObj.dashboardTrackerPrefs
        : undefined,
  };

  const counts: BackupPreview['counts'] = {
    areas: normalized.areas.length,
    tasks: normalized.tasks.length,
    dailySchedules: normalized.dailySchedules.length,
    dailyTemplates: normalized.dailyTemplates.length,
    studySchedules: normalized.studySchedules.length,
    calendarEvents: normalized.calendarEvents.length,
    calendarMarkers: normalized.calendarMarkers.length,
    goals: normalized.goals.length,
    journalEntries: normalized.journalEntries.length,
    pulseChecks: normalized.pulseChecks.length,
    focusSessions: normalized.focusSessions.length,
    expenses: normalized.expenses.length,
    incomes: normalized.incomes.length,
    monthlyReviews: normalized.monthlyReviews.length,
    weeklyResets: normalized.weeklyResets.length,
    lifeTimeline: normalized.lifeTimeline.length,
    cycleRecords: normalized.cycleRecords?.length || 0,
    cycleDailyLogs: normalized.cycleDailyLogs?.length || 0,
    customTrackers: normalized.customTrackers?.length || 0,
    customTrackerEntries: normalized.customTrackerEntries?.length || 0,
    trackerGoals: normalized.trackerGoals?.length || 0,
  };

  const totalRecords = Object.values(counts).reduce((s, n) => s + n, 0);
  if (totalRecords === 0 && !hasAnyMeta) {
    warnings.push('Backup file contains 0 data records.');
  }

  const sampleTitles: string[] = [];
  for (const t of normalized.tasks.slice(0, 2)) {
    if (t?.title) sampleTitles.push(`Task: ${t.title}`);
  }
  for (const j of normalized.journalEntries.slice(0, 2)) {
    if (j?.title) sampleTitles.push(`Journal: ${j.title}`);
  }
  for (const tr of (normalized.customTrackers || []).slice(0, 2)) {
    if (tr?.name) sampleTitles.push(`Tracker: ${tr.name}`);
  }
  if ((normalized.cycleRecords?.length || 0) > 0) {
    sampleTitles.push(`Mooncycle: ${normalized.cycleRecords!.length} cycle record(s)`);
  }

  const preview: BackupPreview = {
    version: normalized.version,
    exportedAt: normalized.exportedAt,
    counts,
    totalRecords,
    hasMooncycleData: counts.cycleRecords + counts.cycleDailyLogs > 0 || Boolean(normalized.cycleSettings),
    hasTrackerData:
      counts.customTrackers + counts.customTrackerEntries + counts.trackerGoals > 0 ||
      Boolean(normalized.dashboardTrackerPrefs),
    sampleTitles: sampleTitles.slice(0, 5),
  };

  return { valid: true, errors, warnings, preview, bundle: normalized };
}

export async function applyBackupImport(
  adapter: DatabaseAdapter,
  currentSnapshot: WorkspaceSnapshot,
  bundle: ClearspaceBackupBundle,
  mode: ImportMode = 'merge',
  userId = 'local_user'
): Promise<ImportSummary> {
  const details: string[] = [];
  let totalAdded = 0;
  let totalSkipped = 0;

  if (mode === 'replace') {
    const defaults = createDefaultWorkspaceSnapshot(userId);
    const nextSnapshot: WorkspaceSnapshot = {
      ...defaults,
      profile: bundle.profile
        ? (sanitizeMetaPayload('profile', userId, bundle.profile) as WorkspaceSnapshot['profile'])
        : currentSnapshot.profile,
      preferences: bundle.preferences
        ? (sanitizeMetaPayload('preferences', userId, bundle.preferences) as WorkspaceSnapshot['preferences'])
        : currentSnapshot.preferences,
      themeSettings: bundle.themeSettings
        ? (sanitizeMetaPayload('themeSettings', userId, bundle.themeSettings) as WorkspaceSnapshot['themeSettings'])
        : currentSnapshot.themeSettings,
      cycleSettings: bundle.cycleSettings
        ? (sanitizeMetaPayload('cycleSettings', userId, bundle.cycleSettings) as WorkspaceSnapshot['cycleSettings'])
        : defaults.cycleSettings,
      dashboardTrackerPrefs: bundle.dashboardTrackerPrefs
        ? (sanitizeMetaPayload(
            'dashboardTrackerPrefs',
            userId,
            bundle.dashboardTrackerPrefs
          ) as WorkspaceSnapshot['dashboardTrackerPrefs'])
        : defaults.dashboardTrackerPrefs,
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

    for (const [colName] of COLLECTION_DEDUP_KEYS) {
      const incoming = (bundle as unknown as Record<string, any[]>)[colName];
      if (!Array.isArray(incoming) || incoming.length === 0) continue;
      const sanitized = incoming.map((item) => {
        const safeId = sanitizeId(item?.id, colName.slice(0, 3));
        return sanitizeRecordPayload(colName, userId, { ...item, id: safeId });
      });
      (nextSnapshot as unknown as Record<string, any[]>)[colName] = sanitized;
      totalAdded += sanitized.length;
      details.push(`${colName}: ${sanitized.length} restored`);
    }

    await adapter.replaceWorkspace(nextSnapshot);
    return { added: totalAdded, skipped: 0, details, mode: 'replace' };
  }

  // Merge mode (duplicate-safe)
  for (const [colName, fallbackKey] of COLLECTION_DEDUP_KEYS) {
    const incoming = (bundle as unknown as Record<string, any[]>)[colName];
    if (!Array.isArray(incoming) || incoming.length === 0) continue;

    const currentArr = (currentSnapshot as unknown as Record<string, any[]>)[colName] || [];
    const prepared = incoming.map((item) => {
      const safeId = sanitizeId(item?.id, colName.slice(0, 3));
      return sanitizeRecordPayload(colName, userId, { ...item, id: safeId });
    });

    const { merged, addedCount, skippedCount } = mergeWithoutDuplicates(currentArr, prepared, fallbackKey);
    const addedItems = merged.slice(currentArr.length);
    if (addedItems.length > 0) {
      await adapter.bulkUpsert(colName, addedItems, true);
    }
    totalAdded += addedCount;
    totalSkipped += skippedCount;
    if (addedCount > 0 || skippedCount > 0) {
      details.push(`${colName}: +${addedCount} imported (${skippedCount} duplicates skipped)`);
    }
  }

  if (bundle.profile) {
    await adapter.setMeta('profile', sanitizeMetaPayload('profile', userId, { ...currentSnapshot.profile, ...bundle.profile }), true);
    details.push('Profile updated');
  }
  if (bundle.preferences) {
    await adapter.setMeta('preferences', sanitizeMetaPayload('preferences', userId, { ...currentSnapshot.preferences, ...bundle.preferences }), true);
    details.push('Preferences updated');
  }
  if (bundle.themeSettings) {
    await adapter.setMeta('themeSettings', sanitizeMetaPayload('themeSettings', userId, { ...currentSnapshot.themeSettings, ...bundle.themeSettings }), true);
    details.push('Theme settings updated');
  }
  if (bundle.cycleSettings) {
    await adapter.setMeta('cycleSettings', sanitizeMetaPayload('cycleSettings', userId, { ...currentSnapshot.cycleSettings, ...bundle.cycleSettings }), true);
    details.push('Mooncycle privacy settings updated');
  }
  if (bundle.dashboardTrackerPrefs) {
    await adapter.setMeta(
      'dashboardTrackerPrefs',
      sanitizeMetaPayload('dashboardTrackerPrefs', userId, {
        ...currentSnapshot.dashboardTrackerPrefs,
        ...bundle.dashboardTrackerPrefs,
      }),
      true
    );
    details.push('Dashboard tracker preferences updated');
  }

  return { added: totalAdded, skipped: totalSkipped, details, mode: 'merge' };
}
