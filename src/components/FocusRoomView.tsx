import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { formatDuration } from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import { Check, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';

type TimerMode = 'focus' | 'short-break' | 'long-break';

export function FocusRoomView() {
  const { todayDate, tasks, focusSessions, logFocusSession, deleteFocusSession } = useData();

  const [mode, setMode] = useState<TimerMode>('focus');
  const [focusMins, setFocusMins] = useState(25);
  const [shortMins, setShortMins] = useState(5);
  const [longMins, setLongMins] = useState(15);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [focusTask, setFocusTask] = useState('Deep Focus Session');

  const getModeMinutes = (m: TimerMode) => (m === 'focus' ? focusMins : m === 'short-break' ? shortMins : longMins);

  const switchMode = (next: TimerMode) => {
    setRunning(false);
    setMode(next);
    setSecondsLeft(getModeMinutes(next) * 60);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          logFocusSession({
            taskTitle: focusTask.trim() || 'Focus Session',
            durationMinutes: getModeMinutes(mode),
            mode,
            date: todayDate,
            completedAt: new Date().toISOString(),
          });
          return getModeMinutes(mode) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, focusMins, shortMins, longMins, focusTask, todayDate, logFocusSession]);

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');
  const totalToday = focusSessions
    .filter((f) => f.date === todayDate && f.mode === 'focus')
    .reduce((s, f) => s + f.durationMinutes, 0);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <WashiLabel>Focus Room</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">Calm Pomodoro Space</h1>
          </div>
          <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
            Today&apos;s focus: {formatDuration(totalToday)}
          </div>
        </div>

        <div className="max-w-lg mx-auto text-center space-y-6 py-4">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl cs-surface-muted text-xs font-medium">
            {([
              ['focus', 'Focus'],
              ['short-break', 'Short Break'],
              ['long-break', 'Long Break'],
            ] as [TimerMode, string][]).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`px-3.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                  mode === m ? 'cs-btn-primary' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="font-mono-num text-6xl sm:text-7xl font-semibold tracking-tight">{minsDisplay}:{secsDisplay}</div>

          <div className="space-y-2 text-left">
            <label htmlFor="focus-task-input" className="block text-xs font-medium">
              Current focus task
            </label>
            <input
              id="focus-task-input"
              type="text"
              list="focus-tasks-datalist"
              value={focusTask}
              onChange={(e) => setFocusTask(e.target.value)}
              className="cs-input w-full px-4 py-2.5 rounded-xl text-sm"
            />
            <datalist id="focus-tasks-datalist">
              {tasks
                .filter((t) => !t.completed)
                .map((t) => (
                  <option key={t.id} value={t.title} />
                ))}
            </datalist>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="cs-btn-primary px-6 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? 'Pause' : 'Start timer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(getModeMinutes(mode) * 60);
              }}
              className="cs-surface-muted px-4 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              type="button"
              onClick={() =>
                logFocusSession({
                  taskTitle: focusTask.trim() || 'Focus Session',
                  durationMinutes: getModeMinutes(mode),
                  mode,
                  date: todayDate,
                  completedAt: new Date().toISOString(),
                })
              }
              className="cs-surface-muted px-4 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Log session now
            </button>
          </div>

          {/* Custom durations */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t text-xs" style={{ borderColor: 'var(--cs-border)' }}>
            <div className="space-y-1">
              <label htmlFor="dur-focus" className="block" style={{ color: 'var(--cs-text-muted)' }}>
                Focus (m)
              </label>
              <input
                id="dur-focus"
                type="number"
                min={1}
                max={180}
                value={focusMins}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 25);
                  setFocusMins(v);
                  if (mode === 'focus' && !running) setSecondsLeft(v * 60);
                }}
                className="cs-input w-full px-2.5 py-1.5 rounded-lg text-center font-mono-num"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="dur-short" className="block" style={{ color: 'var(--cs-text-muted)' }}>
                Short (m)
              </label>
              <input
                id="dur-short"
                type="number"
                min={1}
                max={60}
                value={shortMins}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 5);
                  setShortMins(v);
                  if (mode === 'short-break' && !running) setSecondsLeft(v * 60);
                }}
                className="cs-input w-full px-2.5 py-1.5 rounded-lg text-center font-mono-num"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="dur-long" className="block" style={{ color: 'var(--cs-text-muted)' }}>
                Long (m)
              </label>
              <input
                id="dur-long"
                type="number"
                min={1}
                max={90}
                value={longMins}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 15);
                  setLongMins(v);
                  if (mode === 'long-break' && !running) setSecondsLeft(v * 60);
                }}
                className="cs-input w-full px-2.5 py-1.5 rounded-lg text-center font-mono-num"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="cs-card rounded-3xl p-6 space-y-3">
        <h2 className="font-display text-xl font-semibold">Completed focus sessions ({focusSessions.length})</h2>
        {focusSessions.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            Finished Pomodoro sessions will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {[...focusSessions]
              .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
              .slice(0, 15)
              .map((sess) => (
                <div key={sess.id} className="cs-surface-muted rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-sm">{sess.taskTitle}</div>
                    <div className="font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                      {sess.date} · {sess.mode} · {sess.durationMinutes}m
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteFocusSession(sess.id)}
                    aria-label={`Delete focus session ${sess.taskTitle}`}
                    className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
