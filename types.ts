
export type Role = 'admin' | 'staff';

export type Priority = 'High' | 'Medium' | 'Low';

// Updated to match CRM Status Enum
export type PhotoStatus = 'new' | 'in-progress' | 'quoted' | 'won' | 'lost' | 'on-hold';

export type SyncStatus = 'synced' | 'pending' | 'error';

export type FollowUpType = 'Phone Call' | 'Site Visit' | 'WhatsApp' | 'Email' | 'Meeting' | 'Quotation' | 'Nurture' | 'None';

export type FollowUpStatus = 'pending' | 'completed' | 'overdue';

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
