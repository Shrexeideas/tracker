export type LegacyBuiltInThemeId =
  | 'strawberry-milk'
  | 'matcha-garden'
  | 'lavender-dreams'
  | 'peach-picnic'
  | 'seaside-diary'
  | 'moonlit-journal';

export type BuiltInThemeId =
  | LegacyBuiltInThemeId
  | 'nordic-paper'
  | 'executive-slate'
  | 'midnight-executive'
  | 'studio-pop'
  | 'obsidian-pulse'
  | 'terracotta-grove'
  | 'broadsheet-classic'
  | 'monochrome-ink'
  | 'monochrome-carbon'
  | 'fireside-espresso'
  | 'prism-studio';

export type ThemeId = BuiltInThemeId | (string & {});

export type ThemeStyleCategory =
  | 'minimal-clean'
  | 'professional-corporate'
  | 'playful-creative'
  | 'pastel-cute'
  | 'dark-futuristic'
  | 'earthy-natural'
  | 'editorial-classic'
  | 'monochrome'
  | 'warm-cosy'
  | 'vibrant-colourful';

export type ThemeFontId =
  | 'plus-jakarta'
  | 'dm-sans'
  | 'manrope'
  | 'outfit'
  | 'fraunces'
  | 'playfair'
  | 'lora'
  | 'jetbrains-mono'
  | 'space-mono'
  | 'system-ui';

export type ThemeFontSize = 'sm' | 'md' | 'lg';
export type ThemeFontWeight = 'light' | 'regular' | 'bold';
export type ThemeCornerStyle = 'sharp' | 'balanced' | 'rounded' | 'pill';
export type ThemeCardSpacing = 'compact' | 'comfortable' | 'spacious';
export type ThemeSidebarStyle = 'solid' | 'tinted' | 'glass' | 'minimal';
export type ThemeBorderStyle = 'hairline' | 'crisp' | 'dashed' | 'none';
export type ThemeShadowLevel = 'none' | 'soft' | 'elevated' | 'crisp-offset';
export type ThemeGradientLevel = 'none' | 'subtle' | 'vivid';
export type ThemeTextureType = 'none' | 'paper' | 'noise' | 'linen';
export type ThemePatternType = 'none' | 'dots' | 'grid' | 'diagonal';
export type ThemeMotionLevel = 'none' | 'subtle' | 'playful';
export type ThemeDecorationLevel = 'none' | 'minimal' | 'expressive';

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  accentSoft: string;
  accentInk: string;
  success: string;
  warning: string;
  danger: string;
  washi: string;
}

export interface ThemeTypography {
  fontPreset: 'editorial-serif' | 'modern-sans' | 'geometric-sans' | 'warm-humanist' | 'tech-mono' | 'system-clean' | 'custom';
  headingFont: ThemeFontId;
  bodyFont: ThemeFontId;
  fontSize: ThemeFontSize;
  fontWeight: ThemeFontWeight;
}

export interface ThemeLayout {
  cornerStyle: ThemeCornerStyle;
  cardSpacing: ThemeCardSpacing;
  density: 'compact' | 'spacious';
  sidebarStyle: ThemeSidebarStyle;
  borderStyle: ThemeBorderStyle;
}

export interface ThemeEffects {
  shadows: ThemeShadowLevel;
  gradients: ThemeGradientLevel;
  texture: ThemeTextureType;
  pattern: ThemePatternType;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  category: ThemeStyleCategory;
  builtIn: boolean;
  isDark: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  effects: ThemeEffects;
  motion: ThemeMotionLevel;
  decorations: ThemeDecorationLevel;
  swatches: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeOverrides {
  isDark?: boolean;
  colors?: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  layout?: Partial<ThemeLayout>;
  effects?: Partial<ThemeEffects>;
  motion?: ThemeMotionLevel;
  decorations?: ThemeDecorationLevel;
}

export type LifeDomain = 'study' | 'career' | 'projects' | 'personal' | 'creative' | 'rest';

export type PriorityLevel = 'low' | 'medium' | 'high';

export type CheckInPeriod = 'morning' | 'afternoon' | 'evening';

export type NavSectionId =
  | 'dashboard'
  | 'my-day'
  | 'pulse'
  | 'tasks'
  | 'study'
  | 'calendar'
  | 'focus'
  | 'money'
  | 'goals'
  | 'journal'
  | 'mooncycle'
  | 'trackers'
  | 'day-echo'
  | 'life-balance'
  | 'life-timeline'
  | 'weekly-reset'
  | 'monthly-review'
  | 'themes'
  | 'settings';

export interface SyncableRecordMeta {
  createdAt?: string | unknown;
  updatedAt?: string | unknown;
  version?: number;
  syncStatus?: 'local' | 'pending' | 'synced';
}

export interface UserProfile extends SyncableRecordMeta {
  userId: string;
  displayName: string;
  email: string;
  bio: string;
  avatarEmoji: string;
}

export interface UserPreferences extends SyncableRecordMeta {
  userId: string;
  timeFormat: '12h' | '24h';
  timezone: string;
  dayStartHour: number;
  dayEndHour: number;
  currency: string;
  weekStartsOn: 'sunday' | 'monday';
}

export interface ThemeSettings extends SyncableRecordMeta {
  userId: string;
  activeTheme: ThemeId;
  customAccent: string;
  decorativeStickers: boolean;
  compactMode: boolean;
  customThemes?: ThemeDefinition[];
  overrides?: ThemeOverrides;
}

export interface Area extends SyncableRecordMeta {
  id: string;
  userId: string;
  name: string;
  color: string;
  lifeDomain: LifeDomain;
}

export interface Task extends SyncableRecordMeta {
  id: string;
  userId: string;
  title: string;
  notes: string;
  areaId: string;
  areaName: string;
  priority: PriorityLevel;
  dueDate: string;
  dueTime: string;
  completed: boolean;
  completedAt: string;
  backlog: boolean;
}

export interface DailyScheduleBlock extends SyncableRecordMeta {
  id: string;
  userId: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: string;
  color: string;
  lifeDomain: LifeDomain;
  notes: string;
  completed: boolean;
  completedAt: string;
  priority: PriorityLevel;
  isBreak: boolean;
  isUnexpected: boolean;
  actualDurationMinutes: number;
  reminderMinutes: number;
  linkedTaskId: string;
  linkedStudyId: string;
  recurringWeekdays: number[];
}

export interface TemplateBlockItem {
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  color: string;
  lifeDomain: LifeDomain;
  priority: PriorityLevel;
  isBreak: boolean;
  notes: string;
}

export interface DailyTemplate extends SyncableRecordMeta {
  id: string;
  userId: string;
  name: string;
  blocks: TemplateBlockItem[];
}

export interface StudyTopic {
  id: string;
  title: string;
  completed: boolean;
}

export interface StudySchedule extends SyncableRecordMeta {
  id: string;
  userId: string;
  subject: string;
  moduleName: string;
  targetDate: string;
  topics: StudyTopic[];
  notes: string;
  completed: boolean;
  completedAt: string;
}

export interface CalendarEvent extends SyncableRecordMeta {
  id: string;
  userId: string;
  date: string;
  title: string;
  time: string;
  category: string;
  color: string;
  notes: string;
  completed: boolean;
}

export interface DoodleStroke {
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export interface CalendarMarker extends SyncableRecordMeta {
  id: string;
  userId: string;
  date: string;
  emoji: string;
  label: string;
  color: string;
  doodleStrokes: DoodleStroke[];
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string;
}

export interface Goal extends SyncableRecordMeta {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  targetDate: string;
  milestones: Milestone[];
  completed: boolean;
  completedAt: string;
}

export interface JournalEntry extends SyncableRecordMeta {
  id: string;
  userId: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
}

export interface PulseCheck extends SyncableRecordMeta {
  id: string;
  userId: string;
  date: string;
  period: CheckInPeriod;
  mood: string;
  energy: number;
  stress: number;
  motivation: number;
  note: string;
}

export interface FocusSession extends SyncableRecordMeta {
  id: string;
  userId: string;
  taskTitle: string;
  durationMinutes: number;
  mode: 'focus' | 'short-break' | 'long-break';
  date: string;
  completedAt: string;
}

export interface MoneyRecord extends SyncableRecordMeta {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  paymentMethod: string;
  date: string;
  notes: string;
}

export interface MonthlyReview extends SyncableRecordMeta {
  id: string;
  userId: string;
  monthKey: string;
  reflection: string;
  wins: string;
  lessons: string;
  focusNextMonth: string;
}

export interface WeeklyReset extends SyncableRecordMeta {
  id: string;
  userId: string;
  weekKey: string;
  wentWell: string;
  feltDifficult: string;
  postponedNotes: string;
  nextWeekGoals: string;
  removedFromPlan: string;
}

export interface LifeTimelineItem extends SyncableRecordMeta {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  category: string;
  sourceType: 'task' | 'goal' | 'study' | 'journal' | 'calendar' | 'schedule' | 'manual';
  sourceId: string;
}

// ============================================================
// MOONCYCLE — Private Period & Menstrual Cycle Tracker
// ============================================================

export type FlowIntensity = 'spotting' | 'light' | 'medium' | 'heavy';

export interface CycleRecord extends SyncableRecordMeta {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD or '' if ongoing/unknown
  defaultFlow: FlowIntensity;
  flowByDate: Record<string, FlowIntensity>;
  spottingDates: string[];
  notes: string;
}

export interface CycleDailyLog extends SyncableRecordMeta {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  flow: FlowIntensity | 'none';
  isSpotting: boolean;
  symptoms: string[];
  customSymptoms: string[];
  mood: string;
  energy: number; // 1..5
  painLevel: number; // 0..5
  sleepHours: number; // 0..24
  notes: string;
}

export interface CycleSettings extends SyncableRecordMeta {
  userId: string;
  predictionsEnabled: boolean; // OFF by default
  fertileWindowEnabled: boolean; // OFF by default
  pulseCheckBridgeEnabled: boolean; // OFF by default
  defaultCycleLength: number; // fallback reference only when opted in
  defaultPeriodLength: number;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  discreetReminderText: string;
  customSymptomCatalog: string[];
}

// ============================================================
// MY TRACKERS — Universal Custom Tracker Builder
// ============================================================

export type TrackerCategory = 'gym' | 'sports' | 'hobbies' | 'study' | 'wellness' | 'custom';

export type TrackerFrequency = 'daily' | 'weekly' | 'custom_days' | 'flexible';

export type TrackerFieldType =
  | 'number'
  | 'text'
  | 'checkbox'
  | 'rating5'
  | 'rating10'
  | 'duration'
  | 'datetime'
  | 'dropdown'
  | 'multiselect'
  | 'measurement'
  | 'checklist';

export interface TrackerFieldDefinition {
  id: string;
  label: string;
  type: TrackerFieldType;
  required?: boolean;
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
  archived?: boolean;
}

export interface TrackerChecklistItemValue {
  id: string;
  label: string;
  checked: boolean;
}

export interface CustomTracker extends SyncableRecordMeta {
  id: string;
  userId: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  category: TrackerCategory;
  customCategoryLabel: string;
  frequency: TrackerFrequency;
  customDays: number[]; // 0=Sun..6=Sat
  startDate: string;
  fields: TrackerFieldDefinition[];
  archived: boolean;
  showOnDashboard: boolean;
  pinned: boolean;
  isPrivate: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
}

export interface CustomTrackerEntry extends SyncableRecordMeta {
  id: string;
  userId: string;
  trackerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  values: Record<string, unknown>;
  notes: string;
  isRestDay: boolean;
  completed: boolean;
}

export type TrackerGoalPeriod = 'daily' | 'weekly' | 'monthly' | 'total';

export interface TrackerGoal extends SyncableRecordMeta {
  id: string;
  userId: string;
  trackerId: string;
  title: string;
  period: TrackerGoalPeriod;
  targetValue: number;
  unit: string;
  fieldId: string; // '' means count entries, otherwise sum numeric/duration/measurement field
  allowRestDays: boolean;
  restDayAllowancePerWeek: number;
  paused: boolean;
}

export interface DashboardTrackerPreferences extends SyncableRecordMeta {
  userId: string;
  showSection: boolean;
  hiddenTrackerIds: string[];
}

export interface ClearspaceBackupBundle {
  version: string;
  exportedAt: string;
  storageEngine?: string;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  themeSettings?: Partial<ThemeSettings>;
  areas: Area[];
  tasks: Task[];
  dailySchedules: DailyScheduleBlock[];
  dailyTemplates: DailyTemplate[];
  studySchedules: StudySchedule[];
  calendarEvents: CalendarEvent[];
  calendarMarkers: CalendarMarker[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  pulseChecks: PulseCheck[];
  focusSessions: FocusSession[];
  expenses: MoneyRecord[];
  incomes: MoneyRecord[];
  monthlyReviews: MonthlyReview[];
  weeklyResets: WeeklyReset[];
  lifeTimeline: LifeTimelineItem[];
  // Clearspace Local-First 3.1+ additions (optional for backward compatibility)
  cycleSettings?: Partial<CycleSettings>;
  cycleRecords?: CycleRecord[];
  cycleDailyLogs?: CycleDailyLog[];
  customTrackers?: CustomTracker[];
  customTrackerEntries?: CustomTrackerEntry[];
  trackerGoals?: TrackerGoal[];
  dashboardTrackerPrefs?: Partial<DashboardTrackerPreferences>;
}
