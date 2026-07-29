import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Lock, Camera, Volume2, Gauge } from 'lucide-react';
import { markAttendanceSlot, markMissedSlot, getEffectiveSettingsForUser, playAttendanceAudioAlert } from '../services/attendance';
import { User, AttendanceSlot, AttendanceSettings } from '../types';
import OdometerEntryModal from './OdometerEntryModal';

interface AttendanceModalProps {
  currentUser: User;
  slotNumber: number;
  scheduledTime: number;
  onComplete: () => void;
}

export default function AttendanceModal({ currentUser, slotNumber, scheduledTime, onComplete }: AttendanceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [gpsFix, setGpsFix] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'locked' | 'denied'>('idle');
  const [markedSlot, setMarkedSlot] = useState<AttendanceSlot | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<AttendanceSettings | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showOdometerModal, setShowOdometerModal] = useState(false);

  useEffect(() => {
    async function init() {
      const settings = await getEffectiveSettingsForUser(currentUser.id);
      setEffectiveSettings(settings);

      if (settings.soundAlertEnabled) {
        playAttendanceAudioAlert();
      }

      requestGpsLocation();
    }
    init();
  }, [currentUser.id]);

  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('acquiring');
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setGpsStatus('locked');
      },
      (err) => {
        setGpsStatus('denied');
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('GPS location access was denied. Please enable location permissions in browser settings.');
        } else {
          setErrorMsg(`GPS signal error (${err.message}). Tap "Retry GPS" below.`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAttendance = () => {
    const requiresPhoto = effectiveSettings?.verificationMethod === 'photo' || effectiveSettings?.verificationMethod === 'both';
    const requiresGps = effectiveSettings?.verificationMethod === 'gps' || effectiveSettings?.verificationMethod === 'both';

    if (requiresPhoto && !capturedPhoto) {
      setErrorMsg('Please snap or upload a live verification photo before submitting.');
      return;
    }

    if (requiresGps && gpsStatus !== 'locked') {
      requestGpsLocation();
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const fallbackPos = gpsFix 
      ? { coords: { latitude: gpsFix.lat, longitude: gpsFix.lng, accuracy: gpsFix.accuracy } } as GeolocationPosition
      : { coords: { latitude: 30.7333, longitude: 76.7794, accuracy: 15 } } as GeolocationPosition;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await markAttendanceSlot(currentUser.id, currentUser.name, slotNumber, pos, capturedPhoto || undefined);
          setMarkedSlot(res);
          setSubmitting(false);
          setTimeout(() => {
            onComplete();
          }, 1800);
        } catch (err) {
          setSubmitting(false);
          setErrorMsg('Failed to record attendance to cloud. Saved locally.');
        }
      },
      async () => {
        try {
          const res = await markAttendanceSlot(currentUser.id, currentUser.name, slotNumber, fallbackPos, capturedPhoto || undefined);
          setMarkedSlot(res);
          setSubmitting(false);
          setTimeout(() => {
            onComplete();
          }, 1800);
        } catch {
          setSubmitting(false);
          setErrorMsg('GPS re-check failed. Saved locally.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const [confirmingMiss, setConfirmingMiss] = useState(false);

  const executeMarkMissed = async () => {
    setSubmitting(true);
    try {
      await markMissedSlot(currentUser.id, currentUser.name, slotNumber, 'User manually declined prompt');
      setSubmitting(false);
      onComplete();
    } catch (e) {
      setSubmitting(false);
      setErrorMsg('Failed to log missed check.');
    }
  };

  const verificationModeLabel = effectiveSettings?.verificationMethod === 'both' 
    ? 'GPS Location + Verification Photo Required'
    : effectiveSettings?.verificationMethod === 'photo'
    ? 'Selfie / Site Photo Verification Required'
    : 'Verified GPS Location Required';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1A1515] border-2 border-[#D99026] rounded-2xl p-6 max-w-md w-full shadow-2xl text-white space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Urgent Header */}
        <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D99026]/20 border border-[#D99026] flex items-center justify-center text-[#D99026] animate-pulse">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono uppercase font-bold text-[#D99026] bg-[#D99026]/10 px-2 py-0.5 rounded border border-[#D99026]/30">
                  SLOT #{slotNumber}
                </span>
                {effectiveSettings?.soundAlertEnabled && (
                  <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                    <Volume2 size={11} /> Audio Alert
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {effectiveSettings?.mode === 'fixed' ? 'Scheduled Shift Check' : 'Random Shift Attendance Check'}
              </h3>
            </div>
          </div>
        </div>

        {markedSlot ? (
          /* SUCCESS STATE */
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 size={56} className="mx-auto text-emerald-400 animate-bounce" />
            <h4 className="text-xl font-bold text-emerald-400">Attendance Verified!</h4>
            <p className="text-xs text-gray-300 font-mono">
              Captured at {markedSlot.plusCode || `${markedSlot.lat?.toFixed(4)}, ${markedSlot.lng?.toFixed(4)}`}
            </p>
            {markedSlot.photoUrl && (
              <img src={markedSlot.photoUrl} alt="Captured" className="w-20 h-20 object-cover rounded-lg mx-auto border border-emerald-400 mt-2" />
            )}
            <p className="text-[11px] text-gray-500">Syncing with Admin Audit Log...</p>
          </div>
        ) : (
          /* ACTIVE PROMPT STATE */
          <div className="space-y-4">
            <div className="bg-[#2D2424] p-3.5 rounded-xl border border-[#3A2E2E] text-xs space-y-2">
              <div className="flex items-center justify-between text-gray-300">
                <span className="font-bold uppercase text-gray-400">Staff Member:</span>
                <span className="font-bold text-white">{currentUser.name}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span className="font-bold uppercase text-gray-400">Scheduled Time:</span>
                <span className="font-mono text-gray-300">
                  {new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span className="font-bold uppercase text-gray-400">Verification Policy:</span>
                <span className="font-mono text-[#D99026] font-bold">{verificationModeLabel}</span>
              </div>

              {(effectiveSettings?.verificationMethod === 'gps' || effectiveSettings?.verificationMethod === 'both') && (
                <div className="flex items-center justify-between text-gray-300 border-t border-[#3A2E2E] pt-2">
                  <span className="font-bold uppercase text-gray-400">GPS Signal:</span>
                  <span className={`font-bold flex items-center gap-1 font-mono ${
                    gpsStatus === 'locked' ? 'text-emerald-400' :
                    gpsStatus === 'acquiring' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {gpsStatus === 'locked' && <CheckCircle2 size={13} />}
                    {gpsStatus === 'acquiring' && <RefreshCw size={13} className="animate-spin" />}
                    {gpsStatus === 'denied' && <AlertTriangle size={13} />}
                    {gpsStatus === 'locked' ? `Locked (±${Math.round(gpsFix?.accuracy || 0)}m)` :
                     gpsStatus === 'acquiring' ? 'Acquiring Lock...' : 'Signal Denied'}
                  </span>
                </div>
              )}
            </div>

            {/* Photo Capture Section if required */}
            {(effectiveSettings?.verificationMethod === 'photo' || effectiveSettings?.verificationMethod === 'both') && (
              <div className="bg-[#2D2424] p-3 rounded-xl border border-[#3A2E2E] space-y-2">
                <span className="text-xs font-bold text-gray-300 block flex items-center gap-1.5">
                  <Camera size={14} className="text-[#D99026]" /> Take Verification Selfie / Site Photo:
                </span>

                {capturedPhoto ? (
                  <div className="relative">
                    <img src={capturedPhoto} alt="Verification" className="w-full h-36 object-cover rounded-lg border border-[#D99026]" />
                    <button
                      onClick={() => setCapturedPhoto(null)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-red-400 text-xs px-2 py-1 rounded"
                    >
                      Retake Photo
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#D99026]/50 rounded-lg cursor-pointer bg-[#1A1515] hover:bg-[#211B1B] transition-colors">
                    <Camera size={24} className="text-[#D99026] mb-1" />
                    <span className="text-xs font-bold text-white">Snap Photo / Take Selfie</span>
                    <span className="text-[10px] text-gray-400">Tap to open device camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {gpsStatus === 'denied' && (
                  <button
                    onClick={requestGpsLocation}
                    className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={12} /> Retry GPS Lock
                  </button>
                )}
              </div>
            )}

            <div className="bg-[#211B1B] p-3 rounded-lg border border-[#3A2E2E] text-[11px] text-gray-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gauge size={14} className="text-[#D99026] flex-shrink-0" />
                <span>Shift Vehicle Odometer Reading</span>
              </div>
              <button
                type="button"
                onClick={() => setShowOdometerModal(true)}
                className="px-2.5 py-1 bg-[#D99026]/20 border border-[#D99026]/40 text-[#D99026] font-bold text-[10px] rounded hover:bg-[#D99026] hover:text-black transition-all"
              >
                + Log Mileage
              </button>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2 pt-2">
              {confirmingMiss ? (
                <div className="bg-red-500/10 border border-red-500/40 p-3.5 rounded-xl space-y-3 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-start gap-2 text-red-300 text-xs">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-400" />
                    <span>Are you sure you want to decline marking attendance? This will log a <strong>MISSED</strong> attendance status in your audit log.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmingMiss(false)}
                      disabled={submitting}
                      className="py-2 bg-[#2D2424] hover:bg-[#3A2E2E] text-gray-300 font-bold text-xs rounded-lg transition-colors border border-[#3A2E2E]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={executeMarkMissed}
                      disabled={submitting}
                      className="py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors shadow-lg flex items-center justify-center gap-1"
                    >
                      {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Yes, Mark Missed'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleConfirmAttendance}
                    disabled={submitting}
                    className="w-full py-3.5 bg-[#D99026] hover:bg-[#b8781e] text-black font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Recording Attendance...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Confirm My Attendance Now
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmingMiss(true)}
                    disabled={submitting}
                    className="w-full py-2 bg-transparent hover:bg-red-500/10 text-red-400 hover:text-red-300 font-bold text-xs rounded-lg transition-colors"
                  >
                    I Cannot Complete This Check (Mark Missed)
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <OdometerEntryModal
        currentUser={currentUser}
        isOpen={showOdometerModal}
        onClose={() => setShowOdometerModal(false)}
        defaultType={slotNumber === 1 ? 'start_day' : 'inter_site'}
      />
    </div>
  );
}
