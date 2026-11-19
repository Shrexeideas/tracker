import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMooncycleDayMap, computeCycleInsights } from './mooncycle';
import { CycleDailyLog, CycleRecord, CycleSettings } from '../types/clearspace';

const defaultSettings = (overrides: Partial<CycleSettings> = {}): CycleSettings => ({
  userId: 'local_user',
  predictionsEnabled: false,
  fertileWindowEnabled: false,
  pulseCheckBridgeEnabled: false,
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  reminderEnabled: false,
  reminderDaysBefore: 2,
  discreetReminderText: 'Self-care check-in upcoming',
  customSymptomCatalog: [],
  ...overrides,
});

const makeRecord = (id: string, startDate: string, endDate = ''): CycleRecord => ({
  id,
  userId: 'local_user',
  startDate,
  endDate,
  defaultFlow: 'medium',
  flowByDate: {},
  spottingDates: [],
  notes: '',
});

test('predictions stay disabled by default even with multiple logged cycles', () => {
  const records = [
    makeRecord('c1', '2026-09-01', '2026-09-05'),
    makeRecord('c2', '2026-09-29', '2026-10-03'),
    makeRecord('c3', '2026-10-27', '2026-10-31'),
  ];
  const insights = computeCycleInsights(records, defaultSettings(), '2026-11-18');
  assert.equal(insights.totalCyclesLogged, 3);
  assert.equal(insights.averageCycleLength, 28);
  assert.equal(insights.averagePeriodLength, 5);
  assert.equal(insights.estimatedNextWindow, null);
  assert.equal(insights.estimatedFertileWindow, null);
});

test('predictions refuse estimation when fewer than 2 cycle starts exist', () => {
  const records = [makeRecord('c1', '2026-11-01', '2026-11-05')];
  const insights = computeCycleInsights(
    records,
    defaultSettings({ predictionsEnabled: true, fertileWindowEnabled: true }),
    '2026-11-18'
  );
  assert.equal(insights.hasEnoughHistoryForEstimate, false);
  assert.equal(insights.estimatedNextWindow, null);
  assert.equal(insights.estimatedFertileWindow, null);
  assert.equal(insights.currentCycleDay, 18);
});

test('optional predictions and fertile window compute cleanly when enabled with 2+ cycles', () => {
  const records = [
    makeRecord('c1', '2026-09-01', '2026-09-05'),
    makeRecord('c2', '2026-09-30', '2026-10-04'),
    makeRecord('c3', '2026-10-29', '2026-11-02'),
  ];
  const insights = computeCycleInsights(
    records,
    defaultSettings({ predictionsEnabled: true, fertileWindowEnabled: false }),
    '2026-11-18'
  );
  assert.equal(insights.averageCycleLength, 29);
  assert.ok(insights.estimatedNextWindow);
  assert.equal(insights.estimatedNextWindow.likelyStart, '2026-11-27');
  assert.equal(insights.estimatedFertileWindow, null);

  const withFertile = computeCycleInsights(
    records,
    defaultSettings({ predictionsEnabled: true, fertileWindowEnabled: true }),
    '2026-11-18'
  );
  assert.ok(withFertile.estimatedFertileWindow);
  assert.equal(withFertile.estimatedFertileWindow.estimatedOvulationDate, '2026-11-13');

  const dayMap = buildMooncycleDayMap(records, [] as CycleDailyLog[], withFertile);
  assert.equal(dayMap['2026-10-29'].isConfirmedPeriod, true);
  assert.equal(dayMap['2026-11-27'].isEstimatedPeriod, true);
  assert.equal(dayMap['2026-11-13'].isEstimatedOvulation, true);
});
