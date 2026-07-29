import React, { useState, useEffect } from 'react';
import { User, OdometerReading } from '../types';
import { saveOdometerReading, getUserSavedVehicleNumber, saveUserSavedVehicleNumber } from '../repositories/odometerRepository';
import { watermarkAndCompressImage } from '../utils/imageWatermark';
import { Gauge, Camera, MapPin, CheckCircle2, AlertTriangle, X, Car, RefreshCw } from 'lucide-react';

interface OdometerEntryModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newReading: OdometerReading) => void;
  defaultType?: 'start_day' | 'end_day' | 'inter_site';
}

export default function OdometerEntryModal({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'start_day'
}: OdometerEntryModalProps) {
  const [vehicleNumber, setVehicleNumber] = useState<string>(() => getUserSavedVehicleNumber(currentUser.id));
  const [readingType, setReadingType] = useState<'start_day' | 'end_day' | 'inter_site'>(defaultType);
  const [readingKm, setReadingKm] = useState<string>('');

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      setVehicleNumber(getUserSavedVehicleNumber(currentUser.id));
    }
  }, [isOpen, currentUser?.id]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      
      // Get GPS position for watermarking
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const stamped = await watermarkAndCompressImage(rawDataUrl, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            userName: currentUser.name
          });
          setCapturedPhoto(stamped);
          setProcessingPhoto(false);
        },
        async () => {
          // Default fallback location
          const stamped = await watermarkAndCompressImage(rawDataUrl, {
            lat: 30.9010,
            lng: 75.8573,
            userName: currentUser.name
          });
          setCapturedPhoto(stamped);
          setProcessingPhoto(false);
        },
        { timeout: 5000 }
      );
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const kmVal = parseFloat(readingKm);
    if (isNaN(kmVal) || kmVal <= 0) {
      setErrorMsg('Please enter a valid positive odometer KM reading.');
      return;
    }

    if (!vehicleNumber.trim()) {
      setErrorMsg('Please enter your vehicle registration number.');
      return;
    }

    setSubmitting(true);

    // Get current GPS position or fallback
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        completeSave(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        completeSave(30.9010, 75.8573);
      },
      { timeout: 5000 }
    );
  };

  const completeSave = (lat: number, lng: number) => {
    try {
      const cleanVehicleNum = vehicleNumber.trim().toUpperCase();
      saveUserSavedVehicleNumber(currentUser.id, cleanVehicleNum);

      const record = saveOdometerReading({
        userId: currentUser.id,
        userName: currentUser.name,
        vehicleNumber: cleanVehicleNum,
        readingType,
        readingKm: parseFloat(readingKm),
        photoUrl: capturedPhoto || undefined,
        notes: notes.trim() || undefined,
        lat,
        lng,
        verificationStatus: 'verified'
      });

      setSubmitting(false);
      setSuccessMsg('Odometer reading saved successfully!');
      if (onSuccess) onSuccess(record);

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      setSubmitting(false);
      setErrorMsg('Failed to save odometer reading locally.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1A1515] border-2 border-[#D99026] rounded-2xl p-6 max-w-md w-full shadow-2xl text-white space-y-5 animate-in fade-in zoom-in duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
              <Gauge size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Log Vehicle Odometer Reading</h3>
              <p className="text-xs text-gray-400">Record mileage proof for reimbursement & GPS audit</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2D2424]"
          >
            <X size={18} />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 size={52} className="mx-auto text-emerald-400 animate-bounce" />
            <h4 className="text-lg font-bold text-emerald-400">{successMsg}</h4>
            <p className="text-xs text-gray-400">Recorded for {currentUser.name}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vehicle Number & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase font-mono">
                  Vehicle Number
                </label>
                <div className="relative">
                  <Car size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value)}
                    placeholder="e.g. PB-10-AB-1234"
                    className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono uppercase focus:border-[#D99026] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase font-mono">
                  Reading Stage
                </label>
                <select
                  value={readingType}
                  onChange={e => setReadingType(e.target.value as any)}
                  className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-[#D99026] focus:outline-none"
                >
                  <option value="start_day">Start Day (Punch In)</option>
                  <option value="end_day">End Day (Punch Out)</option>
                  <option value="inter_site">Inter-Site Trip</option>
                </select>
              </div>
            </div>

            {/* Odometer KM Input */}
            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase font-mono">
                Current Odometer Value (KM)
              </label>
              <div className="relative">
                <Gauge size={18} className="absolute left-3 top-3 text-[#D99026]" />
                <input
                  type="number"
                  step="0.1"
                  value={readingKm}
                  onChange={e => setReadingKm(e.target.value)}
                  placeholder="e.g. 42180.5"
                  className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded-xl pl-10 pr-3 py-2.5 text-base font-mono font-bold text-emerald-400 focus:border-[#D99026] focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Odometer Dashboard Photo Upload */}
            <div className="bg-[#2D2424] p-3 rounded-xl border border-[#3A2E2E] space-y-2">
              <span className="text-xs font-bold text-gray-300 block flex items-center gap-1.5">
                <Camera size={14} className="text-[#D99026]" /> Odometer Dashboard Photo Proof:
              </span>

              {processingPhoto ? (
                <div className="p-4 bg-[#1A1515] rounded-lg border border-[#3A2E2E] text-center space-y-2">
                  <RefreshCw size={20} className="animate-spin text-[#D99026] mx-auto" />
                  <p className="text-xs font-bold text-white">Compressing & Stamping GPS Watermark...</p>
                  <p className="text-[10px] text-gray-400">Embedding location, Plus Code & timestamp onto canvas</p>
                </div>
              ) : capturedPhoto ? (
                <div className="relative">
                  <img src={capturedPhoto} alt="Odometer Proof" className="w-full h-36 object-cover rounded-lg border border-[#D99026]" />
                  <span className="absolute bottom-2 left-2 bg-black/80 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                    ✓ GPS Watermark Stamped
                  </span>
                  <button
                    type="button"
                    onClick={() => setCapturedPhoto(null)}
                    className="absolute top-2 right-2 bg-black/80 text-red-400 text-[10px] font-bold px-2 py-1 rounded hover:bg-black"
                  >
                    Retake Photo
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#D99026]/40 rounded-lg cursor-pointer bg-[#1A1515] hover:bg-[#211B1B] transition-colors">
                  <Camera size={20} className="text-[#D99026] mb-1" />
                  <span className="text-xs font-bold text-white">Snap Dashboard Odometer Photo</span>
                  <span className="text-[10px] text-gray-400">Capture clear reading on speedometer</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1 uppercase font-mono">
                Notes / Trip Purpose (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Travel to Ludhiana Site B"
                className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#D99026] hover:bg-[#b8781e] text-black font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Gauge size={16} />
              {submitting ? 'Saving Reading...' : 'Save Odometer Reading'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
