import {
  Area,
  ClearspaceBackupBundle,
  DailyScheduleBlock,
  Goal,
  LifeDomain,
  PulseCheck,
  StudySchedule,
  Task,
} from '../types/clearspace';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function generateId(prefix = 'cs'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function getDateStringInTimezone(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fallback to local ISO date if timezone string is invalid
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMinutesInTimezone(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? date.getHours());
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? date.getMinutes());
    return (hour === 24 ? 0 : hour) * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

export function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getWeekdayFromDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hStr, mStr] = (timeStr || '00:00').split(':');
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return h * 60 + m;
}

export function minutesToTime24(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return Math.max(0, end - start);
}

export function formatTimeDisplay(time24: string, format: '12h' | '24h'): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const mm = String(m).padStart(2, '0');
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${mm}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getBlocksForDate(blocks: DailyScheduleBlock[], dateStr: string): DailyScheduleBlock[] {
  const targetWeekday = getWeekdayFromDateString(dateStr);
  const seenIds = new Set<string>();
  const result: DailyScheduleBlock[] = [];

  for (const b of blocks) {
    if (b.date === dateStr) {
      seenIds.add(b.id);
      result.push(b);
    }
  }

  for (const b of blocks) {
    if (
      b.date !== dateStr &&
      b.date < dateStr &&
      Array.isArray(b.recurringWeekdays) &&
      b.recurringWeekdays.includes(targetWeekday) &&
      !seenIds.has(b.id)
    ) {
      result.push({
        ...b,
        date: dateStr,
        completed: false,
        completedAt: '',
      });
    }
  }

  return result.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

export function findOverlappingBlocks(
  candidate: { startTime: string; endTime: string; date: string; id?: string },
  existingBlocks: DailyScheduleBlock[]
): DailyScheduleBlock[] {
  const cStart = parseTimeToMinutes(candidate.startTime);
  const cEnd = parseTimeToMinutes(candidate.endTime);
  if (cEnd <= cStart) return [];

  return existingBlocks.filter((b) => {
    if (candidate.id && b.id === candidate.id) return false;
    if (b.date !== candidate.date) return false;
    const bStart = parseTimeToMinutes(b.startTime);
    const bEnd = parseTimeToMinutes(b.endTime);
    return cStart < bEnd && cEnd > bStart;
  });
}

export function findNextAvailableSlot(
  durationMinutes: number,
  existingBlocks: DailyScheduleBlock[],
  dayStartHour: number,
  dayEndHour: number,
  afterMinutes: number
): { startTime: string; endTime: string } | null {
  const dur = Math.max(15, durationMinutes);
  const dayStart = Math.max(dayStartHour * 60, Math.ceil(afterMinutes / 15) * 15);
  const dayEnd = dayEndHour * 60;

  const sorted = [...existingBlocks]
    .map((b) => ({
      start: parseTimeToMinutes(b.startTime),
      end: parseTimeToMinutes(b.endTime),
    }))
    .sort((a, b) => a.start - b.start);

  let cursor = dayStart;
  for (const slot of sorted) {
    if (slot.end <= cursor) continue;
    if (cursor + dur <= slot.start) {
      return {
        startTime: minutesToTime24(cursor),
        endTime: minutesToTime24(cursor + dur),
      };
    }
    cursor = Math.max(cursor, slot.end);
  }

  if (cursor + dur <= dayEnd) {
    return {
      startTime: minutesToTime24(cursor),
      endTime: minutesToTime24(cursor + dur),
    };
  }
  return null;
}

export function getMissedBlocks(
  blocksForToday: DailyScheduleBlock[],
  currentMinutes: number
): DailyScheduleBlock[] {
  return blocksForToday.filter(
    (b) => !b.completed && !b.isBreak && parseTimeToMinutes(b.endTime) < currentMinutes
  );
}

export function splitTaskTitleIntoSubtasks(title: string): string[] {
  const clean = title.trim();
  if (!clean) return ['Define first small step', 'Complete core work', 'Review & wrap up'];
  return [
    `${clean} — Prepare & outline (15m)`,
    `${clean} — Focused first pass`,
    `${clean} — Final review & finish`,
  ];
}

export interface PulseSuggestion {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionType: 'add-break' | 'add-deep-work' | 'light-start' | 'reduce-load';
  suggestedMinutes: number;
}

export function generatePulseSuggestions(
  todayChecks: PulseCheck[],
  todayBlocks: DailyScheduleBlock[],
  todayTasks: Task[]
): PulseSuggestion[] {
  if (todayChecks.length === 0) return [];
  const latest = [...todayChecks].sort((a, b) => {
    const order = { morning: 1, afternoon: 2, evening: 3 };
    return order[b.period] - order[a.period];
  })[0];

  const suggestions: PulseSuggestion[] = [];
  const pendingBlocks = todayBlocks.filter((b) => !b.completed && !b.isBreak);
  const pendingTasks = todayTasks.filter((t) => !t.completed);

  if (latest.energy <= 2) {
    suggestions.push({
      id: 'low-energy-break',
      title: 'Gentle pace for low energy',
      description: 'Energy looks low today. Adding a 15-minute restorative break or tackling a light task first may help you ease in.',
      actionLabel: 'Add 15m rest break',
      actionType: 'add-break',
      suggestedMinutes: 15,
    });
  }

  if (latest.stress >= 4 && pendingBlocks.length >= 3) {
    suggestions.push({
      id: 'high-stress-trim',
      title: 'Ease your schedule load',
      description: 'Stress feels elevated while several work blocks remain. Consider moving one lower-priority block to tomorrow.',
      actionLabel: 'Review schedule load',
      actionType: 'reduce-load',
      suggestedMinutes: 30,
    });
  }

  if (latest.energy >= 4 && latest.stress <= 3) {
    suggestions.push({
      id: 'high-energy-deep-work',
      title: 'Great window for deep work',
      description: 'Your energy is high and calm right now. Would you like to reserve a focused 60-minute deep-work block?',
      actionLabel: 'Add 60m deep-work block',
      actionType: 'add-deep-work',
      suggestedMinutes: 60,
    });
  }

  if (latest.motivation <= 2 && pendingTasks.length > 0) {
    const smallTask = pendingTasks.find((t) => t.priority === 'low') || pendingTasks[0];
    suggestions.push({
      id: 'low-motivation-starter',
      title: 'Start with one small win',
      description: `Low motivation is normal—try scheduling a short 20-minute starter block for "${smallTask.title}".`,
      actionLabel: 'Schedule 20m starter block',
      actionType: 'light-start',
      suggestedMinutes: 20,
    });
  }

  return suggestions;
}

export interface DayEchoSummary {
  date: string;
  plannedBlocks: DailyScheduleBlock[];
  completedBlocks: DailyScheduleBlock[];
  postponedBlocks: DailyScheduleBlock[];
  longerThanExpected: DailyScheduleBlock[];
  unexpectedBlocks: DailyScheduleBlock[];
  plannedMinutes: number;
  completedMinutes: number;
  tasksCompletedCount: number;
  gentleMessage: string;
}

export function computeDayEcho(
  dateStr: string,
  blocksForDate: DailyScheduleBlock[],
  tasks: Task[]
): DayEchoSummary {
  const workBlocks = blocksForDate.filter((b) => !b.isBreak);
  const plannedBlocks = workBlocks.filter((b) => !b.isUnexpected);
  const completedBlocks = workBlocks.filter((b) => b.completed);
  const postponedBlocks = plannedBlocks.filter((b) => !b.completed);
  const unexpectedBlocks = workBlocks.filter((b) => b.isUnexpected);
  const longerThanExpected = completedBlocks.filter(
    (b) => b.actualDurationMinutes > 0 && b.actualDurationMinutes > b.durationMinutes
  );

  const plannedMinutes = plannedBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);
  const completedMinutes = completedBlocks.reduce(
    (sum, b) => sum + (b.actualDurationMinutes > 0 ? b.actualDurationMinutes : b.durationMinutes),
    0
  );

  const tasksCompletedCount = tasks.filter(
    (t) => t.completed && t.completedAt && t.completedAt.startsWith(dateStr)
  ).length;

  let gentleMessage = 'Every step counts, whether planned or discovered along the way.';
  if (plannedBlocks.length === 0 && unexpectedBlocks.length === 0) {
    gentleMessage = 'No schedule blocks were logged for this day yet. Plan lightly or reflect freely.';
  } else if (completedBlocks.length === plannedBlocks.length && plannedBlocks.length > 0) {
    gentleMessage = 'You followed through on your planned flow today—take a moment to appreciate your effort.';
  } else if (postponedBlocks.length > 0) {
    gentleMessage = 'Plans shift naturally. Unfinished items are simply clues about your energy and priorities—carry only what still matters.';
  }

  return {
    date: dateStr,
    plannedBlocks,
    completedBlocks,
    postponedBlocks,
    longerThanExpected,
    unexpectedBlocks,
    plannedMinutes,
    completedMinutes,
    tasksCompletedCount,
    gentleMessage,
  };
}

export interface DomainBalanceRow {
  domain: LifeDomain;
  label: string;
  plannedMinutes: number;
  actualMinutes: number;
  sharePercent: number;
}

const DOMAIN_LABELS: Record<LifeDomain, string> = {
  study: 'Study',
  career: 'Career',
  projects: 'Projects',
  personal: 'Personal',
  creative: 'Creative',
  rest: 'Rest & Breaks',
};

export function computeLifeBalance(blocks: DailyScheduleBlock[], areas: Area[]): DomainBalanceRow[] {
  const areaDomainMap = new Map<string, LifeDomain>();
  for (const area of areas) {
    areaDomainMap.set(area.name.toLowerCase(), area.lifeDomain);
  }

  const totals: Record<LifeDomain, { planned: number; actual: number }> = {
    study: { planned: 0, actual: 0 },
    career: { planned: 0, actual: 0 },
    projects: { planned: 0, actual: 0 },
    personal: { planned: 0, actual: 0 },
    creative: { planned: 0, actual: 0 },
    rest: { planned: 0, actual: 0 },
  };

  for (const b of blocks) {
    const domain: LifeDomain = b.isBreak
      ? 'rest'
      : b.lifeDomain || areaDomainMap.get((b.category || '').toLowerCase()) || 'personal';
    totals[domain].planned += b.durationMinutes;
    if (b.completed) {
      totals[domain].actual += b.actualDurationMinutes > 0 ? b.actualDurationMinutes : b.durationMinutes;
    }
  }

  const grandActual = Object.values(totals).reduce((s, v) => s + v.actual, 0);

  return (Object.keys(DOMAIN_LABELS) as LifeDomain[]).map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    plannedMinutes: totals[domain].planned,
    actualMinutes: totals[domain].actual,
    sharePercent: grandActual > 0 ? Math.round((totals[domain].actual / grandActual) * 100) : 0,
  }));
}

export function computeStudyProgress(study: StudySchedule): {
  coveredCount: number;
  totalCount: number;
  percent: number;
} {
  const totalCount = study.topics.length;
  if (totalCount === 0) {
    return {
      coveredCount: study.completed ? 1 : 0,
      totalCount: 0,
      percent: study.completed ? 100 : 0,
    };
  }
  const coveredCount = study.topics.filter((t) => t.completed).length;
  const percent = study.completed ? 100 : Math.round((coveredCount / totalCount) * 100);
  return { coveredCount, totalCount, percent };
}

export function computeGoalProgress(goal: Goal): number {
  if (goal.completed) return 100;
  if (goal.milestones.length === 0) return 0;
  const done = goal.milestones.filter((m) => m.completed).length;
  return Math.round((done / goal.milestones.length) * 100);
}

export interface LegacyScanReport {
  foundKeys: string[];
  counts: {
    tasks: number;
    areas: number;
    studySchedules: number;
    calendarMarkers: number;
    calendarEvents: number;
    goals: number;
    journalEntries: number;
    pulseChecks: number;
    focusSessions: number;
    expenses: number;
    incomes: number;
    dailySchedules: number;
    hasThemeOrPrefs: boolean;
  };
  bundle: Partial<ClearspaceBackupBundle>;
}

const KNOWN_LEGACY_PREFIXES = ['clearspace', 'cs_', 'cs-'];

export function scanLegacyLocalStorage(storage: Record<string, string | null>): LegacyScanReport {
  const foundKeys: string[] = [];
  const bundle: Partial<ClearspaceBackupBundle> = {
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
  };

  for (const [key, raw] of Object.entries(storage)) {
    if (!raw) continue;
    const lower = key.toLowerCase();
    if (!KNOWN_LEGACY_PREFIXES.some((p) => lower.includes(p))) continue;
    if (lower === 'clearspace_3_local_workspace_v1') continue; // Current workspace key handled separately
    foundKeys.push(key);

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (Array.isArray(parsed.tasks)) bundle.tasks!.push(...parsed.tasks);
        if (Array.isArray(parsed.areas)) bundle.areas!.push(...parsed.areas);
        if (Array.isArray(parsed.categories)) bundle.areas!.push(...parsed.categories);
        if (Array.isArray(parsed.studySchedules)) bundle.studySchedules!.push(...parsed.studySchedules);
        if (Array.isArray(parsed.calendarMarkers)) bundle.calendarMarkers!.push(...parsed.calendarMarkers);
        if (Array.isArray(parsed.calendarEvents)) bundle.calendarEvents!.push(...parsed.calendarEvents);
        if (Array.isArray(parsed.goals)) bundle.goals!.push(...parsed.goals);
        if (Array.isArray(parsed.journalEntries)) bundle.journalEntries!.push(...parsed.journalEntries);
        if (Array.isArray(parsed.pulseChecks)) bundle.pulseChecks!.push(...parsed.pulseChecks);
        if (Array.isArray(parsed.focusSessions)) bundle.focusSessions!.push(...parsed.focusSessions);
        if (Array.isArray(parsed.expenses)) bundle.expenses!.push(...parsed.expenses);
        if (Array.isArray(parsed.incomes)) bundle.incomes!.push(...parsed.incomes);
        if (Array.isArray(parsed.dailySchedules)) bundle.dailySchedules!.push(...parsed.dailySchedules);
        if (parsed.themeSettings) bundle.themeSettings = parsed.themeSettings;
        if (parsed.theme && typeof parsed.theme === 'string') {
          bundle.themeSettings = { activeTheme: parsed.theme };
        }
        if (parsed.preferences) bundle.preferences = parsed.preferences;
      } else if (Array.isArray(parsed)) {
        if (lower.includes('task')) bundle.tasks!.push(...parsed);
        else if (lower.includes('area') || lower.includes('categor')) bundle.areas!.push(...parsed);
        else if (lower.includes('study')) bundle.studySchedules!.push(...parsed);
        else if (lower.includes('marker') || lower.includes('doodle')) bundle.calendarMarkers!.push(...parsed);
        else if (lower.includes('event')) bundle.calendarEvents!.push(...parsed);
        else if (lower.includes('goal')) bundle.goals!.push(...parsed);
        else if (lower.includes('journal')) bundle.journalEntries!.push(...parsed);
        else if (lower.includes('pulse')) bundle.pulseChecks!.push(...parsed);
        else if (lower.includes('focus')) bundle.focusSessions!.push(...parsed);
        else if (lower.includes('expense')) bundle.expenses!.push(...parsed);
        else if (lower.includes('income')) bundle.incomes!.push(...parsed);
        else if (lower.includes('schedule')) bundle.dailySchedules!.push(...parsed);
      } else if (typeof parsed === 'string' && lower.includes('theme')) {
        bundle.themeSettings = { activeTheme: parsed as any };
      }
    } catch {
      if (lower.includes('theme')) {
        bundle.themeSettings = { activeTheme: raw as any };
      }
    }
  }

  return {
    foundKeys,
    counts: {
      tasks: bundle.tasks!.length,
      areas: bundle.areas!.length,
      studySchedules: bundle.studySchedules!.length,
      calendarMarkers: bundle.calendarMarkers!.length,
      calendarEvents: bundle.calendarEvents!.length,
      goals: bundle.goals!.length,
      journalEntries: bundle.journalEntries!.length,
      pulseChecks: bundle.pulseChecks!.length,
      focusSessions: bundle.focusSessions!.length,
      expenses: bundle.expenses!.length,
      incomes: bundle.incomes!.length,
      dailySchedules: bundle.dailySchedules!.length,
      hasThemeOrPrefs: Boolean(bundle.themeSettings || bundle.preferences),
    },
    bundle,
  };
}

export function mergeWithoutDuplicates<T extends { id?: string }>(
  existing: T[],
  incoming: T[],
  fallbackKey?: (item: T) => string
): { merged: T[]; addedCount: number; skippedCount: number } {
  const seenIds = new Set(existing.map((e) => e.id).filter(Boolean) as string[]);
  const seenKeys = new Set(fallbackKey ? existing.map(fallbackKey) : []);
  const toAdd: T[] = [];
  let skippedCount = 0;

  for (const item of incoming) {
    const idDup = item.id ? seenIds.has(item.id) : false;
    const keyDup = fallbackKey ? seenKeys.has(fallbackKey(item)) : false;
    if (idDup || keyDup) {
      skippedCount++;
      continue;
    }
    if (item.id) seenIds.add(item.id);
    if (fallbackKey) seenKeys.add(fallbackKey(item));
    toAdd.push(item);
  }

  return {
    merged: [...existing, ...toAdd],
    addedCount: toAdd.length,
    skippedCount,
  };
}

export function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.slice(0, maxLen);
}

export function sanitizeId(id: string | undefined, prefix = 'cs'): string {
  const cleaned = (id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  return cleaned.length > 0 ? cleaned : generateId(prefix);
}
