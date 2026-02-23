# Reconnaissance: ShiftPay (Re-eval)

> Date: 2026-02-23
> Previous eval: 2026-02-20 (Risk Level: HIGH)
> Scope: Entire project (shiftpay/ + supabase/functions/ocr/)

## Application Overview

ShiftPay is a mobile payroll auditor for shift workers. Users photograph timesheets, import via CSV, or enter shifts manually. The app calculates expected pay based on user-configured tariff rates with supplements (evening, night, weekend, holiday, overtime). All user data is stored locally on-device.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Expo SDK 54 / React Native 0.81.5 (TypeScript), Expo Router, NativeWind 4.2.1 |
| Local storage | expo-sqlite (shiftpay.db) |
| OCR backend | Supabase Edge Function (Deno) - stateless |
| AI model | Claude Haiku 4.5 Vision (via @anthropic-ai/sdk@0.39.0) |
| Notifications | expo-notifications (local push) |
| Build | Local `npx expo run:android` + APK distribution |
| Auth | None - no user accounts |

## Data Classification

| Data | Location | Sensitivity |
|------|----------|------------|
| Work schedules (dates, times) | Local SQLite | Medium - employment patterns |
| Tariff rates (hourly pay, supplements) | Local SQLite | Medium - salary information |
| Timesheet photos | Transient (sent to OCR, not stored) | Medium - may contain PII |
| EXPO_PUBLIC_OCR_API_KEY | Bundled in APK (EXPO_PUBLIC_) | High - shared secret, extractable |
| ANTHROPIC_API_KEY | Supabase server secret | Critical - API billing |
| SHIFTPAY_API_KEY | Supabase server secret | High - OCR endpoint gate |

## Changes Since Previous Eval (2026-02-20)

### Fixed from previous findings:
1. **API key auth on OCR endpoint** — Now requires X-API-Key header (FINDING-01 fixed)
2. **Schema validation of LLM output** — Server-side regex validation on dates/times/shift_type (FINDING-02 fixed)
3. **Error message sanitization** — Generic errors returned to client (FINDING-03 fixed)
4. **CORS restricted** — Origin-based allowlist, no wildcard (FINDING-04 fixed)
5. **UUID generation** — Now uses expo-crypto getRandomValues() (FINDING-08 fixed)
6. **Client-side OCR validation** — lib/api.ts validates response schema (FINDING-06 fixed)
7. **Input clamping** — Tariff rates enforced >= 0 at UI and DB layers (FINDING-10 fixed)
8. **Deep link UUID validation** — UUID v4 regex check before DB lookup (FINDING-11 fixed)
9. **No prod fallback URL** — EXPO_PUBLIC_API_URL must be set in production (FINDING-09 fixed)

### Still relevant from previous eval:
- Rate limiting on OCR endpoint (not implemented)
- SQLite encryption (not implemented, low priority)
- EXPO_PUBLIC_ vars still bundled in APK as cleartext
- No billing cap verification for Anthropic (config, not code)

### New changes to audit:
- Permissions cleaned: removed READ_EXTERNAL_STORAGE, RECORD_AUDIO, SYSTEM_ALERT_WINDOW, WRITE_EXTERNAL_STORAGE
- expo-dev-client moved to devDependencies
- exp+shiftpay dev scheme removed from manifest
- API key now set in .env (was empty before)

## Threat Model

### Most valuable for attacker
1. **ANTHROPIC_API_KEY** — Direct financial impact via API billing abuse
2. **OCR endpoint abuse** — Each request costs ~$0.01-0.03 in Claude API calls, API key extractable from APK
3. **User salary/schedule data** — Local-only, low external risk

### Most likely attacker
- **Opportunistic:** Extract API key from APK via apktool/jadx, use OCR endpoint with stolen key
- **Abuse vector changed:** Previously open endpoint (curl), now requires extracted API key (higher bar, but still feasible)

### Attack surface
1. **OCR Edge Function** — Now auth-gated, but key is in APK (EXPO_PUBLIC_)
2. **CSV import** — File parsing with user-supplied content
3. **Local database** — No encryption, accessible on rooted devices
4. **Deep links** — shiftpay:// scheme for notification handling
5. **APK itself** — Extractable secrets, decompilable code

### Regulatory context
- **GDPR:** Minimal — local-only storage, stateless backend
- **Play Store:** Privacy policy needed, permission justification for CAMERA and SCHEDULE_EXACT_ALARM

## Key Files for Audit

| File | Why |
|------|-----|
| `supabase/functions/ocr/index.ts` | Backend endpoint — auth, CORS, validation, error handling |
| `lib/api.ts` | Client HTTP — API key handling, response validation |
| `lib/db.ts` | All SQL operations, input validation |
| `lib/csv.ts` | CSV parsing (user-supplied content) |
| `lib/notifications.ts` | Local notification scheduling |
| `lib/calculations.ts` | Pay calculation accuracy |
| `app/confirm/[shiftId].tsx` | Deep link parameter handling |
| `.env` | API keys (now has OCR key set) |
| `android/app/src/main/AndroidManifest.xml` | Permissions, intent filters |
| `package.json` | Dependencies (expo-dev-client now in devDeps) |

## Previous Sec-Eval Learnings
- EXPO_PUBLIC_ vars are cleartext in APK — always flag
- Schema validation of LLM output is a category to always check
- Check billing caps on AI services
- security-auditor agent has NO write access — orchestrator must write report
- dep-config-scanner and attack-scenario-builder CAN write their own reports
