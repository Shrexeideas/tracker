import React, { useState } from 'react';
import { ThemeDefinition } from '../../types/clearspace';
import { buildThemeCssVariables, getContrastRatio, pickReadableInk } from '../../utils/themeEngine';
import {
  BookmarkPlus,
  CalendarDays,
  Check,
  Columns2,
  Home,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

interface ThemeLivePreviewProps {
  draftTheme: ThemeDefinition;
  savedTheme: ThemeDefinition;
  hasUnsavedChanges: boolean;
  onApply: () => void;
  onCancel: () => void;
  onReset: () => void;
  onSaveAsCustom: () => void;
}

function ScopedPreviewFrame({
  theme,
  label,
}: {
  theme: ThemeDefinition;
  label: string;
}) {
  const varsMap = buildThemeCssVariables(theme);
  const vars = varsMap as React.CSSProperties;
  const [sampleDone, setSampleDone] = useState(true);
  const [sampleInput, setSampleInput] = useState('Quarterly review notes');
  const [sampleSelect, setSampleSelect] = useState('Focus');

  const bodyContrast = getContrastRatio(theme.colors.text, theme.colors.surface);
  const accentContrast = getContrastRatio(theme.colors.accentInk, theme.colors.accent);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
        <span className="font-semibold">{label}: {theme.name}</span>
        <span className="font-mono-num">
          Text {bodyContrast}:1 · CTA {accentContrast}:1
        </span>
      </div>

      <div
        data-testid={`theme-preview-${label.toLowerCase().replace(/\s+/g, '-')}`}
        data-cs-texture={theme.effects.texture}
        data-cs-motion={theme.motion}
        data-cs-decorations={theme.decorations}
        data-cs-sidebar={theme.layout.sidebarStyle}
        data-cs-density={theme.layout.density}
        className={`cs-preview-surface relative overflow-hidden border transition-all ${theme.isDark ? 'dark' : ''}`}
        style={{
          ...vars,
          backgroundColor: theme.colors.bg,
          backgroundImage: `${varsMap['--cs-pattern-image'] || 'none'}, ${varsMap['--cs-bg-image'] || 'none'}`,
          backgroundSize: `${varsMap['--cs-pattern-size'] || 'auto'}, cover`,
          color: theme.colors.text,
          borderColor: theme.colors.border,
          borderRadius: varsMap['--cs-radius-card'],
          fontFamily: varsMap['--font-sans'],
        }}
      >
        <div className="relative z-10 grid grid-cols-12 min-h-[340px]">
          {/* Preview Sidebar */}
          <div
            className="col-span-4 p-3 flex flex-col justify-between border-r"
            style={{
              backgroundColor: varsMap['--cs-sidebar-bg'],
              borderColor: theme.colors.border,
              borderRightWidth: varsMap['--cs-border-width'],
              borderRightStyle: varsMap['--cs-border-style'] as React.CSSProperties['borderRightStyle'],
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-1">
                <span
                  className="text-sm font-semibold truncate"
                  style={{ fontFamily: varsMap['--font-display'] }}
                >
                  Clearspace
                </span>
                {theme.decorations === 'expressive' && (
                  <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: theme.colors.accent }} />
                )}
                {theme.decorations === 'minimal' && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme.colors.accent }} />
                )}
              </div>

              <nav className="space-y-1 text-[11px]" aria-label="Preview navigation">
                <div
                  className="flex items-center gap-1.5 px-2 py-1.5 font-medium"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.colors.accentInk,
                    borderRadius: varsMap['--cs-radius-control'],
                  }}
                >
                  <Home className="w-3 h-3 shrink-0" />
                  <span className="truncate">Dashboard</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 opacity-80">
                  <CalendarDays className="w-3 h-3 shrink-0" />
                  <span className="truncate">Calendar</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 opacity-80">
                  <LayoutGrid className="w-3 h-3 shrink-0" />
                  <span className="truncate">Trackers</span>
                </div>
              </nav>
            </div>

            <div
              className="p-2 text-[10px] truncate"
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                color: theme.colors.textMuted,
                borderRadius: varsMap['--cs-radius-control'],
                borderWidth: varsMap['--cs-border-width'],
                borderStyle: varsMap['--cs-border-style'] as React.CSSProperties['borderStyle'],
                borderColor: theme.colors.border,
              }}
            >
              {theme.isDark ? 'Dark Workspace' : 'Light Workspace'}
            </div>
          </div>

          {/* Preview Main Area: Dashboard, Calendar, Tasks, Progress, Inputs, Buttons */}
          <div className="col-span-8 p-3.5 space-y-3">
            {/* Dashboard Header & Calendar mini */}
            <div
              className="p-3 space-y-2"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: varsMap['--cs-border-width'],
                borderStyle: varsMap['--cs-border-style'] as React.CSSProperties['borderStyle'],
                borderRadius: varsMap['--cs-radius-card'],
                boxShadow: varsMap['--cs-shadow'],
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div
                    className="text-[10px] tracking-wide"
                    style={{
                      color: theme.decorations === 'expressive' ? theme.colors.text : theme.colors.textMuted,
                      backgroundColor:
                        theme.decorations === 'expressive'
                          ? theme.colors.washi
                          : theme.decorations === 'minimal'
                            ? theme.colors.accentSoft
                            : 'transparent',
                      padding: theme.decorations === 'none' ? '0' : '2px 6px',
                      borderRadius: varsMap['--cs-radius-sm'],
                      display: 'inline-block',
                    }}
                  >
                    Today&apos;s Overview
                  </div>
                  <h4
                    className="text-sm font-semibold mt-1"
                    style={{
                      fontFamily: varsMap['--font-display'],
                      fontWeight: varsMap['--cs-weight-heading'],
                    }}
                  >
                    Good afternoon
                  </h4>
                </div>
                <div className="text-right font-mono-num">
                  <div className="text-sm font-semibold" style={{ color: theme.colors.accent }}>
                    78%
                  </div>
                  <div className="text-[10px]" style={{ color: theme.colors.textMuted }}>
                    weekly rhythm
                  </div>
                </div>
              </div>

              {/* Progress bars */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.surfaceMuted }}>
                  <div className="h-full rounded-full" style={{ width: '78%', backgroundColor: theme.colors.accent }} />
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.surfaceMuted }}>
                  <div className="h-full rounded-full" style={{ width: '54%', backgroundColor: theme.colors.accentSecondary }} />
                </div>
              </div>
            </div>

            {/* Mini Calendar + Task Card */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-2.5 space-y-1.5"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: varsMap['--cs-border-width'],
                  borderStyle: varsMap['--cs-border-style'] as React.CSSProperties['borderStyle'],
                  borderRadius: varsMap['--cs-radius-control'],
                }}
              >
                <div className="text-[10px] font-semibold" style={{ color: theme.colors.textMuted }}>
                  Nov · Week
                </div>
                <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-mono-num">
                  {['17', '18', '19', '20', '21'].map((day, idx) => (
                    <div
                      key={day}
                      className="py-1 font-medium"
                      style={{
                        backgroundColor: idx === 2 ? theme.colors.accent : theme.colors.surfaceMuted,
                        color: idx === 2 ? theme.colors.accentInk : theme.colors.text,
                        borderRadius: varsMap['--cs-radius-sm'],
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Task Card */}
              <div
                className="p-2.5 space-y-1.5"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: varsMap['--cs-border-width'],
                  borderStyle: varsMap['--cs-border-style'] as React.CSSProperties['borderStyle'],
                  borderRadius: varsMap['--cs-radius-control'],
                }}
              >
                <button
                  type="button"
                  onClick={() => setSampleDone((v) => !v)}
                  className="w-full flex items-start gap-2 text-left cursor-pointer"
                >
                  <span
                    className="w-4 h-4 mt-0.5 flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: sampleDone ? theme.colors.accent : 'transparent',
                      borderColor: sampleDone ? theme.colors.accent : theme.colors.border,
                      color: theme.colors.accentInk,
                      borderRadius: varsMap['--cs-radius-sm'],
                    }}
                  >
                    {sampleDone && <Check className="w-2.5 h-2.5" />}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-medium truncate ${sampleDone ? 'line-through opacity-70' : ''}`}>
                      Deep work sprint
                    </div>
                    <div className="text-[9px] truncate" style={{ color: theme.colors.textMuted }}>
                      10:00 · Priority
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Inputs & Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  aria-label={`Preview input ${label}`}
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px]"
                  style={{
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    borderWidth: varsMap['--cs-border-width'],
                    borderStyle: varsMap['--cs-border-style'] as React.CSSProperties['borderStyle'],
                    borderRadius: varsMap['--cs-radius-control'],
                  }}
                />
                <select
                  aria-label={`Preview select ${label}`}
                  value={sampleSelect}
                  onChange={(e) => setSampleSelect(e.target.value)}
                  className="w-full px-2 py-1.5 text-[11px]"
                  style={{
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    borderWidth: varsMap['--cs-border-width'],
                    borderStyle: varsMap['--cs-border-style'] as React.CSSProperties['borderStyle'],
                    borderRadius: varsMap['--cs-radius-control'],
                  }}
                >
                  <option value="Focus">Focus</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  className="px-2.5 py-1 font-medium cursor-pointer"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.colors.accentInk,
                    borderRadius: varsMap['--cs-radius-control'],
                  }}
                >
                  Primary CTA
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 font-medium cursor-pointer"
                  style={{
                    backgroundColor: theme.colors.accentSecondary,
                    color: pickReadableInk(theme.colors.accentSecondary),
                    borderRadius: varsMap['--cs-radius-control'],
                  }}
                >
                  Secondary
                </button>
                <span
                  className="px-2 py-1 font-medium"
                  style={{
                    color: theme.colors.success,
                    backgroundColor: varsMap['--cs-success-soft'],
                    borderRadius: varsMap['--cs-radius-sm'],
                  }}
                >
                  Saved
                </span>
                <span
                  className="px-2 py-1 font-medium"
                  style={{
                    color: theme.colors.warning,
                    backgroundColor: varsMap['--cs-warning-soft'],
                    borderRadius: varsMap['--cs-radius-sm'],
                  }}
                >
                  Notice
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeLivePreview({
  draftTheme,
  savedTheme,
  hasUnsavedChanges,
  onApply,
  onCancel,
  onReset,
  onSaveAsCustom,
}: ThemeLivePreviewProps) {
  const [compareMode, setCompareMode] = useState(false);

  return (
    <section className="cs-card rounded-3xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Live Theme Preview</h2>
          <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            {hasUnsavedChanges
              ? 'Previewing uncommitted changes — apply when ready.'
              : 'Matches your active workspace appearance.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCompareMode((v) => !v)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
            compareMode ? 'cs-btn-primary' : 'cs-surface-muted'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          {compareMode ? 'Single view' : 'Compare'}
        </button>
      </div>

      <div className={compareMode ? 'grid grid-cols-1 gap-4' : 'space-y-4'}>
        <ScopedPreviewFrame theme={draftTheme} label={compareMode ? 'Draft Preview' : 'Preview'} />
        {compareMode && <ScopedPreviewFrame theme={savedTheme} label="Current Saved" />}
      </div>

      {/* Apply / Cancel / Reset / Save Custom controls */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--cs-border)' }}>
        <button
          type="button"
          onClick={onApply}
          className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          Apply Theme
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={!hasUnsavedChanges}
          className="cs-surface-muted px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>

        <button
          type="button"
          onClick={onReset}
          className="cs-surface-muted px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>

        <button
          type="button"
          onClick={onSaveAsCustom}
          className="cs-surface-muted px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          Save as Custom
        </button>
      </div>
    </section>
  );
}
