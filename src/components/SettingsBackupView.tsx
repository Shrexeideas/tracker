import React, { useEffect, useState } from 'react';
import { ImportSummary, useData } from '../context/DataContext';
import { BackupValidationResult, ImportMode } from '../db/types';
import { LegacyScanReport } from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDriveUpload,
  Trash2,
  Upload,
} from 'lucide-react';

const AVATAR_EMOJIS = ['🌸', '🌿', '🌙', '☀️', '🍓', '🍵', '🐚', '✨'];
const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

export function SettingsBackupView() {
  const {
    profile,
    preferences,
    storageEngine,
    pendingSyncCount,
    updateProfileData,
    updatePreferences,
    scanLegacyStorage,
    importLegacyBundle,
    clearLegacyLocalStorageKeys,
    exportBackupJson,
    validateBackupJson,
    importBackupJson,
  } = useData();

  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji || '🌸');
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile.displayName || '');
    setBio(profile.bio || '');
    setAvatarEmoji(profile.avatarEmoji || '🌸');
  }, [profile.displayName, profile.bio, profile.avatarEmoji]);

  // Legacy migration
  const [scanReport, setScanReport] = useState<LegacyScanReport | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Selective Export & Validated Import Preview
  const [includeMooncycle, setIncludeMooncycle] = useState(true);
  const [includeTrackers, setIncludeTrackers] = useState(true);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [pendingValidation, setPendingValidation] = useState<BackupValidationResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileData({
      displayName: displayName.trim() || 'Clearspace Member',
      bio: bio.trim(),
      avatarEmoji,
    });
    setProfileNotice('Profile saved locally.');
  };

  const handleScanLegacy = () => {
    setImportSummary(null);
    const report = scanLegacyStorage();
    setScanReport(report);
  };

  const handleConfirmImportLegacy = async () => {
    if (!scanReport) return;
    setImporting(true);
    try {
      const summary = await importLegacyBundle(scanReport.bundle);
      setImportSummary(summary);
    } finally {
      setImporting(false);
    }
  };

  const handleClearLegacyData = () => {
    if (!scanReport) return;
    clearLegacyLocalStorageKeys(scanReport.foundKeys);
    setConfirmClearOpen(false);
    setScanReport(null);
    setBackupNotice('Cleared legacy localStorage data after confirmed import.');
  };

  const handleDownloadJson = () => {
    const bundle = exportBackupJson({ includeMooncycle, includeTrackers });
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clearspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupNotice(
      `Downloaded JSON backup (${includeMooncycle ? 'with' : 'without'} Mooncycle · ${
        includeTrackers ? 'with' : 'without'
      } My Trackers).`
    );
  };

  const handleSelectBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const validation = validateBackupJson(text);
      setPendingValidation(validation);
      setImportSummary(null);
      if (!validation.valid) {
        setBackupNotice(validation.errors[0] || 'Backup validation failed.');
      } else {
        setBackupNotice(null);
      }
    } catch {
      setPendingValidation(null);
      setBackupNotice('Could not read that file. Please select a valid JSON backup.');
    }
  };

  const executeBackupImport = async (mode: ImportMode) => {
    if (!pendingValidation?.bundle) return;
    setImporting(true);
    try {
      const summary = await importBackupJson(pendingValidation.bundle, mode);
      setImportSummary(summary);
      setPendingValidation(null);
      setConfirmReplaceOpen(false);
      setBackupNotice(
        mode === 'replace'
          ? `Workspace replaced from backup (${summary.added} records restored).`
          : `Merged JSON backup safely: +${summary.added} records added (${summary.skipped} duplicates skipped).`
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account & Local Mode Status */}
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <WashiLabel>Local Workspace · Preferences</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">Profile &amp; workspace settings</h1>
            <p className="text-xs flex flex-wrap items-center gap-2" style={{ color: 'var(--cs-text-muted)' }}>
              <span className="inline-flex items-center gap-1 font-medium">
                <Database className="w-3.5 h-3.5" /> Local Mode ({storageEngine})
              </span>
              <span>· Offline-first storage</span>
              <span>· Future cloud sync queue: {pendingSyncCount} local change{pendingSyncCount === 1 ? '' : 's'} recorded</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium">Avatar accent</span>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatarEmoji(em)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer ${
                    avatarEmoji === em ? 'cs-btn-primary' : 'cs-surface-muted'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="prof-name" className="block text-xs font-medium">Display name</label>
              <input
                id="prof-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-bio" className="block text-xs font-medium">Personal motto / bio</label>
              <input
                id="prof-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Slow and steady..."
                className="cs-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="submit" className="cs-btn-primary px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer">
              Save profile
            </button>
            {profileNotice && <span className="text-xs font-medium" style={{ color: 'var(--cs-accent)' }}>{profileNotice}</span>}
          </div>
        </form>

        {/* Time & Regional Preferences */}
        <div className="pt-5 border-t grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ borderColor: 'var(--cs-border)' }}>
          <div className="space-y-1">
            <label htmlFor="pref-tz" className="block text-xs font-medium">Timezone</label>
            <select
              id="pref-tz"
              value={preferences.timezone}
              onChange={(e) => updatePreferences({ timezone: e.target.value })}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="pref-tf" className="block text-xs font-medium">Time format</label>
            <select
              id="pref-tf"
              value={preferences.timeFormat}
              onChange={(e) => updatePreferences({ timeFormat: e.target.value as '12h' | '24h' })}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="pref-cur" className="block text-xs font-medium">Currency</label>
            <select
              id="pref-cur"
              value={preferences.currency}
              onChange={(e) => updatePreferences({ currency: e.target.value })}
              className="cs-input w-full px-3 py-2 rounded-xl text-sm"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      </section>

      {/* JSON Backup Export & Validated Restore */}
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold">JSON Backup &amp; Restore</h2>
          <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            Export your IndexedDB workspace to JSON (with selective privacy options) or preview and restore a backup file.
          </p>
        </div>

        <div className="cs-surface-muted rounded-2xl p-4 flex flex-wrap gap-5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={includeMooncycle}
              onChange={(e) => setIncludeMooncycle(e.target.checked)}
            />
            Include Mooncycle private period &amp; symptom logs
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={includeTrackers}
              onChange={(e) => setIncludeTrackers(e.target.checked)}
            />
            Include My Trackers &amp; custom entries
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export JSON backup
          </button>

          <label className="cs-surface-muted px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Preview &amp; Import JSON
            <input type="file" accept="application/json" onChange={handleSelectBackupFile} className="hidden" />
          </label>
        </div>

        {pendingValidation && pendingValidation.valid && pendingValidation.preview && (
          <div className="cs-surface-muted rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">
                Backup Preview · Version {pendingValidation.preview.version} · {pendingValidation.preview.totalRecords} total records
              </div>
              <button
                type="button"
                onClick={() => setPendingValidation(null)}
                className="text-xs underline cursor-pointer"
              >
                Cancel preview
              </button>
            </div>

            {pendingValidation.warnings.length > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                {pendingValidation.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {w}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-num">
              <div>Tasks: {pendingValidation.preview.counts.tasks}</div>
              <div>Schedules: {pendingValidation.preview.counts.dailySchedules}</div>
              <div>Study: {pendingValidation.preview.counts.studySchedules}</div>
              <div>Goals: {pendingValidation.preview.counts.goals}</div>
              <div>Journal: {pendingValidation.preview.counts.journalEntries}</div>
              <div>Pulse: {pendingValidation.preview.counts.pulseChecks}</div>
              <div>Money: {pendingValidation.preview.counts.expenses + pendingValidation.preview.counts.incomes}</div>
              <div>Mooncycle: {pendingValidation.preview.counts.cycleRecords + pendingValidation.preview.counts.cycleDailyLogs}</div>
              <div>Trackers: {pendingValidation.preview.counts.customTrackers}</div>
              <div>Tracker logs: {pendingValidation.preview.counts.customTrackerEntries}</div>
            </div>

            {pendingValidation.preview.sampleTitles.length > 0 && (
              <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                Sample: {pendingValidation.preview.sampleTitles.join(' · ')}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                Merge safely (keep existing &amp; skip duplicates)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-red-600 dark:text-red-400">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                Replace entire local workspace
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={importing}
                onClick={() => {
                  if (importMode === 'replace') {
                    setConfirmReplaceOpen(true);
                  } else {
                    executeBackupImport('merge');
                  }
                }}
                className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                {importing ? 'Applying backup...' : importMode === 'replace' ? 'Review & Replace Workspace' : 'Confirm Merge Import'}
              </button>
            </div>
          </div>
        )}

        {backupNotice && (
          <div className="p-3 rounded-xl cs-surface-muted text-xs">{backupNotice}</div>
        )}
      </section>

      {/* Legacy LocalStorage Migration Tool */}
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Migrate legacy localStorage data</h2>
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              Clearspace automatically migrates Clearspace 3.0 local data into IndexedDB on startup. Scan anytime for
              older browser storage keys without overwriting existing records.
            </p>
          </div>
          <button
            type="button"
            onClick={handleScanLegacy}
            className="cs-surface-muted px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <HardDriveUpload className="w-4 h-4" /> Scan localStorage
          </button>
        </div>

        {scanReport && (
          <div className="cs-surface-muted rounded-2xl p-5 space-y-4">
            <div className="text-sm font-semibold">
              Detected {scanReport.foundKeys.length} Clearspace storage {scanReport.foundKeys.length === 1 ? 'key' : 'keys'}
            </div>
            {scanReport.foundKeys.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
                No legacy localStorage data was found on this browser.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-num">
                  <div>Tasks: {scanReport.counts.tasks}</div>
                  <div>Areas: {scanReport.counts.areas}</div>
                  <div>Schedules: {scanReport.counts.dailySchedules}</div>
                  <div>Studies: {scanReport.counts.studySchedules}</div>
                  <div>Markers/Doodles: {scanReport.counts.calendarMarkers}</div>
                  <div>Goals: {scanReport.counts.goals}</div>
                  <div>Journal: {scanReport.counts.journalEntries}</div>
                  <div>Pulse Checks: {scanReport.counts.pulseChecks}</div>
                  <div>Focus Logs: {scanReport.counts.focusSessions}</div>
                  <div>Income: {scanReport.counts.incomes}</div>
                  <div>Expenses: {scanReport.counts.expenses}</div>
                  <div>Themes/Prefs: {scanReport.counts.hasThemeOrPrefs ? 'Yes' : 'No'}</div>
                </div>

                <button
                  type="button"
                  disabled={importing}
                  onClick={handleConfirmImportLegacy}
                  className="cs-btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  {importing ? 'Importing...' : 'Merge Legacy Records into IndexedDB'}
                </button>
              </>
            )}
          </div>
        )}

        {importSummary && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Import summary: +{importSummary.added} records imported ({importSummary.skipped} duplicates skipped)
            </div>
            {importSummary.details.length > 0 && (
              <ul className="text-xs space-y-1">
                {importSummary.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
            {scanReport && scanReport.foundKeys.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Confirm import succeeded &amp; clear legacy local keys
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Remove legacy localStorage keys?</h3>
            <p className="text-sm" style={{ color: 'var(--cs-text-muted)' }}>
              Only proceed if you verified your imported records appear properly in Clearspace.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl cs-surface-muted text-sm cursor-pointer"
              >
                Keep local data
              </button>
              <button
                type="button"
                onClick={handleClearLegacyData}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium cursor-pointer"
              >
                Clear legacy keys
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReplaceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="cs-card max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Replace entire local workspace?</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
              This will overwrite your current IndexedDB workspace with the {pendingValidation?.preview?.totalRecords || 0}{' '}
              records from this JSON backup. Consider exporting a current JSON backup first.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReplaceOpen(false)}
                className="px-4 py-2 rounded-xl cs-surface-muted text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={() => executeBackupImport('replace')}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
              >
                {importing ? 'Replacing...' : 'Confirm Replace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
