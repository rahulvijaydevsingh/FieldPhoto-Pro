import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';

export function useNightlyLogout() {
  const currentUser = useAppStore(s => s.currentUser);
  const setNightlyLogoutNotice = useAppStore(s => s.setNightlyLogoutNotice);
  const handleLogout = useAppStore(s => s.handleLogout);

  useEffect(() => {
    if (!currentUser) return;

    const check11pmCutoff = () => {
      const now = new Date();
      if (now.getHours() >= 23) {
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const lastCutoffDate = localStorage.getItem(`fieldops_last_cutoff_date_${currentUser.id}`);

        if (lastCutoffDate !== todayStr) {
          localStorage.setItem(`fieldops_last_cutoff_date_${currentUser.id}`, todayStr);
          sessionStorage.setItem('auto_logout_11pm_notice', 'true');
          setNightlyLogoutNotice(true);
          handleLogout();
        }
      }
    };

    check11pmCutoff();
    const interval = setInterval(check11pmCutoff, 20000);
    return () => clearInterval(interval);
  }, [currentUser?.id, handleLogout, setNightlyLogoutNotice]);
}
