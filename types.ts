
export type Role = 'admin' | 'staff';

export const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='%232D2424' stroke='%23D99026' stroke-width='1.5'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>";

export type View = 'dashboard' | 'upload' | 'gallery' | 'pending' | 'admin' | 'profile' | 'followups' | 'odometer' | 'route_tracker' | 'analytics' | 'escalations';

export interface LeadEscalationItem {
  id: string;
  photoId: string;
  clientName: string;
  siteName: string;
  assignedStaffId: string;
  assignedStaffName: string;
  followUpDueDate: string;
  hoursOverdue: number;
  urgencyLevel: 'warning' | 'critical' | 'severe';
  status: 'pending_action' | 'reassigned' | 'resolved';
  reassignedToId?: string;
  reassignedToName?: string;
  escalatedAt: string;
}

export interface KPIStats {
  totalVisits: number;
  verifiedGpsVisits: number;
  conversionRate: number;
  overdueFollowUps: number;
  activeFieldStaffCount: number;
  totalGeofenceCrossings: number;
}

export type Priority = 'High' | 'Medium' | 'Low';

// Updated to match CRM Status Enum
export type PhotoStatus = 'new' | 'in-progress' | 'quoted' | 'won' | 'lost' | 'on-hold';

export type SyncStatus = 'synced' | 'pending' | 'error';

export type FollowUpType = 'Phone Call' | 'Site Visit' | 'WhatsApp' | 'Email' | 'Meeting' | 'Quotation' | 'Nurture' | 'None';

export type FollowUpStatus = 'pending' | 'completed' | 'overdue';

export type GeofenceShapeType = 'circle' | 'polygon' | 'polyline';

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  wkt: string; // e.g. CIRCLE (30.901 75.857, 100) or POLYGON ((...))
  type: GeofenceShapeType;
  color?: string;
  calendarId?: string;
  assignedUserIds?: string[];
  floor?: number;
  ceiling?: number;
  polylineDistance?: number;
  createdBy: string;
  createdAt: string;
  active: boolean;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  geofenceName?: string;
  userId: string;
  userName: string;
  type: 'enter' | 'exit';
  lat: number;
  lng: number;
  plusCode?: string;
  timestamp: string;
  breadcrumbId?: string;
}

export type AttendanceMode = 'random' | 'fixed';
export type VerificationMethod = 'gps' | 'photo' | 'both';

export interface AttendanceSettings {
  enabled: boolean;
  mode: AttendanceMode;
  shiftStart: string; // e.g. "10:00"
  shiftEnd: string; // e.g. "19:00"
  checksPerDay: number; // e.g. 3
  fixedCheckTimes: string[]; // e.g. ["10:30", "14:30", "18:00"]
  verificationMethod: VerificationMethod;
  soundAlertEnabled: boolean;
}

export interface StaffAttendanceConfig {
  userId: string;
  userName?: string;
  useGlobalDefaults: boolean;
  customSettings?: Partial<AttendanceSettings>;
}

export interface AttendanceSlot {
  slot: 1 | 2 | 3 | number;
  scheduledAt: number; // unix ms
  markedAt?: number; // unix ms
  status: 'pending' | 'marked' | 'missed';
  lat?: number;
  lng?: number;
  plusCode?: string;
  accuracy?: number;
  deviceInfo?: string;
  city?: string;
  rejectReason?: string;
  photoUrl?: string;
}

export interface OdometerReading {
  id: string;
  userId: string;
  userName: string;
  vehicleNumber: string;
  readingType: 'start_day' | 'end_day' | 'inter_site';
  readingKm: number;
  photoUrl?: string;
  timestamp: string;
  lat?: number;
  lng?: number;
  notes?: string;
  verificationStatus?: 'pending' | 'verified' | 'flagged';
  ocrReadingKm?: number;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface AttendanceDay {
  userId: string;
  userName: string;
  date: string; // 'YYYY-MM-DD'
  slots: AttendanceSlot[];
  generatedAt: number;
}

export interface StaffLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string; // ISO string when location was recorded
  address?: string; // e.g. "Mohali, Punjab"
  plusCode?: string;
  isLive?: boolean;
  deviceInfo?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  designation?: string;
  avatar: string;
  lastLocation?: StaffLocation;
  lastLoginTime?: string;
  lastLogoutTime?: string;
  lastSeenTime?: string;
  isOnline?: boolean;
  themePreference?: 'dark' | 'light' | 'high-contrast';
}

export interface Professional {
  id: string;
  name: string;
  firmName: string;
  type: 'Architect' | 'Builder' | 'Contractor' | 'Interior Designer';
  phone?: string;
  email?: string;
}

// Updated to match Backend `additional_contacts` JSON Schema
export interface PersonMet {
  id: string;
  designation: string; // Replaces 'type'
  name: string;
  phone: string;
  email: string;
  alternatePhone: string; // Replaces 'altPhone'
  firmName: string; 
}

export interface FollowUp {
  id: string;
  photoId: string;
  assignedToId: string;
  type: FollowUpType;
  date: string; // ISO Date
  notes: string;
  status: FollowUpStatus;
  isOverdue?: boolean;
}

export interface Photo {
  id: string;
  url: string; // Single Photo URL (Primary)
  fileName: string;
  uploadDate: string; // ISO
  captureDate: string; // ISO
  uploaderId: string;
  uploaderName: string;
  staffMember?: string;
  status: PhotoStatus;
  syncStatus?: SyncStatus;
  
  // Metadata
  siteName?: string;
  
  // Location Strategy: 
  // App uses lat/lng for internal maps. 
  // App converts lat/lng -> plusCode for CRM Sync.
  site_lat?: number;
  site_lng?: number;
  gps?: { lat: number; lng: number }; 
  plusCode?: string; // CRITICAL: This is the source of truth for CRM location
  locationSource?: 'exif' | 'device';
  deviceInfo?: string;
  
  leadSource?: string;
  customLeadSource?: string;
  
  // Updated to match Backend `referred_by` JSON Schema
  referredBy?: Professional; 
  
  constructionStage?: string;
  priority?: Priority;
  
  // Contacts
  peopleMet?: PersonMet[];
  
  notes?: string;
  
  // Draft State
  hasDraft?: boolean;
  draftSavedAt?: string;
  
  // CRM Specifics
  estimatedQuantity?: string;
  materialInterests?: string[];
  othersMaterialNote?: string;
  
  // Linkage
  followUpId?: string;
}

export interface RecycleItem {
  id: string;
  photo: Photo;
  deletedBy: string;
  deletedAt: string;
  draftData?: any;
}

export const LEAD_SOURCES = [
  'Walk-in', 'Field Visit', 'Referral', 'Website Inquiry', 'Social Media', 'Google Ads', 'Cold Call', 'Other'
];

export const PERSON_TYPES = [
  'Owner', 'Architect', 'Builder', 'Contractor', 'Site Supervisor', 'Interior Designer', 'Other'
];

export const CONSTRUCTION_STAGES = [
  'Just Started', 'Structure complete', 'Plastering', 'Flooring ready', 'Renovation', 'Finishing'
];

export const MATERIAL_INTERESTS = [
  'Italian Marble', 'Granite (South)', 'Granite (North)', 'Quartz',
  'Sandstone', 'Tiles', 'Onyx', 'Engineered Marble',
  'Cladding Stone', 'Wooden Flooring', 'Other'
];

export interface RouteBreadcrumb {
  id?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string; // ISO string
  plusCode?: string;
  speed?: number | null;
  altitude?: number | null;
  heading?: number | null;
  deviceInfo?: string;
  deviceId?: string;
  osVersion?: string;
  deviceModel?: string;
  batteryLevel?: number;
  networkType?: string;
  userId?: string;
  userName?: string;
  geofenceIds?: string[];
  
  // Forensic tracking attributes
  sourceEvent?: 'APP_LOAD' | 'PHOTO_UPLOAD' | 'ATTENDANCE_CHECK' | 'HEARTBEAT' | 'MANUAL' | 'ROUTE_TRACKER' | 'ODOMETER_ENTRY';
  photoUploadSource?: 'DIRECT_CAPTURE' | 'GALLERY';
  locationProvider?: 'GPS_HARDWARE' | 'WIFI_GOOGLE' | 'CELL_TOWER' | 'EXIF_FALLBACK';
  isMocked?: boolean;
  exifDateTimeOriginal?: string;
  exifCameraMake?: string;
  exifCameraModel?: string;
  photoId?: string;
  attendanceId?: string;
  flags?: string[];
}

export interface TelemetryPresence {
  userId: string;
  userName?: string;
  isOnline: boolean;
  lastSeenTime: string; // ISO string
  deviceInfo?: string;
  batteryLevel?: number;
}

export interface TelemetryTrainDoc {
  type: 'telemetry_train';
  batchId: string;
  userId: string;
  userName?: string;
  sessionId: string;
  sessionPart: number;
  fromTs: number;
  toTs: number;
  count: number;
  pings: RouteBreadcrumb[];
  geofenceEvents?: GeofenceEvent[];
  presence?: TelemetryPresence;
  dispatchReason: 'timer' | 'priority_event' | 'manual' | 'unload' | 'size_overflow';
  createdAt: string;
}

