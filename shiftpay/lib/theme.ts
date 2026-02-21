/**
 * Centralized color tokens for light and dark themes.
 * Used by both NativeWind classes and inline styles (tab bar, icons, ActivityIndicator).
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  accent: string;
  accentMuted: string;
  warm: string;
  success: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  tabActive: string;
  tabInactive: string;
}

export const darkColors: ThemeColors = {
  bg: '#0F172A',
  surface: '#1E293B',
  elevated: '#334155',
  border: 'rgba(255,255,255,0.08)',
  accent: '#38BDF8',
  accentMuted: '#0EA5E9',
  warm: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  tabActive: '#38BDF8',
  tabInactive: '#64748B',
};

export const lightColors: ThemeColors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  elevated: '#F1F5F9',
  border: '#E2E8F0',
  accent: '#0284C7',
  accentMuted: '#0369A1',
  warm: '#D97706',
  success: '#059669',
  error: '#DC2626',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  tabActive: '#0284C7',
  tabInactive: '#94A3B8',
};

/** @deprecated Use useThemeColors() from theme-context instead. Kept for backward compat in non-component code. */
export const colors = darkColors;
