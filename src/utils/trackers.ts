import {
  CustomTracker,
  CustomTrackerEntry,
  TrackerCategory,
  TrackerChecklistItemValue,
  TrackerFieldDefinition,
  TrackerFieldType,
  TrackerGoal,
} from '../types/clearspace';
import { generateId, shiftDateString } from './logic';
import { diffDateDays } from './mooncycle';

export interface TrackerTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  category: TrackerCategory;
  frequency: CustomTracker['frequency'];
  fields: Omit<TrackerFieldDefinition, 'id'>[];
  suggestedGoal?: {
    title: string;
    period: TrackerGoal['period'];
    targetValue: number;
    unit: string;
  };
}

export const TRACKER_TEMPLATES: TrackerTemplate[] = [
  {
    id: 'tpl_gym',
    name: 'Gym & Strength',
    description: 'Log lifts, sets, workout duration, energy and progressive overload.',
    emoji: '🏋️',
    color: '#C94D6D',
    category: 'gym',
    frequency: 'custom_days',
    fields: [
      { label: 'Focus area', type: 'dropdown', options: ['Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'Mobility'], required: true },
      { label: 'Duration', type: 'duration', unit: 'min', placeholder: '45' },
      { label: 'Top working weight', type: 'measurement', unit: 'kg', placeholder: '60' },
      { label: 'Sets completed', type: 'number', unit: 'sets', placeholder: '12' },
      { label: 'Warm-up & cool-down', type: 'checklist', options: ['Dynamic warm-up', 'Core finisher', 'Stretch'] },
      { label: 'Session feel', type: 'rating5' },
    ],
    suggestedGoal: { title: 'Weekly gym sessions', period: 'weekly', targetValue: 4, unit: 'sessions' },
  },
  {
    id: 'tpl_sports',
    name: 'Sports & Running',
    description: 'Track cricket nets, runs, matches, distance, skills, and recovery.',
    emoji: '🏏',
    color: '#4B7B4A',
    category: 'sports',
    frequency: 'weekly',
    fields: [
      { label: 'Session type', type: 'dropdown', options: ['Practice / Nets', 'Run / Conditioning', 'Match', 'Recovery'] },
      { label: 'Duration', type: 'duration', unit: 'min', placeholder: '60' },
      { label: 'Distance covered', type: 'measurement', unit: 'km', placeholder: '5' },
      { label: 'Skills focused', type: 'multiselect', options: ['Endurance', 'Footwork', 'Precision', 'Agility', 'Tactics'] },
      { label: 'Energy & sharpness', type: 'rating10' },
    ],
    suggestedGoal: { title: 'Training sessions / week', period: 'weekly', targetValue: 3, unit: 'sessions' },
  },
  {
    id: 'tpl_hobby',
    name: 'Hobbies & Craft',
    description: 'Sketching, guitar, reading, photography, or any joyful personal craft.',
    emoji: '🎨',
    color: '#6E54A3',
    category: 'hobbies',
    frequency: 'flexible',
    fields: [
      { label: 'Medium or focus', type: 'text', placeholder: 'Watercolor study, acoustic scales...' },
      { label: 'Time spent', type: 'duration', unit: 'min', placeholder: '30' },
      { label: 'Completed a piece / chapter', type: 'checkbox' },
      { label: 'Creative joy', type: 'rating5' },
    ],
    suggestedGoal: { title: 'Creative minutes / week', period: 'weekly', targetValue: 180, unit: 'min' },
  },
  {
    id: 'tpl_study',
    name: 'Deep Study & Languages',
    description: 'Track study sprints, flashcards, reading pages, and retention confidence.',
    emoji: '📚',
    color: '#2D6F95',
    category: 'study',
    frequency: 'daily',
    fields: [
      { label: 'Topic studied', type: 'text', required: true, placeholder: 'Chapter 4 / Vocabulary deck' },
      { label: 'Duration', type: 'duration', unit: 'min', placeholder: '40' },
      { label: 'Pages / problems solved', type: 'number', unit: 'items', placeholder: '15' },
      { label: 'Active recall done', type: 'checkbox' },
      { label: 'Comprehension', type: 'rating5' },
    ],
    suggestedGoal: { title: 'Daily study check-ins', period: 'weekly', targetValue: 5, unit: 'sessions' },
  },
  {
    id: 'tpl_custom',
    name: 'Blank Custom Tracker',
    description: 'Build your own schema from scratch using all 10+ field types.',
    emoji: '✨',
    color: '#C9633B',
    category: 'custom',
    frequency: 'flexible',
    fields: [
      { label: 'Completed', type: 'checkbox' },
      { label: 'Highlight note', type: 'text', placeholder: 'Quick note...' },
    ],
  },
];

export const FIELD_TYPE_META: { type: TrackerFieldType; label: string; hint: string }[] = [
  { type: 'number', label: 'Number', hint: 'Reps, pages, cups, count' },
  { type: 'text', label: 'Text', hint: 'Short note or topic' },
  { type: 'checkbox', label: 'Checkbox', hint: 'Done / Yes / No' },
  { type: 'rating5', label: 'Rating (1–5)', hint: 'Quick 5-point scale' },
  { type: 'rating10', label: 'Rating (1–10)', hint: 'Detailed 10-point scale' },
  { type: 'duration', label: 'Duration (min)', hint: 'Minutes spent' },
  { type: 'datetime', label: 'Date / Time', hint: 'Specific timestamp' },
  { type: 'dropdown', label: 'Dropdown', hint: 'Pick one option' },
  { type: 'multiselect', label: 'Multi-select', hint: 'Pick multiple tags' },
  { type: 'measurement', label: 'Measurement + Unit', hint: 'kg, km, ml, hrs...' },
  { type: 'checklist', label: 'Checklist', hint: 'Mini sub-items per log' },
];

export function instantiateTemplateFields(tpl: TrackerTemplate): TrackerFieldDefinition[] {
  return tpl.fields.map((f) => ({
    ...f,
    id: generateId('fld'),
  }));
}

/**
 * Updates tracker field definitions while keeping existing IDs intact and never silently wiping
 * historical entry values. Any removed field that has existing values in entries is marked archived
 * if `preserveRemovedInSchema` is true, or simply left accessible in historical entries via values map.
 */
export function safeUpdateTrackerFields(
  existingFields: TrackerFieldDefinition[],
  nextFields: TrackerFieldDefinition[]
): TrackerFieldDefinition[] {
  const nextIds = new Set(nextFields.map((f) => f.id));
  const preserved = nextFields.map((f) => ({ ...f, archived: false }));
  // Keep archived metadata for previously defined fields removed from active form so historical labels remain readable
  for (const old of existingFields) {
    if (!nextIds.has(old.id)) {
      preserved.push({ ...old, archived: true });
    }
  }
  return preserved;
}

export function extractNumericValue(val: unknown, fieldType: TrackerFieldType): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (fieldType === 'checkbox' && typeof val === 'boolean') {
    return val ? 1 : 0;
  }
  if (fieldType === 'checklist' && Array.isArray(val)) {
    return (val as TrackerChecklistItemValue[]).filter((x) => x.checked).length;
  }
  return null;
}

export interface TrackerFieldAggregation {
  field: TrackerFieldDefinition;
  count: number;
  sum: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  latestValue: unknown;
}

export interface TrackerGoalProgress {
  goal: TrackerGoal;
  currentValue: number;
  percent: number;
  remainingText: string;
}

export interface TrackerAnalyticsSummary {
  totalEntries: number;
  activeEntries: number;
  restDaysCount: number;
  weeklyCount: number;
  monthlyCount: number;
  totalDurationMinutes: number;
  gentleStreakDays: number;
  longestGentleStreakDays: number;
  fieldStats: TrackerFieldAggregation[];
  dailySeries: { date: string; count: number; durationMinutes: number; isRest: boolean }[];
  goalProgress: TrackerGoalProgress[];
  supportiveSummary: string;
}

export function computeTrackerAnalytics(
  tracker: CustomTracker,
  allEntries: CustomTrackerEntry[],
  goals: TrackerGoal[],
  todayDate: string,
  rangeDays: number | 'all' = 30
): TrackerAnalyticsSummary {
  const trackerEntries = allEntries
    .filter((e) => e.trackerId === tracker.id)
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));

  const cutoffDate =
    rangeDays === 'all' ? '0000-00-00' : shiftDateString(todayDate, -(Math.max(1, rangeDays) - 1));
  const scoped = trackerEntries.filter((e) => e.date >= cutoffDate && e.date <= todayDate);

  const weekStart = shiftDateString(todayDate, -6);
  const monthStart = `${todayDate.slice(0, 7)}-01`;

  const activeEntries = scoped.filter((e) => !e.isRestDay);
  const restDaysCount = scoped.filter((e) => e.isRestDay).length;
  const weeklyCount = trackerEntries.filter((e) => !e.isRestDay && e.date >= weekStart && e.date <= todayDate).length;
  const monthlyCount = trackerEntries.filter((e) => !e.isRestDay && e.date >= monthStart && e.date <= todayDate).length;

  // Duration calculation across duration fields
  const durationFieldIds = tracker.fields.filter((f) => f.type === 'duration').map((f) => f.id);
  let totalDurationMinutes = 0;
  for (const entry of activeEntries) {
    for (const fid of durationFieldIds) {
      const n = extractNumericValue(entry.values?.[fid], 'duration');
      if (n !== null && n > 0) totalDurationMinutes += n;
    }
  }

  // Gentle streak calculation: active days OR explicit rest days keep continuity;
  // for 'weekly' / 'flexible' trackers, consecutive weeks with >=1 log or rest day count smoothly,
  // and for 'daily' / 'custom_days', missing today doesn't break yesterday's streak yet.
  const entriesByDate = new Map<string, CustomTrackerEntry[]>();
  for (const e of trackerEntries) {
    const arr = entriesByDate.get(e.date) || [];
    arr.push(e);
    entriesByDate.set(e.date, arr);
  }

  let gentleStreakDays = 0;
  let longestGentleStreakDays = 0;

  if (tracker.frequency === 'daily' || tracker.frequency === 'custom_days') {
    const startCheck = entriesByDate.has(todayDate) ? todayDate : shiftDateString(todayDate, -1);
    let cursor = startCheck;
    for (let i = 0; i < 365; i++) {
      const dayList = entriesByDate.get(cursor);
      const weekday = new Date(`${cursor}T00:00:00Z`).getUTCDay();
      const isOffDay =
        tracker.frequency === 'custom_days' &&
        tracker.customDays.length > 0 &&
        !tracker.customDays.includes(weekday);

      if (dayList && dayList.length > 0) {
        gentleStreakDays++;
      } else if (isOffDay) {
        // Planned off-day preserves streak without inflating count unnecessarily
      } else {
        break;
      }
      cursor = shiftDateString(cursor, -1);
    }

    // Longest consecutive active/rest days span
    const sortedDates = Array.from(entriesByDate.keys()).sort();
    let run = 0;
    let prev = '';
    for (const d of sortedDates) {
      if (!prev || diffDateDays(prev, d) <= 1) {
        run++;
      } else {
        run = 1;
      }
      if (run > longestGentleStreakDays) longestGentleStreakDays = run;
      prev = d;
    }
  } else {
    // Weekly / flexible: count recent active logs across last 14 days as momentum days
    gentleStreakDays = trackerEntries.filter((e) => !e.isRestDay && e.date >= shiftDateString(todayDate, -13)).length;
    longestGentleStreakDays = trackerEntries.filter((e) => !e.isRestDay).length;
  }

  // Field-level aggregations
  const fieldStats: TrackerFieldAggregation[] = tracker.fields
    .filter((f) => !f.archived)
    .map((field) => {
      const nums: number[] = [];
      let latestValue: unknown = undefined;
      for (const entry of activeEntries) {
        if (entry.values && field.id in entry.values) {
          const v = entry.values[field.id];
          if (v !== undefined && v !== '' && v !== null) {
            latestValue = v;
          }
          const n = extractNumericValue(v, field.type);
          if (n !== null) nums.push(n);
        }
      }
      const sum = nums.reduce((s, n) => s + n, 0);
      return {
        field,
        count: nums.length,
        sum,
        avg: nums.length > 0 ? Number((sum / nums.length).toFixed(2)) : null,
        min: nums.length > 0 ? Math.min(...nums) : null,
        max: nums.length > 0 ? Math.max(...nums) : null,
        latestValue,
      };
    });

  // Daily chart series (up to last 14 days inside range or 30 days)
  const chartSpan = rangeDays === 'all' ? 14 : Math.min(14, rangeDays);
  const dailySeries: TrackerAnalyticsSummary['dailySeries'] = [];
  for (let i = chartSpan - 1; i >= 0; i--) {
    const d = shiftDateString(todayDate, -i);
    const list = entriesByDate.get(d) || [];
    const active = list.filter((e) => !e.isRestDay);
    let dur = 0;
    for (const entry of active) {
      for (const fid of durationFieldIds) {
        const n = extractNumericValue(entry.values?.[fid], 'duration');
        if (n !== null) dur += n;
      }
    }
    dailySeries.push({
      date: d,
      count: active.length,
      durationMinutes: dur,
      isRest: list.some((e) => e.isRestDay),
    });
  }

  // Goal progress calculations
  const trackerGoals = goals.filter((g) => g.trackerId === tracker.id && !g.paused);
  const goalProgress: TrackerGoalProgress[] = trackerGoals.map((goal) => {
    let relevant: CustomTrackerEntry[] = trackerEntries.filter((e) => !e.isRestDay);
    if (goal.period === 'daily') {
      relevant = relevant.filter((e) => e.date === todayDate);
    } else if (goal.period === 'weekly') {
      relevant = relevant.filter((e) => e.date >= weekStart && e.date <= todayDate);
    } else if (goal.period === 'monthly') {
      relevant = relevant.filter((e) => e.date >= monthStart && e.date <= todayDate);
    }

    let currentValue = 0;
    if (!goal.fieldId) {
      currentValue = relevant.length;
    } else {
      const targetField = tracker.fields.find((f) => f.id === goal.fieldId);
      for (const e of relevant) {
        const n = extractNumericValue(e.values?.[goal.fieldId], targetField?.type || 'number');
        if (n !== null) currentValue += n;
      }
    }

    const percent = Math.min(100, Math.round((currentValue / Math.max(0.1, goal.targetValue)) * 100));
    const remaining = Math.max(0, Number((goal.targetValue - currentValue).toFixed(1)));
    const remainingText =
      remaining <= 0
        ? 'Target met for this period'
        : `${remaining} ${goal.unit} to reach target`;

    return { goal, currentValue: Number(currentValue.toFixed(1)), percent, remainingText };
  });

  let supportiveSummary = 'Log your first session whenever you feel ready.';
  if (activeEntries.length > 0 && restDaysCount > 0) {
    supportiveSummary = `${activeEntries.length} active ${activeEntries.length === 1 ? 'entry' : 'entries'} and ${restDaysCount} intentional rest ${restDaysCount === 1 ? 'day' : 'days'} logged.`;
  } else if (activeEntries.length > 0) {
    supportiveSummary = `${activeEntries.length} ${activeEntries.length === 1 ? 'entry' : 'entries'} logged in this range. Steady progress builds naturally.`;
  } else if (restDaysCount > 0) {
    supportiveSummary = `Rest and recovery days logged (${restDaysCount}). Honouring your pace keeps habits sustainable.`;
  }

  return {
    totalEntries: scoped.length,
    activeEntries: activeEntries.length,
    restDaysCount,
    weeklyCount,
    monthlyCount,
    totalDurationMinutes,
    gentleStreakDays,
    longestGentleStreakDays,
    fieldStats,
    dailySeries,
    goalProgress,
    supportiveSummary,
  };
}
