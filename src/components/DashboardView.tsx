import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { NavSectionId } from '../types/clearspace';
import {
  computeDayEcho,
  computeGoalProgress,
  computeStudyProgress,
  formatDuration,
  formatTimeDisplay,
  getBlocksForDate,
  getCurrentMinutesInTimezone,
} from '../utils/logic';
import { BotanicalAccent, CelestialAccent, WashiLabel } from './ScrapbookAccents';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  EyeOff,
  GraduationCap,
  LayoutGrid,
  Pin,
  Plus,
  Sun,
  Target,
  Wallet,
} from 'lucide-react';
import { computeTrackerAnalytics } from '../utils/trackers';

interface DashboardViewProps {
  onNavigate: (section: NavSectionId) => void;
  onOpenTracker?: (trackerId?: string) => void;
}

export function DashboardView({ onNavigate, onOpenTracker }: DashboardViewProps) {
  const {
    profile,
    preferences,
    themeSettings,
    todayDate,
    tasks,
    areas,
    dailySchedules,
    studySchedules,
    focusSessions,
    incomes,
    expenses,
    goals,
    pulseChecks,
    journalEntries,
    customTrackers,
    customTrackerEntries,
    trackerGoals,
    dashboardTrackerPrefs,
    saveTask,
    toggleTaskComplete,
    toggleScheduleBlockComplete,
    updateDashboardTrackerPrefs,
    saveCustomTrackerEntry,
  } = useData();

  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [quickAdding, setQuickAdding] = useState(false);
  const [trackerToast, setTrackerToast] = useState<string | null>(null);

  const currentMins = getCurrentMinutesInTimezone(new Date(), preferences.timezone);
  const greeting =
    currentMins < 12 * 60 ? 'Good morning' : currentMins < 17 * 60 ? 'Good afternoon' : 'Good evening';

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: preferences.timezone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return todayDate;
    }
  }, [preferences.timezone, todayDate]);

  const todayBlocks = useMemo(() => getBlocksForDate(dailySchedules, todayDate), [dailySchedules, todayDate]);
  const workBlocks = todayBlocks.filter((b) => !b.isBreak);
  const completedBlocksCount = workBlocks.filter((b) => b.completed).length;

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === todayDate || (!t.dueDate && !t.completed && !t.backlog)),
    [tasks, todayDate]
  );
  const remainingTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const totalItemsToday = workBlocks.length + todayTasks.length;
  const completedItemsToday = completedBlocksCount + todayTasks.filter((t) => t.completed).length;
  const progressPercent = totalItemsToday > 0 ? Math.round((completedItemsToday / totalItemsToday) * 100) : 0;

  const studyStats = useMemo(() => {
    if (studySchedules.length === 0) return { avgPercent: 0, total: 0, done: 0 };
    const totalPct = studySchedules.reduce((acc, s) => acc + computeStudyProgress(s).percent, 0);
    const done = studySchedules.filter((s) => s.completed).length;
    return { avgPercent: Math.round(totalPct / studySchedules.length), total: studySchedules.length, done };
  }, [studySchedules]);

  const todayFocusMinutes = useMemo(
    () =>
      focusSessions
        .filter((f) => f.date === todayDate && f.mode === 'focus')
        .reduce((sum, f) => sum + f.durationMinutes, 0),
    [focusSessions, todayDate]
  );

  const monthKey = todayDate.slice(0, 7);
  const monthlyFinance = useMemo(() => {
    const inc = incomes.filter((i) => i.date.startsWith(monthKey)).reduce((s, i) => s + i.amount, 0);
    const exp = expenses.filter((e) => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
    return { inc, exp, savings: inc - exp };
  }, [incomes, expenses, monthKey]);

  const activeGoals = useMemo(() => goals.filter((g) => !g.completed).slice(0, 3), [goals]);
  const todayChecks = useMemo(() => pulseChecks.filter((p) => p.date === todayDate), [pulseChecks, todayDate]);
  const latestPulse = todayChecks[todayChecks.length - 1];
  const todayEcho = useMemo(() => computeDayEcho(todayDate, todayBlocks, tasks), [todayDate, todayBlocks, tasks]);
  const latestJournal = useMemo(() => journalEntries.find((j) => j.date === todayDate), [journalEntries, todayDate]);

  const dashboardTrackers = useMemo(() => {
    const hiddenSet = new Set(dashboardTrackerPrefs.hiddenTrackerIds || []);
    return customTrackers
      .filter((t) => !t.archived && t.showOnDashboard && !t.isPrivate && !hiddenSet.has(t.id))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
  }, [customTrackers, dashboardTrackerPrefs.hiddenTrackerIds]);

  const isBrandNew =
    tasks.length === 0 &&
    dailySchedules.length === 0 &&
    studySchedules.length === 0 &&
    goals.length === 0 &&
    journalEntries.length === 0 &&
    customTrackers.length === 0;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setQuickAdding(true);
    try {
      await saveTask({
        title: quickTitle.trim(),
        notes: '',
        areaId: areas[0]?.id || '',
        areaName: areas[0]?.name || 'Personal',
        priority: quickPriority,
        dueDate: todayDate,
        dueTime: '',
        completed: false,
        completedAt: '',
        backlog: false,
      });
      setQuickTitle('');
    } finally {
      setQuickAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting & Today's Progress Hero */}
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {themeSettings.decorativeStickers && <WashiLabel>{formattedDate}</WashiLabel>}
              {!themeSettings.decorativeStickers && (
                <span className="text-xs font-medium" style={{ color: 'var(--cs-text-muted)' }}>
                  {formattedDate}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              {greeting}, {profile.displayName || 'friend'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
              {todayEcho.gentleMessage}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {themeSettings.decorativeStickers && <CelestialAccent className="w-6 h-6 hidden sm:block" />}
            <button
              type="button"
              onClick={() => onNavigate('my-day')}
              className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Sun className="w-4 h-4" />
              Open My Day
            </button>
          </div>
        </div>

        {/* Today's progress bar + Quick-add task */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 items-center">
          <div className="lg:col-span-5 cs-surface-muted rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span>Today&apos;s completion progress</span>
              <span className="font-mono-num font-semibold">{progressPercent}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%`, backgroundColor: 'var(--cs-accent)' }}
              />
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              <span className="tabular-nums">
                {completedItemsToday} of {totalItemsToday} planned items done
              </span>
              <span className="tabular-nums">
                {remainingTasks.length} {remainingTasks.length === 1 ? 'task' : 'tasks'} remaining
              </span>
            </div>
          </div>

          <form onSubmit={handleQuickAdd} className="lg:col-span-7 flex flex-wrap sm:flex-nowrap gap-2.5">
            <label htmlFor="dash-quick-task" className="sr-only">
              Quick add task
            </label>
            <input
              id="dash-quick-task"
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Quick-add a task for today..."
              className="cs-input w-full sm:w-auto sm:flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm"
            />
            <select
              aria-label="Quick task priority"
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="cs-input px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button
              type="submit"
              disabled={quickAdding || !quickTitle.trim()}
              className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add task
            </button>
          </form>
        </div>
      </section>

      {/* Welcome empty state for brand-new users */}
      {isBrandNew && (
        <section className="cs-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <BotanicalAccent className="w-5 h-5" />
              <h2 className="font-display text-xl font-semibold">Your Clearspace desk is fresh and ready</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
              Start by sketching today&apos;s hours in My Day, logging an energy check-in in Pulse Check, or importing
              your previous Clearspace data from Backup &amp; Settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('my-day')}
              className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              Plan My Day
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="cs-surface-muted px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              Import Local Data
            </button>
          </div>
        </section>
      )}

      {/* Main 2-column workspace: Today's Timeline Preview + Pulse & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Today's Timeline Preview + Remaining Tasks */}
        <div className="lg:col-span-7 space-y-6">
          <section className="cs-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Today&apos;s timeline preview</h2>
              <button
                type="button"
                onClick={() => onNavigate('my-day')}
                className="text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:underline whitespace-nowrap shrink-0"
                style={{ color: 'var(--cs-accent)' }}
              >
                Edit timeline <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayBlocks.length === 0 ? (
              <div className="cs-surface-muted rounded-2xl p-5 text-center space-y-3">
                <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
                  No time blocks scheduled for today yet.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('my-day')}
                  className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Build today&apos;s schedule
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayBlocks.slice(0, 6).map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 p-3 rounded-2xl cs-surface-muted transition-opacity"
                    style={{ opacity: block.completed ? 0.72 : 1 }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleScheduleBlockComplete(block)}
                      aria-label={`Mark ${block.title} as ${block.completed ? 'incomplete' : 'complete'}`}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                        block.completed ? 'animate-cs-check' : ''
                      }`}
                      style={{
                        borderColor: block.color || 'var(--cs-accent)',
                        backgroundColor: block.completed ? block.color || 'var(--cs-accent)' : 'transparent',
                        color: '#ffffff',
                      }}
                    >
                      {block.completed && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium truncate ${block.completed ? 'line-through' : ''}`}>
                        {block.title}
                      </div>
                      <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                        {formatTimeDisplay(block.startTime, preferences.timeFormat)} –{' '}
                        {formatTimeDisplay(block.endTime, preferences.timeFormat)} · {formatDuration(block.durationMinutes)} ·{' '}
                        {block.category}
                      </div>
                    </div>
                  </div>
                ))}
                {todayBlocks.length > 6 && (
                  <button
                    type="button"
                    onClick={() => onNavigate('my-day')}
                    className="text-xs font-medium underline cursor-pointer"
                    style={{ color: 'var(--cs-text-muted)' }}
                  >
                    View all {todayBlocks.length} blocks in My Day
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Tasks Remaining */}
          <section className="cs-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Tasks remaining</h2>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:underline whitespace-nowrap shrink-0"
                style={{ color: 'var(--cs-accent)' }}
              >
                Manage tasks <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {remainingTasks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
                All caught up! Add a task above whenever something comes to mind.
              </p>
            ) : (
              <div className="space-y-2">
                {remainingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl cs-surface-muted">
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task)}
                      aria-label={`Complete task ${task.title}`}
                      className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer"
                      style={{ borderColor: 'var(--cs-accent)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                        {task.areaName || 'Personal'} · {task.priority} priority
                        {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Pulse Check, Study, Focus, Money, Goals, Reflection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pulse Check Shortcut */}
          <section className="cs-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
                <h2 className="font-display text-lg font-semibold">Pulse Check</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('pulse')}
                className="cs-btn-primary px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
              >
                {latestPulse ? 'Update check-in' : 'Check in now'}
              </button>
            </div>
            {latestPulse ? (
              <div className="cs-surface-muted rounded-2xl p-3.5 text-sm space-y-1">
                <div className="font-medium capitalize">
                  {latestPulse.period} mood: {latestPulse.mood}
                </div>
                <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                  Energy {latestPulse.energy}/5 · Stress {latestPulse.stress}/5 · Motivation {latestPulse.motivation}/5
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
                Log how your energy and stress feel right now to receive gentle, optional schedule suggestions.
              </p>
            )}
          </section>

          {/* Study, Focus, Finance Compact Stats */}
          <section className="cs-card rounded-3xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('study')}
                className="cs-surface-muted rounded-2xl p-4 text-left space-y-1 cursor-pointer hover:opacity-90"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--cs-text-muted)' }}>
                  <GraduationCap className="w-3.5 h-3.5" /> Study progress
                </div>
                <div className="font-mono-num text-2xl font-semibold">{studyStats.avgPercent}%</div>
                <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  {studyStats.done}/{studyStats.total} modules done
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('focus')}
                className="cs-surface-muted rounded-2xl p-4 text-left space-y-1 cursor-pointer hover:opacity-90"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--cs-text-muted)' }}>
                  <Clock className="w-3.5 h-3.5" /> Focus today
                </div>
                <div className="font-mono-num text-2xl font-semibold">{formatDuration(todayFocusMinutes)}</div>
                <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  Open Pomodoro room
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('money')}
              className="w-full cs-surface-muted rounded-2xl p-4 text-left space-y-2 cursor-pointer hover:opacity-90"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--cs-text-muted)' }}>
                  <Wallet className="w-3.5 h-3.5" /> This month ({monthKey})
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--cs-accent)' }}>
                  Money Tracker →
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono-num">
                <div>
                  <div style={{ color: 'var(--cs-text-muted)' }}>Income</div>
                  <div className="font-semibold text-sm">
                    {preferences.currency} {monthlyFinance.inc.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--cs-text-muted)' }}>Expenses</div>
                  <div className="font-semibold text-sm">
                    {preferences.currency} {monthlyFinance.exp.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--cs-text-muted)' }}>Savings</div>
                  <div className="font-semibold text-sm">
                    {preferences.currency} {monthlyFinance.savings.toLocaleString()}
                  </div>
                </div>
              </div>
            </button>
          </section>

          {/* Current Goals */}
          <section className="cs-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
                <h2 className="font-display text-lg font-semibold">Current goals</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="text-xs font-semibold cursor-pointer hover:underline"
                style={{ color: 'var(--cs-accent)' }}
              >
                All goals →
              </button>
            </div>
            {activeGoals.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                No active goals yet. Set a gentle milestone in Goals.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeGoals.map((goal) => {
                  const pct = computeGoalProgress(goal);
                  return (
                    <div key={goal.id} className="cs-surface-muted rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs font-medium">
                        <span className="truncate">{goal.title}</span>
                        <span className="font-mono-num">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--cs-accent)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Gentle Daily Reflection */}
          <section className="cs-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
                <h2 className="font-display text-lg font-semibold">Gentle daily reflection</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(latestJournal ? 'journal' : 'day-echo')}
                className="text-xs font-semibold cursor-pointer hover:underline"
                style={{ color: 'var(--cs-accent)' }}
              >
                {latestJournal ? 'Open Journal' : 'Open Day Echo'}
              </button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
              {latestJournal
                ? `"${latestJournal.title}" — ${latestJournal.content.slice(0, 120)}${latestJournal.content.length > 120 ? '...' : ''}`
                : 'Take two quiet minutes this evening to compare your plan with reality in Day Echo or jot down a journal note.'}
            </p>
          </section>
        </div>
      </div>

      {/* Optional My Trackers Dashboard Section */}
      {dashboardTrackerPrefs.showSection ? (
        <section className="cs-card rounded-3xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
              <h2 className="font-display text-xl font-semibold">My Trackers</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {dashboardTrackerPrefs.hiddenTrackerIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateDashboardTrackerPrefs({ hiddenTrackerIds: [] })}
                  className="text-xs underline cursor-pointer"
                  style={{ color: 'var(--cs-text-muted)' }}
                >
                  Restore hidden ({dashboardTrackerPrefs.hiddenTrackerIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => updateDashboardTrackerPrefs({ showSection: false })}
                className="text-xs cursor-pointer hover:underline"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                Hide section
              </button>
              <button
                type="button"
                onClick={() => (onOpenTracker ? onOpenTracker() : onNavigate('trackers'))}
                className="text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:underline"
                style={{ color: 'var(--cs-accent)' }}
              >
                Manage trackers <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {trackerToast && (
            <div className="p-2.5 rounded-xl cs-surface-muted text-xs flex items-center justify-between gap-2">
              <span>{trackerToast}</span>
              <button type="button" onClick={() => setTrackerToast(null)} className="underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {dashboardTrackers.length === 0 ? (
            <div className="cs-surface-muted rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                Build personal trackers for workouts, sports, hobbies, or study sprints and pin your favorites here.
              </p>
              <button
                type="button"
                onClick={() => (onOpenTracker ? onOpenTracker() : onNavigate('trackers'))}
                className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                Create a tracker
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {dashboardTrackers.slice(0, 6).map((tracker) => {
                const stats = computeTrackerAnalytics(tracker, customTrackerEntries, trackerGoals, todayDate, 30);
                const todayCount = customTrackerEntries.filter(
                  (e) => e.trackerId === tracker.id && e.date === todayDate && !e.isRestDay
                ).length;
                const latest = customTrackerEntries
                  .filter((e) => e.trackerId === tracker.id)
                  .sort((a, b) => b.date.localeCompare(a.date))[0];
                const topGoal = stats.goalProgress[0];

                return (
                  <div key={tracker.id} className="cs-surface-muted rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => (onOpenTracker ? onOpenTracker(tracker.id) : onNavigate('trackers'))}
                          className="flex items-center gap-2 min-w-0 text-left cursor-pointer hover:opacity-85"
                        >
                          <span className="text-xl leading-none">{tracker.emoji}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate flex items-center gap-1">
                              {tracker.name}
                              {tracker.pinned && <Pin className="w-3 h-3 shrink-0 opacity-70" />}
                            </div>
                            <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                              Today: {todayCount > 0 ? `${todayCount} logged` : 'Not logged'} ·{' '}
                              {latest ? `Last ${latest.date.slice(5)}` : 'No entries yet'}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label={`Hide ${tracker.name} from dashboard`}
                          onClick={() =>
                            updateDashboardTrackerPrefs({
                              hiddenTrackerIds: [...dashboardTrackerPrefs.hiddenTrackerIds, tracker.id],
                            })
                          }
                          className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {topGoal && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                            <span className="truncate">{topGoal.goal.title}</span>
                            <span className="font-mono-num font-semibold">{topGoal.percent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${topGoal.percent}%`, backgroundColor: tracker.color || 'var(--cs-accent)' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await saveCustomTrackerEntry({
                            trackerId: tracker.id,
                            date: todayDate,
                            time: new Date().toTimeString().slice(0, 5),
                            values: {},
                            notes: 'Quick check-in from Dashboard',
                            isRestDay: false,
                            completed: true,
                          });
                          setTrackerToast(`Logged quick check-in for "${tracker.name}".`);
                        }}
                        className="cs-btn-primary flex-1 py-1.5 px-3 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Quick log
                      </button>
                      <button
                        type="button"
                        onClick={() => (onOpenTracker ? onOpenTracker(tracker.id) : onNavigate('trackers'))}
                        className="cs-card py-1.5 px-3 rounded-xl text-xs font-medium cursor-pointer"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => updateDashboardTrackerPrefs({ showSection: true })}
            className="cs-surface-muted px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
          >
            Show My Trackers on Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
