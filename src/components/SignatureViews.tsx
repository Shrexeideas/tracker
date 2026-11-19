import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import {
  computeDayEcho,
  computeLifeBalance,
  computeStudyProgress,
  formatDuration,
  getBlocksForDate,
  shiftDateString,
} from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import { Plus, Sparkles, Trash2 } from 'lucide-react';

// A. Day Echo — Plan versus Reality
export function DayEchoView() {
  const { todayDate, dailySchedules, tasks, saveScheduleBlock } = useData();
  const [date, setDate] = useState(todayDate);
  const [unexpectedTitle, setUnexpectedTitle] = useState('');
  const [unexpectedMins, setUnexpectedMins] = useState(30);

  const dayBlocks = useMemo(() => getBlocksForDate(dailySchedules, date), [dailySchedules, date]);
  const echo = useMemo(() => computeDayEcho(date, dayBlocks, tasks), [date, dayBlocks, tasks]);

  const handleAddUnexpected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unexpectedTitle.trim()) return;
    await saveScheduleBlock({
      date,
      title: unexpectedTitle.trim(),
      startTime: '18:00',
      endTime: '18:30',
      durationMinutes: unexpectedMins,
      category: 'Unexpected',
      color: '#C9633B',
      lifeDomain: 'personal',
      notes: 'Logged via Day Echo',
      completed: true,
      completedAt: new Date().toISOString(),
      priority: 'medium',
      isBreak: false,
      isUnexpected: true,
      actualDurationMinutes: unexpectedMins,
      reminderMinutes: 0,
      linkedTaskId: '',
      linkedStudyId: '',
      recurringWeekdays: [],
    });
    setUnexpectedTitle('');
  };

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <WashiLabel>Day Echo · Plan vs Reality</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">How your day actually unfolded</h1>
          </div>
          <input
            type="date"
            aria-label="Day Echo date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="cs-input px-3 py-2 rounded-xl text-xs font-mono-num"
          />
        </div>

        <div className="cs-surface-muted rounded-2xl p-4 text-sm leading-relaxed">
          {echo.gentleMessage}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="cs-surface-muted rounded-2xl p-4">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Planned</div>
            <div className="font-mono-num text-xl font-semibold">{echo.plannedBlocks.length} blocks</div>
            <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
              {formatDuration(echo.plannedMinutes)}
            </div>
          </div>
          <div className="cs-surface-muted rounded-2xl p-4">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Completed</div>
            <div className="font-mono-num text-xl font-semibold">{echo.completedBlocks.length} blocks</div>
            <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
              {formatDuration(echo.completedMinutes)}
            </div>
          </div>
          <div className="cs-surface-muted rounded-2xl p-4">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Postponed</div>
            <div className="font-mono-num text-xl font-semibold">{echo.postponedBlocks.length}</div>
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>carried lightly</div>
          </div>
          <div className="cs-surface-muted rounded-2xl p-4">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Unexpected</div>
            <div className="font-mono-num text-xl font-semibold">{echo.unexpectedBlocks.length}</div>
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              +{echo.tasksCompletedCount} tasks done
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="cs-surface-muted rounded-2xl p-4 space-y-2">
            <h2 className="font-display text-base font-semibold">Completed &amp; Longer-than-expected</h2>
            {echo.completedBlocks.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>No completed blocks on {date}.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {echo.completedBlocks.map((b) => (
                  <li key={b.id} className="cs-card p-2.5 rounded-xl flex justify-between gap-2">
                    <span>{b.title}</span>
                    <span className="font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                      {formatDuration(b.actualDurationMinutes > 0 ? b.actualDurationMinutes : b.durationMinutes)}
                      {b.actualDurationMinutes > b.durationMinutes ? ' (took longer)' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cs-surface-muted rounded-2xl p-4 space-y-2">
            <h2 className="font-display text-base font-semibold">Postponed or Unplanned</h2>
            {echo.postponedBlocks.length === 0 && echo.unexpectedBlocks.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Everything planned stayed on track.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {echo.postponedBlocks.map((b) => (
                  <li key={b.id} className="cs-card p-2.5 rounded-xl flex justify-between">
                    <span>{b.title}</span>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Postponed</span>
                  </li>
                ))}
                {echo.unexpectedBlocks.map((b) => (
                  <li key={b.id} className="cs-card p-2.5 rounded-xl flex justify-between">
                    <span>{b.title}</span>
                    <span style={{ color: 'var(--cs-accent)' }}>Unexpected</span>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddUnexpected} className="flex gap-2 pt-2">
              <input
                type="text"
                aria-label="Log unexpected activity"
                value={unexpectedTitle}
                onChange={(e) => setUnexpectedTitle(e.target.value)}
                placeholder="Log an unexpected activity..."
                className="cs-input flex-1 px-3 py-1.5 rounded-xl text-xs"
              />
              <input
                type="number"
                aria-label="Unexpected duration minutes"
                min={5}
                max={300}
                value={unexpectedMins}
                onChange={(e) => setUnexpectedMins(Number(e.target.value) || 30)}
                className="cs-input w-16 px-2 py-1.5 rounded-xl text-xs font-mono-num"
              />
              <button type="submit" aria-label="Add unexpected activity" className="cs-btn-primary p-2 rounded-xl cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

// B. Life Balance View
export function LifeBalanceView() {
  const { dailySchedules, areas } = useData();
  const rows = useMemo(() => computeLifeBalance(dailySchedules, areas), [dailySchedules, areas]);

  return (
    <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
      <div className="space-y-1">
        <WashiLabel>Life Balance</WashiLabel>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Where your time actually goes</h1>
        <p className="text-xs sm:text-sm" style={{ color: 'var(--cs-text-muted)' }}>
          Seasons of life shift naturally—this view shows planned versus completed time without expecting every area to be equal.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.domain} className="cs-surface-muted rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{row.label}</span>
              <span className="font-mono-num text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                Planned: {formatDuration(row.plannedMinutes)} · Actual: {formatDuration(row.actualMinutes)} ({row.sharePercent}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${row.sharePercent}%`, backgroundColor: 'var(--cs-accent)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// C. Life Timeline
export function LifeTimelineView() {
  const {
    todayDate,
    lifeTimeline,
    journalEntries,
    calendarEvents,
    saveTimelineItem,
    deleteTimelineItem,
  } = useData();

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [date, setDate] = useState(todayDate);
  const [description, setDescription] = useState('');

  const combinedItems = useMemo(() => {
    const manualAndCompleted = [...lifeTimeline];
    const journalHighlights = journalEntries.map((j) => ({
      id: `jhl_${j.id}`,
      date: j.date,
      title: `Journal: ${j.title}`,
      description: j.content.slice(0, 140),
      category: 'Journal',
      sourceType: 'journal' as const,
      canDelete: false,
      rawId: j.id,
    }));
    const eventItems = calendarEvents
      .filter((e) => e.completed)
      .map((e) => ({
        id: `evhl_${e.id}`,
        date: e.date,
        title: `Event: ${e.title}`,
        description: e.notes,
        category: e.category || 'Calendar',
        sourceType: 'calendar' as const,
        canDelete: false,
        rawId: e.id,
      }));

    const base = manualAndCompleted.map((item) => ({
      ...item,
      canDelete: true,
      rawId: item.id,
    }));

    return [...base, ...journalHighlights, ...eventItems]
      .filter((item) => (categoryFilter === 'all' ? true : item.category.toLowerCase() === categoryFilter.toLowerCase()))
      .filter((item) => (dateFilter ? item.date.startsWith(dateFilter) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [lifeTimeline, journalEntries, calendarEvents, categoryFilter, dateFilter]);

  const categories = useMemo(
    () => Array.from(new Set(combinedItems.map((i) => i.category).filter(Boolean))),
    [combinedItems]
  );

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await saveTimelineItem({
      date,
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || 'Personal',
      sourceType: 'manual',
      sourceId: '',
    });
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <WashiLabel>Life Timeline</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">Chronological personal story</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter timeline by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="cs-input px-3 py-1.5 rounded-xl text-xs"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="month"
              aria-label="Filter timeline by month"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="cs-input px-3 py-1.5 rounded-xl text-xs font-mono-num"
            />
          </div>
        </div>

        <form onSubmit={handleAddMilestone} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end cs-surface-muted rounded-2xl p-4">
          <div className="sm:col-span-4 space-y-1">
            <label htmlFor="tl-title" className="block text-xs font-medium">Add achievement or memory</label>
            <input
              id="tl-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Won hackathon, finished semester..."
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="tl-cat" className="block text-xs font-medium">Category</label>
            <input
              id="tl-cat"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="tl-date" className="block text-xs font-medium">Date</label>
            <input
              id="tl-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-xs font-mono-num"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="cs-btn-primary w-full py-2 px-3 rounded-xl text-sm font-medium cursor-pointer">
              Add
            </button>
          </div>
        </form>

        {combinedItems.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--cs-text-muted)' }}>
            Completed goals, study modules, tasks, and journal highlights automatically appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {combinedItems.map((item) => (
              <div key={item.id} className="cs-surface-muted rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                    {item.date} · {item.category} · {item.sourceType}
                  </div>
                  <div className="font-display text-base font-semibold">{item.title}</div>
                  {item.description && (
                    <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                      {item.description}
                    </p>
                  )}
                </div>
                {item.canDelete && (
                  <button
                    type="button"
                    onClick={() => deleteTimelineItem(item.rawId)}
                    aria-label={`Delete timeline item ${item.title}`}
                    className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// D. Weekly Reset
export function WeeklyResetView() {
  const { todayDate, weeklyResets, dailySchedules, tasks, goals, saveWeeklyReset, saveScheduleBlock } = useData();
  const weekKey = `${todayDate.slice(0, 7)}_W${Math.ceil(Number(todayDate.slice(8)) / 7)}`;
  const existing = weeklyResets.find((w) => w.weekKey === weekKey);

  const [wentWell, setWentWell] = useState(existing?.wentWell || '');
  const [feltDifficult, setFeltDifficult] = useState(existing?.feltDifficult || '');
  const [postponedNotes, setPostponedNotes] = useState(existing?.postponedNotes || '');
  const [nextWeekGoals, setNextWeekGoals] = useState(existing?.nextWeekGoals || '');
  const [removedFromPlan, setRemovedFromPlan] = useState(existing?.removedFromPlan || '');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setWentWell(existing.wentWell);
      setFeltDifficult(existing.feltDifficult);
      setPostponedNotes(existing.postponedNotes);
      setNextWeekGoals(existing.nextWeekGoals);
      setRemovedFromPlan(existing.removedFromPlan);
    }
  }, [existing]);

  const weekStart = shiftDateString(todayDate, -6);
  const weekBlocks = dailySchedules.filter((b) => b.date >= weekStart && b.date <= todayDate);
  const postponedCount = weekBlocks.filter((b) => !b.completed && !b.isBreak).length;
  const openTasks = tasks.filter((t) => !t.completed).slice(0, 3);
  const activeGoals = goals.filter((g) => !g.completed).slice(0, 2);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveWeeklyReset({
      id: `wres_${weekKey}`,
      weekKey,
      wentWell: wentWell.trim() || 'Reflected on the week.',
      feltDifficult: feltDifficult.trim(),
      postponedNotes: postponedNotes.trim(),
      nextWeekGoals: nextWeekGoals.trim(),
      removedFromPlan: removedFromPlan.trim(),
    });
    setNotice(`Saved Weekly Reset for ${weekKey}.`);
  };

  const applySuggestedPlanToTomorrow = async () => {
    const tomorrow = shiftDateString(todayDate, 1);
    let added = 0;
    for (let i = 0; i < openTasks.length; i++) {
      const hour = 9 + i * 2;
      await saveScheduleBlock({
        date: tomorrow,
        title: openTasks[i].title,
        startTime: `${String(hour).padStart(2, '0')}:00`,
        endTime: `${String(hour + 1).padStart(2, '0')}:00`,
        durationMinutes: 60,
        category: openTasks[i].areaName || 'Personal',
        color: '#6E54A3',
        lifeDomain: 'projects',
        notes: 'Scheduled from Weekly Reset suggestion',
        completed: false,
        completedAt: '',
        priority: openTasks[i].priority,
        isBreak: false,
        isUnexpected: false,
        actualDurationMinutes: 0,
        reminderMinutes: 0,
        linkedTaskId: openTasks[i].id,
        linkedStudyId: '',
        recurringWeekdays: [],
      });
      added++;
    }
    setNotice(added > 0 ? `Added ${added} suggested blocks to tomorrow (${tomorrow}).` : 'No pending tasks to schedule yet.');
  };

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <WashiLabel>Weekly Reset · {weekKey}</WashiLabel>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Guided weekly reflection</h1>
          <p className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
            Past 7 days: {weekBlocks.filter((b) => b.completed).length} completed blocks · {postponedCount} postponed
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="wr-well" className="block text-xs font-medium">1. What went well this week?</label>
              <textarea
                id="wr-well"
                rows={3}
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wr-diff" className="block text-xs font-medium">2. What felt difficult or heavy?</label>
              <textarea
                id="wr-diff"
                rows={3}
                value={feltDifficult}
                onChange={(e) => setFeltDifficult(e.target.value)}
                className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wr-post" className="block text-xs font-medium">3. What was postponed and why?</label>
              <textarea
                id="wr-post"
                rows={2}
                value={postponedNotes}
                onChange={(e) => setPostponedNotes(e.target.value)}
                className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wr-goals" className="block text-xs font-medium">4. Which goals matter most next week?</label>
              <textarea
                id="wr-goals"
                rows={2}
                value={nextWeekGoals}
                onChange={(e) => setNextWeekGoals(e.target.value)}
                className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="wr-rem" className="block text-xs font-medium">5. What can be intentionally removed from your plan?</label>
            <input
              id="wr-rem"
              type="text"
              value={removedFromPlan}
              onChange={(e) => setRemovedFromPlan(e.target.value)}
              className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="submit" className="cs-btn-primary px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer">
              Save Weekly Reset
            </button>
            {notice && <span className="text-xs font-medium" style={{ color: 'var(--cs-accent)' }}>{notice}</span>}
          </div>
        </form>
      </section>

      <section className="cs-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
          <h2 className="font-display text-xl font-semibold">Suggested plan for your approval</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
          Based on your open tasks ({openTasks.length}) and active goals ({activeGoals.length}):
        </p>
        <ul className="space-y-1.5 text-xs">
          {openTasks.map((t) => (
            <li key={t.id} className="cs-surface-muted p-2.5 rounded-xl">
              Task focus: <strong>{t.title}</strong> ({t.priority} priority)
            </li>
          ))}
          {activeGoals.map((g) => (
            <li key={g.id} className="cs-surface-muted p-2.5 rounded-xl">
              Goal momentum: <strong>{g.title}</strong>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={applySuggestedPlanToTomorrow}
          className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
        >
          Approve &amp; seed tomorrow&apos;s schedule
        </button>
      </section>
    </div>
  );
}

// E. Monthly Life Review
export function MonthlyReviewView() {
  const {
    todayDate,
    preferences,
    tasks,
    studySchedules,
    focusSessions,
    incomes,
    expenses,
    goals,
    monthlyReviews,
    saveMonthlyReview,
  } = useData();

  const [monthKey, setMonthKey] = useState(todayDate.slice(0, 7));
  const existing = monthlyReviews.find((m) => m.monthKey === monthKey);

  const [reflection, setReflection] = useState(existing?.reflection || '');
  const [wins, setWins] = useState(existing?.wins || '');
  const [lessons, setLessons] = useState(existing?.lessons || '');
  const [focusNextMonth, setFocusNextMonth] = useState(existing?.focusNextMonth || '');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setReflection(existing?.reflection || '');
    setWins(existing?.wins || '');
    setLessons(existing?.lessons || '');
    setFocusNextMonth(existing?.focusNextMonth || '');
  }, [existing]);

  const completedTasks = tasks.filter((t) => t.completed && t.completedAt?.startsWith(monthKey)).length;
  const studyAvg =
    studySchedules.length > 0
      ? Math.round(studySchedules.reduce((s, st) => s + computeStudyProgress(st).percent, 0) / studySchedules.length)
      : 0;
  const focusMinutes = focusSessions
    .filter((f) => f.date.startsWith(monthKey) && f.mode === 'focus')
    .reduce((s, f) => s + f.durationMinutes, 0);
  const incTotal = incomes.filter((i) => i.date.startsWith(monthKey)).reduce((s, i) => s + i.amount, 0);
  const expTotal = expenses.filter((e) => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
  const completedMilestones = goals.reduce(
    (sum, g) => sum + g.milestones.filter((m) => m.completed && m.completedAt?.startsWith(monthKey)).length,
    0
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMonthlyReview({
      id: `mrev_${monthKey}`,
      monthKey,
      reflection: reflection.trim(),
      wins: wins.trim(),
      lessons: lessons.trim(),
      focusNextMonth: focusNextMonth.trim(),
    });
    setSavedMsg(`Saved Monthly Life Review for ${monthKey}.`);
  };

  return (
    <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <WashiLabel>Monthly Life Review</WashiLabel>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Month in perspective</h1>
        </div>
        <input
          type="month"
          aria-label="Review month"
          value={monthKey}
          onChange={(e) => {
            const next = e.target.value;
            setMonthKey(next);
            const found = monthlyReviews.find((m) => m.monthKey === next);
            setReflection(found?.reflection || '');
            setWins(found?.wins || '');
            setLessons(found?.lessons || '');
            setFocusNextMonth(found?.focusNextMonth || '');
          }}
          className="cs-input px-3 py-2 rounded-xl text-xs font-mono-num"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="cs-surface-muted rounded-2xl p-4">
          <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Completed Tasks</div>
          <div className="font-mono-num text-xl font-semibold">{completedTasks}</div>
        </div>
        <div className="cs-surface-muted rounded-2xl p-4">
          <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Study Progress</div>
          <div className="font-mono-num text-xl font-semibold">{studyAvg}%</div>
        </div>
        <div className="cs-surface-muted rounded-2xl p-4">
          <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Focus Sessions</div>
          <div className="font-mono-num text-xl font-semibold">{formatDuration(focusMinutes)}</div>
        </div>
        <div className="cs-surface-muted rounded-2xl p-4">
          <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Net Savings</div>
          <div className="font-mono-num text-xl font-semibold">
            {preferences.currency} {(incTotal - expTotal).toLocaleString()}
          </div>
        </div>
        <div className="cs-surface-muted rounded-2xl p-4">
          <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Milestones Done</div>
          <div className="font-mono-num text-xl font-semibold">{completedMilestones}</div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="mr-refl" className="block text-xs font-medium">Personal reflection</label>
          <textarea
            id="mr-refl"
            rows={4}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="How did this month feel as a whole?"
            className="cs-input w-full px-4 py-3 rounded-2xl text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="mr-wins" className="block text-xs font-medium">Proud moments</label>
            <textarea
              id="mr-wins"
              rows={2}
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mr-lessons" className="block text-xs font-medium">Gentle lessons</label>
            <textarea
              id="mr-lessons"
              rows={2}
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mr-next" className="block text-xs font-medium">Focus next month</label>
            <textarea
              id="mr-next"
              rows={2}
              value={focusNextMonth}
              onChange={(e) => setFocusNextMonth(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button type="submit" className="cs-btn-primary px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer">
            Save Monthly Review
          </button>
          {savedMsg && <span className="text-xs font-medium" style={{ color: 'var(--cs-accent)' }}>{savedMsg}</span>}
        </div>
      </form>
    </section>
  );
}
