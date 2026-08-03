import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  query,
  where,
  orderBy,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Photo, User, FollowUp, RecycleItem } from '../types';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore specifying the custom database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Collection References
const PHOTOS_COL = 'photos';
const TEAM_COL = 'team_members';
const FOLLOWUPS_COL = 'followups';
const RECYCLE_COL = 'recycle_bin';
const SETTINGS_COL = 'app_settings';
const BREADCRUMBS_COL = 'route_breadcrumbs';
const ODOMETER_COL = 'odometer_readings';

// Helper to handle Firestore quota or connection errors gracefully with Exponential Backoff & Rate Limiter
let quotaExceededUntil = 0;
let backoffDurationSeconds = 60; // Start at 60s, double on repeat hits up to 15m
let writesInLastMinute = 0;
let lastMinuteTimestamp = Date.now();
const MAX_WRITES_PER_MINUTE = 60; // Safe threshold to prevent burst spikes

if (typeof window !== 'undefined') {
  const savedUntil = localStorage.getItem('fieldops_firestore_quota_until');
  if (savedUntil) {
    const untilTs = parseInt(savedUntil, 10);
    if (!isNaN(untilTs) && untilTs > Date.now()) {
      quotaExceededUntil = untilTs;
    } else {
      localStorage.removeItem('fieldops_firestore_quota_until');
    }
  }
}

export function isFirestoreQuotaExceeded(): boolean {
  if (quotaExceededUntil > Date.now()) {
    return true;
  }
  if (quotaExceededUntil !== 0) {
    quotaExceededUntil = 0;
    try {
      localStorage.removeItem('fieldops_firestore_quota_until');
      enableNetwork(db).catch(() => {});
    } catch {}
  }
  return false;
}

export function getFirestoreQuotaStatus() {
  const isThrottled = quotaExceededUntil > Date.now();
  const remainingSeconds = isThrottled ? Math.ceil((quotaExceededUntil - Date.now()) / 1000) : 0;
  return {
    isThrottled,
    remainingSeconds,
    writesInLastMinute,
    backoffDurationSeconds,
  };
}

export function resetFirestoreQuotaBackoff() {
  quotaExceededUntil = 0;
  backoffDurationSeconds = 60;
  writesInLastMinute = 0;
  try {
    sessionStorage.removeItem('fieldops_firestore_quota_exceeded');
    localStorage.removeItem('fieldops_firestore_quota_exceeded');
    localStorage.removeItem('fieldops_firestore_quota_until');
    enableNetwork(db).catch(() => {});
  } catch {}
}

export function canPerformFirestoreWrite(): boolean {
  if (isFirestoreQuotaExceeded()) return false;
  const now = Date.now();
  if (now - lastMinuteTimestamp >= 60000) {
    writesInLastMinute = 0;
    lastMinuteTimestamp = now;
  }
  if (writesInLastMinute >= MAX_WRITES_PER_MINUTE) {
    console.warn('[Firestore Rate Limiter] Write rate limit reached for current minute. Queuing for next window.');
    return false;
  }
  writesInLastMinute++;
  return true;
}

export function handleFirestoreError(context: string, err: any) {
  const errCode = String(err?.code || '').toLowerCase();
  const errMsg = String(err?.message || err || '').toLowerCase();

  if (
    errCode === 'resource-exhausted' ||
    errCode === 'firestore/resource-exhausted' ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('quota limit exceeded') ||
    errMsg.includes('quota exceeded') ||
    errMsg.includes('quota') ||
    errCode === '429'
  ) {
    if (quotaExceededUntil <= Date.now()) {
      quotaExceededUntil = Date.now() + (backoffDurationSeconds * 1000);
      try {
        localStorage.setItem('fieldops_firestore_quota_until', String(quotaExceededUntil));
      } catch {}
      console.warn(`[Firestore Quota Limit] ${context}: Quota temporarily reached. Automatic exponential backoff active for ${backoffDurationSeconds}s.`);
      backoffDurationSeconds = Math.min(backoffDurationSeconds * 2, 900); // Max 15 minutes backoff
    }
  } else {
    console.error(`[Firestore Error] ${context}:`, err);
  }
}

// Debounce helper for snapshot callbacks (Gap 8)
function debounceSnapshot<T>(fn: (data: T) => void, delayMs: number = 250): (data: T) => void {
  let timer: any = null;
  return (data: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(data);
    }, delayMs);
  };
}

// --- APP SETTINGS ---
export interface AppSettings {
  leadSources: string[];
  personTypes: string[];
  constructionStages: string[];
  telemetryEnabled?: boolean;
  trainDispatchIntervalMs?: number;
  heartbeatIntervalMs?: number;
  trainCutoverTimestamp?: number;
}

export function subscribeAppSettings(onUpdate: (settings: AppSettings) => void) {
  if (isFirestoreQuotaExceeded()) return () => {};
  try {
    const docRef = doc(db, SETTINGS_COL, 'global_config');
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as AppSettings);
      }
    }, (err) => {
      handleFirestoreError('Listening to app settings', err);
      if (unsub) unsub();
    });
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Subscribing to app settings', err);
    return () => {};
  }
}

export async function saveAppSettingsToFirestore(settings: Partial<AppSettings>) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await setDoc(doc(db, SETTINGS_COL, 'global_config'), settings, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving app settings', err);
  }
}

export async function fetchTeamMembersDirectly(): Promise<User[]> {
  if (isFirestoreQuotaExceeded()) return [];
  try {
    const snap = await getDocs(collection(db, TEAM_COL));
    return snap.docs.map(d => d.data() as User);
  } catch (err) {
    handleFirestoreError('Fetching team members directly', err);
    return [];
  }
}

// --- PHOTOS ---
export function subscribePhotos(onUpdate: (photos: Photo[]) => void) {
  if (isFirestoreQuotaExceeded()) return () => {};
  try {
    const q = query(collection(db, PHOTOS_COL));
    let unsub: (() => void) | null = null;
    const debouncedNotify = debounceSnapshot(onUpdate, 250);
    unsub = onSnapshot(q, (snapshot) => {
      const photos: Photo[] = snapshot.docs.map(doc => doc.data() as Photo);
      debouncedNotify(photos);
    }, (err) => {
      handleFirestoreError('Listening to photos', err);
      if (unsub) unsub();
    });
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Subscribing to photos', err);
    return () => {};
  }
}

export async function savePhotoToFirestore(photo: Photo) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const cleanPhoto = JSON.parse(JSON.stringify(photo)); // Ensure serializable
    await setDoc(doc(db, PHOTOS_COL, photo.id), cleanPhoto, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving photo', err);
  }
}

export async function deletePhotoFromFirestore(photoId: string) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await deleteDoc(doc(db, PHOTOS_COL, photoId));
  } catch (err) {
    handleFirestoreError('Deleting photo', err);
  }
}

// --- TEAM MEMBERS ---
export function subscribeTeamMembers(onUpdate: (members: User[]) => void) {
  if (isFirestoreQuotaExceeded()) return () => {};
  try {
    const q = query(collection(db, TEAM_COL));
    let unsub: (() => void) | null = null;
    const debouncedNotify = debounceSnapshot(onUpdate, 250);
    unsub = onSnapshot(q, (snapshot) => {
      const members: User[] = snapshot.docs.map(doc => doc.data() as User);
      debouncedNotify(members);
    }, (err) => {
      handleFirestoreError('Listening to team members', err);
      if (unsub) unsub();
    });
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Subscribing to team members', err);
    return () => {};
  }
}

export async function saveTeamMemberToFirestore(member: User) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const cleanMember = JSON.parse(JSON.stringify(member));
    await setDoc(doc(db, TEAM_COL, member.id), cleanMember, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving team member', err);
  }
}

// --- FOLLOW UPS ---
export function subscribeFollowUps(onUpdate: (followUps: FollowUp[]) => void) {
  if (isFirestoreQuotaExceeded()) return () => {};
  try {
    const q = query(collection(db, FOLLOWUPS_COL));
    let unsub: (() => void) | null = null;
    const debouncedNotify = debounceSnapshot(onUpdate, 250);
    unsub = onSnapshot(q, (snapshot) => {
      const followUps: FollowUp[] = snapshot.docs.map(doc => doc.data() as FollowUp);
      debouncedNotify(followUps);
    }, (err) => {
      handleFirestoreError('Listening to followups', err);
      if (unsub) unsub();
    });
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Subscribing to followups', err);
    return () => {};
  }
}

export async function saveFollowUpToFirestore(followUp: FollowUp) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const cleanFollowUp = JSON.parse(JSON.stringify(followUp));
    await setDoc(doc(db, FOLLOWUPS_COL, followUp.id), cleanFollowUp, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving followup', err);
  }
}

// --- RECYCLE BIN ---
export function subscribeRecycleBin(onUpdate: (items: RecycleItem[]) => void) {
  if (isFirestoreQuotaExceeded()) return () => {};
  try {
    const q = query(collection(db, RECYCLE_COL));
    let unsub: (() => void) | null = null;
    const debouncedNotify = debounceSnapshot(onUpdate, 250);
    unsub = onSnapshot(q, (snapshot) => {
      const items: RecycleItem[] = snapshot.docs.map(doc => doc.data() as RecycleItem);
      debouncedNotify(items);
    }, (err) => {
      handleFirestoreError('Listening to recycle bin', err);
      if (unsub) unsub();
    });
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Subscribing to recycle bin', err);
    return () => {};
  }
}

export async function saveRecycleItemToFirestore(item: RecycleItem) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const cleanItem = JSON.parse(JSON.stringify(item));
    await setDoc(doc(db, RECYCLE_COL, item.id), cleanItem, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving recycle item', err);
  }
}

// --- ROUTE BREADCRUMBS & TELEMETRY TRAINS (CROSS-DEVICE STAFF MOVEMENT TRACKING) ---
export function subscribeRouteBreadcrumbs(onUpdate: (breadcrumbs: any[]) => void) {
  if (isFirestoreQuotaExceeded()) return () => {};
  let isSubscribed = true;
  let timer: any = null;

  const fetchAndNotify = async () => {
    if (!isSubscribed || isFirestoreQuotaExceeded() || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      const allCrumbs: any[] = [];
      const now = Date.now();
      const twoDaysAgo = now - 48 * 60 * 60 * 1000;

      const snap = await getDocs(collection(db, BREADCRUMBS_COL));
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data) return;
        if (data.type === 'telemetry_train' && Array.isArray(data.pings)) {
          // Backward compatibility: unpack legacy train pings
          if (!data.fromTs || data.fromTs >= twoDaysAgo || (now - (data.toTs || 0) < 48 * 3600000)) {
            data.pings.forEach((p: any) => {
              const pingTs = (p.timestamp && !isNaN(new Date(p.timestamp).getTime())) ? new Date(p.timestamp).getTime() : 0;
              if (pingTs >= twoDaysAgo) {
                allCrumbs.push({
                  ...p,
                  batchId: data.batchId,
                  type: 'telemetry_ping',
                  userId: p.userId || data.userId,
                  userName: p.userName || data.userName,
                });
              }
            });
          }
        } else if (data.lat !== undefined && data.lng !== undefined) {
          // Standard individual GPS breadcrumb
          const docTs = (data.timestamp && !isNaN(new Date(data.timestamp).getTime())) ? new Date(data.timestamp).getTime() : 0;
          if (docTs >= twoDaysAgo) {
            allCrumbs.push(data);
          }
        }
      });

      if (isSubscribed) {
        onUpdate(allCrumbs);
      }
    } catch (err) {
      handleFirestoreError('Polling route breadcrumbs', err);
    }
  };

  fetchAndNotify();
  timer = setInterval(fetchAndNotify, 30000);

  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      fetchAndNotify();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  return () => {
    isSubscribed = false;
    if (timer) clearInterval(timer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}

export async function saveRouteBreadcrumbToFirestore(breadcrumb: any) {
  if (isFirestoreQuotaExceeded() || !breadcrumb || breadcrumb.lat === undefined || breadcrumb.lng === undefined) return;
  try {
    const ts = (breadcrumb.timestamp && !isNaN(new Date(breadcrumb.timestamp).getTime())) 
      ? new Date(breadcrumb.timestamp).getTime() 
      : Date.now();
    const latStr = Number(breadcrumb.lat).toFixed(4).replace(/[^0-9]/g, '');
    const lngStr = Number(breadcrumb.lng).toFixed(4).replace(/[^0-9]/g, '');
    const uid = (breadcrumb.userId || breadcrumb.userName || 'staff').toLowerCase().replace(/[^a-z0-9]/g, '');
    const docId = `crumb_${uid}_${ts}_${latStr}_${lngStr}`;

    const cleanBreadcrumb = JSON.parse(JSON.stringify(breadcrumb));
    cleanBreadcrumb.timestamp = new Date(ts).toISOString();

    await setDoc(doc(db, BREADCRUMBS_COL, docId), cleanBreadcrumb, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving route breadcrumb', err);
  }
}

// --- ODOMETER READINGS ---
export function subscribeOdometerReadings(onUpdate: (readings: any[]) => void) {
  if (isFirestoreQuotaExceeded()) return () => {};
  try {
    const q = query(collection(db, ODOMETER_COL), orderBy('timestamp', 'desc'));
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(q, (snapshot) => {
      const readings = snapshot.docs.map(doc => doc.data());
      onUpdate(readings);
    }, (err) => {
      handleFirestoreError('Listening to odometer readings', err);
      if (unsub) unsub();
    });
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Subscribing to odometer readings', err);
    return () => {};
  }
}

export async function saveOdometerToFirestore(reading: any) {
  if (isFirestoreQuotaExceeded() || !reading || !reading.id) return;
  try {
    const cleanReading = JSON.parse(JSON.stringify(reading));
    await setDoc(doc(db, ODOMETER_COL, reading.id), cleanReading, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving odometer reading', err);
  }
}

export async function deleteOdometerFromFirestore(readingId: string) {
  if (isFirestoreQuotaExceeded() || !readingId) return;
  try {
    await deleteDoc(doc(db, ODOMETER_COL, readingId));
  } catch (err) {
    handleFirestoreError('Deleting odometer reading', err);
  }
}

// --- DELETE ALL RECYCLE ITEMS FROM FIRESTORE ---
export async function deleteAllRecycleItemsFromFirestore() {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const snap = await getDocs(collection(db, RECYCLE_COL));
    for (const d of snap.docs) {
      if (isFirestoreQuotaExceeded()) break;
      await deleteDoc(doc(db, RECYCLE_COL, d.id));
    }
  } catch (err) {
    handleFirestoreError('Deleting all recycle items', err);
  }
}

export async function deleteRecycleItemFromFirestore(itemId: string) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await deleteDoc(doc(db, RECYCLE_COL, itemId));
  } catch (err) {
    handleFirestoreError('Deleting recycle item', err);
  }
}

// --- SEED INITIAL DATA IF FIRESTORE IS EMPTY ---
export async function seedInitialDataIfEmpty(
  initialPhotos: Photo[], 
  initialFollowUps: FollowUp[], 
  initialTeam: User[],
  initialSettings?: AppSettings
) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const configSnap = await getDoc(doc(db, SETTINGS_COL, 'global_config'));
    if (configSnap.exists() && configSnap.data()?.isSeeded) {
      // Database has already been seeded. Do NOT re-seed deleted items!
      return;
    }

    const photosSnap = await getDocs(collection(db, PHOTOS_COL));
    if (photosSnap.empty && !isFirestoreQuotaExceeded()) {
      console.log('Seeding initial photos to Firestore...');
      for (const p of initialPhotos) {
        if (isFirestoreQuotaExceeded()) break;
        await savePhotoToFirestore(p);
      }
    }

    const teamSnap = await getDocs(collection(db, TEAM_COL));
    if (teamSnap.empty && !isFirestoreQuotaExceeded()) {
      console.log('Seeding initial team to Firestore...');
      for (const m of initialTeam) {
        if (isFirestoreQuotaExceeded()) break;
        await saveTeamMemberToFirestore(m);
      }
    }

    const followUpsSnap = await getDocs(collection(db, FOLLOWUPS_COL));
    if (followUpsSnap.empty && !isFirestoreQuotaExceeded()) {
      console.log('Seeding initial followups to Firestore...');
      for (const f of initialFollowUps) {
        if (isFirestoreQuotaExceeded()) break;
        await saveFollowUpToFirestore(f);
      }
    }

    if (!isFirestoreQuotaExceeded()) {
      await saveAppSettingsToFirestore({ 
        ...(initialSettings || { leadSources: [], personTypes: [], constructionStages: [] }), 
        isSeeded: true 
      });
    }
  } catch (err) {
    handleFirestoreError('Seeding initial Firestore data', err);
  }
}
