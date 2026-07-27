import React, { useEffect } from 'react';
import { useAppStore, initializeFirestoreSync } from './stores/useAppStore';
import LoginScreen from './features/auth/components/LoginScreen';
import AppLayout from './features/navigation/components/AppLayout';
import ViewRouter from './features/navigation/components/ViewRouter';
import { teamRepository } from './repositories/teamRepository';
import { settingsRepository } from './repositories/settingsRepository';
import { useVersionCheck } from './system/useVersionCheck';
import { useNightlyLogout } from './system/useNightlyLogout';
import { useThemeManager } from './system/useThemeManager';
import { useGpsSideEffects } from './system/useGpsSideEffects';

export default function App() {
  const currentUser = useAppStore(s => s.currentUser);
  const setCurrentUser = useAppStore(s => s.setCurrentUser);
  const handleUpdateUser = useAppStore(s => s.handleUpdateUser);
  const setLeadSources = useAppStore(s => s.setLeadSources);
  const setPersonTypes = useAppStore(s => s.setPersonTypes);
  const setConstructionStages = useAppStore(s => s.setConstructionStages);

  // 1. System level hooks
  useVersionCheck();
  useNightlyLogout();
  useThemeManager();
  useGpsSideEffects();

  // 2. Firestore Sync Bootstrap
  useEffect(() => {
    const unsubStore = initializeFirestoreSync();

    const unsubTeam = teamRepository.subscribe((realtimeTeam) => {
      if (realtimeTeam && realtimeTeam.length > 0) {
        localStorage.setItem('fieldops_team_members', JSON.stringify(realtimeTeam));
        if (currentUser) {
          const match = realtimeTeam.find(m => m.id === currentUser.id || m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
          if (match && (match.avatar !== currentUser.avatar || match.name !== currentUser.name || match.role !== currentUser.role)) {
            setCurrentUser(match);
          }
        }
      }
    });

    const unsubSettings = settingsRepository.subscribe((realtimeSettings) => {
      if (realtimeSettings) {
        if (realtimeSettings.leadSources) setLeadSources(realtimeSettings.leadSources);
        if (realtimeSettings.personTypes) setPersonTypes(realtimeSettings.personTypes);
        if (realtimeSettings.constructionStages) setConstructionStages(realtimeSettings.constructionStages);
      }
    });

    return () => {
      unsubStore();
      unsubTeam();
      unsubSettings();
    };
  }, [currentUser?.id]);

  // 3. Ensure lastLoginTime is recorded on active session
  useEffect(() => {
    if (currentUser) {
      const nowStr = new Date().toISOString();
      const todayStr = nowStr.split('T')[0];
      const lastLoginDay = (currentUser.lastLoginTime || '').split('T')[0];

      if (!currentUser.lastLoginTime || lastLoginDay !== todayStr) {
        const updated = { ...currentUser, lastLoginTime: nowStr };
        handleUpdateUser(updated);
      }
    }
  }, [currentUser?.id]);

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <AppLayout>
      <ViewRouter />
    </AppLayout>
  );
}
