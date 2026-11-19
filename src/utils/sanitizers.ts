import { clampString, sanitizeId } from './logic';
import { BUILTIN_THEME_IDS, sanitizeThemeDefinition } from './themeEngine';
import {
  Area,
  CalendarEvent,
  CalendarMarker,
  CycleDailyLog,
  CycleRecord,
  CycleSettings,
  CustomTracker,
  CustomTrackerEntry,
  DailyScheduleBlock,
  DailyTemplate,
  DashboardTrackerPreferences,
  FlowIntensity,
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
  TrackerFieldDefinition,
  TrackerGoal,
  UserPreferences,
  UserProfile,
  WeeklyReset,
} from '../types/clearspace';

export type WorkspaceCollectionName =
  | 'areas'
  | 'tasks'
  | 'dailySchedules'
  | 'dailyTemplates'
  | 'studySchedules'
  | 'calendarEvents'
  | 'calendarMarkers'
  | 'goals'
  | 'journalEntries'
  | 'pulseChecks'
  | 'focusSessions'
  | 'expenses'
  | 'incomes'
  | 'monthlyReviews'
  | 'weeklyResets'
  | 'lifeTimeline'
  | 'cycleRecords'
  | 'cycleDailyLogs'
  | 'customTrackers'
  | 'customTrackerEntries'
  | 'trackerGoals';

export type WorkspaceMetaName =
  | 'profile'
  | 'preferences'
  | 'themeSettings'
  | 'cycleSettings'
  | 'dashboardTrackerPrefs';

const VALID_DOMAINS = new Set(['study', 'career', 'projects', 'personal', 'creative', 'rest']);
const VALID_FLOWS = new Set<FlowIntensity>(['spotting', 'light', 'medium', 'heavy']);
const VALID_TRACKER_CATEGORIES = new Set(['gym', 'sports', 'hobbies', 'study', 'wellness', 'custom']);
const VALID_TRACKER_FREQ = new Set(['daily', 'weekly', 'custom_days', 'flexible']);
const VALID_FIELD_TYPES = new Set([
  'number',
  'text',
  'checkbox',
  'rating5',
  'rating10',
  'duration',
  'datetime',
  'dropdown',
  'multiselect',
  'measurement',
  'checklist',
]);

function safeDateString(val: unknown, fallback: string): string {
  const s = clampString(val, 16);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s.length >= 8 ? s : fallback;
}

export function stampSyncMeta<T extends Record<string, any>>(
  record: T,
  existing?: { createdAt?: unknown; version?: number }
): T & { createdAt: string; updatedAt: string; version: number; syncStatus: 'local' } {
  const now = new Date().toISOString();
  const createdAt =
    typeof existing?.createdAt === 'string' && existing.createdAt
      ? existing.createdAt
      : typeof record.createdAt === 'string' && record.createdAt
        ? record.createdAt
        : now;
  const prevVer = typeof existing?.version === 'number' ? existing.version : typeof record.version === 'number' ? record.version : 0;
  return {
    ...record,
    createdAt,
    updatedAt: now,
    version: prevVer + 1,
    syncStatus: 'local',
  };
}

export function sanitizeMetaPayload(metaName: WorkspaceMetaName, userId: string, raw: Record<string, any>) {
  const uid = sanitizeId(userId, 'usr');
  switch (metaName) {
    case 'profile':
      return {
        userId: uid,
        displayName: clampString(raw.displayName, 120, 'Clearspace Member') || 'Clearspace Member',
        email: clampString(raw.email, 200),
        bio: clampString(raw.bio, 500),
        avatarEmoji: clampString(raw.avatarEmoji, 16, '🌸') || '🌸',
      } as UserProfile;
    case 'preferences':
      return {
        userId: uid,
        timeFormat: raw.timeFormat === '24h' ? '24h' : '12h',
        timezone: clampString(raw.timezone, 64, 'Asia/Kolkata') || 'Asia/Kolkata',
        dayStartHour: Math.max(0, Math.min(23, Number(raw.dayStartHour ?? 7))),
        dayEndHour: Math.max(1, Math.min(24, Number(raw.dayEndHour ?? 22))),
        currency: clampString(raw.currency, 12, 'INR') || 'INR',
        weekStartsOn: raw.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
      } as UserPreferences;
    case 'themeSettings': {
      const customThemes = Array.isArray(raw.customThemes)
        ? raw.customThemes.slice(0, 40).map((t: any) => sanitizeThemeDefinition(t, false)).map((t) => ({ ...t, builtIn: false }))
        : [];
      const customIds = new Set(customThemes.map((t) => t.id));
      const requestedId = clampString(raw.activeTheme, 80, 'strawberry-milk') || 'strawberry-milk';
      const activeTheme = BUILTIN_THEME_IDS.has(requestedId) || customIds.has(requestedId) ? requestedId : 'strawberry-milk';
      const overrides =
        raw.overrides && typeof raw.overrides === 'object' && !Array.isArray(raw.overrides)
          ? raw.overrides
          : undefined;
      return {
        userId: uid,
        activeTheme,
        customAccent: clampString(raw.customAccent, 32),
        decorativeStickers: Boolean(raw.decorativeStickers ?? true),
        compactMode: Boolean(raw.compactMode ?? false),
        customThemes,
        overrides,
      } as ThemeSettings;
    }
    case 'cycleSettings':
      return {
        userId: uid,
        predictionsEnabled: Boolean(raw.predictionsEnabled ?? false), // OFF by default
        fertileWindowEnabled: Boolean(raw.fertileWindowEnabled ?? false), // OFF by default
        pulseCheckBridgeEnabled: Boolean(raw.pulseCheckBridgeEnabled ?? false), // OFF by default
        defaultCycleLength: Math.max(20, Math.min(45, Number(raw.defaultCycleLength ?? 28))),
        defaultPeriodLength: Math.max(2, Math.min(12, Number(raw.defaultPeriodLength ?? 5))),
        reminderEnabled: Boolean(raw.reminderEnabled ?? false),
        reminderDaysBefore: Math.max(0, Math.min(7, Number(raw.reminderDaysBefore ?? 2))),
        discreetReminderText:
          clampString(raw.discreetReminderText, 120, 'Self-care check-in upcoming') || 'Self-care check-in upcoming',
        customSymptomCatalog: Array.isArray(raw.customSymptomCatalog)
          ? raw.customSymptomCatalog.slice(0, 30).map((s: unknown) => clampString(s, 40)).filter(Boolean)
          : [],
      } as CycleSettings;
    case 'dashboardTrackerPrefs':
      return {
        userId: uid,
        showSection: Boolean(raw.showSection ?? true),
        hiddenTrackerIds: Array.isArray(raw.hiddenTrackerIds)
          ? raw.hiddenTrackerIds.slice(0, 100).map((id: unknown) => clampString(id, 128)).filter(Boolean)
          : [],
      } as DashboardTrackerPreferences;
  }
}

export function sanitizeFieldDefinitions(fields: unknown): TrackerFieldDefinition[] {
  if (!Array.isArray(fields)) return [];
  return fields.slice(0, 40).map((f: any, idx: number) => ({
    id: sanitizeId(f?.id, `fld${idx}`),
    label: clampString(f?.label, 80, `Field ${idx + 1}`) || `Field ${idx + 1}`,
    type: VALID_FIELD_TYPES.has(f?.type) ? f.type : 'text',
    required: Boolean(f?.required),
    unit: clampString(f?.unit, 24),
    options: Array.isArray(f?.options)
      ? f.options.slice(0, 30).map((o: unknown) => clampString(o, 60)).filter(Boolean)
      : [],
    min: typeof f?.min === 'number' && Number.isFinite(f.min) ? f.min : undefined,
    max: typeof f?.max === 'number' && Number.isFinite(f.max) ? f.max : undefined,
    placeholder: clampString(f?.placeholder, 100),
    archived: Boolean(f?.archived),
  }));
}

export function sanitizeRecordPayload(
  colName: WorkspaceCollectionName,
  userId: string,
  raw: Record<string, any>
): Record<string, any> {
  const id = sanitizeId(raw.id, colName.slice(0, 3));
  const uid = sanitizeId(userId, 'usr');
  const todayFallback = new Date().toISOString().slice(0, 10);

  switch (colName) {
    case 'areas':
      return {
        id,
        userId: uid,
        name: clampString(raw.name, 80, 'Personal') || 'Personal',
        color: clampString(raw.color, 32, '#C94D6D').length >= 3 ? clampString(raw.color, 32, '#C94D6D') : '#C94D6D',
        lifeDomain: VALID_DOMAINS.has(raw.lifeDomain) ? raw.lifeDomain : 'personal',
      } as Area;
    case 'tasks':
      return {
        id,
        userId: uid,
        title: clampString(raw.title, 240, 'Untitled task') || 'Untitled task',
        notes: clampString(raw.notes, 2000),
        areaId: clampString(raw.areaId, 128),
        areaName: clampString(raw.areaName, 80),
        priority: ['low', 'medium', 'high'].includes(raw.priority) ? raw.priority : 'medium',
        dueDate: clampString(raw.dueDate, 32),
        dueTime: clampString(raw.dueTime, 16),
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
        backlog: Boolean(raw.backlog),
      } as Task;
    case 'dailySchedules':
      return {
        id,
        userId: uid,
        date: safeDateString(raw.date, todayFallback),
        title: clampString(raw.title, 240, 'Scheduled block') || 'Scheduled block',
        startTime: clampString(raw.startTime, 16, '09:00').length >= 4 ? clampString(raw.startTime, 16, '09:00') : '09:00',
        endTime: clampString(raw.endTime, 16, '10:00').length >= 4 ? clampString(raw.endTime, 16, '10:00') : '10:00',
        durationMinutes: Math.max(5, Math.min(1440, Number(raw.durationMinutes || 60))),
        category: clampString(raw.category, 80, 'Personal') || 'Personal',
        color: clampString(raw.color, 32, '#C94D6D').length >= 3 ? clampString(raw.color, 32, '#C94D6D') : '#C94D6D',
        lifeDomain: VALID_DOMAINS.has(raw.lifeDomain) ? raw.lifeDomain : 'personal',
        notes: clampString(raw.notes, 1500),
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
        priority: ['low', 'medium', 'high'].includes(raw.priority) ? raw.priority : 'medium',
        isBreak: Boolean(raw.isBreak),
        isUnexpected: Boolean(raw.isUnexpected),
        actualDurationMinutes: Math.max(0, Math.min(1440, Number(raw.actualDurationMinutes || 0))),
        reminderMinutes: Math.max(0, Math.min(120, Number(raw.reminderMinutes || 0))),
        linkedTaskId: clampString(raw.linkedTaskId, 128),
        linkedStudyId: clampString(raw.linkedStudyId, 128),
        recurringWeekdays: Array.isArray(raw.recurringWeekdays) ? raw.recurringWeekdays.slice(0, 7) : [],
      } as DailyScheduleBlock;
    case 'dailyTemplates':
      return {
        id,
        userId: uid,
        name: clampString(raw.name, 120, 'Daily Routine') || 'Daily Routine',
        blocks: Array.isArray(raw.blocks) ? raw.blocks.slice(0, 40) : [],
      } as DailyTemplate;
    case 'studySchedules':
      return {
        id,
        userId: uid,
        subject: clampString(raw.subject, 140, 'Study Subject') || 'Study Subject',
        moduleName: clampString(raw.moduleName, 160),
        targetDate: clampString(raw.targetDate, 32),
        topics: Array.isArray(raw.topics) ? raw.topics.slice(0, 80) : [],
        notes: clampString(raw.notes, 2000),
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
      } as StudySchedule;
    case 'calendarEvents':
      return {
        id,
        userId: uid,
        date: safeDateString(raw.date, todayFallback),
        title: clampString(raw.title, 200, 'Event') || 'Event',
        time: clampString(raw.time, 16),
        category: clampString(raw.category, 80),
        color: clampString(raw.color, 32),
        notes: clampString(raw.notes, 1000),
        completed: Boolean(raw.completed),
      } as CalendarEvent;
    case 'calendarMarkers':
      return {
        id,
        userId: uid,
        date: safeDateString(raw.date, todayFallback),
        emoji: clampString(raw.emoji, 16),
        label: clampString(raw.label, 120),
        color: clampString(raw.color, 32),
        doodleStrokes: Array.isArray(raw.doodleStrokes) ? raw.doodleStrokes.slice(0, 120) : [],
      } as CalendarMarker;
    case 'goals':
      return {
        id,
        userId: uid,
        title: clampString(raw.title, 200, 'Personal Goal') || 'Personal Goal',
        description: clampString(raw.description, 1500),
        category: clampString(raw.category, 80),
        targetDate: clampString(raw.targetDate, 32),
        milestones: Array.isArray(raw.milestones) ? raw.milestones.slice(0, 50) : [],
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
      } as Goal;
    case 'journalEntries':
      return {
        id,
        userId: uid,
        date: safeDateString(raw.date, todayFallback),
        title: clampString(raw.title, 200, 'Daily Note') || 'Daily Note',
        content: clampString(raw.content, 10000, ' ') || ' ',
        mood: clampString(raw.mood, 32, 'calm') || 'calm',
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10).map((t: unknown) => clampString(t, 40)).filter(Boolean) : [],
      } as JournalEntry;
    case 'pulseChecks':
      return {
        id,
        userId: uid,
        date: safeDateString(raw.date, todayFallback),
        period: ['morning', 'afternoon', 'evening'].includes(raw.period) ? raw.period : 'morning',
        mood: clampString(raw.mood, 32, 'calm') || 'calm',
        energy: Math.max(1, Math.min(5, Number(raw.energy ?? 3))),
        stress: Math.max(1, Math.min(5, Number(raw.stress ?? 2))),
        motivation: Math.max(1, Math.min(5, Number(raw.motivation ?? 3))),
        note: clampString(raw.note, 1000),
      } as PulseCheck;
    case 'focusSessions':
      return {
        id,
        userId: uid,
        taskTitle: clampString(raw.taskTitle, 240, 'Focus Session') || 'Focus Session',
        durationMinutes: Math.max(1, Math.min(360, Number(raw.durationMinutes || 25))),
        mode: ['focus', 'short-break', 'long-break'].includes(raw.mode) ? raw.mode : 'focus',
        date: safeDateString(raw.date, todayFallback),
        completedAt: clampString(raw.completedAt, 64, new Date().toISOString()) || new Date().toISOString(),
      } as FocusSession;
    case 'expenses':
    case 'incomes':
      return {
        id,
        userId: uid,
        title: clampString(raw.title, 200, 'Entry') || 'Entry',
        amount: Math.max(0, Math.min(100000000, Number(raw.amount || 0))),
        category: clampString(raw.category, 80, 'General') || 'General',
        paymentMethod: clampString(raw.paymentMethod, 64, 'UPI') || 'UPI',
        date: safeDateString(raw.date, todayFallback),
        notes: clampString(raw.notes, 500),
      } as MoneyRecord;
    case 'monthlyReviews':
      return {
        id,
        userId: uid,
        monthKey: clampString(raw.monthKey, 12, todayFallback.slice(0, 7)).length >= 6
          ? clampString(raw.monthKey, 12, todayFallback.slice(0, 7))
          : todayFallback.slice(0, 7),
        reflection: clampString(raw.reflection, 5000),
        wins: clampString(raw.wins, 2000),
        lessons: clampString(raw.lessons, 2000),
        focusNextMonth: clampString(raw.focusNextMonth, 2000),
      } as MonthlyReview;
    case 'weeklyResets':
      return {
        id,
        userId: uid,
        weekKey: clampString(raw.weekKey, 16, `${todayFallback.slice(0, 7)}_W1`).length >= 6
          ? clampString(raw.weekKey, 16, `${todayFallback.slice(0, 7)}_W1`)
          : `${todayFallback.slice(0, 7)}_W1`,
        wentWell: clampString(raw.wentWell, 3000),
        feltDifficult: clampString(raw.feltDifficult, 3000),
        postponedNotes: clampString(raw.postponedNotes, 2000),
        nextWeekGoals: clampString(raw.nextWeekGoals, 2000),
        removedFromPlan: clampString(raw.removedFromPlan, 2000),
      } as WeeklyReset;
    case 'lifeTimeline':
      return {
        id,
        userId: uid,
        date: safeDateString(raw.date, todayFallback),
        title: clampString(raw.title, 240, 'Milestone') || 'Milestone',
        description: clampString(raw.description, 1000),
        category: clampString(raw.category, 80, 'Personal') || 'Personal',
        sourceType: ['task', 'goal', 'study', 'journal', 'calendar', 'schedule', 'manual'].includes(raw.sourceType)
          ? raw.sourceType
          : 'manual',
        sourceId: clampString(raw.sourceId, 128),
      } as LifeTimelineItem;
    case 'cycleRecords': {
      const flowByDate: Record<string, FlowIntensity> = {};
      if (raw.flowByDate && typeof raw.flowByDate === 'object') {
        for (const [k, v] of Object.entries(raw.flowByDate)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && VALID_FLOWS.has(v as FlowIntensity)) {
            flowByDate[k] = v as FlowIntensity;
          }
        }
      }
      return {
        id,
        userId: uid,
        startDate: safeDateString(raw.startDate, todayFallback),
        endDate: raw.endDate ? safeDateString(raw.endDate, '') : '',
        defaultFlow: VALID_FLOWS.has(raw.defaultFlow) ? raw.defaultFlow : 'medium',
        flowByDate,
        spottingDates: Array.isArray(raw.spottingDates)
          ? raw.spottingDates.filter((d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 31)
          : [],
        notes: clampString(raw.notes, 2000),
      } as CycleRecord;
    }
    case 'cycleDailyLogs':
      return {
        id,
        userId: uid,
        date: safeDateString(raw.date, todayFallback),
        flow: raw.flow === 'none' || VALID_FLOWS.has(raw.flow) ? raw.flow : 'none',
        isSpotting: Boolean(raw.isSpotting),
        symptoms: Array.isArray(raw.symptoms)
          ? raw.symptoms.slice(0, 30).map((s: unknown) => clampString(s, 50)).filter(Boolean)
          : [],
        customSymptoms: Array.isArray(raw.customSymptoms)
          ? raw.customSymptoms.slice(0, 20).map((s: unknown) => clampString(s, 50)).filter(Boolean)
          : [],
        mood: clampString(raw.mood, 40, 'calm') || 'calm',
        energy: Math.max(1, Math.min(5, Number(raw.energy ?? 3))),
        painLevel: Math.max(0, Math.min(5, Number(raw.painLevel ?? 0))),
        sleepHours: Math.max(0, Math.min(24, Number(raw.sleepHours ?? 7))),
        notes: clampString(raw.notes, 2000),
      } as CycleDailyLog;
    case 'customTrackers':
      return {
        id,
        userId: uid,
        name: clampString(raw.name, 120, 'Custom Tracker') || 'Custom Tracker',
        description: clampString(raw.description, 500),
        emoji: clampString(raw.emoji, 16, '✨') || '✨',
        color: clampString(raw.color, 32, '#C94D6D') || '#C94D6D',
        category: VALID_TRACKER_CATEGORIES.has(raw.category) ? raw.category : 'custom',
        customCategoryLabel: clampString(raw.customCategoryLabel, 60),
        frequency: VALID_TRACKER_FREQ.has(raw.frequency) ? raw.frequency : 'flexible',
        customDays: Array.isArray(raw.customDays)
          ? raw.customDays.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6).slice(0, 7)
          : [],
        startDate: safeDateString(raw.startDate, todayFallback),
        fields: sanitizeFieldDefinitions(raw.fields),
        archived: Boolean(raw.archived),
        showOnDashboard: Boolean(raw.showOnDashboard ?? true),
        pinned: Boolean(raw.pinned),
        isPrivate: Boolean(raw.isPrivate),
        reminderEnabled: Boolean(raw.reminderEnabled),
        reminderTime: clampString(raw.reminderTime, 16),
      } as CustomTracker;
    case 'customTrackerEntries':
      return {
        id,
        userId: uid,
        trackerId: sanitizeId(raw.trackerId, 'trk'),
        date: safeDateString(raw.date, todayFallback),
        time: clampString(raw.time, 16),
        values: raw.values && typeof raw.values === 'object' && !Array.isArray(raw.values) ? raw.values : {},
        notes: clampString(raw.notes, 2000),
        isRestDay: Boolean(raw.isRestDay),
        completed: Boolean(raw.completed ?? true),
      } as CustomTrackerEntry;
    case 'trackerGoals':
      return {
        id,
        userId: uid,
        trackerId: sanitizeId(raw.trackerId, 'trk'),
        title: clampString(raw.title, 140, 'Consistency goal') || 'Consistency goal',
        period: ['daily', 'weekly', 'monthly', 'total'].includes(raw.period) ? raw.period : 'weekly',
        targetValue: Math.max(0.1, Math.min(100000, Number(raw.targetValue || 3))),
        unit: clampString(raw.unit, 32, 'sessions') || 'sessions',
        fieldId: clampString(raw.fieldId, 128),
        allowRestDays: Boolean(raw.allowRestDays ?? true),
        restDayAllowancePerWeek: Math.max(0, Math.min(7, Number(raw.restDayAllowancePerWeek ?? 2))),
        paused: Boolean(raw.paused),
      } as TrackerGoal;
  }
}
