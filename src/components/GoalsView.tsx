import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Goal } from '../types/clearspace';
import { computeGoalProgress, generateId } from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import { Check, Plus, Trash2 } from 'lucide-react';

export function GoalsView() {
  const { todayDate, goals, saveGoal, deleteGoal } = useData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal');
  const [targetDate, setTargetDate] = useState(todayDate);
  const [milestonesInput, setMilestonesInput] = useState('');
  const [newMilestone, setNewMilestone] = useState<Record<string, string>>({});

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const milestones = milestonesInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)
      .map((m) => ({ id: generateId('ms'), title: m, completed: false, completedAt: '' }));

    await saveGoal({
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || 'Personal',
      targetDate,
      milestones,
      completed: false,
      completedAt: '',
    });
    setTitle('');
    setDescription('');
    setMilestonesInput('');
  };

  const toggleMilestone = async (goal: Goal, msId: string) => {
    const nextMs = goal.milestones.map((m) =>
      m.id === msId
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : '' }
        : m
    );
    const allDone = nextMs.length > 0 && nextMs.every((m) => m.completed);
    await saveGoal({
      ...goal,
      milestones: nextMs,
      completed: allDone,
      completedAt: allDone ? new Date().toISOString() : '',
    });
  };

  const addMilestone = async (goal: Goal) => {
    const txt = (newMilestone[goal.id] || '').trim();
    if (!txt) return;
    await saveGoal({
      ...goal,
      milestones: [...goal.milestones, { id: generateId('ms'), title: txt, completed: false, completedAt: '' }],
      completed: false,
      completedAt: '',
    });
    setNewMilestone((prev) => ({ ...prev, [goal.id]: '' }));
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <WashiLabel>Goals &amp; Milestones</WashiLabel>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">What you are working towards</h1>
        </div>

        <form onSubmit={handleCreateGoal} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4 space-y-1">
            <label htmlFor="gol-title" className="block text-xs font-medium">Goal title</label>
            <input
              id="gol-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ship portfolio v2, Complete DBMS..."
              className="cs-input w-full px-3.5 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label htmlFor="gol-cat" className="block text-xs font-medium">Category</label>
            <input
              id="gol-cat"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label htmlFor="gol-date" className="block text-xs font-medium">Target date</label>
            <input
              id="gol-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="cs-input w-full px-2.5 py-2 rounded-xl text-xs font-mono-num"
            />
          </div>
          <div className="sm:col-span-4 space-y-1">
            <label htmlFor="gol-ms" className="block text-xs font-medium">Milestones (comma separated)</label>
            <input
              id="gol-ms"
              type="text"
              value={milestonesInput}
              onChange={(e) => setMilestonesInput(e.target.value)}
              placeholder="Wireframes, Build core, Polish"
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-9 space-y-1">
            <label htmlFor="gol-desc" className="block text-xs font-medium">Why this matters (optional)</label>
            <input
              id="gol-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="cs-input w-full px-3.5 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="cs-btn-primary w-full py-2.5 px-4 rounded-xl text-sm font-medium cursor-pointer">
              Create goal
            </button>
          </div>
        </form>

        {activeGoals.length === 0 ? (
          <div className="cs-surface-muted rounded-2xl p-8 text-center text-sm" style={{ color: 'var(--cs-text-muted)' }}>
            No active goals yet. Add a meaningful goal and break it into gentle milestones above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((goal) => {
              const pct = computeGoalProgress(goal);
              return (
                <div key={goal.id} className="cs-surface-muted rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display text-lg font-semibold">{goal.title}</div>
                      <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                        {goal.category} · Target {goal.targetDate || 'Flexible'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          saveGoal({ ...goal, completed: true, completedAt: new Date().toISOString() })
                        }
                        aria-label={`Complete goal ${goal.title}`}
                        className="p-1.5 rounded-lg cs-card cursor-pointer"
                        title="Mark goal complete"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGoal(goal.id)}
                        aria-label={`Delete goal ${goal.title}`}
                        className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                      {goal.description}
                    </p>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono-num">
                      <span>Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--cs-accent)' }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {goal.milestones.map((ms) => (
                      <label key={ms.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ms.completed}
                          onChange={() => toggleMilestone(goal, ms.id)}
                        />
                        <span className={ms.completed ? 'line-through opacity-65' : ''}>{ms.title}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      aria-label={`Add milestone to ${goal.title}`}
                      value={newMilestone[goal.id] || ''}
                      onChange={(e) => setNewMilestone((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      placeholder="Add milestone..."
                      className="cs-input flex-1 px-2.5 py-1.5 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => addMilestone(goal)}
                      aria-label={`Confirm milestone for ${goal.title}`}
                      className="cs-card p-1.5 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {completedGoals.length > 0 && (
        <section className="cs-card rounded-3xl p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">Completed goals ({completedGoals.length})</h2>
          <div className="space-y-2 text-xs">
            {completedGoals.map((g) => (
              <div key={g.id} className="cs-surface-muted rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">{g.title}</span> · {g.category}
                </div>
                <div className="flex items-center gap-2 font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                  <span>{g.completedAt ? g.completedAt.slice(0, 10) : 'Completed'}</span>
                  <button
                    type="button"
                    onClick={() => saveGoal({ ...g, completed: false, completedAt: '' })}
                    className="underline cursor-pointer"
                  >
                    Reopen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
