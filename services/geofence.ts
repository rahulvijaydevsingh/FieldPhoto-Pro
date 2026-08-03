// Geofence Engine & Storage Service
// Handles WKT geometry, bounding box pre-checks, point-in-polygon/circle/line checks, and Firestore I/O

import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, isFirestoreQuotaExceeded } from './firebase';
import { Geofence, GeofenceEvent } from '../types';
import { haversineMeters, distanceToLineMeters, latitudeDeltaForMeters, longitudeDeltaForMeters } from '../utils/distance';

// ─── 1. CIRCLE SHAPE ───
export class GeofenceCircleShape {
  constructor(public lat: number, public lng: number, public radiusMeters: number) {}

  contains(lat: number, lng: number): boolean {
    return haversineMeters(this.lat, this.lng, lat, lng) <= this.radiusMeters;
  }

  toWkt(): string {
    return `CIRCLE (${this.lat} ${this.lng}, ${this.radiusMeters})`;
  }

  static fromWkt(wkt: string): GeofenceCircleShape | null {
    try {
      const match = wkt.match(/^CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/i);
      if (!match) return null;
      return new GeofenceCircleShape(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    } catch {
      return null;
    }
  }
}

// ─── 2. POLYGON SHAPE (Ray Casting with Pre-calculated Line Equations & Bounding Box) ───
export class GeofencePolygonShape {
  public coordinates: Array<{ lat: number; lng: number }>;
  public constant: number[];
  public multiple: number[];
  public minLat: number;
  public maxLat: number;
  public minLng: number;
  public maxLng: number;

  constructor(coordinates: Array<{ lat: number; lng: number }>) {
    this.coordinates = coordinates;
    const n = coordinates.length;
    this.constant = new Array(n);
    this.multiple = new Array(n);

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    coordinates.forEach(c => {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lng < minLng) minLng = c.lng;
      if (c.lng > maxLng) maxLng = c.lng;
    });
    this.minLat = minLat;
    this.maxLat = maxLat;
    this.minLng = minLng;
    this.maxLng = maxLng;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pI = coordinates[i];
      const pJ = coordinates[j];
      if (pI.lng === pJ.lng) {
        this.constant[i] = pI.lat;
        this.multiple[i] = 0;
      } else {
        this.constant[i] = pI.lat - (pI.lng * pJ.lat) / (pJ.lng - pI.lng) + (pI.lng * pI.lat) / (pJ.lng - pI.lng);
        this.multiple[i] = (pJ.lat - pI.lat) / (pJ.lng - pI.lng);
      }
    }
  }

  contains(lat: number, lng: number): boolean {
    // Fast bounding box rejection
    if (lat < this.minLat || lat > this.maxLat || lng < this.minLng || lng > this.maxLng) {
      return false;
    }

    let oddNodes = false;
    const n = this.coordinates.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pI = this.coordinates[i];
      const pJ = this.coordinates[j];
      const crosses = (pI.lng < lng && pJ.lng >= lng) || (pJ.lng < lng && pI.lng >= lng);
      if (crosses) {
        oddNodes = oddNodes !== (lng * this.multiple[i] + this.constant[i] < lat);
      }
    }
    return oddNodes;
  }

  toWkt(): string {
    const pts = this.coordinates.map(c => `${c.lat} ${c.lng}`).join(', ');
    return `POLYGON ((${pts}))`;
  }

  static fromWkt(wkt: string): GeofencePolygonShape | null {
    try {
      const match = wkt.match(/^POLYGON\s*\(\(\s*([-\d.,\s]+)\s*\)\)$/i);
      if (!match) return null;
      const coords = match[1].split(',').map(p => {
        const parts = p.trim().split(/\s+/).map(Number);
        return { lat: parts[0], lng: parts[1] };
      }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));
      if (coords.length < 3) return null;
      return new GeofencePolygonShape(coords);
    } catch {
      return null;
    }
  }
}

// ─── 3. POLYLINE SHAPE (Corridor / Highway Fence) ───
export class GeofencePolylineShape {
  public coordinates: Array<{ lat: number; lng: number }>;
  public toleranceMeters: number;

  constructor(coordinates: Array<{ lat: number; lng: number }>, toleranceMeters = 25) {
    this.coordinates = coordinates;
    this.toleranceMeters = toleranceMeters;
  }

  contains(lat: number, lng: number): boolean {
    for (let i = 1; i < this.coordinates.length; i++) {
      const p1 = this.coordinates[i - 1];
      const p2 = this.coordinates[i];
      const dist = distanceToLineMeters(lat, lng, p1.lat, p1.lng, p2.lat, p2.lng);
      if (dist <= this.toleranceMeters) {
        return true;
      }
    }
    return false;
  }

  toWkt(): string {
    const pts = this.coordinates.map(c => `${c.lat} ${c.lng}`).join(', ');
    return `LINESTRING (${pts})`;
  }

  static fromWkt(wkt: string, toleranceMeters = 25): GeofencePolylineShape | null {
    try {
      const match = wkt.match(/^LINESTRING\s*\(\s*([-\d.,\s]+)\s*\)$/i);
      if (!match) return null;
      const coords = match[1].split(',').map(p => {
        const parts = p.trim().split(/\s+/).map(Number);
        return { lat: parts[0], lng: parts[1] };
      }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));
      if (coords.length < 2) return null;
      return new GeofencePolylineShape(coords, toleranceMeters);
    } catch {
      return null;
    }
  }
}

// ─── 4. EVALUATION HELPER ───
export function geofenceContainsPoint(
  geofence: Geofence,
  lat: number,
  lng: number,
  altitude = 0
): boolean {
  if (!geofence || !geofence.active) return false;
  if (geofence.floor && altitude < geofence.floor) return false;
  if (geofence.ceiling && altitude > geofence.ceiling) return false;

  const wkt = geofence.wkt.trim();
  if (wkt.toUpperCase().startsWith('CIRCLE')) {
    const circle = GeofenceCircleShape.fromWkt(wkt);
    return circle ? circle.contains(lat, lng) : false;
  }
  if (wkt.toUpperCase().startsWith('POLYGON')) {
    const poly = GeofencePolygonShape.fromWkt(wkt);
    return poly ? poly.contains(lat, lng) : false;
  }
  if (wkt.toUpperCase().startsWith('LINESTRING')) {
    const line = GeofencePolylineShape.fromWkt(wkt, geofence.polylineDistance || 25);
    return line ? line.contains(lat, lng) : false;
  }
  return false;
}

// ─── 5. TRANSITION DETECTOR ───
export interface GeofenceTransition {
  geofenceId: string;
  type: 'enter' | 'exit';
}

export function detectGeofenceTransitions(
  previousIds: string[],
  currentIds: string[]
): GeofenceTransition[] {
  const prevSet = new Set(previousIds || []);
  const currSet = new Set(currentIds || []);
  const transitions: GeofenceTransition[] = [];

  for (const id of currSet) {
    if (!prevSet.has(id)) {
      transitions.push({ geofenceId: id, type: 'enter' });
    }
  }

  for (const id of prevSet) {
    if (!currSet.has(id)) {
      transitions.push({ geofenceId: id, type: 'exit' });
    }
  }

  return transitions;
}

// ─── 6. FIRESTORE PERSISTENCE & REAL-TIME LISTENERS ───

const GEOFENCES_COLLECTION = 'geofences';
const GEOFENCE_EVENTS_COLLECTION = 'geofence_events';
const LOCAL_GEOFENCES_KEY = 'fieldops_geofences_cache';
const LOCAL_EVENTS_KEY = 'fieldops_geofence_events_cache';

export function getCachedGeofences(): Geofence[] {
  try {
    const raw = localStorage.getItem(LOCAL_GEOFENCES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCachedGeofenceEvents(): GeofenceEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Subscribes to geofences in Firestore with local storage cache fallback
 */
export function subscribeGeofences(callback: (geofences: Geofence[]) => void): () => void {
  const initialCache = getCachedGeofences();
  if (initialCache.length > 0) {
    callback(initialCache);
  }

  if (isFirestoreQuotaExceeded()) return () => {};

  try {
    const q = query(collection(db, GEOFENCES_COLLECTION));
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Geofence[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as Geofence));
        localStorage.setItem(LOCAL_GEOFENCES_KEY, JSON.stringify(list));
        callback(list);
      },
      (err) => {
        handleFirestoreError('subscribeGeofences', err);
        if (unsub) unsub();
        callback(getCachedGeofences());
      }
    );
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Failed to subscribe to geofences', err);
    callback(getCachedGeofences());
    return () => {};
  }
}

/**
 * Subscribes to geofence enter/exit event feed (last 100 events)
 */
export function subscribeGeofenceEvents(callback: (events: GeofenceEvent[]) => void): () => void {
  const initialCache = getCachedGeofenceEvents();
  if (initialCache.length > 0) {
    callback(initialCache);
  }

  if (isFirestoreQuotaExceeded()) return () => {};

  try {
    const q = query(collection(db, GEOFENCE_EVENTS_COLLECTION), orderBy('timestamp', 'desc'), limit(100));
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      q,
      (snapshot) => {
        const events: GeofenceEvent[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as GeofenceEvent));
        localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
        callback(events);
      },
      (err) => {
        handleFirestoreError('subscribeGeofenceEvents', err);
        if (unsub) unsub();
        callback(getCachedGeofenceEvents());
      }
    );
    return unsub || (() => {});
  } catch (err) {
    handleFirestoreError('Failed to subscribe to geofence events', err);
    callback(getCachedGeofenceEvents());
    return () => {};
  }
}

/**
 * Saves or updates a geofence definition in Firestore & local cache
 */
export async function saveGeofenceToFirestore(geofence: Geofence): Promise<void> {
  // Update local cache immediately
  const localList = getCachedGeofences();
  const existingIdx = localList.findIndex(g => g.id === geofence.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = geofence;
  } else {
    localList.unshift(geofence);
  }
  localStorage.setItem(LOCAL_GEOFENCES_KEY, JSON.stringify(localList));

  if (isFirestoreQuotaExceeded()) return;

  try {
    await setDoc(doc(db, GEOFENCES_COLLECTION, geofence.id), {
      ...geofence,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError('saveGeofenceToFirestore', err);
  }
}

/**
 * Deletes a geofence definition
 */
export async function deleteGeofenceFromFirestore(geofenceId: string): Promise<void> {
  const localList = getCachedGeofences().filter(g => g.id !== geofenceId);
  localStorage.setItem(LOCAL_GEOFENCES_KEY, JSON.stringify(localList));

  if (isFirestoreQuotaExceeded()) return;

  try {
    await deleteDoc(doc(db, GEOFENCES_COLLECTION, geofenceId));
  } catch (err) {
    handleFirestoreError('deleteGeofenceFromFirestore', err);
  }
}

/**
 * Writes a geofence enter/exit event to Firestore & local cache
 */
export async function writeGeofenceEventToFirestore(event: Omit<GeofenceEvent, 'id'>): Promise<GeofenceEvent> {
  const newId = `gf_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullEvent: GeofenceEvent = {
    id: newId,
    ...event
  };

  // Update local event cache
  const localEvents = getCachedGeofenceEvents();
  localEvents.unshift(fullEvent);
  localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(localEvents.slice(0, 100)));

  // Persist geofence enter/exit event to Firestore
  if (!isFirestoreQuotaExceeded()) {
    try {
      await setDoc(doc(db, GEOFENCE_EVENTS_COLLECTION, fullEvent.id), {
        ...fullEvent,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError('writeGeofenceEventToFirestore', err);
    }
  }

  return fullEvent;
}
