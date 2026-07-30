import { OdometerReading } from '../types';
import { saveOdometerToFirestore, deleteOdometerFromFirestore } from '../services/firebase';

const STORAGE_KEY = 'fieldops_odometer_readings';

export function getLocalOdometerReadings(): OdometerReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Seed realistic default odometer logs for today
    const todayStr = new Date().toISOString().split('T')[0];
    const initialSamples: OdometerReading[] = [
      {
        id: 'odo_sample_1',
        userId: 'u2',
        userName: 'Amanpreet Singh',
        vehicleNumber: 'PB-10-AB-1234',
        readingType: 'start_day',
        readingKm: 42150.0,
        photoUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=400&auto=format&fit=crop&q=80',
        timestamp: `${todayStr}T08:30:00.000Z`,
        lat: 30.9010,
        lng: 75.8573,
        notes: 'Shift Start - Departure from Ludhiana Depot',
        verificationStatus: 'verified'
      },
      {
        id: 'odo_sample_2',
        userId: 'u2',
        userName: 'Amanpreet Singh',
        vehicleNumber: 'PB-10-AB-1234',
        readingType: 'inter_site',
        readingKm: 42188.5,
        photoUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&auto=format&fit=crop&q=80',
        timestamp: `${todayStr}T12:15:00.000Z`,
        lat: 30.9200,
        lng: 75.8300,
        notes: 'Arrived at Site B - Model Town Project',
        verificationStatus: 'verified'
      },
      {
        id: 'odo_sample_3',
        userId: 'u1',
        userName: 'Rajesh Kumar',
        vehicleNumber: 'PB-10-XY-9876',
        readingType: 'start_day',
        readingKm: 18520.0,
        photoUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=400&auto=format&fit=crop&q=80',
        timestamp: `${todayStr}T09:00:00.000Z`,
        lat: 30.8900,
        lng: 75.8600,
        notes: 'Morning inspection trip start',
        verificationStatus: 'verified'
      }
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSamples));
    return initialSamples;
  } catch (e) {
    console.error('Failed to parse odometer readings:', e);
    return [];
  }
}

export function saveOdometerReading(reading: Omit<OdometerReading, 'id' | 'timestamp'>): OdometerReading {
  const existing = getLocalOdometerReadings();
  const newRecord: OdometerReading = {
    ...reading,
    id: `odo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString()
  };

  const updated = [newRecord, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Async sync to Firestore (silently fallback if quota exceeded or offline)
  saveOdometerToFirestore(newRecord).catch(() => {});

  return newRecord;
}

export function calculateDailyTripKm(readings: OdometerReading[], userId: string, dateStr: string): {
  startKm?: number;
  endKm?: number;
  totalKm: number;
  readingsCount: number;
} {
  const userReadings = readings.filter(r => {
    const matchUser = !userId || userId === 'all' || r.userId === userId;
    const rDate = new Date(r.timestamp).toISOString().split('T')[0];
    return matchUser && rDate === dateStr;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (userReadings.length === 0) {
    return { totalKm: 0, readingsCount: 0 };
  }

  const startObj = userReadings.find(r => r.readingType === 'start_day') || userReadings[0];
  const endObj = [...userReadings].reverse().find(r => r.readingType === 'end_day') || userReadings[userReadings.length - 1];

  const startKm = startObj ? startObj.readingKm : undefined;
  const endKm = endObj && endObj !== startObj ? endObj.readingKm : undefined;
  const totalKm = (startKm !== undefined && endKm !== undefined && endKm >= startKm) ? (endKm - startKm) : 0;

  return {
    startKm,
    endKm,
    totalKm: Math.max(0, totalKm),
    readingsCount: userReadings.length
  };
}

export function updateOdometerStatus(
  id: string,
  status: 'verified' | 'flagged' | 'pending',
  adminName?: string
): void {
  const existing = getLocalOdometerReadings();
  let modifiedItem: OdometerReading | null = null;
  const updated = existing.map(r => {
    if (r.id === id) {
      modifiedItem = {
        ...r,
        verificationStatus: status,
        verifiedBy: adminName,
        verifiedAt: new Date().toISOString()
      };
      return modifiedItem;
    }
    return r;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  if (modifiedItem) {
    saveOdometerToFirestore(modifiedItem).catch(() => {});
  }
}

export function getUserSavedVehicleNumber(userId: string): string {
  try {
    const saved = localStorage.getItem(`fieldops_saved_vehicle_${userId}`);
    if (saved) return saved;

    const readings = getLocalOdometerReadings();
    const userReading = readings.find(r => r.userId === userId && r.vehicleNumber);
    if (userReading) return userReading.vehicleNumber;

    return 'PB-10-AB-1234';
  } catch {
    return 'PB-10-AB-1234';
  }
}

export function saveUserSavedVehicleNumber(userId: string, vehicleNumber: string): void {
  try {
    if (vehicleNumber && vehicleNumber.trim()) {
      localStorage.setItem(`fieldops_saved_vehicle_${userId}`, vehicleNumber.trim().toUpperCase());
    }
  } catch {}
}

export function deleteOdometerReading(id: string): void {
  const existing = getLocalOdometerReadings();
  const updated = existing.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  deleteOdometerFromFirestore(id).catch(() => {});
}
