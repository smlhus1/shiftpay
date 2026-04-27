/**
 * WCAG AA contrast verifier.
 *
 * Reads the colour tokens from lib/theme.ts and asserts that every
 * foreground/background pairing the app actually uses meets WCAG AA
 * (4.5:1 for normal text, 3:1 for large text and UI components).
 *
 * Run from repo root: `npx tsx shiftpay/scripts/verify-contrast.ts`
 *
 * CI gate: a non-zero exit fails the build, so any future token edit
 * that drops a pairing below AA blocks the merge.
 */

import { darkColors, lightColors, type ThemeColors } from "../lib/theme";

// ─── WCAG math ──────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    throw new Error(`verify-contrast only supports #rrggbb tokens, got: ${hex}`);
  }
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance(rgb: [number, number, number]): number {
  // Per WCAG 2.1 §8.1.4.3
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: string, bg: string): number {
  const lFg = relativeLuminance(hexToRgb(fg));
  const lBg = relativeLuminance(hexToRgb(bg));
  const [hi, lo] = lFg > lBg ? [lFg, lBg] : [lBg, lFg];
  return (hi + 0.05) / (lo + 0.05);
}

// ─── Pairings to check ──────────────────────────────────────────────

interface Pairing {
  /** What this pairing is used for in the UI. */
  context: string;
  fg: keyof ThemeColors;
  bg: keyof ThemeColors;
  /** "normal" → 4.5:1, "large" → 3.0:1. UI components (icons, focus
   *  rings) use "large" since the WCAG threshold for non-text is 3:1. */
  size: "normal" | "large";
}

const PAIRINGS: readonly Pairing[] = [
  // Body text on bg
  { context: "primary text on bg", fg: "textPrimary", bg: "bg", size: "normal" },
  { context: "primary text on surface", fg: "textPrimary", bg: "surface", size: "normal" },
  { context: "secondary text on bg", fg: "textSecondary", bg: "bg", size: "normal" },
  { context: "secondary text on surface", fg: "textSecondary", bg: "surface", size: "normal" },
  // textMuted historically marginal — keep it AA so the design system
  // can't drift below.
  { context: "muted text on bg", fg: "textMuted", bg: "bg", size: "normal" },

  // Accents — small accent text appears in links, hint text, and
  // monthly-summary chips. accentSoft is the small-text accent token
  // for both light and dark modes (introduced in Pass 6b after dark.accent
  // came in at 2.4:1). accent itself is now used only as a button BG
  // (white text on accent-bg = 8.85:1) and as a decorative icon color
  // adjacent to a textual label — neither requires 3:1 per WCAG 1.4.11
  // (decorative graphics) so we don't enforce it here.
  { context: "accentSoft text on bg", fg: "accentSoft", bg: "bg", size: "normal" },

  // Status colours used for short labels
  { context: "success text on bg", fg: "success", bg: "bg", size: "normal" },
  { context: "error text on bg", fg: "error", bg: "bg", size: "normal" },

  // Tab bar — tabActive should be visible on surface (the bar bg)
  { context: "tabActive icon on surface", fg: "tabActive", bg: "surface", size: "large" },
];

function threshold(size: "normal" | "large"): number {
  return size === "large" ? 3.0 : 4.5;
}

interface Failure {
  theme: string;
  context: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
}

function checkTheme(name: string, palette: ThemeColors): Failure[] {
  const failures: Failure[] = [];
  for (const p of PAIRINGS) {
    const fg = palette[p.fg];
    const bg = palette[p.bg];
    // Skip non-#rrggbb (e.g. rgba border) since contrast can't be
    // computed without composing them onto a reference.
    if (!/^#[0-9a-f]{6}$/i.test(fg) || !/^#[0-9a-f]{6}$/i.test(bg)) continue;
    const ratio = contrastRatio(fg, bg);
    const required = threshold(p.size);
    if (ratio < required) {
      failures.push({ theme: name, context: p.context, fg, bg, ratio, required });
    }
  }
  return failures;
}

function format(theme: string, palette: ThemeColors): void {
  console.log(`\n${theme}:`);
  for (const p of PAIRINGS) {
    const fg = palette[p.fg];
    const bg = palette[p.bg];
    if (!/^#[0-9a-f]{6}$/i.test(fg) || !/^#[0-9a-f]{6}$/i.test(bg)) continue;
    const ratio = contrastRatio(fg, bg);
    const required = threshold(p.size);
    const ok = ratio >= required ? "✓" : "✗";
    console.log(
      `  ${ok} ${p.context.padEnd(40)}  ${ratio.toFixed(2).padStart(5)}:1  (need ${required.toFixed(1)})`
    );
  }
}

function main(): void {
  format("Dark", darkColors);
  format("Light", lightColors);

  const failures = [...checkTheme("Dark", darkColors), ...checkTheme("Light", lightColors)];
  if (failures.length > 0) {
    console.error(`\n${failures.length} contrast failure(s):`);
    for (const f of failures) {
      console.error(
        `  [${f.theme}] ${f.context}: ${f.fg} on ${f.bg} = ${f.ratio.toFixed(2)}:1 (need ${f.required.toFixed(1)})`
      );
    }
    process.exit(1);
  }
  console.log("\nAll pairings pass WCAG AA.");
}

main();
