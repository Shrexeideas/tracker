import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTrackerAnalytics,
  instantiateTemplateFields,
  safeUpdateTrackerFields,
  TRACKER_TEMPLATES,
} from './trackers';
import { CustomTracker, CustomTrackerEntry, TrackerGoal } from '../types/clearspace';

const makeTracker = (overrides: Partial<CustomTracker> = {}): CustomTracker => ({
  id: 'trk_1',
  userId: 'local_user',
  name: 'Gym Workout',
  description: '',
  emoji: '🏋️',
  color: '#C94D6D',
  category: 'gym',
  customCategoryLabel: '',
  frequency: 'daily',
  customDays: [],
  startDate: '2026-11-01',
  fields: [
    { id: 'f_dur', label: 'Duration', type: 'duration', unit: 'min' },
    { id: 'f_wt', label: 'Top Weight', type: 'measurement', unit: 'kg' },
    { id: 'f_rate', label: 'Feel', type: 'rating5' },
  ],
  archived: false,
  showOnDashboard: true,
  pinned: true,
  isPrivate: false,
  reminderEnabled: false,
  reminderTime: '',
  ...overrides,
});

test('template instantiation and safe field update preserve removed field metadata', () => {
  const fields = instantiateTemplateFields(TRACKER_TEMPLATES[0]);
  assert.ok(fields.length >= 4);
  assert.ok(fields.every((f) => f.id.startsWith('fld_')));

  const updated = safeUpdateTrackerFields(fields, fields.slice(0, 2));
  assert.equal(updated.length, fields.length);
  assert.equal(updated[0].archived, false);
  assert.equal(updated[2].archived, true);
});

test('tracker analytics computes duration, averages, gentle rest-day streak, and goal progress', () => {
  const tracker = makeTracker();
  const entries: CustomTrackerEntry[] = [
    {
      id: 'e1',
      userId: 'local_user',
      trackerId: 'trk_1',
      date: '2026-11-16',
      time: '07:30',
      values: { f_dur: 45, f_wt: 60, f_rate: 4 },
      notes: '',
      isRestDay: false,
      completed: true,
    },
    {
      id: 'e2',
      userId: 'local_user',
      trackerId: 'trk_1',
      date: '2026-11-17',
      time: '08:00',
      values: {},
      notes: 'Rest day',
      isRestDay: true,
      completed: true,
    },
    {
      id: 'e3',
      userId: 'local_user',
      trackerId: 'trk_1',
      date: '2026-11-18',
      time: '07:45',
      values: { f_dur: 60, f_wt: 65, f_rate: 5 },
      notes: '',
      isRestDay: false,
      completed: true,
    },
  ];
  const goals: TrackerGoal[] = [
    {
      id: 'g1',
      userId: 'local_user',
      trackerId: 'trk_1',
      title: 'Weekly workouts',
      period: 'weekly',
      targetValue: 4,
      unit: 'sessions',
      fieldId: '',
      allowRestDays: true,
      restDayAllowancePerWeek: 2,
      paused: false,
    },
  ];

  const stats = computeTrackerAnalytics(tracker, entries, goals, '2026-11-18', 30);
  assert.equal(stats.activeEntries, 2);
  assert.equal(stats.restDaysCount, 1);
  assert.equal(stats.totalDurationMinutes, 105);
  assert.equal(stats.gentleStreakDays, 3);
  assert.equal(stats.goalProgress[0].currentValue, 2);
  assert.equal(stats.goalProgress[0].percent, 50);

  const wtStat = stats.fieldStats.find((s) => s.field.id === 'f_wt')!;
  assert.equal(wtStat.avg, 62.5);
  assert.equal(wtStat.max, 65);
});
