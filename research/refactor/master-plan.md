# ShiftPay Refactor — Master Plan

> Synthesized from 8 research reports (pass-0 through pass-7) | 2026-04-16 | Confidence: High

## Purpose

Single source of truth for the 8-pass refactor. Integrates cross-cutting decisions, sequences the passes, flags quick wins, and lists explicit non-goals. Each pass links to its research report for depth.

---

## 1. Executive summary

The 8 research reports converge on a clear picture: **ShiftPay is in better shape than feared, but has three concrete correctness/operational liabilities and one brutal bundle-size regression.**

### The four things that actually matter

1. **APK is 127 MB** because Phosphor barrel imports + all 4 ABIs + R8 off + bundle compression off + fonts unsubsetted. **70-85 MB is recoverable in ~5 hours.**
2. **`holiday_supplement` is dead code** — the field is declared in the DB and settings UI, but never consumed in `calculateExpectedPay`. Norwegian helligdager (a core use case) are silently unpaid. **This is the single largest user-visible correctness bug.**
3. **`parseDateSafe` accepts invalid dates** like `31.02.2026` (silently rolls over to `03.03.2026`). Round-trip check fixes it in 5 lines.
4. **`withDb()` retry-shim and `ThemeProvider` hydration dance** are both symptoms of weak infrastructure. Fixing at the root (AppState-aware connection + MMKV sync reads) eliminates whole bug classes, not just current bugs.

### What the reports agreed on (skip list)

- **No Zustand/Jotai/Redux/TanStack Query** — no global or server state to manage.
- **No Drizzle ORM** — 3 tables don't justify the Metro/Babel plugin surgery.
- **No Temporal migration** — Stage 4 but polyfill too heavy for RN today.
- **No XState** — one complex flow (import) doesn't earn 16 KB.
- **No HMAC request signing** — Play Integrity does the same thing with less code.
- **No certificate pinning, no custom root detection** — brittle, wrong threat model.
- **No auto-merge on Renovate/Dependabot** — #1 supply-chain vector 2024-2026.
- **No Style Dictionary, no monorepo, no SQLCipher** — premature for this app size.
- **No Feature-Sliced Design full layering** — feature folders are enough at 40 files.

---

## 2. Cross-cutting decisions needing user approval

These affect multiple passes and must be locked in before Pass 2 starts.

| # | Decision | Options | Recommendation | Reasoning |
|---|---|---|---|---|
| **A** | DD.MM.YYYY → ISO (YYYY-MM-DD) in DB | Keep DD.MM.YYYY / Migrate to ISO | **Migrate to ISO** | Makes SQL `WHERE date >= ?` work, kills 5 `SELECT *` + filter-in-JS anti-patterns. Display stays DD.MM.YYYY. One-way migration. |
| **B** | Phosphor icons | (a) Path imports + keep Phosphor / (b) Migrate to Lucide / (c) Hybrid | **(a) Path imports first** | 15 min of work recovers 40-60 MB. Kveldsvakt visual identity preserved. Migrate to Lucide post-competition if needed. |
| **C** | Validation lib | Zod v3 / Zod v4 / Valibot / hand-rolled | **Valibot** | Adopted once in Pass 1, used in Pass 2 (DB boundary), Pass 3 (OCR schema shared client+server), Pass 5 (storage). 90% smaller than Zod v4, 2x faster. |
| **D** | Supplement stacking policy | Fixed additive / Settings toggle (replace/additive/max) | **Settings toggle, default additive** | NSF/KS tariffs are ambiguous; wife-validate one config against payslip, expose toggle for other users. |
| **E** | Storage layer | AsyncStorage / MMKV | **MMKV** | Synchronous reads kill the theme-flash bug class at root cause. Already on dev client / prebuild. |
| **F** | Form library | Controlled (current) / react-hook-form + Valibot | **RHF + Valibot** | Settings form has 8 fields growing; RHF is mature, Valibot shared with server. |
| **G** | Security minimum | API key only / + rate limit / + Play Integrity | **+ rate limit now, Play Integrity v2** | Rate limiting is cheap (Upstash free tier); Play Integrity is post-competition since it breaks internal testing/sideload. |
| **H** | APK size target | <30 MB / <50 MB / <80 MB Play Store | **<30 MB Play Store, <55 MB universal APK** | Achievable via quick wins alone; sets the regression gate. |
| **I** | Folder structure | Keep flat / `src/features/` + `core/` + `ui/` | **src/features/ layout** | Already 3 implicit domains (shifts/import/tariff). Feature folders now prevent drift later. |
| **J** | Branch strategy | One big branch / branch-per-pass | **Branch-per-pass** (user already chose) | `refactor/pass-N-<topic>`. Each merges to master when green. |

**Ask user for approval on A-J before Pass 2.** A, B, C, D, E, F are the most impactful — they ripple across multiple passes.

---

## 3. Revised sequence — dependency graph

Original plan had linear 0→7. Research shows some can parallelize, and Phosphor is so high-impact it can front-load as a "Pass 0 quick win".

```
┌─────────────────────────────────────────────────────────┐
│ Pre-Pass-0: Phosphor path imports + bundle compression  │
│   (40-60 MB APK save, ~30 min, no refactor risk)        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Pass 0: Test infrastructure                             │
│   Jest + RTL + Maestro + CI + baseline tests            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Pass 1: Foundation                                      │
│   Path aliases @/*, strict-plus TS, ESLint flat,        │
│   feature folders src/features/+core/+ui/,              │
│   typed routes, Valibot install, branded types scaffold │
└─────────────────────────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
┌────────────────────┐  ┌────────────────────┐
│ Pass 2: Data       │  │ Pass 3: Security   │
│ user_version mig.  │  │ Upstash rate limit │
│ AppState conn.     │  │ EXIF stripping     │
│ WAL + FK pragmas   │  │ Magic number check │
│ DD.MM→ISO migrate  │  │ Valibot shared     │
│ Kysely queries     │  │ schema             │
│ Tombstones columns │  │                    │
│ JSON export        │  │                    │
└────────────────────┘  └────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Pass 4: Business logic                                  │
│   Fix holiday_supplement dead code (BLOCKER)            │
│   DST-safe overnight math                               │
│   Round-trip parseDateSafe                              │
│   Integer øre + hand-rolled money math                  │
│   Stacking policy (settings toggle)                     │
│   fast-check property suite (10 properties)             │
│   Clock type for deterministic tests                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Pass 5: State                                           │
│   AsyncStorage → MMKV (sync reads, kills theme flash)   │
│   Typed storage wrapper with versioning                 │
│   useDbQuery / useDbMutation (~130 LOC)                 │
│   Import flow → useReducer + discriminated union        │
│   Settings form → react-hook-form + Valibot             │
│   AbortController on OCR                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Pass 6: UI                                              │
│   Fix accent text contrast on dark (WCAG AA fix)        │
│   Imperative a11y announce (Fabric fix)                 │
│   cn() + cva() for component families                   │
│   Drop moti (replace AnimatedCard with reanimated)      │
│   Font weight audit + subsetting                        │
│   Safe-area insets on FAB + ScrollView bottom           │
│   Narrow haptic contract                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Pass 7: Build & infra                                   │
│   ABI split (arm64-v8a only for local builds)           │
│   R8 minify + shrinkResources + keep rules              │
│   AAB via EAS for Play Store                            │
│   resConfigs filter to nb/en/sv/da                      │
│   apkanalyzer + Expo Atlas baseline in CI               │
│   GitHub Actions CI: lint + tsc + jest + maestro + size │
│   knip dependency audit                                 │
└─────────────────────────────────────────────────────────┘
```

**Parallelization note:** Pass 2 and Pass 3 can run on separate branches simultaneously — different files, no overlap. The rest should run sequentially because each builds on the previous.

---

## 4. Pre-Pass-0 quick wins (optional front-load)

Research suggests pulling these out as a fast hotfix so the APK is shippable *during* the refactor:

| Action | Save | Time | File |
|---|---|---|---|
| Phosphor path imports | 40-60 MB | 15 min | `components/Icon.tsx` |
| `android.enableBundleCompression=true` | 2-4 MB | 1 min | `gradle.properties` |
| `reactNativeArchitectures=arm64-v8a` | 25-35 MB | 5 min | `gradle.properties` |
| `resConfigs "en","nb","sv","da"` | 2-5 MB | 5 min | `app/build.gradle` via `expo-build-properties` |

**Total: ~70-85 MB recovered, ~30 min total, zero refactor risk.** Ship as `fix(android): reduce APK size`.

**Recommendation: do this now.** APK goes from 127 MB back to ~50-60 MB universal. Play Store AAB (via `production` profile that already exists in `eas.json`) will deliver ~12-20 MB. User can test on phone at any time during the refactor.

---

## 5. Per-pass distilled plan

### Pass 0 — Test infrastructure
**Branch:** `refactor/pass-0-test-infra`  
**Stop-criterion:** Green CI on master. Coverage baseline 80% lines / 70% branches on `lib/`. Smoke Maestro flow passes on emulator.  
**Install:** `jest-expo` (jest 29.x pinned), `@testing-library/react-native` v13+, `expo-sqlite-mock` v3+, `fast-check`, `@types/jest`, Maestro CLI.  
**Config:** `jest.config.js`, `jest-setup.ts` (reanimated mock, worklets mock, TZ=Europe/Oslo, expo-crypto patch), `__mocks__/` (expo-camera, expo-file-system, expo-notifications, expo-image-picker, expo-document-picker).  
**CI:** `.github/workflows/ci.yml` — lint + tsc + jest on Linux, Maestro on macOS (weekly full-suite, PR-time smoke only).  
**Baseline tests (freeze current behavior):** `lib/calculations.test.ts`, `lib/dates.test.ts`, `lib/db.test.ts`, `lib/csv.test.ts`, component smoke-tests for `ShiftTable`+`PaySummary`.  
**Watch out:** `jest-expo` file-system mock is broken on SDK 54 (hand-roll); reanimated 4 needs BOTH reanimated + worklets mocks; expo-crypto `getRandomValues` returns zeros (patch).  
**Estimate:** 6-10 hours.  
**Research:** [pass-0-test-infra.md](./pass-0-test-infra.md)

### Pass 1 — Foundation
**Branch:** `refactor/pass-1-foundation`  
**Stop-criterion:** Zero TS errors with strict-plus flags. ESLint green. All imports use `@/*`. Folder structure moved to `src/features/+core/+ui/`.  
**Commits (6 separate, all reviewable):**
1. Path alias `@/*` — tsconfig only, mechanical rewrite of 59 imports.
2. Strict-plus TS flags (`noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `allowUnreachableCode: false`). Skip `exactOptionalPropertyTypes`.
3. ESLint flat config + `eslint-config-expo/flat` + `prettier-plugin-tailwindcss` + import-x + unused-imports.
4. Typed routes (`experiments.typedRoutes: true`), removes `router.push(... as any)`.
5. Camera ref type shim via module augmentation in `src/types/`, removes last `as any`.
6. Folder restructure: `src/features/{shifts,import,tariff}`, `src/core/{db,i18n,theme,...}`, `src/ui/`. Move `app/` to `src/app/`, update path alias to `@/*: ["./src/*"]`.  

**Also in Pass 1:** Install Valibot (used in Pass 2/3/5). Create `src/types/brands.ts` with `ShiftDate`, `ShiftTime`, `Minutes`, `OreAmount` branded types + constructors. Husky + lint-staged + commitlint.  
**Estimate:** 8-12 hours.  
**Research:** [pass-1-foundation.md](./pass-1-foundation.md)

### Pass 2 — Data layer
**Branch:** `refactor/pass-2-data`  
**Stop-criterion:** `db.ts` split into domain repos. Single migration runner. All queries use `withExclusiveTransactionAsync`. ISO dates in DB. In-memory tests pass.  
**Changes:**
1. Split `db.ts` → `src/core/db/{connection,migrations,tariff-repo,schedule-repo,shift-repo,export,index}.ts`. Keep flat function API.
2. `user_version`-based migration runner in `migrations.ts`. Collapse existing `migrateXxx` functions into ordered list.
3. Replace `withDb()` with AppState-aware `getConnection()` — probe on foreground, invalidate on error.
4. `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON` on every open.
5. `withTransactionAsync` → `withExclusiveTransactionAsync` everywhere.
6. **DD.MM.YYYY → ISO migration** (one-way, per user approval on decision A). Display stays DD.MM.YYYY via format helpers.
7. Add `updated_at` + `deleted_at` columns to shifts/schedules/monthly_pay. Tombstone instead of hard-delete.
8. Kysely + schema types for new/refactored queries.
9. JSON export + import with Valibot validation.
10. Fix latent bug: `migrateAddPayType` 2× ALTER outside transaction.  

**Estimate:** 16-20 hours (biggest pass).  
**Research:** [pass-2-data.md](./pass-2-data.md)

### Pass 3 — Security
**Branch:** `refactor/pass-3-security`  
**Stop-criterion:** Rate limiting active. EXIF stripped client-side. Server uses Valibot. Magic-number check rejects spoofed MIME.  
**Changes:**
1. Re-enable client-side image resize in `lib/api.ts` (EXIF stripped as side effect).
2. Upstash Redis rate limiting in edge function (per-IP 30/hr, global 500/hr).
3. Magic-number check server-side (first 8 bytes: `FF D8 FF` or `89 50 4E 47 0D 0A 1A 0A`).
4. Valibot-based shared schema in `src/core/api/ocr-schema.ts` — import from both client (`lib/api.ts`) and server (`supabase/functions/ocr/index.ts` via Deno import).
5. Add `KILL_SWITCH` Supabase secret check — instant stop if viral.
6. Set Supabase project spending cap + Anthropic budget alert.
7. Data Safety form audit (photos processed ephemerally, no location, no storage).
8. Network security config — disable cleartext.
9. Renovate config with `minimumReleaseAge: 7 days`, NO auto-merge.

**Defer:** Play Integrity (post-competition, breaks internal testing); HMAC signing (overkill); cert pinning.  
**Estimate:** 8-10 hours.  
**Research:** [pass-3-security.md](./pass-3-security.md)

### Pass 4 — Business logic
**Branch:** `refactor/pass-4-business-logic`  
**Stop-criterion:** All 10 fast-check properties green. Holiday calculation working. DST handled. Round-trip date validation. Integer øre end-to-end.  
**Changes:**
1. **Fix holiday_supplement dead code** — highest-user-visible bug. Hand-rolled `src/core/holidays.ts` with Gauss Easter + fixed list, 2020-2035 table-tested.
2. Integer-øre rewrite of `calculateExpectedPay`. Single rounding at output. Half-up rounding mode (documented).
3. Fix `parseDateSafe` with round-trip validation (rejects `31.02.2026`).
4. DST adjustment helper: `dstAdjustmentMinutes(date, start, end)` with Europe/Oslo table.
5. Settings: Stacking policy toggle (replace / additive / max), default additive.
6. Apply branded types from Pass 1 (`ShiftDate`, `ShiftTime`, `Minutes`, `OreAmount`).
7. `Clock` type (`type Clock = () => Date`) injected into `notifications.ts` + dashboard countdown.
8. fast-check property suite (`src/features/shifts/calculations.property.test.ts`): non-negativity, permutation invariance, additivity, scaling, rate monotonicity, overnight bounds, weekend day-only + TZ-invariant, rounding stability, date-parse idempotence, holiday-triumphs-weekend.
9. Document known limitations in `docs/known-limitations.md` (half-day eves, non-Norway holidays).

**Estimate:** 12-16 hours.  
**Research:** [pass-4-business-logic.md](./pass-4-business-logic.md)

### Pass 5 — State
**Branch:** `refactor/pass-5-state`  
**Stop-criterion:** Zero AsyncStorage. No `loaded` flag in providers. Import flow in one reducer. Settings form in RHF.  
**Changes:**
1. Install `react-native-mmkv` + `react-native-nitro-modules` via `npx expo install` + prebuild.
2. `src/core/storage.ts` — typed `getJSON<T>(key, schema)` / `setJSON(key, value)` using Valibot, versioned key `shiftpay_prefs_v1`.
3. One-shot AsyncStorage → MMKV migration in `initDb`. Remove `@react-native-async-storage/async-storage` dep.
4. Rewrite `ThemeProvider` + `LocaleProvider` with sync reads at module scope. Drop `loaded` flag, drop `null` return.
5. `src/core/hooks/useDbQuery.ts` (~80 LOC): keyed cache, invalidate, `useFocusEffect` integration, `{ data, status, error, refetch }`.
6. `src/core/hooks/useDbMutation.ts` (~50 LOC): onMutate/onError/onSuccess/invalidate for optimistic confirm-shift.
7. Import flow → `useReducer` with discriminated-union state (`idle | loading | review | saving | saved | error`).
8. Settings form → `react-hook-form` + `@hookform/resolvers/valibot` + shared schema.
9. `AbortController` on OCR in `lib/api.ts`, abort on unmount.
10. Dashboard data loads → `useDbQuery` per source. Delete big `load()` function.

**Estimate:** 12-16 hours.  
**Research:** [pass-5-state.md](./pass-5-state.md)

### Pass 6 — UI
**Branch:** `refactor/pass-6-ui`  
**Stop-criterion:** WCAG AA verified via CI script. No moti dep. All TextInputs themed. cva in use for 3+ component families.  
**Changes:**
1. **Text contrast fix**: `text-accent-dark dark:text-accent` → `text-accent-dark dark:text-accent-soft` on small-text (ShiftCard overtime label and similar).
2. Replace `accessibilityLiveRegion` with imperative `AccessibilityInfo.announceForAccessibility(message)` (Fabric fix).
3. `src/ui/cn.ts` helper (clsx) + `src/ui/Button.tsx`, `Badge.tsx`, `Card.tsx` using cva with ShiftPay tokens.
4. Replace `AnimatedCard` (moti) with `Animated.View entering={FadeInDown.delay(...)}`. Remove moti dep.
5. Font audit: drop unused Fraunces/JetBrainsMono weights. Subset Inter/Inter Tight to Latin Extended-A + punctuation via `pyftsubset`. Move to `expo-font` config plugin (embedded, not runtime-loaded).
6. FAB and ScrollView bottom padding += `insets.bottom` (edge-to-edge on Samsung/Pixel).
7. `cursorColor` + `selectionColor` on all TextInputs.
8. Narrow haptic contract: `selectionAsync` for toggles, `notificationAsync(Success)` for saves, no default haptic on buttons.
9. `hitSlop={12}` on small icon buttons (WCAG 2.5.8 AAA).
10. `scripts/verify-contrast.ts` in CI — fail build if tokens drift below WCAG AA.

**Estimate:** 10-14 hours.  
**Research:** [pass-6-ui.md](./pass-6-ui.md)

### Pass 7 — Build & infra
**Branch:** `refactor/pass-7-build`  
**Stop-criterion:** AAB <30 MB Play Store download. Universal APK <55 MB. CI has size-regression gate. apkanalyzer baseline committed.  
**Changes:**
1. `expo-build-properties` in `app.json`: `enableMinifyInReleaseBuilds: true`, `enableShrinkResourcesInReleaseBuilds: true`, `extraProguardRules` with keep rules for RN/Hermes/reanimated/worklets/expo.
2. `android.enableR8.fullMode=true` in `gradle.properties` (via `expo-build-properties`).
3. Verify `reactNativeArchitectures=arm64-v8a` (if not already from pre-Pass-0).
4. `resConfigs "en","nb","sv","da"` via `expo-build-properties`.
5. EAS production AAB build + internal testing promote via `play-console` MCP.
6. GitHub Actions: keystore as base64 secret, build AAB, run apkanalyzer, upload size report, fail PR if >10% growth.
7. Expo Atlas baseline committed to `research/baselines/atlas-YYYY-MM-DD.jsonl`.
8. `knip` dependency audit — remove unused deps.
9. Verify 16 KB page alignment (API 15 Play Store requirement).
10. Verify `targetSdkVersion >= 35` (2026 Play Store gate).

**Estimate:** 8-12 hours.  
**Research:** [pass-7-build.md](./pass-7-build.md)

---

## 6. Total effort estimate

| Phase | Hours (low) | Hours (high) |
|---|---|---|
| Pre-Pass-0 quick wins | 0.5 | 1 |
| Pass 0 (tests) | 6 | 10 |
| Pass 1 (foundation) | 8 | 12 |
| Pass 2 (data) | 16 | 20 |
| Pass 3 (security) | 8 | 10 |
| Pass 4 (business logic) | 12 | 16 |
| Pass 5 (state) | 12 | 16 |
| Pass 6 (UI) | 10 | 14 |
| Pass 7 (build) | 8 | 12 |
| Contingency | 8 | 15 |
| **TOTAL** | **88.5** | **126** |

**Realistic wall-clock:** 2-3 full-time weeks. User said "du er kjapp, gå dypt" — this is the depth.

---

## 7. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DD.MM.YYYY → ISO migration breaks existing users' data | Medium | High | Idempotent migration, tested against copy of production data, `updated_at` backup column, restore-from-backup hidden setting |
| R8 keep rules miss a reflection-heavy lib, crash on first animated mount | Medium | Medium | Test release build on device for every ShiftPay flow before merging Pass 7 |
| Phosphor path imports miss some icon, build fails | Low | Low | Grep-test after rewrite; visual diff in dev |
| MMKV prebuild conflict with release signingConfig (android/ regen) | Low | Medium | Move release signingConfig to `expo-build-properties` in Pass 1 |
| fast-check property discovers a long-standing calc bug | High | High | **Feature, not bug.** Fix as found. |
| Supplement stacking policy changes wife's expected pay | Low | High | Validate against actual payslip from helligdag-nightshift before merge |
| Valibot schema drift between Deno edge function and RN client | Medium | Medium | Single `.ts` file imported by both; monorepo-lite pattern |
| Maestro macOS runner cost explodes | Low | Low | PR-time: smoke flow on Linux; nightly: full suite on macOS |
| Play Store rejects due to Data Safety mismatch | Low | High | Pass 3 audits form against actual behavior before any new submission |
| Refactor fatigue, user wants to ship before finishing | Medium | Medium | Pre-Pass-0 wins + Pass 0 tests = shippable state early. Rest is iterative. |

---

## 8. Non-negotiables (from user rules)

- **Always production-ready.** Each pass merges to master in shippable state.
- **Plan first, implementation second.** This document is the plan. Any deviation must pause for user approval.
- **Decisions BEFORE change.** Decisions A-J above must be locked in before Pass 2.
- **Minimal edits.** No gratuitous renames, no "while I'm here" cleanup outside the pass scope.
- **No destructive actions without explicit approval.** `git push --force`, branch deletion, DB drops, config rewrites of live infra.
- **All user data stays local.** Pass 2 adds sync hooks (updated_at, deleted_at) but NO sync engine. v2 territory.

---

## 9. Kick-off checklist (before Pass 0)

- [ ] User approves decisions A-J in §2
- [ ] Commit kveldsvakt hook fix to `kveldsvakt` branch
- [ ] Merge `kveldsvakt` → `master` (user confirmed APK works)
- [ ] Execute pre-Pass-0 quick wins (Phosphor + bundle compression + ABI + resConfigs)
- [ ] Build + ship verification APK to phone
- [ ] Create branch `refactor/pass-0-test-infra` from clean master
- [ ] Pass 0 begins

---

## 10. References

- [Pass 0: Test infrastructure](./pass-0-test-infra.md)
- [Pass 1: Foundation](./pass-1-foundation.md)
- [Pass 2: Data layer](./pass-2-data.md)
- [Pass 3: Security](./pass-3-security.md)
- [Pass 4: Business logic](./pass-4-business-logic.md)
- [Pass 5: State](./pass-5-state.md)
- [Pass 6: UI](./pass-6-ui.md)
- [Pass 7: Build](./pass-7-build.md)
