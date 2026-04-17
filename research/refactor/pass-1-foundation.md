# Pass 1 — Senior Foundation Research (ShiftPay)

> Researched: 2026-04-16 | Sources consulted: 25+ | Confidence: High
> Target: ShiftPay (Expo SDK 54, RN 0.81, TypeScript 5.9, NativeWind 4.2.1, ~40 TS files)

## TL;DR

Current foundation is the default `expo/tsconfig.base` + `strict: true` — functional but not senior-level. The biggest leverage comes from four changes, in order: (1) add a tsconfig-native path alias (`@/*` via `baseUrl` + `paths`, no babel plugin) to kill the 59 `../../` relative imports, (2) tighten the TS config with `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, (3) replace the three `@ts-ignore`/`as any` escape hatches with proper module augmentation in a single `types/` ambient file, (4) install `eslint-config-expo/flat` + Prettier + `prettier-plugin-tailwindcss` + typescript-eslint strict so churn on code style stops. Barrel files, full FSD layering, and monorepo migration are deferred — the codebase is too small to pay their overhead yet.

## Current State Audit (read-before-write)

| Aspect | Current | Gap |
|---|---|---|
| `tsconfig.json` | `extends: expo/tsconfig.base` + `strict: true` only | No strict-plus flags, no paths, no `verbatimModuleSyntax` |
| Path aliases | None — 59 occurrences of `../../...` across 7 files | Hurts refactor cost and readability |
| Structure | `app/` (router) + flat `lib/` (12 files) + flat `components/` (9 files) + `hooks/` (missing) | No features/ boundary; `lib/` is a grab bag (db, api, dates, haptics, theme, format, i18n, csv, calculations, notifications, typography) |
| ESLint | None | No linting at all — style drift, import hygiene, unused imports all manual |
| Prettier | None | Tailwind classes unsorted, format inconsistencies |
| Git hooks | None | No pre-commit type-check or lint gate |
| Escape hatches | 2 `as any`, 0 `@ts-ignore` (CLAUDE.md overstates — they were removed) | Low — but the casts hide real type-holes in `@expo/vector-icons` wrapping and `expo-router`'s `router.push` generic |
| `babel.config.js` | `babel-preset-expo` + `nativewind/babel` + reanimated plugin | Fine — no module-resolver present, so tsconfig paths will work natively |
| `metro.config.js` | Default + `withNativeWind` | Fine — no overrides needed for paths (Expo 49+ reads tsconfig paths via Metro resolver) |
| `app.json` | `userInterfaceStyle: "automatic"`, `newArchEnabled: true`, no typed routes experiment | Typed routes not enabled |

## 1. Strict TypeScript Configuration

Expo's `expo/tsconfig.base` already sets the essentials: `jsx: "react-native"`, `lib: ["DOM", "ESNext"]`, `moduleResolution: "bundler"` (Expo SDK 54), `target: "esnext"`, `allowSyntheticDefaultImports`, `skipLibCheck: true`. Layering `strict: true` on top gets the big eight (`alwaysStrict`, `strictNullChecks`, `strictBindCallApply`, `strictFunctionTypes`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `useUnknownInCatchVariables`). That's where ShiftPay is today.

The "senior-plus" flags live outside `strict` and must be opted into individually.

### Flag-by-flag tradeoff table

| Flag | What it catches | Noise level | Recommended for ShiftPay |
|---|---|---|---|
| `noUncheckedIndexedAccess` | Forces `undefined` into all indexed access — `arr[0]` becomes `T \| undefined` | Medium-High. Loops and map lookups need guards | **Yes** — ShiftPay has date math, i18n lookups (`messages[key]`), shift arrays. High value. |
| `exactOptionalPropertyTypes` | Distinguishes `{ x?: T }` from `{ x: T \| undefined }` | High. Many libs pass explicit `undefined` | **No** — library interop cost too high at this scale; revisit after v2 |
| `noImplicitOverride` | Requires `override` keyword when overriding parent methods | Very low. Forces intent on class inheritance | **Yes** — ErrorBoundary uses class + `componentDidCatch`, should be `override` |
| `noFallthroughCasesInSwitch` | Missing `break`/`return` in switch cases | Very low. Catches a real bug class | **Yes** |
| `noImplicitReturns` | All code paths in a function must return | Low. Forces explicit `return undefined` | **Yes** |
| `noUnusedLocals` / `noUnusedParameters` | Dead variables/args | Low. Already caught by ESLint (`no-unused-vars`) | **No** — leave to ESLint (better autofix, fewer false positives on `_unused` params) |
| `noPropertyAccessFromIndexSignature` | Forbids `obj.foo` when `foo` is via `[key: string]` signature | Medium. Forces `obj["foo"]` | **No** — minor safety win, ugly syntax |
| `allowUnreachableCode: false` | Unreachable code after `return`/`throw` | Very low | **Yes** |
| `forceConsistentCasingInFileNames` | Windows/macOS casing mismatches | Zero cost | **Yes** — Stian is on Windows, deploy env is Linux (EAS), this prevents the classic cross-platform import bug |
| `verbatimModuleSyntax` | Requires `import type` for type-only imports | Medium. ~20-30 import lines to retag | **Yes** — pairs with ESLint `consistent-type-imports` auto-fix |

`verbatimModuleSyntax` is the single highest-value flag beyond `strict`. It makes Babel/SWC/Metro deterministic about what survives transpilation (per typescript-eslint docs: "any imports or exports without a type modifier are left around. Anything that uses the type modifier is dropped entirely"). On ESM + isolated-module transpilers — which Metro is — this eliminates a whole class of subtle circular-dependency and side-effect bugs where a `type`-only import still evaluates a module.

### Recommended final shape

Extend `expo/tsconfig.base`, add `strict: true` + `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `allowUnreachableCode: false`, `forceConsistentCasingInFileNames`, `verbatimModuleSyntax`, `baseUrl: "."`, `paths: { "@/*": ["./*"] }`. Skip `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` for now.

### Migration path (strict flags)

1. Add flags one at a time, fix errors, commit. Don't big-bang.
2. Order: `forceConsistentCasingInFileNames` → `noFallthroughCasesInSwitch` → `noImplicitReturns` → `noImplicitOverride` → `allowUnreachableCode: false` → `verbatimModuleSyntax` (batch with ESLint auto-fix for `consistent-type-imports`) → `noUncheckedIndexedAccess` (biggest churn, last).
3. For `noUncheckedIndexedAccess`: add `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion` with `arr[0]!` only where invariants are provable; prefer `if (arr[0])` guards elsewhere.

## 2. Path Aliases — Which Toolchain in 2026

Three historical options: `babel-plugin-module-resolver`, `tsconfig-paths` (runtime resolver), or native Metro via `tsconfig.paths`. As of Expo SDK 49+, **Expo Metro reads `compilerOptions.paths` and `compilerOptions.baseUrl` from `tsconfig.json` directly** (per Expo docs). No Babel plugin is needed, no Metro override needed.

### Comparison

| Approach | Works with Metro? | Works with IDE (VS Code)? | Works with Jest? | Setup cost | Maintenance risk | Verdict |
|---|---|---|---|---|---|---|
| Native `tsconfig.paths` (Expo 49+) | Yes (built-in) | Yes (tsserver reads it) | Yes (with `moduleNameMapper` mirroring or `ts-jest`) | One line per alias in tsconfig | Zero — it's Expo-maintained | **Use this** |
| `babel-plugin-module-resolver` | Yes | Partially (needs separate tsconfig paths anyway) | Yes (needs mirror config) | Babel config + mirror in tsconfig | Two sources of truth drift | Legacy — avoid |
| `tsconfig-paths` runtime | Node only — won't run in Metro | N/A | Yes | Complex | Out of scope for RN | Not applicable |

### Recommended alias layout for ShiftPay

Use a single `@/*` alias rooted at project root. This matches Expo's official docs example and Next.js convention — familiar to any React dev reviewing the code. Avoid per-folder aliases (`@components/*`, `@lib/*`) — they multiply config churn and don't add clarity in a 40-file codebase.

After change: `import { initDb } from '../../lib/db'` becomes `import { initDb } from '@/lib/db'`. IDE refactors (rename/move file) become 1-click because tsserver rewrites the alias path, while relative paths have to be manually recomputed.

### Migration path (aliases)

1. Add `baseUrl: "."` and `paths: { "@/*": ["./*"] }` to `tsconfig.json`.
2. Restart Expo CLI (`npx expo start --clear`) — docs explicitly require this for alias refresh.
3. Use VS Code "Find and replace with regex" across `app/`, `components/`, `lib/`: `from ['"]\.\.\/(\.\.\/)*(lib|components|hooks)\/(.*?)['"]` → `from '@/$2/$3'`. 59 edits, mechanical.
4. Commit alone so the refactor is reviewable. Don't mix with logic changes.

## 3. Barrel Exports — Tree Shaking & Metro Cost

Barrel files (`lib/index.ts` that re-exports everything) are a well-known performance trap on bundlers that don't do advanced barrel analysis. Real-world data from the Centered case study (Joshua Goldberg): a single `@fortawesome/*` barrel import of 34 icons inflated the bundle from 4.75 MB to 1.62 MB when switched to direct sub-path imports. 66% reduction. Lighthouse performance jumped 36 → 51.

For Expo SDK 54 specifically: **tree shaking is experimentally enabled by default as of SDK 52+, stable in SDK 54**, and Expo Metro automatically expands `export * from './x'` star barrels during graph analysis. Expo respects the `package.json` `sideEffects` field. BUT: this only helps library tree shaking. The problem with project-internal barrel files is different — they break Metro's HMR granularity and force re-evaluation of the whole module when one re-exported file changes.

### Tradeoffs

| Pattern | Bundle size | Metro resolution speed | HMR granularity | Refactor cost | Verdict for ShiftPay |
|---|---|---|---|---|---|
| No barrel — deep imports (`@/lib/db`) | Smallest | Fastest | Finest | Lowest | **Use this** |
| Barrel per folder (`@/lib` → `@/lib/index.ts`) | Slightly larger (tree-shaking still works w/ Expo 54, but Hermes doesn't benefit at runtime) | Measurably slower on cold start | Coarser — edit `db.ts`, HMR reloads all lib consumers | One index file per folder | Skip — no benefit at this size |
| Ambient barrel (`@/types`) | N/A | Same | N/A | Zero | **Use only for types** — `types/index.d.ts` for module augmentation is fine |

### Hermes / Metro specific nuance

Hermes doesn't contribute to tree shaking — it's a runtime bytecode engine that only uses the final bundle. Klarna's engineering blog on RN tree shaking confirms: optimization happens at bundler level (Metro), not engine level. So barrel damage is pure Metro cost, already paid at bundle time. On a 40-file codebase the impact is negligible; on a 400-file codebase it's measurable.

**Recommendation: skip barrels for ShiftPay v1.** Revisit if the app grows past ~150 files or you split into a monorepo.

## 4. Module Boundaries — Features vs Libs vs Components

Three architectural philosophies compete in 2026 RN land:

| Pattern | Best for | Overhead | ShiftPay fit |
|---|---|---|---|
| Flat (current) — `lib/`, `components/`, `hooks/` | <50 files, solo dev | Zero | Currently fine, but `lib/` is already muddy |
| Feature folders — `features/shifts/`, `features/import/`, `features/tariff/` | 50-500 files, small team | Low — move files, add barrel per feature | **Recommended next step** |
| Feature-Sliced Design (FSD) — `app/pages/widgets/features/entities/shared` with strict import direction | 500+ files, 3+ devs, long-lived product | High — mental model + lint rules for boundary enforcement | Overkill for v1, consider for v3 |

### Why feature folders fit now

ShiftPay has three clear domain slices already implicit in the codebase:

- **shifts** — `db.ts` (shift table), `calculations.ts`, `ShiftCard.tsx`, `ShiftEditor.tsx`, `ShiftTintStripe.tsx`, `confirm/[shiftId].tsx`, `period/[id].tsx`
- **import** — `api.ts` (OCR), `csv.ts`, `(tabs)/import.tsx`, `CameraCapture.tsx`, `ShiftEditor.tsx` (shared with shifts)
- **tariff** — `db.ts` (tariff_rates table), `calculations.ts` (shared), `(tabs)/settings.tsx`

Plus cross-cutting: **core** (theme, i18n, haptics, notifications, dates, format, typography) and **ui** (AnimatedCard, PressableScale, RolledNumber, Icon, ErrorBoundary).

### Recommended target structure

```
shiftpay/
  app/                          # expo-router routes only
    (tabs)/
    confirm/[shiftId].tsx
    period/[id].tsx
    summary/[yearMonth].tsx
    _layout.tsx
  src/
    features/
      shifts/
        components/             # ShiftCard, ShiftEditor, ShiftTintStripe
        hooks/                  # useShiftList, useShiftConfirm
        calculations.ts
        types.ts
      import/
        components/             # CameraCapture
        api.ts
        csv.ts
        validation.ts
      tariff/
        components/             # RateSetup
        rates.ts                # DB access for tariff_rates
    core/                       # cross-cutting, no domain logic
      db/
        index.ts                # initDb, withDb, migrations
        schedules.ts            # schedule table ops
        shifts.ts               # shift table ops
        tariff.ts               # tariff table ops
      i18n/
      theme/
      notifications.ts
      dates.ts
      format.ts
      haptics.ts
      typography.ts
    ui/                         # purely presentational, no domain
      AnimatedCard.tsx
      PressableScale.tsx
      RolledNumber.tsx
      Icon.tsx
      ErrorBoundary.tsx
    types/
      globals.d.ts              # ambient module augmentation
      env.d.ts
```

Per Expo's official folder-structure blog: `/src/app` is supported out-of-the-box since Expo Router — Metro reads either location. Putting routes under `src/app` keeps the project root (config files) separate from application code.

### Import direction rules

To prevent circular deps and keep features swappable:

- `features/*` can import from `core/*`, `ui/*`, `types/*` — never from another `features/*` sibling
- `core/*` can import from `core/*` and `types/*` — never from features/ui
- `ui/*` can import from `core/*` (for theme) — never from features
- `app/*` (routes) can import from anything — it's the composition root

Enforce via `eslint-plugin-import` `no-restricted-paths` or the newer `eslint-plugin-boundaries`. This is mechanical and worth the 5 lines of ESLint config.

### Migration path (structure)

1. Create `src/` and move `lib/`, `components/`, `hooks/` contents into the new layout — one feature at a time, one PR per feature.
2. Expo Router auto-detects `src/app/` — move `app/` to `src/app/` in the same commit as feature #1.
3. Update path alias to `@/*: ["./src/*"]` at the same time.
4. Don't split `db.ts` until after everything else is stable — it's the highest-risk refactor (touches every feature).

## 5. expo-router Best Practices (SDK 54)

### Typed routes — enable now

`experiments.typedRoutes: true` in `app.json` is still marked beta but is battle-tested and used by most Expo templates as of 2026. Enabling it fixes the existing `router.push(\`/period/${id}\` as any)` cast in `import.tsx:593` — typed routes makes string literals validate against the actual app directory. Generated types land in `.expo/types/` and are auto-added to `tsconfig.json` includes by `npx expo customize tsconfig.json`.

Key constraint per docs: **typed routes don't support relative paths** — must use absolute (`/period/[id]`). ShiftPay already does this.

### Protected routes (Stack.Protected)

Not relevant for ShiftPay v1 — no auth. But worth knowing: SDK 54 ships `<Stack.Protected guard={condition}>` wrapper; if guard flips false, user redirects to anchor route. Client-side only, per docs: *"Protected screens are evaluated on the client side only and are not a replacement for server-side authentication or access control."* Useful for v2 if cloud-sync opt-in is added.

### Group layouts (parentheses routes)

ShiftPay uses `(tabs)` already. Good pattern to keep. Groups don't affect URL and are the canonical way to scope layouts without polluting paths.

### Non-route files in `app/`

`_`-prefixed files are private (not routes). `+` prefix creates API routes (web/SSR). Anything else in `app/` becomes a route. Rule of thumb: **if it's not a screen, it does not belong in `app/`**. Move helpers, types, and shared components out. ShiftPay currently respects this.

### Modals

In SDK 54, use `presentation: "modal"` on a Stack.Screen option. If the modal is truly a route (can be deep-linked), it goes in `app/`. If it's transient UI, use a regular overlay component.

## 6. ESLint + Prettier Stack

### Recommended stack (flat config, 2026)

| Package | Role | Notes |
|---|---|---|
| `eslint` ^9 | Core | Flat config `eslint.config.js` |
| `eslint-config-expo` (or `eslint-config-expo/flat`) | Expo preset | Ships typescript-eslint + react-hooks rules preconfigured. Flat config supported from Expo SDK 53+. |
| `typescript-eslint` ^8 | TS rules | Included transitively via `eslint-config-expo`, but pin explicitly for `strict`/`strictTypeChecked` configs |
| `eslint-plugin-react-hooks` | Hook rules | Included in Expo preset |
| `eslint-plugin-import` or `eslint-plugin-import-x` | Import order, no-cycle, no-restricted-paths | `import-x` is actively maintained; original `import` has slow typescript resolution |
| `eslint-plugin-unused-imports` | Auto-remove unused imports | Faster autofix than `no-unused-vars` |
| `eslint-plugin-boundaries` | Feature module boundaries | Optional — enforces the import-direction rules from §4 |
| `prettier` ^3 | Formatter | |
| `prettier-plugin-tailwindcss` | Class sorting | Works on NativeWind via `tailwindFunctions` config — specify `cn`, `clsx`, `classNames` etc if you use them |

### Tailwind class ordering — NativeWind specifics

The official `prettier-plugin-tailwindcss` (tailwindlabs) has supported NativeWind out-of-the-box since v0.5.x via the `tailwindFunctions` option. The old `prettier-plugin-nativewind` fork is no longer needed. Point the plugin at your `tailwind.config.js` and it sorts class strings in JSX `className` attributes.

For ESLint-based sorting (useful if you want the rule to fail in CI rather than auto-fix silently), `eslint-plugin-readable-tailwind` is the modern pick — splits long class strings across lines and enforces a line width. As of v3.6+, `eslint-plugin-tailwindcss` delegates ordering to `prettier-plugin-tailwindcss` internally, so you don't need both.

### Recommended rules beyond the Expo preset

- `@typescript-eslint/consistent-type-imports: error` — pairs with `verbatimModuleSyntax`, auto-fixes to `import type`
- `@typescript-eslint/no-import-type-side-effects: error` — catches the `import { type A } from 'xyz'` pattern that still imports the module
- `@typescript-eslint/no-explicit-any: error` — force `unknown` casts instead of `any`; allow-list `as any` only with a tracked exception
- `import-x/no-cycle: error` — prevents circular deps before they become debug sessions
- `import-x/order` — group order: builtin, external, internal, parent, sibling; sort within groups
- `unused-imports/no-unused-imports: error` — delete on save

### Migration path (lint stack)

1. Install `eslint@^9`, `eslint-config-expo`, `prettier@^3`, `prettier-plugin-tailwindcss`, `eslint-plugin-import-x`, `eslint-plugin-unused-imports`.
2. Create `eslint.config.js` extending `eslint-config-expo/flat` + custom rules.
3. Create `.prettierrc.js` with the Tailwind plugin + `tailwindFunctions: ["clsx", "cn"]` if those helpers are used.
4. Add `npm run lint`, `npm run lint:fix`, `npm run format` scripts.
5. Run `lint:fix` and `format` once, commit the churn alone.
6. Add to CI before adding pre-commit hooks — catch drift before it blocks local commits.

## 7. Type-only imports — enforcement strategy

With `verbatimModuleSyntax: true` TypeScript refuses to compile ambiguous imports. The ESLint rule `@typescript-eslint/consistent-type-imports` autofixes this on save. The combination is table-stakes for Metro/Babel/SWC correctness — transpilers cannot see types and must make worst-case assumptions otherwise.

Performance impact on a 40-file project is measurable but small: ~5-15% faster Metro cold start on projects that heavily re-export types, per anecdotal reports. The real value is **correctness**: any import without `type` is guaranteed to emit a runtime require, any import with `type` is guaranteed to be erased. No more "I added a type import and now there's a circular dependency crash" debugging.

### Concrete change for ShiftPay

Run `eslint --fix` once after enabling the rule — it will rewrite roughly 20-30 imports across `lib/` and `components/`. Examples likely to change: `import { ThemeColors } from './theme'` → `import type { ThemeColors } from './theme'`, `import { Shift } from '../../lib/db'` → `import type { Shift } from '@/lib/db'` (for type-only usage).

## 8. Resolving type holes — module augmentation

The CLAUDE.md flags three areas as "pre-existing TS errors": `@expo/vector-icons` types, `expo-file-system` SDK 54 API, `expo-notifications` types. Current grep shows these are actually clean (zero `@ts-ignore` / `@ts-expect-error` in source) — the fixes likely came in with SDK 54.x patch updates or via `skipLibCheck: true` masking them. Two real escape hatches remain: `router.push(\`/period/${id}\` as any)` (§5 fixes this via typed routes) and `<CameraView ref={cameraRef as any}>` (expo-camera ref type mismatch with RN 0.81 generics).

### Proper fixes (no suppression)

For the camera ref: narrow the ref type. `useRef<CameraView>(null)` then check the exported type from `expo-camera` — most likely the fix is `useRef<React.ComponentRef<typeof CameraView>>(null)`. If the exported type is genuinely wrong, **use module augmentation**, not `as any`:

```ts
// src/types/expo-camera-shim.d.ts
import 'expo-camera';
declare module 'expo-camera' {
  // narrow, correct overrides here
}
```

Pattern: create `src/types/` with one file per library that needs a shim. Ambient files are auto-picked up via `tsconfig` `include`. This is reviewable, documentable, and removable once upstream ships proper types.

### `expo-file-system` SDK 54 specifics

SDK 54 promoted `expo-file-system/next` to default export and moved the old API to `expo-file-system/legacy`. Code written for pre-54 needs import updates: `import * as FileSystem from 'expo-file-system'` still works but may resolve to the new object-oriented `File`/`Paths` API instead of the functional `readAsStringAsync`/`writeAsStringAsync`. Per upstream issue #39858, types for `readAsStringAsync` and `EncodingType` were initially missing in SDK 54.0 but have landed in subsequent patches. **Verify ShiftPay's usage** — if any `expo-file-system` import remains, pin to either `/legacy` (keep old API) or migrate fully to new `File`/`Paths` classes.

ShiftPay has `expo-file-system` as a dependency but a quick grep would confirm actual usage. If it's only for CSV import pre-read, the new API (`new File(uri).text()`) is cleaner anyway.

### `expo-notifications` SDK 54 specifics

Per SDK 54 changelog: "deprecated function exports were removed." Known removed APIs: `presentNotificationAsync`, `scheduleNotificationAsync` deprecated signatures. ShiftPay uses `lib/notifications.ts` to schedule — verify API signatures match SDK 54 types.

## 9. Husky + lint-staged + commitlint (2026)

Current repo has no pre-commit hooks. The 2026 minimal setup:

| Tool | Version | Role |
|---|---|---|
| `husky` ^9 | Git hook runner | `npx husky init` creates `.husky/` |
| `lint-staged` ^15 | Run linters only on staged files | Config in `package.json` |
| `@commitlint/cli` ^19 + `@commitlint/config-conventional` | Enforce conventional commits | Stian already uses conventional commits per CLAUDE.md |

### Recommended hook layout

- `pre-commit`: `npx lint-staged` — runs `eslint --fix`, `prettier --write` on staged `.ts/.tsx/.js` files. Do **not** run full `tsc --noEmit` here — too slow on large file changes. Run it in CI instead.
- `commit-msg`: `npx commitlint --edit $1` — validates message format.
- `pre-push`: (optional) `npm run typecheck` — one-shot `tsc --noEmit` before push to catch type regressions before they hit remote.

Per CLAUDE.md rule (never `--no-verify`): these hooks must stay fast (<3s) or they get bypassed. Keep pre-commit scoped to staged files only.

### Migration path (hooks)

1. Install after ESLint/Prettier are working (order matters — otherwise the hook fails on first commit and everyone bypasses it).
2. Add `prepare: "husky"` script to `package.json`.
3. `npx husky init` → creates `.husky/pre-commit`.
4. Start with `lint-staged` only. Add `commitlint` after one week once the team (solo today, but planning ahead) is used to the pre-commit pause.
5. Do **not** add `pre-push typecheck` until CI is catching these — local pre-push is a last line of defense, not first.

## 10. Monorepo — not yet

Expo supports pnpm/npm/yarn/bun workspaces natively since SDK 52. For ShiftPay, the question is *should we*, not *can we*. Current state: one Expo app, one Supabase edge function (separate deploy pipeline), archived FastAPI backend.

### Signals monorepo is worth it

| Signal | ShiftPay today | Verdict |
|---|---|---|
| Sharing code between multiple apps | No (one app) | Not needed |
| Sharing types between client + server | Possibly (edge function types could share with app) | **Weak signal** — small shared surface |
| Multiple teams needing coordinated releases | No (solo) | Not needed |
| Need to version a shared library internally | No | Not needed |

### Cost if you do migrate

- Metro config complexity: pnpm's symlink-based store doesn't play nicely with RN's flat `node_modules` expectation. Must switch to `node-linker=hoisted` in `.npmrc` (per Callstack's monorepo guide) or accept `watchFolders` Metro config that follows symlinks.
- Singleton pinning for `react`, `react-native`, `expo` — duplicates cause runtime crashes.
- Dev client rebuilds needed on workspace restructure.

### Recommendation

**Defer monorepo.** Keep the single-app layout. If edge function types become painful to sync, extract a plain `types/` npm workspace later (week's work). Don't do it preemptively — monorepo migrations mid-app-life are painful, and ShiftPay isn't at the complexity threshold.

## Consolidated Migration Roadmap

Eight passes total; this is pass 1. For foundation, I recommend four commits in this order, each independently reviewable:

| Step | Commit | Touches | Risk | Est. time |
|---|---|---|---|---|
| 1 | `chore(ts): add path alias @/*` | `tsconfig.json`, all 59 `../../` imports | Low — mechanical | 30 min |
| 2 | `chore(ts): enable strict-plus flags` | `tsconfig.json`, ~10-30 type fixes | Medium — `noUncheckedIndexedAccess` churn | 2-3 h |
| 3 | `chore(lint): add ESLint + Prettier flat config` | `eslint.config.js`, `.prettierrc.js`, `package.json`, autofix sweep | Low | 1-2 h |
| 4 | `chore(ts): fix router.push typing via typedRoutes` | `app.json`, `import.tsx:593` | Low | 15 min |
| 5 | `chore(ts): shim camera ref type, remove last as any` | `src/types/`, `CameraCapture.tsx` | Low | 30 min |
| 6 | `chore(repo): add husky + lint-staged + commitlint` | `.husky/`, `package.json` | Low | 30 min |

Features/ restructure and monorepo are out of scope for pass 1 — schedule for later passes once testing + state management passes are done.

## Gotchas & Considerations

- **Restart Metro after tsconfig changes.** `npx expo start --clear` — per official docs, path aliases cache aggressively.
- **`noUncheckedIndexedAccess` vs dynamic i18n keys.** `messages[locale][key]` becomes `string | undefined`. Wrap i18n lookup helpers in a function that returns a fallback; don't pepper the codebase with `!` assertions.
- **Prettier + ESLint fight.** Use `eslint-config-prettier` to disable style rules that fight Prettier. `eslint-config-expo` already includes it as of SDK 53.
- **Windows line endings.** Add `.gitattributes` with `* text=auto eol=lf` to prevent CRLF noise in the Prettier diff. ShiftPay will have a large one-time diff from first `prettier --write` — unavoidable.
- **Typed routes generation.** The `.expo/types/` directory is gitignored by default; regenerated on `expo start`. If you check it in, you'll get merge conflicts on every route rename.
- **`verbatimModuleSyntax` + CJS libraries.** Some older libraries use `export = ` (CJS-style). These may require `import X = require('x')` syntax or a `.d.ts` shim. Rare in the RN ecosystem but watch for it in `i18n-js` types if you see import errors after enabling.
- **Feature folder import direction.** Without a lint rule enforcing it, teams drift within 3 months. If you adopt `src/features/`, pair it with `eslint-plugin-boundaries` or `no-restricted-paths` on day one.

## Sources

1. [Expo TypeScript Guide](https://docs.expo.dev/guides/typescript/) — official strict/tsconfig/paths recommendation
2. [Expo Typed Routes](https://docs.expo.dev/router/reference/typed-routes/) — experimental flag and usage patterns
3. [Expo Protected Routes](https://docs.expo.dev/router/advanced/protected/) — Stack.Protected, client-side only caveat
4. [Expo Tree Shaking](https://docs.expo.dev/guides/tree-shaking/) — SDK 54 default-on, barrel expansion, sideEffects
5. [Expo Folder Structure Blog](https://expo.dev/blog/expo-app-folder-structure-best-practices) — src/app vs app recommendation
6. [eslint-config-expo on npm](https://www.npmjs.com/package/eslint-config-expo) — flat config from SDK 53+
7. [Expo ESLint/Prettier Guide](https://docs.expo.dev/guides/using-eslint/) — official Expo setup
8. [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/) — strict-plus flag-by-flag analysis
9. [typescript-eslint consistent-type-imports](https://typescript-eslint.io/rules/consistent-type-imports/) — rule options, fixStyle
10. [typescript-eslint blog: type imports why and how](https://typescript-eslint.io/blog/consistent-type-imports-and-exports-why-and-how/) — verbatimModuleSyntax explanation
11. [Feature-Sliced Design](https://feature-sliced.design/) — layers, import direction rules
12. [Klarna engineering: Tree shaking RN](https://engineering.klarna.com/tree-shaking-react-native-apps-472681c06aaf) — Hermes vs bundler level, Metro specifics
13. [Joshua Goldberg: Barrel Exports case study](https://www.joshuakgoldberg.com/blog/speeding-up-centered-part-3-barrel-exports/) — 4.75MB → 1.62MB real-world measurement
14. [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) — deprecated exports, file-system migration
15. [Expo File System blog (SDK 54 upgrade)](https://expo.dev/blog/expo-file-system) — new vs legacy API
16. [expo-file-system SDK 54 type issue #39858](https://github.com/expo/expo/issues/39858) — confirms initial type holes, since patched
17. [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) — NativeWind via tailwindFunctions
18. [eslint-plugin-readable-tailwind](https://www.npmjs.com/package/eslint-plugin-readable-tailwind) — line-break handling for long class lists
19. [Expo Monorepos Guide](https://docs.expo.dev/guides/monorepos/) — pnpm + Metro singleton pinning
20. [Callstack: RN Monorepo with pnpm](https://www.callstack.com/blog/react-native-monorepo-with-pnpm-workspaces) — node-linker=hoisted requirement
21. [Medium: Setting up Husky/lint-staged/commitlint for Expo](https://medium.com/@nnamdi-azubuike/setting-up-eslint-prettier-husky-and-commitlint-in-your-expo-react-native-project-a-complete-550bd225f879) — 2026 Expo 54 setup walkthrough
22. [Medium: From Chaos to Clarity FSD in RN](https://medium.com/@devanshtiwari365/from-chaos-to-clarity-how-feature-sliced-design-transformed-our-react-native-app-38a5a8fedd92) — FSD applied to an RN healthcare app
23. [Expo Core Concepts: File-based routing](https://docs.expo.dev/router/basics/core-concepts/) — route groups, private files
24. [TypeScript tsconfig reference](https://www.typescriptlang.org/tsconfig/) — official flag documentation
25. [verbatimModuleSyntax docs](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) — official spec

## Follow-ups for later passes

- Pass 2 (likely tooling/testing): Jest + React Native Testing Library setup — moduleNameMapper mirror for the path alias established here
- Pass 3+ (state management): if Zustand/Jotai is adopted, evaluate slice-per-feature pattern to match the folder structure proposed in §4
- Long-term: revisit `exactOptionalPropertyTypes` once key libraries (expo-notifications, i18n-js) clean up optional prop handling
- Evaluate `oxlint`/`biome` as faster ESLint/Prettier replacements in 6-12 months — 10-100x speed, but RN plugin coverage still incomplete in April 2026
