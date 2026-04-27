/**
 * Centralized color tokens for light and dark themes.
 * Used by both NativeWind classes and inline styles (tab bar, icons, ActivityIndicator).
 *
 * "Kveldsvakt" palette — destillert fra shiftpay-site/DESIGN.md. Warm coffee +
 * cream + burnt sienna. Dark mode is the primary (user preference). Light mode
 * lifted per a11y review (text-dim / accent contrast bumped to WCAG AA).
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  accent: string;
  accentMuted: string;
  accentSoft: string;
  warm: string;
  success: string;
  error: string;
  marine: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  tabActive: string;
  tabInactive: string;
}

/** Dark — "Kveldsvakt Natt". Primary/default palette. */
export const darkColors: ThemeColors = {
  bg: "#1A1614", // warm coffee black (was #0C0A09)
  surface: "#221D1A", // slight lift (was #1C1917)
  elevated: "#2A2422", // for cards-on-cards (was #292524)
  border: "rgba(245, 239, 228, 0.10)",

  accent: "#8B3E23", // accent-deep as default — WCAG AA vs cream = 8.85:1 (was #3B82F6)
  accentMuted: "#C65D3A", // burnt sienna for hover / active
  accentSoft: "#E8A57C", // myk aftenhimmel for links / highlights

  warm: "#F4D58D", // mykere oker (was #F59E0B)

  success: "#5B8B6F", // dempet skogrønn (was #10B981)
  error: "#D86B65", // rustrød — bumped from #B85450 in Pass 6b for WCAG AA (4.86:1 vs bg)
  marine: "#1E2A3A", // deep night blue — for shift-tint natt-variant

  textPrimary: "#F5EFE4", // cream, aldri ren hvit (was #F5F5F4)
  textSecondary: "#A8A095", // warm grey (was #A8A29E)
  textMuted: "#9A928A", // bumped for WCAG AA (was #78716C, 3.30:1)

  tabActive: "#C65D3A",
  tabInactive: "#756E64",
};

/** Light — "Kveldsvakt Morgen". Soft, warm, for those who prefer daylight. */
export const lightColors: ThemeColors = {
  bg: "#F5EFE4", // cream (was #FAFAF9)
  surface: "#FBF7ED", // litt lysere
  elevated: "#EFE7D5", // subtle cream grey

  border: "rgba(26, 22, 20, 0.12)",

  accent: "#8B3E23", // deep terracotta
  accentMuted: "#B85435", // mid terracotta
  accentSoft: "#9F3B20", // dypere for lys bg contrast

  warm: "#B8831D", // dypere oker for lys bg
  success: "#3D6B51",
  error: "#9F3B37",
  marine: "#3C5168",

  textPrimary: "#1A1614", // warm coffee
  textSecondary: "#5A544A", // varm grey (WCAG AA)
  textMuted: "#6B645A", // bumped from #756E64 in Pass 6b for WCAG AA (4.81:1 vs cream bg)

  tabActive: "#8B3E23",
  tabInactive: "#A8A095",
};

/** @deprecated Use useThemeColors() from theme-context instead. Kept for backward compat in non-component code. */
export const colors = darkColors;
