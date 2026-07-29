import React, { useState, useEffect } from 'react';
import { Geofence, GeofenceEvent, User, GeofenceShapeType } from '../../../types';
import { 
  saveGeofenceToFirestore, 
  deleteGeofenceFromFirestore, 
  subscribeGeofences, 
  subscribeGeofenceEvents,
  GeofenceCircleShape,
  GeofencePolygonShape
} from '../../../services/geofence';
import { MapPin, Plus, Trash2, Shield, Activity, Radio, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface GeofencesManagerProps {
  currentUser: User;
  teamMembers: User[];
}

export default function GeofencesManager({ currentUser, teamMembers }: GeofencesManagerProps) {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'feed'>('list');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shapeType, setShapeType] = useState<GeofenceShapeType>('circle');
  const [circleLat, setCircleLat] = useState('30.9010');
  const [circleLng, setCircleLng] = useState('75.8570');
  const [circleRadius, setCircleRadius] = useState('150');
  const [polygonWkt, setPolygonWkt] = useState('POLYGON ((30.901 75.857, 30.905 75.857, 30.905 75.862, 30.901 75.862, 30.901 75.857))');
  const [color, setColor] = useState('#D99026');
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsubFences = subscribeGeofences(setGeofences);
    const unsubEvents = subscribeGeofenceEvents(setEvents);
    return () => {
      unsubFences();
      unsubEvents();
    };
  }, []);

  const handleQuickPreset = (presetName: string, lat: number, lng: number, radius: number) => {
    setName(presetName);
    setShapeType('circle');
    setCircleLat(lat.toFixed(4));
    setCircleLng(lng.toFixed(4));
    setCircleRadius(radius.toString());
    setActiveTab('create');
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Please enter a valid geofence name.');
      return;
    }

    let wkt = '';
    if (shapeType === 'circle') {
      const lat = parseFloat(circleLat);
      const lng = parseFloat(circleLng);
      const rad = parseFloat(circleRadius);
      if (isNaN(lat) || isNaN(lng) || isNaN(rad) || rad <= 0) {
        setErrorMsg('Invalid circle coordinates or radius.');
        return;
      }
      wkt = `CIRCLE (${lat} ${lng}, ${rad})`;
    } else if (shapeType === 'polygon') {
      const poly = GeofencePolygonShape.fromWkt(polygonWkt.trim());
      if (!poly) {
        setErrorMsg('Invalid POLYGON WKT format. Example: POLYGON ((lat lng, lat lng, ...))');
        return;
      }
      wkt = polygonWkt.trim();
    } else {
      setErrorMsg('Polyline fences require line coordinates.');
      return;
    }

    setSaving(true);
    try {
      const newGeofence: Geofence = {
        id: `gf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        description: description.trim() || undefined,
        wkt,
        type: shapeType,
        color,
        assignedUserIds: assignedUsers,
        createdBy: currentUser.id || 'admin',
        createdAt: new Date().toISOString(),
        active: true
      };

      await saveGeofenceToFirestore(newGeofence);
      setName('');
      setDescription('');
      setActiveTab('list');
    } catch (err) {
      setErrorMsg('Failed to save geofence. Please check parameters.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (g: Geofence) => {
    await saveGeofenceToFirestore({ ...g, active: !g.active });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this geofence?')) {
      await deleteDocGeofence(id);
    }
  };

  const deleteDocGeofence = async (id: string) => {
    await deleteGeofenceFromFirestore(id);
  };

  return (
    <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-6 shadow-xl space-y-6 text-white">
      {/* Title & Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-[#D99026]" size={22} />
            <h3 className="text-xl font-bold text-white">Geofencing & Boundary Control</h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Define virtual perimeters around job sites, warehouses, or client offices to track staff entry & exit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeTab === 'list'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#1A1515] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Radio size={14} /> Fences ({geofences.length})
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeTab === 'create'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#1A1515] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Plus size={14} /> New Perimeter
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeTab === 'feed'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#1A1515] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Activity size={14} /> Activity Feed ({events.length})
          </button>
        </div>
      </div>

      {/* TAB 1: LIST GEOFENCES */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Quick Presets */}
          <div className="bg-[#1A1515] p-3 rounded-xl border border-[#3A2E2E] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#D99026] uppercase tracking-wider flex items-center gap-1">
              ⚡ Quick Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickPreset('Aero City Block G', 30.6720, 76.7380, 200)}
                className="px-2.5 py-1 rounded bg-[#2D2424] hover:bg-[#3A2E2E] text-xs font-medium text-gray-300 border border-[#3A2E2E]"
              >
                + Aero City G (200m)
              </button>
              <button
                onClick={() => handleQuickPreset('Ludhiana Main HQ', 30.9010, 75.8570, 150)}
                className="px-2.5 py-1 rounded bg-[#2D2424] hover:bg-[#3A2E2E] text-xs font-medium text-gray-300 border border-[#3A2E2E]"
              >
                + Ludhiana HQ (150m)
              </button>
              <button
                onClick={() => handleQuickPreset('Mohali Industrial Area', 30.7046, 76.7179, 300)}
                className="px-2.5 py-1 rounded bg-[#2D2424] hover:bg-[#3A2E2E] text-xs font-medium text-gray-300 border border-[#3A2E2E]"
              >
                + Mohali Ind. Area (300m)
              </button>
            </div>
          </div>

          {geofences.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1515] rounded-xl border border-[#3A2E2E]">
              <Shield size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-300 font-bold">No active geofences configured.</p>
              <p className="text-xs text-gray-500 mt-1">Create a perimeter to start monitoring staff arrivals & exits.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-4 px-4 py-2 bg-[#D99026] text-black font-bold rounded-lg text-xs hover:bg-[#b8781e] transition-colors"
              >
                + Add First Geofence
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {geofences.map(g => (
                <div 
                  key={g.id}
                  className={`bg-[#1A1515] border rounded-xl p-4 flex flex-col justify-between transition-all ${
                    g.active ? 'border-[#3A2E2E] hover:border-gray-500' : 'border-red-900/40 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: g.color || '#D99026' }}
                        />
                        <h4 className="font-bold text-sm text-white truncate">{g.name}</h4>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        g.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {g.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {g.description && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{g.description}</p>
                    )}

                    <div className="bg-[#2D2424] p-2.5 rounded-lg border border-[#3A2E2E] text-[11px] font-mono text-gray-300 mb-3 space-y-1">
                      <div className="truncate"><span className="text-gray-500 uppercase">WKT:</span> {g.wkt}</div>
                      <div><span className="text-gray-500 uppercase">Type:</span> {g.type}</div>
                      {g.assignedUserIds && g.assignedUserIds.length > 0 && (
                        <div><span className="text-gray-500 uppercase">Assigned Staff:</span> {g.assignedUserIds.length} members</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#3A2E2E] pt-3">
                    <button
                      onClick={() => handleToggleActive(g)}
                      className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
                    >
                      {g.active ? 'Disable Fence' : 'Enable Fence'}
                    </button>

                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                      title="Delete Geofence"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE GEOFENCE FORM */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateGeofence} className="space-y-4 max-w-2xl bg-[#1A1515] p-5 rounded-xl border border-[#3A2E2E]">
          <h4 className="text-sm font-bold text-[#D99026] uppercase tracking-wider">Define New Perimeter</h4>

          {errorMsg && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Geofence Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Aero City Plot Site #40"
                className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#D99026]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Geometry Type *</label>
              <select
                value={shapeType}
                onChange={e => setShapeType(e.target.value as GeofenceShapeType)}
                className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#D99026]"
              >
                <option value="circle">CIRCLE (Center Lat/Lng + Radius)</option>
                <option value="polygon">POLYGON (WKT Coordinates)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Primary site entrance & delivery yard"
              className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#D99026]"
            />
          </div>

          {/* Circle Parameters */}
          {shapeType === 'circle' && (
            <div className="grid grid-cols-3 gap-3 bg-[#2D2424] p-3 rounded-lg border border-[#3A2E2E]">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">Center Latitude</label>
                <input
                  type="text"
                  value={circleLat}
                  onChange={e => setCircleLat(e.target.value)}
                  placeholder="30.9010"
                  className="w-full bg-[#1A1515] border border-[#3A2E2E] rounded p-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">Center Longitude</label>
                <input
                  type="text"
                  value={circleLng}
                  onChange={e => setCircleLng(e.target.value)}
                  placeholder="75.8570"
                  className="w-full bg-[#1A1515] border border-[#3A2E2E] rounded p-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  value={circleRadius}
                  onChange={e => setCircleRadius(e.target.value)}
                  placeholder="150"
                  className="w-full bg-[#1A1515] border border-[#3A2E2E] rounded p-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Polygon WKT */}
          {shapeType === 'polygon' && (
            <div className="bg-[#2D2424] p-3 rounded-lg border border-[#3A2E2E]">
              <label className="block text-[11px] font-bold text-gray-400 mb-1">WKT Polygon String</label>
              <textarea
                value={polygonWkt}
                onChange={e => setPolygonWkt(e.target.value)}
                rows={3}
                className="w-full bg-[#1A1515] border border-[#3A2E2E] rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-[#D99026]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Pin Color on Map</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-300">{color}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#3A2E2E] pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-4 py-2 bg-[#2D2424] hover:bg-[#3A2E2E] text-gray-300 rounded-lg text-xs font-bold transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#D99026] hover:bg-[#b8781e] text-black font-bold rounded-lg text-xs transition-colors flex items-center gap-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
              Save Geofence
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: REAL-TIME ACTIVITY FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-10 bg-[#1A1515] rounded-xl border border-[#3A2E2E]">
              <Activity size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-xs text-gray-400 font-bold">No geofence events recorded yet.</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Enter/Exit transitions will automatically stream here as staff log GPS route breadcrumbs.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {events.map(evt => (
                <div 
                  key={evt.id}
                  className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      evt.type === 'enter' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {evt.type === 'enter' ? '➡️ ENTERED' : '⬅️ EXITED'}
                    </span>

                    <div>
                      <span className="font-bold text-white">{evt.userName}</span>
                      <span className="text-gray-400"> in </span>
                      <span className="font-bold text-[#D99026]">{evt.geofenceName || 'Geofence'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-gray-400 font-mono text-[11px]">
                    {evt.plusCode && <span>{evt.plusCode}</span>}
                    <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
