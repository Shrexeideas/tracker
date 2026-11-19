import React from 'react';
import { NavSectionId } from '../types/clearspace';
import { useData } from '../context/DataContext';
import { BotanicalAccent } from './ScrapbookAccents';
import {
  Activity,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clock,
  FileBarChart2,
  GraduationCap,
  HardDrive,
  History,
  Home,
  LayoutGrid,
  Menu,
  Moon,
  Palette,
  RefreshCw,
  Scale,
  Settings,
  Sparkles,
  Sun,
  Target,
  Wallet,
  X,
} from 'lucide-react';

interface NavGroup {
  label: string;
  items: { id: NavSectionId; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Daily Flow',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'my-day', label: 'My Day', icon: Sun },
      { id: 'pulse', label: 'Pulse Check', icon: Activity },
    ],
  },
  {
    label: 'Organize',
    items: [
      { id: 'tasks', label: 'Tasks & Areas', icon: CheckSquare },
      { id: 'study', label: 'Study Schedules', icon: GraduationCap },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Focus & Track',
    items: [
      { id: 'trackers', label: 'My Trackers', icon: LayoutGrid },
      { id: 'focus', label: 'Focus Room', icon: Clock },
      { id: 'money', label: 'Money Tracker', icon: Wallet },
      { id: 'goals', label: 'Goals', icon: Target },
      { id: 'journal', label: 'Journal', icon: BookOpen },
    ],
  },
  {
    label: 'Personal Care',
    items: [{ id: 'mooncycle', label: 'Mooncycle', icon: Moon }],
  },
  {
    label: 'Reflect',
    items: [
      { id: 'day-echo', label: 'Day Echo', icon: Sparkles },
      { id: 'life-balance', label: 'Life Balance', icon: Scale },
      { id: 'life-timeline', label: 'Life Timeline', icon: History },
      { id: 'weekly-reset', label: 'Weekly Reset', icon: RefreshCw },
      { id: 'monthly-review', label: 'Monthly Review', icon: FileBarChart2 },
    ],
  },
  {
    label: 'Space',
    items: [
      { id: 'themes', label: 'Theme Studio', icon: Palette },
      { id: 'settings', label: 'Backup & Settings', icon: Settings },
    ],
  },
];

interface SidebarNavProps {
  activeSection: NavSectionId;
  onSelect: (id: NavSectionId) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}

export function SidebarNav({ activeSection, onSelect, mobileOpen, onToggleMobile }: SidebarNavProps) {
  const { profile, themeSettings, syncStatus, storageEngine } = useData();

  const renderLinks = () => (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-0.5">
          <div className="px-3 text-[11px] font-semibold tracking-wider uppercase opacity-65">
            {group.label}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  if (mobileOpen) onToggleMobile();
                }}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active ? 'cs-btn-primary' : 'hover:opacity-85'
                }`}
                style={!active ? { color: 'var(--cs-text)' } : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderWorkspaceFooter = () => (
    <div className="p-3 border-t space-y-2.5" style={{ borderColor: 'var(--cs-border)' }}>
      <div className="flex items-center gap-2.5 px-2 py-1">
        <span className="text-xl leading-none" aria-hidden="true">
          {profile.avatarEmoji || '🌸'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{profile.displayName || 'Clearspace'}</div>
          <div className="text-xs truncate" style={{ color: 'var(--cs-text-muted)' }}>
            {syncStatus === 'saving'
              ? 'Saving locally...'
              : syncStatus === 'error'
                ? 'Local storage warning'
                : `Local Mode · ${storageEngine}`}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onSelect('settings');
          if (mobileOpen) onToggleMobile();
        }}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl cs-surface-muted text-xs font-medium cursor-pointer hover:opacity-90"
      >
        <HardDrive className="w-3.5 h-3.5" />
        Backup &amp; Local Data
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header
        className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 border-b"
        style={{ backgroundColor: 'var(--cs-sidebar-bg)', borderColor: 'var(--cs-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleMobile}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 rounded-xl cs-surface-muted cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-display text-lg font-semibold whitespace-nowrap">Clearspace</span>
        </div>
        <button
          type="button"
          onClick={() => onSelect('my-day')}
          className="cs-btn-primary px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          My Day
        </button>
      </header>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onToggleMobile}
            aria-hidden="true"
          />
          <aside
            className="cs-sidebar relative z-50 w-72 max-w-[85vw] h-full flex flex-col border-r"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--cs-border)' }}>
              <span className="font-display text-xl font-semibold">Clearspace</span>
              <button
                type="button"
                onClick={onToggleMobile}
                aria-label="Close navigation"
                className="p-1.5 rounded-lg cs-surface-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderLinks()}
            {renderWorkspaceFooter()}
          </aside>
        </div>
      )}

      {/* Desktop persistent sidebar */}
      <aside
        className="cs-sidebar hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r"
      >
        <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--cs-border)' }}>
          <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap">Clearspace</span>
          {themeSettings.decorativeStickers && <BotanicalAccent className="w-5 h-5" />}
        </div>
        {renderLinks()}
        {renderWorkspaceFooter()}
      </aside>
    </>
  );
}
