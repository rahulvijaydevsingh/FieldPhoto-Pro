// Random 3x/day Attendance Service
// Handles scheduling, prompt evaluation, GPS capture, offline queuing, and Firestore sync

import { doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, saveAppSettingsToFirestore, handleFirestoreError, isFirestoreQuotaExceeded } from './firebase';
import { AttendanceDay, AttendanceSlot, AttendanceSettings, StaffAttendanceConfig } from '../types';
import { getCityNameAsync, generatePlusCodeWithCityAsync, getDeviceModelInfo } from '../utils/locationUtils';
import { addLocalBreadcrumb } from '../utils/routeLogger';

const STORAGE_KEY_PREFIX = 'fieldops_attendance_schedule_';
const ATTENDANCE_COLLECTION = 'attendance';
const GLOBAL_CONFIG_DOC = 'attendance_global_config';
const STAFF_CONFIG_COLLECTION = 'attendance_staff_configs';

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  enabled: true,
  mode: 'random',
  shiftStart: '10:00',
  shiftEnd: '19:00',
  checksPerDay: 3,
  fixedCheckTimes: ['10:30', '14:30', '18:00'],
  verificationMethod: 'gps',
  soundAlertEnabled: true
};

/**
 * Audio Alert Synthesizer via Web Audio API (No external assets required)
 */
export function playAttendanceAudioAlert() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startOffset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // Play 3 rapid attention chime tones
    playTone(587.33, 0, 0.2);   // D5
    playTone(880.00, 0.15, 0.2); // A5
    playTone(1174.66, 0.3, 0.4); // D6
  } catch (err) {
    console.warn('Audio chime playback omitted:', err);
  }
}

/**
 * Gets global attendance policy settings
 */
export async function getGlobalAttendanceSettings(): Promise<AttendanceSettings> {
  try {
    const cached = localStorage.getItem('fieldops_global_attendance_settings');
    if (cached) {
      return { ...DEFAULT_ATTENDANCE_SETTINGS, ...JSON.parse(cached) };
    }
  } catch {}

  if (isFirestoreQuotaExceeded()) return DEFAULT_ATTENDANCE_SETTINGS;

  try {
    const snap = await getDoc(doc(db, 'app_settings', GLOBAL_CONFIG_DOC));
    if (snap.exists()) {
      const settings = { ...DEFAULT_ATTENDANCE_SETTINGS, ...(snap.data() as AttendanceSettings) };
      localStorage.setItem('fieldops_global_attendance_settings', JSON.stringify(settings));
      return settings;
    }
  } catch (err) {
    handleFirestoreError('getGlobalAttendanceSettings', err);
  }

  return DEFAULT_ATTENDANCE_SETTINGS;
}

/**
 * Saves global attendance settings
 */
export async function saveGlobalAttendanceSettings(settings: AttendanceSettings): Promise<void> {
  try {
    localStorage.setItem('fieldops_global_attendance_settings', JSON.stringify(settings));
    if (isFirestoreQuotaExceeded()) return;
    await setDoc(doc(db, 'app_settings', GLOBAL_CONFIG_DOC), {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError('saveGlobalAttendanceSettings', err);
  }
}

/**
 * Gets staff-specific attendance override config
 */
export async function getStaffAttendanceConfig(userId: string): Promise<StaffAttendanceConfig> {
  try {
    const cached = localStorage.getItem(`fieldops_staff_attendance_config_${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  if (isFirestoreQuotaExceeded()) return { userId, useGlobalDefaults: true };

  try {
    const snap = await getDoc(doc(db, STAFF_CONFIG_COLLECTION, userId));
    if (snap.exists()) {
      const cfg = snap.data() as StaffAttendanceConfig;
      localStorage.setItem(`fieldops_staff_attendance_config_${userId}`, JSON.stringify(cfg));
      return cfg;
    }
  } catch (err) {
    handleFirestoreError('getStaffAttendanceConfig', err);
  }

  return {
    userId,
    useGlobalDefaults: true
  };
}

/**
 * Saves staff-specific attendance override config
 */
export async function saveStaffAttendanceConfig(cfg: StaffAttendanceConfig): Promise<void> {
  try {
    localStorage.setItem(`fieldops_staff_attendance_config_${cfg.userId}`, JSON.stringify(cfg));
    if (isFirestoreQuotaExceeded()) return;
    await setDoc(doc(db, STAFF_CONFIG_COLLECTION, cfg.userId), {
      ...cfg,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError('saveStaffAttendanceConfig', err);
  }
}

/**
 * Calculates final effective settings for a given staff member
 */
export async function getEffectiveSettingsForUser(userId: string): Promise<AttendanceSettings> {
  const globalSettings = await getGlobalAttendanceSettings();
  const staffConfig = await getStaffAttendanceConfig(userId);

  if (!staffConfig.useGlobalDefaults && staffConfig.customSettings) {
    return {
      ...globalSettings,
      ...staffConfig.customSettings
    };
  }

  return globalSettings;
}

/**
 * Checks if attendance is enabled globally or for a user
 */
export async function isAttendanceEnabled(userId?: string): Promise<boolean> {
  if (userId) {
    const cfg = await getEffectiveSettingsForUser(userId);
    return cfg.enabled;
  }
  const globalCfg = await getGlobalAttendanceSettings();
  return globalCfg.enabled;
}

/**
 * Generates slots based on settings (Random within shift window vs Fixed scheduled times)
 */
export function generateSlotsFromSettings(settings: AttendanceSettings, now: Date = new Date()): number[] {
  const dateStr = now.toISOString().split('T')[0];

  if (settings.mode === 'fixed' && settings.fixedCheckTimes && settings.fixedCheckTimes.length > 0) {
    return settings.fixedCheckTimes.map((timeStr) => {
      const [hh, mm] = timeStr.split(':').map(Number);
      const d = new Date(now);
      d.setHours(hh || 10, mm || 0, 0, 0);
      return d.getTime();
    }).sort((a, b) => a - b);
  }

  // Random Mode within shift window
  const [startHH, startMM] = (settings.shiftStart || '10:00').split(':').map(Number);
  const [endHH, endMM] = (settings.shiftEnd || '19:00').split(':').map(Number);

  const shiftStart = new Date(now);
  shiftStart.setHours(startHH || 10, startMM || 0, 0, 0);

  const shiftEnd = new Date(now);
  shiftEnd.setHours(endHH || 19, endMM || 0, 0, 0);

  let startMs = shiftStart.getTime();
  let endMs = shiftEnd.getTime();

  if (endMs <= startMs) {
    endMs = startMs + 8 * 60 * 60 * 1000; // default 8h shift fallback
  }

  const count = Math.max(1, settings.checksPerDay || 3);
  const range = Math.max(30 * 60 * 1000, endMs - startMs);
  const offsets = new Set<number>();

  let attempts = 0;
  while (offsets.size < count && attempts < 200) {
    attempts++;
    const randOffset = Math.floor(Math.random() * range);
    offsets.add(randOffset);
  }

  const sortedOffsets = Array.from(offsets).sort((a, b) => a - b);
  const result: number[] = [];
  let lastTime = startMs;

  for (let i = 0; i < sortedOffsets.length; i++) {
    let t = startMs + sortedOffsets[i];
    if (i > 0 && t < lastTime + 20 * 60 * 1000) {
      t = lastTime + 20 * 60 * 1000;
    }
    result.push(t);
    lastTime = t;
  }

  return result;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getLocalScheduleCache(userId: string, dateStr: string): AttendanceDay | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}_${dateStr}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalScheduleCache(userId: string, dateStr: string, day: AttendanceDay): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_${dateStr}`, JSON.stringify(day));
  } catch (err) {
    console.warn('Failed to save attendance schedule to localStorage:', err);
  }
}

/**
 * Ensures today's attendance schedule exists for the user based on effective settings
 */
export async function ensureTodaySchedule(userId: string, userName: string): Promise<AttendanceDay> {
  const today = getTodayString();
  const cached = getLocalScheduleCache(userId, today);
  const effectiveSettings = await getEffectiveSettingsForUser(userId);

  if (cached && cached.slots && cached.slots.length > 0) {
    return cached;
  }

  const docId = `${userId}_${today}`;
  const docRef = doc(db, ATTENDANCE_COLLECTION, docId);

  if (!isFirestoreQuotaExceeded()) {
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as AttendanceDay;
        setLocalScheduleCache(userId, today, data);
        return data;
      }
    } catch (err) {
      handleFirestoreError('ensureTodaySchedule getDoc', err);
    }
  }

  // Create new schedule based on user policy
  const slotTimes = generateSlotsFromSettings(effectiveSettings);
  const slots: AttendanceSlot[] = slotTimes.map((timeMs, idx) => ({
    slot: idx + 1,
    scheduledAt: timeMs,
    status: 'pending'
  }));

  const day: AttendanceDay = {
    userId,
    userName,
    date: today,
    slots,
    generatedAt: Date.now()
  };

  setLocalScheduleCache(userId, today, day);

  if (!isFirestoreQuotaExceeded()) {
    try {
      await setDoc(docRef, {
        ...day,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError('ensureTodaySchedule setDoc', err);
    }
  }

  return day;
}

/**
 * Marks attendance for a specific slot with GPS coordinates and optional photoUrl
 */
export async function markAttendanceSlot(
  userId: string,
  userName: string,
  slotNumber: number,
  position: GeolocationPosition,
  photoUrl?: string
): Promise<AttendanceSlot> {
  const { latitude: lat, longitude: lng, accuracy } = position.coords;
  const today = getTodayString();
  const city = await getCityNameAsync(lat, lng);
  const plusCode = await generatePlusCodeWithCityAsync(lat, lng);
  const deviceInfo = getDeviceModelInfo();

  const markedSlot: AttendanceSlot = {
    slot: slotNumber,
    scheduledAt: Date.now(),
    markedAt: Date.now(),
    status: 'marked',
    lat,
    lng,
    plusCode,
    accuracy,
    city,
    deviceInfo,
    photoUrl
  };

  // Update local cache
  const cached = getLocalScheduleCache(userId, today) || {
    userId,
    userName,
    date: today,
    slots: [],
    generatedAt: Date.now()
  };

  const slotIdx = cached.slots.findIndex(s => s.slot === slotNumber);
  if (slotIdx >= 0) {
    cached.slots[slotIdx] = {
      ...cached.slots[slotIdx],
      ...markedSlot
    };
  } else {
    cached.slots.push(markedSlot);
  }

  setLocalScheduleCache(userId, today, cached);

  // Log breadcrumb ping for forensic location audit trail
  try {
    const isMocked = Boolean((position as any)?.coords?.isMocked);
    addLocalBreadcrumb({
      lat,
      lng,
      accuracy,
      timestamp: new Date().toISOString(),
      plusCode,
      deviceInfo,
      userId,
      userName,
      sourceEvent: 'ATTENDANCE_CHECK',
      locationProvider: 'GPS_HARDWARE',
      isMocked,
      attendanceId: `${userId}_${today}_slot_${slotNumber}`,
    });
  } catch (err) {
    console.warn('Breadcrumb log for attendance check failed silently:', err);
  }

  // Update Firestore
  const docId = `${userId}_${today}`;
  if (!isFirestoreQuotaExceeded()) {
    try {
      await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), {
        userId,
        userName,
        date: today,
        slots: cached.slots,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError('markAttendanceSlot setDoc', err);
    }
  }

  return markedSlot;
}

/**
 * Marks a slot as missed if the user failed/rejected the check window
 */
export async function markMissedSlot(
  userId: string,
  userName: string,
  slotNumber: number,
  reason = 'User missed popup window'
): Promise<void> {
  const today = getTodayString();
  const cached = getLocalScheduleCache(userId, today);
  if (!cached || !cached.slots) return;

  const slotIdx = cached.slots.findIndex(s => s.slot === slotNumber);
  if (slotIdx >= 0) {
    cached.slots[slotIdx] = {
      ...cached.slots[slotIdx],
      status: 'missed',
      markedAt: Date.now(),
      rejectReason: reason
    };

    setLocalScheduleCache(userId, today, cached);

    const docId = `${userId}_${today}`;
    if (!isFirestoreQuotaExceeded()) {
      try {
        await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), {
          userId,
          userName,
          date: today,
          slots: cached.slots,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        handleFirestoreError('markMissedSlot setDoc', err);
      }
    }
  }
}

/**
 * Real-time listener for today's attendance status of a user
 */
export function subscribeAttendanceToday(
  userId: string,
  callback: (day: AttendanceDay | null) => void
): () => void {
  const today = getTodayString();
  const local = getLocalScheduleCache(userId, today);
  if (local) callback(local);

  if (isFirestoreQuotaExceeded()) return () => {};

  const docId = `${userId}_${today}`;
  try {
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(doc(db, ATTENDANCE_COLLECTION, docId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AttendanceDay;
        setLocalScheduleCache(userId, today, data);
        callback(data);
      } else {
        callback(local);
      }
    }, (err) => {
      handleFirestoreError('subscribeAttendanceToday', err);
      if (unsub) unsub();
      callback(local);
    });
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Failed to subscribe to attendance', err);
    callback(local);
    return () => {};
  }
}

/**
 * Fetches attendance days for admin search across all users or a specific user
 */
export async function getAttendanceHistory(userId?: string): Promise<AttendanceDay[]> {
  if (isFirestoreQuotaExceeded()) return [];

  try {
    let q;
    if (userId) {
      q = query(collection(db, ATTENDANCE_COLLECTION), where('userId', '==', userId));
    } else {
      q = query(collection(db, ATTENDANCE_COLLECTION));
    }
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => docSnap.data() as AttendanceDay);
  } catch (err) {
    handleFirestoreError('getAttendanceHistory', err);
    return [];
  }
}
