import React, { useState } from 'react';
import {
  ThemeBorderStyle,
  ThemeCardSpacing,
  ThemeColors,
  ThemeCornerStyle,
  ThemeDecorationLevel,
  ThemeDefinition,
  ThemeEffects,
  ThemeFontId,
  ThemeFontSize,
  ThemeFontWeight,
  ThemeMotionLevel,
  ThemeSidebarStyle,
} from '../../types/clearspace';
import {
  FONT_CATALOG,
  FONT_PAIRING_PRESETS,
  getContrastRatio,
  mixHexColors,
  pickReadableInk,
} from '../../utils/themeEngine';
import { Sparkles, Type, Layout, Palette } from 'lucide-react';

type BuilderTab = 'colors' | 'typography' | 'layout' | 'effects';

interface ThemeBuilderControlsProps {
  draftTheme: ThemeDefinition;
  onUpdateDraft: (updater: (prev: ThemeDefinition) => ThemeDefinition) => void;
}

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'bg', label: 'Main background', hint: 'Primary workspace canvas' },
  { key: 'bgSecondary', label: 'Secondary background', hint: 'Gradient / tinted canvas depth' },
  { key: 'surface', label: 'Card background', hint: 'Primary card & modal surfaces' },
  { key: 'surfaceMuted', label: 'Subtle card surface', hint: 'Nested sections & pills' },
  { key: 'accent', label: 'Primary accent', hint: 'Primary buttons & active states' },
  { key: 'accentSecondary', label: 'Secondary accent', hint: 'Secondary metrics & highlights' },
  { key: 'text', label: 'Main text', hint: 'Headings & primary body prose' },
  { key: 'textMuted', label: 'Muted text', hint: 'Labels, captions & metadata' },
  { key: 'border', label: 'Borders', hint: 'Hairlines & card dividers' },
  { key: 'success', label: 'Success colour', hint: 'Completed & healthy states' },
  { key: 'warning', label: 'Warning colour', hint: 'Notices & cautions' },
];

export function ThemeBuilderControls({ draftTheme, onUpdateDraft }: ThemeBuilderControlsProps) {
  const [tab, setTab] = useState<BuilderTab>('colors');

  const updateColor = (key: keyof ThemeColors, value: string) => {
    onUpdateDraft((prev) => {
      const nextColors: ThemeColors = { ...prev.colors, [key]: value };
      if (key === 'accent') {
        nextColors.accentInk = pickReadableInk(value);
        nextColors.accentSoft = mixHexColors(
          prev.isDark ? nextColors.surface : '#FFFFFF',
          value,
          prev.isDark ? 0.22 : 0.14
        );
      }
      return {
        ...prev,
        colors: nextColors,
      };
    });
  };

  const autoFixContrast = () => {
    onUpdateDraft((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        accentInk: pickReadableInk(prev.colors.accent),
        text: prev.isDark
          ? getContrastRatio(prev.colors.text, prev.colors.surface) < 4.5
            ? '#F3F4F6'
            : prev.colors.text
          : getContrastRatio(prev.colors.text, prev.colors.surface) < 4.5
            ? '#111827'
            : prev.colors.text,
      },
    }));
  };

  const textContrast = getContrastRatio(draftTheme.colors.text, draftTheme.colors.surface);
  const ctaContrast = getContrastRatio(draftTheme.colors.accentInk, draftTheme.colors.accent);

  return (
    <section className="cs-card rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Custom Theme Builder</h2>
          <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            Customize every color, font pairing, layout corner, surface texture, motion, and decoration level.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer cs-surface-muted px-3 py-1.5 rounded-xl">
          <input
            type="checkbox"
            checked={draftTheme.isDark}
            onChange={(e) =>
              onUpdateDraft((prev) => ({
                ...prev,
                isDark: e.target.checked,
              }))
            }
          />
          <span>Dark variant</span>
        </label>
      </div>

      {/* Builder Section Tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Theme customization sections">
        {(
          [
            ['colors', 'Colours', Palette],
            ['typography', 'Typography', Type],
            ['layout', 'Layout', Layout],
            ['effects', 'Effects & Motion', Sparkles],
          ] as [BuilderTab, string, React.ComponentType<{ className?: string }>][]
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === id ? 'cs-btn-primary' : 'cs-surface-muted'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 1. COLOURS */}
      {tab === 'colors' && (
        <div className="space-y-4">
          <div className="cs-surface-muted rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 font-mono-num">
              <span>
                Text/Card contrast: <strong>{textContrast}:1</strong>{' '}
                {textContrast >= 4.5 ? '(AA Pass)' : '(Low)'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                CTA Ink contrast: <strong>{ctaContrast}:1</strong>{' '}
                {ctaContrast >= 4.5 ? '(AA Pass)' : '(Low)'}
              </span>
            </div>
            {(textContrast < 4.5 || ctaContrast < 4.5) && (
              <button
                type="button"
                onClick={autoFixContrast}
                className="cs-btn-primary px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              >
                Auto-fix contrast
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key} className="cs-surface-muted rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <label htmlFor={`tc-${field.key}`} className="block text-xs font-semibold truncate">
                    {field.label}
                  </label>
                  <div className="text-[11px] truncate" style={{ color: 'var(--cs-text-muted)' }}>
                    {field.hint}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    id={`tc-${field.key}`}
                    type="color"
                    value={draftTheme.colors[field.key]}
                    onChange={(e) => updateColor(field.key, e.target.value)}
                    aria-label={`${field.label} picker`}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={draftTheme.colors[field.key]}
                    onChange={(e) => updateColor(field.key, e.target.value)}
                    aria-label={`${field.label} hex`}
                    className="cs-input w-20 px-2 py-1 text-[11px] font-mono-num"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TYPOGRAPHY */}
      {tab === 'typography' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold">Quick font family pairings</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FONT_PAIRING_PRESETS.map((preset) => {
                const active = draftTheme.typography.fontPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({
                        ...prev,
                        typography: {
                          ...prev.typography,
                          fontPreset: preset.id,
                          headingFont: preset.headingFont,
                          bodyFont: preset.bodyFont,
                        },
                      }))
                    }
                    className={`p-3 rounded-xl text-left text-xs cursor-pointer transition-colors ${
                      active ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {FONT_CATALOG[preset.headingFont].label} / {FONT_CATALOG[preset.bodyFont].label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="tb-head-font" className="block text-xs font-medium">Heading font</label>
              <select
                id="tb-head-font"
                value={draftTheme.typography.headingFont}
                onChange={(e) =>
                  onUpdateDraft((prev) => ({
                    ...prev,
                    typography: {
                      ...prev.typography,
                      fontPreset: 'custom',
                      headingFont: e.target.value as ThemeFontId,
                    },
                  }))
                }
                className="cs-input w-full px-3 py-2 rounded-xl text-xs"
              >
                {Object.entries(FONT_CATALOG).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="tb-body-font" className="block text-xs font-medium">Body font</label>
              <select
                id="tb-body-font"
                value={draftTheme.typography.bodyFont}
                onChange={(e) =>
                  onUpdateDraft((prev) => ({
                    ...prev,
                    typography: {
                      ...prev.typography,
                      fontPreset: 'custom',
                      bodyFont: e.target.value as ThemeFontId,
                    },
                  }))
                }
                className="cs-input w-full px-3 py-2 rounded-xl text-xs"
              >
                {Object.entries(FONT_CATALOG).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-medium">Base font size</span>
              <div className="flex gap-1.5">
                {(['sm', 'md', 'lg'] as ThemeFontSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({
                        ...prev,
                        typography: { ...prev.typography, fontSize: sz },
                      }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                      draftTheme.typography.fontSize === sz ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {sz === 'sm' ? 'Small (14px)' : sz === 'lg' ? 'Large (16.5px)' : 'Medium (15px)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-medium">Font weight</span>
              <div className="flex gap-1.5">
                {(['light', 'regular', 'bold'] as ThemeFontWeight[]).map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({
                        ...prev,
                        typography: { ...prev.typography, fontWeight: wt },
                      }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.typography.fontWeight === wt ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {wt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. LAYOUT */}
      {tab === 'layout' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium">Corner geometry</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  ['sharp', 'Sharp (4–6px)'],
                  ['balanced', 'Balanced (8–14px)'],
                  ['rounded', 'Rounded (12–24px)'],
                  ['pill', 'Soft Pill (18–28px)'],
                ] as [ThemeCornerStyle, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onUpdateDraft((prev) => ({ ...prev, layout: { ...prev.layout, cornerStyle: id } }))
                  }
                  className={`py-2 px-3 rounded-xl text-xs font-medium cursor-pointer ${
                    draftTheme.layout.cornerStyle === id ? 'cs-btn-primary' : 'cs-surface-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Card spacing</span>
              <div className="flex gap-1.5">
                {(['compact', 'comfortable', 'spacious'] as ThemeCardSpacing[]).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, layout: { ...prev.layout, cardSpacing: sp } }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.layout.cardSpacing === sp ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Overall layout density</span>
              <div className="flex gap-1.5">
                {(['compact', 'spacious'] as const).map((dn) => (
                  <button
                    key={dn}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, layout: { ...prev.layout, density: dn } }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.layout.density === dn ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {dn}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Sidebar appearance</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['solid', 'tinted', 'glass', 'minimal'] as ThemeSidebarStyle[]).map((sb) => (
                  <button
                    key={sb}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, layout: { ...prev.layout, sidebarStyle: sb } }))
                    }
                    className={`py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.layout.sidebarStyle === sb ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {sb}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Border style</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['hairline', 'crisp', 'dashed', 'none'] as ThemeBorderStyle[]).map((bs) => (
                  <button
                    key={bs}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, layout: { ...prev.layout, borderStyle: bs } }))
                    }
                    className={`py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.layout.borderStyle === bs ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {bs}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VISUAL EFFECTS, INTERACTIONS & DECORATIONS */}
      {tab === 'effects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Card shadows</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['none', 'Flat (None)'],
                    ['soft', 'Soft'],
                    ['elevated', 'Elevated'],
                    ['crisp-offset', 'Editorial Offset'],
                  ] as [ThemeEffects['shadows'], string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, effects: { ...prev.effects, shadows: id } }))
                    }
                    className={`py-2 px-2 rounded-xl text-xs font-medium cursor-pointer ${
                      draftTheme.effects.shadows === id ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Canvas gradients</span>
              <div className="flex gap-1.5">
                {(['none', 'subtle', 'vivid'] as ThemeEffects['gradients'][]).map((gr) => (
                  <button
                    key={gr}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, effects: { ...prev.effects, gradients: gr } }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.effects.gradients === gr ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {gr}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Surface texture</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['none', 'paper', 'noise', 'linen'] as ThemeEffects['texture'][]).map((tx) => (
                  <button
                    key={tx}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, effects: { ...prev.effects, texture: tx } }))
                    }
                    className={`py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.effects.texture === tx ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {tx}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Background pattern</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['none', 'dots', 'grid', 'diagonal'] as ThemeEffects['pattern'][]).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({ ...prev, effects: { ...prev.effects, pattern: pt } }))
                    }
                    className={`py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                      draftTheme.effects.pattern === pt ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: 'var(--cs-border)' }}>
            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Interaction motion</span>
              <div className="flex gap-1.5">
                {(
                  [
                    ['none', 'Disabled'],
                    ['subtle', 'Subtle'],
                    ['playful', 'Playful'],
                  ] as [ThemeMotionLevel, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onUpdateDraft((prev) => ({ ...prev, motion: id }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                      draftTheme.motion === id ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium">Decorative accents</span>
              <div className="flex gap-1.5">
                {(
                  [
                    ['none', 'None'],
                    ['minimal', 'Minimal'],
                    ['expressive', 'Expressive'],
                  ] as [ThemeDecorationLevel, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onUpdateDraft((prev) => ({ ...prev, decorations: id }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                      draftTheme.decorations === id ? 'cs-btn-primary' : 'cs-surface-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
