
import React, { useState, useEffect } from 'react';
import { User, Photo } from '../types';
import { Camera, Image as ImageIcon, WifiOff, X, Pause, Play, Trash2, ArrowRight, MapPin } from 'lucide-react';
import ExifReader from 'exifreader';
import { generatePlusCodeWithCitySync, generatePlusCodeWithCityAsync, getDeviceModelInfo } from '../utils/locationUtils';
import { addLocalBreadcrumb } from '../utils/routeLogger';
import { isValidPhotoDate } from '../services/dateUtils';

interface Props {
  user: User;
  isOnline?: boolean;
  onUpload: (photo: Photo) => void;
  onViewPending: () => void;
}

export default function UploadView({ user, isOnline, onUpload, onViewPending }: Props) {
  const [uploads, setUploads] = useState<{id: string, name: string, progress: number, status: 'uploading' | 'waiting' | 'done', url: string}[]>([]);
  const [onlineState, setOnlineState] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnlineState(true);
    const handleOffline = () => setOnlineState(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeOnline = isOnline !== undefined ? isOnline : onlineState;
  const initialGps = user.lastLocation 
    ? { lat: user.lastLocation.lat, lng: user.lastLocation.lng } 
    : { lat: 30.6782, lng: 76.7291 };
  const [cachedGps, setCachedGps] = useState<{ lat: number; lng: number }>(initialGps);
  const [gpsReady, setGpsReady] = useState<boolean>(false);

  // Warmup live device GPS on component load so camera captures have high accuracy immediately
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCachedGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsReady(true);
        },
        (err) => {
          console.log('GPS warmup:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // Helper to robustly parse EXIF GPS coordinates (DMS, arrays, rationals, strings, Ref signs)
  const parseExifCoordinate = (val: any, ref: any): number | undefined => {
    if (val === undefined || val === null) return undefined;

    let deg: number | undefined;

    const parseSinglePart = (part: any): number | undefined => {
      if (typeof part === 'number' && !isNaN(part)) return part;
      if (typeof part === 'string') {
        const p = parseFloat(part.trim());
        if (!isNaN(p)) return p;
      }
      if (Array.isArray(part) && part.length === 2 && typeof part[0] === 'number' && typeof part[1] === 'number' && part[1] !== 0) {
        return part[0] / part[1];
      }
      if (part && typeof part === 'object') {
        if (typeof part.numerator === 'number' && typeof part.denominator === 'number' && part.denominator !== 0) {
          return part.numerator / part.denominator;
        }
        if (typeof part.value === 'number' && !isNaN(part.value)) return part.value;
        if (typeof part.description === 'number' && !isNaN(part.description)) return part.description;
      }
      return undefined;
    };

    // 1. Direct number
    if (typeof val === 'number' && !isNaN(val)) {
      deg = val;
    }
    // 2. String e.g. "30.690567" or DMS string "30° 41' 26.04\" N"
    else if (typeof val === 'string') {
      const trimmed = val.trim();
      const directNum = parseFloat(trimmed);
      if (!isNaN(directNum) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
        deg = directNum;
      } else {
        const dmsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*°?\s*(\d+(?:\.\d+)?)\s*['′]?\s*(\d+(?:\.\d+)?)\s*["″]?/);
        if (dmsMatch) {
          const d = parseFloat(dmsMatch[1]);
          const m = parseFloat(dmsMatch[2]);
          const s = parseFloat(dmsMatch[3]);
          if (!isNaN(d) && !isNaN(m) && !isNaN(s)) {
            deg = d + (m / 60) + (s / 3600);
          }
        }
      }
    }
    // 3. Array e.g. [30, 41, 26.04] or [[30,1], [41,1], [2604,100]]
    else if (Array.isArray(val)) {
      if (val.length === 3) {
        const d = parseSinglePart(val[0]);
        const m = parseSinglePart(val[1]);
        const s = parseSinglePart(val[2]);
        if (d !== undefined) {
          deg = Math.abs(d) + ((m || 0) / 60) + ((s || 0) / 3600);
          if (d < 0) deg = -deg;
        }
      } else if (val.length === 1) {
        deg = parseSinglePart(val[0]);
      }
    }
    // 4. Object
    else if (typeof val === 'object') {
      if (typeof val.description === 'number' && !isNaN(val.description)) {
        deg = val.description;
      } else if (typeof val.value === 'number' && !isNaN(val.value)) {
        deg = val.value;
      } else if (typeof val.description === 'string') {
        return parseExifCoordinate(val.description, ref);
      } else if (Array.isArray(val.value)) {
        return parseExifCoordinate(val.value, ref);
      } else if (val.numerator !== undefined && val.denominator !== undefined && val.denominator !== 0) {
        deg = val.numerator / val.denominator;
      }
    }

    if (deg === undefined || isNaN(deg)) return undefined;

    // Apply Direction Reference (S or W means negative)
    let refStr = '';
    if (typeof ref === 'string') refStr = ref.trim().toUpperCase();
    else if (ref && typeof ref.description === 'string') refStr = ref.description.trim().toUpperCase();
    else if (ref && typeof ref.value === 'string') refStr = ref.value.trim().toUpperCase();
    else if (Array.isArray(ref)) {
      const first = ref[0];
      if (typeof first === 'string') refStr = first.trim().toUpperCase();
      else if (first && typeof first.description === 'string') refStr = first.description.trim().toUpperCase();
    }

    if (refStr === 'S' || refStr === 'W') {
      deg = -Math.abs(deg);
    } else if (refStr === 'N' || refStr === 'E') {
      deg = Math.abs(deg);
    }

    return deg;
  };

  // Extract EXIF GPS, device make/model, and photo creation timestamp directly from photo metadata
  const extractPhotoMeta = async (file: File, fallbackGps: { lat: number; lng: number }) => {
    try {
      const tags = await ExifReader.load(file, { expanded: true });
      let gps: { lat: number; lng: number } | undefined;
      let captureDate: string | undefined;
      let deviceModel: string | undefined;

      // Extract GPS Coordinates safely
      let rawLat: number | undefined;
      let rawLng: number | undefined;

      if (tags.gps) {
        const latRef = tags.gps.LatitudeRef || tags.gps.GPSLatitudeRef;
        const lngRef = tags.gps.LongitudeRef || tags.gps.GPSLongitudeRef;
        rawLat = parseExifCoordinate(tags.gps.Latitude, latRef);
        rawLng = parseExifCoordinate(tags.gps.Longitude, lngRef);
      }

      if ((rawLat === undefined || rawLng === undefined) && tags) {
        const latRef = tags.GPSLatitudeRef || tags.image?.GPSLatitudeRef || tags.exif?.GPSLatitudeRef;
        const lngRef = tags.GPSLongitudeRef || tags.image?.GPSLongitudeRef || tags.exif?.GPSLongitudeRef;
        if (rawLat === undefined) {
          rawLat = parseExifCoordinate(tags.GPSLatitude || tags.image?.GPSLatitude || tags.exif?.GPSLatitude, latRef);
        }
        if (rawLng === undefined) {
          rawLng = parseExifCoordinate(tags.GPSLongitude || tags.image?.GPSLongitude || tags.exif?.GPSLongitude, lngRef);
        }
      }

      if (rawLat !== undefined && rawLng !== undefined && !isNaN(rawLat) && !isNaN(rawLng)) {
        if (rawLat >= -90 && rawLat <= 90 && rawLng >= -180 && rawLng <= 180 && (rawLat !== 0 || rawLng !== 0)) {
          gps = { lat: rawLat, lng: rawLng };
          console.log(`✅ EXIF GPS extracted: lat=${rawLat}, lng=${rawLng}`);
        } else {
          console.warn(`⚠️ EXIF GPS invalid/out-of-bounds: lat=${rawLat}, lng=${rawLng}`);
        }
      } else {
        console.log(`ℹ️ No valid EXIF GPS tags found in image. Using device location fallback.`);
      }

      // Check Exif Tags for Camera Make & Model
      const makeTag = tags.Make || tags.image?.Make || tags.exif?.Make;
      const modelTag = tags.Model || tags.image?.Model || tags.exif?.Model;
      const makeStr = makeTag?.description ? String(makeTag.description).trim() : '';
      const modelStr = modelTag?.description ? String(modelTag.description).trim() : '';

      if (modelStr) {
        if (makeStr && !modelStr.toLowerCase().includes(makeStr.toLowerCase())) {
          deviceModel = `${makeStr} ${modelStr}`;
        } else {
          deviceModel = modelStr;
        }
      } else if (makeStr) {
        deviceModel = makeStr;
      }

      if (tags.exif) {
        const dtTag = tags.exif.DateTimeOriginal || tags.exif.CreateDate || tags.exif.DateTime;
        if (dtTag && dtTag.description) {
          const parts = String(dtTag.description).trim().split(' ');
          if (parts.length === 2) {
            const datePart = parts[0].replace(/:/g, '-');
            const timeParts = parts[1].split(':');
            if (timeParts.length === 3) {
              const dateSplit = datePart.split('-');
              const y = parseInt(dateSplit[0], 10);
              const m = parseInt(dateSplit[1], 10);
              const d = parseInt(dateSplit[2], 10);
              const hh = parseInt(timeParts[0], 10);
              const mm = parseInt(timeParts[1], 10);
              const ss = parseInt(timeParts[2], 10);

              if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(hh) && !isNaN(mm) && !isNaN(ss)) {
                const parsed = new Date(y, m - 1, d, hh, mm, ss);
                if (isValidPhotoDate(parsed)) {
                  captureDate = parsed.toISOString();
                }
              }
            }
          }
        }
      }

      const validLastModified = (file.lastModified && isValidPhotoDate(file.lastModified)) ? new Date(file.lastModified).toISOString() : undefined;
      const safeCaptureDate = captureDate || validLastModified || new Date().toISOString();

      return {
        gps: gps || fallbackGps,
        captureDate: safeCaptureDate,
        source: gps ? ('exif' as const) : ('device' as const),
        deviceModel
      };
    } catch (err) {
      console.log('ExifReader notice:', err);
    }

    const validLastModified = (file.lastModified && isValidPhotoDate(file.lastModified)) ? new Date(file.lastModified).toISOString() : undefined;
    return {
      gps: fallbackGps,
      captureDate: validLastModified || new Date().toISOString(),
      source: 'device' as const,
      deviceModel: undefined
    };
  };

  // Helper to compress camera/gallery images into web-optimized JPEG data URL
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1200;
          const maxHeight = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressedDataUrl);
          } else {
            resolve((e.target?.result as string) || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop');
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop');
      reader.readAsDataURL(file);
    });
  };



  // Helper to determine clean site address from raw filename
  const getCleanSiteName = (filename: string): string => {
    const base = filename.replace(/\.[^/.]+$/, "").trim();
    // Check if filename is purely numeric, camera format (e.g. IMG_20260724_102030, 20260724_102030, 1721815020)
    const isCameraOrNumeric = /^(\d+|IMG_\d+.*|\d{8}_\d+.*|\d{10,}.*|P_\d+.*|Photo_\d+.*)$/i.test(base);
    if (isCameraOrNumeric) {
      return ''; // Leave blank so staff can enter actual address without clearing random digits
    }
    return base;
  };

  // Simulate file handling
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Default to tracked user location or cached GPS (Mohali baseline)
    let currentGps = user.lastLocation 
      ? { lat: user.lastLocation.lat, lng: user.lastLocation.lng } 
      : cachedGps;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentGps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          processFiles(files, currentGps);
        },
        () => {
          processFiles(files, currentGps);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      processFiles(files, currentGps);
    }
  };

  const processFiles = (files: FileList, gpsCoords: { lat: number, lng: number }) => {
    const newUploads = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
      status: 'waiting' as const,
      url: URL.createObjectURL(file),
      file: file
    }));

    setUploads(prev => [...newUploads, ...prev]);

    newUploads.forEach(upload => {
      simulateUpload(upload.id, upload.file, gpsCoords);
    });
  };

  const simulateUpload = (id: string, file: File, gpsCoords: { lat: number, lng: number }) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Complete upload
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 100, status: 'done' } : u));
        
        // Actually add to app data with compressed image
        setTimeout(async () => {
          const dataUrl = await compressImageFile(file);
          const meta = await extractPhotoMeta(file, gpsCoords);
          
          const cleanSiteAddress = getCleanSiteName(file.name);
          const finalGps = meta.gps;
          const captureDateStr = meta.captureDate;
          const plusCodeStr = await generatePlusCodeWithCityAsync(finalGps.lat, finalGps.lng);

          const capturedDevName = meta.deviceModel || getDeviceModelInfo();

          const newPhoto: Photo = {
            id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            url: dataUrl,
            fileName: file.name,
            siteName: cleanSiteAddress,
            uploadDate: new Date().toISOString(),
            captureDate: captureDateStr,
            uploaderId: user.id,
            uploaderName: user.name,
            staffMember: user.name,
            status: 'new',
            syncStatus: activeOnline ? 'synced' : 'pending',
            leadSource: 'Field Visit',
            site_lat: finalGps.lat,
            site_lng: finalGps.lng,
            gps: finalGps,
            plusCode: plusCodeStr,
            locationSource: meta.source,
            deviceInfo: capturedDevName
          };
          // Record route breadcrumb for staff member automatically
          addLocalBreadcrumb({
            lat: finalGps.lat,
            lng: finalGps.lng,
            timestamp: captureDateStr || new Date().toISOString(),
            plusCode: plusCodeStr,
            deviceInfo: capturedDevName,
            userId: user.id,
            userName: user.name
          });

          onUpload(newPhoto);
        }, 300);

      } else {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress, status: 'uploading' } : u));
      }
    }, 200);
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="bg-[#1A1515] min-h-screen pb-20 p-4">
      {/* Offline Banner */}
      {!activeOnline && (
        <div className="bg-[#3A2E2E] border border-orange-500/30 rounded-lg p-3 flex items-center gap-3 mb-6 shadow-lg shadow-black/50 animate-fade-in">
          <WifiOff className="text-field-gold" size={20} />
          <span className="text-field-gold text-sm font-medium">Offline Mode Active: Photos will automatically sync when network is connected</span>
        </div>
      )}

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          className="aspect-square bg-[#2D2424] border border-[#3A2E2E] rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-field-gold hover:bg-[#352b2b] transition-all group relative overflow-hidden"
          onClick={() => document.getElementById('camera-input')?.click()}
        >
          {/* Decorative Circles */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-20 h-20 rounded-full border-2 border-field-gold flex items-center justify-center text-field-gold shadow-[0_0_15px_rgba(217,144,38,0.2)] group-hover:scale-110 transition-transform">
             <Camera size={40} />
          </div>
          <div className="text-center">
             <h3 className="text-white font-bold text-lg leading-tight">Take<br/>Photo</h3>
          </div>
        </button>

        <button 
           className="aspect-square bg-[#2D2424] border border-[#3A2E2E] rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-field-gold hover:bg-[#352b2b] transition-all group relative overflow-hidden"
           onClick={() => document.getElementById('gallery-input')?.click()}
        >
          <div className="w-20 h-20 rounded-full border-2 border-field-gold flex items-center justify-center text-field-gold shadow-[0_0_15px_rgba(217,144,38,0.2)] group-hover:scale-110 transition-transform">
             <ImageIcon size={40} />
          </div>
          <div className="text-center">
             <h3 className="text-white font-bold text-lg leading-tight">Choose from<br/>Gallery</h3>
          </div>
        </button>

        {/* Hidden Inputs */}
        <input 
          type="file" 
          id="camera-input" 
          accept="image/*" 
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input 
          type="file" 
          id="gallery-input" 
          accept="image/*" 
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Pending Summary Card */}
      <div 
         onClick={onViewPending}
         className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-4 flex items-center justify-between mb-8 group cursor-pointer hover:border-field-gold/50 transition-colors"
      >
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1A1515] rounded-lg flex items-center justify-center text-field-gold border border-[#3A2E2E]">
               <ImageIcon size={24} />
               <span className="absolute top-[-2px] right-[-2px] flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-field-gold opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-field-gold"></span>
               </span>
            </div>
            <div>
               <h3 className="text-white font-bold">Photos Pending</h3>
               <p className="text-field-textMuted text-xs">Awaiting manager review</p>
            </div>
         </div>
         <div className="flex items-center text-field-gold text-sm font-medium">
            Review <ArrowRight size={16} className="ml-1" />
         </div>
      </div>

      {/* Upload List */}
      <div className="space-y-4">
         <h3 className="text-white font-bold text-lg flex items-center gap-2">
            Uploading {uploads.filter(u => u.status !== 'done').length} items...
            <span className="w-2 h-2 bg-field-gold rounded-full animate-pulse"></span>
         </h3>

         {uploads.map(upload => (
            <div key={upload.id} className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-3 flex gap-3 relative overflow-hidden">
               {/* Progress Bar Background */}
               <div 
                  className="absolute bottom-0 left-0 h-1 bg-field-gold transition-all duration-300" 
                  style={{ width: `${upload.progress}%` }}
               ></div>

               <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
                  <img src={upload.url} className="w-full h-full object-cover" />
               </div>
               
               <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-1">
                     <h4 className="text-white font-medium text-sm truncate max-w-[150px]">{upload.name}</h4>
                     {upload.status === 'done' ? (
                        <span className="text-xs text-green-500 font-bold">100%</span>
                     ) : (
                        <span className="text-xs text-field-gold font-bold">{Math.round(upload.progress)}%</span>
                     )}
                  </div>
                  
                  {upload.status === 'waiting' && <span className="text-xs text-field-textMuted">Waiting...</span>}
                  {upload.status === 'uploading' && <span className="text-xs text-field-gold animate-pulse">Uploading...</span>}
                  {upload.status === 'done' && <span className="text-xs text-green-500">Complete</span>}
               </div>

               <div className="flex items-center gap-2 pr-2">
                  {upload.status !== 'done' && (
                     <button className="text-field-textMuted hover:text-white" onClick={() => removeUpload(upload.id)}>
                        <X size={18} />
                     </button>
                  )}
                  {upload.status === 'waiting' && <button className="text-field-textMuted"><Pause size={18} /></button>}
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
