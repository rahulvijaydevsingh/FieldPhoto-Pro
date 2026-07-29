import { useState, useEffect, useRef, useCallback } from 'react';
import { StaffLocation } from '../types';
import { getCityNameAsync, generatePlusCodeWithCityAsync, getDeviceModelInfo } from '../utils/locationUtils';
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
  const watchIdRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(true);

  const updateLocation = useCallback(async (pos: GeolocationPosition | { coords: { latitude: number; longitude: number; accuracy: number } }) => {
    if (!isSubscribedRef.current) return;
    
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
      deviceInfo: getDeviceModelInfo(),
    };

    setGpsPermissionState('granted');
    setLastLocation(locationRecord);

    // Local breadcrumb (device & cloud-first)
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
      });
    } catch (fallbackErr) {
      console.warn('Geolocation fallback chain error:', fallbackErr);
    }
  }, [updateLocation]);

  useEffect(() => {
    if (!enabled || !userId) return;
    
    if (!navigator.geolocation) {
      setGpsPermissionState('unsupported');
      return;
    }

    isSubscribedRef.current = true;

    // Immediate high-accuracy request
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    return () => {
      isSubscribedRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, userId, updateLocation, handleError]);

  return { gpsPermissionState, lastLocation };
}
