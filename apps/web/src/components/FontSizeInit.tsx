'use client';

import { useEffect } from 'react';

const FONT_SIZES: Record<string, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

export default function FontSizeInit() {
  useEffect(() => {
    const level = localStorage.getItem('fontSizeLevel') || 'medium';
    const size = FONT_SIZES[level] || 16;
    document.documentElement.style.fontSize = `${size}px`;
  }, []);

  return null;
}

/** Apply font size from any component (e.g. settings page) */
export function applyFontSize(level: string) {
  const size = FONT_SIZES[level] || 16;
  document.documentElement.style.fontSize = `${size}px`;
  localStorage.setItem('fontSizeLevel', level);
}

export function getFontSizeLevel(): string {
  if (typeof window === 'undefined') return 'medium';
  return localStorage.getItem('fontSizeLevel') || 'medium';
}

export const FONT_SIZE_OPTIONS = [
  { key: 'small', label: '작게', desc: '14px', size: 14 },
  { key: 'medium', label: '보통', desc: '16px (기본)', size: 16 },
  { key: 'large', label: '크게', desc: '18px', size: 18 },
  { key: 'xlarge', label: '매우 크게', desc: '20px', size: 20 },
];
