import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_THEMES,
  buildThemeCssVariables,
  createBlankCustomTheme,
  createCustomThemeFromBase,
  exportThemeConfigJson,
  getContrastRatio,
  pickReadableInk,
  resolveEffectiveTheme,
  THEME_STYLE_CATEGORIES,
  validateAndParseThemeImport,
} from './themeEngine';
import { sanitizeMetaPayload } from './sanitizers';

test('retains all six legacy theme identifiers and covers all 10 requested aesthetic categories', () => {
  const legacyIds = [
    'strawberry-milk',
    'matcha-garden',
    'lavender-dreams',
    'peach-picnic',
    'seaside-diary',
    'moonlit-journal',
  ];
  for (const id of legacyIds) {
    assert.ok(id in BUILTIN_THEMES, `Missing legacy theme ${id}`);
  }

  const allBuiltIns = Object.values(BUILTIN_THEMES);
  const coveredCategories = new Set(allBuiltIns.map((t) => t.category));
  for (const cat of THEME_STYLE_CATEGORIES) {
    assert.ok(coveredCategories.has(cat.id), `Missing built-in theme for category ${cat.id}`);
  }

  assert.ok(allBuiltIns.some((t) => t.isDark), 'Should include dark themes');
  assert.ok(allBuiltIns.some((t) => !t.isDark), 'Should include light themes');
});

test('resolveEffectiveTheme and buildThemeCssVariables reflect overrides and legacy flags', () => {
  const effective = resolveEffectiveTheme({
    activeTheme: 'executive-slate',
    customAccent: '#0F766E',
    compactMode: true,
    decorativeStickers: false,
    overrides: {
      layout: { cornerStyle: 'sharp', sidebarStyle: 'minimal' },
      effects: { pattern: 'grid' },
      motion: 'none',
    },
  });

  assert.equal(effective.colors.accent, '#0F766E');
  assert.equal(effective.decorations, 'none');
  assert.equal(effective.layout.density, 'compact');
  assert.equal(effective.layout.cornerStyle, 'sharp');
  assert.equal(effective.effects.pattern, 'grid');
  assert.equal(effective.motion, 'none');

  const vars = buildThemeCssVariables(effective);
  assert.equal(vars['--cs-accent'], '#0F766E');
  assert.equal(vars['--cs-radius-card'], '0.375rem');
  assert.equal(vars['--cs-transition-ms'], '0ms');
  assert.ok(vars['--cs-pattern-image'].includes('linear-gradient'));
});

test('contrast helper picks high-contrast ink and calculates WCAG ratio accurately', () => {
  assert.equal(pickReadableInk('#0B1120'), '#FFFFFF');
  assert.equal(pickReadableInk('#FAFAFA'), '#111827');
  assert.ok(getContrastRatio('#111827', '#FFFFFF') > 15);
});

test('custom theme creation, duplication, export, and import validation protect built-in IDs', () => {
  const blank = createBlankCustomTheme('Studio Slate', true);
  assert.equal(blank.builtIn, false);
  assert.equal(blank.isDark, true);
  assert.equal(blank.name, 'Studio Slate');

  const dup = createCustomThemeFromBase(BUILTIN_THEMES['broadsheet-classic'], 'Newspaper Copy');
  assert.equal(dup.builtIn, false);
  assert.notEqual(dup.id, 'broadsheet-classic');
  assert.equal(dup.typography.headingFont, 'playfair');

  const exported = exportThemeConfigJson(dup);
  const jsonStr = JSON.stringify(exported);
  const parsed = validateAndParseThemeImport(jsonStr);
  assert.equal(parsed.valid, true);
  assert.ok(parsed.theme);
  assert.equal(parsed.theme?.builtIn, false);
  assert.equal(parsed.theme?.name, 'Newspaper Copy');

  const invalid = validateAndParseThemeImport('{"hello":"world"}');
  assert.equal(invalid.valid, false);
});

test('sanitizeMetaPayload preserves legacy themeSettings and customThemes', () => {
  const legacySanitized = sanitizeMetaPayload('themeSettings', 'local_user', {
    activeTheme: 'matcha-garden',
    customAccent: '#123456',
    decorativeStickers: true,
    compactMode: false,
  });
  assert.equal((legacySanitized as any).activeTheme, 'matcha-garden');

  const custom = createBlankCustomTheme('Midnight Carbon');
  const withCustom = sanitizeMetaPayload('themeSettings', 'local_user', {
    activeTheme: custom.id,
    customThemes: [custom],
  });
  assert.equal((withCustom as any).activeTheme, custom.id);
  assert.equal((withCustom as any).customThemes.length, 1);
});
