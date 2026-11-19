import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { JournalEntry } from '../types/clearspace';
import { WashiLabel } from './ScrapbookAccents';
import { Edit3, Search, Trash2 } from 'lucide-react';

const JOURNAL_MOODS = ['calm', 'grateful', 'reflective', 'joyful', 'tired', 'hopeful'];

export function JournalView() {
  const { todayDate, journalEntries, saveJournalEntry, deleteJournalEntry } = useData();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayDate);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('calm');
  const [tagsInput, setTagsInput] = useState('');
  const [search, setSearch] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await saveJournalEntry({
      ...(editingId ? { id: editingId } : {}),
      date,
      title: title.trim(),
      content: content.trim(),
      mood,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    });
    setEditingId(null);
    setTitle('');
    setContent('');
    setTagsInput('');
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood);
    setTagsInput(entry.tags.join(', '));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...journalEntries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((e) =>
        q ? e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q) || e.date.includes(q) : true
      );
  }, [journalEntries, search]);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <WashiLabel>Personal Journal</WashiLabel>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Pages &amp; quiet thoughts</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 space-y-1">
              <label htmlFor="jrn-title" className="block text-xs font-medium">Entry title</label>
              <input
                id="jrn-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notes from today..."
                className="cs-input w-full px-3.5 py-2 rounded-xl text-sm"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label htmlFor="jrn-date" className="block text-xs font-medium">Date</label>
              <input
                id="jrn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label htmlFor="jrn-mood" className="block text-xs font-medium">Mood</label>
              <select
                id="jrn-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm capitalize"
              >
                {JOURNAL_MOODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="jrn-content" className="block text-xs font-medium">Journal page</label>
            <textarea
              id="jrn-content"
              rows={5}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write freely about how your day unfolded..."
              className="cs-input w-full px-4 py-3 rounded-2xl text-sm leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              aria-label="Journal tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma separated, optional)"
              className="cs-input px-3.5 py-2 rounded-xl text-xs flex-1 min-w-[200px]"
            />
            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTitle('');
                    setContent('');
                    setTagsInput('');
                  }}
                  className="px-4 py-2 rounded-xl cs-surface-muted text-xs cursor-pointer"
                >
                  Cancel edit
                </button>
              )}
              <button type="submit" className="cs-btn-primary px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer">
                {editingId ? 'Save entry' : 'Save page'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="cs-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Date history ({filtered.length})</h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              type="search"
              aria-label="Search journal history"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries..."
              className="cs-input pl-8 pr-3 py-1.5 rounded-xl text-xs"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            No journal pages saved yet.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <article key={entry.id} className="cs-surface-muted rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{entry.title}</h3>
                    <div className="text-xs font-mono-num" style={{ color: 'var(--cs-text-muted)' }}>
                      {entry.date} · {entry.mood}
                      {entry.tags.length > 0 ? ` · ${entry.tags.join(', ')}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      aria-label={`Edit ${entry.title}`}
                      className="p-1.5 rounded-lg cs-card cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteJournalEntry(entry.id)}
                      aria-label={`Delete ${entry.title}`}
                      className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
