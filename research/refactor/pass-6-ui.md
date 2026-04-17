# Pass 6 — Senior UI Architecture Research (ShiftPay)

> Researched: 2026-04-16 | Sources consulted: ~30 | Confidence: High on bundle/a11y/tokens, Medium on APCA and variable fonts (emerging areas)

## TL;DR

ShiftPay's UI stack (NativeWind 4.2.1, moti+reanimated, i18n-js, Phosphor Duotone, expo-google-fonts for Inter+Fraunces+JetBrains Mono) is on a healthy modern trajectory, but three concrete liabilities exist today: (1) the Phosphor Duotone migration almost certainly caused the 46MB → 127MB APK jump because the `MAP` barrel in `components/Icon.tsx` defeats Metro's already-weak tree-shaking and pulls the whole duotone SVG set into the JS bundle; (2) tariff-rate edits and confirm-flows lack programmatic APCA/WCAG verification on the Kveldsvakt warm-coffee palette (currently only verified by hand-calculation in comments); (3) `accessibilityLiveRegion` is used correctly on "Lagret" but silently broken on Fabric renderer (default in RN 0.81). The highest-leverage senior moves are: individual-path imports for Phosphor (or switch to `lucide-react-native` for the dropping to ~85–95 MB range), migrate `AnimatedCard` from moti to pure reanimated `Animated.View` with `entering={FadeInUp.delay(...)}` to kill one dependency, and adopt a `cn()` helper + `cva` pattern per component family rather than inline ternary strings.

---

## 1. NativeWind 4 advanced patterns

NativeWind 4's foundational shift is from a Babel-level transform to `jsxImportSource`, which preserves the `className` string into the component tree. That single change is what unlocks `cva`, `tailwind-variants`, `clsx`, and `tailwind-merge` without wrapper components — prior to v4 these libraries couldn't compose because `className` was transformed away before they saw it.

**Current ShiftPay style:** inline ternary strings with hand-built dark variants, e.g. `statusColor()` returns `"bg-indigo-100 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300"`. This works but drifts across `ShiftCard.tsx`, `settings.tsx`, and `index.tsx`. Senior path is a per-family `cva` definition.

### Library comparison

| Library | What it does | When to pick | RN bundle cost |
|---|---|---|---|
| `clsx` | Conditional class joining only (strings + objects) | You only need `cn()` composition | 0.5 KB gz |
| `tailwind-merge` | Resolves conflicts like `p-2 p-4` → `p-4` | You compose from multiple sources (props + defaults) | ~4–7 KB gz |
| `class-variance-authority` (cva) | Typed variants + compound variants | Component families (Button, Badge, Card) | ~1.2 KB gz |
| `tailwind-variants` (tv) | cva + first-class slot and Tailwind-aware merging | Multi-slot components (Modal with header/body/footer) | ~3.5 KB gz |

**Key subtlety:** `tailwind-merge` ships a default config keyed to the stock Tailwind palette. ShiftPay's `accent-dark`, `app-bg`, `dark-surface`, and custom font families (`font-inter-medium`, `font-display`, `font-mono`) are **unknown** to tw-merge's conflict resolver. Without `extendTailwindMerge({ classGroups: ... })`, conflicts like `bg-accent bg-accent-dark` won't deduplicate correctly. For a project ShiftPay's size, the pragmatic move is **clsx + cva, skip tailwind-merge** — tw-merge earns its weight once you have dozens of consumers passing `className` into shared components.

### Recommended pattern for ShiftPay

```
// lib/cn.ts
import clsx, { ClassValue } from "clsx";
export const cn = (...inputs: ClassValue[]) => clsx(inputs);

// components/Button.tsx — variants tied to actual ShiftPay tokens
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "rounded-xl items-center justify-center",
  {
    variants: {
      intent: {
        primary: "bg-accent-dark dark:bg-accent",
        secondary: "bg-app-elevated dark:bg-dark-elevated border border-app-border dark:border-dark-border",
        danger: "bg-red-600 dark:bg-red-500",
      },
      size: {
        sm: "px-3 py-2 min-h-[36px]",
        md: "px-4 py-3 min-h-[44px]",
        lg: "px-6 py-4 min-h-[48px]",
      },
    },
    defaultVariants: { intent: "primary", size: "md" },
  }
);
```

**`styled()` is removed** in v4. The replacements are `remapProps()` (prop-to-className mapping) and `cssInterop()` (dynamic style injection). `useColorScheme()` from `nativewind` still exists and is what `theme-context.tsx` should sync — which it does via `colorScheme.set(resolved)`. That pattern is correct. The one risk: NativeWind's `useColorScheme` and React Native's `useColorScheme` are **different hooks**. Importing the wrong one in a component gives stale values during theme toggle. `theme-context.tsx` correctly imports `useColorScheme as useSystemColorScheme` from `react-native` — keep that convention everywhere.

**Sources:** [NativeWind v4 announcement](https://www.nativewind.dev/blog/announcement-nativewind-v4), [Custom Components guide](https://www.nativewind.dev/docs/guides/custom-components), [CVA vs Tailwind Variants (DEV)](https://dev.to/webdevlapani/cva-vs-tailwind-variants-choosing-the-right-tool-for-your-design-system-12am), [Steve Kinney's typed variants course notes](https://stevekinney.com/courses/react-typescript/tailwind-cva-typed-variants).

---

## 2. Android accessibility 2026 — TalkBack

Android/React Native accessibility has known platform traps that ShiftPay currently trips on in two places.

### What ShiftPay does right

- Every `PressableScale` has `accessibilityRole="button"` and an `accessibilityLabel`.
- Radio-style pickers (language/currency/theme) use `accessibilityRole="radiogroup"` with nested `accessibilityRole="radio"` and `accessibilityState={{ checked }}`.
- Section headers use `accessibilityRole="header"`.
- Chevrons and decorative icons have `importantForAccessibility="no"`.

### What's broken or wrong

1. **`accessibilityLiveRegion` on "Lagret" (settings.tsx:239) is silently broken on Fabric.** React Native issue tracking confirms `accessibilityLiveRegion` only works on the legacy Paper renderer. Expo SDK 54 / RN 0.81 defaults to Fabric in new projects. Workaround: use `AccessibilityInfo.announceForAccessibility(message)` imperatively after `setSaved(true)`. This works on both renderers.

2. **Heading navigation quirks on Android TalkBack.** Issue #22440 (React Native) documents that `accessibilityRole="header"` on a `<Text>` does announce the heading, but Android TalkBack **does not expose heading-by-heading swipe navigation** the way iOS VoiceOver's rotor does. TalkBack users navigate by "Headings" reading control only when the native view reports `AccessibilityNodeInfo.isHeading=true`, which RN does set from `role="header"`. The accuracy is fine; the perceived parity with iOS isn't. No action needed, just don't over-promise to a11y auditors.

3. **Norwegian TalkBack pronunciation of product names.** "ShiftPay" is pronounced "shift-pey" by nb-NO TTS engines, which is fine. But "OCR" is spelled out as "å-ce-er" (letters), not "o-c-r". For buttons like "Import OCR", prefer `accessibilityLabel="Importer vaktliste fra bilde"` over the bare "Import (OCR)" visible label. Norwegian is a pitch-accent language, and most Android TTS voices (including high-quality `nb-NO-x-cae-network`) handle compounds like "kveldsvakt" and "nattvakt" correctly — no special handling needed for shift type names.

4. **Minimum hit area.** WCAG 2.2 SC 2.5.8 mandates 24×24 CSS px minimum target size (Level AA), 44×44 is Level AAA. `PressableScale` at default sizes hits 44×44 in the tab bar but `hitSlop={8}` on the trash icon in `ShiftCard` (line 114) extends an 18×18 icon to 34×34 — passing AA but missing AAA. For a single-hand-use app on a phone, go to `hitSlop={12}` or increase the rendered touch target.

### Senior pattern — focus management on navigation

Expo Router doesn't auto-manage focus. After `router.push("/confirm/[shiftId]")`, TalkBack users hear the screen change but focus stays on the old screen's element until they swipe. Senior apps use a `useFocusEffect` + `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref.current))` pattern on the new screen's heading element. Worth adding for `confirm` and `summary` screens where the user is likely driven there by a notification.

**Sources:** [RN Accessibility docs](https://reactnative.dev/docs/accessibility), [RN issue #22440 heading suffix](https://github.com/facebook/react-native/issues/22440), [Callstack Android a11y tips](https://www.callstack.com/blog/react-native-android-accessibility-tips), [React Native AMA headers guideline](https://nearform.com/open-source/react-native-ama/guidelines/headers/), [Accessibility Checker RN 2025 guide](https://www.accessibilitychecker.org/blog/react-native-accessibility/).

---

## 3. Color contrast — WCAG AA/AAA and APCA

ShiftPay's `theme.ts` contains hand-calculated contrast ratios in comments (e.g. `// 8.85:1`). That's a smell — tokens drift, comments lie. Senior moves:

### WCAG 2.2 baseline (what auditors and Play Console policies check)

| Pair on dark bg (`#1A1614`) | Ratio | AA text | AAA text |
|---|---|---|---|
| `textPrimary` `#F5EFE4` | ~14.8:1 | pass | pass |
| `textSecondary` `#A8A095` | ~6.1:1 | pass | fail |
| `textMuted` `#9A928A` | ~5.0:1 | pass | fail (normal), pass (large) |
| `accent` `#8B3E23` on bg | ~3.0:1 | **fail** for text | pass for UI components (3:1) |
| `accentSoft` `#E8A57C` | ~8.5:1 | pass | pass |

| Pair on cream (`#F5EFE4`) | Ratio | AA |
|---|---|---|
| `textPrimary` `#1A1614` | ~14.8:1 | pass |
| `accent` `#8B3E23` | ~6.7:1 | pass |
| `textMuted` `#756E64` | ~4.8:1 | pass |

**Gotcha:** The `text-accent-dark dark:text-accent` pattern in `ShiftCard.tsx:86` puts `#8B3E23` as **text color** on `#1A1614` dark background. Contrast ~3.0:1 — fails WCAG AA for body text (4.5:1 required). Acceptable for "large text" (18pt / 14pt bold), but ShiftCard uses `text-sm` (14pt regular). This is the single highest-risk a11y finding in the current code. Fix: use `accentSoft` `#E8A57C` (8.5:1) for text-on-dark, keep `accent` for button backgrounds where the surrounding text is light cream.

### APCA — where it's heading

APCA (Advanced Perceptual Contrast Algorithm) is the proposed WCAG 3 replacement. Key differences:
- Reports a **Lc value** (signed, roughly –108 to +106), not a ratio.
- Accounts for font weight and size in the threshold, not just color math.
- Inverts intuitions: dark text on light bg and light text on dark bg get different Lc targets.

Rough thresholds: Lc 75+ for body text, Lc 60+ for large text, Lc 45+ for non-text UI. ShiftPay's `accent` on dark gives roughly Lc 51 — again, fails body text target. APCA would confirm what WCAG already flagged.

**Senior toolchain.** Don't hand-compute. Add a CI script that imports tokens from `lib/theme.ts` and runs `apca-check` or `color-contrast-checker`:

```
// scripts/verify-contrast.ts (run in CI)
import { darkColors, lightColors } from "../lib/theme";
import { APCAcontrast, sRGBtoY } from "apca-w3";
// Fail build if any foreground on surface yields Lc < 75 for declared body-text pairs
```

For a Play Store app, WCAG 2.2 AA is the defensible baseline. APCA is the direction of travel but not yet normative; document any AA failures that pass APCA as justified exceptions rather than ignoring them.

**Sources:** [APCA Contrast Calculator](https://apcacontrast.com/), [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html), [WCAG 3.0 Status 2026](https://web-accessibility-checker.com/en/blog/wcag-3-0-guide-2026-changes-prepare), [Humbl Design 2026 contrast guide](https://humbldesign.io/blog-posts/color-accessibility-guide-wcag), [Dan Hollick on WCAG 3 + APCA](https://typefully.com/DanHollick/wcag-3-and-apca-sle13GMW2Brp).

---

## 4. Reanimated + moti performance

ShiftPay uses **both** moti (`AnimatedCard`) and raw reanimated (`PressableScale`). That's fine, but moti adds ~15 KB gz and a `MotiView` wrapper for a single use case (stagger-in of dashboard cards). Senior cleanup: replace with reanimated's layout animations.

### When worklets and shared values pay off

`PressableScale` is the textbook correct pattern: `useSharedValue` + `useAnimatedStyle` + `withSpring`. All animation logic runs on the UI thread via worklets, no JS bridge hops, survives JS-thread jank (e.g. during SQLite queries on dashboard load). Leave it alone.

### moti vs pure reanimated entering animations

```
// Current AnimatedCard (moti)
<MotiView
  from={{ opacity: 0, translateY: 12 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{ type: "timing", duration: 350, delay: index * 80 }}
/>

// Senior equivalent (pure reanimated)
import Animated, { FadeInDown } from "react-native-reanimated";
<Animated.View entering={FadeInDown.delay(index * 80).duration(350)} />
```

Both run on UI thread. Pure reanimated drops one dependency and one wrapper component per card. Reanimated layout animations respect `useReducedMotion()` natively since 3.6 — the manual reduce-motion check in `AnimatedCard.tsx:14` can be removed.

### Reanimated 4 note

Reanimated 4 has shipped. Migration guide flags that Reanimated 4 uses `react-native-worklets` as a separate package. Holding at 3.x through the competition is fine; migration is a post-launch task and not urgent.

### When Skia earns its weight

Skia is worth it for: (a) custom charts/graphs (monthly pay trend), (b) gradient/blur effects that eat CPU on JS-driven animations, (c) complex particle effects. For a payroll auditor, **no**. The one place it could pay off in ShiftPay is a future "pay sparkline" on the dashboard — but `react-native-gifted-charts` or even SVG via `react-native-svg` is fine at ShiftPay's scale.

### FPS measurement

- Dev: Metro's performance overlay (`⌘D` → "Show Perf Monitor"). Shows JS thread + UI thread FPS separately.
- Prod: `react-native-performance` for render-time measurement; `expo-dev-client` has built-in frame-drop logging.
- Android-specific: `adb shell dumpsys gfxinfo <package>` for per-frame timing percentiles. ShiftPay should aim for p95 frame time < 16.6ms on a Pixel 6 equivalent.

**Sources:** [Reanimated Performance docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/), [Worklets docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/), [Entering/Exiting animations](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/), [Migration to 4.x](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/), [Viewlytics advanced animation guide](https://viewlytics.ai/blog/react-native-advanced-animations-guide).

---

## 5. Icon strategy — why Phosphor made the APK 127MB

**This is the highest-priority finding in Pass 6.**

### The diagnosis

Look at `components/Icon.tsx`:

```
import {
  Camera, Check, CheckCircle, CaretLeft, CaretRight, CaretUp, CaretDown,
  Clock, DeviceMobile, DownloadSimple, Envelope, GithubLogo, Gear, Moon,
  Plus, PlusCircle, Scan, Sliders, Sun, Trash, Wallet,
} from "phosphor-react-native";
```

22 named imports from the package root. phosphor-react-native's README explicitly warns: *"Importing all icons at once for use in your project can prevent tree-shaking and make your app's bundle larger."* The package ships **9,000+ icons across 6 weights** (thin, light, regular, bold, fill, duotone) — roughly 54,000 SVG component entries.

Metro bundler **does not tree-shake by default**. Metro issues #227 and #632 (both still open as of 2026) confirm this. When you import 22 icons from the barrel, Metro follows the barrel's `index.js` re-exports and pulls the entire module graph into the bundle unless each named export is in its own file and reached via static path import.

Result: the JS bundle balloons from ~10–15 MB (Lucide + Ionicons-era) to **60+ MB of duotone SVG component code**, which compresses to ~30–40 MB in the hermes bytecode, plus uncompressed weight in the APK's `assets/` folder. Combined with `react-native-svg` runtime weight and the Fraunces variable font (~600 KB per weight), that accounts for the 46 → 127 MB jump.

### The fix — individual path imports

Phosphor's published fix pattern:

```
// Bad — pulls the whole barrel
import { Camera } from "phosphor-react-native";

// Good — direct module path, Metro can scope to one file
import { CameraIcon } from "phosphor-react-native/src/icons/Camera";
// or the commonjs build:
import { CameraIcon } from "phosphor-react-native/lib/commonjs/icons/Camera";
```

Rewrite `Icon.tsx`'s MAP to use individual file imports. Expected result: APK drops back into the 55–75 MB range (still larger than pre-Phosphor because the 6-weight component structure carries more code per icon than Lucide's single-weight stroke-based files).

### Library comparison for ShiftPay

| Library | Style | Icons used (count) | Rough APK cost | Tree-shaking | Notes |
|---|---|---|---|---|---|
| `phosphor-react-native` (current) | 6 weights × 9,000 icons | 22 | 60–80 MB with barrel imports, ~20–30 MB with path imports | Metro-hostile barrel, path imports mandatory | MIT, duotone is the distinctive feature |
| `lucide-react-native` | Single stroke-weight, 1,500+ icons | 22 | 3–8 MB (per 2026 benchmark) | Better per-icon modules | ISC, 29M weekly downloads, Metro-friendlier |
| `@expo/vector-icons` (Ionicons) | Font-based multi-set | 22 | ~1 MB total (one font file, all icons "free") | No tree-shaking needed — it's a font | MIT, the Expo-blessed default |
| `react-native-vector-icons` | Font-based, multiple sets | 22 | ~1–2 MB per font set | N/A (fonts) | MIT, underlying lib for `@expo/vector-icons` |
| `@hugeicons/react-native-pro` | Multi-style commercial | 22 | varies | Commercial, per-icon imports | Not free |
| Custom SVG sprite | Hand-curated | 22 | 50–150 KB total | Perfect (only what you ship) | Most work, smallest bundle |

The CodeToDeploy 2026 benchmark (Medium article, redirect-protected) found Phosphor's delta-over-source-gzip ratio at **16–18x** vs Lucide/Heroicons at 1.0–1.2x — meaning Phosphor ships 16–18× more runtime weight per icon than its SVG source implies, due to the multi-weight component structure. This benchmark is for `@phosphor-icons/react` (web), but the same architecture ships in `phosphor-react-native`.

### Recommendation for ShiftPay

**Option A — Fastest fix (ship-blocker for competition):** Rewrite `Icon.tsx` imports to individual paths. Keep Phosphor. Expected savings: 40–60 MB of APK size, ~15 minutes of work.

**Option B — Best long-term:** Switch `Icon.tsx` to Lucide. The icon set semantically matches (`Camera`, `Check`, `Clock`, etc. exist under identical or near-identical names). Duotone aesthetic is lost but app gains Play Store AAB under 50 MB again (under the old APK size install limit some users hit).

**Option C — Pragmatic hybrid:** Lucide for UI chrome (chevrons, settings, mail), Phosphor for 2–3 "signature" duotone marks (app logo, onboarding hero, empty states). Path-import Phosphor only for those.

**Diagnosis approach** to confirm before acting: `npx expo export --platform android --dev false` and inspect `dist/bundles/index.android.bundle` size. Then replace `Icon.tsx` with a stub that imports one icon and rebuild — the size delta tells you Phosphor's real cost on this project. Compare `dist/assets/` tree for SVG proliferation.

**Sources:** [phosphor-react-native npm](https://www.npmjs.com/package/phosphor-react-native), [duongdev/phosphor-react-native repo](https://github.com/duongdev/phosphor-react-native), [CodeToDeploy icon bundle benchmark](https://medium.com/codetodeploy/the-hidden-bundle-cost-of-react-icons-why-lucide-wins-in-2026-1ddb74c1a86c), [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native), [Metro tree-shaking issue #227](https://github.com/facebook/metro/issues/227), [Callstack bundle optimization](https://www.callstack.com/blog/optimize-react-native-apps-javascript-bundle).

---

## 6. Font loading — Inter Tight + Fraunces + JetBrains Mono

ShiftPay currently loads **three font families × 4–6 weights** via `@expo-google-fonts`. Dashboard already uses `fontFamily: "Fraunces_400Regular_Italic"` inline (index.tsx:208), suggesting some instances bypass the Tailwind token. The font-pack-per-weight pattern is the Expo norm but carries real cost.

### Embedded TTF vs runtime loader

Expo docs are unambiguous: **embed fonts at build time via the `expo-font` config plugin** rather than `useFonts()` at runtime. `@expo-google-fonts/*` packages use `useFonts()` under the hood by default, which means:
- Font files ship as JS assets, loaded at runtime via `Font.loadAsync()`.
- First frame may render in system font before loaded fonts kick in (FOUT/FOIT).
- Each font instance adds to JS bundle parse time.

The config-plugin path:

```
// app.json
{
  "plugins": [
    ["expo-font", {
      "fonts": [
        "./assets/fonts/InterTight-Regular.ttf",
        "./assets/fonts/InterTight-SemiBold.ttf",
        "./assets/fonts/Fraunces-Bold.ttf",
        "./assets/fonts/JetBrainsMono-Regular.ttf"
      ]
    }]
  ]
}
```

Fonts get embedded as Android assets, linked natively, **available on first frame**. No `useFonts()` call, no splash-screen-hold-until-loaded dance.

### Variable fonts — the Fraunces opportunity

Fraunces is a variable font with axes: `wght`, `opsz` (optical size), `SOFT`, `WONK`. ShiftPay loads 6 static instances. A single Fraunces `.ttf` variable font is ~600 KB vs 6 × 250 KB = 1.5 MB for static instances. The catch: **React Native does not yet ship `fontVariationSettings` in the stable Text API** (RN proposal #829 exists, not merged as of April 2026). You can load the variable font but can only use one fixed axis set without native-side patches.

**Practical take for ShiftPay:** stick with 3–4 static weights per family for now. Drop `Fraunces_500Medium_Italic` and `Fraunces_600SemiBold` if they aren't used — the dashboard only uses regular-italic and 700-bold (display). Audit all font-family classes and drop unused weights. Each weight removed saves ~200–300 KB APK.

### FOUT/FOIT avoidance

Current pattern (inferred from `_layout.tsx` — not read here but standard Expo pattern): `useFonts()` + `SplashScreen.preventAutoHideAsync()` + `SplashScreen.hideAsync()` after fonts are loaded. This eliminates FOUT by hiding first-paint until fonts are ready. It's correct but **extends perceived startup time**. With embedded fonts (config plugin), you can drop the splash-hold entirely.

### Subsetting

For a Scandinavian-language app, subsetting can save 30–50% per font file by stripping unused glyphs (CJK, Arabic, Devanagari). Tools: `fonttools pyftsubset`, `glyphhanger`. The Google Fonts `.ttf` files from `@expo-google-fonts/*` are **not** subsetted — they ship with Latin Extended and a few other scripts. Custom subsetted fonts can be checked into `/assets/fonts` and referenced via the config plugin.

**Sources:** [Expo Fonts docs](https://docs.expo.dev/develop/user-interface/fonts/), [expo-font SDK](https://docs.expo.dev/versions/latest/sdk/font/), [Expo Google Fonts repo](https://github.com/expo/google-fonts), [Variable fonts RN proposal #829](https://github.com/react-native-community/discussions-and-proposals/issues/829), [Obytes Starter fonts guide](https://starter.obytes.com/ui-and-theme/fonts/).

---

## 7. i18n beyond string replacement

ShiftPay uses `i18n-js` with 4 locales and `Intl.NumberFormat` for currency via `formatCurrency()`. That's a solid baseline. The senior gaps are ICU pluralization and consistent date handling.

### ICU pluralization

i18n-js has **limited pluralization** out of the box — the `_one` / `_other` suffix convention. That's fine for en/nb/sv/da (Germanic 2-form plurals) but breaks if you ever add pl (5 forms), ru (4), ar (6). ICU Message Format is the standard everyone else uses:

```
// ICU in a translation value
"dashboard.pending.more": "{count, plural, one{1 til} other{# til}}"
```

i18n-js does **not** natively parse ICU syntax. Options:
1. Add `make-plural` + `messageformat` — wraps i18n-js values with ICU parsing. ~20 KB gz.
2. Switch to `i18next` + `i18next-icu`. Heavier but industry standard.
3. Keep current suffix pattern; document that the app only targets 4 Germanic locales (defensible for MVP).

For ShiftPay's current scope, **option 3 is the right call**. Revisit if you add Finnish, Polish, Russian, or Arabic.

### Intl.NumberFormat and DateTimeFormat

`Intl` is available on React Native through Hermes — but **only with the Intl variant enabled**. Hermes has two builds: default (no Intl) and "full ICU" (includes Intl). Expo SDK 54 ships full-ICU Hermes by default, so `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.Collator`, and `Intl.RelativeTimeFormat` work. If targeting older Expo SDKs or custom Hermes builds, check for `typeof Intl !== "undefined"` or polyfill with `formatjs/intl`.

**`formatCurrency()` in ShiftPay is correct** — `Intl.NumberFormat` with locale + currency gives proper grouping (`kr 12 345,67` in nb-NO, `£12,345.67` in en-GB). Extensions to consider:
- `Intl.NumberFormat` compact notation: `new Intl.NumberFormat("nb-NO", { notation: "compact" }).format(12500)` → "12 tus." — handy for summary cards at tight widths.
- `Intl.RelativeTimeFormat` for countdowns: replace `countdownToShift()`'s hand-rolled logic with `new Intl.RelativeTimeFormat("nb-NO", { numeric: "auto" }).format(-3, "hour")` → "for 3 timer siden" / "om 3 timer".
- `Intl.DateTimeFormat` for period labels: `{ month: "long", year: "numeric" }` in `nb-NO` → "februar 2026".

### RTL readiness

Not currently needed (nb/en/sv/da are all LTR). If RTL ever lands, React Native's `I18nManager.isRTL` flag auto-flips flex-direction. NativeWind's `rtl:` variant works correctly in v4. The trap: **`tabIconPosition` and icon directionality** (e.g. chevron-forward) need RTL-aware mirroring. Phosphor icons accept a `mirrored` prop for this; Lucide does not have an equivalent (you'd use `transform: [{ scaleX: -1 }]` manually).

### Currency-locale mismatch

ShiftPay allows NOK/GBP/SEK/DKK/EUR but nb/en/sv/da locales. A Norwegian user picking GBP gets `kr 12 345,67` number formatting with a `£` symbol — which Intl handles correctly via `Intl.NumberFormat(locale, { currency })`. Verified correct in `lib/format.ts` reading.

**Sources:** [i18n-js npm](https://www.npmjs.com/package/i18n-js), [ICU Message Format guide (Crowdin)](https://crowdin.com/blog/icu-guide), [Lokalise React i18n guide](https://lokalise.com/blog/react-i18n-intl/), [Zignuts React i18n 2026 guide](https://www.zignuts.com/blog/complete-guide-multilingual-support-react-i18n), [React i18next ICU docs](https://react.i18next.com/misc/using-with-icu-format).

---

## 8. Design tokens unification

ShiftPay currently has **three sources of truth** that must stay aligned:
1. `tailwind.config.js` — `colors.app.*`, `colors.dark.*`, `colors.accent*`, `fontFamily.*`
2. `lib/theme.ts` — `darkColors`, `lightColors` as typed `ThemeColors` objects
3. Component inline hex values (e.g. `color="#F5EFE4"` in `index.tsx:229, 379`)

The comment in `theme.ts` (`"Kveldsvakt" palette — destillert fra shiftpay-site/DESIGN.md`) implies a fourth source (`DESIGN.md`). This is drift waiting to happen — and the duplicate values in `theme.ts` vs `tailwind.config.js` already differ (`app.elevated` = `#EFE7D5` in Tailwind; no equivalent in `theme.ts`'s exported type).

### Style Dictionary pattern

`style-dictionary` is the industry-standard token-to-code generator. Workflow:
1. Define tokens once in `tokens/colors.json`, `tokens/typography.json` (W3C Design Tokens format).
2. `sd build` generates `tailwind.colors.js`, `lib/theme.generated.ts`, and any other outputs.
3. CI fails if generated files drift from tokens source.

For ShiftPay, this is overkill pre-competition. Post-competition it's the right move. **Interim pattern** — have `tailwind.config.js` import from `lib/theme.ts`:

```
// tailwind.config.js
const { darkColors, lightColors } = require("./lib/theme.ts"); // via ts-node or precompile

module.exports = {
  theme: {
    extend: {
      colors: {
        "dark-bg": darkColors.bg,
        "dark-surface": darkColors.surface,
        "app-bg": lightColors.bg,
        "accent": lightColors.accent,
        // ...
      },
    },
  },
};
```

Problem: Tailwind's dark: variant needs **both light and dark values declared as different keys** — dark-bg and app-bg live as separate keys. So the generator still has to expand per-mode. The clean v4 way is Tailwind v4 CSS variables (`@theme { --color-surface: ... }` with mode overrides in `:root[data-theme=dark]`), but NativeWind 4.2.1 targets Tailwind 3.x semantics and doesn't consume Tailwind 4's `@theme` block. **This is a waiting game** — NativeWind v5 (in development per docs) aligns with Tailwind 4 and unlocks proper single-source CSS variables.

### Token-derived TS types

The cleanest move available today: make `ThemeColors` the single source, generate Tailwind keys programmatically:

```
// lib/theme.ts exports both
export const darkColors: ThemeColors = { ... };
export const lightColors: ThemeColors = { ... };

// scripts/generate-tailwind-colors.js (build-time)
// reads lib/theme.ts AST, writes tailwind-tokens.cjs with the same values
```

Worth doing if you find yourself editing colors in two files during the refactor. Skip otherwise.

**Sources:** [Using Style Dictionary with Tailwind (DEV)](https://dev.to/philw_/using-style-dictionary-to-transform-tailwind-config-into-scss-variables-css-custom-properties-and-javascript-via-design-tokens-24h5), [Tokens Studio sd-tailwindv4 example](https://github.com/tokens-studio/sd-tailwindv4/), [Style Dictionary + Tailwind bridge](https://github.com/StefanKandlbinder/styledictionarytailwindbridge), [Invisi.dev — Design systems that build themselves](https://www.invisi.dev/blog/design-systems-that-build-themselves-using-style-dictionary-tailwindcss).

---

## 9. Empty, error, and loading states

ShiftPay already has decent empty-state UX (`dashboard.empty.*` translation keys, wallet icon circle, CTA). 2026-specific senior patterns:

### Spinners vs skeletons

| Scenario in ShiftPay | Current | 2026 senior pick |
|---|---|---|
| First dashboard load | `<ActivityIndicator size="large" />` full screen | Skeleton for 3 card shapes (next shift, pay summary, pending) |
| Settings save feedback | `<ActivityIndicator />` in button + "Lagret" toast | Optimistic UI: button text → "Lagret ✓" instantly, retry on failure |
| OCR processing | Unknown (not read here) | Spinner + progress hint ("Leser vaktliste...") — known short wait, unknown structure |
| Confirm shift write | Unknown | Optimistic: update UI instantly, roll back on error |
| Period detail load | `<ActivityIndicator />` | Skeleton matches ShiftCard shape (saves 200ms of perceived load) |

**Rule:** skeleton when the content structure is known, spinner when it isn't or the operation is <300ms. ShiftPay's dashboard already knows the card structure — skeleton is a clear win.

### Skeleton implementation

Avoid shipping `react-native-skeleton-placeholder` (drops MaskedView which has iOS-side ceremony). Use moti's `Skeleton` component (ShiftPay already ships moti) or pure reanimated with a pulsing opacity:

```
const opacity = useSharedValue(0.3);
useEffect(() => {
  opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
}, []);
```

### Error states

Current `loadError` UI on dashboard shows message + retry button — good. Missing: **specific error classification**. "Network unreachable" vs "OCR rate-limited" vs "DB corrupted" warrant different CTAs. Senior pattern: typed error hierarchy + `errorToUserMessage()` helper.

### Optimistic UI

Shift confirmation is the one place in ShiftPay where optimistic UI matters. User taps "Bekreft" → UI updates immediately (card moves to "Confirmed" state) → DB write happens → on failure, revert. `withDb()`'s retry-on-stale-connection already gives you a soft reliability guarantee; optimistic UI gives the rest.

**Sources:** [OneUpTime skeleton loading RN 2026](https://oneuptime.com/blog/post/2026-01-15-react-native-skeleton-loading/view), [LogRocket skeleton handling](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/), [ITNext custom skeleton builders](https://itnext.io/building-custom-skeleton-loaders-in-react-native-with-a-real-world-app-example-14be7925dffe).

---

## 10. Form inputs on Android

ShiftPay has exactly one form surface: `RateField` in `settings.tsx`. The bugs-in-waiting:

| Concern | Current state | Android-specific risk |
|---|---|---|
| `keyboardType="decimal-pad"` | Used correctly | In nb-NO, comma is the decimal separator; `decimal-pad` gives `.` on most Android keyboards. `toNum()` does `.replace(",", ".")` — correct and necessary. |
| Cursor color | Not set | Defaults to platform accent (green on stock Android) — clashes with Kveldsvakt palette. Add `cursorColor={colors.accent}` (Android-only prop). |
| Selection color | Not set | Same issue. `selectionColor={colors.accentSoft}` sets both cursor and selection highlight. |
| Placeholder contrast | `placeholderTextColor={colors.textMuted}` | `#9A928A` on `#221D1A` = 5:1 — passes AA. Good. |
| Autofill | `autoComplete` not set | For rate inputs, autofill suggesting credit card numbers or PINs is possible nuisance. Set `autoComplete="off"`. |
| `returnKeyType` | Not set | Defaults to "Next" on multi-input forms — but the keyboard's "Next" button doesn't advance focus without `onSubmitEditing` wiring. Low priority. |
| IME max length | Not set | Rate fields could accept `maxLength={10}` as a soft guard. |

### Min touch target on TextInput

Current: `min-h-[48px]` on `RateField`'s input. Meets WCAG 2.5.8 AAA. Good.

### DateTimePicker

ShiftPay doesn't seem to use `@react-native-community/datetimepicker` yet, but manual shift entry in `add-shift.tsx` likely does. Android quirks:
- `mode="time"` on Android 12+ uses the **new spinner-based picker** which is ugly but accessible. Switch to `display="spinner"` (legacy) for better UX or live with modern.
- Timezone handling: the picker returns a JS `Date` in device local time. ShiftPay stores times as `HH:mm` strings, so tz doesn't matter — but if you ever serialize full timestamps, watch out.

### Keyboard avoiding

Settings screen uses `KeyboardAvoidingView` with `behavior={Platform.OS === "ios" ? "padding" : undefined}`. On Android, `undefined` is correct because `android:windowSoftInputMode=adjustResize` in AndroidManifest.xml (Expo default) handles it natively. Verified correct.

**Sources:** [RN TextInput docs](https://reactnative.dev/docs/textinput), [ifelsething change cursor color RN](https://www.ifelsething.com/post/change-cursor-color-react-native/), [RN issue #5595 cursor color](https://github.com/facebook/react-native/issues/5595).

---

## 11. Haptics — the overuse trap

ShiftPay wires `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` into **every `PressableScale`** via `haptic = true` default. That's a lot of buzzing — dashboard interactions alone can fire 10+ haptics in a single session.

### What Apple/Google HIGs actually recommend

- **selectionAsync** — for picker/toggle changes. Subtle.
- **impactAsync** — for UI elements appearing/finishing (ShiftPay's current use, too broad).
- **notificationAsync(success/warning/error)** — for completing actions. This is what "Save tariff rates" should fire, not impact.

### Recommended ShiftPay haptic contract

| Action | Haptic | Rationale |
|---|---|---|
| Tap any button (navigation, settings) | **None** or `selection` | Over-haptic'd apps feel noisy |
| Toggle theme / locale / currency | `selection` | Subtle change marker |
| Confirm shift (success) | `notification(Success)` | Completing an intent |
| Confirm shift (error/missed status) | `notification(Warning)` | Negative result worth feeling |
| Save tariff rates (success) | `notification(Success)` | Current: `impact(Medium)` — upgrade this |
| Long-press action | `impact(Medium)` | Intent confirmation |
| Delete shift | `impact(Heavy)` + confirmation | Destructive weight |

### Platform limits to remember

- iOS in Low Power Mode, during camera use, or during voice dictation silently disables haptics.
- Android below API 31 uses `Vibrator.vibrate()` patterns which feel cruder. Expo smooths this where possible but `Heavy` on a Samsung A14 feels like a vibrate-alarm, not a haptic.
- `Haptics.selectionAsync()` on Android is ~5ms; overuse in a list scroll will feel weird.

### Pattern — throttled haptic helper

If ShiftPay wants to keep broad haptic coverage, add a 50ms throttle:

```
// lib/haptics.ts
let last = 0;
export const lightTap = () => {
  const now = Date.now();
  if (now - last < 50) return;
  last = now;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
```

**Sources:** [expo-haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/), [LogRocket customizing RN haptics](https://blog.logrocket.com/customizing-haptic-feedback-react-native-apps/), [expo-haptics npm](https://www.npmjs.com/package/expo-haptics).

---

## 12. Safe area + insets

Expo SDK 54 ships edge-to-edge by default on Android. This has three ShiftPay-relevant consequences:

1. **Status bar** sits above app content by default; `StatusBar` style must adapt to theme.
2. **Navigation bar** (gesture bar or 3-button bar) sits below app content. On Samsung gesture-nav phones, the bottom-tab bar may overlap the system gesture zone without proper insets.
3. **SDK 54 dropped `react-native-edge-to-edge`** in favor of native `enableEdgeToEdge`. All SDK 54 apps on Android 16 run edge-to-edge, `edgeToEdgeEnabled` in app.json has no effect.

### The ShiftPay FAB problem

Dashboard's FAB uses `className="absolute bottom-6 right-6"`. With edge-to-edge, `bottom-6` = 24 px from screen bottom, which is **below the gesture bar** on Samsung S24 / Pixel 8+. Fix:

```
import { useSafeAreaInsets } from "react-native-safe-area-context";
const insets = useSafeAreaInsets();
// FAB style:
style={{ bottom: 24 + insets.bottom, right: 24, ... }}
```

### Tab bar insets

Expo Router's tab layout should use `useSafeAreaInsets().bottom` to pad the tab bar. Unread `app/(tabs)/_layout.tsx` almost certainly handles this (Expo Router default) — verify during implementation.

### ScrollView with insets

Dashboard's ScrollView uses `contentContainerStyle={{ padding: 16, paddingBottom: 80 }}`. The 80px padding accommodates the tab bar but doesn't adapt to tall Android nav bars on gesture-nav phones. Replace with:

```
contentContainerStyle={{ padding: 16, paddingBottom: 80 + insets.bottom }}
```

**Sources:** [Expo Safe areas guide](https://docs.expo.dev/develop/user-interface/safe-areas/), [Expo edge-to-edge blog](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android), [safe-area-context issue #663 (Samsung S24)](https://github.com/AppAndFlow/react-native-safe-area-context/issues/663), [Expo NavigationBar docs](https://docs.expo.dev/versions/latest/sdk/navigation-bar/).

---

## 13. List performance — FlatList vs FlashList vs LegendList

ShiftPay has **no large lists** today. Dashboard's `weekShifts.slice(0, 7)` renders max 7 items as `<View>` mapped with `.map()`. Period detail and summary may show 30+ shifts. The thresholds that drive library choice:

| List size | Library | Why |
|---|---|---|
| < 50 items | `.map()` in `ScrollView` or `FlatList` | Virtualization overhead exceeds savings |
| 50–500 items | `FlatList` with `getItemLayout` + memoization | Built-in, works well |
| 500+ items | `FlashList` (Shopify) | 5–10× better memory, recycler pattern |
| 10,000+ items, complex updates | `LegendList` (@legendapp/list) | Fabric-native, fixes FlashList blank-flash, adds features like dynamic sizing |

For ShiftPay in 2026, **FlatList with `getItemLayout` is the right choice** when the shift count exceeds 50 in any single view. The period detail screen over a year could approach 250 shifts — still comfortably within FlatList's zone if properly memoized.

### FlatList checklist (apply when list > 50)

1. `getItemLayout={(_, i) => ({ length: 80, offset: 80 * i, index: i })}` — eliminates measurement, enables `initialScrollIndex`. Highest-ROI single change.
2. `keyExtractor={useCallback(item => item.id, [])}` — stable identity.
3. `renderItem` wrapped in `useCallback` and the `ShiftCard` wrapped in `React.memo`.
4. `removeClippedSubviews={true}` on Android.
5. `windowSize={5}` and `maxToRenderPerBatch={10}` tuned for the item size.

### FlashList-specific advantages

- Handles variable heights gracefully if you skip `estimatedItemSize`.
- `ListHeaderComponent` and `ListFooterComponent` render with the recycler.
- 2026 benchmarks consistently show **5–10× FPS improvement** over FlatList at 1,000+ items.

### LegendList — when it earns its place

- Needs Fabric (New Architecture). Expo SDK 54 / RN 0.81 has Fabric enabled by default in new projects, so this is available.
- Best for **lots of updates**: stock status, live chat, real-time sports. ShiftPay's shifts update rarely (confirm flow only).
- Currently less mature; FlashList's ecosystem is deeper.

**Recommendation for ShiftPay:** keep FlatList, add `getItemLayout` + memo when period detail ever exceeds 50 items. Don't add FlashList prematurely — it's a dependency you don't need for a ~250-item max list.

**Sources:** [PkgPulse FlashList vs FlatList vs LegendList 2026](https://www.pkgpulse.com/blog/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026), [Expo blog — best RN list component](https://expo.dev/blog/what-is-the-best-react-native-list-component), [FlashList docs](https://shopify.github.io/flash-list/), [LegendList benchmarks](https://legendapp.com/open-source/list/benchmarks/placeholder/), [RN FlatList optimization docs](https://reactnative.dev/docs/optimizing-flatlist-configuration).

---

## Consolidated recommendations for Pass 6

Priority-ordered for the remaining refactor passes:

**P0 — ship-blocker for competition:**
1. **Rewrite `Icon.tsx` imports to individual file paths** (`phosphor-react-native/src/icons/...`). Expected APK reduction: 40–60 MB. ~15 minutes of work, no UX change.
2. **Fix text contrast on `accent` text color over dark bg.** Switch `ShiftCard`'s overtime label and other small-text usages from `text-accent-dark dark:text-accent` to `text-accent-dark dark:text-accent-soft`. WCAG AA compliance.

**P1 — senior polish:**
3. Replace moti `AnimatedCard` with reanimated `FadeInDown.delay()` — drops one dependency.
4. Add `cursorColor` + `selectionColor` to all TextInputs for theme consistency.
5. Audit font weights — drop unused Fraunces/JetBrainsMono instances (estimated 500 KB APK).
6. Add FAB and ScrollView `insets.bottom` compensation for Samsung/Pixel gesture-nav phones.
7. Introduce `cn()` helper and convert `ShiftCard`, `PressableScale`, and `settings.tsx`'s status strings to `cva` variants.

**P2 — nice-to-have:**
8. Skeleton loaders on dashboard first-load (replace full-screen ActivityIndicator).
9. Replace `accessibilityLiveRegion` with `AccessibilityInfo.announceForAccessibility` for the "Lagret" toast (Fabric fix).
10. Narrow haptic contract — use `notificationAsync(Success)` for saves, drop default haptic from every button.
11. Contrast-verification CI script using `apca-w3` to prevent regressions.
12. Consider Lucide migration post-competition if APK size matters for Play Store conversion (below-50 MB tier).

**P3 — revisit later:**
- Style Dictionary + token generation when more than 2 people edit colors.
- NativeWind v5 migration (aligns with Tailwind 4 CSS variables).
- FlashList if any screen exceeds 250 items.
- APCA-based contrast targets once WCAG 3 ships.

---

## Sources (consolidated)

- [NativeWind v4 announcement](https://www.nativewind.dev/blog/announcement-nativewind-v4) — jsxImportSource, cva/tv compatibility, breaking changes
- [NativeWind custom components guide](https://www.nativewind.dev/docs/guides/custom-components)
- [CVA vs Tailwind Variants (DEV)](https://dev.to/webdevlapani/cva-vs-tailwind-variants-choosing-the-right-tool-for-your-design-system-12am)
- [tailwind-merge npm](https://www.npmjs.com/package/tailwind-merge) — performance caveats
- [RN Accessibility docs](https://reactnative.dev/docs/accessibility) — accessibilityLiveRegion, roles
- [RN issue #22440 heading suffix on Android](https://github.com/facebook/react-native/issues/22440)
- [Callstack Android a11y tips](https://www.callstack.com/blog/react-native-android-accessibility-tips)
- [React Native AMA headers guidelines](https://nearform.com/open-source/react-native-ama/guidelines/headers/)
- [APCA Contrast Calculator](https://apcacontrast.com/), [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
- [WCAG 3.0 2026 status](https://web-accessibility-checker.com/en/blog/wcag-3-0-guide-2026-changes-prepare)
- [Humbl Design 2026 color contrast guide](https://humbldesign.io/blog-posts/color-accessibility-guide-wcag)
- [Reanimated performance docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [Reanimated entering/exiting animations](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/)
- [Reanimated 3 → 4 migration](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
- [Viewlytics advanced RN animations](https://viewlytics.ai/blog/react-native-advanced-animations-guide)
- [phosphor-react-native npm](https://www.npmjs.com/package/phosphor-react-native) — tree-shaking caveat
- [phosphor-react-native GitHub](https://github.com/duongdev/phosphor-react-native)
- [Metro tree-shaking issue #227](https://github.com/facebook/metro/issues/227)
- [CodeToDeploy — hidden bundle cost of React icons 2026](https://medium.com/codetodeploy/the-hidden-bundle-cost-of-react-icons-why-lucide-wins-in-2026-1ddb74c1a86c)
- [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native)
- [Best RN icon libraries 2026 (Lineicons)](https://lineicons.com/blog/best-react-native-icons-libraries)
- [Callstack RN bundle optimization](https://www.callstack.com/blog/optimize-react-native-apps-javascript-bundle)
- [Expo Fonts guide](https://docs.expo.dev/develop/user-interface/fonts/)
- [expo-font SDK](https://docs.expo.dev/versions/latest/sdk/font/)
- [Expo Google Fonts repo](https://github.com/expo/google-fonts)
- [RN variable fonts proposal #829](https://github.com/react-native-community/discussions-and-proposals/issues/829)
- [i18n-js npm](https://www.npmjs.com/package/i18n-js)
- [ICU Message Format 2026 (Crowdin)](https://crowdin.com/blog/icu-guide)
- [Zignuts React i18n 2026](https://www.zignuts.com/blog/complete-guide-multilingual-support-react-i18n)
- [Lokalise React i18n guide](https://lokalise.com/blog/react-i18n-intl/)
- [Style Dictionary + Tailwind (DEV)](https://dev.to/philw_/using-style-dictionary-to-transform-tailwind-config-into-scss-variables-css-custom-properties-and-javascript-via-design-tokens-24h5)
- [Tokens Studio sd-tailwindv4](https://github.com/tokens-studio/sd-tailwindv4/)
- [Invisi.dev — Design systems that build themselves](https://www.invisi.dev/blog/design-systems-that-build-themselves-using-style-dictionary-tailwindcss)
- [OneUpTime RN skeleton loading 2026](https://oneuptime.com/blog/post/2026-01-15-react-native-skeleton-loading/view)
- [RN TextInput docs](https://reactnative.dev/docs/textinput)
- [ifelsething cursor color RN](https://www.ifelsething.com/post/change-cursor-color-react-native/)
- [expo-haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [LogRocket RN haptics](https://blog.logrocket.com/customizing-haptic-feedback-react-native-apps/)
- [Expo safe areas guide](https://docs.expo.dev/develop/user-interface/safe-areas/)
- [Expo edge-to-edge blog](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android)
- [safe-area-context Samsung S24 issue #663](https://github.com/AppAndFlow/react-native-safe-area-context/issues/663)
- [PkgPulse FlashList vs FlatList vs LegendList 2026](https://www.pkgpulse.com/blog/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026)
- [Expo — best RN list component](https://expo.dev/blog/what-is-the-best-react-native-list-component)
- [RN FlatList optimization docs](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [FlashList docs](https://shopify.github.io/flash-list/)
- [LegendList benchmarks](https://legendapp.com/open-source/list/benchmarks/placeholder/)
