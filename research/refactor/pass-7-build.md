# Pass 7: Build & Bundle Optimization — ShiftPay (Expo SDK 54 / RN 0.81)

> Researched: 2026-04-16 | Sources consulted: 20+ | Confidence: High
> APK today: 127 MB release (up from 46 MB pre-Kveldsvakt). Target: <30 MB Play Store download, <55 MB universal APK.

## TL;DR

ShiftPay ships a 127 MB APK because the project has **every Android size-optimization lever turned off or misconfigured**: `minifyEnabled=false`, `shrinkResources=false`, all four ABIs built into a single universal APK (`armeabi-v7a,arm64-v8a,x86,x86_64`), `buildType=apk` (not `app-bundle`) for the release profile referenced day-to-day, four font families from `@expo-google-fonts/*` bundled in full, `phosphor-react-native` likely pulled through its barrel file (disabling Metro's already-shaky tree-shaking), and the JS bundle is not compressed (`android.enableBundleCompression=false`). Expo SDK 54 enabled experimental tree-shaking by default, but it only shakes ES modules and is defeated by Babel plugins or CJS. The **5 quick wins below can realistically recover ~70–85 MB** without any functional change.

## Quick wins — do these first (expected MB saved)

Ordered by effort-to-MB ratio. All are reversible via gradle property toggles that already exist in `android/app/build.gradle`.

| # | Action | Est. saved (MB) | Effort | Risk |
|---|--------|-----------------|--------|------|
| 1 | Switch release to **AAB + Play Store delivery** (`production` profile already has `buildType: "app-bundle"` — use it and measure install size, not APK size) | 40–70 MB Play Store download | 1 h | None — Play Store only |
| 2 | Set `reactNativeArchitectures=arm64-v8a` in `android/gradle.properties` (drop x86, x86_64, armeabi-v7a). All Android 10+ devices are arm64 and Google Play delivers per-ABI from AABs anyway | 25–35 MB universal APK; 0 MB Play Store (AAB already splits) | 5 min | Loses sideload support on 32-bit emulators and old x86 tablets; acceptable for shift-worker target audience |
| 3 | Enable R8 minification + resource shrinking. Set `android.enableMinifyInReleaseBuilds=true` **and** `android.enableShrinkResourcesInReleaseBuilds=true` in `gradle.properties`. Add minimal keep rules for reanimated, turbomodules, hermes, expo | 15–25 MB (30–50% of DEX + resources) | 2 h including crash-test cycle | Medium — must test release build on device; crash logs become obfuscated |
| 4 | Tree-shake Phosphor icons. Audit actual icon usage, switch from barrel imports to per-icon deep imports (`phosphor-react-native/src/icons/<Name>`) **or** migrate to `lucide-react-native` with per-icon imports | 5–12 MB JS bundle | 2–4 h | Low — search/replace job, visual diff |
| 5 | Enable JS bundle compression: `android.enableBundleCompression=true` in `gradle.properties` (already property-gated, defaults to false in RN template) | 2–4 MB APK | 1 min | None |
| 6 | Drop unused `@expo-google-fonts/*` packages. You currently ship Fraunces, Inter, Inter Tight, JetBrains Mono. Each TTF weight ~200–300 KB. Inter alone has 9 weights × 200 KB = 1.8 MB before subsetting. Ship only weights you actually render | 3–8 MB assets | 3 h (audit usage + test) | Low |
| 7 | Subset fonts with `pyftsubset` to Latin-Extended-A (covers nb/sv/da/en) — cuts each font ~60% | 3–5 MB assets | 2 h | Low — scripted and automatable |
| 8 | `resConfigs "en","nb","sv","da"` in build.gradle defaultConfig to strip locale resources pulled in by Google Play Services, androidx, etc. | 2–5 MB resources | 5 min | None |
| 9 | Audit `expo-document-picker` + `expo-sharing` + `expo-image-picker` — confirm each is actually imported. Remove unused expo-modules via the `expo.autolinking.exclude` list you already use for dev-client | 1–4 MB native libs per removed module | 1 h | None if actually unused |
| 10 | Fix bundle analysis workflow: run Expo Atlas once, commit the `.expo/atlas.jsonl` as a size baseline, then diff on every PR | 0 MB direct, but prevents future 127 MB surprises | 30 min | None |

**Cumulative realistic target**: Quick wins 1–6 alone should drop ShiftPay's Play Store download to the 15–25 MB range, with universal APK around 45–60 MB. Full optimization stack (everything below) brings Play Store download under 12 MB.

## Diagnosis procedure — where did 81 MB go after Kveldsvakt?

Execute this in order. Every step produces a concrete artifact you can diff against pre-Kveldsvakt.

### Step 1: Install `apkanalyzer` (Android SDK Command-Line Tools)

`apkanalyzer` lives at `android_sdk/cmdline-tools/latest/bin/apkanalyzer(.bat)`. If not already installed, grab it via Android Studio → SDK Manager → SDK Tools → Android SDK Command-line Tools (latest).

### Step 2: Top-level size breakdown

```
apkanalyzer apk summary shiftpay-release.apk
apkanalyzer apk file-size shiftpay-release.apk
apkanalyzer apk download-size shiftpay-release.apk
```

`file-size` is the raw 127 MB. `download-size` is the estimate after Play Store signing — expect this to be 55–70 MB for a universal APK, or much smaller once split.

### Step 3: Per-directory breakdown (the smoking gun)

```
apkanalyzer files list shiftpay-release.apk
```

This prints every entry with raw + download size. Pipe through `sort -k2 -n` to find the fattest files. For a 127 MB Hermes RN 0.81 app, the expected ranking is:

1. `lib/arm64-v8a/*.so` + `lib/armeabi-v7a/*.so` + `lib/x86/*.so` + `lib/x86_64/*.so` — **each arch 20–30 MB** after RN 0.73's `extractNativeLibs=false` default. Four architectures = 80–120 MB of the APK.
2. `assets/index.android.bundle` — Hermes bytecode, expect 3–7 MB.
3. `res/` — PNGs, drawables, locale strings.
4. `classes*.dex` — Java/Kotlin, typically 4–10 MB without R8.

**If `lib/` is >100 MB, that alone is your 81 MB regression** — Kveldsvakt likely pulled in `react-native-worklets` (dep of reanimated 4), `react-native-svg` (15.15 is installed), or rebuilt with an extra ABI. Fix: drop ABIs (quick win #2).

### Step 4: DEX method reference count (is R8 off?)

```
apkanalyzer dex references shiftpay-release.apk
apkanalyzer dex packages shiftpay-release.apk | sort -k3 -nr | head -30
```

If you see full package trees like `androidx.compose.*` (thousands of methods you don't use), R8 is off. The 65536 DEX method limit also breaks unobfuscated builds at scale — R8 inlines + removes references to stay under it.

### Step 5: Resource breakdown

```
apkanalyzer resources configs string shiftpay-release.apk
```

If you see 80+ locale configs (`ar`, `hi`, `zh-rCN`, …), Google Play Services and other androidx deps leaked their translations in. `resConfigs` fixes this (quick win #8).

### Step 6: JS bundle composition with Expo Atlas

From the shiftpay directory:

```
EXPO_ATLAS=true npx expo export --platform android
npx expo-atlas .expo/atlas.jsonl
```

Open http://localhost:3000. Look for:
- **phosphor-react-native**: if the treemap shows >1 MB, the barrel import is pulling the full icon set.
- **moti** + **react-native-reanimated**: acceptable range 800 KB–1.5 MB for JS portion.
- **@expo-google-fonts/***: these packages just re-export TTFs as assets; the asset pipeline is the cost, not JS.
- **i18n-js** + locale JSON: if all 4 locales are 50+ KB each in the treemap, consider lazy loading.

Commit `.expo/atlas.jsonl` to the repo under `research/baselines/` to get diffable size regression detection.

### Step 7: Compare against a pre-Kveldsvakt tag

```
git stash
git checkout <pre-kveldsvakt-sha>
npx expo prebuild --clean
./gradlew assembleRelease
# Run steps 2-6 above on the OLD APK, save reports side-by-side
git checkout master
git stash pop
```

Diff the `apkanalyzer files list` outputs. The deltas directly identify every new/grown file.

### Step 8: Verify `extractNativeLibs` in final manifest

```
apkanalyzer manifest print shiftpay-release.apk | grep extractNativeLibs
```

Since RN 0.73 this defaults to `false` (libs stored uncompressed). That *inflates local APK size* but *shrinks Play Store download size* — crucial context so you don't chase the wrong number. If you're judging size by the 127 MB local APK, you're measuring the wrong thing once you switch to AAB (see Quick Win #1).

## Detailed findings

### 1. Hermes — already enabled and correctly tuned (no gains here)

`hermesEnabled=true` in `gradle.properties` is set. Hermes compiles JS to a `.hbc` bytecode file — eliminates parse cost, reduces memory, and Hermes bytecode is typically 20–40% smaller than equivalent minified JS source when combined with the `-O` flag already applied by RN's Gradle plugin. The `hermesCommand` in `build.gradle` references `sdks/hermesc/%OS-BIN%/hermesc` from the react-native package — that's the correct SDK 54 / RN 0.81 setup.

Advanced: you could pass additional Hermes flags via `hermesFlags = ["-O", "-output-source-map", "-finline"]`, but `-O` is already aggressive. **No realistic MB gains from Hermes tuning.** Leave alone.

Static Hermes (Hermes V1, shipping gradually with RN 0.84+) promises ahead-of-time compilation and another 10–20% startup gain, but it is not in RN 0.81 — skip for this refactor.

### 2. R8 / ProGuard — the biggest underexploited lever

Expo keeps R8 off by default because (a) stripped stack traces confuse bug reports, (b) Reanimated + Turbomodules + SQLite need keep rules that change across versions, and (c) it doubles release build time. But for ShiftPay on RN 0.81 the payoff is clear: R8 typically shrinks the DEX portion 30–50%, and paired with `shrinkResources true` it also strips the resource IDs and drawables that only survived because Java classes referenced them.

**Config path — use `expo-build-properties` to survive `expo prebuild --clean`:**

`android/gradle.properties`:
```
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
```

Add to `app.json` plugins (survives prebuild):
```
["expo-build-properties", {
  "android": {
    "enableMinifyInReleaseBuilds": true,
    "enableShrinkResourcesInReleaseBuilds": true,
    "extraProguardRules": "..."
  }
}]
```

**Minimum keep rules for ShiftPay's stack** (based on installed deps):
```
# React Native + Hermes core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Reanimated 4 + Worklets
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class expo.core.** { *; }

# Keep crash reporting metadata
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Suppress known warnings
-dontwarn com.facebook.react.**
-dontwarn okhttp3.**
-dontwarn okio.**

# Strip debug logs from release
-assumenosideeffects class android.util.Log {
  public static int d(...);
  public static int v(...);
}
```

**Troubleshooting protocol**: If the release build fails or crashes, R8 generates `android/app/build/outputs/mapping/release/missing_rules.txt` — a file containing the exact keep rules R8 thinks you need. Paste them into `proguard-rules.pro` and rebuild.

### 3. ABI splits + AAB — the Play Store already does this, but only if you ship AAB

The current `android/gradle.properties` has `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64`. Your `preview` eas.json profile builds APK (all four ABIs stuffed into one file), and `npx expo run:android` builds the same universal artifact. That's where 80+ MB of the 127 MB lives.

**Two paths, not mutually exclusive:**

| Path | How | Applies to | Savings |
|------|-----|------------|---------|
| Drop ABIs entirely | Set `reactNativeArchitectures=arm64-v8a` in `gradle.properties` | Universal APK (local, sideload, internal testing) | 25–35 MB |
| Use App Bundle for Play | Your `production` profile already has `"buildType": "app-bundle"` — use it for Play Store releases via `eas build --local --platform android --profile production` | Play Store download | 40–70 MB vs universal APK |

Android 10 (API 29) made 64-bit mandatory for new apps on 64-bit devices, and the last 32-bit-only Android devices shipped around 2019. Your shift-worker audience in Scandinavia is overwhelmingly on post-2020 phones — dropping armeabi-v7a is safe. x86 / x86_64 are emulator-only except for a handful of Chromebooks and are not required by Play Store distribution.

**Verdict**: Keep the `reactNativeArchitectures` line but set to `arm64-v8a` for daily builds, and use AAB for Play Store. This gives a small universal APK for internal testing AND the smallest possible Play Store download.

### 4. Phosphor icons — almost certainly the JS bundle culprit

`phosphor-react-native` exports ~1,500 icons from a single `index.ts` barrel file. The library documentation says "Phosphor supports tree-shaking, so your bundle only includes code for the icons you use," but this is only true if the bundler supports it. **Metro's tree-shaking is experimental even in Expo SDK 54** and can be defeated by:

- Barrel file re-exports (`export * from "./icons"`)
- Babel plugins that convert ESM to CJS before Metro sees them
- Any side-effect in the package entry
- `package.json` without `"sideEffects": false`

Expo SDK 54 enables tree-shaking by default in production exports, and the docs claim "star exports will automatically be expanded and shaken based on usage." But there are known edge cases with react-native packages.

**Diagnosis**:
1. Run Expo Atlas (step 6 above) and look for phosphor in the treemap
2. If >1 MB, tree-shaking is broken for this package
3. Grep ShiftPay for actual icon usage: `grep -r "from 'phosphor-react-native'" app/ components/`
4. Count unique icons — almost certainly under 30

**Three fixes, in increasing rigor**:

| Fix | Effort | Savings | Risk |
|-----|--------|---------|------|
| Per-icon deep imports: `import StarIcon from 'phosphor-react-native/src/icons/Star'` | 1–2 h search-replace | 3–8 MB JS bundle | Low — path is stable; fails loudly if broken |
| Swap to `lucide-react-native` with per-icon imports (same deep-path pattern, smaller icon source size ~1 KB each) | 3 h | 5–10 MB | Low — icon visual styles differ |
| Custom SVG subset: export ~30 SVGs via Figma/Phosphor website, render with `react-native-svg` | 1 day | 8–12 MB | Medium — maintenance cost on icon additions |

`@expo/vector-icons` is a different model: it uses a font file with glyphs for icon rendering, meaning you pay fixed ~200 KB per icon set but the icons are text under the hood (fast, tintable, sharp at any scale). For a 30-icon app, deep-imported SVG libraries are smaller than the font-based approach. For 100+ icons, fonts win.

### 5. Font subsetting — Fraunces + Inter Tight + Inter + JetBrains Mono is a lot

Current `@expo-google-fonts/*` dependencies bundle all weights as separate TTF files. Worst case per font family:

- Fraunces variable: 400 KB (full axis) or ~200 KB per static weight × 9 weights = 1.8 MB
- Inter: similar ~1.8 MB across 9 weights
- Inter Tight: similar ~1.8 MB
- JetBrains Mono: 6 weights × 180 KB = 1.1 MB

**Total worst case: ~6.5 MB of fonts**, all bundled unconditionally as Android asset files.

**Subsetting with pyftsubset** (Python fonttools):

```
pyftsubset Inter-Regular.ttf \
  --unicodes="U+0020-007F,U+00A0-00FF,U+0100-017F,U+2010-2027" \
  --layout-features='kern,liga' \
  --output-file=Inter-Regular-subset.ttf
```

The unicode ranges cover Basic Latin + Latin-1 Supplement + Latin Extended-A (all Scandinavian diacritics including æ, ø, å, ä, ö, š) + general punctuation. Typical reduction: 60–70%.

**Variable font trade-off**: Fraunces variable ships the entire weight axis in one file (~400 KB). Static weights (400/500/700) total ~600 KB for three weights. If you use more than two weights per family, variable wins; for one or two weights, static wins.

**Async loading**: Fonts can be loaded post-render via `expo-font` with a splash fallback. Doesn't reduce APK size but reduces perceived startup. Not a priority for ShiftPay.

**Recommendation**: Audit which weights/styles are actually rendered. Drop packages for unused fonts. Subset the rest to Latin-Extended-A + punctuation. Realistic savings: 3–5 MB.

### 6. Native module audit — the `expo.autolinking.exclude` pattern is right

ShiftPay already uses a sensible pattern — `package.json` has:

```json
"expo": {
  "autolinking": {
    "exclude": ["expo-dev-client", "expo-dev-launcher", "expo-dev-menu", "expo-dev-menu-interface"]
  }
}
```

This prevents dev-client modules from being autolinked into release builds. Extend this pattern to any module you don't ship.

**Audit method**:

```
npx knip --dependencies --production
```

or

```
npx depcheck --skip-missing
```

Knip is more accurate in 2026 — it understands barrel files and dynamic imports. Depcheck is older but simpler.

**ShiftPay native module checklist** (current installed):
- `expo-camera` — ✅ OCR flow
- `expo-sqlite` — ✅ all persistence
- `expo-notifications` — ✅ shift confirm reminders
- `expo-file-system` — ✅ image resize pre-OCR
- `expo-haptics` — verify usage; native lib ~500 KB
- `expo-system-ui` — ✅ required for theme switch (per CLAUDE.md)
- `expo-crypto` — ✅ UUID gen
- `expo-image-picker` — ✅ OCR file picker
- `expo-linking` — not in package.json; check if pulled transitively
- `expo-localization` — ✅ locale detection
- `expo-status-bar` — ✅ standard
- `expo-splash-screen` — ✅ standard
- `expo-document-picker` — verify usage (CSV import path?); ~800 KB native
- `expo-sharing` — verify usage; ~300 KB native
- `expo-font` — ✅ loads Inter etc.
- `expo-constants` — ✅ standard

Per-module savings from removal: 500 KB – 2 MB. Modest but free.

### 7. Metro config — ShiftPay's is minimal, which is fine

Current `metro.config.js` only adds NativeWind. For SDK 54, tree-shaking and inline-requires are enabled by default in production exports. You can explicitly opt-in for extra safety:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = withNativeWind(config, { input: "./global.css" });
```

`inlineRequires` defers `require()` calls until first access — faster startup, smaller initial bundle parse. Works especially well with Hermes.

Don't add custom `minifierConfig`. Metro's default (`terser` in production) is well-tuned. Custom configs tend to break source maps.

### 8. Locale JSON — 4 files bundled is fine

ShiftPay bundles nb/en/sv/da locale JSON files through `i18n-js`. If each is <50 KB, keep bundled — lazy loading adds startup latency and blocks first paint for the wrong-locale case. The 4 locales total should be under 200 KB, which is irrelevant compared to the ABI or icon issues above.

### 9. Image assets — audit, but probably minor

`assets/icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png` are already crunched by AAPT2 (`crunchPngs true` is on). Check each asset is under 500 KB. If any is >1 MB, convert to WebP via:

```
cwebp -q 85 input.png -o output.webp
```

Enable WebP support (already done via `expo.webp.enabled=true` in `gradle.properties`). WebP is 25–35% smaller than PNG at the same quality. Vector icons as SVG via `react-native-svg` bypass this entirely.

### 10. CI/CD — GitHub Actions + local EAS build

Your workflow is `npx expo run:android` + manual APK sharing. For v2, move to GitHub Actions with `eas build --local`. Keystore handling:

**Store keystore as base64 in GitHub Secrets:**
```
openssl base64 -A < shiftpay-release.keystore > keystore-b64.txt
```

Paste contents into `SHIFTPAY_KEYSTORE_B64` secret. Add `SHIFTPAY_KEYSTORE_PASSWORD`, `SHIFTPAY_KEY_ALIAS`, `SHIFTPAY_KEY_PASSWORD` as secrets.

**Workflow step:**
```yaml
- name: Decode keystore
  run: echo "${{ secrets.SHIFTPAY_KEYSTORE_B64 }}" | base64 -d > $HOME/shiftpay-release.keystore
- name: Build AAB
  env:
    SHIFTPAY_KEYSTORE_PATH: ${{ env.HOME }}/shiftpay-release.keystore
    SHIFTPAY_KEYSTORE_PASSWORD: ${{ secrets.SHIFTPAY_KEYSTORE_PASSWORD }}
    SHIFTPAY_KEY_ALIAS: ${{ secrets.SHIFTPAY_KEY_ALIAS }}
    SHIFTPAY_KEY_PASSWORD: ${{ secrets.SHIFTPAY_KEY_PASSWORD }}
  run: cd shiftpay && npx expo prebuild --platform android && cd android && ./gradlew bundleRelease
```

Add a size-gate job that fails PR if AAB grows >10% vs main:
```yaml
- run: apkanalyzer apk file-size shiftpay/android/app/build/outputs/bundle/release/app-release.aab > size.txt
- uses: actions/upload-artifact@v4
  with: { name: size-report, path: size.txt }
```

For internal testing auto-promotion, use the existing `play-console` MCP from your memory (18 tools including `upload_bundle`, `set_rollout`) or the Google Play Developer API directly.

### 11. EAS Update / OTA — post-1.0 strategy

EAS Update is the "Expo way" to ship JS/asset changes without a Play Store submission. Your native binary includes the runtime that checks for updates on cold start; the next cold start applies. Setup:

```
npx expo install expo-updates
eas update:configure
```

Channels (staging/production) are orthogonal to Play Store tracks. You can ship to the internal track's binary via staging channel, test, then promote the same OTA to production channel — no new binary.

**Why not for ShiftPay MVP**: adds ~300 KB native lib + network request on every launch + another service to operate. Defer until you need iteration speed beyond monthly Play releases. OTA does not reduce APK size.

### 12. 16 KB page-size alignment — mandatory for Play Store late 2025+

Android 15 devices use 16 KB memory pages for better performance. RN 0.77+ supports this; you're on RN 0.81 so Core is fine. Verify with:

```
apkanalyzer manifest print shiftpay-release.apk | grep pageAlignment
```

If any `.so` isn't 16 KB aligned, Play Console flags the AAB during review. Fix path: upgrade to NDK 27+ (Expo SDK 54 uses this by default) and ensure `useLegacyPackaging=false` (already set in your `gradle.properties`). You're likely fine here, but verify.

### 13. Target SDK — Google Play requires API 35 (Android 15) for new apps in 2026

New apps and updates must target API 35+ as of August 2025 for new submissions, with existing apps needing API 34+ to stay discoverable. Expo SDK 54 targets API 35 by default. Verify with:

```
grep targetSdkVersion android/build.gradle
```

Should be 35 or higher. No size impact, but a release-blocker if wrong.

## Tradeoffs tables

### AAB vs APK

| | Universal APK | Per-ABI APK | AAB (Play Store) |
|---|---|---|---|
| Size on disk | 127 MB (today) | 30–45 MB per ABI | 25–35 MB upload |
| Play Store download | N/A (can't upload APK to Play since 2021) | N/A | 10–15 MB (device-optimized split) |
| Local install / internal test | Works | Works | Requires bundletool + device-spec |
| Sideload via APK | Works everywhere | Only matching ABI | Requires conversion |
| Play Console upload | Rejected | Rejected | ✅ Required |
| Verdict | Dev only | Internal testing via GitHub release | **Play Store submission** |

### Icon strategy tradeoffs

| Approach | JS bundle | Per-icon cost | Maintenance | Recommendation |
|---|---|---|---|---|
| Phosphor barrel import | 8–15 MB | 0 (pre-paid) | Free | ❌ Current state, broken |
| Phosphor per-icon deep imports | 50 KB × N | ~50 KB | Manual path | ✅ Minimum fix |
| Lucide per-icon imports | 20 KB × N | ~20 KB | Manual path | ✅ Better, if visual style OK |
| `@expo/vector-icons` font | 200 KB fixed | ~0 | Standard | Only if >100 icons |
| Custom SVG subset | 2 KB × N | ~2 KB | Designer in loop | Best for finalized icon set |

### R8 modes

| Mode | DEX saved | Obfuscation | Debuggability | Risk |
|---|---|---|---|---|
| Off (today) | 0% | None | Easy | None, but biggest APK |
| `minifyEnabled=true` only | 30–40% | Mild | OK with mapping.txt | Medium — keep rules needed |
| `minifyEnabled=true` + `shrinkResources=true` | 40–50% total | Mild | OK | Medium — test resource refs |
| Full obfuscation (`-repackageclasses`) | 45–55% | Aggressive | Hard without mapping | High — rare crashes in reflection-heavy libs |

## Gotchas & considerations

- **Local APK != Play Store download size**. Since RN 0.73 set `extractNativeLibs=false`, local universal APKs look huge (60+ MB) but Play Store delivers compressed per-ABI splits (10–15 MB). Benchmark against Google Play Console's download size dashboard, not `apkanalyzer apk file-size`.
- **`expo prebuild --clean` wipes `android/`**. Any manual edit to `build.gradle` or `proguard-rules.pro` must be moved to `expo-build-properties` in `app.json` to survive regeneration. Your project's `android/` is gitignored per CLAUDE.md — this is correct, but means every config change must go through `expo-build-properties`.
- **R8 + reanimated 4 + worklets**: Reanimated 4 moved worklets to `react-native-worklets` package. Keep rules for both are needed. Missing a rule manifests as crash on first animated component mount, not at build time.
- **16 KB page alignment** is a hard Play Store gate, not a size optimization. Verify it works, then forget.
- **New architecture is enabled** (`newArchEnabled=true`). Reanimated 4 requires it. Bundle size is actually slightly *larger* on new arch than old, but you can't opt out without losing Reanimated 4. Accept the cost.
- **Size regressions are sticky**. Once an ABI or native lib is in your APK baseline, users' Play Store updates are full-size deltas. Ship the fix, then monitor delta size in Play Console.
- **Don't enable OTA before measuring**. Adding `expo-updates` adds ~300 KB native lib. Make sure the binary being shipped is the optimized one first.
- **Source maps in production**: upload source maps to Sentry / Bugsnag / EAS Insights as build artifacts, don't bundle them. They balloon the APK by 10+ MB for zero user benefit.
- **`useLegacyPackaging=true`** would re-compress native libs inside the APK, cutting local APK size ~20% but increasing install time and memory pressure. Not recommended — the `false` default is correct for Play Store delivery.

## Recommended execution order

1. **Quick win #5** (`enableBundleCompression=true`) — 1 min, free 2–4 MB
2. **Quick win #2** (drop non-arm64 ABIs) — 5 min, free 25–35 MB
3. **Step 3–5 diagnosis** (apkanalyzer + Expo Atlas) — 1 h, identifies remaining culprits
4. **Quick win #8** (resConfigs) — 5 min, free 2–5 MB
5. **Quick win #1** (switch Play Store releases to AAB via existing `production` profile) — 1 h, free 40–70 MB Play Store download
6. **Quick win #4** (Phosphor per-icon imports) — 2–4 h, free 5–12 MB
7. **Quick win #3** (R8 + shrinkResources with keep rules) — 2 h + crash testing cycle, free 15–25 MB
8. **Quick wins #6+#7** (font audit + subsetting) — 5 h, free 6–13 MB
9. **Quick win #9** (module audit with knip) — 1 h, free 1–4 MB
10. **Quick win #10** (commit Atlas baseline to research/baselines/) — 30 min, prevents future bloat

Post-optimization target: 12–18 MB Play Store download, 40–55 MB universal APK for internal testing, 6–10 MB JS bundle.

## Sources

1. [Understanding app size — Expo Docs](https://docs.expo.dev/distribution/app-size/) — Play Store vs local APK distinction, RN 0.73 `extractNativeLibs` change, recommended tools.
2. [android-app-size.md — expo/fyi](https://github.com/expo/fyi/blob/main/android-app-size.md) — concrete SDK 49 vs SDK 50 size table (27.6→62.1 MB APK, 11.7 MB Play stable).
3. [Analyzing JavaScript bundles — Expo Docs](https://docs.expo.dev/guides/analyzing-bundles/) — `EXPO_ATLAS=true npx expo export` + `npx expo-atlas .expo/atlas.jsonl`; source-map-explorer fallback.
4. [Tree shaking and code removal — Expo Docs](https://docs.expo.dev/guides/tree-shaking/) — SDK 54 default on; star-export expansion; `sideEffects` flag; `__DEV__` removal.
5. [BuildProperties — Expo Docs](https://docs.expo.dev/versions/latest/sdk/build-properties/) — `enableMinifyInReleaseBuilds`, `enableShrinkResourcesInReleaseBuilds`, `extraProguardRules`, `buildArchs`, `useLegacyPackaging`, `enableBundleCompression`, `packagingOptions`.
6. [apkanalyzer — Android Developers](https://developer.android.com/tools/apkanalyzer) — CLI at `android_sdk/cmdline-tools/latest/bin/apkanalyzer`; `apk summary`, `file-size`, `download-size`, `files list`, `dex references`, `dex packages`, `resources configs`, `manifest print`.
7. [bundletool — Android Developers](https://developer.android.com/tools/bundletool) — `get-size total` for device-specific install size; `--device-spec` for per-device estimates.
8. [R8/ProGuard in Expo — codsod on Medium](https://codsod.medium.com/r8-proguard-in-expo-the-complete-guide-to-code-minification-45d5aa2a23c5) — 30–50% APK reduction, `missing_rules.txt` workflow, expo-build-properties `extraProguardRules` pattern.
9. [How I Reduced My RN 0.81 APK Size by 50% — DEV](https://dev.to/ajmal_hasan/how-i-reduced-my-react-native-081-apk-size-by-50-without-breaking-anything-e2a) — 85 MB → 42 MB case study; single-ABI arm64, resConfigs, shrinkResources, proguard passes.
10. [phosphor-react-native README](https://github.com/duongdev/phosphor-react-native/blob/main/README.md) — per-icon import paths; tree-shaking caveat for Metro.
11. [Lucide React Native guide](https://lucide.dev/guide/react-native) — ESM tree-shaking; Metro limitation note ("React Native (metro) does not support tree shaking").
12. [React Native Reanimated migration 3.x → 4.x](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/) — `react-native-worklets` separation; babel plugin path change.
13. [Android 15 16KB Page Size Guide — Expo FYI](https://github.com/expo/fyi/blob/main/android-16kb-page-sizes.md) — NDK 27 + `useLegacyPackaging=false` requirements; RN 0.77+ support.
14. [Target API level requirements — Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) — API 35 required for new apps in 2026.
15. [Sign Android release — GitHub Marketplace](https://github.com/marketplace/actions/sign-android-release) — base64-in-secret workflow for keystore in CI.
16. [Reduce RN APK by 70-80% — Codersera](https://codersera.com/blog/reduce-react-native-apk-size-by-70-80-complete-optimization-guide) — cumulative savings table for Hermes + R8 + AAB + ABI + resConfigs + WebP + deps.
17. [EAS Update introduction — Expo Docs](https://docs.expo.dev/eas-update/introduction/) — OTA channels, fingerprint check, staging→production promotion.
18. [Create a release build locally — Expo Docs](https://docs.expo.dev/guides/local-app-production/) — `eas build --local` vs `gradlew bundleRelease` for AAB.
19. [Font subsetting with pyftsubset — Markos Konstantopoulos](https://markoskon.com/creating-font-subsets/) — unicode range syntax, 60–70% typical reduction.
20. [Knip vs depcheck 2026 — PkgPulse](https://www.pkgpulse.com/blog/knip-vs-depcheck-2026) — unused dependency audit; knip recommended over depcheck in 2026.
