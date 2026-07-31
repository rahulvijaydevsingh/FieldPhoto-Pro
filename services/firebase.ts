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
  orderBy,
  disableNetwork
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

// Helper to handle Firestore quota or connection errors gracefully
let isQuotaExceeded = typeof window !== 'undefined' && (
  sessionStorage.getItem('fieldops_firestore_quota_exceeded') === 'true' ||
  localStorage.getItem('fieldops_firestore_quota_exceeded') === 'true'
);

if (isQuotaExceeded) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

export function isFirestoreQuotaExceeded(): boolean {
  return isQuotaExceeded;
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
    errMsg.includes('quota')
  ) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      try {
        sessionStorage.setItem('fieldops_firestore_quota_exceeded', 'true');
        localStorage.setItem('fieldops_firestore_quota_exceeded', 'true');
      } catch {}
      try {
        disableNetwork(db).catch(() => {});
      } catch {}
      console.warn(`[Firestore Quota Limit] ${context}: Free daily write/read quota limit reached. Application will operate seamlessly using local device storage.`);
    }
  } else {
    console.error(`[Firestore Error] ${context}:`, err);
  }
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
  if (isQuotaExceeded) return () => {};
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
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, SETTINGS_COL, 'global_config'), settings, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving app settings', err);
  }
}

export async function fetchTeamMembersDirectly(): Promise<User[]> {
  if (isQuotaExceeded) return [];
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
  if (isQuotaExceeded) return () => {};
  try {
    const q = query(collection(db, PHOTOS_COL));
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(q, (snapshot) => {
      const photos: Photo[] = snapshot.docs.map(doc => doc.data() as Photo);
      onUpdate(photos);
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
  if (isQuotaExceeded) return;
  try {
    const cleanPhoto = JSON.parse(JSON.stringify(photo)); // Ensure serializable
    await setDoc(doc(db, PHOTOS_COL, photo.id), cleanPhoto, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving photo', err);
  }
}

export async function deletePhotoFromFirestore(photoId: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, PHOTOS_COL, photoId));
  } catch (err) {
    handleFirestoreError('Deleting photo', err);
  }
}

// --- TEAM MEMBERS ---
export function subscribeTeamMembers(onUpdate: (members: User[]) => void) {
  if (isQuotaExceeded) return () => {};
  try {
    const q = query(collection(db, TEAM_COL));
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(q, (snapshot) => {
      const members: User[] = snapshot.docs.map(doc => doc.data() as User);
      onUpdate(members);
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
  if (isQuotaExceeded) return;
  try {
    const cleanMember = JSON.parse(JSON.stringify(member));
    await setDoc(doc(db, TEAM_COL, member.id), cleanMember, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving team member', err);
  }
}

// --- FOLLOW UPS ---
export function subscribeFollowUps(onUpdate: (followUps: FollowUp[]) => void) {
  if (isQuotaExceeded) return () => {};
  try {
    const q = query(collection(db, FOLLOWUPS_COL));
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(q, (snapshot) => {
      const followUps: FollowUp[] = snapshot.docs.map(doc => doc.data() as FollowUp);
      onUpdate(followUps);
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
  if (isQuotaExceeded) return;
  try {
    const cleanFollowUp = JSON.parse(JSON.stringify(followUp));
    await setDoc(doc(db, FOLLOWUPS_COL, followUp.id), cleanFollowUp, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving followup', err);
  }
}

// --- RECYCLE BIN ---
export function subscribeRecycleBin(onUpdate: (items: RecycleItem[]) => void) {
  if (isQuotaExceeded) return () => {};
  try {
    const q = query(collection(db, RECYCLE_COL));
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(q, (snapshot) => {
      const items: RecycleItem[] = snapshot.docs.map(doc => doc.data() as RecycleItem);
      onUpdate(items);
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
  if (isQuotaExceeded) return;
  try {
    const cleanItem = JSON.parse(JSON.stringify(item));
    await setDoc(doc(db, RECYCLE_COL, item.id), cleanItem, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving recycle item', err);
  }
}

// --- ROUTE BREADCRUMBS & TELEMETRY TRAINS (CROSS-DEVICE STAFF MOVEMENT TRACKING) ---
export function subscribeRouteBreadcrumbs(onUpdate: (breadcrumbs: any[]) => void) {
  if (isQuotaExceeded) return () => {};
  let isSubscribed = true;
  let timer: any = null;

  const fetchAndNotify = async () => {
    if (!isSubscribed || isQuotaExceeded || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      const snap = await getDocs(collection(db, BREADCRUMBS_COL));
      const allCrumbs: any[] = [];
      const now = Date.now();
      const twoDaysAgo = now - 48 * 60 * 60 * 1000;

      snap.docs.forEach(d => {
        const data = d.data();
        if (data && data.type === 'telemetry_train' && Array.isArray(data.pings)) {
          // Train document: unpack pings within recent window
          if (!data.fromTs || data.fromTs >= twoDaysAgo || (now - (data.toTs || 0) < 48 * 3600000)) {
            data.pings.forEach((p: any) => {
              allCrumbs.push({
                ...p,
                batchId: data.batchId,
                type: 'telemetry_ping',
                userId: p.userId || data.userId,
                userName: p.userName || data.userName,
              });
            });
          }
        } else if (data && data.lat !== undefined && data.lng !== undefined) {
          // Legacy individual breadcrumb doc
          allCrumbs.push(data);
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

export async function saveTelemetryTrainToFirestore(trainDoc: any): Promise<boolean> {
  if (isQuotaExceeded || !trainDoc || !trainDoc.userId) return false;
  try {
    const docId = `train_${trainDoc.userId}_${trainDoc.sessionId}_p${trainDoc.sessionPart || 1}`;
    const cleanTrainDoc = JSON.parse(JSON.stringify(trainDoc));
    await setDoc(doc(db, BREADCRUMBS_COL, docId), cleanTrainDoc, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError('Saving telemetry train', err);
    return false;
  }
}

export async function saveRouteBreadcrumbToFirestore(breadcrumb: any) {
  if (isQuotaExceeded || !breadcrumb || breadcrumb.lat === undefined || breadcrumb.lng === undefined) return;
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
  if (isQuotaExceeded) return () => {};
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
  if (isQuotaExceeded || !reading || !reading.id) return;
  try {
    const cleanReading = JSON.parse(JSON.stringify(reading));
    await setDoc(doc(db, ODOMETER_COL, reading.id), cleanReading, { merge: true });
  } catch (err) {
    handleFirestoreError('Saving odometer reading', err);
  }
}

export async function deleteOdometerFromFirestore(readingId: string) {
  if (isQuotaExceeded || !readingId) return;
  try {
    await deleteDoc(doc(db, ODOMETER_COL, readingId));
  } catch (err) {
    handleFirestoreError('Deleting odometer reading', err);
  }
}

// --- DELETE ALL RECYCLE ITEMS FROM FIRESTORE ---
export async function deleteAllRecycleItemsFromFirestore() {
  if (isQuotaExceeded) return;
  try {
    const snap = await getDocs(collection(db, RECYCLE_COL));
    for (const d of snap.docs) {
      if (isQuotaExceeded) break;
      await deleteDoc(doc(db, RECYCLE_COL, d.id));
    }
  } catch (err) {
    handleFirestoreError('Deleting all recycle items', err);
  }
}

export async function deleteRecycleItemFromFirestore(itemId: string) {
  if (isQuotaExceeded) return;
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
  if (isQuotaExceeded) return;
  try {
    const configSnap = await getDoc(doc(db, SETTINGS_COL, 'global_config'));
    if (configSnap.exists() && configSnap.data()?.isSeeded) {
      // Database has already been seeded. Do NOT re-seed deleted items!
      return;
    }

    const photosSnap = await getDocs(collection(db, PHOTOS_COL));
    if (photosSnap.empty && !isQuotaExceeded) {
      console.log('Seeding initial photos to Firestore...');
      for (const p of initialPhotos) {
        if (isQuotaExceeded) break;
        await savePhotoToFirestore(p);
      }
    }

    const teamSnap = await getDocs(collection(db, TEAM_COL));
    if (teamSnap.empty && !isQuotaExceeded) {
      console.log('Seeding initial team to Firestore...');
      for (const m of initialTeam) {
        if (isQuotaExceeded) break;
        await saveTeamMemberToFirestore(m);
      }
    }

    const followUpsSnap = await getDocs(collection(db, FOLLOWUPS_COL));
    if (followUpsSnap.empty && !isQuotaExceeded) {
      console.log('Seeding initial followups to Firestore...');
      for (const f of initialFollowUps) {
        if (isQuotaExceeded) break;
        await saveFollowUpToFirestore(f);
      }
    }

    if (!isQuotaExceeded) {
      await saveAppSettingsToFirestore({ 
        ...(initialSettings || { leadSources: [], personTypes: [], constructionStages: [] }), 
        isSeeded: true 
      });
    }
  } catch (err) {
    handleFirestoreError('Seeding initial Firestore data', err);
  }
}
