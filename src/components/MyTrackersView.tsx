import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import {
  CustomTracker,
  CustomTrackerEntry,
  TrackerCategory,
  TrackerChecklistItemValue,
  TrackerFieldDefinition,
  TrackerFieldType,
  TrackerFrequency,
  TrackerGoal,
  TrackerGoalPeriod,
} from '../types/clearspace';
import { generateId } from '../utils/logic';
import {
  computeTrackerAnalytics,
  FIELD_TYPE_META,
  instantiateTemplateFields,
  safeUpdateTrackerFields,
  TRACKER_TEMPLATES,
  TrackerTemplate,
} from '../utils/trackers';
import { WashiLabel } from './ScrapbookAccents';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  History,
  LayoutGrid,
  Pin,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';

type TrackerDetailTab = 'overview' | 'calendar' | 'history' | 'analytics' | 'settings';

const TRACKER_EMOJIS = ['🏋️', '🏏', '🏃', '🎨', '🎸', '📚', '📷', '🧘', '💧', '🌱', '✍️', '✨'];
const TRACKER_COLORS = ['#C94D6D', '#4B7B4A', '#6E54A3', '#C9633B', '#2D6F95', '#8C6D62'];
const CATEGORY_LABELS: { id: TrackerCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gym', label: 'Gym' },
  { id: 'sports', label: 'Sports' },
  { id: 'hobbies', label: 'Hobbies' },
  { id: 'study', label: 'Study' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'custom', label: 'Custom' },
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildMonthGrid(yearMonth: string): { date: string; inMonth: boolean }[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = offset - 1; i >= 0; i--) {
    cells.push({ date: new Date(Date.UTC(y, m - 1, -i)).toISOString().slice(0, 10), inMonth: false });
  }
  for (let d = 1; d <= days; d++) {
    cells.push({ date: new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const [ly, lm, ld] = cells[cells.length - 1].date.split('-').map(Number);
    cells.push({ date: new Date(Date.UTC(ly, lm - 1, ld + 1)).toISOString().slice(0, 10), inMonth: false });
  }
  return cells;
}

function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function MyTrackersView({
  initialSelectedTrackerId,
  onClearInitialSelection,
}: {
  initialSelectedTrackerId?: string | null;
  onClearInitialSelection?: () => void;
}) {
  const {
    todayDate,
    customTrackers,
    customTrackerEntries,
    trackerGoals,
    saveCustomTracker,
    deleteCustomTracker,
    saveCustomTrackerEntry,
    deleteCustomTrackerEntry,
    saveTrackerGoal,
    deleteTrackerGoal,
  } = useData();

  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(initialSelectedTrackerId || null);
  const [detailTab, setDetailTab] = useState<TrackerDetailTab>('overview');
  const [categoryFilter, setCategoryFilter] = useState<TrackerCategory | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedTrackerId) {
      setSelectedTrackerId(initialSelectedTrackerId);
      setDetailTab('overview');
    }
  }, [initialSelectedTrackerId]);

  const activeTracker = useMemo(
    () => customTrackers.find((t) => t.id === selectedTrackerId) || null,
    [customTrackers, selectedTrackerId]
  );

  // Create/Edit Tracker Builder Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTrackerId, setEditingTrackerId] = useState<string | null>(null);
  const [trName, setTrName] = useState('');
  const [trDesc, setTrDesc] = useState('');
  const [trEmoji, setTrEmoji] = useState('🏋️');
  const [trColor, setTrColor] = useState(TRACKER_COLORS[0]);
  const [trCategory, setTrCategory] = useState<TrackerCategory>('gym');
  const [trCustomCatLabel, setTrCustomCatLabel] = useState('');
  const [trFrequency, setTrFrequency] = useState<TrackerFrequency>('flexible');
  const [trCustomDays, setTrCustomDays] = useState<number[]>([1, 3, 5]);
  const [trStartDate, setTrStartDate] = useState(todayDate);
  const [trShowDashboard, setTrShowDashboard] = useState(true);
  const [trPinned, setTrPinned] = useState(false);
  const [trPrivate, setTrPrivate] = useState(false);
  const [trFields, setTrFields] = useState<TrackerFieldDefinition[]>([]);
  const [pendingSuggestedGoal, setPendingSuggestedGoal] = useState<TrackerTemplate['suggestedGoal'] | null>(null);

  // Quick new field inputs inside builder
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<TrackerFieldType>('number');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [newFieldOptionsText, setNewFieldOptionsText] = useState('');

  // Confirm delete tracker modal
  const [deleteTarget, setDeleteTarget] = useState<CustomTracker | null>(null);
  const [deleteEntriesToo, setDeleteEntriesToo] = useState(true);

  const openFromTemplate = (tpl: TrackerTemplate) => {
    setEditingTrackerId(null);
    setTrName(tpl.id === 'tpl_custom' ? '' : tpl.name);
    setTrDesc(tpl.description);
    setTrEmoji(tpl.emoji);
    setTrColor(tpl.color);
    setTrCategory(tpl.category);
    setTrCustomCatLabel('');
    setTrFrequency(tpl.frequency);
    setTrCustomDays([1, 3, 5]);
    setTrStartDate(todayDate);
    setTrShowDashboard(true);
    setTrPinned(false);
    setTrPrivate(false);
    setTrFields(instantiateTemplateFields(tpl));
    setPendingSuggestedGoal(tpl.suggestedGoal || null);
    setBuilderOpen(true);
  };

  const openEditTracker = (tracker: CustomTracker) => {
    setEditingTrackerId(tracker.id);
    setTrName(tracker.name);
    setTrDesc(tracker.description);
    setTrEmoji(tracker.emoji);
    setTrColor(tracker.color);
    setTrCategory(tracker.category);
    setTrCustomCatLabel(tracker.customCategoryLabel || '');
    setTrFrequency(tracker.frequency);
    setTrCustomDays(tracker.customDays || []);
    setTrStartDate(tracker.startDate || todayDate);
    setTrShowDashboard(tracker.showOnDashboard);
    setTrPinned(tracker.pinned);
    setTrPrivate(tracker.isPrivate);
    setTrFields(tracker.fields.filter((f) => !f.archived));
    setPendingSuggestedGoal(null);
    setBuilderOpen(true);
  };

  const handleAddBuilderField = () => {
    if (!newFieldLabel.trim()) return;
    const needsOpts = ['dropdown', 'multiselect', 'checklist'].includes(newFieldType);
    const options = needsOpts
      ? newFieldOptionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const field: TrackerFieldDefinition = {
      id: generateId('fld'),
      label: newFieldLabel.trim(),
      type: newFieldType,
      unit: ['measurement', 'number', 'duration'].includes(newFieldType) ? newFieldUnit.trim() : '',
      options: needsOpts && options.length === 0 ? ['Option 1', 'Option 2'] : options,
    };
    setTrFields((prev) => [...prev, field]);
    setNewFieldLabel('');
    setNewFieldUnit('');
    setNewFieldOptionsText('');
  };

  const moveBuilderField = (index: number, dir: -1 | 1) => {
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= trFields.length) return;
    const copy = [...trFields];
    const [removed] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, removed);
    setTrFields(copy);
  };

  const handleSaveTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trName.trim()) return;
    const existing = editingTrackerId ? customTrackers.find((t) => t.id === editingTrackerId) : undefined;
    const mergedFields = existing ? safeUpdateTrackerFields(existing.fields, trFields) : trFields;

    const savedId = await saveCustomTracker({
      ...(editingTrackerId ? { id: editingTrackerId } : {}),
      name: trName.trim(),
      description: trDesc.trim(),
      emoji: trEmoji || '✨',
      color: trColor,
      category: trCategory,
      customCategoryLabel: trCategory === 'custom' ? trCustomCatLabel.trim() : '',
      frequency: trFrequency,
      customDays: trFrequency === 'custom_days' ? trCustomDays : [],
      startDate: trStartDate,
      fields: mergedFields,
      archived: existing?.archived || false,
      showOnDashboard: trShowDashboard,
      pinned: trPinned,
      isPrivate: trPrivate,
      reminderEnabled: existing?.reminderEnabled || false,
      reminderTime: existing?.reminderTime || '',
    });

    if (!editingTrackerId && pendingSuggestedGoal) {
      await saveTrackerGoal({
        trackerId: savedId,
        title: pendingSuggestedGoal.title,
        period: pendingSuggestedGoal.period,
        targetValue: pendingSuggestedGoal.targetValue,
        unit: pendingSuggestedGoal.unit,
        fieldId: '',
        allowRestDays: true,
        restDayAllowancePerWeek: 2,
        paused: false,
      });
    }

    setBuilderOpen(false);
    setSelectedTrackerId(savedId);
    setDetailTab('overview');
    setNotice(editingTrackerId ? 'Tracker schema updated (historical entries preserved).' : `Created "${trName.trim()}".`);
  };

  const visibleTrackers = useMemo(() => {
    return customTrackers
      .filter((t) => (showArchived ? true : !t.archived))
      .filter((t) => (categoryFilter === 'all' ? true : t.category === categoryFilter))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
  }, [customTrackers, showArchived, categoryFilter]);

  // ============================================================
  // TRACKER DETAIL VIEW
  // ============================================================
  if (activeTracker) {
    return (
      <TrackerDetailWorkspace
        tracker={activeTracker}
        todayDate={todayDate}
        entries={customTrackerEntries.filter((e) => e.trackerId === activeTracker.id)}
        goals={trackerGoals.filter((g) => g.trackerId === activeTracker.id)}
        tab={detailTab}
        onTabChange={setDetailTab}
        onBack={() => {
          setSelectedTrackerId(null);
          onClearInitialSelection?.();
        }}
        onEditTracker={() => openEditTracker(activeTracker)}
        onSaveTracker={saveCustomTracker}
        onDeleteTracker={() => {
          setDeleteEntriesToo(true);
          setDeleteTarget(activeTracker);
        }}
        onSaveEntry={saveCustomTrackerEntry}
        onDeleteEntry={deleteCustomTrackerEntry}
        onSaveGoal={saveTrackerGoal}
        onDeleteGoal={deleteTrackerGoal}
        notice={notice}
        setNotice={setNotice}
        deleteModal={
          deleteTarget && (
            <DeleteTrackerModal
              tracker={deleteTarget}
              deleteEntriesToo={deleteEntriesToo}
              setDeleteEntriesToo={setDeleteEntriesToo}
              onCancel={() => setDeleteTarget(null)}
              onConfirm={async () => {
                await deleteCustomTracker(deleteTarget.id, deleteEntriesToo);
                setDeleteTarget(null);
                setSelectedTrackerId(null);
                onClearInitialSelection?.();
                setNotice(`Deleted "${deleteTarget.name}".`);
              }}
            />
          )
        }
        builderModal={
          builderOpen && (
            <TrackerBuilderModal
              editingTrackerId={editingTrackerId}
              trName={trName}
              setTrName={setTrName}
              trDesc={trDesc}
              setTrDesc={setTrDesc}
              trEmoji={trEmoji}
              setTrEmoji={setTrEmoji}
              trColor={trColor}
              setTrColor={setTrColor}
              trCategory={trCategory}
              setTrCategory={setTrCategory}
              trCustomCatLabel={trCustomCatLabel}
              setTrCustomCatLabel={setTrCustomCatLabel}
              trFrequency={trFrequency}
              setTrFrequency={setTrFrequency}
              trCustomDays={trCustomDays}
              setTrCustomDays={setTrCustomDays}
              trStartDate={trStartDate}
              setTrStartDate={setTrStartDate}
              trShowDashboard={trShowDashboard}
              setTrShowDashboard={setTrShowDashboard}
              trPinned={trPinned}
              setTrPinned={setTrPinned}
              trPrivate={trPrivate}
              setTrPrivate={setTrPrivate}
              trFields={trFields}
              setTrFields={setTrFields}
              newFieldLabel={newFieldLabel}
              setNewFieldLabel={setNewFieldLabel}
              newFieldType={newFieldType}
              setNewFieldType={setNewFieldType}
              newFieldUnit={newFieldUnit}
              setNewFieldUnit={setNewFieldUnit}
              newFieldOptionsText={newFieldOptionsText}
              setNewFieldOptionsText={setNewFieldOptionsText}
              onAddField={handleAddBuilderField}
              onMoveField={moveBuilderField}
              onClose={() => setBuilderOpen(false)}
              onSubmit={handleSaveTracker}
            />
          )
        }
      />
    );
  }

  // ============================================================
  // TRACKER HOME GRID & TEMPLATES
  // ============================================================
  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <WashiLabel>My Trackers · Custom Activity Builder</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2.5">
              <LayoutGrid className="w-6 h-6" style={{ color: 'var(--cs-accent)' }} />
              My Trackers
            </h1>
            <p className="text-xs sm:text-sm max-w-2xl" style={{ color: 'var(--cs-text-muted)' }}>
              Build personal trackers for gym workouts, cricket/running, drawing, reading, guitar, study, or any
              custom routine — with tailored fields, flexible goals, rest days, and offline analytics.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openFromTemplate(TRACKER_TEMPLATES[4])}
            className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Tracker
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_LABELS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                  categoryFilter === cat.id ? 'cs-btn-primary' : 'cs-surface-muted'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <label className="text-xs flex items-center gap-1.5 cursor-pointer" style={{ color: 'var(--cs-text-muted)' }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
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

      {/* Active Trackers List */}
      <section className="space-y-4">
        {visibleTrackers.length === 0 ? (
          <div className="cs-card rounded-3xl p-8 text-center space-y-3">
            <Sparkles className="w-7 h-7 mx-auto opacity-60" style={{ color: 'var(--cs-accent)' }} />
            <h2 className="font-display text-xl font-semibold">No trackers in this view yet</h2>
            <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--cs-text-muted)' }}>
              Pick a ready-made template below or create a blank custom tracker with your own fields and units.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTrackers.map((tracker) => {
              const analytics = computeTrackerAnalytics(
                tracker,
                customTrackerEntries,
                trackerGoals,
                todayDate,
                30
              );
              const latest = customTrackerEntries
                .filter((e) => e.trackerId === tracker.id)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
              const topGoal = analytics.goalProgress[0];

              return (
                <div key={tracker.id} className="cs-card rounded-3xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                          style={{ backgroundColor: `${tracker.color}22` }}
                        >
                          {tracker.emoji}
                        </span>
                        <div className="min-w-0">
                          <h2 className="font-display text-lg font-semibold truncate">{tracker.name}</h2>
                          <div className="text-xs truncate" style={{ color: 'var(--cs-text-muted)' }}>
                            {tracker.customCategoryLabel || tracker.category} · {tracker.frequency.replace('_', ' ')}
                            {tracker.isPrivate ? ' · Private' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={tracker.pinned ? `Unpin ${tracker.name}` : `Pin ${tracker.name}`}
                          onClick={() => saveCustomTracker({ ...tracker, pinned: !tracker.pinned })}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            tracker.pinned ? 'cs-btn-primary' : 'cs-surface-muted opacity-70'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {tracker.description && (
                      <p className="text-xs line-clamp-2" style={{ color: 'var(--cs-text-muted)' }}>
                        {tracker.description}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 cs-surface-muted rounded-2xl p-3 text-xs">
                      <div>
                        <div style={{ color: 'var(--cs-text-muted)' }}>This week</div>
                        <div className="font-mono-num font-semibold text-sm">{analytics.weeklyCount}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--cs-text-muted)' }}>Rhythm</div>
                        <div className="font-mono-num font-semibold text-sm">{analytics.gentleStreakDays}d</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--cs-text-muted)' }}>Latest</div>
                        <div className="font-mono-num font-semibold text-xs truncate">
                          {latest ? latest.date.slice(5) : 'None'}
                        </div>
                      </div>
                    </div>

                    {topGoal && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
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

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrackerId(tracker.id);
                        setDetailTab('overview');
                      }}
                      className="cs-btn-primary flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Open &amp; Log
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${tracker.name}`}
                      onClick={() => openEditTracker(tracker)}
                      className="p-2 rounded-xl cs-surface-muted cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${tracker.name}`}
                      onClick={() => {
                        setDeleteEntriesToo(true);
                        setDeleteTarget(tracker);
                      }}
                      className="p-2 rounded-xl cs-surface-muted text-red-600 dark:text-red-400 cursor-pointer"
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

      {/* Ready-made Templates Strip */}
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold">Start from a customizable template</h2>
          <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            Every template opens in the field builder so you can rename, reorder, add, or remove fields before saving.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {TRACKER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => openFromTemplate(tpl)}
              className="cs-surface-muted rounded-2xl p-4 text-left space-y-2 hover:opacity-90 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="text-2xl">{tpl.emoji}</div>
                <div className="text-sm font-semibold">{tpl.name}</div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
                  {tpl.description}
                </p>
              </div>
              <div className="text-xs font-semibold pt-2" style={{ color: 'var(--cs-accent)' }}>
                Use template →
              </div>
            </button>
          ))}
        </div>
      </section>

      {builderOpen && (
        <TrackerBuilderModal
          editingTrackerId={editingTrackerId}
          trName={trName}
          setTrName={setTrName}
          trDesc={trDesc}
          setTrDesc={setTrDesc}
          trEmoji={trEmoji}
          setTrEmoji={setTrEmoji}
          trColor={trColor}
          setTrColor={setTrColor}
          trCategory={trCategory}
          setTrCategory={setTrCategory}
          trCustomCatLabel={trCustomCatLabel}
          setTrCustomCatLabel={setTrCustomCatLabel}
          trFrequency={trFrequency}
          setTrFrequency={setTrFrequency}
          trCustomDays={trCustomDays}
          setTrCustomDays={setTrCustomDays}
          trStartDate={trStartDate}
          setTrStartDate={setTrStartDate}
          trShowDashboard={trShowDashboard}
          setTrShowDashboard={setTrShowDashboard}
          trPinned={trPinned}
          setTrPinned={setTrPinned}
          trPrivate={trPrivate}
          setTrPrivate={setTrPrivate}
          trFields={trFields}
          setTrFields={setTrFields}
          newFieldLabel={newFieldLabel}
          setNewFieldLabel={setNewFieldLabel}
          newFieldType={newFieldType}
          setNewFieldType={setNewFieldType}
          newFieldUnit={newFieldUnit}
          setNewFieldUnit={setNewFieldUnit}
          newFieldOptionsText={newFieldOptionsText}
          setNewFieldOptionsText={setNewFieldOptionsText}
          onAddField={handleAddBuilderField}
          onMoveField={moveBuilderField}
          onClose={() => setBuilderOpen(false)}
          onSubmit={handleSaveTracker}
        />
      )}

      {deleteTarget && (
        <DeleteTrackerModal
          tracker={deleteTarget}
          deleteEntriesToo={deleteEntriesToo}
          setDeleteEntriesToo={setDeleteEntriesToo}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteCustomTracker(deleteTarget.id, deleteEntriesToo);
            setDeleteTarget(null);
            setNotice(`Deleted "${deleteTarget.name}".`);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// PER-TRACKER DETAIL WORKSPACE (5 Views: Overview, Calendar, History, Analytics, Settings)
// ============================================================
function TrackerDetailWorkspace({
  tracker,
  todayDate,
  entries,
  goals,
  tab,
  onTabChange,
  onBack,
  onEditTracker,
  onSaveTracker,
  onDeleteTracker,
  onSaveEntry,
  onDeleteEntry,
  onSaveGoal,
  onDeleteGoal,
  notice,
  setNotice,
  deleteModal,
  builderModal,
}: {
  tracker: CustomTracker;
  todayDate: string;
  entries: CustomTrackerEntry[];
  goals: TrackerGoal[];
  tab: TrackerDetailTab;
  onTabChange: (t: TrackerDetailTab) => void;
  onBack: () => void;
  onEditTracker: () => void;
  onSaveTracker: (t: Omit<CustomTracker, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  onDeleteTracker: () => void;
  onSaveEntry: (e: Omit<CustomTrackerEntry, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  onDeleteEntry: (id: string) => Promise<void>;
  onSaveGoal: (g: Omit<TrackerGoal, 'id' | 'userId'> & { id?: string }) => Promise<string>;
  onDeleteGoal: (id: string) => Promise<void>;
  notice: string | null;
  setNotice: (s: string | null) => void;
  deleteModal: React.ReactNode;
  builderModal: React.ReactNode;
}) {
  const [rangeDays, setRangeDays] = useState<number | 'all'>(30);
  const [calendarMonth, setCalendarMonth] = useState(todayDate.slice(0, 7));

  // Entry logging form state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(todayDate);
  const [entryTime, setEntryTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [entryNotes, setEntryNotes] = useState('');
  const [entryValues, setEntryValues] = useState<Record<string, unknown>>({});

  // History filter
  const [historySearch, setHistorySearch] = useState('');

  // New goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalPeriod, setGoalPeriod] = useState<TrackerGoalPeriod>('weekly');
  const [goalTarget, setGoalTarget] = useState(3);
  const [goalUnit, setGoalUnit] = useState('sessions');
  const [goalFieldId, setGoalFieldId] = useState('');
  const [goalRestAllow, setGoalRestAllow] = useState(2);

  const activeFields = useMemo(() => tracker.fields.filter((f) => !f.archived), [tracker.fields]);
  const analytics = useMemo(
    () => computeTrackerAnalytics(tracker, entries, goals, todayDate, rangeDays),
    [tracker, entries, goals, todayDate, rangeDays]
  );

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => `${b.date}T${b.time || ''}`.localeCompare(`${a.date}T${a.time || ''}`)),
    [entries]
  );

  const resetEntryForm = (dateOverride = todayDate) => {
    setEditingEntryId(null);
    setEntryDate(dateOverride);
    setEntryTime(new Date().toTimeString().slice(0, 5));
    setEntryNotes('');
    const initial: Record<string, unknown> = {};
    for (const f of activeFields) {
      if (f.type === 'checklist') {
        initial[f.id] = (f.options || []).map((lbl, idx) => ({
          id: `chk_${idx}`,
          label: lbl,
          checked: false,
        })) as TrackerChecklistItemValue[];
      } else if (f.type === 'multiselect') {
        initial[f.id] = [];
      } else if (f.type === 'checkbox') {
        initial[f.id] = false;
      }
    }
    setEntryValues(initial);
  };

  useEffect(() => {
    resetEntryForm(todayDate);
  }, [tracker.id]);

  const startEditEntry = (entry: CustomTrackerEntry) => {
    setEditingEntryId(entry.id);
    setEntryDate(entry.date);
    setEntryTime(entry.time || '');
    setEntryNotes(entry.notes || '');
    setEntryValues({ ...(entry.values || {}) });
    onTabChange('overview');
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveEntry({
      ...(editingEntryId ? { id: editingEntryId } : {}),
      trackerId: tracker.id,
      date: entryDate,
      time: entryTime,
      values: entryValues,
      notes: entryNotes.trim(),
      isRestDay: false,
      completed: true,
    });
    setNotice(editingEntryId ? 'Entry updated.' : `Logged entry for ${entryDate}.`);
    resetEntryForm(entryDate);
  };

  const handleLogRestDay = async () => {
    await onSaveEntry({
      trackerId: tracker.id,
      date: entryDate,
      time: entryTime,
      values: {},
      notes: entryNotes.trim() || 'Intentional rest & recovery day',
      isRestDay: true,
      completed: true,
    });
    setNotice(`Logged restorative rest day for ${entryDate}.`);
    resetEntryForm(entryDate);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    await onSaveGoal({
      trackerId: tracker.id,
      title: goalTitle.trim(),
      period: goalPeriod,
      targetValue: goalTarget,
      unit: goalUnit.trim() || 'sessions',
      fieldId: goalFieldId,
      allowRestDays: true,
      restDayAllowancePerWeek: goalRestAllow,
      paused: false,
    });
    setGoalTitle('');
    setNotice('Tracker goal saved.');
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return sortedEntries;
    const q = historySearch.toLowerCase();
    return sortedEntries.filter(
      (e) =>
        e.date.includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        JSON.stringify(e.values).toLowerCase().includes(q)
    );
  }, [sortedEntries, historySearch]);

  const monthCells = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CustomTrackerEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries]);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-medium inline-flex items-center gap-1 cursor-pointer hover:underline"
              style={{ color: 'var(--cs-text-muted)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to My Trackers
            </button>
            <div className="flex items-center gap-3">
              <span
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: `${tracker.color}22` }}
              >
                {tracker.emoji}
              </span>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold">{tracker.name}</h1>
                <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  {tracker.customCategoryLabel || tracker.category} · {tracker.frequency.replace('_', ' ')} ·{' '}
                  {activeFields.length} custom {activeFields.length === 1 ? 'field' : 'fields'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSaveTracker({ ...tracker, showOnDashboard: !tracker.showOnDashboard })}
              className="cs-surface-muted px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              {tracker.showOnDashboard ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {tracker.showOnDashboard ? 'On Dashboard' : 'Hidden from Dashboard'}
            </button>
            <button
              type="button"
              onClick={onEditTracker}
              className="cs-btn-primary px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Fields
            </button>
          </div>
        </div>

        {/* 5 Detail Tabs */}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Tracker views">
          {(
            [
              ['overview', 'Overview & Log', Sparkles],
              ['calendar', 'Calendar', CalendarIcon],
              ['history', 'History', History],
              ['analytics', 'Analytics', BarChart3],
              ['settings', 'Goals & Settings', SettingsIcon],
            ] as [TrackerDetailTab, string, React.ComponentType<{ className?: string }>][]
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTabChange(id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                tab === id ? 'cs-btn-primary' : 'cs-surface-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
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

      {/* VIEW 1: OVERVIEW & DYNAMIC LOGGING */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-7 cs-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">
                {editingEntryId ? 'Edit logged entry' : 'Log session / entry'}
              </h2>
              {editingEntryId && (
                <button
                  type="button"
                  onClick={() => resetEntryForm(todayDate)}
                  className="text-xs underline cursor-pointer"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="trk-entry-date" className="block text-xs font-medium">Date</label>
                  <input
                    id="trk-entry-date"
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="trk-entry-time" className="block text-xs font-medium">Time (optional)</label>
                  <input
                    id="trk-entry-time"
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                  />
                </div>
              </div>

              {/* Render all 11 custom field types dynamically */}
              {activeFields.map((field) => (
                <DynamicFieldInput
                  key={field.id}
                  field={field}
                  value={entryValues[field.id]}
                  onChange={(val) => setEntryValues((prev) => ({ ...prev, [field.id]: val }))}
                />
              ))}

              <div className="space-y-1">
                <label htmlFor="trk-entry-notes" className="block text-xs font-medium">Session notes</label>
                <textarea
                  id="trk-entry-notes"
                  rows={2}
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder="Highlights, reps, mood, or reflections..."
                  className="cs-input w-full px-3 py-2 rounded-xl text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button type="submit" className="cs-btn-primary flex-1 py-2.5 px-4 rounded-xl text-sm font-medium cursor-pointer">
                  {editingEntryId ? 'Update entry' : 'Save entry'}
                </button>
                {!editingEntryId && (
                  <button
                    type="button"
                    onClick={handleLogRestDay}
                    className="cs-surface-muted px-4 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Log Rest Day
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="lg:col-span-5 space-y-6">
            {/* Goal Progress Summary */}
            <div className="cs-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: tracker.color || 'var(--cs-accent)' }} />
                  Active goals
                </h2>
                <button
                  type="button"
                  onClick={() => onTabChange('settings')}
                  className="text-xs font-semibold cursor-pointer hover:underline"
                  style={{ color: 'var(--cs-accent)' }}
                >
                  Configure →
                </button>
              </div>
              {analytics.goalProgress.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  No active goals configured yet. Set a gentle weekly or monthly target in Goals &amp; Settings.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {analytics.goalProgress.map(({ goal, currentValue, percent, remainingText }) => (
                    <div key={goal.id} className="cs-surface-muted rounded-2xl p-3.5 space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{goal.title}</span>
                        <span className="font-mono-num">
                          {currentValue}/{goal.targetValue} {goal.unit}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: tracker.color || 'var(--cs-accent)' }}
                        />
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                        {remainingText} · {goal.period}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Entries */}
            <div className="cs-card rounded-3xl p-6 space-y-3">
              <h2 className="font-display text-lg font-semibold">Recent entries</h2>
              {sortedEntries.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  {analytics.supportiveSummary}
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedEntries.slice(0, 4).map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      fields={tracker.fields}
                      onEdit={() => startEditEntry(entry)}
                      onDelete={() => onDeleteEntry(entry.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* VIEW 2: CALENDAR */}
      {tab === 'calendar' && (
        <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold font-mono-num">{calendarMonth}</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous tracker month"
                onClick={() => setCalendarMonth((m) => shiftYm(m, -1))}
                className="p-2 rounded-xl cs-surface-muted cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next tracker month"
                onClick={() => setCalendarMonth((m) => shiftYm(m, 1))}
                className="p-2 rounded-xl cs-surface-muted cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold opacity-65">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthCells.map((cell) => {
              const dayList = entriesByDate.get(cell.date) || [];
              const activeCount = dayList.filter((e) => !e.isRestDay).length;
              const hasRest = dayList.some((e) => e.isRestDay);

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => {
                    resetEntryForm(cell.date);
                    onTabChange('overview');
                  }}
                  className={`min-h-[58px] rounded-xl p-2 border text-left flex flex-col justify-between cursor-pointer ${
                    cell.inMonth ? '' : 'opacity-40'
                  }`}
                  style={{
                    borderColor: activeCount > 0 ? tracker.color : 'var(--cs-border)',
                    backgroundColor:
                      activeCount > 0
                        ? `${tracker.color}20`
                        : hasRest
                          ? 'var(--cs-surface-muted)'
                          : 'transparent',
                  }}
                >
                  <span className="text-xs font-mono-num">{Number(cell.date.slice(8))}</span>
                  <span className="text-[10px]" style={{ color: 'var(--cs-text-muted)' }}>
                    {activeCount > 0 ? `${activeCount} log${activeCount > 1 ? 's' : ''}` : hasRest ? 'rest' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* VIEW 3: HISTORY */}
      {tab === 'history' && (
        <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Full Activity History ({entries.length})</h2>
            <input
              type="search"
              aria-label="Filter tracker history"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search dates, values, notes..."
              className="cs-input px-3.5 py-2 rounded-xl text-xs w-full sm:w-64"
            />
          </div>
          {filteredHistory.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              No matching entries found.
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredHistory.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  fields={tracker.fields}
                  onEdit={() => startEditEntry(entry)}
                  onDelete={() => onDeleteEntry(entry.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* VIEW 4: ANALYTICS */}
      {tab === 'analytics' && (
        <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Tracker Analytics</h2>
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                {analytics.supportiveSummary}
              </p>
            </div>
            <div className="flex gap-1.5">
              {([7, 30, 90, 'all'] as const).map((r) => (
                <button
                  key={String(r)}
                  type="button"
                  onClick={() => setRangeDays(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                    rangeDays === r ? 'cs-btn-primary' : 'cs-surface-muted'
                  }`}
                >
                  {r === 'all' ? 'All time' : `${r}d`}
                </button>
              ))}
            </div>
          </div>

          {analytics.totalEntries === 0 ? (
            <div className="cs-surface-muted rounded-2xl p-6 text-center text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              No entries logged in this date range yet. Log a session or rest day in Overview to unlock trends.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="cs-surface-muted rounded-2xl p-4">
                  <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Active logs</div>
                  <div className="font-mono-num text-2xl font-semibold">{analytics.activeEntries}</div>
                </div>
                <div className="cs-surface-muted rounded-2xl p-4">
                  <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Rest days</div>
                  <div className="font-mono-num text-2xl font-semibold">{analytics.restDaysCount}</div>
                </div>
                <div className="cs-surface-muted rounded-2xl p-4">
                  <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Gentle rhythm</div>
                  <div className="font-mono-num text-2xl font-semibold">{analytics.gentleStreakDays}d</div>
                </div>
                <div className="cs-surface-muted rounded-2xl p-4">
                  <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Total duration</div>
                  <div className="font-mono-num text-2xl font-semibold">{analytics.totalDurationMinutes}m</div>
                </div>
              </div>

              {/* 14-day Bar Chart */}
              <div className="cs-surface-muted rounded-2xl p-5 space-y-3">
                <div className="text-xs font-semibold">Recent daily consistency</div>
                <div
                  className="grid gap-1.5 items-end h-28 pt-2"
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, analytics.dailySeries.length)}, minmax(0, 1fr))` }}
                >
                  {analytics.dailySeries.map((pt) => {
                    const maxCount = Math.max(1, ...analytics.dailySeries.map((d) => d.count));
                    const heightPct = pt.count > 0 ? Math.max(20, Math.round((pt.count / maxCount) * 100)) : pt.isRest ? 18 : 6;
                    return (
                      <div key={pt.date} className="flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          title={`${pt.date}: ${pt.count} logs${pt.isRest ? ' (rest day)' : ''}`}
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor:
                              pt.count > 0
                                ? tracker.color || 'var(--cs-accent)'
                                : pt.isRest
                                  ? 'var(--cs-text-muted)'
                                  : 'var(--cs-border)',
                            opacity: pt.count > 0 ? 1 : pt.isRest ? 0.45 : 0.35,
                          }}
                        />
                        <span className="text-[9px] font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                          {pt.date.slice(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Field Aggregations */}
              {analytics.fieldStats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.fieldStats.map((fs) => {
                    const logLabel = `${fs.count} ${fs.count === 1 ? 'log' : 'logs'}`;
                    const formattedLatest =
                      fs.latestValue === undefined || fs.latestValue === null || fs.latestValue === ''
                        ? '—'
                        : Array.isArray(fs.latestValue)
                          ? typeof fs.latestValue[0] === 'object'
                            ? `${fs.latestValue.filter((i: { done?: boolean }) => i?.done).length}/${fs.latestValue.length} done`
                            : fs.latestValue.join(', ')
                          : String(fs.latestValue);

                    return (
                      <div key={fs.field.id} className="cs-surface-muted rounded-2xl p-4 space-y-1">
                        <div className="text-xs font-semibold truncate">{fs.field.label}</div>
                        {fs.field.type === 'checkbox' && fs.count > 0 ? (
                          <div className="text-xs font-mono-num space-y-0.5" style={{ color: 'var(--cs-text-muted)' }}>
                            <div>
                              Completed: <strong>{fs.sum}</strong> / {fs.count} ({logLabel})
                            </div>
                          </div>
                        ) : fs.field.type === 'checklist' && fs.count > 0 ? (
                          <div className="text-xs font-mono-num space-y-0.5" style={{ color: 'var(--cs-text-muted)' }}>
                            <div>
                              Items done: <strong>{fs.sum}</strong> · Avg: <strong>{fs.avg}</strong>/log
                            </div>
                            <div>
                              Latest: {formattedLatest} ({logLabel})
                            </div>
                          </div>
                        ) : fs.avg !== null ? (
                          <div className="text-xs font-mono-num space-y-0.5" style={{ color: 'var(--cs-text-muted)' }}>
                            <div>
                              Avg: <strong>{fs.avg}</strong> {fs.field.unit || ''} · Total: <strong>{fs.sum}</strong>
                            </div>
                            <div>
                              Range: {fs.min}–{fs.max} ({logLabel})
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs truncate" style={{ color: 'var(--cs-text-muted)' }}>
                            Latest: {formattedLatest}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* VIEW 5: GOALS & SETTINGS */}
      {tab === 'settings' && (
        <div className="space-y-6">
          <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-xl font-semibold">Flexible Tracker Goals</h2>
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              Set target frequency or metric goals with built-in rest-day grace so breaks never feel like failures.
            </p>

            <form onSubmit={handleAddGoal} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4 space-y-1">
                <label htmlFor="tg-title" className="block text-xs font-medium">Goal title</label>
                <input
                  id="tg-title"
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. 4 gym sessions / week"
                  className="cs-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="tg-period" className="block text-xs font-medium">Period</label>
                <select
                  id="tg-period"
                  value={goalPeriod}
                  onChange={(e) => setGoalPeriod(e.target.value as TrackerGoalPeriod)}
                  className="cs-input w-full px-2.5 py-2 rounded-xl text-xs"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="total">All-time</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="tg-target" className="block text-xs font-medium">Target</label>
                <input
                  id="tg-target"
                  type="number"
                  step="any"
                  min={0.1}
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(Number(e.target.value))}
                  className="cs-input w-full px-3 py-2 rounded-xl text-xs font-mono-num"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="tg-metric" className="block text-xs font-medium">Metric</label>
                <select
                  id="tg-metric"
                  value={goalFieldId}
                  onChange={(e) => {
                    const fid = e.target.value;
                    setGoalFieldId(fid);
                    const matched = activeFields.find((f) => f.id === fid);
                    if (matched?.unit) setGoalUnit(matched.unit);
                    else if (!fid) setGoalUnit('sessions');
                  }}
                  className="cs-input w-full px-2.5 py-2 rounded-xl text-xs"
                >
                  <option value="">Entry count</option>
                  {activeFields
                    .filter((f) => ['number', 'duration', 'measurement', 'rating5', 'rating10'].includes(f.type))
                    .map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="cs-btn-primary w-full py-2 px-3 rounded-xl text-xs font-medium cursor-pointer">
                  Add goal
                </button>
              </div>
            </form>

            {goals.length > 0 && (
              <div className="space-y-2 pt-2">
                {goals.map((g) => (
                  <div key={g.id} className="cs-surface-muted rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold">{g.title}</div>
                      <div style={{ color: 'var(--cs-text-muted)' }}>
                        Target: {g.targetValue} {g.unit} ({g.period}) · Rest days allowed: {g.restDayAllowancePerWeek}/wk
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSaveGoal({ ...g, paused: !g.paused })}
                        className="px-3 py-1.5 rounded-xl cs-card cursor-pointer"
                      >
                        {g.paused ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete goal ${g.title}`}
                        onClick={() => onDeleteGoal(g.id)}
                        className="p-1.5 rounded-xl cs-card text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="cs-card rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold">Tracker Lifecycle</h2>
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                Archive to hide without losing history, or delete permanently.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSaveTracker({ ...tracker, archived: !tracker.archived })}
                className="cs-surface-muted px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                {tracker.archived ? 'Unarchive Tracker' : 'Archive Tracker'}
              </button>
              <button
                type="button"
                onClick={onDeleteTracker}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
              >
                Delete Tracker
              </button>
            </div>
          </section>
        </div>
      )}

      {builderModal}
      {deleteModal}
    </div>
  );
}

function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: TrackerFieldDefinition;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const inputId = `dyn_${field.id}`;

  if (field.type === 'checkbox') {
    return (
      <label className="cs-surface-muted rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-medium cursor-pointer">
        <span>{field.label}</span>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  }

  if (field.type === 'rating5' || field.type === 'rating10') {
    const max = field.type === 'rating10' ? 10 : 5;
    const current = Number(value || 0);
    return (
      <div className="space-y-1.5">
        <div className="text-xs font-medium flex justify-between">
          <span>{field.label}</span>
          <span className="font-mono-num">{current > 0 ? `${current}/${max}` : 'Not rated'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-num cursor-pointer ${
                current === n ? 'cs-btn-primary font-semibold' : 'cs-surface-muted'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'dropdown') {
    return (
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-xs font-medium">{field.label}</label>
        <select
          id={inputId}
          required={field.required}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="cs-input w-full px-3 py-2 rounded-xl text-sm"
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5">
        <span className="block text-xs font-medium">{field.label}</span>
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(active ? selected.filter((x) => x !== opt) : [...selected, opt])}
                className={`px-3 py-1.5 rounded-xl text-xs cursor-pointer ${
                  active ? 'cs-btn-primary font-medium' : 'cs-surface-muted'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'checklist') {
    const items: TrackerChecklistItemValue[] = Array.isArray(value)
      ? (value as TrackerChecklistItemValue[])
      : (field.options || []).map((lbl, idx) => ({ id: `chk_${idx}`, label: lbl, checked: false }));

    return (
      <div className="space-y-1.5">
        <span className="block text-xs font-medium">{field.label}</span>
        <div className="space-y-1.5">
          {items.map((item) => (
            <label
              key={item.id}
              className="cs-surface-muted rounded-xl px-3 py-2 flex items-center gap-2 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  onChange(items.map((x) => (x.id === item.id ? { ...x, checked: e.target.checked } : x)))
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'datetime') {
    return (
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-xs font-medium">{field.label}</label>
        <input
          id={inputId}
          type="datetime-local"
          required={field.required}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
        />
      </div>
    );
  }

  const isNumeric = field.type === 'number' || field.type === 'duration' || field.type === 'measurement';
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-xs font-medium">
        {field.label}
        {field.unit ? ` (${field.unit})` : field.type === 'duration' ? ' (min)' : ''}
      </label>
      <input
        id={inputId}
        type={isNumeric ? 'number' : 'text'}
        step={isNumeric ? 'any' : undefined}
        required={field.required}
        placeholder={field.placeholder || ''}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onChange(isNumeric ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        className="cs-input w-full px-3 py-2 rounded-xl text-sm"
      />
    </div>
  );
}

function EntryCard({
  entry,
  fields,
  onEdit,
  onDelete,
}: {
  entry: CustomTrackerEntry;
  fields: TrackerFieldDefinition[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  const renderedPairs = Object.entries(entry.values || {})
    .filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
    .map(([fid, val]) => {
      const f = fieldMap.get(fid);
      const label = f?.label || fid;
      let display = String(val);
      if (typeof val === 'boolean') display = val ? 'Yes' : 'No';
      else if (Array.isArray(val)) {
        display = val
          .map((x: any) => (typeof x === 'object' && x !== null ? `${x.checked ? '✓' : '○'} ${x.label}` : String(x)))
          .join(', ');
      } else if (f?.unit) {
        display = `${display} ${f.unit}`;
      }
      return `${label}: ${display}`;
    });

  return (
    <div className="cs-surface-muted rounded-2xl p-3.5 flex items-start justify-between gap-3">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="text-xs font-semibold font-mono-num">
          {entry.date}
          {entry.time ? ` · ${entry.time}` : ''}
          {entry.isRestDay ? ' · Rest & Recovery Day' : ''}
        </div>
        {renderedPairs.length > 0 && (
          <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            {renderedPairs.join(' · ')}
          </div>
        )}
        {entry.notes && (
          <div className="text-xs italic" style={{ color: 'var(--cs-text-muted)' }}>
            {entry.notes}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          aria-label={`Edit entry on ${entry.date}`}
          onClick={onEdit}
          className="p-1.5 rounded-lg cs-card cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete entry on ${entry.date}`}
          onClick={onDelete}
          className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function TrackerBuilderModal({
  editingTrackerId,
  trName,
  setTrName,
  trDesc,
  setTrDesc,
  trEmoji,
  setTrEmoji,
  trColor,
  setTrColor,
  trCategory,
  setTrCategory,
  trCustomCatLabel,
  setTrCustomCatLabel,
  trFrequency,
  setTrFrequency,
  trCustomDays,
  setTrCustomDays,
  trStartDate,
  setTrStartDate,
  trShowDashboard,
  setTrShowDashboard,
  trPinned,
  setTrPinned,
  trPrivate,
  setTrPrivate,
  trFields,
  setTrFields,
  newFieldLabel,
  setNewFieldLabel,
  newFieldType,
  setNewFieldType,
  newFieldUnit,
  setNewFieldUnit,
  newFieldOptionsText,
  setNewFieldOptionsText,
  onAddField,
  onMoveField,
  onClose,
  onSubmit,
}: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <form
        onSubmit={onSubmit}
        className="cs-card max-w-2xl w-full rounded-3xl p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">
            {editingTrackerId ? 'Edit Tracker & Custom Fields' : 'Create Custom Tracker'}
          </h3>
          <button type="button" onClick={onClose} className="text-xs underline cursor-pointer">
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="tb-name" className="block text-xs font-medium">Tracker name</label>
            <input
              id="tb-name"
              type="text"
              required
              value={trName}
              onChange={(e) => setTrName(e.target.value)}
              placeholder="e.g. Cricket Practice, Morning Run, Guitar"
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="tb-cat" className="block text-xs font-medium">Category</label>
            <select
              id="tb-cat"
              value={trCategory}
              onChange={(e) => setTrCategory(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            >
              <option value="gym">Gym</option>
              <option value="sports">Sports</option>
              <option value="hobbies">Hobbies</option>
              <option value="study">Study</option>
              <option value="wellness">Wellness</option>
              <option value="custom">Custom category</option>
            </select>
          </div>
        </div>

        {trCategory === 'custom' && (
          <div className="space-y-1">
            <label htmlFor="tb-custom-cat" className="block text-xs font-medium">Custom category name</label>
            <input
              id="tb-custom-cat"
              type="text"
              value={trCustomCatLabel}
              onChange={(e) => setTrCustomCatLabel(e.target.value)}
              placeholder="e.g. Music, Photography, Volunteering"
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="tb-desc" className="block text-xs font-medium">Description (optional)</label>
          <input
            id="tb-desc"
            type="text"
            value={trDesc}
            onChange={(e) => setTrDesc(e.target.value)}
            placeholder="What you want to notice or build here..."
            className="cs-input w-full px-3 py-2 rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium">Icon emoji</span>
            <div className="flex flex-wrap gap-1.5">
              {TRACKER_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setTrEmoji(em)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer ${
                    trEmoji === em ? 'cs-btn-primary' : 'cs-surface-muted'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium">Color accent</span>
            <div className="flex flex-wrap gap-2">
              {TRACKER_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  aria-label={`Select tracker color ${col}`}
                  onClick={() => setTrColor(col)}
                  className={`w-7 h-7 rounded-full cursor-pointer ${trColor === col ? 'ring-2 ring-offset-2' : ''}`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="tb-freq" className="block text-xs font-medium">Frequency</label>
            <select
              id="tb-freq"
              value={trFrequency}
              onChange={(e) => setTrFrequency(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom_days">Custom Days</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="tb-start" className="block text-xs font-medium">Start date</label>
            <input
              id="tb-start"
              type="date"
              value={trStartDate}
              onChange={(e) => setTrStartDate(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
            />
          </div>
        </div>

        {trFrequency === 'custom_days' && (
          <div className="space-y-1.5">
            <span className="block text-xs font-medium">Planned weekdays</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day, idx) => {
                const active = trCustomDays.includes(idx);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setTrCustomDays(
                        active ? trCustomDays.filter((d: number) => d !== idx) : [...trCustomDays, idx].sort()
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                      active ? 'cs-btn-primary font-medium' : 'cs-surface-muted'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={trShowDashboard} onChange={(e) => setTrShowDashboard(e.target.checked)} />
            Show on Dashboard
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={trPinned} onChange={(e) => setTrPinned(e.target.checked)} />
            Pin to top
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={trPrivate} onChange={(e) => setTrPrivate(e.target.checked)} />
            Mark private (hide from Dashboard)
          </label>
        </div>

        {/* Custom Field Builder */}
        <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--cs-border)' }}>
          <div>
            <h4 className="font-display text-base font-semibold">Custom Field Builder</h4>
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              Add, edit, or reorder fields. Historical entry values are preserved safely if you modify fields later.
            </p>
          </div>

          {trFields.length > 0 && (
            <div className="space-y-2">
              {trFields.map((f: TrackerFieldDefinition, idx: number) => (
                <div key={f.id} className="cs-surface-muted rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      type="text"
                      aria-label={`Field label for ${f.label}`}
                      value={f.label}
                      onChange={(e) =>
                        setTrFields(trFields.map((x: TrackerFieldDefinition) => (x.id === f.id ? { ...x, label: e.target.value } : x)))
                      }
                      className="cs-input px-2.5 py-1 rounded-lg text-xs font-medium w-full sm:w-56"
                    />
                    <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
                      Type: {f.type}
                      {f.unit ? ` · Unit: ${f.unit}` : ''}
                      {f.options && f.options.length > 0 ? ` · Options: ${f.options.join(', ')}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Move ${f.label} up`}
                      onClick={() => onMoveField(idx, -1)}
                      className="p-1.5 rounded-lg cs-card cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${f.label} down`}
                      onClick={() => onMoveField(idx, 1)}
                      className="p-1.5 rounded-lg cs-card cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove field ${f.label}`}
                      onClick={() => setTrFields(trFields.filter((x: TrackerFieldDefinition) => x.id !== f.id))}
                      className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cs-surface-muted rounded-2xl p-3.5 space-y-2.5">
            <div className="text-xs font-semibold">Add new field</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                aria-label="New field label"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Field label (e.g. Distance)"
                className="cs-input px-3 py-1.5 rounded-xl text-xs"
              />
              <select
                aria-label="New field type"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as TrackerFieldType)}
                className="cs-input px-2.5 py-1.5 rounded-xl text-xs"
              >
                {FIELD_TYPE_META.map((m) => (
                  <option key={m.type} value={m.type}>
                    {m.label} — {m.hint}
                  </option>
                ))}
              </select>
              {['measurement', 'number', 'duration'].includes(newFieldType) ? (
                <input
                  type="text"
                  aria-label="New field unit"
                  value={newFieldUnit}
                  onChange={(e) => setNewFieldUnit(e.target.value)}
                  placeholder="Unit (kg, km, min...)"
                  className="cs-input px-3 py-1.5 rounded-xl text-xs"
                />
              ) : ['dropdown', 'multiselect', 'checklist'].includes(newFieldType) ? (
                <input
                  type="text"
                  aria-label="New field options"
                  value={newFieldOptionsText}
                  onChange={(e) => setNewFieldOptionsText(e.target.value)}
                  placeholder="Comma options (A, B, C)"
                  className="cs-input px-3 py-1.5 rounded-xl text-xs"
                />
              ) : (
                <div />
              )}
            </div>
            <button
              type="button"
              onClick={onAddField}
              disabled={!newFieldLabel.trim()}
              className="cs-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              + Add field to tracker
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl cs-surface-muted text-sm cursor-pointer">
            Cancel
          </button>
          <button type="submit" className="cs-btn-primary px-5 py-2 rounded-xl text-sm font-medium cursor-pointer">
            {editingTrackerId ? 'Save Changes' : 'Create Tracker'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteTrackerModal({
  tracker,
  deleteEntriesToo,
  setDeleteEntriesToo,
  onCancel,
  onConfirm,
}: {
  tracker: CustomTracker;
  deleteEntriesToo: boolean;
  setDeleteEntriesToo: (v: boolean) => void;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Delete &ldquo;{tracker.name}&rdquo;?</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
          Choose whether to remove its logged entries and goals as well.
        </p>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={deleteEntriesToo}
            onChange={(e) => setDeleteEntriesToo(e.target.checked)}
          />
          Also delete all associated entries and goals for this tracker
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl cs-surface-muted text-xs cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
          >
            Delete tracker
          </button>
        </div>
      </div>
    </div>
  );
}
