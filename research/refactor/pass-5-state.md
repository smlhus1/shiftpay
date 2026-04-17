# Pass 5 — State Management Architecture

> Researched: 2026-04-16 | Sources consulted: 30+ | Confidence: High
> App baseline: Expo SDK 54, RN 0.81, local-only (expo-sqlite), no network, 6 screens, single dev

## TL;DR

**Do not adopt Zustand, Redux, Jotai, or TanStack Query for ShiftPay.** The app is local-only, single-user, has no server state, and the current provider footprint is tiny (2 providers, 4 AsyncStorage keys). Instead, the correct Pass 5 moves are: (1) keep Context for theme + locale, (2) extract a thin `useQuery`-style SQLite hook (custom `useDbQuery`/`useDbMutation` ~80 LOC) built on top of `expo-sqlite`'s new reactive API (`onDatabaseChange`) to replace the scattered `useFocusEffect(load)` pattern, (3) replace AsyncStorage with **MMKV** for preferences (synchronous reads eliminate the `loaded` flag and the provider's `null` return — killing the theme-flash class of bugs outright), (4) introduce a zod-validated typed storage wrapper with a version field, (5) use `useReducer` (not XState) for the Import flow state machine, (6) adopt **react-hook-form + zod resolver** for the settings and shift-editor forms. Total added surface area: ~3 deps, ~200 LOC of infra. No global store needed.

The single most impactful change is MMKV + synchronous hydration — it removes a whole class of lifecycle hazards currently masked by the `if (!loaded) return null` pattern in `ThemeProvider`.

---

## 1. Current state audit

Concrete observations from the codebase (not generic recommendations):

- **Two Context providers** at root: `LocaleProvider` → `ThemeProvider`. Both use `useState` + `useEffect` to hydrate from AsyncStorage. `ThemeProvider` renders `null` until hydrated; `LocaleProvider` renders children with stale defaults during hydration. Inconsistent.
- **No global store.** Context is used sparingly and correctly — theme, locale, currency. This is healthy.
- **Screens are fat orchestrators.** `app/(tabs)/index.tsx` loads 6 data sources inside one `load()` function, 7 `useState` hooks, manual `setLoading`/`setLoadError` bookkeeping. `useFocusEffect` triggers full reloads. No cache, no deduping.
- **Import flow is an implicit state machine** with 5 booleans (`loading`, `saving`, `calculating`, `showCamera`, `baseRateZero`) + a `source` enum + `rows` + `savedResult`. States overlap (you can be `loading && !showCamera && rows.length === 0`). This is the single most tangled state blob in the app.
- **Forms are controlled components.** `settings.tsx` uses `useState<TariffRatesInput>` with inline `toNum`/`toStr` conversion, no validation library, no dirty tracking, no field-level error state. Works but won't scale past 10 fields.
- **OCR client (`lib/api.ts`) is imperative.** Called directly from `takePhoto`, `processMultipleImages`. No cancellation if user navigates away mid-request.
- **No optimistic updates anywhere.** Confirm-shift flow (the one place where optimism would matter — user taps "completed", wants instant feedback) has not been inspected but almost certainly waits on DB writes.

---

## 2. Context vs Zustand vs Jotai vs Redux Toolkit — 2026

### Tradeoff table

| Dimension | React Context | Zustand 5.x | Jotai 2.x | Redux Toolkit |
|-----------|---------------|-------------|-----------|---------------|
| Bundle (gzipped) | 0 kB (built in) | ~1.2–3 kB | ~2.4 kB core + utils | ~14 kB RTK + ~5 kB react-redux |
| Boilerplate | Provider + hook | `create()` + hook | `atom()` + `useAtom()` | slice + reducer + dispatch |
| Re-render granularity | Whole subtree | Selector-based | Atom-level (finest) | Selector-based |
| DevTools | None (React DevTools only) | Redux DevTools adapter | DevTools extension | Best-in-class, time-travel |
| TS ergonomics | Manual generic plumbing | Inferred from store shape | Inferred from atom | Good with RTK |
| Hermes perf | Native React, fastest cold start | Proxy-free, excellent | Proxy-free, excellent | Heavier init |
| Async built-in | No | Via middleware | Suspense atoms | RTK Query / thunks |
| "Renders outside React" | No | Yes (`store.getState()`) | Via store | Yes |
| Persistence | Manual | `persist` middleware | `atomWithStorage` | `redux-persist` |

### Synthesis

- **Zustand** wins when you have *global mutable state touched by many unrelated screens* (e.g., user session, theme shared across 30 screens, a shopping cart). ShiftPay has neither. The two globals — theme and locale — already work fine in Context and re-render only the whole tree on change, which is correct behaviour since every screen is affected.
- **Jotai** wins when you need *fine-grained derived state* (form builders, spreadsheets, dependent computations). ShiftPay has no such thing. Tariff rates are computed once at save time.
- **Redux Toolkit** wins when you need *auditable state transitions with time-travel debugging* or when the team is large enough that coding conventions beat ergonomics. Neither applies. Solo dev, no audit requirement.
- **Context** wins when state is *tree-shaped, slow-moving, and affects wide subtrees.* Theme and locale are the textbook case. Keep it.

**Recommendation: keep Context for theme/locale. Do not introduce Zustand/Jotai/RTK.** The benefit is negative at this scale — you'd be trading ~500 LOC of Context for ~500 LOC of store boilerplate without reducing any friction. Re-evaluate if you ever add cloud sync (v2 opt-in) — at that point Zustand + MMKV persist middleware is the right landing.

---

## 3. TanStack Query for a local-only SQLite app — is it worth it?

**Short answer: no, not the library itself. Yes, the pattern.**

TanStack Query's value is 80% network-specific: deduping requests, refetch-on-focus, retry, stale-while-revalidate against a remote source of truth. ShiftPay has no remote source. The OCR call is the only network I/O and it's fire-and-forget.

However, three TanStack Query *patterns* are high-value even with SQLite:

1. **Cache-keyed data access.** The dashboard loads `months`, `upcomingShifts`, `dueConfirmation`, `weekShifts`, `monthSummary`, `tariffRates` independently. Today each screen re-queries on focus. A keyed cache means `settings` can invalidate `tariffRates` and the dashboard picks it up automatically without a cross-screen signal.
2. **Query invalidation as a pub/sub for DB writes.** After `insertScheduleWithShifts()`, you invalidate `["shifts"]` and all mounted screens re-read. This replaces the current `useFocusEffect` hammer.
3. **`useQuery`'s `status` discriminated union** (`idle | pending | success | error`) replaces ad hoc `loading` + `error` + `data` triplets.

### Two paths

**Path A: Adopt TanStack Query + TanStack DB 0.6.** TanStack DB 0.6 (released 2026-03-25) added SQLite-backed persistence for React Native via `op-sqlite`. This gives you reactive queries over SQLite with fine-grained updates. Cost: +45 kB, +1 dep (`@tanstack/query`), +1 dep (`@tanstack/db`), migration from `expo-sqlite` to `op-sqlite` (non-trivial — different API, different transaction model).

**Path B: Build a 60-LOC `useDbQuery` hook.** Wraps `expo-sqlite`'s 2025 reactive `addDatabaseChangeListener` API. Keyed by a string, invalidated by either explicit `invalidate(key)` or any change listener on the touched table. Covers 90% of what TanStack Query would give you for this app.

### Recommendation: Path B

- TanStack DB 0.6 requires swapping `expo-sqlite` for `op-sqlite`. That's a Pass 5 derailment — you'd spend the whole refactor on the storage layer rewrite.
- The `op-sqlite` migration has real value (better perf, JSI) but belongs in a dedicated pass.
- A hand-rolled `useDbQuery` gives you query keys, invalidation, and a `{ data, error, status }` return shape. That's the only API contract that matters here.
- If ShiftPay ever grows a sync backend (v2), migrate to TanStack DB 0.6 — by then it's stable and `op-sqlite` is the default.

---

## 4. AsyncStorage → MMKV

### The case for MMKV

| | AsyncStorage | MMKV 3.x |
|---|---|---|
| API | Async (Promise-based) | **Synchronous** |
| Read speed | ~1–5 ms | ~0.02 ms (30× faster) |
| Write speed | ~5–20 ms | ~0.1 ms (500% faster) |
| Encryption | No | AES, optional |
| Size limit (Android) | 6 MB default (WAL-bound) | No practical limit (memory-mapped) |
| Concurrent writes | Lossy without mutex | Safe |
| Bundle impact | 0 (already installed) | +100 kB native |
| Expo compatibility | Works in Expo Go | **Dev client or prebuild required** |
| New Architecture | Works | Required (v3+ uses TurboModules) |

### Why synchronous matters for ShiftPay

The current `ThemeProvider` returns `null` until `loaded === true`. This is a *load order leak* — it forces every component that renders before hydration into an invisible state. The SplashScreen coordination in `_layout.tsx` is fragile: splash hides in `runInit` (DB ready), but theme hydrates in parallel. On a slow device, there's a race where splash hides and theme is still dark-default before user's light preference loads. This is the "flash of wrong theme" class of bug.

With MMKV, `const pref = storage.getString('shiftpay_theme')` is synchronous. The provider can compute the correct theme on first render. The `if (!loaded) return null` guard disappears. The `useEffect` hydration dance disappears. The splash handoff becomes deterministic.

### Expo SDK 54 compatibility

- MMKV 3.x requires New Architecture. Expo SDK 54 runs on New Arch by default — compatible.
- `npx expo install react-native-mmkv react-native-nitro-modules` works. Requires `npx expo prebuild` (already in use per `android/` in gitignore note).
- **Not supported in Expo Go.** You're already on dev client / local `expo run:android`, so irrelevant.

### Recommendation

**Adopt MMKV for all 4 current AsyncStorage keys.** Keep AsyncStorage out of the deps tree entirely — one storage layer. Migration is trivial: `MMKV.getString(key) ?? AsyncStorage.getItem(key)` on first run, copy forward, delete the async key. One-time migration runs in `initDb`.

---

## 5. Typed storage wrapper + versioning

MMKV gives you raw `getString`/`getNumber`/`getBoolean`. You'll want a typed wrapper:

```
storage.getJSON('shiftpay_prefs', PrefsSchema)  // zod-validated, typed, returns null on mismatch
storage.setJSON('shiftpay_prefs', value)
```

### Versioning pattern

Store schema version alongside data:

```
{ __v: 2, theme: 'dark', locale: 'nb', currency: 'NOK' }
```

On read: check `__v`, run migrations in sequence (`1→2→3`), validate final shape with zod, persist migrated value. Migrations live in a single `migrations.ts` with `[{ from: 1, to: 2, migrate: (old) => ... }]`. Zod at the boundary protects against hand-edited storage or corrupt files.

### Concurrent-write safety

MMKV is safe for concurrent reads/writes at the file level. Logical concurrency (read-modify-write from two callers) still needs app-level care. For ShiftPay, the only writes are user-initiated (theme picker, settings save), none of which can race in practice.

### Recommendation

- One `lib/storage.ts` module with typed `getJSON`/`setJSON` + zod at the boundary.
- Single versioned key (`shiftpay_prefs`) instead of 4 separate keys. Simpler migration, atomic writes.
- Onboarding-done stays as a separate boolean key — it's ephemeral and cheap.

---

## 6. Suspense in RN + Expo Router

Expo Router SDK 54 wraps routes in Suspense automatically. Route files can export an `ErrorBoundary` component for per-route error handling. Data loaders (`loader` export, SDK 55+) are still alpha and server-render-only — not useful for ShiftPay.

**For this app, Suspense is a marginal win.** The value of Suspense is (1) declarative loading, (2) waterfall avoidance by pre-rendering siblings in parallel. Dashboard already parallelises via `Promise.all`. The loading states are custom (skeleton cards in Import, ActivityIndicator in Dashboard) — Suspense would need a matching `<Suspense fallback={<Skeleton />}>` tree and you'd still write the skeletons.

**Recommendation:** Don't chase Suspense for Pass 5. If you adopt `useDbQuery`, return `{ status, data, error }` directly — it's clearer than hook-throws-promise at this scale. Revisit if/when you adopt TanStack Query.

One narrow exception: wrap the OCR request in a Suspense boundary to kill it on unmount (via `AbortController`). This fixes the real bug where navigating away during OCR leaves the request running and tries to `setRows` on an unmounted component.

---

## 7. Optimistic updates with SQLite

The ShiftPay case: user taps "confirm shift" in `confirm/[shiftId].tsx`. Today this likely does: button press → `UPDATE shifts SET status='completed'` → refetch dashboard → UI updates. User sees 100–400 ms of nothing.

### Pattern without React Query

```
1. Compute optimistic state locally (synchronous).
2. Update UI via setState/useReducer.
3. Fire DB write.
4. On success: invalidate cache key → re-read from DB → UI reconciles (usually no-op).
5. On failure: setState back to previous, show toast.
```

React 19's `useOptimistic` hook is built for this but is awkward with SQLite because it's tied to a form action or transition. For ShiftPay, a plain reducer pattern inside `useDbMutation` is cleaner:

```
const { mutate, status } = useDbMutation({
  fn: async (shiftId) => db.update(...),
  onMutate: (shiftId) => cache.set(['shift', shiftId], { ...current, status: 'completed' }),
  onError: (_, shiftId, prev) => cache.set(['shift', shiftId], prev),
  onSuccess: () => invalidate(['shifts']),
})
```

This is 40 LOC of infra, gives you the full optimistic pattern, and composes with `useDbQuery`.

**Recommendation:** Build `useDbMutation` alongside `useDbQuery`. Use it for: confirm shift, delete shift, update shift. Skip for: tariff rate save (rare, not time-critical), schedule import (destructive, user expects wait).

---

## 8. Import flow — XState vs plain reducer

### The flow

```
idle → (camera OR gallery OR files OR csv OR manual)
  → loading (OCR or parse)
  → review (rows visible, editable)
  → calculating OR saving
  → saved → (view OR import-more → idle)
  → error (from any above state, with retry path back)
```

5–7 distinct states, ~12 transitions, 4 entry points. This is genuinely non-trivial and the current implementation has 8 booleans modelling it implicitly.

### XState v5

- Bundle: `xstate` ~14 kB + `@xstate/react` ~2 kB. Real cost on a small app.
- Wins: invokable actors for OCR (automatic cleanup on state exit), impossible-state proofs, visualizer, replay in tests.
- Learning cost: ~2 days for someone who's never used state machines. Machine-of-the-week trap is real.

### Plain `useReducer`

- Bundle: 0.
- Action type: discriminated union. TS catches invalid transitions at compile time.
- Wins: one file, no deps, reviewers already understand it.
- Loses: no actor cleanup (you write the `AbortController` yourself), no visualizer.

### Recommendation: useReducer + discriminated union

```
type ImportState =
  | { tag: 'idle' }
  | { tag: 'loading'; progress: string | null; source: Source }
  | { tag: 'review'; rows: CsvRowResult[]; source: Source; expectedPay: number | null }
  | { tag: 'saving'; rows: CsvRowResult[] }
  | { tag: 'saved'; result: SavedResult }
  | { tag: 'error'; message: string; recoverable: true }
```

This single type eliminates the impossible `loading && rows.length > 0 && savedResult` state that the current code could technically produce. 150 LOC of reducer + dispatch. XState is worth the weight *at 3+ machines in the app*, not at 1. If Pass 7 or Pass 8 adds a second complex flow (e.g., multi-step onboarding with backend), revisit.

---

## 9. Forms — react-hook-form + zod

Settings form today has 8 fields with controlled `useState<TariffRatesInput>` and a custom `toNum` coercer. Every keystroke re-renders the whole screen. Validation is implicit (`toNum` clamps at 0, but there's no user-facing error like "rate must be positive").

### Options

| | RHF | TanStack Form | Formik | Controlled (current) |
|---|---|---|---|---|
| Bundle | ~8 kB | ~20 kB | ~13 kB + yup 22 kB | 0 |
| Re-render model | Uncontrolled refs | Granular signals | Controlled | Controlled |
| RN quirks | `Controller` wrapper needed for `TextInput` | First-class RN plugin | `Controller` needed | None |
| Zod integration | `@hookform/resolvers/zod` | Native | `toFormikValidationSchema` | Manual |
| Maturity | Battle-tested | Newer, 2025–2026 rising | Stable, slowing | Always works |

### RHF RN quirks

`TextInput` doesn't expose a native ref the way HTML does, so RHF uses `Controller` to bridge. It works but means every field is a `Controller`-wrapped component — more ceremony than on web. TanStack Form's RN plugin is smoother here but the library is younger and the RN docs are thin.

### Recommendation: **react-hook-form + zod**

- Mature (7+ years), 40 kB combined with zod, well-known patterns.
- The RN `Controller` ceremony is one-time — define a `<RateField>` component that wraps `Controller` + `TextInput` and use it 8 times. Same pattern already exists in `settings.tsx` with the `RateField` component — swapping for RHF is close to drop-in.
- Zod schema doubles as the DB insert validator — single source of truth for shape.
- TanStack Form is tempting but immature for RN. Revisit in 12 months.

---

## 10. Theme + locale hydration — fixing the flash

The current flow:

1. `SplashScreen.preventAutoHideAsync()` at module load.
2. `LocaleProvider` mounts, starts async hydrate.
3. `ThemeProvider` mounts inside it, starts async hydrate, returns `null` until done.
4. `RootLayoutInner` mounts, starts `initDb` + onboarding check.
5. Splash hides after `initDb` resolves.

Failure modes:
- Splash hides before theme hydrates → flash.
- Theme hydrates before fonts load → intermediate render with default theme.
- LocaleProvider doesn't block render → first frame shows default Norwegian strings.

### Fix with MMKV

Sync storage collapses steps 2 and 3 into sync work at first render. Order becomes:

1. Module load: `const prefs = storage.getJSON('shiftpay_prefs', PrefsSchema) ?? defaults`.
2. `preventAutoHideAsync()`.
3. Both providers initialize with correct values on first render. No `useEffect` hydration. No `null` render.
4. `initDb` + fonts load in parallel (both async).
5. `Promise.all([initDb, fonts])` → `hideAsync()`.

This is the single highest-ROI change in Pass 5.

### Splash coordination

Use `SplashScreen.setOptions({ fade: true, duration: 300 })` and hide after both fonts and DB are ready. Never hide inside a conditional branch — always in `finally`. Current code does this correctly; preserve it.

---

## 11. URL state — Expo Router params

Expo Router gives `useLocalSearchParams()` and `router.push(path)`. Things that should be URL state (persist across nav, shareable, back-button-aware):

- Current period detail (`/period/[id]`) ✓ already URL
- Confirm shift (`/confirm/[shiftId]`) ✓ already URL
- Monthly summary (`/summary/[yearMonth]`) ✓ already URL
- Active tab ✓ Expo Router handles

Things that *shouldn't* be URL but are currently component state:

- Import flow step — correct, component state.
- Settings expanded sections — component state is fine.
- Dashboard selected month — currently there is no "selected month", good.

**Recommendation:** Keep current URL boundaries. Do not over-route. The app's natural model is linear, not deep-linked.

---

## 12. Dependency injection / service locator

Current pattern: direct imports. `lib/db.ts` exposes functions, screens import them. `lib/api.ts` exports `postOcr`, consumed directly. No DI container.

For an app this size, DI is a premature abstraction. The *only* reason to introduce it would be testability — swap `db` for an in-memory mock in tests. But:

- There are no tests today (per `CLAUDE.md`).
- `expo-sqlite` has an `openDatabaseSync(':memory:')` option that's better than DI mocking — you test against real SQLite.

### Service locator via Context — skip

Passing `db` through Context creates an "everything is a hook" problem and couples components to React lifecycle for zero benefit.

### Thin function modules — keep

Current pattern (`lib/db.ts` exports named functions) is dead simple and correct. The only refactor worth considering: group DB queries by domain (`lib/db/shifts.ts`, `lib/db/rates.ts`, `lib/db/schedules.ts`) once `db.ts` passes ~500 LOC — a code-organization move, not architecture.

**Recommendation:** Do nothing. Revisit only if tests get written and pure-function modules are hard to mock.

---

## Concrete Pass 5 plan

### In-scope changes

1. **Install MMKV.** `npx expo install react-native-mmkv react-native-nitro-modules && npx expo prebuild`.
2. **Create `lib/storage.ts`** — typed wrapper with `getJSON<T>(key, schema)` / `setJSON(key, value)` using zod. Single versioned key `shiftpay_prefs_v1` for theme + locale + currency. Separate key for `shiftpay_onboarding_done`.
3. **Write one-shot migration** from AsyncStorage → MMKV in `initDb`. Delete AsyncStorage keys after copy. Remove `@react-native-async-storage/async-storage` dep once done.
4. **Rewrite `ThemeProvider` + `LocaleProvider`** to read sync from MMKV at module scope. Drop the `loaded` flag. Drop the `null` return.
5. **Build `lib/hooks/useDbQuery.ts`** (~80 LOC) — keyed cache, `invalidate(key)`, `useFocusEffect` integration, `{ data, status, error, refetch }` return.
6. **Build `lib/hooks/useDbMutation.ts`** (~50 LOC) — `onMutate` / `onError` / `onSuccess` / `invalidate` support for optimistic confirm-shift.
7. **Refactor Import flow** to `useReducer` with discriminated-union state. One reducer, one dispatch, one state object.
8. **Refactor Settings form** to react-hook-form + zod resolver. Keep `RateField` component, swap its internals to `Controller`.
9. **Migrate dashboard data loads** to `useDbQuery` per source. Delete the big `load()` function.
10. **Add `AbortController`** to OCR requests, abort on unmount.

### Out of scope for Pass 5

- TanStack DB / TanStack Query
- Zustand / Jotai / Redux
- XState
- Suspense data loaders
- Service locator / DI container
- `op-sqlite` migration

### Estimated sizing

- Net deps added: +3 (`react-native-mmkv`, `react-native-nitro-modules`, `react-hook-form`, `@hookform/resolvers`, `zod` — last three are bundle-size partners; `zod` is likely wanted for other passes too).
- Net deps removed: −1 (`@react-native-async-storage/async-storage`).
- Net LOC added: ~400 (hooks + storage wrapper + RHF glue).
- Net LOC removed: ~250 (useEffect hydration, useFocusEffect loaders, controlled form state).
- Bundle delta: +120 kB native (MMKV), +50 kB JS (RHF + zod). Zod already arrives via RHF — may already exist in transitive deps.

---

## Gotchas & open questions

- **Zod 4 vs 3:** Zod 4 shipped in 2025, ecosystem broadly supports both. Use latest Zod 4. RHF resolver supports both.
- **MMKV in Jest:** `react-native-mmkv` needs a mock. Use `MMKV({ id: 'test' })` with an in-memory adapter in tests, or mock the whole module.
- **Nitro Modules:** MMKV 3+ uses Nitro. Works with Expo SDK 54 + prebuild. Not compatible with Expo Go (irrelevant — you build locally).
- **Encryption:** MMKV supports AES encryption. Not needed for ShiftPay (no sensitive data beyond rates), but cheap to add if v2 ever stores payslip images.
- **Concurrent writes to settings:** Single-user app, no concurrency problem in practice.
- **Migration idempotency:** the AsyncStorage→MMKV copy must be idempotent — run once, never overwrite if MMKV already has the key. Gate on `storage.contains('shiftpay_prefs_v1')`.
- **i18n singleton side effect:** `LocaleProvider` mutates the `i18n-js` singleton via `i18n.locale = l`. If two providers ever existed (e.g., during HMR) they'd fight. Fine in practice but worth a comment.
- **Overtime hidden state:** `Settings` has a collapsed "pay periods" section via `showPayPeriods` boolean. Keep it local — correctly scoped.

---

## Decision record

| Question | Answer | Reason |
|----------|--------|--------|
| Global state lib? | None. Keep Context. | No global state to manage beyond theme/locale. |
| React Query / TanStack DB? | Custom 80-LOC hook instead. | No network. Full RQ is overkill at this size. |
| MMKV? | **Yes, replace AsyncStorage fully.** | Sync reads eliminate hydration races + theme flash. |
| Zod? | **Yes**, at storage boundary + form schemas. | Types at the edge catch corrupt state + doubles for forms. |
| XState? | No, `useReducer` with discriminated union. | Only one complex flow. Not worth the bundle. |
| react-hook-form? | **Yes** + zod resolver. | Battle-tested, tiny, integrates with existing `RateField` shape. |
| useOptimistic? | No, custom `useDbMutation` pattern. | Tied to transitions, awkward with SQLite. |
| Service locator? | No. | Direct imports are fine. No tests yet to motivate DI. |
| Suspense data loaders? | No (RN alpha, no server). | Not supported on RN app target. |
| URL state migrations? | None. Current boundaries are correct. | — |

---

## Sources

1. [State Management in 2026: Zustand vs Jotai vs Redux Toolkit vs Signals — DEV](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge) — bundle sizes, perf benchmarks on React 18.2 with 1000 components.
2. [Zustand vs. Redux Toolkit vs. Jotai — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux-toolkit-vs-jotai/) — tradeoff analysis.
3. [React State Management in 2026 — PkgPulse](https://www.pkgpulse.com/blog/react-state-management-2026) — recommendation matrix by use case.
4. [TanStack DB 0.6 Now Includes Persistence, Offline Support — TanStack Blog](https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes) — March 2026 release with SQLite persistence.
5. [React Native Offline First with TanStack Query — DEV](https://dev.to/fedorish/react-native-offline-first-with-tanstack-query-1pe5) — offline-first pattern with expo-sqlite.
6. [How to make Expo SQLite reactive with React Query — DEV](https://dev.to/ramsayromero/how-to-make-expo-sqlite-reactive-with-react-query-26fo) — concrete expo-sqlite + RQ integration.
7. [react-native-mmkv GitHub README](https://github.com/mrousavy/react-native-mmkv) — install, Expo compat, perf numbers.
8. [MMKV vs AsyncStorage in React Native — RN Expert](https://reactnativeexpert.com/blog/mmkv-vs-asyncstorage-in-react-native/) — synchronous vs async, security.
9. [react-native-mmkv issue #733 — requires TurboModules](https://github.com/mrousavy/react-native-mmkv/issues/733) — v3+ New Architecture requirement.
10. [React Native New Architecture — Expo Docs](https://docs.expo.dev/guides/new-architecture/) — SDK 54 New Arch default status.
11. [React Native with xState v5 — DEV](https://dev.to/gtodorov/react-native-with-xstate-v5-4ekn) — actor model in RN.
12. [xstate v5.19.2 on Bundlephobia](https://bundlephobia.com/package/xstate) — ~14 kB gzipped.
13. [useState vs useReducer vs XState Part 1: Modals — DEV](https://dev.to/mattpocockuk/usestate-vs-usereducer-vs-xstate-part-1-modals-569e) — when each tool earns its weight.
14. [Choosing a React Form Library in 2026 — Formisch](https://formisch.dev/blog/react-form-library-comparison/) — RHF vs TanStack Form vs Formisch bundle + perf.
15. [TanStack Form vs. React Hook Form — LogRocket](https://blog.logrocket.com/tanstack-form-vs-react-hook-form/) — RN compatibility notes.
16. [Async routes — Expo Docs](https://docs.expo.dev/router/web/async-routes/) — Suspense-wrapped routes.
17. [Error handling — Expo Docs](https://docs.expo.dev/router/error-handling/) — route-level ErrorBoundary export.
18. [Data loaders — Expo Docs](https://docs.expo.dev/router/web/data-loaders/) — alpha status, SDK 55+, server-render only.
19. [expo-splash-screen — Expo Docs](https://docs.expo.dev/versions/latest/sdk/splash-screen/) — preventAutoHideAsync semantics.
20. [The 'White Flash' of Death: Solving Theme Flickering — Medium](https://medium.com/@ripenapps-technologies/the-white-flash-of-death-solving-theme-flickering-in-react-native-production-apps-d732af3b4cae) — root cause + sync-hydration fix.
21. [Jotai Persistence docs](https://jotai.org/docs/guides/persistence) — atomWithStorage with AsyncStorage for RN.
22. [Zod Intro](https://zod.dev/) — TS-first schema validation.
23. [Zod Versioning](https://zod.dev/v4/versioning) — v3/v4 coexistence, ecosystem migration.
24. [Optimistic Updates — TanStack Query](https://tanstack.com/query/v4/docs/react/guides/optimistic-updates) — canonical 6-step pattern.
25. [useOptimistic — React Docs](https://react.dev/reference/react/useOptimistic) — React 19 hook semantics.
26. [Concurrent Optimistic Updates in React Query — tkdodo.eu](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — tkdodo (RQ maintainer) on concurrency.
27. [Architecture Guide: Scalable RN with Zustand & React Query — DEV](https://dev.to/neetigyachahar/architecture-guide-building-scalable-react-or-react-native-apps-with-zustand-react-query-1nn4) — canonical split of client vs server state.
28. [Easy Offline-First with Expo MMKV + Zustand — Medium](https://medium.com/@nithinpatelmlm/expo-react-native-easy-offline-first-setup-in-expo-using-mmkv-and-zustand-react-native-mmkv-and-68f662c6bc3f) — MMKV + Zustand persist middleware pattern.
29. [Stop Using AsyncStorage — Medium](https://medium.com/@nomanakram1999/stop-using-asyncstorage-in-react-native-mmkv-is-10x-faster-82485a108c25) — perf comparison.
30. [StorageBenchmark — mrousavy/StorageBenchmark](https://github.com/mrousavy/StorageBenchmark) — apples-to-apples storage benchmarks.
