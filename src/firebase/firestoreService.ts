import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { clampString, sanitizeId } from '../utils/logic';
import {
  Area,
  CalendarEvent,
  CalendarMarker,
  DailyScheduleBlock,
  DailyTemplate,
  FocusSession,
  Goal,
  JournalEntry,
  LifeTimelineItem,
  MoneyRecord,
  MonthlyReview,
  PulseCheck,
  StudySchedule,
  Task,
  ThemeSettings,
  UserPreferences,
  UserProfile,
  WeeklyReset,
} from '../types/clearspace';

export type SubcollectionName =
  | 'preferences'
  | 'themeSettings'
  | 'areas'
  | 'tasks'
  | 'dailySchedules'
  | 'dailyTemplates'
  | 'studySchedules'
  | 'calendarEvents'
  | 'calendarMarkers'
  | 'goals'
  | 'journalEntries'
  | 'pulseChecks'
  | 'focusSessions'
  | 'expenses'
  | 'incomes'
  | 'monthlyReviews'
  | 'weeklyResets'
  | 'lifeTimeline';

export function subscribeUserCollection<T>(
  userId: string,
  colName: SubcollectionName,
  onData: (items: T[], fromCache: boolean) => void
): () => void {
  const path = `users/${userId}/${colName}`;
  const q = query(collection(db, 'users', userId, colName), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as T));
      onData(items, snapshot.metadata.fromCache);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserProfile(
  userId: string,
  onData: (profile: UserProfile | null, fromCache: boolean) => void
): () => void {
  const path = `users/${userId}`;
  const docRef = doc(db, 'users', userId);
  return onSnapshot(
    docRef,
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null, snap.metadata.fromCache);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveUserProfile(userId: string, profile: Partial<UserProfile>, isNew: boolean) {
  const path = `users/${userId}`;
  const ref = doc(db, 'users', userId);
  try {
    const payload = {
      userId: sanitizeId(userId, 'usr'),
      displayName: clampString(profile.displayName, 120, 'Clearspace Member') || 'Clearspace Member',
      email: clampString(profile.email, 200),
      bio: clampString(profile.bio, 500),
      avatarEmoji: clampString(profile.avatarEmoji, 16, '🌿'),
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    };
    if (isNew) {
      await setDoc(ref, payload);
    } else {
      const { userId: _uid, ...updateFields } = payload;
      await updateDoc(ref, updateFields);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

const VALID_THEMES = new Set([
  'strawberry-milk',
  'matcha-garden',
  'lavender-dreams',
  'peach-picnic',
  'seaside-diary',
  'moonlit-journal',
]);

const VALID_DOMAINS = new Set(['study', 'career', 'projects', 'personal', 'creative', 'rest']);

export function buildCleanPayload(colName: SubcollectionName, userId: string, raw: Record<string, any>) {
  const id = sanitizeId(raw.id, colName.slice(0, 3));
  const uid = sanitizeId(userId, 'usr');
  const todayFallback = new Date().toISOString().slice(0, 10);
  const safeDate = (val: unknown) => {
    const s = clampString(val, 16);
    return s.length >= 8 ? s : todayFallback;
  };

  switch (colName) {
    case 'preferences':
      return {
        userId: uid,
        timeFormat: raw.timeFormat === '12h' ? '12h' : '24h',
        timezone: clampString(raw.timezone, 64, 'Asia/Kolkata') || 'Asia/Kolkata',
        dayStartHour: Math.max(0, Math.min(23, Number(raw.dayStartHour ?? 7))),
        dayEndHour: Math.max(1, Math.min(24, Number(raw.dayEndHour ?? 22))),
        currency: clampString(raw.currency, 12, 'INR') || 'INR',
        weekStartsOn: raw.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
      } as Omit<UserPreferences, 'createdAt' | 'updatedAt'>;
    case 'themeSettings':
      return {
        userId: uid,
        activeTheme: VALID_THEMES.has(raw.activeTheme) ? raw.activeTheme : 'strawberry-milk',
        customAccent: clampString(raw.customAccent, 32),
        decorativeStickers: Boolean(raw.decorativeStickers ?? true),
        compactMode: Boolean(raw.compactMode ?? false),
      } as Omit<ThemeSettings, 'createdAt' | 'updatedAt'>;
    case 'areas':
      return {
        id,
        userId: uid,
        name: clampString(raw.name, 80, 'Personal') || 'Personal',
        color: clampString(raw.color, 32, '#C94D6D').length >= 3 ? clampString(raw.color, 32, '#C94D6D') : '#C94D6D',
        lifeDomain: VALID_DOMAINS.has(raw.lifeDomain) ? raw.lifeDomain : 'personal',
      } as Omit<Area, 'createdAt' | 'updatedAt'>;
    case 'tasks':
      return {
        id,
        userId: uid,
        title: clampString(raw.title, 240, 'Untitled task') || 'Untitled task',
        notes: clampString(raw.notes, 2000),
        areaId: clampString(raw.areaId, 128),
        areaName: clampString(raw.areaName, 80),
        priority: ['low', 'medium', 'high'].includes(raw.priority) ? raw.priority : 'medium',
        dueDate: clampString(raw.dueDate, 32),
        dueTime: clampString(raw.dueTime, 16),
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
        backlog: Boolean(raw.backlog),
      } as Omit<Task, 'createdAt' | 'updatedAt'>;
    case 'dailySchedules':
      return {
        id,
        userId: uid,
        date: safeDate(raw.date),
        title: clampString(raw.title, 240, 'Scheduled block') || 'Scheduled block',
        startTime: clampString(raw.startTime, 16, '09:00').length >= 4 ? clampString(raw.startTime, 16, '09:00') : '09:00',
        endTime: clampString(raw.endTime, 16, '10:00').length >= 4 ? clampString(raw.endTime, 16, '10:00') : '10:00',
        durationMinutes: Math.max(5, Math.min(1440, Number(raw.durationMinutes || 60))),
        category: clampString(raw.category, 80, 'Personal') || 'Personal',
        color: clampString(raw.color, 32, '#C94D6D').length >= 3 ? clampString(raw.color, 32, '#C94D6D') : '#C94D6D',
        lifeDomain: VALID_DOMAINS.has(raw.lifeDomain) ? raw.lifeDomain : 'personal',
        notes: clampString(raw.notes, 1500),
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
        priority: ['low', 'medium', 'high'].includes(raw.priority) ? raw.priority : 'medium',
        isBreak: Boolean(raw.isBreak),
        isUnexpected: Boolean(raw.isUnexpected),
        actualDurationMinutes: Math.max(0, Math.min(1440, Number(raw.actualDurationMinutes || 0))),
        reminderMinutes: Math.max(0, Math.min(120, Number(raw.reminderMinutes || 0))),
        linkedTaskId: clampString(raw.linkedTaskId, 128),
        linkedStudyId: clampString(raw.linkedStudyId, 128),
        recurringWeekdays: Array.isArray(raw.recurringWeekdays) ? raw.recurringWeekdays.slice(0, 7) : [],
      } as Omit<DailyScheduleBlock, 'createdAt' | 'updatedAt'>;
    case 'dailyTemplates':
      return {
        id,
        userId: uid,
        name: clampString(raw.name, 120, 'Daily Routine') || 'Daily Routine',
        blocks: Array.isArray(raw.blocks) ? raw.blocks.slice(0, 40) : [],
      } as Omit<DailyTemplate, 'createdAt' | 'updatedAt'>;
    case 'studySchedules':
      return {
        id,
        userId: uid,
        subject: clampString(raw.subject, 140, 'Study Subject') || 'Study Subject',
        moduleName: clampString(raw.moduleName, 160),
        targetDate: clampString(raw.targetDate, 32),
        topics: Array.isArray(raw.topics) ? raw.topics.slice(0, 80) : [],
        notes: clampString(raw.notes, 2000),
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
      } as Omit<StudySchedule, 'createdAt' | 'updatedAt'>;
    case 'calendarEvents':
      return {
        id,
        userId: uid,
        date: safeDate(raw.date),
        title: clampString(raw.title, 200, 'Event') || 'Event',
        time: clampString(raw.time, 16),
        category: clampString(raw.category, 80),
        color: clampString(raw.color, 32),
        notes: clampString(raw.notes, 1000),
        completed: Boolean(raw.completed),
      } as Omit<CalendarEvent, 'createdAt' | 'updatedAt'>;
    case 'calendarMarkers':
      return {
        id,
        userId: uid,
        date: safeDate(raw.date),
        emoji: clampString(raw.emoji, 16),
        label: clampString(raw.label, 120),
        color: clampString(raw.color, 32),
        doodleStrokes: Array.isArray(raw.doodleStrokes) ? raw.doodleStrokes.slice(0, 120) : [],
      } as Omit<CalendarMarker, 'createdAt' | 'updatedAt'>;
    case 'goals':
      return {
        id,
        userId: uid,
        title: clampString(raw.title, 200, 'Personal Goal') || 'Personal Goal',
        description: clampString(raw.description, 1500),
        category: clampString(raw.category, 80),
        targetDate: clampString(raw.targetDate, 32),
        milestones: Array.isArray(raw.milestones) ? raw.milestones.slice(0, 50) : [],
        completed: Boolean(raw.completed),
        completedAt: clampString(raw.completedAt, 64),
      } as Omit<Goal, 'createdAt' | 'updatedAt'>;
    case 'journalEntries':
      return {
        id,
        userId: uid,
        date: safeDate(raw.date),
        title: clampString(raw.title, 200, 'Daily Note') || 'Daily Note',
        content: clampString(raw.content, 10000, ' ') || ' ',
        mood: clampString(raw.mood, 32, 'calm') || 'calm',
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10).map((t: unknown) => clampString(t, 40)) : [],
      } as Omit<JournalEntry, 'createdAt' | 'updatedAt'>;
    case 'pulseChecks':
      return {
        id,
        userId: uid,
        date: safeDate(raw.date),
        period: ['morning', 'afternoon', 'evening'].includes(raw.period) ? raw.period : 'morning',
        mood: clampString(raw.mood, 32, 'calm') || 'calm',
        energy: Math.max(1, Math.min(5, Number(raw.energy ?? 3))),
        stress: Math.max(1, Math.min(5, Number(raw.stress ?? 2))),
        motivation: Math.max(1, Math.min(5, Number(raw.motivation ?? 3))),
        note: clampString(raw.note, 1000),
      } as Omit<PulseCheck, 'createdAt' | 'updatedAt'>;
    case 'focusSessions':
      return {
        id,
        userId: uid,
        taskTitle: clampString(raw.taskTitle, 240, 'Focus Session') || 'Focus Session',
        durationMinutes: Math.max(1, Math.min(360, Number(raw.durationMinutes || 25))),
        mode: ['focus', 'short-break', 'long-break'].includes(raw.mode) ? raw.mode : 'focus',
        date: safeDate(raw.date),
        completedAt: clampString(raw.completedAt, 64, new Date().toISOString()) || new Date().toISOString(),
      } as Omit<FocusSession, 'createdAt' | 'updatedAt'>;
    case 'expenses':
    case 'incomes':
      return {
        id,
        userId: uid,
        title: clampString(raw.title, 200, 'Entry') || 'Entry',
        amount: Math.max(0, Math.min(100000000, Number(raw.amount || 0))),
        category: clampString(raw.category, 80, 'General') || 'General',
        paymentMethod: clampString(raw.paymentMethod, 64, 'UPI') || 'UPI',
        date: safeDate(raw.date),
        notes: clampString(raw.notes, 500),
      } as Omit<MoneyRecord, 'createdAt' | 'updatedAt'>;
    case 'monthlyReviews':
      return {
        id,
        userId: uid,
        monthKey: clampString(raw.monthKey, 12, todayFallback.slice(0, 7)).length >= 6
          ? clampString(raw.monthKey, 12, todayFallback.slice(0, 7))
          : todayFallback.slice(0, 7),
        reflection: clampString(raw.reflection, 5000),
        wins: clampString(raw.wins, 2000),
        lessons: clampString(raw.lessons, 2000),
        focusNextMonth: clampString(raw.focusNextMonth, 2000),
      } as Omit<MonthlyReview, 'createdAt' | 'updatedAt'>;
    case 'weeklyResets':
      return {
        id,
        userId: uid,
        weekKey: clampString(raw.weekKey, 16, `${todayFallback.slice(0, 7)}_W1`).length >= 6
          ? clampString(raw.weekKey, 16, `${todayFallback.slice(0, 7)}_W1`)
          : `${todayFallback.slice(0, 7)}_W1`,
        wentWell: clampString(raw.wentWell, 3000),
        feltDifficult: clampString(raw.feltDifficult, 3000),
        postponedNotes: clampString(raw.postponedNotes, 2000),
        nextWeekGoals: clampString(raw.nextWeekGoals, 2000),
        removedFromPlan: clampString(raw.removedFromPlan, 2000),
      } as Omit<WeeklyReset, 'createdAt' | 'updatedAt'>;
    case 'lifeTimeline':
      return {
        id,
        userId: uid,
        date: safeDate(raw.date),
        title: clampString(raw.title, 240, 'Milestone') || 'Milestone',
        description: clampString(raw.description, 1000),
        category: clampString(raw.category, 80, 'Personal') || 'Personal',
        sourceType: ['task', 'goal', 'study', 'journal', 'calendar', 'schedule', 'manual'].includes(raw.sourceType)
          ? raw.sourceType
          : 'manual',
        sourceId: clampString(raw.sourceId, 128),
      } as Omit<LifeTimelineItem, 'createdAt' | 'updatedAt'>;
  }
}

export async function createSubdoc(
  userId: string,
  colName: SubcollectionName,
  docId: string,
  raw: Record<string, any>
) {
  const safeDocId = sanitizeId(docId, colName.slice(0, 3));
  const path = `users/${userId}/${colName}/${safeDocId}`;
  const ref = doc(db, 'users', userId, colName, safeDocId);
  try {
    const clean = buildCleanPayload(colName, userId, { ...raw, id: safeDocId });
    await setDoc(ref, {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSubdoc(
  userId: string,
  colName: SubcollectionName,
  docId: string,
  patch: Record<string, any>
) {
  const safeDocId = sanitizeId(docId, colName.slice(0, 3));
  const path = `users/${userId}/${colName}/${safeDocId}`;
  const ref = doc(db, 'users', userId, colName, safeDocId);
  try {
    const { id: _id, userId: _uid, createdAt: _ca, ...allowedPatch } = patch;
    await updateDoc(ref, {
      ...allowedPatch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSubdoc(userId: string, colName: SubcollectionName, docId: string) {
  const safeDocId = sanitizeId(docId, colName.slice(0, 3));
  const path = `users/${userId}/${colName}/${safeDocId}`;
  const ref = doc(db, 'users', userId, colName, safeDocId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchCreateSubdocs(
  userId: string,
  entries: { colName: SubcollectionName; docId: string; raw: Record<string, any> }[]
) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const safeDocId = sanitizeId(item.docId, item.colName.slice(0, 3));
      const ref = doc(db, 'users', userId, item.colName, safeDocId);
      const clean = buildCleanPayload(item.colName, userId, { ...item.raw, id: safeDocId });
      batch.set(ref, {
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/batchImport`);
    }
  }
}
