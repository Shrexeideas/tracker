import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Area, LifeDomain, NavSectionId, PriorityLevel, Task } from '../types/clearspace';
import { findNextAvailableSlot, getBlocksForDate, getCurrentMinutesInTimezone, minutesToTime24 } from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import { CalendarPlus, Check, Edit3, FolderPlus, Plus, Search, Trash2 } from 'lucide-react';

type TaskFilterTab = 'today' | 'upcoming' | 'all' | 'backlog' | 'completed';
type SortKey = 'dueDate' | 'priority' | 'title';

const AREA_COLORS = ['#C94D6D', '#4B7B4A', '#6E54A3', '#C9633B', '#2D6F95', '#8C6D62'];
const LIFE_DOMAINS: { value: LifeDomain; label: string }[] = [
  { value: 'study', label: 'Study' },
  { value: 'career', label: 'Career' },
  { value: 'projects', label: 'Projects' },
  { value: 'personal', label: 'Personal' },
  { value: 'creative', label: 'Creative' },
  { value: 'rest', label: 'Rest' },
];

export function TasksAreasView({ onNavigate }: { onNavigate: (s: NavSectionId) => void }) {
  const {
    preferences,
    todayDate,
    tasks,
    areas,
    dailySchedules,
    saveTask,
    toggleTaskComplete,
    deleteTask,
    saveArea,
    deleteArea,
    saveScheduleBlock,
  } = useData();

  const [tab, setTab] = useState<TaskFilterTab>('today');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('dueDate');
  const [notice, setNotice] = useState<string | null>(null);

  // Task form modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [areaId, setAreaId] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [dueDate, setDueDate] = useState(todayDate);
  const [dueTime, setDueTime] = useState('');
  const [backlog, setBacklog] = useState(false);

  // Area form / delete confirmation
  const [areaName, setAreaName] = useState('');
  const [areaColor, setAreaColor] = useState(AREA_COLORS[0]);
  const [areaDomain, setAreaDomain] = useState<LifeDomain>('personal');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [confirmDeleteArea, setConfirmDeleteArea] = useState<{ area: Area; taskCount: number } | null>(null);

  const openNewTask = () => {
    setEditingTaskId(null);
    setTitle('');
    setNotes('');
    setAreaId(areas[0]?.id || '');
    setPriority('medium');
    setDueDate(todayDate);
    setDueTime('');
    setBacklog(false);
    setTaskModalOpen(true);
  };

  const openEditTask = (t: Task) => {
    setEditingTaskId(t.id);
    setTitle(t.title);
    setNotes(t.notes || '');
    setAreaId(t.areaId || '');
    setPriority(t.priority);
    setDueDate(t.dueDate || '');
    setDueTime(t.dueTime || '');
    setBacklog(Boolean(t.backlog));
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const selectedArea = areas.find((a) => a.id === areaId);
    const existing = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : undefined;
    await saveTask({
      ...(editingTaskId ? { id: editingTaskId } : {}),
      title: title.trim(),
      notes: notes.trim(),
      areaId: selectedArea?.id || '',
      areaName: selectedArea?.name || 'Personal',
      priority,
      dueDate: backlog ? '' : dueDate,
      dueTime: backlog ? '' : dueTime,
      completed: existing?.completed || false,
      completedAt: existing?.completedAt || '',
      backlog,
    });
    setTaskModalOpen(false);
    setNotice(editingTaskId ? 'Task updated.' : 'Task added.');
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return;
    await saveArea({
      ...(editingAreaId ? { id: editingAreaId } : {}),
      name: areaName.trim(),
      color: areaColor,
      lifeDomain: areaDomain,
    });
    setAreaName('');
    setEditingAreaId(null);
    setNotice(editingAreaId ? 'Area updated and linked tasks synced.' : 'Custom area created.');
  };

  const requestDeleteArea = (area: Area) => {
    const linkedCount = tasks.filter((t) => t.areaId === area.id || t.areaName === area.name).length;
    if (linkedCount > 0) {
      setConfirmDeleteArea({ area, taskCount: linkedCount });
      return;
    }
    deleteArea(area.id);
    setNotice(`Deleted area "${area.name}".`);
  };

  const scheduleTaskInMyDay = async (task: Task) => {
    const todayBlocks = getBlocksForDate(dailySchedules, todayDate);
    const nowMins = getCurrentMinutesInTimezone(new Date(), preferences.timezone);
    const slot = findNextAvailableSlot(45, todayBlocks, preferences.dayStartHour, preferences.dayEndHour, nowMins) || {
      startTime: minutesToTime24(preferences.dayStartHour * 60),
      endTime: minutesToTime24(preferences.dayStartHour * 60 + 45),
    };
    const areaObj = areas.find((a) => a.id === task.areaId || a.name === task.areaName);
    await saveScheduleBlock({
      date: todayDate,
      title: task.title,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: 45,
      category: task.areaName || 'Personal',
      color: areaObj?.color || '#C94D6D',
      lifeDomain: areaObj?.lifeDomain || 'personal',
      notes: task.notes || '',
      completed: false,
      completedAt: '',
      priority: task.priority,
      isBreak: false,
      isUnexpected: false,
      actualDurationMinutes: 0,
      reminderMinutes: 0,
      linkedTaskId: task.id,
      linkedStudyId: '',
      recurringWeekdays: [],
    });
    setNotice(`Scheduled "${task.title}" in My Day at ${slot.startTime}.`);
  };

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const prioRank: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };

    return tasks
      .filter((t) => {
        if (tab === 'completed') return t.completed;
        if (t.completed) return false;
        if (tab === 'today') return t.dueDate === todayDate && !t.backlog;
        if (tab === 'upcoming') return Boolean(t.dueDate && t.dueDate > todayDate) && !t.backlog;
        if (tab === 'backlog') return Boolean(t.backlog);
        return true;
      })
      .filter((t) => (areaFilter === 'all' ? true : t.areaId === areaFilter || t.areaName === areaFilter))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (sortBy === 'priority') return prioRank[a.priority] - prioRank[b.priority];
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99');
      });
  }, [tasks, tab, todayDate, areaFilter, search, sortBy]);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <WashiLabel>Tasks &amp; Custom Areas</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">Organize what matters</h1>
          </div>
          <button
            type="button"
            onClick={openNewTask}
            className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New task
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl cs-surface-muted text-xs font-medium">
            {(['today', 'upcoming', 'all', 'backlog', 'completed'] as TaskFilterTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg capitalize cursor-pointer whitespace-nowrap ${
                  tab === t ? 'cs-btn-primary' : ''
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                type="search"
                aria-label="Search tasks"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="cs-input pl-8 pr-3 py-1.5 rounded-xl text-xs"
              />
            </div>

            <select
              aria-label="Filter by area"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="cs-input px-3 py-1.5 rounded-xl text-xs"
            >
              <option value="all">All areas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort tasks"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="cs-input px-3 py-1.5 rounded-xl text-xs"
            >
              <option value="dueDate">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
            </select>
          </div>
        </div>

        {notice && (
          <div className="p-3 rounded-xl cs-surface-muted text-xs flex items-center justify-between gap-2">
            <span>{notice}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('my-day')}
                className="underline font-medium cursor-pointer"
                style={{ color: 'var(--cs-accent)' }}
              >
                Open My Day
              </button>
              <button type="button" onClick={() => setNotice(null)} className="underline cursor-pointer">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="cs-surface-muted rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
              No tasks in this view yet.
            </p>
            <button
              type="button"
              onClick={openNewTask}
              className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              Create a task
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((task) => {
              const areaColor = areas.find((a) => a.id === task.areaId || a.name === task.areaName)?.color || 'var(--cs-accent)';
              return (
                <div
                  key={task.id}
                  className="cs-surface-muted rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task)}
                      aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                        task.completed ? 'animate-cs-check' : ''
                      }`}
                      style={{
                        borderColor: areaColor,
                        backgroundColor: task.completed ? areaColor : 'transparent',
                        color: '#fff',
                      }}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className={`text-sm font-semibold ${task.completed ? 'line-through opacity-70' : ''}`}>
                        {task.title}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                        {task.areaName || 'Personal'} · {task.priority} priority
                        {task.dueDate ? ` · ${task.dueDate}` : ''}
                        {task.dueTime ? ` ${task.dueTime}` : ''}
                        {task.backlog ? ' · Backlog' : ''}
                      </div>
                      {task.notes && (
                        <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!task.completed && (
                      <button
                        type="button"
                        onClick={() => scheduleTaskInMyDay(task)}
                        title="Schedule in My Day"
                        aria-label={`Schedule ${task.title} in My Day`}
                        className="px-2.5 py-1.5 rounded-xl cs-card text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" /> Schedule
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditTask(task)}
                      aria-label={`Edit ${task.title}`}
                      className="p-2 rounded-xl cs-card cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      aria-label={`Delete ${task.title}`}
                      className="p-2 rounded-xl cs-card text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Custom Areas Section */}
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
          <h2 className="font-display text-xl font-semibold">Custom Areas</h2>
        </div>

        <form onSubmit={handleSaveArea} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4 space-y-1">
            <label htmlFor="area-name" className="block text-xs font-medium">
              Area name
            </label>
            <input
              id="area-name"
              type="text"
              required
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="Academics, Side Project, Health..."
              className="cs-input w-full px-3.5 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="area-domain" className="block text-xs font-medium">
              Life Balance domain
            </label>
            <select
              id="area-domain"
              value={areaDomain}
              onChange={(e) => setAreaDomain(e.target.value as LifeDomain)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            >
              {LIFE_DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 space-y-1">
            <span className="block text-xs font-medium">Colour</span>
            <div className="flex items-center gap-1.5 py-1.5">
              {AREA_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Area colour ${c}`}
                  onClick={() => setAreaColor(c)}
                  className={`w-6 h-6 rounded-full cursor-pointer ${areaColor === c ? 'ring-2 ring-offset-2 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="cs-btn-primary w-full py-2 px-3 rounded-xl text-sm font-medium cursor-pointer">
              {editingAreaId ? 'Update' : 'Add area'}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {areas.map((area) => {
            const count = tasks.filter((t) => t.areaId === area.id || t.areaName === area.name).length;
            return (
              <div key={area.id} className="cs-surface-muted rounded-2xl p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{area.name}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--cs-text-muted)' }}>
                      {area.lifeDomain} · {count} tasks
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAreaId(area.id);
                      setAreaName(area.name);
                      setAreaColor(area.color);
                      setAreaDomain(area.lifeDomain);
                    }}
                    aria-label={`Rename ${area.name}`}
                    className="p-1.5 rounded-lg cs-card cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteArea(area)}
                    aria-label={`Delete ${area.name}`}
                    className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Task Editor Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">{editingTaskId ? 'Edit task' : 'Create task'}</h2>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="tsk-title" className="block text-xs font-medium">
                  Task title
                </label>
                <input
                  id="tsk-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="tsk-area" className="block text-xs font-medium">
                    Area
                  </label>
                  <select
                    id="tsk-area"
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm"
                  >
                    <option value="">Personal</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="tsk-prio" className="block text-xs font-medium">
                    Priority
                  </label>
                  <select
                    id="tsk-prio"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={backlog} onChange={(e) => setBacklog(e.target.checked)} />
                Keep in backlog (no due date yet)
              </label>

              {!backlog && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="tsk-date" className="block text-xs font-medium">
                      Due date
                    </label>
                    <input
                      id="tsk-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="tsk-time" className="block text-xs font-medium">
                      Due time
                    </label>
                    <input
                      id="tsk-time"
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="tsk-notes" className="block text-xs font-medium">
                  Notes
                </label>
                <textarea
                  id="tsk-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="cs-input w-full px-3.5 py-2 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl cs-surface-muted text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="cs-btn-primary px-5 py-2 rounded-xl text-sm font-medium cursor-pointer">
                  Save task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Area Confirmation Modal */}
      {confirmDeleteArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Delete &ldquo;{confirmDeleteArea.area.name}&rdquo;?</h3>
            <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
              This area currently has {confirmDeleteArea.taskCount} tasks linked to it. Deleting the area will keep the
              tasks, while removing the area tag.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteArea(null)}
                className="px-4 py-2 rounded-xl cs-surface-muted text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteArea(confirmDeleteArea.area.id);
                  setConfirmDeleteArea(null);
                  setNotice(`Deleted area "${confirmDeleteArea.area.name}".`);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium cursor-pointer"
              >
                Delete area
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
