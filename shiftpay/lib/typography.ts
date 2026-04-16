/**
 * Typography tokens for "Kveldsvakt Mobile" direction.
 *
 * Three families, loaded via @expo-google-fonts (bundled self-hosted):
 *   - Fraunces: display serif — headings, editorial margin-notes
 *   - InterTight: body sans — readable on small screens, tighter than Inter
 *   - JetBrainsMono: all numbers — amounts, times, rates (tabular-nums)
 *
 * Usage:
 *   <Text style={typography.screenTitle}>God kveld, Kari.</Text>
 *   <Text style={typography.bigNumber}>+ 3 240 kr</Text>
 *   <Text style={typography.marginNote}>Vakt #12 — kveld</Text>
 *
 * Also works via NativeWind classes: font-display / font-fraunces-italic /
 * font-mono-medium (see tailwind.config.js).
 */

import { type TextStyle } from "react-native";

export const typography = {
  // ─── Display (Fraunces — use sparingly) ──────────────────────
  heroTitle: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
  } as TextStyle,

  screenTitle: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
  } as TextStyle,

  sectionTitle: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  } as TextStyle,

  // ─── Big number (JetBrainsMono) — dominant per screen ────────
  bigNumber: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.2,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  monoLarge: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  // ─── Card (Inter Tight + some Fraunces for cards) ────────────
  cardTitle: {
    fontFamily: "InterTight_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  } as TextStyle,

  cardSubtitle: {
    fontFamily: "InterTight_400Regular",
    fontSize: 14,
    lineHeight: 19,
  } as TextStyle,

  // ─── Body (Inter Tight) ──────────────────────────────────────
  body: {
    fontFamily: "InterTight_400Regular",
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,

  bodyStrong: {
    fontFamily: "InterTight_500Medium",
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,

  small: {
    fontFamily: "InterTight_400Regular",
    fontSize: 14,
    lineHeight: 19,
  } as TextStyle,

  caption: {
    fontFamily: "InterTight_500Medium",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  } as TextStyle,

  // ─── Mono (JetBrainsMono) for amounts and times ──────────────
  mono: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 14,
    lineHeight: 19,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  // ─── Margin-note (Fraunces italic — editorial detail) ────────
  marginNote: {
    fontFamily: "Fraunces_400Regular_Italic",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  } as TextStyle,
} as const;

/**
 * Dark-mode weight bump — call when applying body/cardSubtitle in dark
 * mode for better anti-aliasing. Web uses font-weight: 500, but RN needs
 * font family swap.
 */
export function bumpForDark<T extends TextStyle>(style: T, isDark: boolean): T {
  if (!isDark) return style;
  if (style.fontFamily === "InterTight_400Regular") {
    return { ...style, fontFamily: "InterTight_500Medium" };
  }
  if (style.fontFamily === "Fraunces_600SemiBold") {
    return { ...style, fontFamily: "Fraunces_700Bold" };
  }
  return style;
}
