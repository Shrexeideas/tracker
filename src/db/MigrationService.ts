import { ClearspaceBackupBundle } from '../types/clearspace';
import { LegacyScanReport, scanLegacyLocalStorage } from '../utils/logic';
import { applyBackupImport, validateAndPreviewBackup } from './BackupService';
import { DatabaseAdapter, WorkspaceSnapshot } from './types';

export const LEGACY_WORKSPACE_KEY = 'clearspace_3_local_workspace_v1';
const MIGRATION_META_KEY = 'migrated_v1_workspace';

export interface AutoMigrationResult {
  migrated: boolean;
  addedCount: number;
  skippedCount: number;
}

export class MigrationService {
  /**
   * Automatically imports any pre-existing Clearspace 3.0 localStorage workspace
   * (`clearspace_3_local_workspace_v1`) into IndexedDB once on upgrade without duplicates
   * and without deleting the source localStorage key.
   */
  static async autoMigrateWorkspaceV1(
    adapter: DatabaseAdapter,
    storageMap?: Record<string, string | null>
  ): Promise<AutoMigrationResult> {
    const alreadyDone = await adapter.getMeta<{ completed: boolean }>(MIGRATION_META_KEY);
    if (alreadyDone?.completed) {
      return { migrated: false, addedCount: 0, skippedCount: 0 };
    }

    const raw =
      storageMap !== undefined
        ? storageMap[LEGACY_WORKSPACE_KEY]
        : typeof window !== 'undefined'
          ? window.localStorage.getItem(LEGACY_WORKSPACE_KEY)
          : null;

    if (!raw) {
      await adapter.setMeta(MIGRATION_META_KEY, { completed: true, at: new Date().toISOString(), hadData: false }, false);
      return { migrated: false, addedCount: 0, skippedCount: 0 };
    }

    const validation = validateAndPreviewBackup(raw);
    if (!validation.valid || !validation.bundle) {
      return { migrated: false, addedCount: 0, skippedCount: 0 };
    }

    const currentSnapshot = await adapter.loadWorkspace('local_user');
    const summary = await applyBackupImport(adapter, currentSnapshot, validation.bundle, 'merge');
    await adapter.setMeta(
      MIGRATION_META_KEY,
      { completed: true, at: new Date().toISOString(), hadData: true, added: summary.added },
      false
    );
    return { migrated: true, addedCount: summary.added, skippedCount: summary.skipped };
  }

  static scanLegacyStorage(storageMap?: Record<string, string | null>): LegacyScanReport {
    const rawMap: Record<string, string | null> = storageMap ? { ...storageMap } : {};
    if (!storageMap && typeof window !== 'undefined') {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) rawMap[key] = window.localStorage.getItem(key);
      }
    }

    const report = scanLegacyLocalStorage(rawMap);
    // Also detect clearspace_3_local_workspace_v1 if present so user can re-check or clean it up manually
    const wsRaw = rawMap[LEGACY_WORKSPACE_KEY];
    if (wsRaw) {
      try {
        const parsed = JSON.parse(wsRaw) as Partial<WorkspaceSnapshot>;
        const mergeArr = <T,>(target: T[], incoming?: T[]) => {
          if (Array.isArray(incoming)) target.push(...incoming);
        };
        mergeArr(report.bundle.areas!, parsed.areas);
        mergeArr(report.bundle.tasks!, parsed.tasks);
        mergeArr(report.bundle.dailySchedules!, parsed.dailySchedules);
        mergeArr(report.bundle.dailyTemplates!, parsed.dailyTemplates);
        mergeArr(report.bundle.studySchedules!, parsed.studySchedules);
        mergeArr(report.bundle.calendarEvents!, parsed.calendarEvents);
        mergeArr(report.bundle.calendarMarkers!, parsed.calendarMarkers);
        mergeArr(report.bundle.goals!, parsed.goals);
        mergeArr(report.bundle.journalEntries!, parsed.journalEntries);
        mergeArr(report.bundle.pulseChecks!, parsed.pulseChecks);
        mergeArr(report.bundle.focusSessions!, parsed.focusSessions);
        mergeArr(report.bundle.expenses!, parsed.expenses);
        mergeArr(report.bundle.incomes!, parsed.incomes);
        mergeArr(report.bundle.monthlyReviews!, parsed.monthlyReviews);
        mergeArr(report.bundle.weeklyResets!, parsed.weeklyResets);
        mergeArr(report.bundle.lifeTimeline!, parsed.lifeTimeline);
        if (parsed.themeSettings) report.bundle.themeSettings = parsed.themeSettings;
        if (parsed.preferences) report.bundle.preferences = parsed.preferences;
        report.foundKeys.push(LEGACY_WORKSPACE_KEY);
        report.counts = {
          tasks: report.bundle.tasks!.length,
          areas: report.bundle.areas!.length,
          studySchedules: report.bundle.studySchedules!.length,
          calendarMarkers: report.bundle.calendarMarkers!.length,
          calendarEvents: report.bundle.calendarEvents!.length,
          goals: report.bundle.goals!.length,
          journalEntries: report.bundle.journalEntries!.length,
          pulseChecks: report.bundle.pulseChecks!.length,
          focusSessions: report.bundle.focusSessions!.length,
          expenses: report.bundle.expenses!.length,
          incomes: report.bundle.incomes!.length,
          dailySchedules: report.bundle.dailySchedules!.length,
          hasThemeOrPrefs: Boolean(report.bundle.themeSettings || report.bundle.preferences),
        };
      } catch {
        // Ignore malformed JSON
      }
    }

    return report;
  }

  static async importLegacyBundle(
    adapter: DatabaseAdapter,
    currentSnapshot: WorkspaceSnapshot,
    bundle: Partial<ClearspaceBackupBundle>
  ) {
    const validation = validateAndPreviewBackup(bundle);
    if (!validation.bundle) {
      return { added: 0, skipped: 0, details: ['No recognized records found in legacy bundle.'], mode: 'merge' as const };
    }
    return applyBackupImport(adapter, currentSnapshot, validation.bundle, 'merge');
  }
}
