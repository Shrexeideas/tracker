import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import {
  ThemeDefinition,
  ThemeOverrides,
  ThemeStyleCategory,
} from '../types/clearspace';
import {
  BUILTIN_THEMES,
  createBlankCustomTheme,
  createCustomThemeFromBase,
  exportThemeConfigJson,
  getAllAvailableThemes,
  resolveEffectiveTheme,
  THEME_STYLE_CATEGORIES,
  validateAndParseThemeImport,
} from '../utils/themeEngine';
import { BotanicalAccent, CelestialAccent, WashiLabel } from './ScrapbookAccents';
import { ThemeBuilderControls } from './theme-studio/ThemeBuilderControls';
import { ThemeLivePreview } from './theme-studio/ThemeLivePreview';
import {
  Check,
  Copy,
  Download,
  Edit3,
  FolderPlus,
  Lock,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

type FilterTab = 'all' | 'custom' | ThemeStyleCategory;
type ModeFilter = 'all' | 'light' | 'dark';

function buildOverridesFromDiff(base: ThemeDefinition, draft: ThemeDefinition): ThemeOverrides | undefined {
  const ov: ThemeOverrides = {};
  if (draft.isDark !== base.isDark) ov.isDark = draft.isDark;

  const colorDiff: Partial<ThemeDefinition['colors']> = {};
  (Object.keys(base.colors) as (keyof ThemeDefinition['colors'])[]).forEach((k) => {
    if (draft.colors[k] !== base.colors[k]) colorDiff[k] = draft.colors[k];
  });
  if (Object.keys(colorDiff).length > 0) ov.colors = colorDiff;

  if (JSON.stringify(draft.typography) !== JSON.stringify(base.typography)) {
    ov.typography = draft.typography;
  }
  if (JSON.stringify(draft.layout) !== JSON.stringify(base.layout)) {
    ov.layout = draft.layout;
  }
  if (JSON.stringify(draft.effects) !== JSON.stringify(base.effects)) {
    ov.effects = draft.effects;
  }
  if (draft.motion !== base.motion) ov.motion = draft.motion;
  if (draft.decorations !== base.decorations) ov.decorations = draft.decorations;

  return Object.keys(ov).length > 0 ? ov : undefined;
}

export function ThemeStudioView() {
  const { themeSettings, updateThemeSettings } = useData();
  const customThemes = useMemo(() => themeSettings.customThemes || [], [themeSettings.customThemes]);
  const allThemes = useMemo(() => getAllAvailableThemes(customThemes), [customThemes]);
  const savedEffective = useMemo(() => resolveEffectiveTheme(themeSettings), [themeSettings]);

  const [draftTheme, setDraftTheme] = useState<ThemeDefinition>(() => structuredClone(savedEffective));
  const [categoryFilter, setCategoryFilter] = useState<FilterTab>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modals for Custom Theme Create / Rename / Save-As / Delete
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIsDark, setNewIsDark] = useState(false);
  const [newCategory, setNewCategory] = useState<ThemeStyleCategory>('minimal-clean');
  const [saveFromDraft, setSaveFromDraft] = useState(false);

  const [renameTarget, setRenameTarget] = useState<ThemeDefinition | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ThemeDefinition | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Sync draft when saved themeSettings loads initially or changes externally
  const savedSignature = useMemo(() => JSON.stringify(savedEffective), [savedEffective]);
  const lastSyncedSigRef = useRef(savedSignature);
  useEffect(() => {
    if (lastSyncedSigRef.current !== savedSignature) {
      lastSyncedSigRef.current = savedSignature;
      setDraftTheme(structuredClone(savedEffective));
    }
  }, [savedSignature, savedEffective]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draftTheme) !== JSON.stringify(savedEffective),
    [draftTheme, savedEffective]
  );

  const filteredThemes = useMemo(() => {
    return allThemes.filter((t) => {
      if (categoryFilter === 'custom' && t.builtIn) return false;
      if (categoryFilter !== 'all' && categoryFilter !== 'custom' && t.category !== categoryFilter) return false;
      if (modeFilter === 'light' && t.isDark) return false;
      if (modeFilter === 'dark' && !t.isDark) return false;
      return true;
    });
  }, [allThemes, categoryFilter, modeFilter]);

  const applyThemeConfig = async (themeToApply: ThemeDefinition) => {
    const baseSource =
      themeToApply.builtIn && BUILTIN_THEMES[themeToApply.id as keyof typeof BUILTIN_THEMES]
        ? BUILTIN_THEMES[themeToApply.id as keyof typeof BUILTIN_THEMES]
        : customThemes.find((c) => c.id === themeToApply.id) || themeToApply;

    let nextCustomThemes = customThemes;
    if (!themeToApply.builtIn) {
      const updatedCustom: ThemeDefinition = {
        ...structuredClone(themeToApply),
        builtIn: false,
        updatedAt: new Date().toISOString(),
      };
      nextCustomThemes = customThemes.some((c) => c.id === updatedCustom.id)
        ? customThemes.map((c) => (c.id === updatedCustom.id ? updatedCustom : c))
        : [...customThemes, updatedCustom];
    }

    const overrides = themeToApply.builtIn ? buildOverridesFromDiff(baseSource, themeToApply) : undefined;

    await updateThemeSettings({
      activeTheme: themeToApply.id,
      customAccent: '',
      decorativeStickers: themeToApply.decorations !== 'none',
      compactMode: themeToApply.layout.density === 'compact',
      customThemes: nextCustomThemes,
      overrides,
    });

    setNotice(`Applied "${themeToApply.name}".`);
    setErrorNotice(null);
  };

  const handleQuickApplyPreset = async (preset: ThemeDefinition) => {
    const cloned = structuredClone(preset);
    setDraftTheme(cloned);
    await applyThemeConfig(cloned);
  };

  const handleCancelDraft = () => {
    setDraftTheme(structuredClone(savedEffective));
    setNotice('Reverted uncommitted preview changes.');
    setErrorNotice(null);
  };

  const handleResetToBase = async () => {
    const base = allThemes.find((t) => t.id === draftTheme.id) || BUILTIN_THEMES['strawberry-milk'];
    const resetCopy = structuredClone(base);
    setDraftTheme(resetCopy);
    await applyThemeConfig(resetCopy);
    setNotice(`Reset "${base.name}" to defaults.`);
  };

  const handleDuplicateTheme = async (source: ThemeDefinition) => {
    const copy = createCustomThemeFromBase(source, `${source.name} Custom`);
    const nextCustom = [...customThemes, copy];
    await updateThemeSettings({
      customThemes: nextCustom,
    });
    setDraftTheme(structuredClone(copy));
    setCategoryFilter('custom');
    setNotice(`Duplicated "${source.name}" as "${copy.name}". Customize and click Apply Theme when ready.`);
  };

  const openCreateScratchModal = (fromDraft = false) => {
    setSaveFromDraft(fromDraft);
    setNewName(fromDraft ? `${draftTheme.name} Custom` : '');
    setNewIsDark(fromDraft ? draftTheme.isDark : false);
    setNewCategory(fromDraft ? draftTheme.category : 'minimal-clean');
    setCreateOpen(true);
  };

  const handleCreateCustomTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim() || 'My Custom Theme';
    const created: ThemeDefinition = saveFromDraft
      ? {
          ...createCustomThemeFromBase(draftTheme, trimmed),
          category: newCategory,
          tagline: 'Saved from custom design builder',
        }
      : {
          ...createBlankCustomTheme(trimmed, newIsDark),
          category: newCategory,
        };

    const nextCustom = [...customThemes, created];
    await updateThemeSettings({
      customThemes: nextCustom,
      activeTheme: created.id,
      customAccent: '',
      decorativeStickers: created.decorations !== 'none',
      compactMode: created.layout.density === 'compact',
      overrides: undefined,
    });
    setDraftTheme(structuredClone(created));
    setCreateOpen(false);
    setNotice(`Created and applied "${created.name}".`);
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || renameTarget.builtIn) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const nextCustom = customThemes.map((t) =>
      t.id === renameTarget.id ? { ...t, name: trimmed, updatedAt: new Date().toISOString() } : t
    );
    await updateThemeSettings({ customThemes: nextCustom });
    if (draftTheme.id === renameTarget.id) {
      setDraftTheme((prev) => ({ ...prev, name: trimmed }));
    }
    setRenameTarget(null);
    setNotice(`Renamed theme to "${trimmed}".`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteTarget.builtIn) return;
    const nextCustom = customThemes.filter((t) => t.id !== deleteTarget.id);
    const nextActive = themeSettings.activeTheme === deleteTarget.id ? 'strawberry-milk' : themeSettings.activeTheme;
    await updateThemeSettings({
      customThemes: nextCustom,
      activeTheme: nextActive,
      overrides: themeSettings.activeTheme === deleteTarget.id ? undefined : themeSettings.overrides,
    });
    if (draftTheme.id === deleteTarget.id) {
      setDraftTheme(structuredClone(BUILTIN_THEMES['strawberry-milk']));
    }
    setDeleteTarget(null);
    setNotice(`Deleted custom theme "${deleteTarget.name}".`);
  };

  const handleExportTheme = (theme: ThemeDefinition) => {
    const payload = exportThemeConfigJson(theme);
    const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clearspace-theme-${slug}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported "${theme.name}" theme configuration.`);
  };

  const handleImportThemeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validateAndParseThemeImport(text);
      if (!parsed.valid || !parsed.theme) {
        setErrorNotice(parsed.error || 'Could not import theme JSON.');
        return;
      }
      const nextCustom = [...customThemes, parsed.theme];
      await updateThemeSettings({ customThemes: nextCustom });
      setDraftTheme(structuredClone(parsed.theme));
      setCategoryFilter('custom');
      setErrorNotice(null);
      setNotice(`Imported "${parsed.theme.name}". Click Apply Theme to activate it.`);
    } catch {
      setErrorNotice('Could not read the selected file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Theme Actions */}
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <WashiLabel>Theme Studio 3.2 · Universal Design System</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-balance">
              Shape Clearspace to match how you think and work
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--cs-text-muted)' }}>
              Explore minimal, executive, editorial, monochrome, vibrant, pastel, or dark workspaces — or craft your own
              design system with live preview before applying.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openCreateScratchModal(false)}
              className="cs-btn-primary px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> New Custom Theme
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportThemeFile}
              className="hidden"
              aria-label="Import theme JSON file"
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="cs-surface-muted px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" /> Import Theme
            </button>

            <button
              type="button"
              onClick={() => handleExportTheme(draftTheme)}
              className="cs-surface-muted px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Export Current
            </button>

            {savedEffective.decorations === 'expressive' && (
              <div className="hidden sm:flex items-center gap-1.5 pl-1">
                <BotanicalAccent className="w-5 h-5" />
                <CelestialAccent className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {(notice || errorNotice) && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between gap-3 ${
              errorNotice ? 'cs-status-danger' : 'cs-surface-muted'
            }`}
          >
            <span>{errorNotice || notice}</span>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setErrorNotice(null);
              }}
              className="underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Style Category & Light/Dark Filters */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--cs-text-muted)' }}>
              Aesthetic styles ({filteredThemes.length} shown)
            </span>
            <div className="flex items-center gap-1 cs-surface-muted p-1 rounded-xl">
              {(['all', 'light', 'dark'] as ModeFilter[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                    modeFilter === m ? 'cs-btn-primary' : ''
                  }`}
                >
                  {m === 'all' ? 'All modes' : m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter themes by style category">
            <button
              type="button"
              role="tab"
              aria-selected={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all' ? 'cs-btn-primary' : 'cs-surface-muted'
              }`}
            >
              All ({allThemes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={categoryFilter === 'custom'}
              onClick={() => setCategoryFilter('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap ${
                categoryFilter === 'custom' ? 'cs-btn-primary' : 'cs-surface-muted'
              }`}
            >
              Custom ({customThemes.length})
            </button>
            {THEME_STYLE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={categoryFilter === cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap ${
                  categoryFilter === cat.id ? 'cs-btn-primary' : 'cs-surface-muted'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Collection Grid */}
        {filteredThemes.length === 0 ? (
          <div className="cs-surface-muted rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm font-medium">No themes match this filter yet.</p>
            <button
              type="button"
              onClick={() => openCreateScratchModal(false)}
              className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create a custom theme
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredThemes.map((theme) => {
              const isSavedActive = themeSettings.activeTheme === theme.id;
              const isDraftSelected = draftTheme.id === theme.id;
              const categoryMeta = THEME_STYLE_CATEGORIES.find((c) => c.id === theme.category);

              return (
                <div
                  key={theme.id}
                  data-testid={`theme-card-${theme.id}`}
                  className="rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-all"
                  style={{
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: isSavedActive
                      ? theme.colors.accent
                      : isDraftSelected
                        ? theme.colors.accentSecondary
                        : theme.colors.border,
                    boxShadow: isSavedActive
                      ? `0 0 0 2px ${theme.colors.accent}`
                      : isDraftSelected
                        ? `0 0 0 2px ${theme.colors.accentSecondary}`
                        : undefined,
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate">{theme.name}</div>
                        <div className="text-[11px] flex items-center gap-1.5" style={{ color: theme.colors.textMuted }}>
                          <span>{categoryMeta?.label || theme.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{theme.isDark ? 'Dark' : 'Light'}</span>
                          {!theme.builtIn ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Custom</span>
                            </>
                          ) : (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Built-in
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {isSavedActive && (
                        <span
                          aria-label="Active theme"
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: theme.colors.accent, color: theme.colors.accentInk }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <p className="text-xs line-clamp-2" style={{ color: theme.colors.textMuted }}>
                      {theme.tagline}
                    </p>

                    {/* Color Palette Strip */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span
                        className="w-5 h-5 rounded-md border"
                        style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border }}
                        title="Background"
                      />
                      <span
                        className="w-5 h-5 rounded-md border"
                        style={{ backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }}
                        title="Surface"
                      />
                      <span
                        className="w-5 h-5 rounded-md"
                        style={{ backgroundColor: theme.colors.accent }}
                        title="Primary accent"
                      />
                      <span
                        className="w-5 h-5 rounded-md"
                        style={{ backgroundColor: theme.colors.accentSecondary }}
                        title="Secondary accent"
                      />
                      <span
                        className="w-5 h-5 rounded-md"
                        style={{ backgroundColor: theme.colors.text }}
                        title="Text ink"
                      />
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                    <button
                      type="button"
                      aria-label={`Preview ${theme.name}`}
                      onClick={() => {
                        setDraftTheme(structuredClone(theme));
                        setNotice(`Previewing "${theme.name}" — click Apply Theme to save.`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor: theme.colors.surfaceMuted,
                        color: theme.colors.text,
                      }}
                    >
                      {isDraftSelected && !isSavedActive ? 'Previewing' : 'Preview'}
                    </button>

                    <button
                      type="button"
                      aria-label={isSavedActive ? `${theme.name} applied` : `Apply ${theme.name}`}
                      onClick={() => handleQuickApplyPreset(theme)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor: theme.colors.accent,
                        color: theme.colors.accentInk,
                      }}
                    >
                      {isSavedActive ? 'Applied' : 'Apply'}
                    </button>

                    <button
                      type="button"
                      aria-label={`Duplicate ${theme.name}`}
                      onClick={() => handleDuplicateTheme(theme)}
                      className="p-1.5 rounded-lg cursor-pointer ml-auto"
                      style={{ backgroundColor: theme.colors.surfaceMuted, color: theme.colors.text }}
                      title="Duplicate as custom theme"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      aria-label={`Export ${theme.name}`}
                      onClick={() => handleExportTheme(theme)}
                      className="p-1.5 rounded-lg cursor-pointer"
                      style={{ backgroundColor: theme.colors.surfaceMuted, color: theme.colors.text }}
                      title="Export theme JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {!theme.builtIn && (
                      <>
                        <button
                          type="button"
                          aria-label={`Rename ${theme.name}`}
                          onClick={() => {
                            setRenameTarget(theme);
                            setRenameValue(theme.name);
                          }}
                          className="p-1.5 rounded-lg cursor-pointer"
                          style={{ backgroundColor: theme.colors.surfaceMuted, color: theme.colors.text }}
                          title="Rename custom theme"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${theme.name}`}
                          onClick={() => setDeleteTarget(theme)}
                          className="p-1.5 rounded-lg cursor-pointer"
                          style={{ backgroundColor: theme.colors.surfaceMuted, color: theme.colors.danger }}
                          title="Delete custom theme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Split Builder (Left) + Sticky Live Theme Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <ThemeBuilderControls draftTheme={draftTheme} onUpdateDraft={setDraftTheme} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-6">
          <ThemeLivePreview
            draftTheme={draftTheme}
            savedTheme={savedEffective}
            hasUnsavedChanges={hasUnsavedChanges}
            onApply={() => applyThemeConfig(draftTheme)}
            onCancel={handleCancelDraft}
            onReset={handleResetToBase}
            onSaveAsCustom={() => openCreateScratchModal(true)}
          />
        </div>
      </div>

      {/* Create Custom Theme Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleCreateCustomTheme} className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4" />
              <h3 className="font-display text-lg font-semibold">
                {saveFromDraft ? 'Save current design as custom theme' : 'Create custom theme'}
              </h3>
            </div>

            <div className="space-y-1">
              <label htmlFor="ct-name" className="block text-xs font-medium">Theme name</label>
              <input
                id="ct-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Deep Focus Slate"
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="ct-cat" className="block text-xs font-medium">Style category</label>
              <select
                id="ct-cat"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ThemeStyleCategory)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              >
                {THEME_STYLE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {!saveFromDraft && (
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsDark}
                  onChange={(e) => setNewIsDark(e.target.checked)}
                />
                <span>Start from a dark canvas base</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium cs-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer">
                Save Theme
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Custom Theme Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleConfirmRename} className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Rename custom theme</h3>
            <div className="space-y-1">
              <label htmlFor="rt-name" className="block text-xs font-medium">New theme name</label>
              <input
                id="rt-name"
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium cs-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer">
                Save Name
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Custom Theme Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Delete &ldquo;{deleteTarget.name}&rdquo;?</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
              This permanently removes this custom theme from your local workspace. Built-in themes are always protected.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium cs-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
              >
                Delete Theme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
