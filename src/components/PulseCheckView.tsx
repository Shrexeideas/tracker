import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { CheckInPeriod, NavSectionId } from '../types/clearspace';
import {
  findNextAvailableSlot,
  generatePulseSuggestions,
  getBlocksForDate,
  getCurrentMinutesInTimezone,
  minutesToTime24,
  PulseSuggestion,
  shiftDateString,
} from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import { Check, Coffee, Sparkles, Sun, Trash2 } from 'lucide-react';

const MOOD_OPTIONS = [
  { id: 'calm', label: 'Calm', emoji: '🌿' },
  { id: 'focused', label: 'Focused', emoji: '✨' },
  { id: 'hopeful', label: 'Hopeful', emoji: '🌤️' },
  { id: 'joyful', label: 'Joyful', emoji: '🌸' },
  { id: 'tired', label: 'Tired', emoji: '🌙' },
  { id: 'overwhelmed', label: 'Stretched', emoji: '🌊' },
];

export function PulseCheckView({ onNavigate }: { onNavigate: (s: NavSectionId) => void }) {
  const {
    preferences,
    todayDate,
    pulseChecks,
    dailySchedules,
    tasks,
    savePulseCheck,
    deletePulseCheck,
    saveScheduleBlock,
  } = useData();

  const [period, setPeriod] = useState<CheckInPeriod>(() => {
    const mins = getCurrentMinutesInTimezone(new Date(), preferences.timezone);
    if (mins < 12 * 60) return 'morning';
    if (mins < 17 * 60) return 'afternoon';
    return 'evening';
  });

  const todayChecks = useMemo(() => pulseChecks.filter((p) => p.date === todayDate), [pulseChecks, todayDate]);
  const existingForPeriod = todayChecks.find((p) => p.period === period);

  const [mood, setMood] = useState(existingForPeriod?.mood || 'calm');
  const [energy, setEnergy] = useState(existingForPeriod?.energy || 3);
  const [stress, setStress] = useState(existingForPeriod?.stress || 2);
  const [motivation, setMotivation] = useState(existingForPeriod?.motivation || 3);
  const [note, setNote] = useState(existingForPeriod?.note || '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (existingForPeriod) {
      setMood(existingForPeriod.mood);
      setEnergy(existingForPeriod.energy);
      setStress(existingForPeriod.stress);
      setMotivation(existingForPeriod.motivation);
      setNote(existingForPeriod.note);
    }
  }, [existingForPeriod]);

  const handlePeriodSwitch = (nextPeriod: CheckInPeriod) => {
    setPeriod(nextPeriod);
    const match = todayChecks.find((p) => p.period === nextPeriod);
    if (match) {
      setMood(match.mood);
      setEnergy(match.energy);
      setStress(match.stress);
      setMotivation(match.motivation);
      setNote(match.note);
    } else {
      setMood('calm');
      setEnergy(3);
      setStress(2);
      setMotivation(3);
      setNote('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePulseCheck({
      id: `pls_${todayDate}_${period}`,
      date: todayDate,
      period,
      mood,
      energy,
      stress,
      motivation,
      note: note.trim(),
    });
    setSavedNotice(`Saved ${period} check-in for ${todayDate}.`);
  };

  const todayBlocks = useMemo(() => getBlocksForDate(dailySchedules, todayDate), [dailySchedules, todayDate]);
  const suggestions = useMemo(
    () =>
      generatePulseSuggestions(todayChecks, todayBlocks, tasks).filter((s) => !dismissedIds.includes(s.id)),
    [todayChecks, todayBlocks, tasks, dismissedIds]
  );

  const applySuggestion = async (s: PulseSuggestion) => {
    if (s.actionType === 'reduce-load') {
      onNavigate('my-day');
      return;
    }
    const nowMins = getCurrentMinutesInTimezone(new Date(), preferences.timezone);
    const slot = findNextAvailableSlot(
      s.suggestedMinutes,
      todayBlocks,
      preferences.dayStartHour,
      preferences.dayEndHour,
      nowMins
    ) || {
      startTime: minutesToTime24(Math.max(preferences.dayStartHour * 60, nowMins)),
      endTime: minutesToTime24(Math.max(preferences.dayStartHour * 60, nowMins) + s.suggestedMinutes),
    };

    await saveScheduleBlock({
      date: todayDate,
      title:
        s.actionType === 'add-break'
          ? 'Gentle Rest Break'
          : s.actionType === 'add-deep-work'
            ? 'Deep Work Session'
            : 'Light Starter Task',
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: s.suggestedMinutes,
      category: s.actionType === 'add-break' ? 'Rest' : 'Focus',
      color: s.actionType === 'add-break' ? '#4B7B4A' : '#6E54A3',
      lifeDomain: s.actionType === 'add-break' ? 'rest' : 'projects',
      notes: 'Added from your Pulse Check suggestion',
      completed: false,
      completedAt: '',
      priority: 'medium',
      isBreak: s.actionType === 'add-break',
      isUnexpected: false,
      actualDurationMinutes: 0,
      reminderMinutes: 0,
      linkedTaskId: '',
      linkedStudyId: '',
      recurringWeekdays: [],
    });
    setDismissedIds((prev) => [...prev, s.id]);
    setSavedNotice(`Added "${s.actionLabel}" to My Day at ${slot.startTime}.`);
  };

  // Weekly Energy Overview (last 7 days)
  const weeklyRows = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(shiftDateString(todayDate, -i));
    }
    return days.map((d) => {
      const checks = pulseChecks.filter((p) => p.date === d);
      const avgEnergy = checks.length ? checks.reduce((s, c) => s + c.energy, 0) / checks.length : 0;
      const avgStress = checks.length ? checks.reduce((s, c) => s + c.stress, 0) / checks.length : 0;
      const doneTasks = tasks.filter((t) => t.completed && t.completedAt?.startsWith(d)).length;
      const dayBlocksDone = getBlocksForDate(dailySchedules, d).filter((b) => b.completed && !b.isBreak).length;
      const latestNote = checks.find((c) => c.note)?.note || '';
      const moods = checks.map((c) => c.mood).join(', ');
      return { date: d, avgEnergy, avgStress, doneTasks, dayBlocksDone, latestNote, moods, hasCheck: checks.length > 0 };
    });
  }, [todayDate, pulseChecks, tasks, dailySchedules]);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <WashiLabel>Pulse Check</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">How are you feeling today?</h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--cs-text-muted)' }}>
              Optional morning, afternoon, and evening check-ins for energy-aware planning.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl cs-surface-muted text-xs font-medium">
            {(['morning', 'afternoon', 'evening'] as CheckInPeriod[]).map((p) => {
              const logged = todayChecks.some((c) => c.period === p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodSwitch(p)}
                  className={`px-3 py-1.5 rounded-lg capitalize cursor-pointer inline-flex items-center gap-1 ${
                    period === p ? 'cs-btn-primary' : ''
                  }`}
                >
                  {p}
                  {logged && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Mood Selection */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold">Mood right now</span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(m.id)}
                  className={`p-3 rounded-2xl text-center space-y-1 cursor-pointer transition-all ${
                    mood === m.id ? 'cs-btn-primary' : 'cs-surface-muted hover:opacity-90'
                  }`}
                >
                  <div className="text-xl">{m.emoji}</div>
                  <div className="text-xs font-medium">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Energy, Stress, Motivation Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="cs-surface-muted rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <label htmlFor="pulse-energy">Energy level</label>
                <span className="font-mono-num font-semibold">{energy} / 5</span>
              </div>
              <input
                id="pulse-energy"
                type="range"
                min={1}
                max={5}
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                className="w-full accent-current"
                style={{ color: 'var(--cs-accent)' }}
              />
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                <span>Drained</span>
                <span>Energized</span>
              </div>
            </div>

            <div className="cs-surface-muted rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <label htmlFor="pulse-stress">Stress level</label>
                <span className="font-mono-num font-semibold">{stress} / 5</span>
              </div>
              <input
                id="pulse-stress"
                type="range"
                min={1}
                max={5}
                value={stress}
                onChange={(e) => setStress(Number(e.target.value))}
                className="w-full accent-current"
                style={{ color: 'var(--cs-accent)' }}
              />
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                <span>At ease</span>
                <span>Heavy</span>
              </div>
            </div>

            <div className="cs-surface-muted rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <label htmlFor="pulse-motivation">Motivation</label>
                <span className="font-mono-num font-semibold">{motivation} / 5</span>
              </div>
              <input
                id="pulse-motivation"
                type="range"
                min={1}
                max={5}
                value={motivation}
                onChange={(e) => setMotivation(Number(e.target.value))}
                className="w-full accent-current"
                style={{ color: 'var(--cs-accent)' }}
              />
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                <span>Low</span>
                <span>Ready</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pulse-note" className="block text-xs font-medium">
              Personal observation (optional)
            </label>
            <textarea
              id="pulse-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is helping or weighing on your energy today?"
              className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {savedNotice ? (
              <span className="text-xs font-medium" style={{ color: 'var(--cs-accent)' }}>
                {savedNotice}
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                Clearspace never changes your schedule without asking you first.
              </span>
            )}
            <button type="submit" className="cs-btn-primary px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer">
              Save {period} check-in
            </button>
          </div>
        </form>
      </section>

      {/* Energy-Aware Suggestions */}
      {suggestions.length > 0 && (
        <section className="cs-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
            <h2 className="font-display text-xl font-semibold">Gentle schedule suggestions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((s) => (
              <div key={s.id} className="cs-surface-muted rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    {s.actionType === 'add-break' ? <Coffee className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    {s.title}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
                    {s.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="cs-btn-primary px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {s.actionLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedIds((prev) => [...prev, s.id])}
                    className="px-3 py-1.5 rounded-xl cs-card text-xs cursor-pointer"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Private Weekly Energy Overview */}
      <section className="cs-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold">Private weekly energy overview</h2>
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              Personal trends across the past 7 days alongside completed work and your own notes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
          {weeklyRows.map((row) => (
            <div key={row.date} className="cs-surface-muted rounded-2xl p-3 space-y-2 flex flex-col justify-between">
              <div className="text-xs font-mono-num font-semibold">{row.date.slice(5)}</div>
              {row.hasCheck ? (
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                      Energy {row.avgEnergy.toFixed(1)}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(row.avgEnergy / 5) * 100}%`, backgroundColor: 'var(--cs-accent)' }}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] capitalize truncate" style={{ color: 'var(--cs-text-muted)' }}>
                    {row.moods}
                  </div>
                </div>
              ) : (
                <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                  No check-in
                </div>
              )}
              <div className="text-[11px] font-mono-num pt-1 border-t" style={{ borderColor: 'var(--cs-border)' }}>
                {row.doneTasks + row.dayBlocksDone} done
              </div>
            </div>
          ))}
        </div>

        {todayChecks.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold">Today&apos;s check-ins</h3>
            <div className="space-y-1.5">
              {todayChecks.map((c) => (
                <div key={c.id} className="cs-surface-muted rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold capitalize">{c.period}</span> · {c.mood} · Energy {c.energy}/5 · Stress{' '}
                    {c.stress}/5{c.note ? ` — "${c.note}"` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePulseCheck(c.id)}
                    aria-label={`Delete ${c.period} check-in`}
                    className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
