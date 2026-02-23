# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ShiftPay: shift worker payroll auditor app. Photo/CSV/manual import of timesheets, user-configured tariff rates, calculated expected pay vs actual payslip. All user data is local-only (expo-sqlite). OCR is stateless via Supabase Edge Function.

## Arbeidsregler

- **Produksjonsklart.** Ingen lokale workarounds; sikt mot deploy-klar kode.
- **Plan først.** Ikke start implementasjon uten godkjent plan med todos.
- **Beslutninger FØR endring.** Ved veivalg: presenter alternativer til brukeren.

## Commands

```bash
# Development
npm install
npx expo start                    # Metro bundler (connect via Expo Go or dev client)
npx expo run:android              # Build + install + start on Android device/emulator

# EAS builds (requires eas-cli)
eas build --profile development   # Dev client (internal distribution)
eas build --profile preview       # APK for testing (internal distribution)
eas build --profile production    # AAB for Play Store

# OCR Edge Function (from repo root)
supabase functions deploy ocr --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-... SHIFTPAY_API_KEY=<random-hex>
supabase functions serve ocr --env-file supabase/.env.local   # Local testing
```

No linter or test runner is configured. No test files exist yet.

## Architecture

### Data flow
1. **Import:** User takes photo (camera) or picks CSV/file → OCR endpoint or CSV parser → array of shifts
2. **Edit/Review:** User reviews/edits parsed shifts in ShiftTable before saving
3. **Save:** `insertScheduleWithShifts()` saves schedule + shifts in one transaction → notifications scheduled for each shift's end_time + 15 min
4. **Confirm:** At shift end, local notification deep-links to `confirm/[shiftId]` → user marks completed/missed/overtime
5. **Summary:** `summary/[yearMonth]` shows planned vs actual hours and expected pay

### Provider hierarchy (app/_layout.tsx)

`LocaleProvider` → `ThemeProvider` → `RootLayoutInner` (Stack navigator, onboarding modal, error modal). Both providers load persisted preferences from AsyncStorage before rendering children.

### Routing (Expo Router, file-based)
- `app/index.tsx` — redirects to `/(tabs)`
- `app/(tabs)/index.tsx` — Dashboard (schedule list, upcoming shifts, unconfirmed shifts)
- `app/(tabs)/import.tsx` — Import flow (camera OCR, CSV pick, manual)
- `app/(tabs)/settings.tsx` — Tariff rate configuration, theme toggle, language/currency picker
- `app/period/[id].tsx` — Period detail (shifts for a schedule)
- `app/confirm/[shiftId].tsx` — Confirm individual shift
- `app/summary/[yearMonth].tsx` — Monthly summary with pay calculation

### Key patterns

**DB access (`lib/db.ts`):** All queries go through `withDb()` which handles stale native SQLite connections (NullPointerException on Android). If the connection is dead, it re-opens and retries once. `initDb()` uses a promise-lock to prevent concurrent initialization. UUIDs are generated with `getRandomValues()` from `expo-crypto`.

**Input validation:** Tariff rates are clamped to `>= 0` in both `toNum()` (settings UI) and `setTariffRates()` (db layer). Deep link `shiftId` parameters are validated against UUID v4 regex before routing or DB lookup. OCR responses are schema-validated on both server and client side.

**Date format:** All dates are `DD.MM.YYYY` strings throughout the app (DB, OCR response, CSV). Use `lib/dates.ts` (`parseDateSafe`, `parseDateTimeSafe`) for parsing. For date comparison, convert to `YYYY-MM-DD` via `dateToComparable()` — never compare DD.MM.YYYY strings directly.

**Shift type classification** (by start_time):
- `tidlig`: 06:00–11:59
- `mellom`: 12:00–15:59
- `kveld`: 16:00–21:59
- `natt`: 22:00–05:59

**Onboarding:** First launch checks if `base_rate > 0` in tariff_rates. If not, shows modal prompting user to settings. Tracked via AsyncStorage key `shiftpay_onboarding_done`.

**Overnight shifts:** `shiftDurationHours()` handles end_time < start_time by adding 24h.

### Theme system

`lib/theme.ts` defines `ThemeColors` interface and `lightColors`/`darkColors` token objects. `lib/theme-context.tsx` provides `ThemeProvider` with system/light/dark preference, persisted in AsyncStorage (`shiftpay_theme`). NativeWind `colorScheme.set()` is synced via `useEffect`.

- **In components:** Use `useThemeColors()` for inline styles (tab bar, icons, ActivityIndicator), NativeWind `dark:` classes for everything else.
- **`app.json`:** `userInterfaceStyle: "automatic"` is required — do NOT change to "dark" or "light" (breaks runtime theme switching).
- **Tailwind config:** Custom color tokens (`dark-bg`, `dark-surface`, `app-bg`, `app-surface`, `accent`, `accent-dark`, `warm`) and Inter font families.

### i18n system

`lib/i18n/` with 4 locales: `nb` (default), `en`, `sv`, `da`. Uses `i18n-js` with `expo-localization` for device detection. `LocaleProvider` persists choice in AsyncStorage (`shiftpay_locale`).

- **In React components:** `useTranslation()` returns `{ t, locale, setLocale, currency, setCurrency }`.
- **Outside React:** `getTranslation(key)` reads from i18n singleton.
- **Currencies:** 5 supported (`NOK`, `GBP`, `SEK`, `DKK`, `EUR`), each locale has a default. Currency persisted separately (`shiftpay_currency`).
- **Translation keys:** Dot-notation (e.g. `screens.periodDetail`, `format.status.planned`, `shiftTypes.kveld`). Add new keys to all 4 locale files.

### Format utilities (`lib/format.ts`)

Shared display helpers used across screens: `formatCurrency(amount, currency)` (locale-aware `Intl.NumberFormat`), `statusLabel()`, `statusColor()` (NativeWind class strings with light/dark variants), `sourceLabel()`, `shiftTypeLabel()`, `shiftRowToShift()`. All label functions take a `t()` translator for i18n.

## Database (expo-sqlite)

Three tables in local SQLite. Schema defined inline in `lib/db.ts`. Single tariff_rates row (id=1, upsert pattern).

**tariff_rates:** base_rate, evening/night/weekend/holiday/overtime supplements (all REAL)
**schedules:** id (uuid), period_start, period_end, source (ocr|csv|manual)
**shifts:** id (uuid), schedule_id FK, date, start_time, end_time, shift_type, status (planned|completed|missed|overtime), actual_start, actual_end, overtime_minutes, confirmed_at

Migration from legacy `timesheets` table (JSON shifts column) runs once at init, then drops the old table.

## OCR backend

Supabase Edge Function at `supabase/functions/ocr/index.ts` (Deno). Uses Claude Haiku 4.5 Vision (`claude-haiku-4-5-20251001`) via `@anthropic-ai/sdk`. Accepts multipart form with `file` field (JPEG/PNG, max 5MB). Returns `{ shifts, confidence, method: "claude-vision" }`. Stateless — no data stored.

**Authentication:** OCR endpoint requires `X-API-Key` header matching `SHIFTPAY_API_KEY` Supabase secret. If the secret is not set, auth is bypassed (dev convenience).

**CORS:** Origin-based (not wildcard). Set `ALLOWED_ORIGINS` secret as comma-separated list if web clients need CORS. Mobile apps don't send Origin headers and are unaffected.

**Schema validation:** Server validates Claude's JSON output against date/time regex and allowed shift_type values before returning. Client (`lib/api.ts`) re-validates the response as defense-in-depth.

**Error handling:** Internal error details are never exposed to clients in production. Generic messages are returned instead.

Client-side: `lib/api.ts` sends FormData to `EXPO_PUBLIC_API_URL` with `X-API-Key` header and 30s timeout. In production, throws if `EXPO_PUBLIC_API_URL` is not configured (no silent fallback to localhost).

## Env

### App (`shiftpay/.env`)
- `EXPO_PUBLIC_API_URL` — OCR endpoint URL
- `EXPO_PUBLIC_OCR_API_KEY` — Shared secret for OCR endpoint authentication

### Supabase secrets (`supabase secrets set`)
- `ANTHROPIC_API_KEY` — Claude Haiku Vision API key
- `SHIFTPAY_API_KEY` — Must match `EXPO_PUBLIC_OCR_API_KEY` in the app
- `ALLOWED_ORIGINS` — (optional) Comma-separated allowed CORS origins for web clients

## Tech decisions (fixed)

| | Choice |
|---|--------|
| Platform | Expo SDK 54 / React Native 0.81 (Android first) |
| UI language | English (international reach), 4 locales (nb/en/sv/da) |
| Auth | None — no accounts |
| Storage | Local only (expo-sqlite), privacy by design |
| OCR | Supabase Edge Function (Claude Haiku Vision) |
| Styling | NativeWind 4.2.1 (Tailwind for React Native), `darkMode: "class"` |
| Typography | Inter (400/500/600/700) via `@expo-google-fonts/inter` |
| Animations | `moti` + `react-native-reanimated` |

## Security patterns

- **OCR auth:** API key via `X-API-Key` header, validated server-side against `SHIFTPAY_API_KEY` secret
- **CORS:** Origin-based allowlist (no wildcard `*`), configured via `ALLOWED_ORIGINS` secret
- **LLM output validation:** Schema validation (date/time regex, allowed shift_type enum) on both server and client
- **Error sanitization:** Production never exposes internal error messages or stack traces (`__DEV__` guards)
- **UUID generation:** `expo-crypto` `getRandomValues()` for cryptographic randomness
- **Deep link safety:** UUID v4 regex validation on `shiftId` before routing or DB queries
- **Input clamping:** Tariff rates enforced `>= 0` at UI and DB layers
- **No prod fallbacks:** `EXPO_PUBLIC_API_URL` must be set in production (no silent localhost fallback)

## Known quirks

- Pre-existing TS errors (@expo/vector-icons types, expo-file-system SDK 54 API, expo-notifications types) — all runtime OK, don't try to fix
- `npx expo install` can fail with ConfigError — use `npm install` as fallback
- React Native: `e.stopPropagation()` doesn't work — avoid it
- NativeWind `colorScheme.set()` requires `userInterfaceStyle: "automatic"` + `expo-system-ui`

## Related (outside shiftpay/)

- `../supabase/functions/ocr/` — Edge Function source
- `../backend/` — Archived FastAPI OCR (Tesseract + Claude Vision)
- `../CLAUDE.md` — Full repo context
