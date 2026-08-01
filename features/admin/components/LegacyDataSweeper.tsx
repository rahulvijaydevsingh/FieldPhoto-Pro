import React, { useState } from 'react';
import { collection, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';

export const LegacyDataSweeper: React.FC = () => {
  const [isCleaning, setIsCleaning] = useState(false);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runLegacySweep = async () => {
    setIsCleaning(true);
    setError(null);
    setDeletedCount(0);

    try {
      const configSnap = await getDoc(doc(db, 'app_settings', 'global_config'));
      const cutoverTs = configSnap.data()?.trainCutoverTimestamp || 0;

      if (!cutoverTs) {
        setError('No Cutover Timestamp found in app_settings. Legacy sweep aborted.');
        setIsCleaning(false);
        return;
      }

      const snap = await getDocs(collection(db, 'route_breadcrumbs'));
      let removed = 0;

      for (const documentSnap of snap.docs) {
        const data = documentSnap.data();
        if (data.type !== 'telemetry_train') {
          const docTs = new Date(data.timestamp || 0).getTime();
          if (docTs < cutoverTs) {
            await deleteDoc(doc(db, 'route_breadcrumbs', documentSnap.id));
            removed++;
          }
        }
      }

      setDeletedCount(removed);
    } catch (err: any) {
      setError(err?.message || 'Error executing legacy sweep');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="bg-slate-800 text-slate-100 p-4 rounded-xl border border-slate-700 space-y-3">
      <h3 className="font-bold text-lg text-amber-400">Database Optimization: Legacy Data Sweeper</h3>
      <p className="text-sm text-slate-300">
        Purges legacy individual breadcrumb documents created prior to the telemetry train cutover date to minimize cloud storage & read costs.
      </p>

      {error && <div className="p-2 bg-red-900/50 border border-red-500 text-red-200 text-xs rounded">{error}</div>}
      {deletedCount !== null && (
        <div className="p-2 bg-emerald-900/50 border border-emerald-500 text-emerald-200 text-xs rounded">
          Successfully purged {deletedCount} legacy records!
        </div>
      )}

      <button
        onClick={runLegacySweep}
        disabled={isCleaning}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-slate-950 font-semibold text-sm rounded-lg transition"
      >
        {isCleaning ? 'Sweeping Firestore...' : 'Run Legacy Sweep'}
      </button>
    </div>
  );
};
