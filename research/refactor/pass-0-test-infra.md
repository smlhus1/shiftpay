# Research: Pass 0 — Test Infrastructure for ShiftPay (Expo SDK 54 / RN 0.81)

> Researched: 2026-04-16 | Sources: 20+ | Confidence: High
> Target project: `C:\Projects\Personlig\vibe_games\shiftpay`
> Stack verified from `package.json`: Expo ~54.0.33, React Native 0.81.5, React 19.1.0, reanimated ^4.2.2, nativewind ^4.2.1, expo-sqlite ^16.0.10, expo-router ^6.0.23, TypeScript ~5.9.2.

## TL;DR

Stand up a three-layer test stack:

1. **Unit / logic** — Jest with the `jest-expo` preset (iOS+Android+web multi-project) for `lib/calculations.ts`, `lib/dates.ts`, `lib/csv.ts` and `lib/db.ts`. Pure TS modules run in node; the db layer uses `expo-sqlite-mock` (>=v3, which supports expo-sqlite >=53) to get an in-memory SQLite backed by better-sqlite3-compatible semantics.
2. **Component / integration** — `@testing-library/react-native` v13+ with `expo-router/testing-library` (`renderRouter`) for screen-level tests. Mock Reanimated via `react-native-reanimated/mock` + `react-native-worklets/src/mock`.
3. **End-to-end** — Maestro (YAML flows) run on Android emulator, macOS runner in CI. Not macos-latest only for Apple Silicon reasons — see the emulator section below.

Realistic coverage target for this codebase: **80% lines / 75% branches on `lib/`**, 0% threshold on `app/` screens (aim for behavioural tests, not coverage-chasing). Add property tests with `fast-check` specifically for `calculateExpectedPay` and `shiftDurationHours` — they have exactly the "obvious invariants across a wide input space" shape that property-based testing catches regressions on.

The single biggest Expo SDK 54 pitfall: **`jest-expo`'s bundled mock still maps to the legacy file-system API**. When you test code that touches `expo-file-system` (CSV import/export in ShiftPay does), you must either pin imports to `expo-file-system/legacy` or hand-roll a mock. This is tracked as issue #39922 on expo/expo and has not been fixed as of SDK 54.33.

---

## 1. Jest + `jest-expo` preset for Expo SDK 54

### Install (authoritative, from Expo docs)

```bash
npx expo install jest-expo jest @types/jest --dev
npx expo install @testing-library/react-native --dev
```

Never install `jest` directly with npm — Expo pins a compatible jest major. As of SDK 54 that is jest 29.x (jest 30 has known regressions with some RN packages and is not yet pinned).

### `package.json` (or `jest.config.js`) canonical shape

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": [
      "<rootDir>/jest-setup.ts"
    ],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|moti|nativewind|@testing-library/.*)"
    ],
    "collectCoverageFrom": [
      "lib/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "!**/*.d.ts",
      "!**/index.ts",
      "!lib/i18n/locales/*.ts"
    ],
    "coverageThreshold": {
      "global": { "branches": 70, "functions": 75, "lines": 80, "statements": 80 },
      "./lib/calculations.ts": { "branches": 95, "lines": 95 },
      "./lib/dates.ts":       { "branches": 95, "lines": 95 },
      "./lib/csv.ts":         { "branches": 85, "lines": 85 }
    }
  }
}
```

Key points:

- `transformIgnorePatterns` must allowlist every package that ships **untranspiled ESM/JSX** to jest. The `jest-expo` default covers most Expo/RN packages, but you must add `react-native-reanimated`, `moti`, `nativewind`, and any `@testing-library/*` you load from setup. Missing entries here are the #1 cause of cryptic `SyntaxError: Unexpected token '<'` failures.
- Prefer `jest-expo/universal` only if you actually want Android+iOS+web matrices. For ShiftPay (Android-first, single-platform) stick with plain `jest-expo` — it's ~2× faster in CI.
- `setupFilesAfterEnv` runs after `@testing-library/jest-native/extend-expect` has loaded the DOM matchers. Use it for reanimated `setUpTests()`, router mocks, and expo-sqlite-mock bootstrap (see below).

### `jest-setup.ts` — contents you actually need

```ts
// 1. Reanimated (v4 w/ worklets) — MUST come before anything that imports reanimated
require('react-native-reanimated').setUpTests();
// Reanimated v4 uses react-native-worklets. Add its mock too:
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

// 2. expo-router testing mocks
import 'expo-router/testing-library/mocks';

// 3. expo-sqlite in-memory
// (expo-sqlite-mock ships its own setupFilesAfterEnv entry — see SQLite section)

// 4. NativeWind has no runtime side-effects in unit tests — it compiles at build.
// Mock it only if a component imports `useColorScheme` from nativewind directly.

// 5. Silence Animated warnings + set timezone for deterministic date tests
process.env.TZ = 'Europe/Oslo';
```

### TypeScript

Add `"types": ["jest", "node"]` to `tsconfig.json#compilerOptions`. `@types/jest` is already the right package (do NOT install `@jest/globals` — the `jest-expo` preset exposes globals by default).

### SDK 54 pitfalls flagged during research

| Pitfall | Severity | Workaround |
|---|---|---|
| `jest-expo` mock for new `expo-file-system` (`Paths`, `File` classes) missing, defaults to legacy. Issue [#39922](https://github.com/expo/expo/issues/39922). Affects `lib/csv.ts` in ShiftPay. | High | Import from `expo-file-system/legacy` in code under test, or add a manual mock of `expo-file-system` in `__mocks__/`. |
| React 19 + `react-test-renderer` removed. `@testing-library/react-native` v13 uses the new React renderer — older guides calling `react-test-renderer` are obsolete. | Medium | Use RNTL v13+ only. Verify `package.json` shows no `react-test-renderer` entry. |
| Reanimated v4 requires New Architecture (Fabric). Tests still run in the JS-only Jest environment, but `require('react-native-reanimated/mock')` must be the v4-compatible mock — install `react-native-worklets` alongside reanimated 4. | High | `jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))` in setup. |
| `expo-font` + Google Fonts packages (`@expo-google-fonts/inter`, etc.) call native async loaders. Components that render Inter will throw in Jest. | Low | Mock `expo-font` in setup: `jest.mock('expo-font', () => ({ useFonts: () => [true], loadAsync: jest.fn() }))`. |
| `npx expo install` may fail with `ConfigError` on some Windows boxes — memory already notes this for ShiftPay. | Low | Fall back to `npm install` with exact versions that `npx expo install --check` suggests. |

---

## 2. `@testing-library/react-native` — query & async patterns

Callstack's official "LLM Guidelines" doc for RNTL v13 is the single most important reference for this section; it is now the canonical style guide. Summary:

### Query priority (exact order)

1. `getByRole` (semantic, matches screen readers)
2. `getByLabelText`
3. `getByPlaceholderText`
4. `getByText`
5. `getByDisplayValue`
6. `getByTestId` — last resort only when there is no visible/accessible text

For ShiftPay this means: in `ShiftTable`, `PaySummary`, and `RateSetup`, prefer role-based queries. Where needed, add `accessibilityRole="button"` / `accessibilityLabel="Save rates"` rather than sprinkling `testID`.

### Sync vs async

| Pattern | Use when |
|---|---|
| `getByRole(...)` | Element is already rendered (fails immediately if missing). |
| `queryByRole(...)` | Asserting something is **not** present: `expect(screen.queryByText('Error')).toBeNull()`. |
| `findByRole(...)` | Element appears after async state (data load, router push). Returns a promise; throws if not found within 1 000 ms. |
| `waitFor(() => expect(...))` | Final fallback for asserting non-presence after a delay, or for non-element assertions (e.g. a spy was called). |

**Hard rules (from the LLM guidelines):**
- Never put side effects inside `waitFor` — it runs the callback repeatedly.
- Never combine `waitFor` + `getBy*`. Use `findBy*` instead.
- Never manually wrap `fireEvent` / `render` in `act()`. RNTL v13 handles it.
- Prefer `userEvent` (async, realistic event sequence) over `fireEvent` for anything more than trivial `onPress`.
- Use the `screen` object, don't destructure queries from `render()`.

### Custom matchers to load

`@testing-library/jest-native` is deprecated in RNTL v13 — matchers are now built in. Load them via `jest-expo` preset which already wires `extend-expect` automatically.

Useful matchers for ShiftPay:
- `toBeOnTheScreen()` — replaces the old `toBeInTheDocument`.
- `toHaveTextContent(/kr\s?\d/)` — good for money-formatted strings.
- `toBeDisabled()` / `toBeEnabled()`.
- `toHaveAccessibilityValue({ text: '350 kr' })`.

### Pattern examples for ShiftPay

```tsx
// Navigation + async load — correct shape
import { renderRouter, screen, act } from 'expo-router/testing-library';
import { router } from 'expo-router';

it('navigates from dashboard to period detail', async () => {
  renderRouter({ 'index': () => <Dashboard />, 'period/[id]': () => <PeriodDetail /> }, {
    initialUrl: '/',
  });
  await act(async () => { router.push('/period/abc-uuid'); });
  expect(await screen.findByText(/Period/i)).toBeOnTheScreen();
});
```

---

## 3. Mocking Expo modules, NativeWind, moti, reanimated, expo-router

### Expo built-in mocks (free)

The `jest-expo` preset automatically mocks the **native half** of most `expo-*` packages — meaning API surface is present and returns sensible defaults. Covered out of the box: `expo-constants`, `expo-crypto` (partial — see below), `expo-haptics`, `expo-localization`, `expo-status-bar`, `expo-splash-screen`, `expo-system-ui`, `expo-font` (partial), `expo-linking`.

### What you must mock yourself

| Package | Reason | Recommended approach |
|---|---|---|
| `expo-sqlite` | Native SQLite bridge not reachable in node. | `expo-sqlite-mock` package — see §4. |
| `expo-camera` | Native view. | `jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: true }, jest.fn()] }))` in a `__mocks__/expo-camera.ts`. |
| `expo-image-picker` | Native intent. | Mock `launchCameraAsync`/`launchImageLibraryAsync` to resolve with a canned URI fixture. |
| `expo-document-picker` | Native intent. | Mock `getDocumentAsync` similarly. |
| `expo-notifications` | Native scheduler. | Mock `scheduleNotificationAsync`, `requestPermissionsAsync`, `getAllScheduledNotificationsAsync`. The notifications scheduler in `lib/notifications.ts` is a prime unit-test target once mocked. |
| `expo-file-system` | SDK 54 `Paths`/`File` not auto-mocked (issue #39922). | Hand-roll a `__mocks__/expo-file-system.ts` exposing `readAsStringAsync`, `writeAsStringAsync`, `cacheDirectory`. |
| `expo-sharing` | Native share sheet. | Mock `shareAsync` → jest.fn(). |
| `expo-crypto` `getRandomValues` | Partial mock in jest-expo — returns all zeros, which breaks `generateId()` UUID v4 output. | Add to setup: `jest.mock('expo-crypto', () => ({ ...jest.requireActual('expo-crypto'), getRandomValues: (arr) => { require('crypto').randomFillSync(arr); return arr; } }))`. |
| `react-native-reanimated` | JS side has worklets. | `require('react-native-reanimated').setUpTests()` in setup. |
| `react-native-worklets` | Required by reanimated 4. | `jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))`. |
| `moti` | Built on reanimated — inherits the mock. | Usually works if reanimated is mocked correctly. If you get worklet errors, `jest.mock('moti', () => ({ MotiView: require('react-native').View, MotiText: require('react-native').Text }))`. |
| `nativewind` | Compile-time — generally no mock needed. | Only mock `useColorScheme` if components consume it directly: `jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light', setColorScheme: jest.fn() }) }))`. |
| `phosphor-react-native` | SVG-backed icons. | Usually works via `react-native-svg` auto-mock from jest-expo. If not: `jest.mock('phosphor-react-native', () => new Proxy({}, { get: () => () => null }))`. |
| `expo-router` | File-system routing. | `expo-router/testing-library` — `renderRouter`, not plain `render`. Also import `'expo-router/testing-library/mocks'` in setup. |

### Recommended folder layout

```
shiftpay/
  __mocks__/
    expo-camera.ts
    expo-file-system.ts
    expo-image-picker.ts
    expo-document-picker.ts
    expo-notifications.ts
  jest-setup.ts
```

Jest auto-picks up any file in `<rootDir>/__mocks__/` for third-party modules. No `jest.mock()` call needed.

---

## 4. In-memory SQLite for `lib/db.ts` tests

### Options compared

| Approach | How it works | Pros | Cons |
|---|---|---|---|
| **`expo-sqlite-mock` (v3.x)** | Swap-in mock for `expo-sqlite`, backed by a real SQLite engine under the hood. Full SQL execution including transactions, PRAGMA, ALTER TABLE. | Zero code changes to `lib/db.ts`. Real SQL semantics (unique constraints, transactions, migrations). Actively maintained (v3 supports expo-sqlite >=53). Setup is one-liner in Jest config. | Still driven by a native binding (better-sqlite3 transitively). Windows devs may need build-tools; CI on Ubuntu just works. Concurrent workers need `EXPO_SQLITE_MOCK` env per-worker. |
| **Hand-rolled mock of `expo-sqlite`** | `jest.mock('expo-sqlite', () => ({ openDatabaseAsync: () => ({ execAsync: jest.fn(), runAsync: jest.fn(), getAllAsync: jest.fn() }) }))` | Zero native deps. Fast. | You test *your mock*, not SQL. Migration logic (`PRAGMA table_info`), ON CONFLICT, transactions — all go untested. Not worth it for ShiftPay given `db.ts` is 700 lines of SQL-heavy code. |
| **Abstract DB behind an interface** | Refactor `lib/db.ts` to accept a driver; inject better-sqlite3 in tests, expo-sqlite at runtime. | Maximum purity. | Invasive refactor; out of scope for Pass 0. |
| **Pure better-sqlite3 test double** | Write a second implementation that mirrors the expo-sqlite surface. | No native expo-sqlite needed at all. | Maintenance burden — every API drift breaks tests. |

**Recommendation: `expo-sqlite-mock` v3.0.2+.** Install:

```bash
npm install -D expo-sqlite-mock
```

Add to jest config:

```json
"setupFilesAfterEnv": [
  "<rootDir>/jest-setup.ts",
  "expo-sqlite-mock/src/setup.ts"
],
"testTimeout": 10000
```

### Per-worker isolation

`lib/db.ts` uses a module-level `db` singleton. Tests that run in parallel will interfere with each other unless:

1. You reset the module cache in `beforeEach` (`jest.resetModules(); const db = require('./db');`), **or**
2. Use a fresh DB file per worker: `process.env.EXPO_SQLITE_MOCK = \`${tmp}/test_\${process.env.JEST_WORKER_ID}.db\``.

Use option 1 — it's simpler and forces `initDb()` to re-run the migration chain each test, which is itself worth verifying.

### Tests this unlocks for ShiftPay

- Migration chain (legacy timesheets → schedules+shifts).
- Concurrent `initDb()` calls (the `dbInitPromise` lock) — verify no duplicate schema.
- `insertScheduleWithShifts` transaction rollback when one shift is invalid.
- `updateShift` input validation (date/time regex).
- `getUpcomingShifts` and `getShiftsDueForConfirmation` around the "now" boundary — use `jest.useFakeTimers().setSystemTime(new Date('2026-04-16T14:30:00Z'))`.

---

## 5. Maestro E2E on Android emulator + CI

### Why Maestro (not Detox, not Appium)

Maestro wins for ShiftPay because:

- **YAML > code** — non-brittle flows. A 200-line Detox test becomes 15 lines of Maestro.
- **No app instrumentation** — Maestro drives the running app via accessibility APIs; no extra test build variants.
- **Deep-link first-class** — `- openLink: shiftpay://confirm/abc-uuid` just works, which is critical for ShiftPay's notification-driven confirm flow.
- **CI-proven** — 50-flow suites under 10 minutes on Maestro Cloud; self-hosted on GitHub Actions runs in 5-6 min on macOS Intel runners (Android API 26 x86), 13-25 min on Ubuntu (not recommended).

Detox remains technically faster per-flow but costs you a parallel RN test-build and a TypeScript API that drifts with each RN version. Appium is industry-grade but over-engineered for a single-platform Android app.

### Flow shape (authoritative command set)

```yaml
# .maestro/flows/confirm-shift.yaml
appId: com.shiftpay
---
- launchApp:
    clearState: true
- tapOn: "Settings"
- tapOn:
    id: "base-rate-input"
- inputText: "350"
- tapOn: "Save"
- assertVisible: "Rates saved"
- openLink: "shiftpay://confirm/9f8e7d6c-1234-4abc-9def-012345678901"
- assertVisible: "Confirm shift"
- tapOn: "Completed"
- assertVisible: "Shift confirmed"
```

Key commands for ShiftPay: `launchApp`, `tapOn` (by text, id, or point), `inputText`, `assertVisible`, `assertNotVisible`, `openLink` (deep link), `back`, `scrollUntilVisible`, `waitForAnimationToEnd`, `takeScreenshot`.

### Test IDs

Add `testID="confirm-completed-btn"` sparingly — Maestro prefers visible text. Use IDs only for icon-only buttons or numeric inputs that share labels.

### CI — GitHub Actions, macOS runner (recommended)

Key points from the research:
- **Runner: `macos-13` or `macos-14`** (macos-12 is deprecated April 2025). Linux runners require KVM and the free tier often fails.
- Use `reactivecircus/android-emulator-runner@v2` — handles AVD cache, boot wait, and cleanup.
- Pre-build APK in a separate job; Maestro job downloads artifact.
- Cache: `~/.gradle`, `android/.gradle`, `~/.m2`, `node_modules` via `actions/setup-node@v4 cache: npm`.
- Install Maestro: `curl -Ls "https://get.maestro.mobile.dev" | bash`, then `export PATH="$PATH":"$HOME/.maestro/bin"`.
- Timeout budget: whole job ~15 min on macOS Intel, ~25 min on ARM64 (Apple Silicon runners don't have x86 emulator support; use `arm64-v8a` system image).
- Per `retyui/Using-GitHub-Actions-to-run-your-Maestro-Flows` — **do not** use `ubuntu-latest` for Android E2E; known failures: "Timeout waiting for emulator to boot", `adb: failed to install ... Broken pipe (32)`.

### Gotchas

- Maestro 1.30+ requires Android API ≥ 26. Android 8 minimum — fine for ShiftPay which already targets API 24+.
- `clearState: true` in Maestro wipes app storage but not keystore-bound secrets. Fine for ShiftPay.
- Flaky emulator boots: wrap `reactivecircus/android-emulator-runner` in `nick-fields/retry@v3` with `max_attempts: 2`.

---

## 6. GitHub Actions CI — jobs, caching, cost

### Recommended pipeline

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  lint + tsc     │───▶│  jest (unit)    │───▶│  build APK      │
│  ubuntu-latest  │    │  ubuntu-latest  │    │  ubuntu-latest  │
│  ~2 min         │    │  ~3 min         │    │  ~10 min        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  maestro e2e    │
                                              │  macos-13       │
                                              │  ~12 min        │
                                              └─────────────────┘
```

Total PR feedback: ~15 min critical-path (lint/tsc + jest fan out in parallel; APK build is the bottleneck).

### Caching strategies that actually work

| Cache | Key | Savings |
|---|---|---|
| npm | `node-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}` via `actions/setup-node@v4 cache: npm` | ~1 min per job. |
| Gradle | `~/.gradle/caches`, `~/.gradle/wrapper` keyed on `android/gradle/wrapper/*.properties` + `android/**/build.gradle*` | 3-4 min per APK build. |
| Android SDK | `~/.android/avd` for emulator AVD cache | 2-3 min per emulator boot. |
| Jest | `.jest-cache` directory via `actions/cache@v4` | 30s-1min. Only worth it for large suites (>100 files). |

Do **not** cache `android/app/build/` — it invalidates too aggressively and causes "stale resource" builds.

### EAS integration

Do NOT run `eas build` in every PR. It's rate-limited, billable, and slow. Use EAS Build only:
- On merge to `master` (preview profile → APK artifact).
- Tagged releases (production AAB → internal testing track).
- Use `expo/expo-github-action@v8` with `EXPO_TOKEN` secret.

For PR-time testing, `npx expo run:android --variant release` produces a local APK in 8-10 min on GHA. Maestro runs against that.

### Cost

GitHub-hosted runners — free tier includes 2 000 min/month public, unlimited for public repos. ShiftPay is private → budget ~100-200 PR cycles/month on free tier. macOS minutes count **10×** (1 min macOS = 10 min Linux), so keep Maestro on macos only for weekly full-suite runs; for PRs, run a single smoke-flow on Linux with an ARM emulator (slower but cheap). Real call here is a judgement trade: 120 min/month macOS ≈ 1200 free-tier minutes, still under budget.

---

## 7. Property-based testing with `fast-check` for pay calculations

`lib/calculations.ts` is *textbook* property-test material. Every branch is a pure math function over continuous input domains; invariants are trivial to articulate.

### Install

```bash
npm install -D fast-check
```

Imports: `import fc from 'fast-check';`

### Invariants to encode for ShiftPay

```ts
import fc from 'fast-check';
import { calculateExpectedPay, shiftDurationHours, calculateOvertimePay } from './calculations';

// 1. Duration is always non-negative and <= 24h
it('shiftDurationHours always in (0, 24]', () => {
  fc.assert(fc.property(
    fc.tuple(fc.integer({min: 0, max: 23}), fc.integer({min: 0, max: 59})),
    fc.tuple(fc.integer({min: 0, max: 23}), fc.integer({min: 0, max: 59})),
    ([sh, sm], [eh, em]) => {
      const start = `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`;
      const end = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
      const h = shiftDurationHours(start, end);
      return h > 0 && h <= 24;
    }
  ));
});

// 2. calculateExpectedPay is monotonic in base_rate
it('higher base rate → higher or equal pay', () => {
  fc.assert(fc.property(
    fc.array(fc.record({
      date: fc.constant('01.03.2026'),
      start_time: fc.constant('08:00'),
      end_time: fc.constant('16:00'),
      shift_type: fc.constantFrom('tidlig', 'mellom', 'kveld', 'natt'),
    }), { minLength: 1, maxLength: 20 }),
    fc.double({ min: 100, max: 500, noNaN: true }),
    fc.double({ min: 0, max: 200, noNaN: true }),
    (shifts, baseRate, bump) => {
      const base = { base_rate: baseRate, evening_supplement: 0, night_supplement: 0, weekend_supplement: 0, holiday_supplement: 0, overtime_supplement: 0 };
      const bumped = { ...base, base_rate: baseRate + bump };
      return calculateExpectedPay(shifts, bumped) >= calculateExpectedPay(shifts, base);
    }
  ));
});

// 3. calculateOvertimePay == 0 when no overtime minutes, regardless of rates
it('zero overtime → zero pay', () => {
  fc.assert(fc.property(
    fc.double({min: 0, max: 10000, noNaN: true}),
    fc.double({min: 0, max: 500, noNaN: true}),
    (base, ot) => calculateOvertimePay([{overtime_minutes: 0}], { base_rate: base, overtime_supplement: ot }) === 0
  ));
});

// 4. Empty shift array → zero pay
it('no shifts → zero pay', () => {
  fc.assert(fc.property(
    fc.record({ base_rate: fc.double(), evening_supplement: fc.double(), night_supplement: fc.double(), weekend_supplement: fc.double(), holiday_supplement: fc.double(), overtime_supplement: fc.double() }),
    (rates) => calculateExpectedPay([], rates) === 0
  ));
});
```

### Floating-point precision

`calculateExpectedPay` already rounds to 2 decimals. For other functions, use `fc.float({ noNaN: true, noDefaultInfinity: true })` and compare with a tolerance: `Math.abs(a - b) < 1e-9`.

### Shrinking

On failure, fast-check automatically shrinks the input to a minimal reproducer. The seed is printed — rerun with `fc.assert(..., { seed: 123, path: '0:1' })` to reproduce deterministically. Commit the failing seed as a `fc.pre` example so the regression stays covered.

### Budget

Default 100 runs per property. For pay math, bump to `{ numRuns: 1000 }` — it's cheap and catches rare float edge cases. Don't use `numRuns` > 10 000 in CI; wall-time balloons.

---

## 8. Snapshot strategy

### What to snapshot

| Snapshot | Keep | Drop |
|---|---|---|
| **Pure functions returning objects** (e.g. `parseCSVContent` result for a canned input). | Yes — high signal, small, deterministic. | — |
| **Component render trees** for presentational components with no state (e.g. `PaySummary` given fixed props). | Small inline snapshots (<40 lines) only. | Screens with router/nav/animations. |
| **Error message catalogs** from `csv.ts` `rowReason`. | Inline snapshots. | — |
| **i18n translation keys shape** (all 4 locales have the same keys). | Yes — guards against missing-locale bugs. | — |

### What NOT to snapshot

- Entire screens (`app/(tabs)/index.tsx` rendered). These change constantly; snapshot churn kills review quality.
- Anything with animations, dates, UUIDs, or random data (use behavioural assertions instead).
- Styled output (NativeWind compiles to different inline styles per build — snapshots break).

### Inline vs file snapshots

Prefer `toMatchInlineSnapshot()` for everything under ~20 lines. Reviewers see the expected value in the test file — no jumping to `__snapshots__/`. Use file snapshots only for large, stable structures (e.g. a parsed 100-row CSV).

### Rule of thumb

Kent C. Dodds: "Snapshots themselves do not ensure that your component render logic is correct — they guard against unexpected changes." Snapshot tests are a regression net, not a correctness proof. For ShiftPay, write behavioural tests (`expect(screen.getByText('Expected: 2 800 kr')).toBeOnTheScreen()`) *first*, snapshots only where they add signal cheaply.

---

## 9. Coverage targets — realistic for ShiftPay

| Path | Lines | Branches | Rationale |
|---|---|---|---|
| `lib/calculations.ts` | 95% | 95% | Pure math, no deps, every branch has a concrete property. |
| `lib/dates.ts` | 95% | 95% | 33 lines, two exports, trivial. |
| `lib/csv.ts` | 85% | 85% | File-system IO (`parseCSVFile`, `exportShiftsAsCSV`) hard to cover; pure parsing trivial. |
| `lib/db.ts` | 75% | 65% | Migration chain + `withDb` retry path require fault injection. Aim for happy-path + one transaction rollback. |
| `lib/api.ts` | 70% | 60% | Network — mock `fetch`, test happy/error/timeout paths. |
| `lib/i18n/` | N/A | N/A | Exclude from coverage (static data). |
| `lib/notifications.ts` | 60% | 50% | Scheduling logic worth it, permission flow is `expo-notifications` mock plumbing. |
| `components/**` | 50% | 40% | Component tests for `ShiftTable`, `PaySummary`, `RateSetup`. Skip `ErrorBoundary` (hard to test meaningfully). |
| `app/**` | 0% threshold | 0% | Screens are composition layers — E2E (Maestro) tests them end-to-end. Drop a behavioural test only for `confirm/[shiftId].tsx` (deep-link entrypoint). |

**Aggregate target:** 80% lines / 70% branches, globally. This is aggressive but achievable because 60% of the meaningful logic lives in pure modules.

### Exclusions (`coveragePathIgnorePatterns`)

```
/node_modules/
/android/
/ios/
/\.expo/
/__tests__/
/__mocks__/
/lib/i18n/locales/
\.d\.ts$
/index\.ts$  (barrel files)
```

---

## 10. Test organization — colocated vs `__tests__`

### Options

| Layout | Example | Pros | Cons |
|---|---|---|---|
| **Colocated `.test.ts` next to source** | `lib/calculations.ts` + `lib/calculations.test.ts` | Easy to discover; rename/move keeps tests attached; encourages small tests. | Clutters `lib/` directory listing; can't grep `lib/` without seeing tests. |
| **Central `__tests__/` folder** | `__tests__/lib/calculations.test.ts` | Clean source tree; clear test-vs-prod split. | Deep path mirroring; tests drift when files move. |
| **Per-module `__tests__/`** | `lib/__tests__/calculations.test.ts` | Jest's historical default; short paths. | Awkward for co-located unit + integration tests. |
| **Hybrid** | Colocated for unit; central for integration/E2E. | Balances both. | Two conventions to explain. |

**Recommendation for ShiftPay: colocated `.test.ts` for `lib/` and `components/`; separate `maestro/` folder for E2E YAML flows; separate `__tests__/integration/` for multi-module integration tests.**

Reasoning:
- `lib/` is small (9 files currently). Colocating tests doubles the file count but keeps each concern physically next to its test.
- Expo Router **requires** `app/` to contain only routes/layouts. You cannot put tests inside `app/`. Integration tests that exercise routing must live outside `app/` — `__tests__/` or `tests/` at repo root.
- Naming: `.test.ts` not `.spec.ts` (Jest default; avoids confusion with Playwright).
- E2E flows live under `.maestro/flows/` (dotted to match Maestro CLI convention).

### Suggested final layout

```
shiftpay/
  app/                       # routes only, no tests
  components/
    ShiftTable.tsx
    ShiftTable.test.tsx      # colocated component tests
    PaySummary.tsx
    PaySummary.test.tsx
  lib/
    calculations.ts
    calculations.test.ts
    calculations.property.test.ts   # fast-check properties
    dates.ts
    dates.test.ts
    db.ts
    db.test.ts
    csv.ts
    csv.test.ts
  __tests__/
    integration/
      schedule-import-flow.test.tsx
      notification-deep-link.test.tsx
    fixtures/
      sample-timesheet.csv
      ocr-response.json
  __mocks__/
    expo-camera.ts
    expo-file-system.ts
    expo-notifications.ts
  .maestro/
    flows/
      smoke.yaml
      confirm-shift.yaml
      import-csv.yaml
  jest.config.js (or in package.json)
  jest-setup.ts
```

---

## Gotchas & Considerations (consolidated)

- **`jest-expo` SDK 54 file-system mock is broken** (issue #39922). Hand-roll `__mocks__/expo-file-system.ts`.
- **Reanimated 4 + worklets** need both mocks; missing `react-native-worklets` mock = cryptic worklet init errors.
- **`expo-crypto.getRandomValues`** partial mock returns zeros — patch in setup for UUID v4 correctness.
- **Timezone** — set `process.env.TZ = 'Europe/Oslo'` in jest-setup, else `getDay()` in `calculations.ts#isWeekend` varies on GitHub runners (UTC).
- **Module singleton** in `lib/db.ts` — reset with `jest.resetModules()` between tests.
- **macOS GHA runners** are 10× billing; use sparingly. Linux works for jest + APK build; macOS only for Maestro.
- **`e.stopPropagation()` doesn't exist** in RN — memory already notes. RNTL `userEvent.press` simulates a full gesture, not a synthetic event, so this is a non-issue in tests.
- **NativeWind class names** won't appear in snapshots as CSS — they compile to `style` props at build. Assert on computed `style` not `className`.
- **`@testing-library/jest-native` is deprecated in RNTL v13**. Do not install it; matchers are built-in.
- **Jest 30** has known issues with RN 0.81 preset; pin to `jest@29.7.x` (what `npx expo install jest` ships).
- **Windows path separators** in `transformIgnorePatterns` — use forward slashes in the regex; jest normalizes.

## Recommendations

1. **This pass:** install `jest-expo`, `@testing-library/react-native`, `expo-sqlite-mock`, `fast-check`, `@types/jest`. Create `jest.config.js`, `jest-setup.ts`, `__mocks__/` with the three hand-rolled mocks. Write first tests for `lib/calculations.ts` (properties) and `lib/dates.ts` (happy + edge). Land with an initial coverage threshold of 60% global — tightens to 80% over subsequent passes.
2. **Next pass (Pass 1 candidate):** port `lib/db.ts` tests including migration chain. Introduce `__tests__/integration/` with an OCR-to-dashboard end-to-end unit test.
3. **Later:** Maestro smoke flow in CI on every PR (Linux), full E2E suite nightly on macOS.
4. **Do not** pursue: per-component snapshot coverage, Detox/Appium, Playwright for mobile. Overkill for a single-platform app.

---

## Sources

1. [Expo — Unit testing with Jest](https://docs.expo.dev/develop/unit-testing/) — canonical install/config for `jest-expo`, SDK 54.
2. [jest-expo on npm](https://www.npmjs.com/package/jest-expo) — version pinning.
3. [`jest-expo` README on GitHub](https://github.com/expo/expo/blob/main/packages/jest-expo/README.md) — transformIgnorePatterns reference.
4. [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54) — migration notes.
5. [GitHub issue #39922 — jest-expo file-system mock broken](https://github.com/expo/expo/issues/39922) — SDK 54 pitfall evidence.
6. [Expo Router testing docs](https://docs.expo.dev/router/reference/testing/) — `renderRouter` API and deep-link testing.
7. [expo-router/testing-library mocks source](https://github.com/expo/router/blob/main/packages/expo-router/src/testing-library/mocks.ts) — what the preset actually mocks.
8. [React Native Testing Library — LLM Guidelines v13](https://oss.callstack.com/react-native-testing-library/docs/guides/llm-guidelines) — query priority, async patterns, anti-patterns.
9. [Kent C. Dodds — Common mistakes with RTL](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) — universal anti-patterns.
10. [Reanimated — Testing with Jest](https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/) — `setUpTests()` pattern.
11. [React Native Worklets — Testing with Jest](https://docs.swmansion.com/react-native-worklets/docs/guides/testing/) — v4 worklet mock.
12. [expo-sqlite-mock on GitHub](https://github.com/zfben/expo-sqlite-mock) — in-memory SQLite for jest; v3 supports expo-sqlite >=53.
13. [Codemagic — Testing SQLite in RN apps with Jest](https://blog.codemagic.io/testing-local-database-for-react-native/) — alternative mock approaches.
14. [Maestro on GitHub](https://github.com/mobile-dev-inc/maestro) — YAML command reference.
15. [retyui — best tips & tricks for Maestro + RN](https://dev.to/retyui/best-tips-tricks-for-e2e-maestro-with-react-native-2kaa) — deep link, testID patterns.
16. [retyui — Using GitHub Actions to run Maestro Flows](https://github.com/retyui/Using-GitHub-Actions-to-run-your-Maestro-Flows) — macOS vs Ubuntu, API 26 constraints, common emulator errors.
17. [PkgPulse — Detox vs Maestro vs Appium RN E2E 2026](https://www.pkgpulse.com/blog/detox-vs-maestro-vs-appium-react-native-e2e-testing-2026) — framework comparison.
18. [Expo — Run E2E tests on EAS Workflows with Maestro](https://docs.expo.dev/eas/workflows/examples/e2e-tests/) — EAS integration.
19. [fast-check on GitHub](https://github.com/dubzzz/fast-check) — installation, arbitraries, shrinking.
20. [fast-check documentation](https://fast-check.dev/) — advanced features and real-world usage.
21. [Jest — Configuring Jest](https://jestjs.io/docs/configuration) — coverage, transformIgnorePatterns canonical reference.
22. [Jest — Snapshot Testing](https://jestjs.io/docs/snapshot-testing) — snapshot best practices.
23. [Expo — Mocking native calls in Expo modules](https://docs.expo.dev/modules/mocking/) — manual mock patterns for native modules.
24. [reactivecircus/android-emulator-runner](https://github.com/ReactiveCircus/android-emulator-runner) — de-facto Android emulator action for GHA.
25. [expo/expo-github-action](https://github.com/expo/expo-github-action) — Expo official GHA integration.
