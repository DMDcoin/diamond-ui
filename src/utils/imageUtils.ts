'use client';

export const getThemeImagePath = (filename: string, theme: 'light' | 'dark') => {
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  const themeFolder = safeTheme === 'light' ? 'light-theme' : 'dark-theme';
  
  const basePath = '/images/vectors';
  const fullPath = `${basePath}/${themeFolder}/${filename}`;
  
  return fullPath;
};
