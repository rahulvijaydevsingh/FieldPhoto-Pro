
import { Photo, User, FollowUp, Professional } from '../types';

export const DEMO_ADMIN: User = {
  id: 'u1',
  name: 'Nipun Tantia',
  email: 'nipun@company.com',
  password: 'admin',
  role: 'admin',
  designation: 'Managing Director / Admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
};

export const DEMO_STAFF: User = {
  id: 'u2',
  name: 'Amanpreet',
  email: 'meera@maharajacrm.com',
  password: 'Amanpreet@93',
  role: 'staff',
  designation: 'Senior Field Representative',
  avatar: 'https://i.pravatar.cc/150?u=u2'
};

export const TEAM_MEMBERS: User[] = [DEMO_ADMIN, DEMO_STAFF];

export const MOCK_PROFESSIONALS: Professional[] = [
  { id: 'prof1', name: 'Ar. Vikram Malhotra', firmName: 'VM Architects', type: 'Architect', phone: '9870000001' },
  { id: 'prof2', name: 'Sanjay Gupta', firmName: 'Gupta Constructions', type: 'Builder', phone: '9870000002' },
  { id: 'prof3', name: 'Studio Meraki', firmName: 'Meraki Designs', type: 'Interior Designer', phone: '9870000003' },
  { id: 'prof4', name: 'Rakesh Builders', firmName: 'RB & Sons', type: 'Contractor', phone: '9870000004' },
];

const INITIAL_PHOTOS: Photo[] = [
  {
    id: 'p1',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop',
    fileName: 'IMG_20250115_143022.jpg',
    uploadDate: '2025-01-15T10:00:00Z',
    captureDate: '2025-01-15T09:30:00Z',
    uploaderId: 'u2',
    uploaderName: 'Amanpreet',
    status: 'in-progress',
    syncStatus: 'synced',
    siteName: 'House #42, Ranjit Avenue',
    priority: 'High',
    leadSource: 'Field Visit',
    constructionStage: 'Plastering',
    notes: '3BHK independent house, modular kitchen needed. Budget 8-10L.',
    site_lat: 30.901000,
    site_lng: 75.857300,
    gps: { lat: 30.901000, lng: 75.857300 },
    plusCode: '8J52W724+8Q Ludhiana',
    peopleMet: [{ id: 'pm1', designation: 'Owner', name: 'Suresh Raina', phone: '9876543210', email: 'suresh@example.com', alternatePhone: '', firmName: 'Raina Residence' }]
  },
  {
    id: 'p2',
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop',
    fileName: 'IMG_20250116_112000.jpg',
    uploadDate: '2025-01-16T11:20:00Z',
    captureDate: '2025-01-16T11:00:00Z',
    uploaderId: 'u2',
    uploaderName: 'Amanpreet',
    status: 'new',
    syncStatus: 'synced',
    siteName: 'Civil Lines Villa #18',
    priority: 'Medium',
    leadSource: 'Referral',
    constructionStage: 'Structure complete',
    notes: 'New site visit photo awaiting complete review.',
    site_lat: 30.912345,
    site_lng: 75.864321,
    gps: { lat: 30.912345, lng: 75.864321 },
    plusCode: '8J52W856+9R Ludhiana'
  }
];

const INITIAL_FOLLOWUPS: FollowUp[] = [
  {
    id: 'f1',
    photoId: 'p1',
    assignedToId: 'u2',
    type: 'Phone Call',
    date: '2025-01-18T18:00:00',
    notes: 'Call owner after 6 PM regarding quotation approval',
    status: 'pending'
  }
];

export const getInitialData = () => ({
  photos: INITIAL_PHOTOS,
  followUps: INITIAL_FOLLOWUPS
});
