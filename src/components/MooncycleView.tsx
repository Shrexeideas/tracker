import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { CycleRecord, FlowIntensity, NavSectionId } from '../types/clearspace';
import {
  buildMooncycleDayMap,
  computeCycleInsights,
  MOONCYCLE_MOODS,
  PRESET_MOONCYCLE_SYMPTOMS,
} from '../utils/mooncycle';
import { WashiLabel } from './ScrapbookAccents';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Droplets,
  Edit3,
  Lock,
  Moon,
  Plus,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';

type MooncycleTab = 'calendar' | 'history' | 'insights' | 'privacy';

const FLOW_OPTIONS: { value: FlowIntensity | 'none'; label: string }[] = [
  { value: 'none', label: 'No flow' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthGrid(yearMonth: string): { date: string; inMonth: boolean }[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const firstDay = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startOffset = (firstDay.getUTCDay() + 6) % 7; // Monday first

  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, -i));
    cells.push({ date: dt.toISOString().slice(0, 10), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    cells.push({ date: dt.toISOString().slice(0, 10), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const [ly, lm, ld] = last.split('-').map(Number);
    const dt = new Date(Date.UTC(ly, lm - 1, ld + 1));
    cells.push({ date: dt.toISOString().slice(0, 10), inMonth: false });
  }
  return cells;
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function MooncycleView({ onNavigate }: { onNavigate?: (s: NavSectionId) => void }) {
  const {
    todayDate,
    cycleSettings,
    cycleRecords,
    cycleDailyLogs,
    updateCycleSettings,
    saveCycleRecord,
    deleteCycleRecord,
    saveCycleDailyLog,
    exportMooncycleJson,
    deleteAllMooncycleData,
  } = useData();

  const [tab, setTab] = useState<MooncycleTab>('calendar');
  const [viewMonth, setViewMonth] = useState(() => todayDate.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [notice, setNotice] = useState<string | null>(null);

  // Period modal / editor state
  const [cycleEditorOpen, setCycleEditorOpen] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [cycleStartDate, setCycleStartDate] = useState(todayDate);
  const [cycleEndDate, setCycleEndDate] = useState('');
  const [cycleFlow, setCycleFlow] = useState<FlowIntensity>('medium');
  const [cycleNotes, setCycleNotes] = useState('');

  // Confirm delete states (no window.confirm)
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<CycleRecord | null>(null);
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);

  // Daily log editor state synchronized with selectedDate
  const existingDayLog = useMemo(
    () => cycleDailyLogs.find((l) => l.date === selectedDate),
    [cycleDailyLogs, selectedDate]
  );

  const [dayFlow, setDayFlow] = useState<FlowIntensity | 'none'>('none');
  const [daySpotting, setDaySpotting] = useState(false);
  const [daySymptoms, setDaySymptoms] = useState<string[]>([]);
  const [newCustomSymptom, setNewCustomSymptom] = useState('');
  const [dayMood, setDayMood] = useState('calm');
  const [dayEnergy, setDayEnergy] = useState(3);
  const [dayPain, setDayPain] = useState(0);
  const [daySleep, setDaySleep] = useState(7.5);
  const [dayNotes, setDayNotes] = useState('');

  useEffect(() => {
    if (existingDayLog) {
      setDayFlow(existingDayLog.flow || 'none');
      setDaySpotting(Boolean(existingDayLog.isSpotting));
      setDaySymptoms(existingDayLog.symptoms || []);
      setDayMood(existingDayLog.mood || 'calm');
      setDayEnergy(existingDayLog.energy ?? 3);
      setDayPain(existingDayLog.painLevel ?? 0);
      setDaySleep(existingDayLog.sleepHours ?? 7.5);
      setDayNotes(existingDayLog.notes || '');
    } else {
      setDayFlow('none');
      setDaySpotting(false);
      setDaySymptoms([]);
      setDayMood('calm');
      setDayEnergy(3);
      setDayPain(0);
      setDaySleep(7.5);
      setDayNotes('');
    }
  }, [existingDayLog, selectedDate]);

  const insights = useMemo(
    () => computeCycleInsights(cycleRecords, cycleSettings, todayDate),
    [cycleRecords, cycleSettings, todayDate]
  );

  const dayMap = useMemo(
    () => buildMooncycleDayMap(cycleRecords, cycleDailyLogs, insights),
    [cycleRecords, cycleDailyLogs, insights]
  );

  const monthCells = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);

  const allSymptomChips = useMemo(() => {
    const merged = new Set([...PRESET_MOONCYCLE_SYMPTOMS, ...(cycleSettings.customSymptomCatalog || []), ...daySymptoms]);
    return Array.from(merged);
  }, [cycleSettings.customSymptomCatalog, daySymptoms]);

  const openNewCycleModal = (presetStart = selectedDate) => {
    setEditingCycleId(null);
    setCycleStartDate(presetStart);
    setCycleEndDate('');
    setCycleFlow('medium');
    setCycleNotes('');
    setCycleEditorOpen(true);
  };

  const openEditCycleModal = (rec: CycleRecord) => {
    setEditingCycleId(rec.id);
    setCycleStartDate(rec.startDate);
    setCycleEndDate(rec.endDate || '');
    setCycleFlow(rec.defaultFlow || 'medium');
    setCycleNotes(rec.notes || '');
    setCycleEditorOpen(true);
  };

  const handleSaveCycleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleStartDate) return;
    const safeEnd = cycleEndDate && cycleEndDate >= cycleStartDate ? cycleEndDate : '';
    const existing = editingCycleId ? cycleRecords.find((r) => r.id === editingCycleId) : undefined;
    await saveCycleRecord({
      ...(editingCycleId ? { id: editingCycleId } : {}),
      startDate: cycleStartDate,
      endDate: safeEnd,
      defaultFlow: cycleFlow,
      flowByDate: existing?.flowByDate || { [cycleStartDate]: cycleFlow },
      spottingDates: existing?.spottingDates || (cycleFlow === 'spotting' ? [cycleStartDate] : []),
      notes: cycleNotes.trim(),
    });
    setCycleEditorOpen(false);
    setNotice(editingCycleId ? 'Period entry updated.' : `Logged cycle start on ${cycleStartDate}.`);
  };

  const handleQuickStartPeriodOnSelected = async () => {
    const existingCovering = cycleRecords.find(
      (r) => r.startDate === selectedDate || (r.endDate && selectedDate >= r.startDate && selectedDate <= r.endDate)
    );
    if (existingCovering) {
      openEditCycleModal(existingCovering);
      return;
    }
    await saveCycleRecord({
      startDate: selectedDate,
      endDate: '',
      defaultFlow: dayFlow !== 'none' ? dayFlow : 'medium',
      flowByDate: { [selectedDate]: dayFlow !== 'none' ? dayFlow : 'medium' },
      spottingDates: daySpotting ? [selectedDate] : [],
      notes: '',
    });
    setNotice(`Marked period start on ${selectedDate}.`);
  };

  const handleSaveDayLog = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCycleDailyLog({
      id: existingDayLog?.id || `cdl_${selectedDate}`,
      date: selectedDate,
      flow: dayFlow,
      isSpotting: daySpotting || dayFlow === 'spotting',
      symptoms: daySymptoms,
      customSymptoms: cycleSettings.customSymptomCatalog || [],
      mood: dayMood,
      energy: dayEnergy,
      painLevel: dayPain,
      sleepHours: daySleep,
      notes: dayNotes.trim(),
    });
    setNotice(`Saved daily log for ${selectedDate}.`);
  };

  const toggleSymptom = (sym: string) => {
    setDaySymptoms((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));
  };

  const handleAddCustomSymptom = async () => {
    const clean = newCustomSymptom.trim();
    if (!clean) return;
    const nextCatalog = Array.from(new Set([...(cycleSettings.customSymptomCatalog || []), clean]));
    await updateCycleSettings({ customSymptomCatalog: nextCatalog });
    if (!daySymptoms.includes(clean)) {
      setDaySymptoms((prev) => [...prev, clean]);
    }
    setNewCustomSymptom('');
  };

  const handleExportMooncycle = () => {
    const bundle = exportMooncycleJson();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clearspace-mooncycle-${todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Exported private Mooncycle JSON snapshot.');
  };

  const selectedCell = dayMap[selectedDate];

  return (
    <div className="space-y-6">
      {/* Private Rose/Lavender Hero Card */}
      <section
        className="cs-card rounded-3xl p-6 sm:p-8 space-y-5"
        style={{
          backgroundImage:
            'radial-gradient(circle at top right, rgba(219, 142, 166, 0.14), transparent 55%), radial-gradient(circle at bottom left, rgba(169, 143, 232, 0.12), transparent 50%)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--cs-text-muted)' }}>
              <WashiLabel>Mooncycle · Private</WashiLabel>
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Offline &amp; isolated
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2.5">
              <Moon className="w-6 h-6" style={{ color: '#B85B7B' }} />
              Mooncycle
            </h1>
            <p className="text-xs sm:text-sm max-w-2xl" style={{ color: 'var(--cs-text-muted)' }}>
              Your private space for period dates, flow, symptoms, mood, and cycle history — stored locally in
              IndexedDB and excluded from Dashboard and Life Timeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openNewCycleModal(todayDate)}
              className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Log Period
            </button>
          </div>
        </div>

        {/* Summary strip (zero pills, clean tabular stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Current cycle day</div>
            <div className="font-mono-num text-xl font-semibold">
              {insights.currentCycleDay ? `Day ${insights.currentCycleDay}` : 'Not logged'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
              {insights.latestCycleStart ? `Started ${insights.latestCycleStart}` : 'Log a start date to begin'}
            </div>
          </div>

          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Avg cycle length</div>
            <div className="font-mono-num text-xl font-semibold">
              {insights.averageCycleLength ? `${insights.averageCycleLength} days` : '—'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
              {insights.totalCyclesLogged} cycle {insights.totalCyclesLogged === 1 ? 'record' : 'records'}
            </div>
          </div>

          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Avg period duration</div>
            <div className="font-mono-num text-xl font-semibold">
              {insights.averagePeriodLength ? `${insights.averagePeriodLength} days` : '—'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>Based on logged end dates</div>
          </div>

          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Cycle estimates</div>
            <div className="font-mono-num text-sm font-semibold">
              {!cycleSettings.predictionsEnabled
                ? 'Off (Private)'
                : insights.estimatedNextWindow
                  ? insights.estimatedNextWindow.likelyStart
                  : 'Need 2+ cycles'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
              {cycleSettings.predictionsEnabled ? 'Optional estimate only' : 'Enable in Privacy & Settings'}
            </div>
          </div>
        </div>

        {/* Module Sub-tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1" role="tablist" aria-label="Mooncycle sections">
          {(
            [
              ['calendar', 'Calendar & Daily Log'],
              ['history', 'Cycle History'],
              ['insights', 'Cycle Insights'],
              ['privacy', 'Privacy & Settings'],
            ] as [MooncycleTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                tab === id ? 'cs-btn-primary' : 'cs-surface-muted hover:opacity-90'
              }`}
            >
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

      {/* TAB 1: CALENDAR & DAILY LOG */}
      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Monthly Menstrual Calendar */}
          <section className="lg:col-span-7 cs-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" style={{ color: '#B85B7B' }} />
                <h2 className="font-display text-lg font-semibold font-mono-num">{viewMonth}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
                  className="p-2 rounded-xl cs-surface-muted cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMonth(todayDate.slice(0, 7));
                    setSelectedDate(todayDate);
                  }}
                  className="px-3 py-1.5 rounded-xl cs-surface-muted text-xs font-medium cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
                  className="p-2 rounded-xl cs-surface-muted cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold opacity-65">
              {WEEKDAY_NAMES.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {monthCells.map((cell) => {
                const status = dayMap[cell.date];
                const isSelected = cell.date === selectedDate;
                const isToday = cell.date === todayDate;
                const confirmed = status?.isConfirmedPeriod;
                const spotting = status?.isSpotting && !confirmed;
                const estimated = status?.isEstimatedPeriod && !confirmed;
                const fertile = status?.isEstimatedFertile && !confirmed && !estimated;
                const hasLog = Boolean(status?.dailyLog);

                let bgStyle: React.CSSProperties = {};
                if (confirmed) {
                  bgStyle = {
                    backgroundColor: 'rgba(201, 77, 109, 0.22)',
                    borderColor: '#C94D6D',
                  };
                } else if (spotting) {
                  bgStyle = {
                    backgroundColor: 'rgba(219, 142, 166, 0.16)',
                    borderColor: '#D47B96',
                  };
                } else if (estimated) {
                  bgStyle = {
                    backgroundColor: 'rgba(181, 143, 212, 0.14)',
                    borderColor: '#967BB6',
                    borderStyle: 'dashed',
                  };
                } else if (fertile) {
                  bgStyle = {
                    backgroundColor: 'rgba(130, 175, 155, 0.14)',
                    borderColor: '#6B8E6E',
                    borderStyle: 'dotted',
                  };
                }

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[54px] rounded-xl p-1.5 border text-left flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-offset-1' : ''
                    } ${cell.inMonth ? '' : 'opacity-40'}`}
                    style={{
                      borderColor: 'var(--cs-border)',
                      ...bgStyle,
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-mono-num ${isToday ? 'font-bold underline' : ''}`}>
                        {Number(cell.date.slice(8))}
                      </span>
                      {confirmed && <Droplets className="w-3 h-3" style={{ color: '#C94D6D' }} />}
                    </div>
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--cs-text-muted)' }}>
                      {confirmed && <span>{status?.flow || 'period'}</span>}
                      {spotting && <span>spot</span>}
                      {estimated && <span>est</span>}
                      {status?.isEstimatedOvulation && <span>ovul*</span>}
                      {hasLog && !confirmed && !spotting && <span>• log</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div
              className="pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs"
              style={{ borderColor: 'var(--cs-border)', color: 'var(--cs-text-muted)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border inline-block" style={{ backgroundColor: 'rgba(201, 77, 109, 0.25)', borderColor: '#C94D6D' }} />
                Confirmed period
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border inline-block" style={{ backgroundColor: 'rgba(219, 142, 166, 0.2)', borderColor: '#D47B96' }} />
                Spotting
              </span>
              {cycleSettings.predictionsEnabled && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border border-dashed inline-block" style={{ backgroundColor: 'rgba(181, 143, 212, 0.16)', borderColor: '#967BB6' }} />
                  Estimated cycle
                </span>
              )}
              {cycleSettings.predictionsEnabled && cycleSettings.fertileWindowEnabled && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border border-dotted inline-block" style={{ borderColor: '#6B8E6E' }} />
                  Estimated fertile window
                </span>
              )}
            </div>
          </section>

          {/* Selected Day Symptoms, Flow & Mood Logger */}
          <section className="lg:col-span-5 cs-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--cs-text-muted)' }}>
                  Selected date
                </div>
                <h2 className="font-display text-xl font-semibold font-mono-num">{selectedDate}</h2>
              </div>
              <button
                type="button"
                onClick={handleQuickStartPeriodOnSelected}
                className="cs-surface-muted px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer hover:opacity-90"
              >
                {selectedCell?.recordId ? 'Edit period record' : 'Mark period start'}
              </button>
            </div>

            <form onSubmit={handleSaveDayLog} className="space-y-4">
              {/* Flow Intensity */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold">Flow intensity</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {FLOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setDayFlow(opt.value);
                        if (opt.value === 'spotting') setDaySpotting(true);
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-medium cursor-pointer text-center ${
                        dayFlow === opt.value ? 'cs-btn-primary' : 'cs-surface-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={daySpotting}
                  onChange={(e) => setDaySpotting(e.target.checked)}
                  className="rounded"
                />
                Spotting observed on this day
              </label>

              {/* Symptoms Checklist + Custom Symptom */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold">Physical symptoms</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {allSymptomChips.map((sym) => {
                    const active = daySymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs text-left cursor-pointer truncate ${
                          active ? 'cs-btn-primary font-medium' : 'cs-surface-muted'
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    aria-label="Add custom symptom"
                    value={newCustomSymptom}
                    onChange={(e) => setNewCustomSymptom(e.target.value)}
                    placeholder="Add custom symptom..."
                    className="cs-input flex-1 px-3 py-1.5 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSymptom}
                    disabled={!newCustomSymptom.trim()}
                    className="cs-surface-muted px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Mood */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold">Mood &amp; emotional tone</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {MOONCYCLE_MOODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDayMood(m.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${
                        dayMood === m.id ? 'cs-btn-primary font-medium' : 'cs-surface-muted'
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span className="truncate">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy, Pain, Sleep */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="cs-surface-muted rounded-xl p-2.5 space-y-1">
                  <label htmlFor="mc-energy" className="block text-[11px] font-medium">
                    Energy ({dayEnergy}/5)
                  </label>
                  <input
                    id="mc-energy"
                    type="range"
                    min={1}
                    max={5}
                    value={dayEnergy}
                    onChange={(e) => setDayEnergy(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="cs-surface-muted rounded-xl p-2.5 space-y-1">
                  <label htmlFor="mc-pain" className="block text-[11px] font-medium">
                    Discomfort ({dayPain}/5)
                  </label>
                  <input
                    id="mc-pain"
                    type="range"
                    min={0}
                    max={5}
                    value={dayPain}
                    onChange={(e) => setDayPain(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="cs-surface-muted rounded-xl p-2.5 space-y-1">
                  <label htmlFor="mc-sleep" className="block text-[11px] font-medium">
                    Sleep (hrs)
                  </label>
                  <input
                    id="mc-sleep"
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={daySleep}
                    onChange={(e) => setDaySleep(Number(e.target.value))}
                    className="cs-input w-full px-2 py-1 rounded-lg text-xs font-mono-num"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="mc-day-notes" className="block text-xs font-medium">
                  Private daily notes
                </label>
                <textarea
                  id="mc-day-notes"
                  rows={2}
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  placeholder="How is your body feeling today?"
                  className="cs-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <button type="submit" className="cs-btn-primary w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer">
                Save daily log for {selectedDate}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* TAB 2: CYCLE HISTORY */}
      {tab === 'history' && (
        <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Logged cycle records</h2>
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                Edit start or end dates anytime to keep your personal cycle history accurate.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openNewCycleModal(todayDate)}
              className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add cycle record
            </button>
          </div>

          {insights.history.length === 0 ? (
            <div className="cs-surface-muted rounded-2xl p-6 text-center space-y-2">
              <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
                No cycles logged yet. Log your first period start date whenever you want to track privately.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.history.map((item) => {
                const { record, periodDurationDays, cycleLengthDays } = item;
                return (
                  <div
                    key={record.id}
                    className="cs-surface-muted rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold font-mono-num">
                        {record.startDate} {record.endDate ? `→ ${record.endDate}` : '(ongoing / end not set)'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                        Flow: <span className="capitalize">{record.defaultFlow}</span>
                        {periodDurationDays ? ` · Period: ${periodDurationDays} days` : ''}
                        {cycleLengthDays ? ` · Cycle length: ${cycleLengthDays} days` : ''}
                      </div>
                      {record.notes && (
                        <p className="text-xs pt-0.5" style={{ color: 'var(--cs-text-muted)' }}>
                          {record.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Edit cycle starting ${record.startDate}`}
                        onClick={() => openEditCycleModal(record)}
                        className="p-2 rounded-xl cs-card cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete cycle starting ${record.startDate}`}
                        onClick={() => setDeleteRecordTarget(record)}
                        className="p-2 rounded-xl cs-card text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: CYCLE INSIGHTS */}
      {tab === 'insights' && (
        <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold">Cycle Insights &amp; Symptom Patterns</h2>
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              {insights.estimateDisclaimer}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="cs-surface-muted rounded-2xl p-5 space-y-2">
              <div className="text-sm font-semibold">Recorded Facts</div>
              <ul className="text-xs space-y-1.5" style={{ color: 'var(--cs-text-muted)' }}>
                <li>Cycles logged: <strong className="font-mono-num">{insights.totalCyclesLogged}</strong></li>
                <li>
                  Average cycle length:{' '}
                  <strong className="font-mono-num">
                    {insights.averageCycleLength ? `${insights.averageCycleLength} days` : 'Insufficient cycle pairs'}
                  </strong>
                </li>
                <li>
                  Cycle range:{' '}
                  <strong className="font-mono-num">
                    {insights.minCycleLength && insights.maxCycleLength
                      ? `${insights.minCycleLength}–${insights.maxCycleLength} days`
                      : '—'}
                  </strong>
                </li>
                <li>
                  Average period duration:{' '}
                  <strong className="font-mono-num">
                    {insights.averagePeriodLength ? `${insights.averagePeriodLength} days` : '—'}
                  </strong>
                </li>
                <li>Daily symptom logs saved: <strong className="font-mono-num">{cycleDailyLogs.length}</strong></li>
              </ul>
            </div>

            <div className="cs-surface-muted rounded-2xl p-5 space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" style={{ color: '#B85B7B' }} /> Optional Estimates
              </div>
              {!cycleSettings.predictionsEnabled ? (
                <div className="space-y-2 text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  <p>Cycle predictions are currently OFF by default to keep Mooncycle strictly factual.</p>
                  <button
                    type="button"
                    onClick={() => setTab('privacy')}
                    className="underline font-medium cursor-pointer"
                    style={{ color: 'var(--cs-accent)' }}
                  >
                    Manage estimate preferences in Privacy &amp; Settings
                  </button>
                </div>
              ) : !insights.estimatedNextWindow ? (
                <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  Log at least 2 cycle start dates before an estimate window can be calculated.
                </p>
              ) : (
                <div className="text-xs space-y-1.5" style={{ color: 'var(--cs-text-muted)' }}>
                  <div>
                    Estimated next start window:{' '}
                    <strong className="font-mono-num">
                      {insights.estimatedNextWindow.earliestStart} to {insights.estimatedNextWindow.latestStart}
                    </strong>
                  </div>
                  <div>
                    Typical likely start:{' '}
                    <strong className="font-mono-num">{insights.estimatedNextWindow.likelyStart}</strong>
                  </div>
                  {insights.estimatedFertileWindow && (
                    <div>
                      Optional fertile window estimate:{' '}
                      <strong className="font-mono-num">
                        {insights.estimatedFertileWindow.startDate} to {insights.estimatedFertileWindow.endDate}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {cycleSettings.pulseCheckBridgeEnabled && onNavigate && (
            <div className="cs-surface-muted rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span>
                Pulse Check mood bridge is enabled — your energy &amp; stress check-ins live privately in Pulse Check.
              </span>
              <button
                type="button"
                onClick={() => onNavigate('pulse')}
                className="cs-btn-primary px-3 py-1.5 rounded-xl font-medium cursor-pointer"
              >
                Open Pulse Check
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: PRIVACY & SETTINGS */}
      {tab === 'privacy' && (
        <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#B85B7B' }} />
            <h2 className="font-display text-xl font-semibold">Mooncycle Privacy &amp; Controls</h2>
          </div>

          <div className="space-y-3">
            <label className="cs-surface-muted rounded-2xl p-4 flex items-start justify-between gap-4 cursor-pointer">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Optional cycle length estimates</div>
                <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  Off by default. When enabled and 2+ cycles are logged, displays soft dashed estimated upcoming days.
                </div>
              </div>
              <input
                type="checkbox"
                checked={cycleSettings.predictionsEnabled}
                onChange={(e) =>
                  updateCycleSettings({
                    predictionsEnabled: e.target.checked,
                    ...(e.target.checked ? {} : { fertileWindowEnabled: false }),
                  })
                }
                className="mt-1"
              />
            </label>

            <label className="cs-surface-muted rounded-2xl p-4 flex items-start justify-between gap-4 cursor-pointer">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Optional fertile &amp; ovulation estimates</div>
                <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  Off by default. Requires cycle estimates to be enabled. Never intended for medical or contraceptive use.
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!cycleSettings.predictionsEnabled}
                checked={cycleSettings.fertileWindowEnabled}
                onChange={(e) => updateCycleSettings({ fertileWindowEnabled: e.target.checked })}
                className="mt-1"
              />
            </label>

            <label className="cs-surface-muted rounded-2xl p-4 flex items-start justify-between gap-4 cursor-pointer">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Optional Pulse Check reflection link</div>
                <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                  Off by default. Keeps Mooncycle period dates strictly private and only surfaces a shortcut to Pulse Check.
                </div>
              </div>
              <input
                type="checkbox"
                checked={cycleSettings.pulseCheckBridgeEnabled}
                onChange={(e) => updateCycleSettings({ pulseCheckBridgeEnabled: e.target.checked })}
                className="mt-1"
              />
            </label>

            <div className="cs-surface-muted rounded-2xl p-4 space-y-3">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold">Discreet gentle reminder label</div>
                  <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                    Customize neutral reminder phrasing shown locally inside Mooncycle.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={cycleSettings.reminderEnabled}
                  onChange={(e) => updateCycleSettings({ reminderEnabled: e.target.checked })}
                />
              </label>
              {cycleSettings.reminderEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label htmlFor="mc-rem-text" className="block text-xs font-medium">
                      Discreet label
                    </label>
                    <input
                      id="mc-rem-text"
                      type="text"
                      value={cycleSettings.discreetReminderText}
                      onChange={(e) => updateCycleSettings({ discreetReminderText: e.target.value })}
                      className="cs-input w-full px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="mc-rem-days" className="block text-xs font-medium">
                      Days before estimate
                    </label>
                    <input
                      id="mc-rem-days"
                      type="number"
                      min={0}
                      max={7}
                      value={cycleSettings.reminderDaysBefore}
                      onChange={(e) => updateCycleSettings({ reminderDaysBefore: Number(e.target.value) })}
                      className="cs-input w-full px-3 py-2 rounded-xl text-xs font-mono-num"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--cs-border)' }}>
            <button
              type="button"
              onClick={handleExportMooncycle}
              className="cs-surface-muted px-4 py-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Mooncycle data only (JSON)
            </button>

            <button
              type="button"
              onClick={() => setConfirmWipeOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Permanently delete all Mooncycle data
            </button>
          </div>
        </section>
      )}

      {/* Period Create / Edit Modal */}
      {cycleEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleSaveCycleRecord} className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">
              {editingCycleId ? 'Edit period record' : 'Log period dates'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="mc-rec-start" className="block text-xs font-medium">Start date</label>
                <input
                  id="mc-rec-start"
                  type="date"
                  required
                  value={cycleStartDate}
                  onChange={(e) => setCycleStartDate(e.target.value)}
                  className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="mc-rec-end" className="block text-xs font-medium">End date (optional)</label>
                <input
                  id="mc-rec-end"
                  type="date"
                  value={cycleEndDate}
                  onChange={(e) => setCycleEndDate(e.target.value)}
                  className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="mc-rec-flow" className="block text-xs font-medium">Typical flow</label>
              <select
                id="mc-rec-flow"
                value={cycleFlow}
                onChange={(e) => setCycleFlow(e.target.value as FlowIntensity)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              >
                <option value="spotting">Spotting</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="mc-rec-notes" className="block text-xs font-medium">Notes (optional)</label>
              <textarea
                id="mc-rec-notes"
                rows={2}
                value={cycleNotes}
                onChange={(e) => setCycleNotes(e.target.value)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCycleEditorOpen(false)}
                className="px-4 py-2 rounded-xl cs-surface-muted text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="cs-btn-primary px-4 py-2 rounded-xl text-sm font-medium cursor-pointer">
                Save record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Single Cycle Delete Modal */}
      {deleteRecordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-sm w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Delete period record?</h3>
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              Remove the cycle record starting on {deleteRecordTarget.startDate}? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteRecordTarget(null)}
                className="px-4 py-2 rounded-xl cs-surface-muted text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteCycleRecord(deleteRecordTarget.id);
                  setDeleteRecordTarget(null);
                  setNotice('Deleted cycle record.');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
              >
                Delete record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Permanent Delete All Mooncycle Data */}
      {confirmWipeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Delete all Mooncycle data permanently?</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
              This removes every period record, daily symptom log, and Mooncycle preference from IndexedDB. Consider
              exporting a Mooncycle JSON snapshot first.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmWipeOpen(false)}
                className="px-4 py-2 rounded-xl cs-surface-muted text-xs cursor-pointer"
              >
                Keep my data
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteAllMooncycleData();
                  setConfirmWipeOpen(false);
                  setNotice('All Mooncycle records were permanently deleted.');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
