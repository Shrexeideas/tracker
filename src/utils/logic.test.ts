import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDurationMinutes,
  computeDayEcho,
  computeLifeBalance,
  computeStudyProgress,
  findNextAvailableSlot,
  findOverlappingBlocks,
  formatDuration,
  formatTimeDisplay,
  generatePulseSuggestions,
  getBlocksForDate,
  getMissedBlocks,
  mergeWithoutDuplicates,
  scanLegacyLocalStorage,
  shiftDateString,
} from './logic';
import { Area, DailyScheduleBlock, PulseCheck, StudySchedule, Task } from '../types/clearspace';

const baseBlock = (overrides: Partial<DailyScheduleBlock>): DailyScheduleBlock => ({
  id: 'b1',
  userId: 'u1',
  date: '2026-11-18',
  title: 'Study DBMS',
  startTime: '09:00',
  endTime: '10:00',
  durationMinutes: 60,
  category: 'Study',
  color: '#4B7B4A',
  lifeDomain: 'study',
  notes: '',
  completed: false,
  completedAt: '',
  priority: 'medium',
  isBreak: false,
  isUnexpected: false,
  actualDurationMinutes: 0,
  reminderMinutes: 0,
  linkedTaskId: '',
  linkedStudyId: '',
  recurringWeekdays: [],
  ...overrides,
});

test('time duration and 12h/24h formatting', () => {
  assert.equal(calculateDurationMinutes('09:00', '10:15'), 75);
  assert.equal(formatDuration(75), '1h 15m');
  assert.equal(formatTimeDisplay('09:05', '12h'), '9:05 AM');
  assert.equal(formatTimeDisplay('14:30', '12h'), '2:30 PM');
  assert.equal(formatTimeDisplay('14:30', '24h'), '14:30');
});

test('date shifting and recurring weekday schedule projection', () => {
  assert.equal(shiftDateString('2026-11-18', 1), '2026-11-19');
  assert.equal(shiftDateString('2026-11-18', -1), '2026-11-17');

  // 2026-11-18 is Wednesday (weekday 3)
  const mondayTemplate = baseBlock({
    id: 'rec_1',
    date: '2026-11-16',
    recurringWeekdays: [1, 3],
    completed: true,
  });
  const wednesdayBlocks = getBlocksForDate([mondayTemplate], '2026-11-18');
  assert.equal(wednesdayBlocks.length, 1);
  assert.equal(wednesdayBlocks[0].completed, false);
  assert.equal(wednesdayBlocks[0].date, '2026-11-18');
});

test('overlap detection and next available slot discovery', () => {
  const existing = [
    baseBlock({ id: 'b1', startTime: '09:00', endTime: '10:00', durationMinutes: 60 }),
    baseBlock({ id: 'b2', startTime: '11:00', endTime: '12:00', durationMinutes: 60 }),
  ];

  const overlaps = findOverlappingBlocks(
    { date: '2026-11-18', startTime: '09:30', endTime: '10:30' },
    existing
  );
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].id, 'b1');

  const slot = findNextAvailableSlot(45, existing, 8, 22, 9 * 60 + 15);
  assert.deepEqual(slot, { startTime: '10:00', endTime: '10:45' });
});

test('missed blocks ignore breaks and completed blocks', () => {
  const blocks = [
    baseBlock({ id: 'b1', startTime: '08:00', endTime: '09:00', completed: false, isBreak: false }),
    baseBlock({ id: 'b2', startTime: '09:00', endTime: '09:15', completed: false, isBreak: true }),
    baseBlock({ id: 'b3', startTime: '09:15', endTime: '10:00', completed: true, isBreak: false }),
  ];
  const missed = getMissedBlocks(blocks, 11 * 60);
  assert.equal(missed.length, 1);
  assert.equal(missed[0].id, 'b1');
});

test('pulse check energy-aware suggestions respect low energy and high energy', () => {
  const lowCheck: PulseCheck = {
    id: 'p1',
    userId: 'u1',
    date: '2026-11-18',
    period: 'morning',
    mood: 'tired',
    energy: 1,
    stress: 4,
    motivation: 2,
    note: '',
  };
  const blocks = [
    baseBlock({ id: '1' }),
    baseBlock({ id: '2' }),
    baseBlock({ id: '3' }),
  ];
  const tasks: Task[] = [
    {
      id: 't1',
      userId: 'u1',
      title: 'Review notes',
      notes: '',
      areaId: 'a1',
      areaName: 'Study',
      priority: 'low',
      dueDate: '2026-11-18',
      dueTime: '',
      completed: false,
      completedAt: '',
      backlog: false,
    },
  ];
  const suggestions = generatePulseSuggestions([lowCheck], blocks, tasks);
  assert.ok(suggestions.some((s) => s.actionType === 'add-break'));
  assert.ok(suggestions.some((s) => s.actionType === 'reduce-load'));
  assert.ok(suggestions.some((s) => s.actionType === 'light-start'));
});

test('day echo and life balance calculate planned vs actual accurately', () => {
  const blocks = [
    baseBlock({ id: 'b1', durationMinutes: 60, completed: true, actualDurationMinutes: 75, lifeDomain: 'study' }),
    baseBlock({ id: 'b2', durationMinutes: 30, completed: false, lifeDomain: 'projects' }),
    baseBlock({ id: 'b3', durationMinutes: 20, completed: true, isUnexpected: true, lifeDomain: 'personal' }),
  ];
  const echo = computeDayEcho('2026-11-18', blocks, []);
  assert.equal(echo.plannedBlocks.length, 2);
  assert.equal(echo.completedBlocks.length, 2);
  assert.equal(echo.postponedBlocks.length, 1);
  assert.equal(echo.longerThanExpected.length, 1);
  assert.equal(echo.unexpectedBlocks.length, 1);
  assert.equal(echo.plannedMinutes, 90);
  assert.equal(echo.completedMinutes, 95);

  const areas: Area[] = [];
  const balance = computeLifeBalance(blocks, areas);
  const studyRow = balance.find((r) => r.domain === 'study')!;
  assert.equal(studyRow.plannedMinutes, 60);
  assert.equal(studyRow.actualMinutes, 75);
});

test('study progress calculates covered topics and whole-row completion', () => {
  const study: StudySchedule = {
    id: 's1',
    userId: 'u1',
    subject: 'DBMS',
    moduleName: 'Indexing',
    targetDate: '2026-11-20',
    topics: [
      { id: 't1', title: 'B-Trees', completed: true },
      { id: 't2', title: 'Hashing', completed: false },
    ],
    notes: '',
    completed: false,
    completedAt: '',
  };
  assert.deepEqual(computeStudyProgress(study), { coveredCount: 1, totalCount: 2, percent: 50 });
  assert.deepEqual(computeStudyProgress({ ...study, completed: true }), { coveredCount: 1, totalCount: 2, percent: 100 });
});

test('legacy localStorage scan and duplicate prevention merge', () => {
  const report = scanLegacyLocalStorage({
    clearspace_tasks: JSON.stringify([{ id: 't1', title: 'Old task' }, { id: 't2', title: 'Second task' }]),
    clearspace_theme: 'matcha-garden',
  });
  assert.equal(report.foundKeys.length, 2);
  assert.equal(report.counts.tasks, 2);

  const merged = mergeWithoutDuplicates<{ id: string; title: string }>(
    [{ id: 't1', title: 'Old task' }],
    (report.bundle.tasks || []) as { id: string; title: string }[]
  );
  assert.equal(merged.addedCount, 1);
  assert.equal(merged.skippedCount, 1);
  assert.equal(merged.merged.length, 2);
});
