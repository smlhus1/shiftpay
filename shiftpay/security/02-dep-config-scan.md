# Dependency & Config Scan: ShiftPay (Re-eval)

> Date: 2026-02-23 | Previous scan: 2026-02-20
> Stack: Expo 54 / React Native 0.81.5 / TypeScript / Supabase Edge Function (Deno)

---

## npm audit Results

**Command:** `npm audit --json`
**Result:** 19 high, 0 critical, 0 moderate, 0 low

### Status vs. previous eval

The count is **identical to the 2026-02-20 scan: 19 high findings, all the same root CVE.** No change.

### Root cause

All 19 findings cascade from a single vulnerability:

| CVE | Package | Affected versions | Severity | Description |
|-----|---------|------------------|----------|-------------|
| GHSA-3ppc-4f35-3m26 | `minimatch` | <10.2.1 | High | ReDoS via repeated wildcards with non-matching literal in pattern — O(4^N) backtracking |

### Affected package tree (all transitive, all build-time)

| Vulnerable package | Version in tree | Pulled in by |
|-------------------|----------------|--------------|
| `minimatch` | 9.0.x (root) | `@expo/cli`, `@expo/metro-config`, `@expo/fingerprint` |
| `minimatch` | 3.1.2 (x4) | `@react-native/codegen`, `react-native`, `rimraf`, `test-exclude` |

**Production risk: zero.** Every affected package is a build-time tool (Metro bundler, Babel codegen, test coverage instrumentation). None are included in the compiled Android APK. The vulnerability requires an attacker to supply arbitrary glob strings to a process calling `minimatch()` — not possible in a mobile app context.

**Developer machine risk: low.** ReDoS via maliciously crafted `npm` script input is theoretically possible but requires local access.

### Fix availability

`npm audit fix` is not available — all fixes require a semver-major downgrade (`expo@49.0.23`, `react-native@0.74.5`). The `overrides` workaround:

```json
"overrides": {
  "minimatch": ">=10.2.1"
}
```

This may break build tooling in Expo 54 + RN 0.81. Not recommended without dedicated testing. Acceptable to track as known/accepted risk since production exposure is nil.

---

## Secret Scan

### Source code scan

Scanned all `.ts`, `.tsx`, `.js`, `.json`, `.yml`, `.yaml`, `.md` files excluding `node_modules/` and `.expo/`.

Pattern coverage: `api[_-]key`, `apikey`, `api_secret`, `bearer`, `password`, `token`, `secret`, `AKIA[...]` (AWS), `sk-ant`, `ghp_`, `mongodb+srv`, `postgres://`, `mysql://`, `redis://`, `EXPO_PUBLIC_OCR_API_KEY` literal value.

**Findings in active source code:**

| File | Line | Finding | Assessment |
|------|------|---------|------------|
| `lib/api.ts` | 5, 16–17 | References `EXPO_PUBLIC_OCR_API_KEY` via `process.env` | Correct pattern — reads from env, no hardcoded value |
| `eas.json` | preview + production env blocks | `EXPO_PUBLIC_API_URL=https://ifzngx[MASKED].supabase.co/functions/v1/ocr` | Supabase project URL committed in eas.json — see note below |

**No API keys, passwords, or cryptographic secrets are hardcoded in any source file.**

### EXPO_PUBLIC_OCR_API_KEY — APK exposure

The `.env` file contains both `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_OCR_API_KEY`. The `EXPO_PUBLIC_` prefix causes Expo Metro to bundle these values as cleartext strings in the compiled APK. This is a **known, accepted architectural constraint** documented in `00-recon.md` and the original security eval.

The OCR API key is extractable from the APK via `apktool`/`jadx`. This is the primary residual risk identified across all prior evaluations. The key gates access to the OCR endpoint, which proxies paid Claude API calls.

**No change from previous eval. Key rotation procedure should be defined.**

### eas.json — Supabase URL committed to git

`eas.json` contains `EXPO_PUBLIC_API_URL` in plaintext in both `preview` and `production` env blocks. This URL is committed to git. The git log confirms it was first committed in `f76b8f2` (2026-02-21) and an older Supabase project URL (`dnjsrxbiswsmivzxfqza`) was committed in the same commit and then replaced.

**Assessment:** The Supabase Function URL is a non-secret endpoint identifier — it is not an API key or credential. No authentication information is derived from the URL alone. The endpoint requires `X-API-Key` authentication. **Risk: informational only.** The old project URL reference in git history is worth noting in case that project is still active.

### .env file contents

The `.env` file contains live values:
- Line 1: Supabase function URL (not a secret)
- Line 2: `EXPO_PUBLIC_OCR_API_KEY` — 64-character hex string [VALUE MASKED IN THIS REPORT]

**The file is correctly excluded from git** (see .gitignore section below). The value has never been committed to the repository.

### .gitignore Coverage

**shiftpay/.gitignore (line 34):**
```
.env*.local     # covers .env.local, .env.production.local — does NOT cover .env
```

**vibe_games/.gitignore (line 14):**
```
.env            # covers .env directly
```

**Result:** `shiftpay/.env` is protected by the parent-repo `.gitignore`, not the project-level one.

**Risk:** If `shiftpay/` is ever moved to its own repository, the `.env` file would NOT be protected by its own `.gitignore`. Low risk currently, but should be fixed.

**Recommended fix — add to `shiftpay/.gitignore`:**
```
.env
.env.local
.env.production
```

### Git history — secret exposure check

Checked via:
- `git log --all --diff-filter=D -- "*.env"` — no deleted .env files in history
- `git log --all -p -S "EXPO_PUBLIC_OCR_API_KEY"` — no commits containing the key variable with a value
- `git log --all -p -S "4256a12967f6..."` (partial key value) — no matches
- `git ls-files --cached .env .env.*` — .env is not tracked

**Conclusion: No secrets have ever been committed to this repository.**

---

## Configuration Review

### AndroidManifest.xml

File: `android/app/src/main/AndroidManifest.xml`

**Permissions declared:**

| Permission | Justification | Assessment |
|-----------|--------------|------------|
| `CAMERA` | Timesheet photo capture | Required, minimal |
| `INTERNET` | OCR endpoint calls | Required |
| `POST_NOTIFICATIONS` | Shift-end reminder notifications | Required |
| `SCHEDULE_EXACT_ALARM` | Exact timing for shift notifications | Required for expo-notifications on Android 12+ |
| `VIBRATE` | Notification vibration | Acceptable |

**Removed since previous eval (per `00-recon.md`):** `READ_EXTERNAL_STORAGE`, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`. Permission surface is now minimal and justified.

**Other manifest flags:**

| Flag | Value | Assessment |
|------|-------|------------|
| `android:allowBackup="true"` | Application-level | Medium concern — local SQLite data (salary rates, schedules) is included in Android Auto Backup by default. May transfer to new device without user knowledge. |
| `android:exported="true"` on MainActivity | Required for launcher | Correct — LAUNCHER activities must be exported |
| `android:scheme="shiftpay"` intent-filter | Deep link for shift confirmation | ShiftId is UUID-validated before DB lookup — low risk |
| No `android:debuggable` set | Defaults to false in release | Correct |
| No `android:usesCleartextTraffic` | All traffic goes to HTTPS | Correct |
| `expo.modules.updates.ENABLED = false` | OTA updates disabled | Acceptable — using EAS Build distribution |

**Finding — `android:allowBackup="true"` (Medium):**

Android Auto Backup will include `shiftpay.db` (SQLite) in device backups. This means:
- Salary data and work schedules may be backed up to Google account
- Data may restore to a new device without explicit user action

For a privacy-by-design app, this is worth addressing. Mitigation: set `android:allowBackup="false"` or declare a backup rules XML that excludes the SQLite database file.

### app.json

| Setting | Value | Assessment |
|---------|-------|------------|
| `userInterfaceStyle` | `"automatic"` | Correct — required for runtime theme switching |
| `newArchEnabled` | `true` | Correct for RN 0.81+ |
| `scheme` | `"shiftpay"` | Deep link scheme — UUID validation in place |
| `android.permissions` | `CAMERA`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` | Minimal, justified |
| EAS `projectId` | Present | Required for EAS Build |
| No `android:allowBackup` override | Absent | See AndroidManifest note above |

**No critical findings.**

### eas.json

| Setting | Value | Assessment |
|---------|-------|------------|
| `development.developmentClient` | `true` | Correct |
| `preview.android.buildType` | `"apk"` | Correct for internal testing |
| `production.android.buildType` | `"app-bundle"` | Correct for Play Store |
| `env.EXPO_PUBLIC_API_URL` | Supabase URL in both preview + production | Non-secret URL; acceptable in committed config |
| `EXPO_PUBLIC_OCR_API_KEY` | NOT in eas.json | Correct — comes from `.env` only |

**Observation:** `EXPO_PUBLIC_OCR_API_KEY` is absent from `eas.json`. For EAS cloud builds, this key would need to be set as an EAS Secret (`eas secret:create`) to be available during build. If using local builds only (`npx expo run:android`), `.env` is sufficient.

### Supabase Edge Function (OCR)

File: `supabase/functions/ocr/index.ts`

| Finding | Severity | Status vs prev eval |
|---------|----------|---------------------|
| No auth / open endpoint | HIGH | FIXED — `X-API-Key` required |
| CORS wildcard | MEDIUM | FIXED — origin-based allowlist |
| Error message leaks internal detail | LOW | FIXED — generic message returned |
| JSON schema validation missing | LOW | FIXED — date/time regex + shift_type enum validation |
| No rate limiting | MEDIUM | NOT FIXED — still no rate limiting |

**Rate limiting (not fixed):** The endpoint has no per-IP or per-key request throttling. Each request triggers a paid Claude API call (~$0.01–0.03). An attacker with the extracted APK key can enumerate requests until the Anthropic billing limit is hit. **The only protection is the billing cap in Anthropic Dashboard** (if set — not verifiable from code).

**Auth bypass when SHIFTPAY_API_KEY is unset (line 77):**
```typescript
const appApiKey = Deno.env.get("SHIFTPAY_API_KEY");
if (appApiKey) {          // <-- auth is skipped entirely if secret is not set
  const provided = req.headers.get("x-api-key");
  if (provided !== appApiKey) {
    return jsonResponse({ detail: "Unauthorized" }, 401, req);
  }
}
```
If the Supabase secret `SHIFTPAY_API_KEY` is accidentally unset or rotated without updating the secret, the endpoint becomes completely open. This was flagged as a dev-convenience feature in `CLAUDE.md`. For production, this bypass should be removed: if the secret is unset, return 503.

### package.json — dev vs. production dependencies

| Package | Category | Assessment |
|---------|----------|------------|
| `expo-dev-client` | devDependencies | Correct — moved from dependencies (per `00-recon.md`) |
| `babel-preset-expo` | devDependencies | Correct — build-time only |
| `typescript` | devDependencies | Correct |
| `@types/react` | devDependencies | Correct |

No build tools or testing frameworks found in `dependencies`. Dev/prod split is clean.

**Tailwind CSS in dependencies:** `tailwindcss@3.4.19` is listed as a production dependency. For NativeWind, Tailwind is used at build time (CSS-in-JS compilation), not at runtime. Technically a devDependency, but this is standard practice for NativeWind projects and has no security impact.

---

## Summary

| Finding | Severity | Status | Action |
|---------|----------|--------|--------|
| 19 npm audit findings (minimatch ReDoS) | High (build-time only) | Unchanged — no production risk | Accept or add `overrides` |
| EXPO_PUBLIC_OCR_API_KEY extractable from APK | Medium | Known/accepted architectural limit | Document key rotation procedure |
| No rate limiting on OCR endpoint | Medium | Not fixed | Add Supabase rate limiting or billing cap |
| Auth bypass when SHIFTPAY_API_KEY unset | Medium | Present by design | Remove bypass for production hardening |
| `android:allowBackup="true"` includes SQLite | Medium | Not addressed | Evaluate backup exclusion rules |
| `.env` not in shiftpay/.gitignore | Low | Not fixed | Add `.env` to shiftpay/.gitignore |
| Old Supabase project URL in git history | Informational | N/A — URL, not secret | Verify old project is deactivated |
| Permissions — CAMERA, NOTIFICATIONS, ALARM | Informational | Clean — minimal and justified | No action |
| Secrets committed to git | None | Confirmed clean | No action |
| Dev/prod dependency split | Clean | Improved — expo-dev-client moved | No action |

### Change summary vs. 2026-02-20

**Fixed since previous eval:**
- OCR endpoint auth (X-API-Key)
- CORS wildcard removed
- Error message sanitization
- LLM output schema validation
- expo-dev-client moved to devDependencies
- Unnecessary Android permissions removed (READ_EXTERNAL_STORAGE, RECORD_AUDIO, SYSTEM_ALERT_WINDOW, WRITE_EXTERNAL_STORAGE)
- dev scheme removed from manifest

**Not fixed / still open:**
- Rate limiting on OCR endpoint
- .env not in shiftpay/.gitignore
- EXPO_PUBLIC_OCR_API_KEY bundled in APK (architectural — no easy fix)

**New findings this scan:**
- `android:allowBackup="true"` — SQLite backup exposure
- Auth bypass when SHIFTPAY_API_KEY is unset in Supabase secrets

---

## Prioritized Fix List

### 1. Immediately — Remove auth bypass for SHIFTPAY_API_KEY unset

If `SHIFTPAY_API_KEY` is not configured in Supabase secrets, the endpoint currently accepts all requests. Fix in `supabase/functions/ocr/index.ts`:

```typescript
const appApiKey = Deno.env.get("SHIFTPAY_API_KEY");
if (!appApiKey) {
  return jsonResponse({ detail: "Service unavailable" }, 503, req);
}
const provided = req.headers.get("x-api-key");
if (provided !== appApiKey) {
  return jsonResponse({ detail: "Unauthorized" }, 401, req);
}
```

Estimated time: 5 minutes.

### 2. This week — Add rate limiting to OCR endpoint

Options (easiest to hardest):
- Set a spending/rate limit in **Anthropic Dashboard** (Dashboard > Settings > Limits) — zero code, 5 minutes
- Enable **Supabase Edge Function rate limiting** in the Supabase dashboard if available on your plan
- Implement IP-based throttling with **Supabase KV** or **Upstash Redis** — 2–4 hours

Minimum acceptable: billing cap in Anthropic Dashboard as a financial safety net.

### 3. This week — Add .env to shiftpay/.gitignore

```
# shiftpay/.gitignore — add:
.env
.env.local
.env.production
```

Estimated time: 2 minutes.

### 4. Before Play Store production — Evaluate android:allowBackup

Current: `android:allowBackup="true"` means `shiftpay.db` may be included in Google account backups.

Option A — Disable backup entirely:
In `app.json`:
```json
"android": {
  "allowBackup": false
}
```

Option B — Exclude only the database via backup rules XML (allows OS backup of other app data).

Decision: Given the privacy-by-design principle of local-only storage, option A is consistent with the app's stated model. User data should not leave the device without explicit opt-in.

### 5. Accepted risk — EXPO_PUBLIC_OCR_API_KEY in APK

This is an architectural constraint of EXPO_PUBLIC_ vars. Mitigation options (none are simple):
- Move to EAS Secrets + server-side proxy (adds backend complexity)
- Treat the key as rotatable — define a rotation runbook and rotate on any suspected compromise
- Accept the risk and rely on Anthropic billing cap as the backstop

Document which mitigation is chosen and at what threshold the key gets rotated.

---

## References

- [GHSA-3ppc-4f35-3m26: minimatch ReDoS](https://github.com/advisories/GHSA-3ppc-4f35-3m26)
- [Expo EXPO_PUBLIC_ env vars documentation](https://docs.expo.dev/guides/environment-variables/)
- [Android Auto Backup documentation](https://developer.android.com/guide/topics/data/autobackup)
- [Supabase Edge Functions — secrets](https://supabase.com/docs/guides/functions/secrets)
