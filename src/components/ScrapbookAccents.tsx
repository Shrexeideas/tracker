import React from 'react';
import { useData } from '../context/DataContext';
import { resolveEffectiveTheme } from '../utils/themeEngine';

export function WashiLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="cs-washi-tape inline-flex items-center px-3 py-1 rounded-sm text-xs font-medium tracking-wide -rotate-1 select-none">
      {children}
    </span>
  );
}

export function BotanicalAccent({ className = 'w-6 h-6' }: { className?: string }) {
  const { themeSettings } = useData();
  const effective = resolveEffectiveTheme(themeSettings);
  if (effective.decorations === 'none') return null;
  if (effective.decorations === 'minimal') {
    return (
      <span
        aria-hidden="true"
        className="inline-block w-2 h-2 rounded-full opacity-75"
        style={{ backgroundColor: 'var(--cs-accent)' }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ color: 'var(--cs-accent)' }}
    >
      <path
        d="M16 27C16 27 16 14 24 7C17 7 12 12 12 19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 22C12 20 8 16 7 10C12 10 15 13 16 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function CelestialAccent({ className = 'w-5 h-5' }: { className?: string }) {
  const { themeSettings } = useData();
  const effective = resolveEffectiveTheme(themeSettings);
  if (effective.decorations !== 'expressive') return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ color: 'var(--cs-accent)' }}
    >
      <path
        d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17.5 4.5v2M16.5 5.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
