import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { StudySchedule } from '../types/clearspace';
import { computeStudyProgress, generateId } from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import { CalendarPlus, Check, Edit3, Plus, Trash2 } from 'lucide-react';

export function StudySchedulesView() {
  const { todayDate, preferences, studySchedules, saveStudySchedule, deleteStudySchedule, saveScheduleBlock } =
    useData();

  const [subject, setSubject] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [targetDate, setTargetDate] = useState(todayDate);
  const [topicsInput, setTopicsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTopicText, setNewTopicText] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    const existing = editingId ? studySchedules.find((s) => s.id === editingId) : undefined;
    const parsedTopics = topicsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((t) => ({ id: generateId('top'), title: t, completed: false }));

    await saveStudySchedule({
      ...(editingId ? { id: editingId } : {}),
      subject: subject.trim(),
      moduleName: moduleName.trim(),
      targetDate,
      topics: existing && !topicsInput.trim() ? existing.topics : parsedTopics.length > 0 ? parsedTopics : existing?.topics || [],
      notes: notes.trim(),
      completed: existing?.completed || false,
      completedAt: existing?.completedAt || '',
    });

    setSubject('');
    setModuleName('');
    setTopicsInput('');
    setNotes('');
    setEditingId(null);
    setNotice(editingId ? 'Study row updated.' : 'Added study schedule row.');
  };

  const toggleTopic = async (row: StudySchedule, topicId: string) => {
    const nextTopics = row.topics.map((t) => (t.id === topicId ? { ...t, completed: !t.completed } : t));
    const allDone = nextTopics.length > 0 && nextTopics.every((t) => t.completed);
    await saveStudySchedule({
      ...row,
      topics: nextTopics,
      completed: allDone,
      completedAt: allDone ? new Date().toISOString() : '',
    });
  };

  const addTopicToRow = async (row: StudySchedule) => {
    const txt = (newTopicText[row.id] || '').trim();
    if (!txt) return;
    await saveStudySchedule({
      ...row,
      topics: [...row.topics, { id: generateId('top'), title: txt, completed: false }],
      completed: false,
      completedAt: '',
    });
    setNewTopicText((prev) => ({ ...prev, [row.id]: '' }));
  };

  const toggleWholeRow = async (row: StudySchedule) => {
    const nextCompleted = !row.completed;
    await saveStudySchedule({
      ...row,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : '',
      topics: row.topics.map((t) => ({ ...t, completed: nextCompleted })),
    });
  };

  const addToMyDay = async (row: StudySchedule) => {
    await saveScheduleBlock({
      date: todayDate,
      title: `Study ${row.subject}${row.moduleName ? ` — ${row.moduleName}` : ''}`,
      startTime: `${String(preferences.dayStartHour + 1).padStart(2, '0')}:00`,
      endTime: `${String(preferences.dayStartHour + 2).padStart(2, '0')}:00`,
      durationMinutes: 60,
      category: 'Study',
      color: '#4B7B4A',
      lifeDomain: 'study',
      notes: row.notes,
      completed: false,
      completedAt: '',
      priority: 'medium',
      isBreak: false,
      isUnexpected: false,
      actualDurationMinutes: 0,
      reminderMinutes: 0,
      linkedTaskId: '',
      linkedStudyId: row.id,
      recurringWeekdays: [],
    });
    setNotice(`Added "${row.subject}" to My Day.`);
  };

  const completedRows = studySchedules.filter((s) => s.completed);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <WashiLabel>Study Schedules</WashiLabel>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Track subjects, topics &amp; modules</h1>
        </div>

        <form onSubmit={handleSaveRow} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="std-subj" className="block text-xs font-medium">
              Subject
            </label>
            <input
              id="std-subj"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="DBMS, Algorithms..."
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="std-mod" className="block text-xs font-medium">
              Module / Unit
            </label>
            <input
              id="std-mod"
              type="text"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="Indexing & B-Trees"
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label htmlFor="std-date" className="block text-xs font-medium">
              Target date
            </label>
            <input
              id="std-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
            />
          </div>
          <div className="sm:col-span-4 space-y-1">
            <label htmlFor="std-topics" className="block text-xs font-medium">
              Topics (comma separated)
            </label>
            <input
              id="std-topics"
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="Normalization, Indexing, Transactions"
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-9 space-y-1">
            <label htmlFor="std-notes" className="block text-xs font-medium">
              Study notes
            </label>
            <input
              id="std-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Textbook chapters, practice problems..."
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="cs-btn-primary w-full py-2.5 px-4 rounded-xl text-sm font-medium cursor-pointer">
              {editingId ? 'Save row' : 'Add study row'}
            </button>
          </div>
        </form>

        {notice && (
          <div className="p-3 rounded-xl cs-surface-muted text-xs flex justify-between">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Editable Study Table */}
        {studySchedules.length === 0 ? (
          <div className="cs-surface-muted rounded-2xl p-8 text-center text-sm" style={{ color: 'var(--cs-text-muted)' }}>
            No study modules yet. Add your first subject and topic checklist above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-xs" style={{ borderColor: 'var(--cs-border)', color: 'var(--cs-text-muted)' }}>
                  <th className="py-3 pr-3 font-medium">Done</th>
                  <th className="py-3 px-3 font-medium">Subject &amp; Module</th>
                  <th className="py-3 px-3 font-medium">Topics Checklist</th>
                  <th className="py-3 px-3 font-medium">Progress</th>
                  <th className="py-3 pl-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--cs-border)' }}>
                {studySchedules.map((row) => {
                  const prog = computeStudyProgress(row);
                  return (
                    <tr key={row.id} className="align-top" style={{ borderColor: 'var(--cs-border)' }}>
                      <td className="py-4 pr-3">
                        <button
                          type="button"
                          onClick={() => toggleWholeRow(row)}
                          aria-label={`Mark ${row.subject} complete`}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer ${
                            row.completed ? 'animate-cs-check' : ''
                          }`}
                          style={{
                            borderColor: 'var(--cs-accent)',
                            backgroundColor: row.completed ? 'var(--cs-accent)' : 'transparent',
                            color: '#fff',
                          }}
                        >
                          {row.completed && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      <td className="py-4 px-3 min-w-[180px]">
                        <div className={`font-semibold ${row.completed ? 'line-through opacity-65' : ''}`}>
                          {row.subject}
                        </div>
                        {row.moduleName && (
                          <div className={`text-xs ${row.completed ? 'line-through opacity-65' : ''}`} style={{ color: 'var(--cs-text-muted)' }}>
                            {row.moduleName}
                          </div>
                        )}
                        <div className="text-xs font-mono-num mt-1" style={{ color: 'var(--cs-text-muted)' }}>
                          Target: {row.targetDate || 'Flexible'}
                        </div>
                        {row.notes && (
                          <p className="text-xs mt-1.5" style={{ color: 'var(--cs-text-muted)' }}>
                            {row.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-3 min-w-[240px] space-y-2">
                        <div className="space-y-1.5">
                          {row.topics.map((top) => (
                            <label key={top.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={top.completed}
                                onChange={() => toggleTopic(row, top.id)}
                              />
                              <span className={top.completed || row.completed ? 'line-through opacity-65' : ''}>
                                {top.title}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            aria-label={`Add topic to ${row.subject}`}
                            value={newTopicText[row.id] || ''}
                            onChange={(e) => setNewTopicText((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            placeholder="Add topic..."
                            className="cs-input px-2.5 py-1 rounded-lg text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => addTopicToRow(row)}
                            aria-label={`Confirm add topic to ${row.subject}`}
                            className="p-1.5 rounded-lg cs-surface-muted cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-3 min-w-[120px] space-y-1.5">
                        <div className="text-xs font-mono-num font-semibold">
                          {prog.coveredCount}/{prog.totalCount} · {prog.percent}%
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cs-border)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${prog.percent}%`, backgroundColor: 'var(--cs-accent)' }}
                          />
                        </div>
                      </td>

                      <td className="py-4 pl-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => addToMyDay(row)}
                            aria-label={`Schedule ${row.subject} in My Day`}
                            className="p-2 rounded-xl cs-surface-muted cursor-pointer"
                            title="Add to My Day"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setSubject(row.subject);
                              setModuleName(row.moduleName);
                              setTargetDate(row.targetDate);
                              setNotes(row.notes);
                              setTopicsInput('');
                            }}
                            aria-label={`Edit ${row.subject}`}
                            className="p-2 rounded-xl cs-surface-muted cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteStudySchedule(row.id)}
                            aria-label={`Delete ${row.subject}`}
                            className="p-2 rounded-xl cs-surface-muted text-red-600 dark:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {completedRows.length > 0 && (
        <section className="cs-card rounded-3xl p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">Completed study history</h2>
          <div className="space-y-1.5 text-xs">
            {completedRows.map((c) => (
              <div key={c.id} className="cs-surface-muted rounded-xl p-3 flex justify-between">
                <span className="font-medium">
                  {c.subject} {c.moduleName ? `— ${c.moduleName}` : ''}
                </span>
                <span className="font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                  {c.completedAt ? c.completedAt.slice(0, 10) : 'Completed'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
