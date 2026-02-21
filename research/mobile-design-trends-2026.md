# Research: Modern Mobile App Design Trends 2025-2026

> Researched: 2026-02-21 | Sources consulted: 28 | Confidence: High

## TL;DR

The "Linear aesthetic" (dark, minimal, Inter font, subtle gradients, muted accents) has become the defining look of modern utility apps. Apple's Liquid Glass (WWDC 2025) is pushing translucent/frosted surfaces mainstream. Flat single-color cards are out — replaced by subtle gradients, layered elevation via opacity, and dark glassmorphism. The biggest risk for a competition app is looking "vibe-coded" (default Tailwind purple buttons, generic rounded cards, no personality). To stand out: pick a strong dark palette, use Inter Display for headlines, add spring-based micro-interactions, and invest in one or two signature animations.

---

## 1. Visual Trends in Top-Rated Utility/Finance Apps

### The "Linear Aesthetic" — The Dominant Trend

Linear (the project management tool) has become the most imitated design language in SaaS and utility apps. Key characteristics:

- **Dark-first design** — dark backgrounds are the default, light mode is secondary
- **Monochrome base with minimal accent colors** — mostly black/white/gray with 1-2 accent colors used sparingly
- **LCH color space** — Linear switched from HSL to LCH for perceptually uniform color generation. Only 3 variables needed: base color, accent color, contrast level (30-100)
- **Typography**: Inter (body) + Inter Display (headlines)
- **Layered surfaces via opacity** — elements use opacities of black/white rather than distinct background colors
- **Extremely refined alignment** — meticulous vertical/horizontal alignment that users "feel rather than see"

**Linear's actual dark theme tokens:**
```
--bg: #121212
--text: #cccccc
--alt-bg: #1b1c1d
--accent: #848CD0
--input-bg: #171717
```

**Linear's light theme tokens:**
```
--bg: #F7F7F7
--text: #2f2f2f
--alt-bg: #DDDDDD
--accent: #8327c9
--input-bg: #ffffff
```

### Revolut's Design Language

Revolut uses a restrained, professional dark approach:

- **Core palette**: Shark (#191C1F), White (#FFFFFF), Cornflower Blue (#7F84F6)
- **Dark mode**: Multiple shades of charcoal/black for layered depth
- **User-selectable color themes** from a curated palette
- **Balance front-and-center** on the home screen with readily accessible key actions
- **Card-based layouts** with ample white space

### Fintech UI Patterns (Cross-App Consensus)

From analyzing 15+ finance/fintech apps:

| Pattern | Standard |
|---------|----------|
| Border radius | 8px standard, 12-16px for prominent cards |
| Shadows | Subtle: `-6px 14px 46px` at low opacity |
| Card backgrounds | Semi-transparent or 1-2 steps lighter than page bg |
| Key numbers | Large, bold, front-and-center |
| Secondary data | Lighter weight, smaller, muted color |
| CTAs | Vibrant accent color (oranges, greens) |
| Error states | Red (#EF4444) |
| Success states | Green (#10B981) |

---

## 2. Color and Gradient Trends

### The Shift Away from Flat Colors

Flat single-color backgrounds are definitively out. The 2026 approach:

1. **Mesh gradients** — multi-point gradients with organic color flow (not linear 2-color gradients)
2. **Cinematic/ambient gradients** — soft-glow, atmospheric lighting effects
3. **Monochrome with strategic color pops** — 90% neutral, 10% vibrant accent

### Color Palette Approaches That Feel Fresh

**Blue-green tones** are THE color trend of 2026 — blending ocean mystery with tech sleekness. Works in both sterile and fun contexts.

**Recommended dark mode palettes for a utility app:**

**Slate Professional** (recommended for ShiftPay):
```
Background:      #0F172A
Surface:         #1E293B
Elevated:        #334155
Accent:          #38BDF8
Text Primary:    #F1F5F9
Text Secondary:  #94A3B8
Success:         #10B981
Warning:         #F59E0B
Error:           #EF4444
```

**Carbon Dark** (clean, minimal):
```
Background:      #18181B
Surface:         #27272A
Accent:          #22D3EE
Highlight:       #A78BFA
Success:         #4ADE80
Warning:         #FBBF24
Text Primary:    #FAFAFA
Text Secondary:  #A1A1AA
```

**Midnight Blue** (premium feel):
```
Background:      #0C1E35
Surface:         #1A2942
Accent:          #60A5FA
Secondary:       #34D399
Warning:         #FBBF24
Error:           #F87171
Text Primary:    #E0F2FE
Text Secondary:  #7DD3FC
```

### Gradient Implementation

For buttons and borders, modern apps use dual-axis gradients:
```css
background: linear-gradient(135deg, #e24c4a 0%, #386bb7 100%);
```

For background ambience, mesh gradients or radial gradients with very low opacity (5-15%) create depth without distraction.

### Pantone 2026 + Industry Direction

- Pantone Color of the Year 2026: Cloud Dancer (#F0EDE5) — warm white/off-white
- Neo-mint + pastels for optimistic UI contexts
- Electric purples and thermal-inspired gradients for bold/premium contexts

---

## 3. Card and Container Styles

### Glassmorphism Is Back — But Smarter

Glassmorphism didn't die; it matured. The 2026 version is:

- **More restrained** — used for overlays, modals, and floating cards only (not every surface)
- **Dark glassmorphism** — frosted glass on dark backgrounds, not light
- **Higher blur, lower opacity** — more subtle than the 2021-2022 versions
- **Apple Liquid Glass** — WWDC 2025 made translucent materials the OS-level standard

### Implementation in React Native (Expo)

```jsx
import { BlurView } from "expo-blur";

// Frosted glass card
<BlurView
  intensity={60}
  tint="dark"
  style={{
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
  }}
>
  {children}
</BlurView>
```

**Blur intensity guide:**
| Effect | Intensity | Use Case |
|--------|-----------|----------|
| Light frosting | 20-30 | Subtle background depth |
| Medium glass | 50-60 | Cards, overlays |
| Heavy frost | 80+ | Modal backgrounds, sheets |

**Performance notes:**
- Max 1-2 blur layers per screen
- Use `renderToHardwareTextureAndroid={true}` for GPU acceleration
- expo-blur bundle: ~70KB
- Target: 55-60 FPS with blur active

### Modern Card Styles (Non-Glass)

For non-glassmorphism cards, the trend is:

```
// "Elevated surface" approach (Linear-style)
backgroundColor: surface color (1-2 steps lighter than bg)
borderRadius: 12-16px
border: 1px solid rgba(255,255,255,0.06)
padding: 16-20px

// No drop shadows in dark mode — use border + background difference
```

The key insight: **in dark mode, elevation is communicated through lighter backgrounds, not shadows.** Material Design uses semi-transparent overlays of the primary color at higher elevations.

---

## 4. Typography Trends

### Font Choices

The consensus for 2025-2026 utility apps:

| Font | Use Case | Notes |
|------|----------|-------|
| **Inter** | Body text, labels | The default "modern" choice. Free, designed for screens, large x-height |
| **Inter Display** | Headlines, hero numbers | More expressive version with optical adjustments for large sizes |
| **DM Sans** | Alternative body font | Slightly more geometric/friendly than Inter |
| **Satoshi** | Trendy alternative | More personality, works for brands wanting distinction |
| **Geist** | Developer/tech apps | Vercel's font, increasingly popular for tools |
| **SF Pro** | iOS system font | Use system font stack for native feel on iOS |

**For ShiftPay recommendation:** Inter for body + Inter Display for headlines. Universally readable, professionally modern, free.

### Font Sizes and Weights (Mobile)

```
// Type scale (mobile, in px)
Display/Hero:     32-40px, weight 700 (Bold)
H1:               28-32px, weight 700
H2:               22-24px, weight 600 (SemiBold)
H3:               18-20px, weight 600
Body:             16px,    weight 400 (Regular)
Body Small:       14px,    weight 400
Caption:          12px,    weight 500 (Medium)
Label:            11-12px, weight 600, letter-spacing: 0.5px

// Line heights
Headings:         1.2-1.3x font size
Body:             1.5-1.6x font size (24px for 16px text on 8px grid)
Captions:         1.4x
```

### Key Typography Trends

1. **Variable fonts** are the standard — adjust weight/width dynamically for interaction states
2. **Width axis (wdth 75-85%)** is the new frontier — condensed widths at large point sizes
3. **Bold headline + light body** contrast is the primary hierarchy tool
4. **Letter-spacing on labels/overlines** (0.5-1px) signals category separation
5. **Numbers as hero elements** — financial/data apps make key figures 32-48px bold

---

## 5. Spacing and Layout

### The 8px Grid System

Both Apple HIG and Material Design endorse the 8px base grid. It is the industry standard:

```
// Spacing scale
4px    — Tight: icon-to-text gap, inline spacing
8px    — Small: between related elements, list item gap
12px   — Medium-small: card internal padding (compact)
16px   — Medium: between content sections, card padding, grid margins on mobile
20px   — Medium-large: mobile grid margins (alternative)
24px   — Large: section separation, heading spacing above
32px   — XL: major section breaks, heading spacing above
48px   — XXL: page-level visual breaks
64px   — XXXL: hero section spacing
```

### Touch Targets

| Platform | Minimum Size |
|----------|-------------|
| iOS | 44x44 points |
| Android | 48dp (48px at 1x) |
| Between interactive elements | 8-12px gap |
| Between button groups | 16-24px gap |

### Bento Grid Layouts

Bento grids are the hot layout trend for dashboards:

- **67% of top 100 SaaS sites** on ProductHunt use some bento-style layout
- Users complete tasks **23% faster** on modular/bento layouts vs linear layouts
- On mobile: 2-column grid with varying tile heights
- Keep to **max 6-8 visible tiles** on mobile (12-15 max on desktop)
- Mix tile sizes: 1x1, 2x1, 1x2 for visual hierarchy
- Don't make all tiles the same size — asymmetric but balanced

**For ShiftPay dashboard:** A bento-style layout for the dashboard home screen (next shift = large tile, weekly summary = medium, quick actions = small tiles) would feel very 2026.

### Whitespace Philosophy

Modern apps use **significantly more whitespace** than 2020-era apps. The trend is:

- Card padding: 16-20px (not 12px)
- Section gaps: 24-32px (not 16px)
- Screen edge margins: 16-20px
- "Breathing room" between logical groups: 32px+
- Empty states get generous vertical space (120px+ top padding)

---

## 6. Micro-Interactions and Animation

### What's Expected (Table Stakes)

These animations are no longer "nice to have" — users expect them:

| Interaction | Expected Animation | Duration |
|------------|-------------------|----------|
| Screen transitions | Shared element / crossfade | 300-400ms |
| Button press | Scale down 0.97 + haptic | 100-150ms |
| List item appear | Staggered fade-in from bottom | 200-400ms staggered |
| Pull to refresh | Spinner tied to finger distance | Gesture-driven |
| Tab switch | Crossfade or slide | 200-300ms |
| Bottom sheet open | Spring animation | 300-500ms |
| Success action | Check mark + color flash + haptic | 400-600ms |
| Delete/dismiss | Swipe away with spring | Gesture-driven |
| Number change | Animated counter (roll/fade) | 300-500ms |
| Toggle | Scale bounce + color transition | 200ms |

### React Native Reanimated Spring Config

The default `withSpring` config in Reanimated:
```js
// Default values
withSpring(toValue, {
  stiffness: 900,    // How bouncy (higher = snappier)
  damping: 120,      // How quickly it settles (higher = less bounce)
  mass: 4,           // Weight (lower = faster)
  velocity: 0,       // Initial velocity
  overshootClamping: false,
});

// Recommended presets for common UI patterns:

// Snappy (buttons, toggles)
{ stiffness: 1000, damping: 80, mass: 1 }

// Gentle (sheets, modals)
{ stiffness: 300, damping: 30, mass: 1 }

// Bouncy (success animations, fun elements)
{ stiffness: 600, damping: 15, mass: 1 }
```

### withTiming Defaults
```js
withTiming(toValue, {
  duration: 300,  // ms — default
  easing: Easing.inOut(Easing.quad),  // default curve
});

// Recommended durations:
// Micro (opacity, scale): 150-200ms
// Standard (position, size): 250-350ms
// Complex (layout shifts): 400-500ms
// Never exceed 500ms for UI interactions
```

### Animation Library Stack for Expo

| Library | Best For | Expo Support |
|---------|----------|-------------|
| **Reanimated 3** | Core gesture/scroll/layout animations | Full |
| **Moti** | Declarative enter/exit/animate (Framer Motion API) | Full |
| **Lottie** | Complex designer-made animations (JSON, <100KB) | Full |
| **Gesture Handler v2** | Swipe, pan, pinch gestures | Full |
| **React Native Skia** | Custom graphics, charts, GPU rendering | Partial |

**Recommended combo:** Reanimated 3 for interactions + Moti for enter/exit animations + Lottie for polish (loading, success, empty states).

### What's Over-the-Top

Avoid:
- Parallax backgrounds on every screen
- 3D card flip animations for data display
- Animated gradients running constantly
- Bounce animations on every element
- Animation duration > 500ms for routine interactions

---

## 7. Dark Mode

### Is It Table Stakes?

**Yes.** In 2026, dark mode is mandatory for utility/finance apps. Statistics:
- 82% of smartphone users have tried dark mode
- Finance/tool apps have higher dark mode adoption than social apps
- Dark UIs convey "premium," "focused," and "professional"
- OLED screens (most modern phones) save battery in dark mode

### Implementation Approach

**Don't invert — redesign.** The right approach is redesigning the entire color system:

```
// WRONG: Just inverting light mode
light bg #FFFFFF → dark bg #000000  // Too harsh

// RIGHT: Dedicated dark palette
Background:    #0F172A or #121212 or #09111A (dark gray, NOT pure black)
Surface L1:    #1E293B (elevated cards)
Surface L2:    #334155 (higher elevation)
Border:        rgba(255, 255, 255, 0.06-0.12)
Text Primary:  #F1F5F9 (NOT pure white — reduces eye strain)
Text Secondary: #94A3B8
Accent:        Desaturate and lighten by 1-2 steps from light mode
```

**Key rules:**
- Background: #121212 or similar dark gray (NOT #000000) — Material Design standard
- Contrast ratio: 15.8:1 minimum (text on bg) per Material guidelines
- Use 200-50 range tones (lighter variants) for accent colors on dark backgrounds
- Saturated colors "vibrate" on dark backgrounds — desaturate them
- Elevation = lighter surface (not shadows, which are invisible on dark bg)

### NativeWind v4 Dark Mode Setup

```css
/* global.css */
:root {
  --color-bg: 15 23 42;       /* #0F172A */
  --color-surface: 30 41 59;  /* #1E293B */
  --color-accent: 56 189 248; /* #38BDF8 */
  --color-text: 241 245 249;  /* #F1F5F9 */
  --color-muted: 148 163 184; /* #94A3B8 */
}

/* Light mode override */
@media (prefers-color-scheme: light) {
  :root {
    --color-bg: 248 250 252;
    --color-surface: 255 255 255;
    --color-accent: 14 165 233;
    --color-text: 15 23 42;
    --color-muted: 100 116 139;
  }
}
```

**Important NativeWind v4 note:** Remove `darkMode` from tailwind.config.js entirely. NativeWind v4 uses CSS custom properties and system detection automatically.

---

## 8. Mobile-Specific Patterns

### Bottom Sheets

Bottom sheets are the primary modal pattern in 2026 mobile apps. Best practice:

- **Use @gorhom/bottom-sheet v5** (Reanimated 3 + Gesture Handler v2)
- Spring animation for natural movement
- Dynamic border radius (round when open, zero when full-screen)
- Snap points: typically 25%, 50%, 90% of screen height
- Backdrop overlay: rgba(0,0,0,0.4-0.6)
- Haptic feedback on snap transitions

```bash
npx expo install @gorhom/bottom-sheet
```

### Gesture Navigation

- **Swipe to dismiss** on detail views (right-to-left or top-to-bottom)
- **Long press** for context menus (replace with bottom sheet on mobile)
- **Pull to refresh** with custom animations
- **Swipe actions on list items** (confirm, edit, delete)
- Design for **thumb zones** — primary actions in bottom 1/3 of screen

### Haptic Feedback (expo-haptics)

```js
import * as Haptics from "expo-haptics";

// Button press
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Toggle switch
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

// Success action (shift confirmed)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error/warning
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Selection change (picker, slider)
Haptics.selectionAsync();

// Android-specific (21 types including Clock_Tick, Keyboard_Press, etc.)
Haptics.performAndroidHapticsAsync("Long_Press");
```

**When to use haptics:**
- Button presses (Light impact)
- Toggle/switch changes (Rigid impact)
- Success/error feedback (Notification)
- Picker/slider value changes (Selection)
- Bottom sheet snap points (Medium impact)
- Swipe action thresholds (Light impact)

### Navigation Patterns

- **Bottom tab bar** remains the primary navigation (4-5 items max)
- **Floating action button** is declining in favor of inline actions
- Tab bar: 56-64px height, icons + labels, active state with accent color
- Consider a **custom animated tab bar** for competition differentiation

---

## 9. What Makes an App Look "AI-Generated" vs. "Human-Designed"

### The Dead Giveaways of Vibe-Coded Design

1. **Default Tailwind purple buttons** (#8B5CF6) — the single biggest tell
2. **Generic rounded corners on everything** — same border-radius across all elements
3. **Flat teal/indigo color scheme** with no personality
4. **Card layouts where all cards are identical size** — no visual hierarchy
5. **System font stack with no intentional typography choices**
6. **Symmetrical layouts** — everything perfectly centered, no intentional asymmetry
7. **Too many colors** — AI tends to use 4-5 accent colors; humans use 1-2
8. **No empty states** — AI doesn't think about what happens when there's no data
9. **Generic icons** (Heroicons defaults) without customization
10. **No micro-interactions** — static UI that doesn't respond to touch
11. **Cookie-cutter onboarding** — 3 swipeable cards with illustration + text + button
12. **"Design by committee" feel** — every element is "correct" but nothing has personality
13. **Excessive padding uniformity** — every gap is the same size
14. **No brand color differentiation** — looks like it could be any app

### How to Avoid the AI Look

1. **Pick ONE distinctive accent color** — not the default. For ShiftPay, consider warm amber (#F59E0B) or a coral (#F87171) instead of generic teal
2. **Vary your border radii intentionally** — 8px for cards, 12px for buttons, 20px for avatar/pills, 4px for input fields
3. **Use asymmetric layouts** — bento grids, offset elements, varying card sizes
4. **Add one signature animation** — a custom loading state, a distinctive transition
5. **Design your empty states** — this is where personality lives
6. **Customize your icons** — pick a consistent icon set and modify 2-3 key icons
7. **Create visual tension** — not everything needs to be aligned to the same grid
8. **Add texture or subtle noise** to backgrounds (even 1-2% noise adds warmth)
9. **Use real data in your designs** — not "John Doe" and "Lorem ipsum"
10. **Have opinions** — the best apps make deliberate trade-offs (dark-only, bold typography, unconventional navigation)

### The Core Problem

> LLMs are homogenizers. Fixation happens when early AI-generated solutions feel so complete that users prematurely converge on them. When everyone asks for "a shift tracking app with card layout," you get the same app 1000 times.

**The fix is taste and intentional deviation.** Describe your aesthetic explicitly and manually override AI defaults.

---

## 10. React Native / NativeWind Specifics

### What's Achievable in Current Tooling

| Feature | Library | Difficulty | Performance |
|---------|---------|-----------|-------------|
| Dark mode with tokens | NativeWind v4 CSS vars | Easy | Native |
| Blur/glass cards | expo-blur (BlurView) | Easy | 55-60 FPS |
| Spring animations | Reanimated 3 | Medium | 60 FPS (native thread) |
| Gesture-driven sheets | @gorhom/bottom-sheet v5 | Easy | 60 FPS |
| Enter/exit animations | Moti | Easy | 60 FPS |
| Haptic feedback | expo-haptics | Easy | Native |
| Animated counters | Reanimated + Moti | Medium | 60 FPS |
| Custom tab bar | Reanimated + SVG | Medium | 60 FPS |
| Staggered list animations | Moti | Easy | 60 FPS |
| Shared element transitions | expo-router (experimental) | Hard | Variable |
| Lottie animations | lottie-react-native | Easy | 60 FPS |
| Skia graphics/charts | react-native-skia | Hard | 60 FPS |

### NativeWind v4 Dark Mode Pattern

```jsx
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,tsx}", "./components/**/*.{js,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
      },
    },
  },
  // Do NOT set darkMode — NativeWind v4 handles it via CSS vars
};
```

### Moti Quick Patterns

```jsx
import { MotiView, MotiText } from "moti";

// Fade in on mount
<MotiView
  from={{ opacity: 0, translateY: 20 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{ type: "timing", duration: 400 }}
/>

// Staggered list (wrap in AnimatePresence)
{items.map((item, i) => (
  <MotiView
    key={item.id}
    from={{ opacity: 0, translateY: 15 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ delay: i * 80 }}
  />
))}

// Press scale animation
<MotiPressable
  animate={({ pressed }) => ({
    scale: pressed ? 0.97 : 1,
  })}
  transition={{ type: "spring", stiffness: 1000, damping: 80 }}
/>
```

### Recommended Package Versions (Feb 2026)

```json
{
  "nativewind": "^4.x",
  "react-native-reanimated": "^3.x",
  "moti": "^0.29",
  "@gorhom/bottom-sheet": "^5.x",
  "react-native-gesture-handler": "^2.x",
  "expo-blur": "latest",
  "expo-haptics": "latest",
  "lottie-react-native": "latest"
}
```

---

## Concrete Recommendations for ShiftPay

### Priority 1: Color System Overhaul

Replace the flat teal scheme with a dark-first palette:

```
// ShiftPay suggested palette
Background:       #0F172A  (slate-900)
Surface:          #1E293B  (slate-800)
Surface Elevated: #334155  (slate-700)
Border:           rgba(255, 255, 255, 0.08)
Accent Primary:   #38BDF8  (sky-400 — shift/schedule actions)
Accent Warm:      #F59E0B  (amber-500 — pay/money highlights)
Success:          #10B981  (emerald-500 — confirmed shifts)
Warning:          #F59E0B  (amber-500)
Error:            #EF4444  (red-500 — missed shifts)
Text Primary:     #F1F5F9  (slate-100)
Text Secondary:   #94A3B8  (slate-400)
Text Muted:       #64748B  (slate-500)
```

The sky-blue accent + amber for money creates a clear visual language: blue = schedule, amber = pay.

### Priority 2: Dashboard Bento Layout

Replace flat card list with a bento grid:
- **Large tile** (2x1): Next upcoming shift with countdown
- **Medium tile** (1x1): This month's expected pay (big number, amber accent)
- **Medium tile** (1x1): Unconfirmed shifts count (action needed)
- **Small tiles** (1x1): Quick actions (import, settings)

### Priority 3: Add Micro-Interactions

Minimum viable animations:
1. Staggered fade-in on dashboard tiles (Moti, 80ms delay per tile)
2. Spring press animation on all tappable elements (scale 0.97)
3. Haptic feedback on shift confirmation (Success notification)
4. Animated number transition for pay amounts
5. Bottom sheet for shift details instead of full-screen navigation

### Priority 4: Typography

- Switch to Inter (body) + Inter Display (headlines/hero numbers)
- Hero pay amount: 36-40px, weight 700, amber accent
- Section headers: 18px, weight 600
- Body: 16px, weight 400
- Captions: 12px, weight 500, uppercase for labels

---

## Gotchas & Considerations

- **BlurView performance**: Max 1-2 blur layers per screen. More causes FPS drops on mid-range Android
- **NativeWind v4 dark mode**: Do NOT set `darkMode: 'class'` in config — causes conflicts with system detection
- **Reanimated babel plugin**: Must be LAST in the plugins array in babel.config.js
- **Inter Display**: Not bundled with Expo — needs to be loaded via expo-font or Google Fonts
- **Liquid Glass**: Apple's new design language requires iOS 26+ and iPhone 15+. Don't depend on it for cross-platform apps
- **Android haptics**: expo-haptics has 21 Android-specific types beyond the iOS-compatible ones. Consider platform-specific haptic patterns
- **Dark mode testing**: Test on actual OLED screens — emulators don't show true black rendering
- **Accessibility**: Dark mode contrast minimum is 4.5:1 for body text, 3:1 for large text. Use 15.8:1 (Material guideline) for maximum readability

---

## Sources

1. [Linear UI Redesign (Part II)](https://linear.app/now/how-we-redesigned-the-linear-ui) — LCH color system, theme generation approach, Inter Display adoption
2. [Linear Style Themes](https://linear.style/) — Actual CSS variables and dark/light theme token values
3. [Linear Design Trend (LogRocket)](https://blog.logrocket.com/ux-design/linear-design/) — Analysis of Linear aesthetic as SaaS trend
4. [Dark Mode Color Palettes Guide](https://mypalettetool.com/blog/dark-mode-color-palettes) — Complete hex palettes for Slate, Carbon, Midnight, Obsidian themes
5. [Scalable Dark Theme Design](https://www.fourzerothree.in/p/scalable-accessible-dark-mode) — #09111A base, contrast ratios, elevation system
6. [Fintech UI Examples (Eleken)](https://www.eleken.co/blog-posts/trusted-fintech-ui-examples) — Border radius, shadow, layout patterns across 15+ apps
7. [Modern App Colors 2026 (WebOsmotic)](https://webosmotic.com/blog/modern-app-colors/) — Hex values, gradient definitions
8. [Mobile App Design Trends 2026 (UX Pilot)](https://uxpilot.ai/blogs/mobile-app-design-trends) — Glassmorphism specs, micro-interaction patterns, adaptive UI
9. [8 UI Trends 2025 (Pixelmatters)](https://www.pixelmatters.com/insights/8-ui-design-trends-2025) — Geist font, badge/button styling, spacing patterns
10. [Vibe Coding Design Homogenization](https://seanvoisen.com/writing/vibe-coding-design-homogenization/) — AI design pitfalls, fixation effects, purple button syndrome
11. [Apple Liquid Glass (WWDC 2025)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) — Official announcement, design language details
12. [Liquid Glass in React Native (Cygnis)](https://cygnis.co/blog/implementing-liquid-glass-ui-react-native/) — BlurView implementation, intensity values, performance targets
13. [Reanimated withSpring docs](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) — Default spring values, configuration options
14. [Reanimated withTiming docs](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/) — Default timing, easing functions
15. [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/) — All feedback types, Android-specific haptics
16. [React Native Animation Libraries 2026 (F22 Labs)](https://www.f22labs.com/blogs/9-best-react-native-animation-libraries/) — Library comparison, Expo compatibility
17. [NativeWind v4 Dark Mode docs](https://www.nativewind.dev/docs/core-concepts/dark-mode) — CSS variables approach, system detection
18. [Mobile Layout Spacing Rules (Glance)](https://thisisglance.com/learning-centre/what-spacing-rules-create-better-mobile-app-layouts) — Complete spacing scale, touch targets, grid margins
19. [Bento Grid Design Guide (Landdding)](https://landdding.com/blog/blog-bento-grid-design-guide) — 67% SaaS adoption, 23% faster task completion, mobile implementation
20. [@gorhom/bottom-sheet](https://gorhom.dev/react-native-bottom-sheet/) — v5 with Reanimated 3, snap points, spring animation
21. [Revolut Brand Colors (Mobbin)](https://mobbin.com/colors/brand/revolut) — Core palette: Shark, White, Cornflower Blue
22. [2026 App Color Schemes (DesignRush)](https://www.designrush.com/best-designs/apps/trends/app-colors) — Blue-green trends, neo-mint, accessibility focus
23. [Moti Documentation](https://moti.fyi/) — Declarative animation API, Reanimated 3 integration
24. [Mobile App Typography 2026 (Zignuts)](https://www.zignuts.com/blog/mastering-mobile-app-typography-best-practices-pro-tips) — Font size scales, line heights, weight recommendations
25. [AI Turning Every App Into Same Product (Aakash Gupta)](https://aakashgupta.medium.com/ai-is-turning-every-new-app-into-the-same-boring-product-184d8eef5525) — AI design homogenization analysis
26. [Mobile Navigation UX 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/) — Bottom sheet patterns, thumb zones, gesture navigation
27. [Expo BlurView docs](https://docs.expo.dev/versions/latest/sdk/blur-view/) — Intensity range, tint options, Reanimated integration
28. [Best Fonts for Apps 2025 (Frontmatter)](https://www.frontmatter.io/blog/best-fonts-for-apps-in-2025-top-picks-for-ios-and-android-ui-design) — Inter, DM Sans, Satoshi, SF Pro comparison
