import { CycleDailyLog, CycleRecord, CycleSettings, FlowIntensity } from '../types/clearspace';
import { shiftDateString } from './logic';

export const PRESET_MOONCYCLE_SYMPTOMS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Fatigue',
  'Backache',
  'Tender',
  'Acne',
  'Nausea',
  'Cravings',
  'Brain fog',
  'Restless sleep',
  'Mood shifts',
];

export const MOONCYCLE_MOODS = [
  { id: 'calm', label: 'Calm', emoji: '🌸' },
  { id: 'gentle', label: 'Soft', emoji: '🌷' },
  { id: 'tired', label: 'Low energy', emoji: '🌙' },
  { id: 'sensitive', label: 'Sensitive', emoji: '🫧' },
  { id: 'irritable', label: 'Irritable', emoji: '🌩️' },
  { id: 'steady', label: 'Steady', emoji: '🌿' },
];

export function diffDateDays(startDate: string, endDate: string): number {
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = endDate.split('-').map(Number);
  const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

export function expandDateRange(startDate: string, endDate: string, maxDays = 14): string[] {
  if (!startDate) return [];
  if (!endDate || endDate < startDate) return [startDate];
  const span = Math.min(maxDays, diffDateDays(startDate, endDate) + 1);
  const dates: string[] = [];
  for (let i = 0; i < span; i++) {
    dates.push(shiftDateString(startDate, i));
  }
  return dates;
}

export interface CycleHistoryEntry {
  record: CycleRecord;
  periodDurationDays: number | null;
  cycleLengthDays: number | null;
}

export interface CycleInsightsSummary {
  totalCyclesLogged: number;
  history: CycleHistoryEntry[];
  averageCycleLength: number | null;
  averagePeriodLength: number | null;
  minCycleLength: number | null;
  maxCycleLength: number | null;
  latestCycleStart: string | null;
  currentCycleDay: number | null;
  hasEnoughHistoryForEstimate: boolean;
  estimatedNextWindow: {
    likelyStart: string;
    earliestStart: string;
    latestStart: string;
    estimatedEnd: string;
  } | null;
  estimatedFertileWindow: {
    startDate: string;
    endDate: string;
    estimatedOvulationDate: string;
  } | null;
  estimateDisclaimer: string;
}

export function computeCycleInsights(
  records: CycleRecord[],
  settings: CycleSettings,
  todayDate: string
): CycleInsightsSummary {
  const chronological = [...records]
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.startDate))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const cycleLengths: number[] = [];
  const periodLengths: number[] = [];
  const historyChronological: CycleHistoryEntry[] = chronological.map((rec, idx) => {
    let periodDurationDays: number | null = null;
    if (rec.endDate && rec.endDate >= rec.startDate) {
      const dur = diffDateDays(rec.startDate, rec.endDate) + 1;
      if (dur >= 1 && dur <= 21) {
        periodDurationDays = dur;
        periodLengths.push(dur);
      }
    }

    let cycleLengthDays: number | null = null;
    if (idx < chronological.length - 1) {
      const nextStart = chronological[idx + 1].startDate;
      const len = diffDateDays(rec.startDate, nextStart);
      if (len >= 15 && len <= 90) {
        cycleLengthDays = len;
        cycleLengths.push(len);
      }
    }

    return { record: rec, periodDurationDays, cycleLengthDays };
  });

  const averageCycleLength =
    cycleLengths.length > 0
      ? Math.round(cycleLengths.reduce((s, n) => s + n, 0) / cycleLengths.length)
      : null;

  const averagePeriodLength =
    periodLengths.length > 0
      ? Math.round(periodLengths.reduce((s, n) => s + n, 0) / periodLengths.length)
      : null;

  const minCycleLength = cycleLengths.length > 0 ? Math.min(...cycleLengths) : null;
  const maxCycleLength = cycleLengths.length > 0 ? Math.max(...cycleLengths) : null;

  const latest = chronological[chronological.length - 1];
  const latestCycleStart = latest ? latest.startDate : null;
  const currentCycleDay =
    latestCycleStart && todayDate >= latestCycleStart
      ? diffDateDays(latestCycleStart, todayDate) + 1
      : null;

  const hasEnoughHistoryForEstimate = cycleLengths.length >= 1 && chronological.length >= 2;

  let estimatedNextWindow: CycleInsightsSummary['estimatedNextWindow'] = null;
  let estimatedFertileWindow: CycleInsightsSummary['estimatedFertileWindow'] = null;
  let estimateDisclaimer =
    'Cycle estimates are off by default. Recorded logs are always kept separate from optional estimates.';

  if (settings.predictionsEnabled) {
    if (!hasEnoughHistoryForEstimate || !latestCycleStart || averageCycleLength === null) {
      estimateDisclaimer =
        'Estimates require at least 2 logged cycle start dates to reflect your own personal pattern.';
    } else {
      const expectedLen = averageCycleLength;
      const spread =
        minCycleLength !== null && maxCycleLength !== null
          ? Math.max(2, Math.min(6, Math.ceil((maxCycleLength - minCycleLength) / 2)))
          : 2;
      const estPeriodLen = averagePeriodLength ?? settings.defaultPeriodLength ?? 5;
      const likelyStart = shiftDateString(latestCycleStart, expectedLen);
      const earliestStart = shiftDateString(likelyStart, -spread);
      const latestStart = shiftDateString(likelyStart, spread);
      const estimatedEnd = shiftDateString(likelyStart, Math.max(0, estPeriodLen - 1));

      estimatedNextWindow = {
        likelyStart,
        earliestStart,
        latestStart,
        estimatedEnd,
      };

      if (settings.fertileWindowEnabled) {
        const estimatedOvulationDate = shiftDateString(likelyStart, -14);
        estimatedFertileWindow = {
          startDate: shiftDateString(estimatedOvulationDate, -5),
          endDate: shiftDateString(estimatedOvulationDate, 1),
          estimatedOvulationDate,
        };
      }

      estimateDisclaimer =
        'Optional statistical estimate based solely on your logged dates. Bodies vary naturally — never rely on estimates for medical or contraceptive decisions.';
    }
  }

  return {
    totalCyclesLogged: chronological.length,
    history: [...historyChronological].reverse(),
    averageCycleLength,
    averagePeriodLength,
    minCycleLength,
    maxCycleLength,
    latestCycleStart,
    currentCycleDay,
    hasEnoughHistoryForEstimate,
    estimatedNextWindow,
    estimatedFertileWindow,
    estimateDisclaimer,
  };
}

export interface MooncycleDayCellStatus {
  date: string;
  isConfirmedPeriod: boolean;
  flow?: FlowIntensity;
  isSpotting: boolean;
  isEstimatedPeriod: boolean;
  isEstimatedFertile: boolean;
  isEstimatedOvulation: boolean;
  dailyLog?: CycleDailyLog;
  recordId?: string;
}

export function buildMooncycleDayMap(
  records: CycleRecord[],
  dailyLogs: CycleDailyLog[],
  insights: CycleInsightsSummary
): Record<string, MooncycleDayCellStatus> {
  const map: Record<string, MooncycleDayCellStatus> = {};

  const ensure = (date: string): MooncycleDayCellStatus => {
    if (!map[date]) {
      map[date] = {
        date,
        isConfirmedPeriod: false,
        isSpotting: false,
        isEstimatedPeriod: false,
        isEstimatedFertile: false,
        isEstimatedOvulation: false,
      };
    }
    return map[date];
  };

  for (const rec of records) {
    const days = rec.endDate ? expandDateRange(rec.startDate, rec.endDate) : [rec.startDate];
    for (const d of days) {
      const cell = ensure(d);
      const dayFlow = rec.flowByDate?.[d] || rec.defaultFlow;
      if (dayFlow === 'spotting') {
        cell.isSpotting = true;
      } else {
        cell.isConfirmedPeriod = true;
      }
      cell.flow = dayFlow;
      cell.recordId = rec.id;
    }
    for (const sd of rec.spottingDates || []) {
      const cell = ensure(sd);
      cell.isSpotting = true;
      if (!cell.flow) cell.flow = 'spotting';
      cell.recordId = rec.id;
    }
  }

  for (const log of dailyLogs) {
    const cell = ensure(log.date);
    cell.dailyLog = log;
    if (log.isSpotting || log.flow === 'spotting') {
      cell.isSpotting = true;
      if (!cell.flow) cell.flow = 'spotting';
    } else if (log.flow && log.flow !== 'none') {
      cell.isConfirmedPeriod = true;
      cell.flow = log.flow;
    }
  }

  if (insights.estimatedNextWindow) {
    const estDays = expandDateRange(
      insights.estimatedNextWindow.likelyStart,
      insights.estimatedNextWindow.estimatedEnd
    );
    for (const d of estDays) {
      const cell = ensure(d);
      if (!cell.isConfirmedPeriod) {
        cell.isEstimatedPeriod = true;
      }
    }
  }

  if (insights.estimatedFertileWindow) {
    const fDays = expandDateRange(
      insights.estimatedFertileWindow.startDate,
      insights.estimatedFertileWindow.endDate
    );
    for (const d of fDays) {
      const cell = ensure(d);
      if (!cell.isConfirmedPeriod && !cell.isEstimatedPeriod) {
        cell.isEstimatedFertile = true;
        if (d === insights.estimatedFertileWindow.estimatedOvulationDate) {
          cell.isEstimatedOvulation = true;
        }
      }
    }
  }

  return map;
}
