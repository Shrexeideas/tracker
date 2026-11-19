import { ThemeId, ThemeSettings } from '../types/clearspace';
import {
  applyThemeDefinitionToDocument,
  BUILTIN_THEMES,
  resolveEffectiveTheme,
} from '../utils/themeEngine';

export interface ThemePalette {
  id: ThemeId;
  name: string;
  tagline: string;
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  washi: string;
  shadow: string;
  swatches: string[];
}

export const CLEARSPACE_THEMES: Record<string, ThemePalette> = Object.fromEntries(
  Object.values(BUILTIN_THEMES).map((t) => [
    t.id,
    {
      id: t.id,
      name: t.name,
      tagline: t.tagline,
      isDark: t.isDark,
      bg: t.colors.bg,
      surface: t.colors.surface,
      surfaceMuted: t.colors.surfaceMuted,
      border: t.colors.border,
      text: t.colors.text,
      textMuted: t.colors.textMuted,
      accent: t.colors.accent,
      accentSoft: t.colors.accentSoft,
      accentInk: t.colors.accentInk,
      washi: t.colors.washi,
      shadow:
        t.effects.shadows === 'none'
          ? 'none'
          : t.isDark
            ? '0 8px 24px -8px rgba(0, 0, 0, 0.45)'
            : '0 4px 20px -6px rgba(15, 23, 42, 0.08)',
      swatches: t.swatches,
    },
  ])
);

export function applyThemeToDocument(themeId: ThemeId, customAccent?: string, fullSettings?: Partial<ThemeSettings>): void {
  const effective = resolveEffectiveTheme({
    ...(fullSettings || {}),
    activeTheme: themeId,
    customAccent: customAccent ?? fullSettings?.customAccent ?? '',
  });
  applyThemeDefinitionToDocument(effective);
}

export * from '../utils/themeEngine';
