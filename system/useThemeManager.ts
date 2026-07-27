import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';

export function useThemeManager() {
  const currentUser = useAppStore(s => s.currentUser);

  useEffect(() => {
    const theme = currentUser?.themePreference || 'dark';
    const root = document.documentElement;
    if (theme === 'light') {
      root.className = 'theme-light';
    } else if (theme === 'high-contrast') {
      root.className = 'theme-high-contrast';
    } else {
      root.className = '';
    }
  }, [currentUser?.themePreference]);
}
