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

  // Periodic Online Presence Heartbeat
  useEffect(() => {
    if (!currentUser) return;

    const updatePresence = () => {
      const nowIso = new Date().toISOString();
      teamRepository.save({
        ...currentUser,
        isOnline: true,
        lastSeenTime: nowIso,
      });
      lastHeartbeatRef.current = Date.now();
    };

    // Immediate initial presence update
    updatePresence();

    // Periodic presence heartbeat every 2 minutes
    const interval = setInterval(updatePresence, 120000);

    // Clean exit on unload: one-off write for offline status
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

