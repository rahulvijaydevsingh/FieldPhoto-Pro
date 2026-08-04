import React, { useState, useEffect } from 'react';
import { Shield, Zap, Power, Layers, CheckCircle2, AlertTriangle, Radio, Clock, Save } from 'lucide-react';
import { settingsRepository } from '../../../repositories/settingsRepository';
import { TelemetryTrainManager } from '../../../system/sync/TelemetryTrainManager';

export default function TelemetryTrainConfigCard() {
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(true);
  const [trainDispatchIntervalMs, setTrainDispatchIntervalMs] = useState<number>(300000);
  const [heartbeatIntervalMs, setHeartbeatIntervalMs] = useState<number>(60000);
  const [cutoverTs, setCutoverTs] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = settingsRepository.subscribe((settings) => {
      if (settings) {
        if (settings.telemetryEnabled !== undefined) {
          setTelemetryEnabled(settings.telemetryEnabled);
        }
        if (settings.trainDispatchIntervalMs !== undefined) {
          setTrainDispatchIntervalMs(settings.trainDispatchIntervalMs);
        }
        if (settings.heartbeatIntervalMs !== undefined) {
          setHeartbeatIntervalMs(settings.heartbeatIntervalMs);
        }
        if (settings.trainCutoverTimestamp !== undefined) {
          setCutoverTs(settings.trainCutoverTimestamp || 0);
        }
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

  const handleSetCutoverNow = async () => {
    setIsSaving(true);
    const now = Date.now();
    try {
      await settingsRepository.save({
        trainCutoverTimestamp: now,
      });
      setCutoverTs(now);
      setSaveMessage('Migration cutover timestamp set to current time. Legacy individual breadcrumbs before this timestamp will be filtered out.');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.warn('Failed to save cutover timestamp:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveIntervals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsRepository.save({
        trainDispatchIntervalMs,
        heartbeatIntervalMs,
      });
      setSaveMessage('Interval configurations updated successfully!');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.warn('Failed to save intervals:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = async (dispatchSec: number, heartbeatSec: number, presetName: string) => {
    setIsSaving(true);
    const dispatchMs = dispatchSec * 1000;
    const heartbeatMs = heartbeatSec * 1000;
    setTrainDispatchIntervalMs(dispatchMs);
    setHeartbeatIntervalMs(heartbeatMs);
    try {
      await settingsRepository.save({
        trainDispatchIntervalMs: dispatchMs,
        heartbeatIntervalMs: heartbeatMs,
      });
      setSaveMessage(`Applied preset: ${presetName}! Sync parameters updated.`);
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.warn('Failed to save preset:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-6 space-y-5">
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSetCutoverNow}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all"
            title="Set migration cutover timestamp to now to filter out older legacy individual breadcrumbs"
          >
            {cutoverTs ? `Cutover: ${new Date(cutoverTs).toLocaleTimeString()}` : 'Set Migration Cutover (Now)'}
          </button>

          <button
            type="button"
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
      </div>

      {saveMessage && (
        <div className="p-3 rounded-lg bg-[#D99026]/10 border border-[#D99026]/30 text-xs text-[#D99026] font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={14} className="text-[#D99026]" />
          {saveMessage}
        </div>
      )}

      {/* Interval Form & Quick Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[#1A1515] p-5 rounded-xl border border-[#3A2E2E]">
        <form onSubmit={handleSaveIntervals} className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#3A2E2E]/40 pb-2">
            <Clock size={16} className="text-[#D99026]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Sync Interval Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-400 font-bold uppercase">
                Telemetry Train Dispatch Interval (Seconds)
              </label>
              <input
                type="number"
                min="5"
                value={Math.round(trainDispatchIntervalMs / 1000)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setTrainDispatchIntervalMs(val * 1000);
                }}
                className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#D99026]"
              />
              <p className="text-[10px] text-gray-500">How often telemetry trains are pushed to Firestore</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-400 font-bold uppercase">
                Presence Heartbeat Interval (Seconds)
              </label>
              <input
                type="number"
                min="5"
                value={Math.round(heartbeatIntervalMs / 1000)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setHeartbeatIntervalMs(val * 1000);
                }}
                className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#D99026]"
              />
              <p className="text-[10px] text-gray-500">How often staff online presence updates are recorded</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-[#D99026] hover:bg-[#b57b17] text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save Interval Settings'}
          </button>
        </form>

        <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-[#3A2E2E] pt-4 lg:pt-0 lg:pl-6">
          <div className="flex items-center gap-2 border-b border-[#3A2E2E]/40 pb-2">
            <Zap size={16} className="text-[#D99026]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Quick Preset Activations</span>
          </div>

          <p className="text-[11px] text-gray-400">
            Instantly set and apply recommended synchronization parameters for standard operational scenarios.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => applyPreset(60, 15, "⚡ 1 Min Test")}
              disabled={isSaving}
              className="p-3 bg-[#2D2424] hover:bg-[#3A2E2E] border border-[#3A2E2E] rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-xs font-bold text-white">⚡ 1 Min Test</div>
              <div className="text-[10px] text-[#D99026] font-semibold mt-1">Dispatch: 60s</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Heartbeat: 15s</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset(300, 60, "⏱️ 5 Min Standard")}
              disabled={isSaving}
              className="p-3 bg-[#2D2424] hover:bg-[#3A2E2E] border border-[#3A2E2E] rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-xs font-bold text-white">⏱️ 5 Min Std</div>
              <div className="text-[10px] text-[#D99026] font-semibold mt-1">Dispatch: 5m</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Heartbeat: 1m</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset(900, 180, "🔋 15 Min Battery Saver")}
              disabled={isSaving}
              className="p-3 bg-[#2D2424] hover:bg-[#3A2E2E] border border-[#3A2E2E] rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-xs font-bold text-white">🔋 15 Min Saver</div>
              <div className="text-[10px] text-[#D99026] font-semibold mt-1">Dispatch: 15m</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Heartbeat: 3m</div>
            </button>
          </div>
        </div>
      </div>

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
