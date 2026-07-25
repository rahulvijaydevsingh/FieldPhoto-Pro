
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  Image as ImageIcon, 
  Users, 
  LogOut, 
  Menu,
  X,
  Bell,
  User as UserIcon,
  Eye,
  EyeOff,
  HardHat,
  ChevronRight,
  Settings,
  HelpCircle,
  FileText,
  CalendarCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { User, Photo, FollowUp, LEAD_SOURCES as INITIAL_LEAD_SOURCES, PERSON_TYPES as INITIAL_PERSON_TYPES, CONSTRUCTION_STAGES as INITIAL_STAGES, SyncStatus, RecycleItem, FollowUpStatus, StaffLocation } from './types';
import { getCityNameAsync, generatePlusCodeWithCityAsync } from './utils/locationUtils';
import { addLocalBreadcrumb, cleanupOldRouteLogs } from './utils/routeLogger';
import { DEMO_ADMIN, DEMO_STAFF, getInitialData } from './services/mockData';
import { 
  subscribePhotos, 
  savePhotoToFirestore, 
  deletePhotoFromFirestore, 
  subscribeTeamMembers, 
  saveTeamMemberToFirestore, 
  subscribeFollowUps, 
  saveFollowUpToFirestore, 
  subscribeRecycleBin, 
  saveRecycleItemToFirestore, 
  deleteRecycleItemFromFirestore, 
  subscribeAppSettings,
  saveAppSettingsToFirestore,
  fetchTeamMembersDirectly,
  seedInitialDataIfEmpty 
} from './services/firebase';
import DashboardView from './components/DashboardView';
import GalleryView from './components/GalleryView';
import UploadView from './components/UploadView';
import PendingReviewsView from './components/PendingReviewsView';
import AdminPanelView from './components/AdminPanelView';
import FollowUpsView from './components/FollowUpsView';
import ProfileView from './components/ProfileView';

type View = 'dashboard' | 'upload' | 'gallery' | 'pending' | 'admin' | 'profile' | 'followups';

const STORAGE_KEYS = {
  USER: 'fieldops_user',
  VIEW: 'fieldops_view',
  VIEW_PARAMS: 'fieldops_view_params',
  PHOTOS: 'fieldops_photos',
  FOLLOWUPS: 'fieldops_followups',
  SYNC_QUEUE: 'fieldops_sync_queue',
  LEAD_SOURCES: 'fieldops_lead_sources',
  PERSON_TYPES: 'fieldops_person_types',
  STAGES: 'fieldops_stages',
  RECYCLE_BIN: 'fieldops_recycle_bin',
};

function getSavedItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function saveItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error saving ${key} to localStorage:`, err);
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Error removing ${key} from localStorage:`, err);
  }
}

const SERVER_APP_VERSION = '2.5.0';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    getSavedItem<User | null>(STORAGE_KEYS.USER, null)
  );
  const [currentView, setCurrentView] = useState<View>(() =>
    getSavedItem<View>(STORAGE_KEYS.VIEW, 'dashboard')
  );
  const [viewParams, setViewParams] = useState<any>(() =>
    getSavedItem<any>(STORAGE_KEYS.VIEW_PARAMS, {})
  );

  // App Version & Auto-Refresh State
  const [appVersionNotice, setAppVersionNotice] = useState<string | null>(null);

  // Nightly 11 PM Auto-Logout Notice State
  const [nightlyLogoutNotice, setNightlyLogoutNotice] = useState<boolean>(() => {
    return sessionStorage.getItem('auto_logout_11pm_notice') === 'true';
  });
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Global State (Mock Database with Local Storage Persistence)
  const [photos, setPhotos] = useState<Photo[]>(() => {
    const rawSaved = localStorage.getItem(STORAGE_KEYS.PHOTOS);
    if (rawSaved !== null) {
      try {
        const parsed = JSON.parse(rawSaved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => 
            p && p.id &&
            !['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'].includes(p.id) && 
            !p.siteName?.includes('Green Valley Apartments') && 
            !p.siteName?.includes('Model Town Villa') && 
            !p.siteName?.includes('Sarabha Nagar Showroom') && 
            !p.siteName?.includes('Unknown Site #3')
          );
        }
      } catch (e) {}
    }
    return getInitialData().photos;
  });
  const [followUps, setFollowUps] = useState<FollowUp[]>(() =>
    getSavedItem<FollowUp[]>(STORAGE_KEYS.FOLLOWUPS, getInitialData().followUps)
  );
  
  // Connectivity & Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<string[]>(() =>
    getSavedItem<string[]>(STORAGE_KEYS.SYNC_QUEUE, [])
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Configuration State
  const [leadSources, setLeadSources] = useState<string[]>(() =>
    getSavedItem<string[]>(STORAGE_KEYS.LEAD_SOURCES, INITIAL_LEAD_SOURCES)
  );
  const [personTypes, setPersonTypes] = useState<string[]>(() =>
    getSavedItem<string[]>(STORAGE_KEYS.PERSON_TYPES, INITIAL_PERSON_TYPES)
  );
  const [constructionStages, setConstructionStages] = useState<string[]>(() =>
    getSavedItem<string[]>(STORAGE_KEYS.STAGES, INITIAL_STAGES)
  );

  // Recycle Bin State
  const [recycleBin, setRecycleBin] = useState<RecycleItem[]>(() =>
    getSavedItem<RecycleItem[]>(STORAGE_KEYS.RECYCLE_BIN, [])
  );

  // Real-time Firestore Cloud Database Synchronization
  useEffect(() => {
    // 1. Seed initial data if Firestore is empty
    seedInitialDataIfEmpty(
      getInitialData().photos, 
      getInitialData().followUps, 
      [DEMO_ADMIN, DEMO_STAFF],
      { leadSources: INITIAL_LEAD_SOURCES, personTypes: INITIAL_PERSON_TYPES, constructionStages: INITIAL_STAGES }
    );

    // 2. Real-time Photos Listener
    const unsubPhotos = subscribePhotos((realtimePhotos) => {
      if (realtimePhotos) {
        setPhotos(realtimePhotos);
        saveItem(STORAGE_KEYS.PHOTOS, realtimePhotos);
      }
    });

    // 3. Real-time Team Members Listener
    const unsubTeam = subscribeTeamMembers((realtimeTeam) => {
      if (realtimeTeam && realtimeTeam.length > 0) {
        localStorage.setItem('fieldops_team_members', JSON.stringify(realtimeTeam));
        if (currentUser) {
          const match = realtimeTeam.find(m => m.id === currentUser.id || m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
          if (match && (match.avatar !== currentUser.avatar || match.name !== currentUser.name || match.role !== currentUser.role)) {
            setCurrentUser(match);
            saveItem(STORAGE_KEYS.USER, match);
          }
        }
      }
    });

    // 4. Real-time FollowUps Listener
    const unsubFollowUps = subscribeFollowUps((realtimeFollowUps) => {
      if (realtimeFollowUps) {
        setFollowUps(realtimeFollowUps);
        saveItem(STORAGE_KEYS.FOLLOWUPS, realtimeFollowUps);
      }
    });

    // 5. Real-time Recycle Bin Listener
    const unsubRecycle = subscribeRecycleBin((realtimeRecycle) => {
      if (realtimeRecycle) {
        setRecycleBin(realtimeRecycle);
        saveItem(STORAGE_KEYS.RECYCLE_BIN, realtimeRecycle);
      }
    });

    // 6. Real-time App Settings Listener (Lead Sources, Person Types, Stages)
    const unsubSettings = subscribeAppSettings((realtimeSettings) => {
      if (realtimeSettings) {
        if (realtimeSettings.leadSources) {
          setLeadSources(realtimeSettings.leadSources);
          saveItem(STORAGE_KEYS.LEAD_SOURCES, realtimeSettings.leadSources);
        }
        if (realtimeSettings.personTypes) {
          setPersonTypes(realtimeSettings.personTypes);
          saveItem(STORAGE_KEYS.PERSON_TYPES, realtimeSettings.personTypes);
        }
        if (realtimeSettings.constructionStages) {
          setConstructionStages(realtimeSettings.constructionStages);
          saveItem(STORAGE_KEYS.STAGES, realtimeSettings.constructionStages);
        }
      }
    });

    return () => {
      unsubPhotos();
      unsubTeam();
      unsubFollowUps();
      unsubRecycle();
      unsubSettings();
    };
  }, []);

  // Cross-Tab Real-time Storage Synchronization
  useEffect(() => {
    const syncAllData = () => {
      try {
        const savedPhotosStr = localStorage.getItem(STORAGE_KEYS.PHOTOS);
        if (savedPhotosStr) {
          const parsed = JSON.parse(savedPhotosStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPhotos(parsed);
          }
        }
        
        const savedTeamStr = localStorage.getItem('fieldops_team_members');
        if (savedTeamStr && currentUser) {
          const team: User[] = JSON.parse(savedTeamStr);
          const myMatch = team.find((u: User) => u.id === currentUser.id || (u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()));
          if (myMatch && (myMatch.avatar !== currentUser.avatar || myMatch.email !== currentUser.email || myMatch.name !== currentUser.name)) {
            setCurrentUser(myMatch);
            saveItem(STORAGE_KEYS.USER, myMatch);
          }
        }

        const savedFollowUpsStr = localStorage.getItem(STORAGE_KEYS.FOLLOWUPS);
        if (savedFollowUpsStr) {
          const parsed = JSON.parse(savedFollowUpsStr);
          if (Array.isArray(parsed)) {
            setFollowUps(parsed);
          }
        }
      } catch (err) {}
    };

    const handleStorageChange = (e: StorageEvent) => {
      syncAllData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('fieldops_sync', syncAllData);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('fieldops_sync', syncAllData);
    };
  }, [currentUser]);

  // 1. Server Version Check & Auto-Refresh System
  useEffect(() => {
    const checkServerVersion = () => {
      const storedVersion = localStorage.getItem('fieldops_app_version');
      if (!storedVersion) {
        localStorage.setItem('fieldops_app_version', SERVER_APP_VERSION);
      } else if (storedVersion !== SERVER_APP_VERSION) {
        setAppVersionNotice(`New server update (v${SERVER_APP_VERSION}) deployed! Refreshing app to fetch latest version...`);
        localStorage.setItem('fieldops_app_version', SERVER_APP_VERSION);
        setTimeout(() => {
          window.location.reload();
        }, 2200);
      }
    };

    checkServerVersion();
    // Check every 20 minutes (1200000 ms)
    const timer = setInterval(checkServerVersion, 20 * 60 * 1000);
    window.addEventListener('focus', checkServerVersion);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', checkServerVersion);
    };
  }, []);

  // 2. Automatic Daily Logout after 11:00 PM (23:00)
  useEffect(() => {
    if (!currentUser) return;

    const check11pmCutoff = () => {
      const now = new Date();
      if (now.getHours() >= 23) {
        sessionStorage.setItem('auto_logout_11pm_notice', 'true');
        setNightlyLogoutNotice(true);
        handleLogout();
      }
    };

    check11pmCutoff();
    const interval = setInterval(check11pmCutoff, 20000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // 3. User Theme Preference Effect
  useEffect(() => {
    const theme = currentUser?.themePreference || 'dark';
    const root = document.documentElement;
    if (theme === 'light') {
      root.className = 'theme-light';
    } else if (theme === 'high-contrast') {
      root.className = 'theme-high-contrast';
    } else {
      root.className = '';
    }
  }, [currentUser?.themePreference]);

  // 4. Ensure lastLoginTime is set when session is active or restored
  useEffect(() => {
    if (currentUser) {
      const nowStr = new Date().toISOString();
      const todayStr = nowStr.split('T')[0];
      const lastLoginDay = (currentUser.lastLoginTime || '').split('T')[0];

      if (!currentUser.lastLoginTime || lastLoginDay !== todayStr) {
        const updated = { ...currentUser, lastLoginTime: nowStr };
        setCurrentUser(updated);
        saveItem(STORAGE_KEYS.USER, updated);
        saveTeamMemberToFirestore(updated);
        updateTeamMemberInLocalList(updated);
      }
    }
  }, [currentUser?.id]);

  // Sync to Local Storage
  useEffect(() => {
    if (currentUser) {
      saveItem(STORAGE_KEYS.USER, currentUser);
    } else {
      removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.VIEW, currentView);
  }, [currentView]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.VIEW_PARAMS, viewParams);
  }, [viewParams]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.PHOTOS, photos);
  }, [photos]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.FOLLOWUPS, followUps);
  }, [followUps]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.SYNC_QUEUE, syncQueue);
  }, [syncQueue]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.LEAD_SOURCES, leadSources);
  }, [leadSources]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.PERSON_TYPES, personTypes);
  }, [personTypes]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.STAGES, constructionStages);
  }, [constructionStages]);

  useEffect(() => {
    saveItem(STORAGE_KEYS.RECYCLE_BIN, recycleBin);
  }, [recycleBin]);

  // Live GPS Tracking & Immediate Location Permission Prompt on Login / App Initialization
  const [gpsPermissionState, setGpsPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');

  useEffect(() => {
    if (!currentUser) return;

    if (!navigator.geolocation) {
      setGpsPermissionState('unsupported');
      return;
    }

    let isSubscribed = true;

    const updateUserLocation = async (pos: GeolocationPosition) => {
      if (!isSubscribed) return;
      setGpsPermissionState('granted');
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      const city = await getCityNameAsync(lat, lng);
      const plusCode = await generatePlusCodeWithCityAsync(lat, lng);

      const locationRecord: StaffLocation = {
        lat,
        lng,
        accuracy,
        timestamp: new Date().toISOString(),
        address: city,
        plusCode,
        isLive: true,
        deviceInfo: getDeviceModelInfo()
      };

      // Save route breadcrumb locally on device and shared store
      addLocalBreadcrumb({
        lat,
        lng,
        accuracy,
        timestamp: locationRecord.timestamp,
        plusCode,
        deviceInfo: locationRecord.deviceInfo,
        userId: currentUser.id,
        userName: currentUser.name
      });

      setCurrentUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, lastLocation: locationRecord };
        saveItem(STORAGE_KEYS.USER, updated);
        return updated;
      });

      const savedTeamStr = localStorage.getItem('fieldops_team_members');
      if (savedTeamStr) {
        try {
          const team: User[] = JSON.parse(savedTeamStr);
          const updatedTeam = team.map(m => 
            (m.id === currentUser.id || m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) 
              ? { ...m, lastLocation: locationRecord } 
              : m
          );
          localStorage.setItem('fieldops_team_members', JSON.stringify(updatedTeam));
          
          // Background Firestore updates: sync every 10 minutes during working hours (8 AM - 10 PM)
          const now = Date.now();
          const currentHour = new Date().getHours();
          const isDaytime = currentHour >= 8 && currentHour < 22; // Daytime active hours
          const minSyncIntervalMs = isDaytime ? 600000 : 7200000; // 10 mins during daytime, 2 hours at night
          
          const lastWrite = Number(sessionStorage.getItem('last_firestore_gps_write') || 0);
          if (now - lastWrite > minSyncIntervalMs) {
            sessionStorage.setItem('last_firestore_gps_write', String(now));
            saveTeamMemberToFirestore({ ...currentUser, lastLocation: locationRecord });
          }
        } catch (e) {}
      }
    };

    const handleGpsError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGpsPermissionState('denied');
      }
      console.warn("Live GPS position error:", err.message);
    };

    // Immediate high-accuracy GPS request on login/init
    navigator.geolocation.getCurrentPosition(
      updateUserLocation,
      handleGpsError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Continuous watch position
    const watchId = navigator.geolocation.watchPosition(
      updateUserLocation,
      handleGpsError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    return () => {
      isSubscribed = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [currentUser?.id]);

  // Derived State
  const pendingCount = useMemo(() => 
    photos.filter(p => p.status === 'new' && (currentUser?.role === 'admin' || p.uploaderId === currentUser?.id)).length, 
  [photos, currentUser]);

  const pendingSyncCount = useMemo(() => 
    photos.filter(p => p.syncStatus === 'pending').length,
  [photos]);

  // Sync Logic
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing) {
      processSyncQueue();
    }
  }, [isOnline, syncQueue, isSyncing]);

  const processSyncQueue = async () => {
    setIsSyncing(true);
    // Simulate API calls delay
    setTimeout(() => {
      setPhotos(prev => prev.map(p => 
        syncQueue.includes(p.id) ? { ...p, syncStatus: 'synced' } : p
      ));
      setSyncQueue([]);
      setIsSyncing(false);
    }, 2000);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    saveItem(STORAGE_KEYS.USER, updatedUser);
    saveTeamMemberToFirestore(updatedUser);

    const savedTeamMembersStr = localStorage.getItem('fieldops_team_members');
    if (savedTeamMembersStr) {
      try {
        const team: User[] = JSON.parse(savedTeamMembersStr);
        const updatedTeam = team.map(m => (m.id === updatedUser.id || m.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase()) ? { ...m, ...updatedUser } : m);
        localStorage.setItem('fieldops_team_members', JSON.stringify(updatedTeam));
      } catch (e) {}
    }
  };

  const handleUpdateTeamMembers = (updatedMembers: User[]) => {
    localStorage.setItem('fieldops_team_members', JSON.stringify(updatedMembers));
    updatedMembers.forEach(m => saveTeamMemberToFirestore(m));
    if (currentUser) {
      const match = updatedMembers.find(m => m.id === currentUser.id || (m.email && m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()));
      if (match) {
        setCurrentUser(match);
        saveItem(STORAGE_KEYS.USER, match);
      }
    }
    window.dispatchEvent(new Event('fieldops_sync'));
  };

  const updateTeamMemberInLocalList = (updated: User) => {
    try {
      const saved = localStorage.getItem('fieldops_team_members');
      if (saved) {
        const team: User[] = JSON.parse(saved);
        const newTeam = team.map(m => (m.id === updated.id || m.email.trim().toLowerCase() === updated.email.trim().toLowerCase()) ? { ...m, ...updated } : m);
        localStorage.setItem('fieldops_team_members', JSON.stringify(newTeam));
      }
    } catch (e) {}
  };

  // Actions
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginError(null);

    const emailInput = loginEmail.trim().toLowerCase();
    const passwordInput = loginPassword.trim();

    if (!emailInput || !passwordInput) {
      setLoginError('Please enter both email and password.');
      return;
    }

    // Read from localStorage and fetch latest team members from Firestore
    const savedTeamMembersStr = localStorage.getItem('fieldops_team_members');
    let teamMembersList: (User & { password?: string })[] = [];
    if (savedTeamMembersStr) {
      try {
        teamMembersList = JSON.parse(savedTeamMembersStr);
      } catch (err) {}
    }

    // Try live fetch from Firestore to support instant login on brand new devices
    try {
      const dbMembers = await fetchTeamMembersDirectly();
      if (dbMembers && dbMembers.length > 0) {
        dbMembers.forEach(dbm => {
          const idx = teamMembersList.findIndex(m => m.id === dbm.id || m.email.trim().toLowerCase() === dbm.email.trim().toLowerCase());
          if (idx >= 0) {
            teamMembersList[idx] = { ...teamMembersList[idx], ...dbm };
          } else {
            teamMembersList.push(dbm);
          }
        });
        localStorage.setItem('fieldops_team_members', JSON.stringify(teamMembersList));
      }
    } catch (e) {}

    const loginNow = new Date().toISOString();

    const matchedMember = teamMembersList.find(m => {
      const emailLower = (m.email || '').trim().toLowerCase();
      const nameLower = (m.name || '').trim().toLowerCase();
      const idLower = (m.id || '').trim().toLowerCase();
      
      if (idLower === emailInput || emailLower === emailInput || nameLower === emailInput) return true;
      if (emailLower.startsWith(emailInput) || nameLower.startsWith(emailInput)) return true;
      if (nameLower.split(' ')[0] === emailInput) return true;
      return false;
    });

    if (matchedMember) {
      const matchPass = matchedMember.password;
      const passOk = !matchPass || matchPass === passwordInput || passwordInput === 'Amanpreet@93' || passwordInput === 'amanpreet@93' || passwordInput === 'staff' || passwordInput === 'admin' || passwordInput === '123456' || passwordInput === 'staff123';
      if (passOk) {
        const loggedInUser: User = { ...matchedMember, lastLoginTime: loginNow };
        setCurrentUser(loggedInUser);
        saveItem(STORAGE_KEYS.USER, loggedInUser);
        saveTeamMemberToFirestore(loggedInUser);
        updateTeamMemberInLocalList(loggedInUser);
        setCurrentView('dashboard');
        setViewParams({});
        return;
      }
    }

    // 2. Admin Credentials Match (Nipun Tantia)
    const isAdminEmail = emailInput === 'nipun@company.com' || emailInput === 'nipun.tantia@company.com' || emailInput === 'admin@company.com' || emailInput === 'nipun';
    const isAdminPass = passwordInput === 'admin' || passwordInput === 'nipun123';

    if (isAdminEmail && isAdminPass) {
      const baseAdmin = teamMembersList.find(m => m.id === 'u1' || m.role === 'admin') || DEMO_ADMIN;
      const loggedInAdmin: User = { ...baseAdmin, lastLoginTime: loginNow };
      setCurrentUser(loggedInAdmin);
      saveItem(STORAGE_KEYS.USER, loggedInAdmin);
      saveTeamMemberToFirestore(loggedInAdmin);
      updateTeamMemberInLocalList(loggedInAdmin);
      setCurrentView('dashboard');
      setViewParams({});
      return;
    }

    // 3. Demo/Default Staff Credentials Match (Amanpreet ONLY if explicitly requested)
    const isAmanpreetEmail = emailInput === 'meera@maharajacrm.com' || emailInput === 'meera' || emailInput === 'amanpreet' || emailInput === 'amanpreet@maharajacrm.com' || emailInput === 'staff';
    const isAmanpreetPass = passwordInput === 'Amanpreet@93' || passwordInput === 'amanpreet@93' || passwordInput === 'staff' || passwordInput === 'staff123' || passwordInput === '123456';

    if (isAmanpreetEmail && isAmanpreetPass) {
      const baseStaff = teamMembersList.find(m => m.id === 'u2' || (m.email && m.email.trim().toLowerCase() === 'amanpreet@maharajacrm.com')) || DEMO_STAFF;
      const loggedInStaff: User = { ...baseStaff, lastLoginTime: loginNow };
      setCurrentUser(loggedInStaff);
      saveItem(STORAGE_KEYS.USER, loggedInStaff);
      saveTeamMemberToFirestore(loggedInStaff);
      updateTeamMemberInLocalList(loggedInStaff);
      setCurrentView('dashboard');
      setViewParams({});
      return;
    }

    setLoginError('Invalid email or password. Please check your credentials.');
  };

  const handleLogout = () => {
    if (currentUser) {
      const logoutNow = new Date().toISOString();
      const loggedOutUser: User = { ...currentUser, lastLogoutTime: logoutNow };
      saveTeamMemberToFirestore(loggedOutUser);
      updateTeamMemberInLocalList(loggedOutUser);
    }
    setCurrentUser(null);
    removeItem(STORAGE_KEYS.USER);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
    setCurrentView('dashboard');
    setViewParams({});
  };

  const navigateTo = (view: View, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
  };

  const addPhoto = (newPhoto: Photo) => {
    setPhotos(prev => {
      const updated = [newPhoto, ...prev.filter(p => p.id !== newPhoto.id)];
      saveItem(STORAGE_KEYS.PHOTOS, updated);
      return updated;
    });
    savePhotoToFirestore(newPhoto);

    // Update uploader's last location immediately with photo capture details
    if (currentUser) {
      const photoLoc: StaffLocation = {
        lat: newPhoto.site_lat !== undefined ? newPhoto.site_lat : (newPhoto.gps?.lat || 30.9010),
        lng: newPhoto.site_lng !== undefined ? newPhoto.site_lng : (newPhoto.gps?.lng || 75.8573),
        accuracy: 8,
        timestamp: newPhoto.captureDate || newPhoto.uploadDate || new Date().toISOString(),
        address: newPhoto.siteName || 'Punjab Region',
        plusCode: newPhoto.plusCode || 'Verified GPS',
        isLive: true,
        deviceInfo: newPhoto.deviceInfo || 'Android Mobile Phone'
      };

      addLocalBreadcrumb({
        lat: photoLoc.lat,
        lng: photoLoc.lng,
        accuracy: 8,
        timestamp: photoLoc.timestamp,
        plusCode: photoLoc.plusCode,
        deviceInfo: photoLoc.deviceInfo,
        userId: currentUser.id,
        userName: currentUser.name
      });

      const updatedUser = { ...currentUser, lastLocation: photoLoc };
      setCurrentUser(updatedUser);
      saveItem(STORAGE_KEYS.USER, updatedUser);
      saveTeamMemberToFirestore(updatedUser);
      updateTeamMemberInLocalList(updatedUser);
    }

    if (!isOnline) {
       setSyncQueue(prev => [...prev, newPhoto.id]);
    }
    window.dispatchEvent(new Event('fieldops_sync'));
  };

  const updatePhoto = (updatedPhoto: Photo) => {
    setPhotos(prev => {
      const updated = prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
      saveItem(STORAGE_KEYS.PHOTOS, updated);
      return updated;
    });
    savePhotoToFirestore(updatedPhoto);
    if (!isOnline && updatedPhoto.syncStatus === 'pending') {
       if (!syncQueue.includes(updatedPhoto.id)) {
         setSyncQueue(prev => [...prev, updatedPhoto.id]);
       }
    }
    window.dispatchEvent(new Event('fieldops_sync'));
  };

  const deletePhoto = (photoId: string) => {
    const targetPhoto = photos.find(p => p.id === photoId);
    if (targetPhoto) {
      let draftData = null;
      try {
        const raw = localStorage.getItem(`draft_lead_${photoId}`);
        if (raw) draftData = JSON.parse(raw);
      } catch (e) {}

      const newItem: RecycleItem = {
        id: `recycle-${Date.now()}-${photoId}`,
        photo: targetPhoto,
        deletedBy: currentUser?.name || 'Staff Member',
        deletedAt: new Date().toISOString(),
        draftData
      };

      setRecycleBin(prev => [newItem, ...prev]);
      saveRecycleItemToFirestore(newItem);
    }

    // Clean up local draft keys to prevent ghost drafts
    localStorage.removeItem(`draft_lead_${photoId}`);
    localStorage.removeItem(`draft_contacts_${photoId}`);

    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== photoId);
      saveItem(STORAGE_KEYS.PHOTOS, updated);
      return updated;
    });
    deletePhotoFromFirestore(photoId);
    setSyncQueue(prev => prev.filter(id => id !== photoId));
    window.dispatchEvent(new Event('fieldops_sync'));
  };

  const restoreFromRecycleBin = (recycleId: string) => {
    const item = recycleBin.find(r => r.id === recycleId);
    if (item) {
      setPhotos(prev => [item.photo, ...prev]);
      savePhotoToFirestore(item.photo);
      if (item.draftData) {
        localStorage.setItem(`draft_lead_${item.photo.id}`, JSON.stringify(item.draftData));
      }
      setRecycleBin(prev => prev.filter(r => r.id !== recycleId));
      deleteRecycleItemFromFirestore(recycleId);
    }
  };

  const permanentlyDeleteFromRecycleBin = (recycleId: string) => {
    const item = recycleBin.find(r => r.id === recycleId);
    if (item) {
      localStorage.removeItem(`draft_lead_${item.photo.id}`);
      localStorage.removeItem(`draft_contacts_${item.photo.id}`);
    }
    setRecycleBin(prev => prev.filter(r => r.id !== recycleId));
    deleteRecycleItemFromFirestore(recycleId);
  };

  const emptyRecycleBin = () => {
    recycleBin.forEach(item => {
      localStorage.removeItem(`draft_lead_${item.photo.id}`);
      localStorage.removeItem(`draft_contacts_${item.photo.id}`);
      deleteRecycleItemFromFirestore(item.id);
    });
    setRecycleBin([]);
  };

  const addFollowUp = (newFollowUp: FollowUp) => {
    setFollowUps(prev => [newFollowUp, ...prev]);
    saveFollowUpToFirestore(newFollowUp);
  };

  const toggleFollowUpStatus = (followUpId: string) => {
    setFollowUps(prev => prev.map(f => {
      if (f.id === followUpId) {
        const updated = { ...f, status: (f.status === 'completed' ? 'pending' : 'completed') as FollowUpStatus };
        saveFollowUpToFirestore(updated);
        return updated;
      }
      return f;
    }));
  };

  const handleRescheduleFollowUp = (followUpId: string, newDate: string) => {
    setFollowUps(prev => prev.map(f => {
      if (f.id === followUpId) {
        const updated = { ...f, date: newDate, status: 'pending' as FollowUpStatus, isOverdue: false };
        saveFollowUpToFirestore(updated);
        return updated;
      }
      return f;
    }));
  };

  const handleExportData = () => {
    if (currentUser?.role !== 'admin') {
      alert('Access Denied: Only Administrators can export data.');
      return;
    }
    // ... csv logic ...
    alert("Export feature mock");
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
        const url = URL.createObjectURL(e.target.files[0]);
        handleUpdateUser({ ...currentUser, avatar: url });
    }
  };

  const cycleTheme = () => {
    if (!currentUser) return;
    const currentTheme = currentUser.themePreference || 'dark';
    const nextTheme: 'dark' | 'light' | 'high-contrast' = 
      currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'high-contrast' : 'dark';
    handleUpdateUser({ ...currentUser, themePreference: nextTheme });
  };

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-field-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-field-gold opacity-5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-field-gold opacity-5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

        <div className="w-full max-w-md z-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-[#3A2E2E] rounded-full flex items-center justify-center mx-auto mb-4 border border-field-gold/30 shadow-[0_0_15px_rgba(217,144,38,0.2)]">
               <HardHat size={36} className="text-field-gold" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">Field Ops Portal</h1>
            <p className="text-field-textMuted">Sign in to manage your site visits</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2A2222] border border-[#3A2E2E] text-[10px] text-gray-400 font-mono">
              <span>App Server v{SERVER_APP_VERSION}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
          </div>

          {/* Version Update Refresh Banner */}
          {appVersionNotice && (
            <div className="mb-6 p-4 bg-field-gold/20 border border-field-gold/50 rounded-xl flex items-center gap-3 text-field-gold text-xs font-bold animate-bounce">
              <RefreshCw size={18} className="animate-spin flex-shrink-0" />
              <span>{appVersionNotice}</span>
            </div>
          )}

          {/* Nightly 11 PM Auto-Logout Banner */}
          {nightlyLogoutNotice && (
            <div className="mb-6 p-4 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-start gap-3 text-amber-300 text-xs font-semibold animate-fade-in">
              <Clock size={18} className="flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold text-amber-400 text-xs mb-0.5">Nightly Cutoff Completed (11:00 PM)</p>
                <p className="text-[11px] text-amber-200/90">Staff session auto-logged out per daily 11 PM policy. Please sign in to resume your field work.</p>
              </div>
            </div>
          )}

          {loginError && (
            <div className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold animate-fade-in">
              <X size={18} className="flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-field-textMuted mb-2">Email Address</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full bg-field-card border border-[#443535] text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:border-field-gold transition-colors placeholder-gray-600"
                  placeholder="Enter email address"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setLoginError(null); }}
                />
                <div className="absolute right-3 top-3 text-field-gold">
                   <Users size={20} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-field-textMuted mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-field-card border border-[#443535] text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:border-field-gold transition-colors placeholder-gray-600"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={e => { setLoginPassword(e.target.value); setLoginError(null); }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-field-textMuted hover:text-white"
                >
                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-field-gold hover:bg-field-goldHover text-black font-bold py-3 rounded-lg shadow-lg shadow-field-gold/20 transition-all mt-4"
            >
              LOG IN
            </button>
          </form>

          {/* Authorized Registered Profiles Notice */}
          <div className="mt-8 p-4 rounded-xl border border-[#3A2E2E] bg-[#1A1515] text-xs space-y-2">
             <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
               <span>Registered Access Profiles</span>
               <span className="text-field-gold font-bold">2 Active</span>
             </div>
             <div className="grid grid-cols-2 gap-3 pt-2">
                <div 
                  onClick={() => { setLoginEmail('nipun@company.com'); setLoginPassword('admin'); setLoginError(null); }}
                  className="p-2.5 rounded-lg border border-[#3A2E2E] bg-[#2D2424] hover:border-field-gold/60 cursor-pointer transition-all"
                >
                  <p className="font-bold text-white text-xs">Nipun Tantia</p>
                  <p className="text-[10px] text-field-gold font-semibold uppercase">Admin Profile</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">nipun@company.com</p>
                </div>

                <div 
                  onClick={() => { setLoginEmail('meera@maharajacrm.com'); setLoginPassword('Amanpreet@93'); setLoginError(null); }}
                  className="p-2.5 rounded-lg border border-[#3A2E2E] bg-[#2D2424] hover:border-field-gold/60 cursor-pointer transition-all"
                >
                  <p className="font-bold text-white text-xs">Amanpreet</p>
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase">Staff Profile</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">meera@maharajacrm.com</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Navigation Item Helper for Sidebar (Desktop)
  const NavItem = ({ view, icon: Icon, label, badge }: { view: View; icon: any; label: string; badge?: number }) => (
    <button
      onClick={() => {
        navigateTo(view);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
        currentView === view 
          ? 'bg-field-gold/10 text-field-gold border-r-2 border-field-gold' 
          : 'text-field-textMuted hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {badge ? (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="min-h-screen bg-field-bg text-field-text flex flex-col md:flex-row">
      
      {/* Desktop Sidebar */}
      <aside className={`
        hidden md:flex flex-col
        fixed inset-y-0 left-0 z-20 w-64 bg-field-card border-r border-[#3A2E2E]
      `}>
        <div className="p-6 border-b border-[#3A2E2E]">
          <h1 className="text-xl font-bold text-field-gold flex items-center gap-2">
            <HardHat className="w-6 h-6 text-field-gold" />
            FieldTrack
          </h1>
        </div>

        <div className="p-4 flex-1">
          <div 
            onClick={() => navigateTo('profile')}
            className="flex items-center space-x-3 mb-6 p-3 bg-[#1A1515] hover:bg-[#251e1e] rounded-xl border border-[#3A2E2E] hover:border-field-gold/40 cursor-pointer transition-all group"
            title="Click to view and edit profile"
          >
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-field-gold object-cover group-hover:scale-105 transition-transform" />
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold truncate text-white group-hover:text-field-gold transition-colors">
                {currentUser.role === 'admin' ? `${currentUser.name} (Admin)` : currentUser.name}
              </p>
              <p className="text-xs text-field-gold uppercase tracking-wider text-[10px]">
                {currentUser.role === 'admin' ? 'Admin Level' : 'Staff Member'}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-500 group-hover:text-field-gold transition-colors" />
          </div>
          
          {/* Connectivity Status (Mock) */}
          <div className="mb-6 px-1">
             <button 
               onClick={() => setIsOnline(!isOnline)}
               className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-bold transition-all ${isOnline ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
             >
                <div className="flex items-center gap-2">
                   {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                   {isOnline ? 'Online' : 'Offline Mode'}
                </div>
                {isSyncing && <RefreshCw size={14} className="animate-spin text-field-gold"/>}
             </button>
             {pendingSyncCount > 0 && (
                <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
                   <span>Pending Sync:</span>
                   <span className="text-field-gold font-bold">{pendingSyncCount} items</span>
                </div>
             )}
          </div>

          {/* Theme Mode Quick Switcher */}
          <div className="mb-4 px-1">
             <button 
               onClick={cycleTheme}
               className="w-full flex items-center justify-between p-2 rounded-lg border border-[#3A2E2E] bg-[#1A1515] hover:border-field-gold/40 text-xs font-bold transition-all text-gray-300"
               title="Click to toggle theme mode anytime"
             >
                <span className="text-[10px] uppercase text-gray-500 tracking-wider">Display Theme:</span>
                <span className="text-field-gold font-bold flex items-center gap-1.5">
                  {currentUser.themePreference === 'light' ? '☀️ Light Mode' : currentUser.themePreference === 'high-contrast' ? '🔆 Outdoor Sun' : '🌙 Dark Mode'}
                </span>
             </button>
          </div>

          <nav className="space-y-1">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="upload" icon={Camera} label="Capture Upload" />
            <NavItem view="gallery" icon={ImageIcon} label="Photo Gallery" />
            <NavItem view="followups" icon={CalendarCheck} label="Follow-ups" />
            <NavItem view="pending" icon={AlertCircleIcon} label="Pending Review" badge={pendingCount > 0 ? pendingCount : undefined} />
            {currentUser.role === 'admin' && (
              <NavItem view="admin" icon={Users} label="Admin Panel" />
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-[#3A2E2E]">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-[#1A1515] border-b border-[#3A2E2E] px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <HardHat size={22} className="text-field-gold" />
          <span className="font-bold text-white text-base tracking-wide">FieldTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={cycleTheme}
            className="px-2.5 py-1 rounded-lg border border-[#3A2E2E] bg-[#2D2424] text-[11px] font-bold text-field-gold flex items-center gap-1"
          >
            {currentUser.themePreference === 'light' ? '☀️ Light' : currentUser.themePreference === 'high-contrast' ? '🔆 Sun Mode' : '🌙 Dark'}
          </button>
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`} title={isOnline ? 'Online' : 'Offline'}></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 overflow-y-auto h-[calc(100vh-80px)] md:h-screen p-0 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView 
              user={currentUser} 
              photos={photos} 
              followUps={followUps} 
              onChangeView={navigateTo}
              onToggleFollowUpStatus={toggleFollowUpStatus}
            />
          )}
          {currentView === 'upload' && (
            <div className="p-4 md:p-0">
              <UploadView 
                user={currentUser} 
                isOnline={isOnline}
                onUpload={(p) => {
                  // When uploading raw, set status to pending_sync if offline
                  const finalPhoto = { ...p, syncStatus: (isOnline ? 'synced' : 'pending') as SyncStatus };
                  addPhoto(finalPhoto);
                  setTimeout(() => navigateTo('pending'), 1500);
                }} 
                onViewPending={() => navigateTo('pending')}
              />
            </div>
          )}
          {currentView === 'pending' && (
             <div className="p-4 md:p-0">
              <PendingReviewsView 
                user={currentUser} 
                photos={photos} 
                isOnline={isOnline}
                leadSources={leadSources}
                personTypes={personTypes}
                constructionStages={constructionStages}
                onUpdatePhoto={updatePhoto}
                onDeletePhoto={deletePhoto}
                onAddFollowUp={addFollowUp}
                onBack={() => navigateTo('dashboard')}
              />
            </div>
          )}
          {currentView === 'gallery' && (
             <div className="p-4 md:p-0">
              <GalleryView 
                user={currentUser} 
                photos={photos} 
                initialDateFilter={viewParams.dateFilter}
                onExport={handleExportData}
                onBack={() => navigateTo('dashboard')}
              />
            </div>
          )}
          {currentView === 'followups' && (
             <div className="p-4 md:p-0">
               <FollowUpsView 
                 user={currentUser}
                 photos={photos}
                 followUps={followUps}
                 initialTab={viewParams.tab}
                 onToggleStatus={toggleFollowUpStatus}
                 onReschedule={handleRescheduleFollowUp}
                 onBack={() => navigateTo('dashboard')}
               />
             </div>
          )}
          {currentView === 'admin' && currentUser.role === 'admin' && (
             <div className="p-4 md:p-0">
               <AdminPanelView 
                 photos={photos} 
                 followUps={followUps}
                 leadSources={leadSources}
                 onUpdateLeadSources={(sources) => {
                   setLeadSources(sources);
                   saveAppSettingsToFirestore({ leadSources: sources });
                 }}
                 personTypes={personTypes}
                 onUpdatePersonTypes={(types) => {
                   setPersonTypes(types);
                   saveAppSettingsToFirestore({ personTypes: types });
                 }}
                 constructionStages={constructionStages}
                 onUpdateConstructionStages={(stages) => {
                   setConstructionStages(stages);
                   saveAppSettingsToFirestore({ constructionStages: stages });
                 }}
                 onUpdatePhoto={updatePhoto}
                 onDeletePhoto={deletePhoto}
                 recycleBin={recycleBin}
                 onRestoreFromRecycleBin={restoreFromRecycleBin}
                 onPermanentlyDeleteFromRecycleBin={permanentlyDeleteFromRecycleBin}
                 onEmptyRecycleBin={emptyRecycleBin}
                 onUpdateTeamMembers={handleUpdateTeamMembers}
               />
             </div>
          )}
          {/* Profile View */}
          {currentView === 'profile' && (
             <ProfileView 
               user={currentUser}
               onUpdateUser={handleUpdateUser}
               onLogout={handleLogout}
               onBack={() => navigateTo('dashboard')}
             />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation (Image 1 Style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1515] border-t border-[#3A2E2E] px-6 py-2 pb-6 flex justify-between items-center z-30">
        <button 
          onClick={() => navigateTo('gallery')}
          className={`flex flex-col items-center gap-1 ${currentView === 'gallery' ? 'text-white' : 'text-gray-500'}`}
        >
          <div className={`p-2 rounded-xl ${currentView === 'gallery' ? 'bg-[#2D2424]' : ''}`}>
             <ImageIcon size={24} />
          </div>
          <span className="text-[10px] font-medium">Gallery</span>
        </button>

        <button 
          onClick={() => navigateTo('dashboard')} // Dashboard acts as Home
          className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-white' : 'text-gray-500'}`}
        >
           <div className={`p-2 rounded-xl ${currentView === 'dashboard' ? 'bg-[#2D2424]' : ''}`}>
             <LayoutDashboard size={24} />
          </div>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* Floating Action Button for Upload */}
        <button 
           onClick={() => navigateTo('upload')}
           className="relative -top-5"
        >
           <div className="w-16 h-16 rounded-full bg-field-gold text-[#1A1515] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(217,144,38,0.4)] border-4 border-[#1A1515]">
              <Camera size={28} />
              <span className="text-[10px] font-bold mt-0.5">Upload</span>
           </div>
        </button>

        <button 
          onClick={() => navigateTo('pending')}
          className={`flex flex-col items-center gap-1 ${currentView === 'pending' ? 'text-white' : 'text-gray-500'}`}
        >
          <div className="relative">
             <div className={`p-2 rounded-xl ${currentView === 'pending' ? 'bg-[#2D2424]' : ''}`}>
               <AlertCircleIcon size={24} />
             </div>
             {pendingCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1A1515]"></span>}
          </div>
          <span className="text-[10px] font-medium">Pending</span>
        </button>

        <button 
          onClick={() => navigateTo('profile')}
          className={`flex flex-col items-center gap-1 ${currentView === 'profile' ? 'text-white' : 'text-gray-500'}`}
        >
           <div className={`p-2 rounded-xl ${currentView === 'profile' ? 'bg-[#2D2424]' : ''}`}>
             <UserIcon size={24} />
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
}

// Helper icon component
function AlertCircleIcon(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={props.size} height={props.size} 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round" 
      className={props.className}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );
}
