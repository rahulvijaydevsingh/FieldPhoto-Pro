import { useState, useEffect } from 'react';
import { User, AttendanceDay, AttendanceSlot } from '../types';
import { ensureTodaySchedule, isAttendanceEnabled, subscribeAttendanceToday } from '../services/attendance';

export function useRandomAttendanceCheck(currentUser: User | null) {
  const [activeSlot, setActiveSlot] = useState<{ slotNumber: number; scheduledTime: number } | null>(null);
  const [schedule, setSchedule] = useState<AttendanceDay | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    let unsub: (() => void) | null = null;

    async function initSchedule() {
      if (!currentUser) return;
      const enabled = await isAttendanceEnabled(currentUser.id);
      if (!enabled) return;

      const daySchedule = await ensureTodaySchedule(currentUser.id, currentUser.name);
      setSchedule(daySchedule);

      unsub = subscribeAttendanceToday(currentUser.id, (realtimeDay) => {
        if (realtimeDay) {
          setSchedule(realtimeDay);
        }
      });
    }

    initSchedule();

    return () => {
      if (unsub) unsub();
    };
  }, [currentUser?.id]);

  // Periodic evaluator: checks every 10 seconds if any slot is due
  useEffect(() => {
    if (!currentUser || !schedule || !schedule.slots) return;

    const checkSlots = () => {
      const now = Date.now();
      for (const s of schedule.slots) {
        if (s.status === 'pending' && now >= s.scheduledAt) {
          setActiveSlot({
            slotNumber: s.slot,
            scheduledTime: s.scheduledAt
          });
          break; // Show one active slot modal at a time
        }
      }
    };

    checkSlots();
    const timer = setInterval(checkSlots, 10000);

    return () => clearInterval(timer);
  }, [currentUser?.id, schedule]);

  const dismissModal = () => {
    setActiveSlot(null);
  };

  return {
    activeSlot,
    dismissModal
  };
}
