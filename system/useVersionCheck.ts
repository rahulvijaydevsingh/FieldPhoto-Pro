import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';

const SERVER_APP_VERSION = '2.5.0';

export function useVersionCheck() {
  const setAppVersionNotice = useAppStore(s => s.setAppVersionNotice);

  useEffect(() => {
    const checkServerVersion = () => {
      const storedVersion = localStorage.getItem('fieldops_app_version');
      if (!storedVersion) {
        localStorage.setItem('fieldops_app_version', SERVER_APP_VERSION);
      } else if (storedVersion !== SERVER_APP_VERSION) {
        setAppVersionNotice(`New server update (v${SERVER_APP_VERSION}) deployed! Refreshing app...`);
        localStorage.setItem('fieldops_app_version', SERVER_APP_VERSION);
        setTimeout(() => window.location.reload(), 2200);
      }
    };

    checkServerVersion();
    const timer = setInterval(checkServerVersion, 20 * 60 * 1000);
    window.addEventListener('focus', checkServerVersion);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', checkServerVersion);
    };
  }, [setAppVersionNotice]);
}
