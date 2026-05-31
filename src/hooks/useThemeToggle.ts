import { useState } from 'react';

export const THEME_COLORS = [
  { name: 'Gold', value: '43 40% 54%', hex: '#bc9b59' },
  { name: 'Sapphire', value: '215 80% 55%', hex: '#2d7eed' },
  { name: 'Amethyst', value: '270 70% 60%', hex: '#9e59d9' },
  { name: 'Emerald', value: '150 80% 45%', hex: '#17ce67' },
  { name: 'Crimson', value: '350 80% 60%', hex: '#e63959' },
];

/**
 * Shared hook for theme toggle logic.
 * Eliminates duplicated theme init + toggle in FloatingDashboardNav and FloatingNavBar.
 */
export const useThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('gryf-theme');
    const isLight = stored === 'light';
    if (isLight) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    return !isLight;
  });

  const [brandColor, setBrandColor] = useState(() => {
    const storedColor = localStorage.getItem('gryf-brand-color');
    const color = storedColor || '43 40% 54%';
    document.documentElement.style.setProperty('--brand-color', color);
    return color;
  });

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('gryf-theme', newDark ? 'dark' : 'light');
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const changeBrandColor = (color: string) => {
    document.documentElement.style.setProperty('--brand-color', color);
    setBrandColor(color);
    localStorage.setItem('gryf-brand-color', color);
  };

  return { isDark, toggleTheme, brandColor, changeBrandColor };
};
