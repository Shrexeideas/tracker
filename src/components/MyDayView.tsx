import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { DailyScheduleBlock, LifeDomain, PriorityLevel } from '../types/clearspace';
import {
  calculateDurationMinutes,
  findNextAvailableSlot,
  findOverlappingBlocks,
  formatDuration,
  formatTimeDisplay,
  generateId,
  getBlocksForDate,
  getCurrentMinutesInTimezone,
  getMissedBlocks,
  minutesToTime24,
  parseTimeToMinutes,
  shiftDateString,
  splitTaskTitleIntoSubtasks,
} from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Copy,
  Edit3,
  GripVertical,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BLOCK_COLORS = ['#C94D6D', '#4B7B4A', '#6E54A3', '#C9633B', '#2D6F95', '#8C6D62'];
const DOMAINS: { value: LifeDomain; label: string }[] = [
  { value: 'study', label: 'Study' },
  { value: 'career', label: 'Career' },
  { value: 'projects', label: 'Projects' },
  { value: 'personal', label: 'Personal' },
  { value: 'creative', label: 'Creative' },
  { value: 'rest', label: 'Rest & Breaks' },
];

export function MyDayView() {
  const {
    preferences,
    todayDate,
    areas,
    tasks,
    studySchedules,
    dailySchedules,
    dailyTemplates,
    saveScheduleBlock,
    toggleScheduleBlockComplete,
    deleteScheduleBlock,
    saveDailyTemplate,
    deleteDailyTemplate,
    saveTask,
    updatePreferences,
  } = useData();

  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [viewMode, setViewMode] = useState<'timeline' | 'agenda'>('timeline');
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<{
    conflicts: DailyScheduleBlock[];
    pendingDraft: Omit<DailyScheduleBlock, 'id' | 'userId'> & { id?: string };
  } | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<DailyScheduleBlock | null>(null);
  const [dismissedMissedIds, setDismissedMissedIds] = useState<string[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState(areas[0]?.name || 'Study');
  const [color, setColor] = useState(areas[0]?.color || BLOCK_COLORS[0]);
  const [lifeDomain, setLifeDomain] = useState<LifeDomain>('study');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [isBreak, setIsBreak] = useState(false);
  const [isUnexpected, setIsUnexpected] = useState(false);
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(0);
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [linkedStudyId, setLinkedStudyId] = useState('');
  const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([]);

  const dayBlocks = useMemo(() => getBlocksForDate(dailySchedules, selectedDate), [dailySchedules, selectedDate]);
  const currentMinutes = getCurrentMinutesInTimezone(new Date(), preferences.timezone);
  const missedBlocks = useMemo(() => {
    if (selectedDate !== todayDate) return [];
    return getMissedBlocks(dayBlocks, currentMinutes).filter((b) => !dismissedMissedIds.includes(b.id));
  }, [selectedDate, todayDate, dayBlocks, currentMinutes, dismissedMissedIds]);

  const hoursList = useMemo(() => {
    const start = Math.max(0, preferences.dayStartHour);
    const end = Math.min(24, Math.max(start + 1, preferences.dayEndHour));
    const arr: number[] = [];
    for (let h = start; h <= end; h++) arr.push(h);
    return arr;
  }, [preferences.dayStartHour, preferences.dayEndHour]);

  const openNewBlock = (presetHour?: number, asBreak = false) => {
    const s = presetHour !== undefined ? minutesToTime24(presetHour * 60) : '09:00';
    const e = presetHour !== undefined ? minutesToTime24(presetHour * 60 + (asBreak ? 15 : 60)) : asBreak ? '09:15' : '10:00';
    setEditingId(null);
    setTitle(asBreak ? 'Rest Break' : '');
    setStartTime(s);
    setEndTime(e);
    setCategory(asBreak ? 'Rest' : areas[0]?.name || 'Study');
    setColor(asBreak ? '#4B7B4A' : areas[0]?.color || BLOCK_COLORS[0]);
    setLifeDomain(asBreak ? 'rest' : areas[0]?.lifeDomain || 'study');
    setPriority('medium');
    setIsBreak(asBreak);
    setIsUnexpected(false);
    setNotes('');
    setReminderMinutes(0);
    setLinkedTaskId('');
    setLinkedStudyId('');
    setRecurringWeekdays([]);
    setShowEditor(true);
  };

  const openEditBlock = (block: DailyScheduleBlock) => {
    setEditingId(block.id);
    setTitle(block.title);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setCategory(block.category);
    setColor(block.color);
    setLifeDomain(block.lifeDomain || 'personal');
    setPriority(block.priority);
    setIsBreak(block.isBreak);
    setIsUnexpected(Boolean(block.isUnexpected));
    setNotes(block.notes || '');
    setReminderMinutes(block.reminderMinutes || 0);
    setLinkedTaskId(block.linkedTaskId || '');
    setLinkedStudyId(block.linkedStudyId || '');
    setRecurringWeekdays(block.recurringWeekdays || []);
    setShowEditor(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationMinutes = calculateDurationMinutes(startTime, endTime);
    if (!title.trim() || durationMinutes <= 0) {
      setNotice('Please provide a title and ensure the end time is after the start time.');
      return;
    }

    const draft: Omit<DailyScheduleBlock, 'id' | 'userId'> & { id?: string } = {
      ...(editingId ? { id: editingId } : {}),
      date: selectedDate,
      title: title.trim(),
      startTime,
      endTime,
      durationMinutes,
      category: category.trim() || 'Personal',
      color,
      lifeDomain: isBreak ? 'rest' : lifeDomain,
      notes: notes.trim(),
      completed: editingId ? dailySchedules.find((b) => b.id === editingId)?.completed || false : false,
      completedAt: editingId ? dailySchedules.find((b) => b.id === editingId)?.completedAt || '' : '',
      priority,
      isBreak,
      isUnexpected,
      actualDurationMinutes: 0,
      reminderMinutes,
      linkedTaskId,
      linkedStudyId,
      recurringWeekdays,
    };

    const conflicts = findOverlappingBlocks({ date: selectedDate, startTime, endTime, id: editingId || undefined }, dayBlocks);
    if (conflicts.length > 0) {
      setOverlapWarning({ conflicts, pendingDraft: draft });
      return;
    }

    await saveScheduleBlock(draft);
    setShowEditor(false);
    setNotice(editingId ? 'Schedule block updated.' : 'Added block to My Day.');
  };

  const confirmOverlapSave = async () => {
    if (!overlapWarning) return;
    await saveScheduleBlock(overlapWarning.pendingDraft);
    setOverlapWarning(null);
    setShowEditor(false);
    setNotice('Saved overlapping block as requested.');
  };

  const handleDropOnHour = async (hour: number) => {
    if (!draggedId) return;
    const block = dayBlocks.find((b) => b.id === draggedId);
    setDraggedId(null);
    if (!block) return;

    const newStart = minutesToTime24(hour * 60);
    const newEnd = minutesToTime24(hour * 60 + block.durationMinutes);
    const conflicts = findOverlappingBlocks({ date: selectedDate, startTime: newStart, endTime: newEnd, id: block.id }, dayBlocks);
    const draft = { ...block, date: selectedDate, startTime: newStart, endTime: newEnd };
    if (conflicts.length > 0) {
      setOverlapWarning({ conflicts, pendingDraft: draft });
      return;
    }
    await saveScheduleBlock(draft);
    setNotice(`Moved "${block.title}" to ${formatTimeDisplay(newStart, preferences.timeFormat)}.`);
  };

  const shiftBlockTime = async (block: DailyScheduleBlock, deltaMins: number) => {
    const start = Math.max(0, Math.min(23 * 60 + 45, parseTimeToMinutes(block.startTime) + deltaMins));
    const end = Math.min(24 * 60 - 1, start + block.durationMinutes);
    const newStart = minutesToTime24(start);
    const newEnd = minutesToTime24(end);
    const conflicts = findOverlappingBlocks({ date: selectedDate, startTime: newStart, endTime: newEnd, id: block.id }, dayBlocks);
    const draft = { ...block, date: selectedDate, startTime: newStart, endTime: newEnd };
    if (conflicts.length > 0) {
      setOverlapWarning({ conflicts, pendingDraft: draft });
      return;
    }
    await saveScheduleBlock(draft);
  };

  const copyYesterdayPlan = async () => {
    const yesterday = shiftDateString(selectedDate, -1);
    const yesterdayBlocks = getBlocksForDate(dailySchedules, yesterday);
    if (yesterdayBlocks.length === 0) {
      setNotice(`No blocks found on ${yesterday} to copy.`);
      return;
    }
    for (const b of yesterdayBlocks) {
      await saveScheduleBlock({
        ...b,
        id: undefined,
        date: selectedDate,
        completed: false,
        completedAt: '',
        actualDurationMinutes: 0,
        recurringWeekdays: [],
      });
    }
    setNotice(`Copied ${yesterdayBlocks.length} blocks from ${yesterday}.`);
  };

  const duplicateToTomorrow = async () => {
    if (dayBlocks.length === 0) {
      setNotice('Add at least one block before duplicating to tomorrow.');
      return;
    }
    const tomorrow = shiftDateString(selectedDate, 1);
    for (const b of dayBlocks) {
      await saveScheduleBlock({
        ...b,
        id: undefined,
        date: tomorrow,
        completed: false,
        completedAt: '',
        actualDurationMinutes: 0,
        recurringWeekdays: [],
      });
    }
    setNotice(`Duplicated ${dayBlocks.length} blocks to ${tomorrow}.`);
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || dayBlocks.length === 0) return;
    await saveDailyTemplate({
      name: templateName.trim(),
      blocks: dayBlocks.map((b) => ({
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        category: b.category,
        color: b.color,
        lifeDomain: b.lifeDomain,
        priority: b.priority,
        isBreak: b.isBreak,
        notes: b.notes,
      })),
    });
    setTemplateName('');
    setTemplateModalOpen(false);
    setNotice('Saved reusable daily template.');
  };

  const applyTemplate = async (tplId: string) => {
    const tpl = dailyTemplates.find((t) => t.id === tplId);
    if (!tpl) return;
    for (const item of tpl.blocks) {
      await saveScheduleBlock({
        date: selectedDate,
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMinutes: calculateDurationMinutes(item.startTime, item.endTime) || 30,
        category: item.category,
        color: item.color,
        lifeDomain: item.lifeDomain,
        notes: item.notes || '',
        completed: false,
        completedAt: '',
        priority: item.priority,
        isBreak: item.isBreak,
        isUnexpected: false,
        actualDurationMinutes: 0,
        reminderMinutes: 0,
        linkedTaskId: '',
        linkedStudyId: '',
        recurringWeekdays: [],
      });
    }
    setTemplateModalOpen(false);
    setNotice(`Applied template "${tpl.name}" to ${selectedDate}.`);
  };

  // Gentle Rescheduler actions
  const rescheduleLaterToday = async (block: DailyScheduleBlock) => {
    const slot = findNextAvailableSlot(
      block.durationMinutes,
      dayBlocks.filter((b) => b.id !== block.id),
      preferences.dayStartHour,
      preferences.dayEndHour,
      currentMinutes
    );
    if (!slot) {
      setNotice('No open slot left today — try moving it to tomorrow or keeping it in backlog.');
      return;
    }
    await saveScheduleBlock({ ...block, startTime: slot.startTime, endTime: slot.endTime });
    setRescheduleTarget(null);
    setNotice(`Moved "${block.title}" to ${formatTimeDisplay(slot.startTime, preferences.timeFormat)}.`);
  };

  const moveBlockToTomorrow = async (block: DailyScheduleBlock) => {
    const tomorrow = shiftDateString(selectedDate, 1);
    await saveScheduleBlock({ ...block, date: tomorrow, completed: false, completedAt: '' });
    setRescheduleTarget(null);
    setNotice(`Moved "${block.title}" to tomorrow (${tomorrow}).`);
  };

  const breakBlockIntoSubtasks = async (block: DailyScheduleBlock) => {
    const parts = splitTaskTitleIntoSubtasks(block.title);
    for (const part of parts) {
      await saveTask({
        title: part,
        notes: `Broken down from scheduled block (${block.title})`,
        areaId: '',
        areaName: block.category,
        priority: block.priority,
        dueDate: selectedDate,
        dueTime: '',
        completed: false,
        completedAt: '',
        backlog: false,
      });
    }
    await deleteScheduleBlock(block.id);
    setRescheduleTarget(null);
    setNotice(`Created 3 smaller tasks from "${block.title}" in Tasks.`);
  };

  const moveBlockToBacklog = async (block: DailyScheduleBlock) => {
    await saveTask({
      title: block.title,
      notes: block.notes,
      areaId: '',
      areaName: block.category,
      priority: block.priority,
      dueDate: '',
      dueTime: '',
      completed: false,
      completedAt: '',
      backlog: true,
    });
    await deleteScheduleBlock(block.id);
    setRescheduleTarget(null);
    setNotice(`Moved "${block.title}" to your task backlog.`);
  };

  const workDone = dayBlocks.filter((b) => !b.isBreak && b.completed).length;
  const workTotal = dayBlocks.filter((b) => !b.isBreak).length;

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <section className="cs-card rounded-3xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <WashiLabel>My Day Timeline</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">
              {selectedDate === todayDate ? 'Today' : selectedDate === shiftDateString(todayDate, 1) ? 'Tomorrow' : selectedDate}
            </h1>
            <p className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
              {selectedDate} · {workDone}/{workTotal} blocks completed · {preferences.timezone}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateString(selectedDate, -1))}
              aria-label="Previous day"
              className="p-2.5 rounded-xl cs-surface-muted cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayDate)}
              className="px-3 py-2 rounded-xl cs-surface-muted text-xs font-medium cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateString(selectedDate, 1))}
              aria-label="Next day"
              className="p-2.5 rounded-xl cs-surface-muted cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => openNewBlock(9, false)}
              className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add block
            </button>
            <button
              type="button"
              onClick={() => openNewBlock(12, true)}
              className="cs-surface-muted px-3.5 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Coffee className="w-4 h-4" /> Add break
            </button>
          </div>
        </div>

        {/* Secondary schedule tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'var(--cs-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl cs-surface-muted text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer ${viewMode === 'timeline' ? 'cs-btn-primary' : ''}`}
              >
                Hour Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer ${viewMode === 'agenda' ? 'cs-btn-primary' : ''}`}
              >
                Compact Agenda
              </button>
            </div>

            <button
              type="button"
              onClick={() => updatePreferences({ timeFormat: preferences.timeFormat === '12h' ? '24h' : '12h' })}
              className="px-3 py-1.5 rounded-xl cs-surface-muted text-xs font-medium cursor-pointer font-mono-num"
            >
              {preferences.timeFormat === '12h' ? '12h format' : '24h format'}
            </button>

            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              <label htmlFor="day-start-sel">Day:</label>
              <select
                id="day-start-sel"
                value={preferences.dayStartHour}
                onChange={(e) => updatePreferences({ dayStartHour: Number(e.target.value) })}
                className="cs-input px-2 py-1 rounded-lg text-xs font-mono-num"
              >
                {Array.from({ length: 13 }, (_, i) => i + 4).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span>to</span>
              <select
                aria-label="Day end hour"
                value={preferences.dayEndHour}
                onChange={(e) => updatePreferences({ dayEndHour: Number(e.target.value) })}
                className="cs-input px-2 py-1 rounded-lg text-xs font-mono-num"
              >
                {Array.from({ length: 10 }, (_, i) => i + 15).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={copyYesterdayPlan}
              className="px-3 py-1.5 rounded-xl cs-surface-muted font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy yesterday
            </button>
            <button
              type="button"
              onClick={duplicateToTomorrow}
              className="px-3 py-1.5 rounded-xl cs-surface-muted font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> Plan tomorrow
            </button>
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl cs-surface-muted font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" /> Templates ({dailyTemplates.length})
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-3 rounded-xl cs-surface-muted text-xs flex items-center justify-between gap-2">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* Gentle Rescheduler Banner for missed blocks */}
      {missedBlocks.length > 0 && (
        <section className="cs-card rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
              <h2 className="font-display text-base font-semibold">
                Gentle Rescheduler · {missedBlocks.length} earlier {missedBlocks.length === 1 ? 'block' : 'blocks'} still open
              </h2>
            </div>
            <span className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              No pressure—decide what feels right
            </span>
          </div>
          <div className="space-y-2">
            {missedBlocks.map((mb) => (
              <div key={mb.id} className="cs-surface-muted rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{mb.title}</div>
                  <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                    Was {formatTimeDisplay(mb.startTime, preferences.timeFormat)} –{' '}
                    {formatTimeDisplay(mb.endTime, preferences.timeFormat)} ({formatDuration(mb.durationMinutes)})
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleTarget(mb)}
                    className="cs-btn-primary px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Choose option
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedMissedIds((prev) => [...prev, mb.id])}
                    className="px-3 py-1.5 rounded-xl cs-surface-muted text-xs cursor-pointer"
                  >
                    Leave as-is
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline or Compact Agenda */}
      {viewMode === 'agenda' ? (
        <section className="cs-card rounded-3xl p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">Agenda for {selectedDate}</h2>
          {dayBlocks.length === 0 ? (
            <div className="cs-surface-muted rounded-2xl p-8 text-center space-y-3">
              <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
                Your day is open. Add a focus block, break, or apply one of your saved templates.
              </p>
              <button
                type="button"
                onClick={() => openNewBlock(9, false)}
                className="cs-btn-primary px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
              >
                Add first time block
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayBlocks.map((block) => (
                <div
                  key={block.id}
                  className="cs-surface-muted rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleScheduleBlockComplete(block)}
                      aria-label={`Toggle completion for ${block.title}`}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                        block.completed ? 'animate-cs-check' : ''
                      }`}
                      style={{
                        borderColor: block.color,
                        backgroundColor: block.completed ? block.color : 'transparent',
                        color: '#fff',
                      }}
                    >
                      {block.completed && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${block.completed ? 'line-through opacity-70' : ''}`}>
                        {block.title}
                      </div>
                      <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                        {formatTimeDisplay(block.startTime, preferences.timeFormat)} –{' '}
                        {formatTimeDisplay(block.endTime, preferences.timeFormat)} · {formatDuration(block.durationMinutes)} ·{' '}
                        {block.category} · {block.priority} priority
                      </div>
                      {block.notes && (
                        <p className="text-xs mt-1" style={{ color: 'var(--cs-text-muted)' }}>
                          {block.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => shiftBlockTime(block, -30)}
                      aria-label={`Move ${block.title} 30 minutes earlier`}
                      className="p-2 rounded-xl cs-card cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftBlockTime(block, 30)}
                      aria-label={`Move ${block.title} 30 minutes later`}
                      className="p-2 rounded-xl cs-card cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditBlock(block)}
                      aria-label={`Edit ${block.title}`}
                      className="p-2 rounded-xl cs-card cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteScheduleBlock(block.id)}
                      aria-label={`Delete ${block.title}`}
                      className="p-2 rounded-xl cs-card cursor-pointer text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="cs-card rounded-3xl p-4 sm:p-6 space-y-2">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              Drag blocks onto an hour row on desktop, or use arrow controls on mobile to reschedule
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--cs-border)' }}>
            {hoursList.map((hour) => {
              const hourBlocks = dayBlocks.filter((b) => Math.floor(parseTimeToMinutes(b.startTime) / 60) === hour);
              const hourLabel = formatTimeDisplay(`${String(hour).padStart(2, '0')}:00`, preferences.timeFormat);

              return (
                <div
                  key={hour}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnHour(hour)}
                  className="grid grid-cols-12 gap-3 py-3 min-h-[64px] items-start transition-colors"
                  style={{ borderColor: 'var(--cs-border)' }}
                >
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-between pr-2">
                    <span className="font-mono-num text-xs font-medium" style={{ color: 'var(--cs-text-muted)' }}>
                      {hourLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => openNewBlock(hour, false)}
                      aria-label={`Add block at ${hourLabel}`}
                      className="p-1 rounded-lg hover:opacity-80 cursor-pointer"
                      style={{ color: 'var(--cs-accent)' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="col-span-9 sm:col-span-10 space-y-2">
                    {hourBlocks.map((block) => (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={() => setDraggedId(block.id)}
                        className="cs-surface-muted rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 transition-all"
                        style={{
                          borderColor: block.color || 'var(--cs-border)',
                          opacity: block.completed ? 0.72 : 1,
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <GripVertical className="w-4 h-4 hidden sm:block opacity-45 shrink-0 cursor-grab" />
                          <button
                            type="button"
                            onClick={() => toggleScheduleBlockComplete(block)}
                            aria-label={`Mark ${block.title} ${block.completed ? 'incomplete' : 'complete'}`}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                              block.completed ? 'animate-cs-check' : ''
                            }`}
                            style={{
                              borderColor: block.color || 'var(--cs-accent)',
                              backgroundColor: block.completed ? block.color || 'var(--cs-accent)' : 'transparent',
                              color: '#fff',
                            }}
                          >
                            {block.completed && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold truncate ${block.completed ? 'line-through' : ''}`}>
                              {block.title}
                            </div>
                            <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                              {formatTimeDisplay(block.startTime, preferences.timeFormat)} –{' '}
                              {formatTimeDisplay(block.endTime, preferences.timeFormat)} ·{' '}
                              {formatDuration(block.durationMinutes)} · {block.category}
                              {block.recurringWeekdays?.length ? ' · Recurring' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => shiftBlockTime(block, -30)}
                            aria-label={`Move ${block.title} 30 minutes earlier`}
                            className="p-1.5 rounded-lg cs-card cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => shiftBlockTime(block, 30)}
                            aria-label={`Move ${block.title} 30 minutes later`}
                            className="p-1.5 rounded-lg cs-card cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditBlock(block)}
                            aria-label={`Edit ${block.title}`}
                            className="p-1.5 rounded-lg cs-card cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteScheduleBlock(block.id)}
                            aria-label={`Delete ${block.title}`}
                            className="p-1.5 rounded-lg cs-card cursor-pointer text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Add / Edit Schedule Block Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="cs-card max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                {editingId ? 'Edit schedule block' : 'New schedule block'}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="text-xs underline cursor-pointer"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="blk-title" className="block text-xs font-medium">
                  Block title
                </label>
                <input
                  id="blk-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Study DBMS, Project build, Lunch..."
                  className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="blk-start" className="block text-xs font-medium">
                    Start time
                  </label>
                  <input
                    id="blk-start"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="blk-end" className="block text-xs font-medium">
                    End time
                  </label>
                  <input
                    id="blk-end"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                  />
                </div>
              </div>

              <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                Calculated duration: {formatDuration(calculateDurationMinutes(startTime, endTime))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="blk-cat" className="block text-xs font-medium">
                    Category
                  </label>
                  <input
                    id="blk-cat"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    list="clearspace-areas-datalist"
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm"
                  />
                  <datalist id="clearspace-areas-datalist">
                    {areas.map((a) => (
                      <option key={a.id} value={a.name} />
                    ))}
                    <option value="Study" />
                    <option value="Career" />
                    <option value="Projects" />
                    <option value="Personal" />
                    <option value="Rest" />
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="blk-domain" className="block text-xs font-medium">
                    Life balance area
                  </label>
                  <select
                    id="blk-domain"
                    value={isBreak ? 'rest' : lifeDomain}
                    onChange={(e) => setLifeDomain(e.target.value as LifeDomain)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="blk-priority" className="block text-xs font-medium">
                    Priority
                  </label>
                  <select
                    id="blk-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="blk-rem" className="block text-xs font-medium">
                    Reminder (mins before)
                  </label>
                  <input
                    id="blk-rem"
                    type="number"
                    min={0}
                    max={120}
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Number(e.target.value) || 0)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                  />
                </div>
              </div>

              {/* Color Swatches */}
              <div className="space-y-1.5">
                <span className="block text-xs font-medium">Block colour</span>
                <div className="flex items-center gap-2">
                  {BLOCK_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Select colour ${c}`}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                        color === c ? 'scale-110 ring-2 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Optional Task or Study link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="blk-task-link" className="block text-xs font-medium">
                    Link task (optional)
                  </label>
                  <select
                    id="blk-task-link"
                    value={linkedTaskId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLinkedTaskId(val);
                      const t = tasks.find((tk) => tk.id === val);
                      if (t && !title.trim()) setTitle(t.title);
                    }}
                    className="cs-input w-full px-3 py-2 rounded-xl text-xs"
                  >
                    <option value="">None</option>
                    {tasks
                      .filter((t) => !t.completed)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="blk-study-link" className="block text-xs font-medium">
                    Link study module (optional)
                  </label>
                  <select
                    id="blk-study-link"
                    value={linkedStudyId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLinkedStudyId(val);
                      const s = studySchedules.find((st) => st.id === val);
                      if (s && !title.trim()) setTitle(`Study ${s.subject}`);
                    }}
                    className="cs-input w-full px-3 py-2 rounded-xl text-xs"
                  >
                    <option value="">None</option>
                    {studySchedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject} {s.moduleName ? `· ${s.moduleName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurring Weekdays */}
              <div className="space-y-1.5">
                <span className="block text-xs font-medium">Repeat on weekdays (optional)</span>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day, idx) => {
                    const active = recurringWeekdays.includes(idx);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setRecurringWeekdays((prev) =>
                            prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                          active ? 'cs-btn-primary' : 'cs-surface-muted'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)} />
                  Mark as break / rest
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isUnexpected} onChange={(e) => setIsUnexpected(e.target.checked)} />
                  Unexpected activity (for Day Echo)
                </label>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="blk-notes" className="block text-xs font-medium">
                  Notes
                </label>
                <textarea
                  id="blk-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key focus, chapters, or gentle reminders..."
                  className="cs-input w-full px-3.5 py-2 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 rounded-xl cs-surface-muted text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="cs-btn-primary px-5 py-2 rounded-xl text-sm font-medium cursor-pointer">
                  {editingId ? 'Save changes' : 'Add to My Day'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overlap Warning Modal */}
      {overlapWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-display text-lg font-semibold">Schedule overlap noticed</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
              This time overlaps with:
            </p>
            <ul className="space-y-1.5 text-xs">
              {overlapWarning.conflicts.map((c) => (
                <li key={c.id} className="cs-surface-muted p-2.5 rounded-xl font-medium">
                  {c.title} ({formatTimeDisplay(c.startTime, preferences.timeFormat)} –{' '}
                  {formatTimeDisplay(c.endTime, preferences.timeFormat)})
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverlapWarning(null)}
                className="px-4 py-2 rounded-xl cs-surface-muted text-sm font-medium cursor-pointer"
              >
                Adjust time
              </button>
              <button
                type="button"
                onClick={confirmOverlapSave}
                className="cs-btn-primary px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
              >
                Keep overlap anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gentle Rescheduler Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-xl font-semibold">What would you like to do with &ldquo;{rescheduleTarget.title}&rdquo;?</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
              Plans change—you stay in control of what moves forward and what gets lightened.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => rescheduleLaterToday(rescheduleTarget)}
                className="w-full text-left cs-surface-muted p-3 rounded-xl text-sm font-medium hover:opacity-90 cursor-pointer flex items-center gap-2"
              >
                <Clock className="w-4 h-4" /> Reschedule to next open slot today
              </button>
              <button
                type="button"
                onClick={() => moveBlockToTomorrow(rescheduleTarget)}
                className="w-full text-left cs-surface-muted p-3 rounded-xl text-sm font-medium hover:opacity-90 cursor-pointer flex items-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" /> Move to tomorrow
              </button>
              <button
                type="button"
                onClick={() => breakBlockIntoSubtasks(rescheduleTarget)}
                className="w-full text-left cs-surface-muted p-3 rounded-xl text-sm font-medium hover:opacity-90 cursor-pointer flex items-center gap-2"
              >
                <Layers className="w-4 h-4" /> Break into 3 smaller tasks
              </button>
              <button
                type="button"
                onClick={() => moveBlockToBacklog(rescheduleTarget)}
                className="w-full text-left cs-surface-muted p-3 rounded-xl text-sm font-medium hover:opacity-90 cursor-pointer"
              >
                Keep unscheduled in task backlog
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteScheduleBlock(rescheduleTarget.id);
                  setRescheduleTarget(null);
                  setNotice('Removed block from today’s plan.');
                }}
                className="w-full text-left p-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 cs-surface-muted cursor-pointer"
              >
                Remove from plan
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="text-xs underline cursor-pointer"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">Reusable daily templates</h3>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="text-xs underline cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveAsTemplate} className="flex gap-2">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Save today as template (e.g. Deep Study Day)"
                className="cs-input flex-1 px-3 py-2 rounded-xl text-xs"
              />
              <button
                type="submit"
                disabled={!templateName.trim() || dayBlocks.length === 0}
                className="cs-btn-primary px-3 py-2 rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                Save
              </button>
            </form>

            {dailyTemplates.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                No templates saved yet. Build a day you like above and save it as a reusable template.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dailyTemplates.map((tpl) => (
                  <div key={tpl.id} className="cs-surface-muted rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{tpl.name}</div>
                      <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                        {tpl.blocks.length} blocks
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyTemplate(tpl.id)}
                        className="cs-btn-primary px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDailyTemplate(tpl.id)}
                        aria-label={`Delete template ${tpl.name}`}
                        className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
