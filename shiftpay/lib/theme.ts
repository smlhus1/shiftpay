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
  bg: '#0C0A09',
  surface: '#1C1917',
  elevated: '#292524',
  border: 'rgba(255,255,255,0.08)',
  accent: '#3B82F6',
  accentMuted: '#2563EB',
  warm: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  textPrimary: '#F5F5F4',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',
  tabActive: '#3B82F6',
  tabInactive: '#78716C',
};

export const lightColors: ThemeColors = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  elevated: '#F5F5F4',
  border: '#E7E5E4',
  accent: '#1D4ED8',
  accentMuted: '#1E40AF',
  warm: '#D97706',
  success: '#059669',
  error: '#DC2626',
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  tabActive: '#1D4ED8',
  tabInactive: '#A8A29E',
};

/** @deprecated Use useThemeColors() from theme-context instead. Kept for backward compat in non-component code. */
export const colors = darkColors;
