import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useGpsEngine } from './useGpsEngine';
import { teamRepository } from '../repositories/teamRepository';
import { addLocalBreadcrumb } from '../utils/routeLogger';

export function useGpsSideEffects() {
  const currentUser = useAppStore(s => s.currentUser);
  const setCurrentUser = useAppStore(s => s.setCurrentUser);
  const lastHeartbeatRef = useRef<number>(0);

  const { lastLocation: liveLocation } = useGpsEngine({
    userId: currentUser?.id,
    userName: currentUser?.name,
    enabled: !!currentUser,
  });

  // Heartbeat & Online Presence Loop
  useEffect(() => {
    if (!currentUser) return;

    const sendHeartbeat = () => {
      const nowIso = new Date().toISOString();
      const updated = {
        ...currentUser,
        lastSeenTime: nowIso,
        isOnline: true,
      };
      teamRepository.save(updated);
      lastHeartbeatRef.current = Date.now();
    };

    // Immediate initial heartbeat on session load/online
    sendHeartbeat();

    // Periodic heartbeat every 15 seconds
    const interval = setInterval(sendHeartbeat, 15000);

    // Clean exit on unload
    const handleUnload = () => {
      if (currentUser) {
        teamRepository.save({
          ...currentUser,
          isOnline: false,
          lastLogoutTime: new Date().toISOString(),
        });
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentUser?.id]);

  // Live Location sync & Breadcrumb Logging
  useEffect(() => {
    if (!currentUser || !liveLocation) return;

    const nowIso = new Date().toISOString();
    const updatedUser = {
      ...currentUser,
      lastLocation: liveLocation,
      lastSeenTime: nowIso,
      isOnline: true,
    };
    setCurrentUser(updatedUser);

    // Save location & presence to repository
    teamRepository.save(updatedUser);

    // Ensure location breadcrumb is logged whenever staff moves/uses app
    if (liveLocation.lat !== undefined && liveLocation.lng !== undefined) {
      addLocalBreadcrumb({
        lat: liveLocation.lat,
        lng: liveLocation.lng,
        accuracy: liveLocation.accuracy,
        timestamp: liveLocation.timestamp || nowIso,
        plusCode: liveLocation.plusCode,
        deviceInfo: liveLocation.deviceInfo,
        userId: currentUser.id,
        userName: currentUser.name,
      });
    }
  }, [liveLocation, currentUser?.id]);
}
