import React, { useEffect, useRef, useState } from 'react';
import { RouteBreadcrumb, User } from '../../../types';
import { Compass, Navigation, ShieldCheck, MapPin } from 'lucide-react';
import { getCachedGeofences, GeofenceCircleShape, GeofencePolygonShape } from '../../../services/geofence';

interface LiveRouteMapProps {
  breadcrumbs: RouteBreadcrumb[];
  selectedUser?: User;
}

export default function LiveRouteMap({ breadcrumbs, selectedUser }: LiveRouteMapProps) {
  const [leafletReady, setLeafletReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const geofencesGroupRef = useRef<any>(null);
  const routeGroupRef = useRef<any>(null);

  const latestCrumb = breadcrumbs[0];

  // Dynamic Leaflet script and stylesheet loader
  useEffect(() => {
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    let script = document.querySelector<HTMLScriptElement>('script[src*="leaflet.js"]');
    if (!script) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(script);
    }

    const handleScriptLoad = () => {
      setLeafletReady(true);
    };

    script.addEventListener('load', handleScriptLoad);
    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
      }
    };
  }, []);

  // Map initialization
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const initialLat = latestCrumb?.lat || 30.9010;
    const initialLng = latestCrumb?.lng || 75.8573;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([initialLat, initialLng], 13);

      // Smooth dark theme tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(map);

      // Move zoom control to bottom right to avoid overlay overlap
      L.control.zoom({
        position: 'bottomright'
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      geofencesGroupRef.current = L.layerGroup().addTo(map);
      routeGroupRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersGroupRef.current = null;
        geofencesGroupRef.current = null;
        routeGroupRef.current = null;
      }
    };
  }, [leafletReady]);

  // Handle updates to breadcrumbs, selectedUser and active geofences
  useEffect(() => {
    const L = (window as any).L;
    if (!leafletReady || !mapRef.current || !L) return;

    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    const geofencesGroup = geofencesGroupRef.current;
    const routeGroup = routeGroupRef.current;

    markersGroup.clearLayers();
    geofencesGroup.clearLayers();
    routeGroup.clearLayers();

    // 1. Draw breadcrumb GPS route & subtle directional indicators
    if (breadcrumbs.length > 0) {
      const sortedCrumbs = [...breadcrumbs].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const latlngs = sortedCrumbs.map(c => [c.lat, c.lng] as [number, number]);

      // Breadcrumb path polyline
      const polyline = L.polyline(latlngs, {
        color: '#D99026',
        weight: 3.5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(routeGroup);

      // Fit map bounds to encompass the trail
      try {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      } catch (e) {
        const latest = breadcrumbs[0];
        map.setView([latest.lat, latest.lng], 14);
      }

      // Add directional markers along path
      const step = Math.max(1, Math.floor(sortedCrumbs.length / 5));
      for (let i = 0; i < sortedCrumbs.length - 1; i += step) {
        const p1 = sortedCrumbs[i];
        const p2 = sortedCrumbs[i + 1];

        // Calculate bearing degree for CSS rotation
        const lat1 = (p1.lat * Math.PI) / 180;
        const lat2 = (p2.lat * Math.PI) / 180;
        const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const bearingRad = Math.atan2(y, x);
        const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;

        const arrowHtml = `
          <div style="transform: rotate(${bearingDeg}deg); color: #D99026; font-size: 14px; font-weight: bold; text-shadow: 0 0 3px rgba(0,0,0,0.8); line-height: 1; pointer-events: none;">
            ➤
          </div>
        `;
        const arrowIcon = L.divIcon({
          html: arrowHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: 'bg-transparent border-0'
        });

        L.marker([midLat, midLng], { icon: arrowIcon }).addTo(routeGroup);
      }
    }

    // 2. Draw Geofence Map Overlays from cache
    try {
      const activeFences = getCachedGeofences().filter(g => g.active);
      activeFences.forEach(gf => {
        const color = gf.color || '#D99026';
        const wkt = gf.wkt.trim();

        const popupContent = `
          <div style="color: black; font-family: sans-serif; font-size: 12px; padding: 4px; line-height: 1.4;">
            <strong style="color: #D99026; font-size: 13px;">${gf.name}</strong>
            <div style="margin-top: 4px;">Type: <span style="font-weight: bold; text-transform: uppercase; color: #555;">${gf.type}</span></div>
            <div>Status: <span style="color: #10B981; font-weight: bold;">Active Boundary</span></div>
            ${gf.description ? `<div style="color: #666; margin-top: 4px; font-style: italic; border-top: 1px solid #eee; pt-2;">${gf.description}</div>` : ''}
          </div>
        `;

        if (wkt.toUpperCase().startsWith('CIRCLE')) {
          const circleObj = GeofenceCircleShape.fromWkt(wkt);
          if (circleObj) {
            L.circle([circleObj.lat, circleObj.lng], {
              radius: circleObj.radiusMeters,
              color: color,
              fillColor: color,
              fillOpacity: 0.18,
              weight: 2
            }).bindPopup(popupContent).addTo(geofencesGroup);
          }
        } else if (wkt.toUpperCase().startsWith('POLYGON')) {
          const polyObj = GeofencePolygonShape.fromWkt(wkt);
          if (polyObj && polyObj.coordinates) {
            const polygonPoints = polyObj.coordinates.map(c => [c.lat, c.lng]);
            L.polygon(polygonPoints, {
              color: color,
              fillColor: color,
              fillOpacity: 0.18,
              weight: 2
            }).bindPopup(popupContent).addTo(geofencesGroup);
          }
        }
      });
    } catch (err) {
      console.warn('Geofence render error in LiveRouteMap:', err);
    }

    // 3. Draw Staff Markers & Accuracy Circles
    if (breadcrumbs.length > 0) {
      const latestPerStaff = new Map<string, RouteBreadcrumb>();
      breadcrumbs.forEach(c => {
        if (!c.userId) return;
        const existing = latestPerStaff.get(c.userId);
        if (!existing || new Date(c.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
          latestPerStaff.set(c.userId, c);
        }
      });

      const staffList = selectedUser
        ? Array.from(latestPerStaff.values()).filter(c => c.userId === selectedUser.id)
        : Array.from(latestPerStaff.values());

      staffList.forEach(c => {
        const accuracyRadius = c.accuracy || 8;

        // Retain accuracy radius circle overlays
        L.circle([c.lat, c.lng], {
          radius: accuracyRadius,
          color: '#10B981',
          fillColor: '#10B981',
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '3, 4'
        }).addTo(markersGroup);

        const initials = c.userName
          ? c.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : 'FS';

        const avatarUrl = c.userAvatar || (selectedUser?.id === c.userId ? selectedUser?.avatar : null);

        // Custom staff avatar pins/initials
        let pinHtml = '';
        if (avatarUrl) {
          pinHtml = `
            <div class="relative w-10 h-10 rounded-full border-2 border-[#D99026] bg-[#2D2424] shadow-2xl overflow-hidden flex items-center justify-center">
              <img src="${avatarUrl}" alt="${initials}" class="w-full h-full object-cover" />
              <div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-[#1A1515] rounded-full animate-pulse"></div>
            </div>
          `;
        } else {
          pinHtml = `
            <div class="relative w-10 h-10 rounded-full border-2 border-[#D99026] bg-[#2D2424] shadow-2xl flex items-center justify-center text-[#D99026] font-bold text-xs font-mono">
              ${initials}
              <div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-[#1A1515] rounded-full animate-pulse"></div>
            </div>
          `;
        }

        const staffIcon = L.divIcon({
          html: pinHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          className: 'bg-transparent border-0'
        });

        const staffPopup = `
          <div style="color: black; font-family: sans-serif; font-size: 12px; padding: 4px; line-height: 1.4;">
            <strong style="color: #D99026; font-size: 13px;">${c.userName || 'Unknown staff'}</strong>
            <div style="margin-top: 4px;">Last Activity: <span style="font-weight: bold; color: #555;">${new Date(c.timestamp).toLocaleTimeString()}</span></div>
            <div>Position: <span style="font-family: monospace;">${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</span></div>
            <div>GPS Accuracy: <span>±${Math.round(accuracyRadius)}m</span></div>
            ${c.deviceInfo ? `<div style="color: #888; font-size: 10px; border-top: 1px dashed #ddd; mt-2; pt-1;">${c.deviceInfo}</div>` : ''}
          </div>
        `;

        L.marker([c.lat, c.lng], { icon: staffIcon })
          .bindPopup(staffPopup)
          .addTo(markersGroup);
      });
    }

  }, [breadcrumbs, selectedUser, leafletReady]);

  // Adjust Leaflet size to avoid display flaws
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [leafletReady, breadcrumbs.length]);

  return (
    <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-xl p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass size={16} className="text-[#D99026]" /> Territory Route Visualizer
          </h4>
          <p className="text-xs text-gray-400">
            {selectedUser ? `Tracking ${selectedUser.name}` : 'Multi-Staff Field Route Trail'}
          </p>
        </div>

        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE GPS STREAM
        </span>
      </div>

      {/* Interactive Map Wrapper with Tactical HUD Overlay */}
      <div className="relative w-full h-96 bg-[#120E0E] rounded-xl border border-[#3A2E2E] overflow-hidden flex flex-col justify-between">

        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        {/* Top telemetry bar overlay */}
        <div className="absolute top-4 left-4 right-4 z-[999] pointer-events-none">
          <div className="flex items-center justify-between text-xs font-mono bg-black/80 backdrop-blur-md p-2.5 rounded-lg border border-white/10 pointer-events-auto shadow-lg">
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-[#D99026]" />
              <span className="text-gray-300">Target Coordinates:</span>
              <span className="text-emerald-400 font-bold">
                {latestCrumb ? `${latestCrumb.lat.toFixed(4)}, ${latestCrumb.lng.toFixed(4)}` : '30.9010, 75.8573'}
              </span>
            </div>

            <span className="text-gray-400">
              Pings: <strong className="text-white">{breadcrumbs.length}</strong>
            </span>
          </div>
        </div>

        {/* Bottom Legend overlay */}
        <div className="absolute bottom-4 left-4 right-16 z-[999] pointer-events-none">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 bg-black/85 backdrop-blur-md p-2.5 rounded-lg border border-white/10 pointer-events-auto shadow-lg">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" /> W3C High-Accuracy Geolocation Engine
            </span>
            <span className="text-[#D99026]">Accuracy ±8m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
