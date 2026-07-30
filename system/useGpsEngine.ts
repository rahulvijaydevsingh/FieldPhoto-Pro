import { useState, useEffect, useRef, useCallback } from 'react';
import { StaffLocation } from '../types';
import { getCityNameAsync, generatePlusCodeWithCityAsync, getDeviceModelInfo, calculateDistanceMeters } from '../utils/locationUtils';
import { addLocalBreadcrumb } from '../utils/routeLogger';
import { fallbackGeoEngine } from './geolocation/FallbackGeolocationEngine';

interface UseGpsEngineOptions {
  userId?: string;
  userName?: string;
  enabled?: boolean;
}

export function useGpsEngine({ userId, userName, enabled = true }: UseGpsEngineOptions) {
  const [gpsPermissionState, setGpsPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [lastLocation, setLastLocation] = useState<StaffLocation | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const liveTimerRef = useRef<any>(null);
  const lastRecordedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSubscribedRef = useRef(true);

  const updateLocation = useCallback(async (
    pos: GeolocationPosition | { coords: { latitude: number; longitude: number; accuracy: number } },
    isExplicitRequest = false
  ) => {
    if (!isSubscribedRef.current) return;
    
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;

    // Spatial filter: if stationary (< 15 meters movement) and not explicit request, skip duplicate ping
    if (lastRecordedCoordsRef.current && !isExplicitRequest) {
      const dist = calculateDistanceMeters(
        lastRecordedCoordsRef.current.lat,
        lastRecordedCoordsRef.current.lng,
        lat,
        lng
      );
      if (dist < 15) {
        return; // Filter out GPS noise / stationary jitter
      }
    }

    lastRecordedCoordsRef.current = { lat, lng };

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
      deviceInfo: getDeviceModelInfo(),
    };

    setGpsPermissionState('granted');
    setLastLocation(locationRecord);

    // Queue local breadcrumb (5-minute batch flusher handles DB sync)
    if (userId) {
      const isMocked = Boolean((pos as any)?.coords?.isMocked);
      const isFallback = Boolean((pos as any)?.isFallback);
      addLocalBreadcrumb({
        lat,
        lng,
        accuracy,
        timestamp: locationRecord.timestamp,
        plusCode,
        deviceInfo: locationRecord.deviceInfo,
        userId,
        userName: userName || 'Staff Member',
        sourceEvent: (pos as any)?.isInitial ? 'APP_LOAD' : 'ROUTE_TRACKER',
        locationProvider: isFallback ? 'WIFI_GOOGLE' : 'GPS_HARDWARE',
        isMocked,
      });
    }
  }, [userId, userName]);

  const handleError = useCallback(async (err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setGpsPermissionState('denied');
      return;
    }
    
    // Trigger Strategy Pattern Cell/Wi-Fi Fallback Engine
    try {
      const fallbackResult = await fallbackGeoEngine.getPosition();
      updateLocation({
        coords: {
          latitude: fallbackResult.lat,
          longitude: fallbackResult.lng,
          accuracy: fallbackResult.accuracy,
        }
      }, true);
    } catch (fallbackErr) {
      console.warn('Geolocation fallback chain error:', fallbackErr);
    }
  }, [updateLocation]);

  const stopLiveLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    setIsLiveTracking(false);
  }, []);

  const requestLiveLocation = useCallback((durationMs = 300000) => { // Default 5 minutes max
    if (!navigator.geolocation) return;

    stopLiveLocation(); // Clear any existing watch

    setIsLiveTracking(true);

    // Trigger immediate location fix
    navigator.geolocation.getCurrentPosition(
      (pos) => updateLocation(pos, true),
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Start high-accuracy watchPosition for requested session
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => updateLocation(pos, false),
      handleError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    // Auto-stop tracking after durationMs (5 minutes)
    liveTimerRef.current = setTimeout(() => {
      stopLiveLocation();
    }, durationMs);
  }, [updateLocation, handleError, stopLiveLocation]);

  useEffect(() => {
    if (!enabled || !userId) return;
    
    if (!navigator.geolocation) {
      setGpsPermissionState('unsupported');
      return;
    }

    isSubscribedRef.current = true;

    // Single location snapshot on app load (No continuous watchPosition automatically)
    navigator.geolocation.getCurrentPosition(
      (pos) => updateLocation(pos, true),
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      isSubscribedRef.current = false;
      stopLiveLocation();
    };
  }, [enabled, userId, updateLocation, handleError, stopLiveLocation]);

  return {
    gpsPermissionState,
    lastLocation,
    isLiveTracking,
    requestLiveLocation,
    stopLiveLocation,
  };
}

