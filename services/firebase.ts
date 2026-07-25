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
  orderBy
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

// Helper to handle Firestore quota or connection errors gracefully
let isQuotaExceeded = false;

function handleFirestoreError(context: string, err: any) {
  if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded') || err?.code === 'unavailable') {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      console.warn(`[Firestore Quota Limit] ${context}: Free daily quota limit exceeded. Operating smoothly using local device storage.`);
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
}

export function subscribeAppSettings(onUpdate: (settings: AppSettings) => void) {
  const docRef = doc(db, SETTINGS_COL, 'global_config');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as AppSettings);
    }
  }, (err) => {
    handleFirestoreError('Listening to app settings', err);
  });
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
  const q = query(collection(db, PHOTOS_COL));
  return onSnapshot(q, (snapshot) => {
    const photos: Photo[] = snapshot.docs.map(doc => doc.data() as Photo);
    onUpdate(photos);
  }, (err) => {
    handleFirestoreError('Listening to photos', err);
  });
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
  const q = query(collection(db, TEAM_COL));
  return onSnapshot(q, (snapshot) => {
    const members: User[] = snapshot.docs.map(doc => doc.data() as User);
    onUpdate(members);
  }, (err) => {
    handleFirestoreError('Listening to team members', err);
  });
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
  const q = query(collection(db, FOLLOWUPS_COL));
  return onSnapshot(q, (snapshot) => {
    const followUps: FollowUp[] = snapshot.docs.map(doc => doc.data() as FollowUp);
    onUpdate(followUps);
  }, (err) => {
    handleFirestoreError('Listening to followups', err);
  });
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
  const q = query(collection(db, RECYCLE_COL));
  return onSnapshot(q, (snapshot) => {
    const items: RecycleItem[] = snapshot.docs.map(doc => doc.data() as RecycleItem);
    onUpdate(items);
  }, (err) => {
    handleFirestoreError('Listening to recycle bin', err);
  });
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
