import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { MyDayView } from './components/MyDayView';
import { PulseCheckView } from './components/PulseCheckView';
import { TasksAreasView } from './components/TasksAreasView';
import { StudySchedulesView } from './components/StudySchedulesView';
import { CalendarView } from './components/CalendarView';
import { MoneyTrackerView } from './components/MoneyTrackerView';
import { FocusRoomView } from './components/FocusRoomView';
import { GoalsView } from './components/GoalsView';
import { JournalView } from './components/JournalView';
import { MooncycleView } from './components/MooncycleView';
import { MyTrackersView } from './components/MyTrackersView';
import {
  DayEchoView,
  LifeBalanceView,
  LifeTimelineView,
  MonthlyReviewView,
  WeeklyResetView,
} from './components/SignatureViews';
import { ThemeStudioView } from './components/ThemeStudioView';
import { SettingsBackupView } from './components/SettingsBackupView';
import { NavSectionId } from './types/clearspace';

function ClearspaceShell() {
  const { loadingData, lastError, clearError } = useData();
  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);

  const handleOpenTracker = (trackerId?: string) => {
    setSelectedTrackerId(trackerId || null);
    setActiveSection('trackers');
  };

  return (
    <div className="cs-app-shell min-h-screen flex flex-col lg:flex-row">
      <SidebarNav
        activeSection={activeSection}
        onSelect={(section) => {
          if (section !== 'trackers') setSelectedTrackerId(null);
          setActiveSection(section);
        }}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((v) => !v)}
      />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
        {lastError && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs flex items-center justify-between gap-3">
            <span>Storage notice: {lastError}</span>
            <button type="button" onClick={clearError} className="underline cursor-pointer shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {loadingData ? (
          <div className="cs-card rounded-3xl p-8 space-y-4">
            <div className="h-6 w-48 rounded-lg cs-surface-muted animate-pulse" />
            <div className="h-24 rounded-2xl cs-surface-muted animate-pulse" />
            <div className="h-40 rounded-2xl cs-surface-muted animate-pulse" />
          </div>
        ) : (
          <>
            {activeSection === 'dashboard' && (
              <DashboardView onNavigate={setActiveSection} onOpenTracker={handleOpenTracker} />
            )}
            {activeSection === 'my-day' && <MyDayView />}
            {activeSection === 'pulse' && <PulseCheckView onNavigate={setActiveSection} />}
            {activeSection === 'tasks' && <TasksAreasView onNavigate={setActiveSection} />}
            {activeSection === 'study' && <StudySchedulesView />}
            {activeSection === 'calendar' && <CalendarView />}
            {activeSection === 'money' && <MoneyTrackerView />}
            {activeSection === 'focus' && <FocusRoomView />}
            {activeSection === 'goals' && <GoalsView />}
            {activeSection === 'journal' && <JournalView />}
            {activeSection === 'mooncycle' && <MooncycleView onNavigate={setActiveSection} />}
            {activeSection === 'trackers' && (
              <MyTrackersView
                initialSelectedTrackerId={selectedTrackerId}
                onClearInitialSelection={() => setSelectedTrackerId(null)}
              />
            )}
            {activeSection === 'day-echo' && <DayEchoView />}
            {activeSection === 'life-balance' && <LifeBalanceView />}
            {activeSection === 'life-timeline' && <LifeTimelineView />}
            {activeSection === 'weekly-reset' && <WeeklyResetView />}
            {activeSection === 'monthly-review' && <MonthlyReviewView />}
            {activeSection === 'themes' && <ThemeStudioView />}
            {activeSection === 'settings' && <SettingsBackupView />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <ClearspaceShell />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
