import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Photo, FollowUp, RecycleItem, FollowUpStatus, SyncStatus, User, View } from '../types';
import { seedInitialDataIfEmpty } from '../services/firebase';
import { photoRepository } from '../repositories/photoRepository';
import { followUpRepository } from '../repositories/followUpRepository';
import { recycleRepository } from '../repositories/recycleRepository';
import { teamRepository } from '../repositories/teamRepository';
import { settingsRepository } from '../repositories/settingsRepository';
import { DEMO_ADMIN, DEMO_STAFF, getInitialData } from '../services/mockData';
import { LEAD_SOURCES as INITIAL_LEAD_SOURCES, PERSON_TYPES as INITIAL_PERSON_TYPES, CONSTRUCTION_STAGES as INITIAL_STAGES } from '../types';

function getSavedItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    return fallback;
  }
}

function updateTeamMemberInLocalList(updated: User) {
  try {
    const saved = localStorage.getItem('fieldops_team_members');
    if (saved) {
      const team: User[] = JSON.parse(saved);
      const newTeam = team.map(m => (m.id === updated.id || m.email.trim().toLowerCase() === updated.email.trim().toLowerCase()) ? { ...m, ...updated } : m);
      localStorage.setItem('fieldops_team_members', JSON.stringify(newTeam));
    }
  } catch (e) {}
}

/* ─── Legacy Storage Adapter ───
   Reads/writes your EXISTING localStorage keys so no data is lost. */
const legacyStorage: StateStorage = {
  getItem: () => {
    const rawPhotos = localStorage.getItem('fieldops_photos');
    const rawFollowUps = localStorage.getItem('fieldops_followups');
    const rawRecycle = localStorage.getItem('fieldops_recycle_bin');
    const rawQueue = localStorage.getItem('fieldops_sync_queue');

    let photos: Photo[] = [];
    if (rawPhotos) {
      try {
        const parsed = JSON.parse(rawPhotos);
        if (Array.isArray(parsed)) {
          photos = parsed.filter((p: Photo) =>
            p && p.id &&
            !['p3','p4','p5','p6','p7','p8','p9','p10','p11','p12'].includes(p.id) &&
            !p.siteName?.includes('Green Valley Apartments') &&
            !p.siteName?.includes('Model Town Villa') &&
            !p.siteName?.includes('Sarabha Nagar Showroom') &&
            !p.siteName?.includes('Unknown Site #3')
          );
        }
      } catch {}
    }

    return JSON.stringify({
      state: {
        photos,
        followUps: rawFollowUps ? JSON.parse(rawFollowUps) : getInitialData().followUps,
        recycleBin: rawRecycle ? JSON.parse(rawRecycle) : [],
        syncQueue: rawQueue ? JSON.parse(rawQueue) : [],
        isOnline: true,
        isSyncing: false,
      },
      version: 1,
    });
  },
  setItem: (_, value) => {
    try {
      const parsedVal = typeof value === 'string' ? JSON.parse(value) : value;
      const state = parsedVal?.state || parsedVal;
      if (state) {
        if (state.photos) localStorage.setItem('fieldops_photos', JSON.stringify(state.photos));
        if (state.followUps) localStorage.setItem('fieldops_followups', JSON.stringify(state.followUps));
        if (state.recycleBin) localStorage.setItem('fieldops_recycle_bin', JSON.stringify(state.recycleBin));
        if (state.syncQueue) localStorage.setItem('fieldops_sync_queue', JSON.stringify(state.syncQueue));
      }
    } catch (e) {
      console.error('Storage set error:', e);
    }
  },
  removeItem: () => {
    localStorage.removeItem('fieldops_photos');
    localStorage.removeItem('fieldops_followups');
    localStorage.removeItem('fieldops_recycle_bin');
    localStorage.removeItem('fieldops_sync_queue');
  },
};

interface AppStore {
  // Photos & Data
  photos: Photo[];
  followUps: FollowUp[];
  recycleBin: RecycleItem[];
  syncQueue: string[];
  isOnline: boolean;
  isSyncing: boolean;

  // ─── Auth Slice ───
  currentUser: User | null;
  loginEmail: string;
  loginPassword: string;
  showPassword: boolean;
  loginError: string | null;
  nightlyLogoutNotice: boolean;
  appVersionNotice: string | null;

  setLoginEmail: (v: string) => void;
  setLoginPassword: (v: string) => void;
  setShowPassword: (v: boolean) => void;
  setLoginError: (v: string | null) => void;
  setCurrentUser: (user: User | null) => void;
  setNightlyLogoutNotice: (v: boolean) => void;
  setAppVersionNotice: (v: string | null) => void;
  handleLogout: () => void;
  handleUpdateUser: (updatedUser: User) => void;
  updateTeamMember: (member: User) => void;
  updateTeamMembers: (members: User[]) => void;
  cycleTheme: () => void;

  // ─── Navigation Slice ───
  currentView: View;
  viewParams: Record<string, any>;
  navigateTo: (view: View, params?: Record<string, any>) => void;

  // ─── Settings Slice ───
  leadSources: string[];
  personTypes: string[];
  constructionStages: string[];
  setLeadSources: (sources: string[]) => void;
  setPersonTypes: (types: string[]) => void;
  setConstructionStages: (stages: string[]) => void;

  // Remote updates from Firestore
  _setPhotosFromRemote: (photos: Photo[]) => void;
  _setFollowUpsFromRemote: (followUps: FollowUp[]) => void;
  _setRecycleFromRemote: (items: RecycleItem[]) => void;

  // Actions
  addPhoto: (photo: Photo) => void;
  updatePhoto: (photo: Photo) => void;
  deletePhoto: (photoId: string, deletedBy: string) => void;
  restorePhoto: (recycleId: string) => void;
  permanentlyDeletePhoto: (recycleId: string) => void;
  emptyRecycleBin: () => void;

  addFollowUp: (followUp: FollowUp) => void;
  toggleFollowUp: (id: string) => void;
  rescheduleFollowUp: (id: string, newDate: string) => void;

  setOnline: (v: boolean) => void;
  processSyncQueue: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      photos: [],
      followUps: [],
      recycleBin: [],
      syncQueue: [],
      isOnline: true,
      isSyncing: false,

      // Auth Slice
      currentUser: getSavedItem<User | null>('fieldops_user', null),
      loginEmail: '',
      loginPassword: '',
      showPassword: false,
      loginError: null,
      nightlyLogoutNotice: sessionStorage.getItem('auto_logout_11pm_notice') === 'true',
      appVersionNotice: null,

      setLoginEmail: (v) => set({ loginEmail: v }),
      setLoginPassword: (v) => set({ loginPassword: v }),
      setShowPassword: (v) => set({ showPassword: v }),
      setLoginError: (v) => set({ loginError: v }),
      setCurrentUser: (user) => {
        if (user) {
          localStorage.setItem('fieldops_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('fieldops_user');
        }
        set({ currentUser: user });
      },
      setNightlyLogoutNotice: (v) => {
        if (v) sessionStorage.setItem('auto_logout_11pm_notice', 'true');
        else sessionStorage.removeItem('auto_logout_11pm_notice');
        set({ nightlyLogoutNotice: v });
      },
      setAppVersionNotice: (v) => set({ appVersionNotice: v }),

      handleLogout: () => {
        const user = get().currentUser;
        if (user) {
          const logoutNow = new Date().toISOString();
          const loggedOutUser: User = { ...user, lastLogoutTime: logoutNow };
          teamRepository.save(loggedOutUser);
          updateTeamMemberInLocalList(loggedOutUser);
        }
        localStorage.removeItem('fieldops_user');
        localStorage.removeItem('fieldops_view');
        localStorage.removeItem('fieldops_view_params');
        sessionStorage.removeItem('auto_logout_11pm_notice');
        set({
          currentUser: null,
          loginEmail: '',
          loginPassword: '',
          loginError: null,
          nightlyLogoutNotice: false,
          currentView: 'dashboard',
          viewParams: {},
        });
      },

      handleUpdateUser: (updatedUser) => {
        set({ currentUser: updatedUser });
        localStorage.setItem('fieldops_user', JSON.stringify(updatedUser));
        teamRepository.save(updatedUser);
        updateTeamMemberInLocalList(updatedUser);
      },

      updateTeamMember: (member) => {
        teamRepository.save(member);
        updateTeamMemberInLocalList(member);
        if (get().currentUser?.id === member.id) {
          set({ currentUser: member });
          localStorage.setItem('fieldops_user', JSON.stringify(member));
        }
      },

      updateTeamMembers: (members) => {
        localStorage.setItem('fieldops_team_members', JSON.stringify(members));
        members.forEach(m => teamRepository.save(m));
        const currentUser = get().currentUser;
        if (currentUser) {
          const updatedSelf = members.find(m => m.id === currentUser.id || m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
          if (updatedSelf) {
            set({ currentUser: updatedSelf });
            localStorage.setItem('fieldops_user', JSON.stringify(updatedSelf));
          }
        }
      },

      cycleTheme: () => {
        const user = get().currentUser;
        if (!user) return;
        const currentTheme = user.themePreference || 'dark';
        const nextTheme: 'dark' | 'light' | 'high-contrast' =
          currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'high-contrast' : 'dark';
        get().handleUpdateUser({ ...user, themePreference: nextTheme });
      },

      // Navigation Slice
      currentView: getSavedItem<View>('fieldops_view', 'dashboard'),
      viewParams: getSavedItem<Record<string, any>>('fieldops_view_params', {}),

      navigateTo: (view, params = {}) => {
        localStorage.setItem('fieldops_view', JSON.stringify(view));
        localStorage.setItem('fieldops_view_params', JSON.stringify(params));
        set({ currentView: view, viewParams: params });
      },

      // Settings Slice
      leadSources: getSavedItem<string[]>('fieldops_lead_sources', INITIAL_LEAD_SOURCES),
      personTypes: getSavedItem<string[]>('fieldops_person_types', INITIAL_PERSON_TYPES),
      constructionStages: getSavedItem<string[]>('fieldops_stages', INITIAL_STAGES),

      setLeadSources: (sources) => {
        localStorage.setItem('fieldops_lead_sources', JSON.stringify(sources));
        set({ leadSources: sources });
      },
      setPersonTypes: (types) => {
        localStorage.setItem('fieldops_person_types', JSON.stringify(types));
        set({ personTypes: types });
      },
      setConstructionStages: (stages) => {
        localStorage.setItem('fieldops_stages', JSON.stringify(stages));
        set({ constructionStages: stages });
      },

      _setPhotosFromRemote: (realtimePhotos) => {
        if (!realtimePhotos) return;
        set((state) => {
          const recyclePhotoIds = new Set(
            state.recycleBin.map((r) => r.photo?.id).filter(Boolean)
          );
          const map = new Map<string, Photo>();
          realtimePhotos.forEach((p) => {
            if (p && p.id && !recyclePhotoIds.has(p.id)) {
              map.set(p.id, p);
            }
          });
          state.photos.forEach((localP) => {
            if (!map.has(localP.id) && !recyclePhotoIds.has(localP.id) && localP.syncStatus === 'pending') {
              map.set(localP.id, localP);
            }
          });
          const merged = Array.from(map.values());
          return { photos: merged };
        });
      },
      _setFollowUpsFromRemote: (followUps) => {
        if (!followUps) return;
        set({ followUps });
      },
      _setRecycleFromRemote: (recycleBin) => {
        if (!recycleBin) return;
        set({ recycleBin });
      },

      addPhoto: (photo) => {
        set((s) => ({
          photos: [photo, ...s.photos.filter((p) => p.id !== photo.id)],
          syncQueue: !s.isOnline && !s.syncQueue.includes(photo.id)
            ? [...s.syncQueue, photo.id]
            : s.syncQueue,
        }));
        photoRepository.save(photo);
      },

      updatePhoto: (photo) => {
        set((s) => ({
          photos: s.photos.map((p) => (p.id === photo.id ? photo : p)),
          syncQueue: !s.isOnline && photo.syncStatus === 'pending' && !s.syncQueue.includes(photo.id)
            ? [...s.syncQueue, photo.id]
            : s.syncQueue,
        }));
        photoRepository.save(photo);
      },

      deletePhoto: (photoId, deletedBy) => {
        const target = get().photos.find((p) => p.id === photoId);
        if (!target) return;

        let draftData = null;
        try {
          const raw = localStorage.getItem(`draft_lead_${photoId}`);
          if (raw) draftData = JSON.parse(raw);
        } catch {}

        const newItem: RecycleItem = {
          id: `recycle-${Date.now()}-${photoId}`,
          photo: target,
          deletedBy,
          deletedAt: new Date().toISOString(),
          draftData,
        };

        set((s) => {
          const updatedPhotos = s.photos.filter((p) => p.id !== photoId);
          localStorage.setItem('fieldops_photos', JSON.stringify(updatedPhotos));
          return {
            photos: updatedPhotos,
            recycleBin: [newItem, ...s.recycleBin.filter((r) => r.photo?.id !== photoId)],
            syncQueue: s.syncQueue.filter((id) => id !== photoId),
          };
        });

        localStorage.removeItem(`draft_lead_${photoId}`);
        localStorage.removeItem(`draft_contacts_${photoId}`);
        photoRepository.delete(photoId);
        recycleRepository.save(newItem);
      },

      restorePhoto: (recycleId) => {
        const item = get().recycleBin.find((r) => r.id === recycleId);
        if (!item) return;

        set((s) => ({
          photos: [item.photo, ...s.photos.filter(p => p.id !== item.photo.id)],
          recycleBin: s.recycleBin.filter((r) => r.id !== recycleId),
        }));

        photoRepository.save(item.photo);
        if (item.draftData) {
          localStorage.setItem(`draft_lead_${item.photo.id}`, JSON.stringify(item.draftData));
        }
        recycleRepository.delete(recycleId);
      },

      permanentlyDeletePhoto: (recycleId) => {
        const item = get().recycleBin.find((r) => r.id === recycleId);
        if (item) {
          localStorage.removeItem(`draft_lead_${item.photo.id}`);
          localStorage.removeItem(`draft_contacts_${item.photo.id}`);
        }
        set((s) => ({
          recycleBin: s.recycleBin.filter((r) => r.id !== recycleId),
        }));
        recycleRepository.delete(recycleId);
      },

      emptyRecycleBin: () => {
        get().recycleBin.forEach((item) => {
          localStorage.removeItem(`draft_lead_${item.photo.id}`);
          localStorage.removeItem(`draft_contacts_${item.photo.id}`);
          recycleRepository.delete(item.id);
        });
        set({ recycleBin: [] });
      },

      addFollowUp: (followUp) => {
        set((s) => ({ followUps: [followUp, ...s.followUps] }));
        followUpRepository.save(followUp);
      },

      toggleFollowUp: (id) => {
        set((s) => ({
          followUps: s.followUps.map((f) => {
            if (f.id !== id) return f;
            const updated = {
              ...f,
              status: (f.status === 'completed' ? 'pending' : 'completed') as FollowUpStatus,
            };
            followUpRepository.save(updated);
            return updated;
          }),
        }));
      },

      rescheduleFollowUp: (id, newDate) => {
        set((s) => ({
          followUps: s.followUps.map((f) => {
            if (f.id !== id) return f;
            const updated = {
              ...f,
              date: newDate,
              status: 'pending' as FollowUpStatus,
              isOverdue: false,
            };
            followUpRepository.save(updated);
            return updated;
          }),
        }));
      },

      setOnline: (v) => set({ isOnline: v }),
      processSyncQueue: () => {
        set({ isSyncing: true });
        setTimeout(() => {
          set((s) => ({
            photos: s.photos.map((p) =>
              s.syncQueue.includes(p.id) ? { ...p, syncStatus: 'synced' as SyncStatus } : p
            ),
            syncQueue: [],
            isSyncing: false,
          }));
        }, 2000);
      },
    }),
    { name: 'fieldops_app_store', storage: createJSONStorage(() => legacyStorage), version: 1 }
  )
);

/* ─── Firestore Bootstrap ───
   Call this ONCE in App.tsx inside a useEffect. */
export function initializeFirestoreSync() {
  seedInitialDataIfEmpty(
    getInitialData().photos,
    getInitialData().followUps,
    [DEMO_ADMIN, DEMO_STAFF],
    { leadSources: INITIAL_LEAD_SOURCES, personTypes: INITIAL_PERSON_TYPES, constructionStages: INITIAL_STAGES }
  );

  const unsubPhotos = photoRepository.subscribe((data) => {
    if (data) useAppStore.getState()._setPhotosFromRemote(data);
  });
  const unsubFollowUps = followUpRepository.subscribe((data) => {
    if (data) useAppStore.getState()._setFollowUpsFromRemote(data);
  });
  const unsubRecycle = recycleRepository.subscribe((data) => {
    if (data) useAppStore.getState()._setRecycleFromRemote(data);
  });

  return () => {
    unsubPhotos();
    unsubFollowUps();
    unsubRecycle();
  };
}

