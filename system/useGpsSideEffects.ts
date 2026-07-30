import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useGpsEngine } from './useGpsEngine';
import { teamRepository } from '../repositories/teamRepository';
import { calculateDistanceMeters } from '../utils/locationUtils';

export function useGpsSideEffects() {
  const currentUser = useAppStore(s => s.currentUser);
  const setCurrentUser = useAppStore(s => s.setCurrentUser);
  const lastHeartbeatRef = useRef<number>(0);
  const lastSavedLocRef = useRef<{ lat: number; lng: number } | null>(null);

  const { lastLocation: liveLocation } = useGpsEngine({
    userId: currentUser?.id,
    userName: currentUser?.name,
    enabled: !!currentUser,
  });

  // Heartbeat & Online Presence Loop (Synced every 2 minutes)
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

    // Periodic presence heartbeat every 2 minutes (120,000ms)
    const interval = setInterval(sendHeartbeat, 120000);

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

  // Sync state & update team member location when location genuinely moves (> 15m)
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

    // Only update teamRepository if location moved > 15m or no location was recorded yet
    let movedSignificantly = true;
    if (lastSavedLocRef.current && liveLocation.lat !== undefined && liveLocation.lng !== undefined) {
      const dist = calculateDistanceMeters(
        lastSavedLocRef.current.lat,
        lastSavedLocRef.current.lng,
        liveLocation.lat,
        liveLocation.lng
      );
      if (dist < 15) {
        movedSignificantly = false;
      }
    }

    if (movedSignificantly && liveLocation.lat !== undefined && liveLocation.lng !== undefined) {
      lastSavedLocRef.current = { lat: liveLocation.lat, lng: liveLocation.lng };
      teamRepository.save(updatedUser);
    }
  }, [liveLocation, currentUser?.id]);
}

