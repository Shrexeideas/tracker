import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryLocalEngine } from './LocalDatabase';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { LEGACY_WORKSPACE_KEY, MigrationService } from './MigrationService';
import { applyBackupImport, createBackupBundle, validateAndPreviewBackup } from './BackupService';
import { Task } from '../types/clearspace';

test('IndexedDBAdapter persists CRUD records, stamps sync metadata, and queues sync entries', async () => {
  const adapter = new IndexedDBAdapter(new InMemoryLocalEngine());
  await adapter.init();

  const savedTask = await adapter.upsertRecord<Task>('tasks', {
    id: 'tsk_1',
    userId: 'local_user',
    title: 'Practice guitar',
    notes: '',
    areaId: '',
    areaName: 'Hobbies',
    priority: 'medium',
    dueDate: '2026-11-18',
    dueTime: '',
    completed: false,
    completedAt: '',
    backlog: false,
  });

  assert.equal(savedTask.version, 1);
  assert.ok(savedTask.createdAt);
  assert.ok(savedTask.updatedAt);

  const loaded = await adapter.loadWorkspace();
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].title, 'Practice guitar');

  const queue = await adapter.getSyncQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].storeName, 'tasks');
  assert.equal(queue[0].operation, 'upsert');

  await adapter.deleteRecord('tasks', 'tsk_1');
  const afterDelete = await adapter.loadWorkspace();
  assert.equal(afterDelete.tasks.length, 0);
});

test('MigrationService migrates v1 localStorage workspace once without duplicates', async () => {
  const adapter = new IndexedDBAdapter(new InMemoryLocalEngine());
  await adapter.init();

  const legacySnapshot = {
    tasks: [
      { id: 't_old_1', title: 'Read design patterns', priority: 'high', dueDate: '2026-11-18' },
    ],
    journalEntries: [{ id: 'j_old_1', date: '2026-11-18', title: 'Morning thoughts', content: 'Calm day' }],
    themeSettings: { activeTheme: 'matcha-garden' },
  };

  const storageMap = {
    [LEGACY_WORKSPACE_KEY]: JSON.stringify(legacySnapshot),
  };

  const first = await MigrationService.autoMigrateWorkspaceV1(adapter, storageMap);
  assert.equal(first.migrated, true);
  assert.equal(first.addedCount, 2);

  // Second run must be a no-op
  const second = await MigrationService.autoMigrateWorkspaceV1(adapter, storageMap);
  assert.equal(second.migrated, false);

  const loaded = await adapter.loadWorkspace();
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.journalEntries.length, 1);
  assert.equal(loaded.themeSettings.activeTheme, 'matcha-garden');
});

test('BackupService validates JSON, exports selectively, merges without duplicates, and supports replace', async () => {
  const adapter = new IndexedDBAdapter(new InMemoryLocalEngine());
  await adapter.init();

  await adapter.upsertRecord('cycleRecords', {
    id: 'cyc_1',
    userId: 'local_user',
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    defaultFlow: 'medium',
    flowByDate: {},
    spottingDates: [],
    notes: '',
  });
  await adapter.upsertRecord('customTrackers', {
    id: 'trk_1',
    userId: 'local_user',
    name: 'Running',
    description: '',
    emoji: '🏃',
    color: '#4B7B4A',
    category: 'sports',
    customCategoryLabel: '',
    frequency: 'weekly',
    customDays: [],
    startDate: '2026-11-01',
    fields: [],
    archived: false,
    showOnDashboard: true,
    pinned: true,
    isPrivate: false,
    reminderEnabled: false,
    reminderTime: '',
  });

  const snap = await adapter.loadWorkspace();
  const withoutMooncycle = createBackupBundle(snap, { includeMooncycle: false, includeTrackers: true });
  assert.equal(withoutMooncycle.cycleRecords, undefined);
  assert.equal(withoutMooncycle.customTrackers?.length, 1);

  const fullBundle = createBackupBundle(snap, { includeMooncycle: true, includeTrackers: true });
  const validation = validateAndPreviewBackup(JSON.stringify(fullBundle));
  assert.equal(validation.valid, true);
  assert.equal(validation.preview?.counts.cycleRecords, 1);
  assert.equal(validation.preview?.counts.customTrackers, 1);

  const invalid = validateAndPreviewBackup('{"notClearspace": true}');
  assert.equal(invalid.valid, false);

  // Merge same bundle again -> 0 added, duplicates skipped
  const mergeSummary = await applyBackupImport(adapter, snap, validation.bundle!, 'merge');
  assert.equal(mergeSummary.added, 0);
  assert.equal(mergeSummary.skipped, 2);

  // Replace with modified bundle
  const replaceBundle = {
    ...fullBundle,
    tasks: [{ id: 'tsk_new', userId: 'local_user', title: 'Replaced Task', notes: '', areaId: '', areaName: 'Work', priority: 'high' as const, dueDate: '2026-11-18', dueTime: '', completed: false, completedAt: '', backlog: false }],
    cycleRecords: [],
  };
  const replaceSummary = await applyBackupImport(adapter, snap, replaceBundle, 'replace');
  assert.equal(replaceSummary.mode, 'replace');
  const afterReplace = await adapter.loadWorkspace();
  assert.equal(afterReplace.tasks.length, 1);
  assert.equal(afterReplace.cycleRecords.length, 0);
});
