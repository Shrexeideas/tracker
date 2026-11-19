import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { DoodleStroke } from '../types/clearspace';
import { WashiLabel } from './ScrapbookAccents';
import { Check, ChevronLeft, ChevronRight, Eraser, Eye, Paintbrush, Plus, RotateCcw, Trash2 } from 'lucide-react';

const MARKER_EMOJIS = ['🌸', '🌿', '✨', '📚', '☀️', '🌙', '🎉', '💛'];
const DOODLE_COLORS = ['#C94D6D', '#4B7B4A', '#6E54A3', '#2D6F95', '#C9633B', '#2E2026'];

export function CalendarView() {
  const {
    todayDate,
    tasks,
    studySchedules,
    calendarEvents,
    calendarMarkers,
    saveCalendarEvent,
    deleteCalendarEvent,
    saveCalendarMarker,
  } = useData();

  const [cursorYearMonth, setCursorYearMonth] = useState(() => todayDate.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [glideMode, setGlideMode] = useState(false);
  const [doodleMode, setDoodleMode] = useState(false);
  const [brushColor, setBrushColor] = useState(DOODLE_COLORS[0]);
  const [isEraser, setIsEraser] = useState(false);

  // Event & Marker inputs
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [markerEmoji, setMarkerEmoji] = useState('🌸');
  const [markerLabel, setMarkerLabel] = useState('');

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DoodleStroke | null>(null);

  const [year, month] = cursorYearMonth.split('-').map(Number);

  const monthLabel = useMemo(() => {
    const dt = new Date(Date.UTC(year, month - 1, 1));
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dt);
  }, [year, month]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [year, month]);

  const shiftMonth = (delta: number) => {
    const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
    setCursorYearMonth(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  const selectedMarker = calendarMarkers.find((m) => m.date === selectedDate);
  const strokes = selectedMarker?.doodleStrokes || [];

  // Sync marker editor fields when date changes
  useEffect(() => {
    setMarkerEmoji(selectedMarker?.emoji || '🌸');
    setMarkerLabel(selectedMarker?.label || '');
  }, [selectedDate, selectedMarker?.emoji, selectedMarker?.label]);

  // Render saved strokes onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, doodleMode, selectedDate]);

  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!doodleMode) return;
    isDrawingRef.current = true;
    const pt = getPointerCoords(e);
    currentStrokeRef.current = {
      color: isEraser ? '#FFFFFF' : brushColor,
      size: isEraser ? 14 : 3,
      points: [pt],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!doodleMode || !isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getPointerCoords(e);
    currentStrokeRef.current.points.push(pt);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && currentStrokeRef.current.points.length >= 2) {
      const pts = currentStrokeRef.current.points;
      const prev = pts[pts.length - 2];
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = currentStrokeRef.current.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = async () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const newStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    const nextStrokes = [...strokes, newStroke].slice(-120);
    await saveCalendarMarker({
      id: `mk_${selectedDate}`,
      date: selectedDate,
      emoji: selectedMarker?.emoji || markerEmoji,
      label: selectedMarker?.label || markerLabel,
      color: selectedMarker?.color || brushColor,
      doodleStrokes: nextStrokes,
    });
  };

  const handleUndoStroke = async () => {
    if (strokes.length === 0) return;
    await saveCalendarMarker({
      id: `mk_${selectedDate}`,
      date: selectedDate,
      emoji: selectedMarker?.emoji || markerEmoji,
      label: selectedMarker?.label || markerLabel,
      color: selectedMarker?.color || brushColor,
      doodleStrokes: strokes.slice(0, -1),
    });
  };

  const handleClearDoodle = async () => {
    await saveCalendarMarker({
      id: `mk_${selectedDate}`,
      date: selectedDate,
      emoji: selectedMarker?.emoji || markerEmoji,
      label: selectedMarker?.label || markerLabel,
      color: selectedMarker?.color || brushColor,
      doodleStrokes: [],
    });
  };

  const handleSaveMarkerMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCalendarMarker({
      id: `mk_${selectedDate}`,
      date: selectedDate,
      emoji: markerEmoji,
      label: markerLabel.trim(),
      color: brushColor,
      doodleStrokes: strokes,
    });
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    await saveCalendarEvent({
      date: selectedDate,
      title: eventTitle.trim(),
      time: eventTime,
      category: 'Event',
      color: brushColor,
      notes: '',
      completed: false,
    });
    setEventTitle('');
    setEventTime('');
  };

  const dayEvents = calendarEvents.filter((ev) => ev.date === selectedDate);
  const dayTasks = tasks.filter((t) => t.dueDate === selectedDate || (t.completed && t.completedAt?.startsWith(selectedDate)));
  const dayStudies = studySchedules.filter(
    (s) => s.targetDate === selectedDate || (s.completed && s.completedAt?.startsWith(selectedDate))
  );

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <WashiLabel>Calendar &amp; Doodles</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">{monthLabel}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="p-2.5 rounded-xl cs-surface-muted cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCursorYearMonth(todayDate.slice(0, 7));
                setSelectedDate(todayDate);
              }}
              className="px-3 py-2 rounded-xl cs-surface-muted text-xs font-medium cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="p-2.5 rounded-xl cs-surface-muted cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setGlideMode((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                glideMode ? 'cs-btn-primary' : 'cs-surface-muted'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Glide Mode {glideMode ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={() => setDoodleMode((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                doodleMode ? 'cs-btn-primary' : 'cs-surface-muted'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" /> Doodle Mode {doodleMode ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Month Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium pb-2" style={{ color: 'var(--cs-text-muted)' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((dateStr, idx) => {
                if (!dateStr) return <div key={`empty_${idx}`} className="h-20 sm:h-24 rounded-2xl opacity-30" />;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayDate;
                const mk = calendarMarkers.find((m) => m.date === dateStr);
                const evCount = calendarEvents.filter((e) => e.date === dateStr).length;
                const tCount = tasks.filter((t) => t.dueDate === dateStr).length;
                const sCount = studySchedules.filter((s) => s.targetDate === dateStr).length;
                const doneCount =
                  tasks.filter((t) => t.completed && t.completedAt?.startsWith(dateStr)).length +
                  studySchedules.filter((s) => s.completed && s.completedAt?.startsWith(dateStr)).length;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    onMouseEnter={() => {
                      if (glideMode) setSelectedDate(dateStr);
                    }}
                    className={`h-20 sm:h-24 p-2 rounded-2xl text-left flex flex-col justify-between cursor-pointer transition-all border ${
                      isSelected ? 'cs-btn-primary' : 'cs-surface-muted hover:opacity-90'
                    }`}
                    style={{
                      borderColor: isToday && !isSelected ? 'var(--cs-accent)' : 'var(--cs-border)',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-mono-num">
                      <span className="font-semibold">{Number(dateStr.slice(8))}</span>
                      {mk?.emoji && <span>{mk.emoji}</span>}
                    </div>
                    <div className="space-y-0.5 text-[10px] leading-tight truncate">
                      {mk?.label && <div className="truncate font-medium">{mk.label}</div>}
                      {(evCount > 0 || tCount > 0 || sCount > 0) && (
                        <div className="opacity-80 truncate">
                          {evCount + tCount + sCount} planned
                        </div>
                      )}
                      {doneCount > 0 && <div className="opacity-90">✓ {doneCount} done</div>}
                      {mk?.doodleStrokes && mk.doodleStrokes.length > 0 && <div>✎ doodle</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Day Inspector & Doodle Canvas */}
          <div className="lg:col-span-4 space-y-4">
            <div className="cs-surface-muted rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold font-mono-num">{selectedDate}</h2>
                {selectedMarker?.emoji && <span className="text-xl">{selectedMarker.emoji}</span>}
              </div>

              {/* Marker Emoji + Label */}
              <form onSubmit={handleSaveMarkerMeta} className="space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {MARKER_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setMarkerEmoji(em)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center cursor-pointer ${
                        markerEmoji === em ? 'cs-btn-primary' : 'cs-card'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Day marker label"
                    value={markerLabel}
                    onChange={(e) => setMarkerLabel(e.target.value)}
                    placeholder="Day label (e.g. Exam Day)"
                    className="cs-input flex-1 px-3 py-1.5 rounded-xl text-xs"
                  />
                  <button type="submit" className="cs-btn-primary px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer">
                    Save
                  </button>
                </div>
              </form>
            </div>

            {/* Doodle Canvas */}
            <div className="cs-surface-muted rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Day Doodle Pad</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsEraser((v) => !v)}
                    aria-label="Toggle eraser"
                    className={`p-1.5 rounded-lg cursor-pointer ${isEraser ? 'cs-btn-primary' : 'cs-card'}`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleUndoStroke}
                    aria-label="Undo last doodle stroke"
                    className="p-1.5 rounded-lg cs-card cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDoodle}
                    aria-label="Clear doodle"
                    className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {DOODLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Doodle colour ${c}`}
                    onClick={() => {
                      setIsEraser(false);
                      setBrushColor(c);
                      if (!doodleMode) setDoodleMode(true);
                    }}
                    className={`w-5 h-5 rounded-full cursor-pointer ${
                      brushColor === c && !isEraser ? 'ring-2 ring-offset-1 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <canvas
                ref={canvasRef}
                width={320}
                height={180}
                data-testid="calendar-doodle-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full h-[160px] rounded-xl border touch-none cursor-crosshair"
                style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
              />
              {!doodleMode && (
                <button
                  type="button"
                  onClick={() => setDoodleMode(true)}
                  className="text-xs underline cursor-pointer"
                  style={{ color: 'var(--cs-accent)' }}
                >
                  Enable Doodle Mode to draw on this day
                </button>
              )}
            </div>

            {/* Day Events, Tasks & Studies */}
            <div className="cs-surface-muted rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-semibold">Events &amp; Completions</h3>
              <form onSubmit={handleAddEvent} className="flex gap-1.5">
                <input
                  type="text"
                  aria-label="Add calendar event"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Add event..."
                  className="cs-input flex-1 px-2.5 py-1.5 rounded-xl text-xs"
                />
                <input
                  type="time"
                  aria-label="Event time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="cs-input px-2 py-1.5 rounded-xl text-xs font-mono-num"
                />
                <button type="submit" aria-label="Save event" className="cs-btn-primary p-2 rounded-xl cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="space-y-1.5 text-xs">
                {dayEvents.map((ev) => (
                  <div key={ev.id} className="cs-card p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => saveCalendarEvent({ ...ev, completed: !ev.completed })}
                      className="flex items-center gap-2 text-left cursor-pointer min-w-0 flex-1"
                    >
                      <Check className={`w-3.5 h-3.5 shrink-0 ${ev.completed ? 'opacity-100' : 'opacity-30'}`} />
                      <span className={`truncate ${ev.completed ? 'line-through opacity-65' : ''}`}>
                        {ev.time ? `${ev.time} · ` : ''}
                        {ev.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCalendarEvent(ev.id)}
                      aria-label={`Delete event ${ev.title}`}
                      className="text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {dayTasks.map((t) => (
                  <div key={t.id} className="cs-card p-2 rounded-xl flex items-center justify-between">
                    <span className={t.completed ? 'line-through opacity-75' : ''}>
                      {t.completed ? '✓ ' : '• '}Task: {t.title}
                    </span>
                  </div>
                ))}

                {dayStudies.map((s) => (
                  <div key={s.id} className="cs-card p-2 rounded-xl flex items-center justify-between">
                    <span className={s.completed ? 'line-through opacity-75' : ''}>
                      {s.completed ? '✓ ' : '• '}Study: {s.subject}
                    </span>
                  </div>
                ))}

                {dayEvents.length === 0 && dayTasks.length === 0 && dayStudies.length === 0 && (
                  <p style={{ color: 'var(--cs-text-muted)' }}>No events or completed tasks on this date.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
