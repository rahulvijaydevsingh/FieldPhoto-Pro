import React, { useState, useEffect } from 'react';
import { Shield, Zap, Power, Layers, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import { settingsRepository } from '../../../repositories/settingsRepository';
import { TelemetryTrainManager } from '../../../system/sync/TelemetryTrainManager';

export default function TelemetryTrainConfigCard() {
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = settingsRepository.subscribe((settings) => {
      if (settings && settings.telemetryEnabled !== undefined) {
        setTelemetryEnabled(settings.telemetryEnabled);
      }
    });
    return () => unsub();
  }, []);

  const handleToggleTelemetry = async () => {
    setIsSaving(true);
    const nextState = !telemetryEnabled;
    setTelemetryEnabled(nextState);
    TelemetryTrainManager.getInstance().setTelemetryEnabled(nextState);
    try {
      await settingsRepository.save({
        telemetryEnabled: nextState,
      });
      setSaveMessage(nextState ? 'Telemetry Train System Enabled (1-Write Bundling)' : 'Telemetry Kill-Switch Activated (All GPS pings disabled)');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.warn('Failed to save telemetry setting:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-[#D99026]" size={20} />
            <h3 className="text-lg font-bold text-white">Telemetry Train Single-Write System (Phase 1–10)</h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Replaces 40,000+ individual daily Firestore GPS & presence writes with single bundled train documents.
          </p>
        </div>

        <button
          onClick={handleToggleTelemetry}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            telemetryEnabled
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30'
              : 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30'
          }`}
        >
          <Power size={14} />
          {telemetryEnabled ? 'STATUS: ENABLED (1-WRITE BUNDLING)' : 'KILL-SWITCH: TELEMETRY DISABLED'}
        </button>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-lg bg-[#D99026]/10 border border-[#D99026]/30 text-xs text-[#D99026] font-bold flex items-center gap-2">
          <CheckCircle2 size={14} />
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
          <div className="font-bold text-gray-300 flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" /> Phase 1–3: Bundling
          </div>
          <div className="text-gray-400 text-[11px]">
            GPS breadcrumbs & priority events are bundled into single train docs (<code className="text-amber-400">telemetry_train</code>).
          </div>
        </div>

        <div className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
          <div className="font-bold text-gray-300 flex items-center gap-1.5">
            <Radio size={14} className="text-blue-400" /> Phase 6: Presence Absorption
          </div>
          <div className="text-gray-400 text-[11px]">
            Online presence heartbeats & geofence events piggyback inside trains. Zero independent periodic writes.
          </div>
        </div>

        <div className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
          <div className="font-bold text-gray-300 flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-400" /> Phase 7: Kill-Switch
          </div>
          <div className="text-gray-400 text-[11px]">
            Remote kill-switch instantly stops background GPS collection across all connected staff client devices.
          </div>
        </div>

        <div className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
          <div className="font-bold text-gray-300 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-purple-400" /> Phase 10: 500KB Safety Valve
          </div>
          <div className="text-gray-400 text-[11px]">
            Automatic chunking & sequence index de-duplication prevents Firestore 1MB document limit overflows.
          </div>
        </div>
      </div>
    </div>
  );
}
