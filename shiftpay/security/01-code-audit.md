# Code Audit: ShiftPay (Re-eval)

> Date: 2026-02-23
> Previous eval: 2026-02-20
> Scope: shiftpay/ app + supabase/functions/ocr/

## Previous Findings — Verification

| # | Finding | Status |
|---|---------|--------|
| FIX-01 | API key auth on OCR endpoint | VERIFIED FIXED — X-API-Key header required |
| FIX-02 | Schema validation of LLM output | VERIFIED FIXED — server + client regex validation |
| FIX-03 | Error message sanitization | VERIFIED FIXED — generic errors only |
| FIX-04 | CORS restriction | VERIFIED FIXED — origin-based allowlist |
| FIX-05 | UUID generation | VERIFIED FIXED — expo-crypto getRandomValues() |
| FIX-06 | Client-side OCR validation | VERIFIED FIXED — validateOcrResponse() |
| FIX-07 | Input clamping | VERIFIED FIXED — Math.max(0, ...) on all rates |
| FIX-08 | Deep link UUID validation | VERIFIED FIXED — UUID v4 regex in confirm/[shiftId] |
| FIX-09 | No prod fallback URL | VERIFIED FIXED — throws if not configured |

All 9 previous findings confirmed fixed.

## New Findings

### FINDING-01: Timing attack on API key comparison (Medium)

**STRIDE:** Spoofing
**File:** `supabase/functions/ocr/index.ts:79`

API key compared with `!==` (non-constant-time). Statistical timing analysis could theoretically leak key bytes. Practical risk is lower on edge functions with variable latency, but easy to fix.

```typescript
// Current
if (provided !== appApiKey) {
```

**Fix:** Use HMAC-based constant-time comparison:
```typescript
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode("shiftpay-compare"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, new TextEncoder().encode(a)),
    crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b)),
  ]);
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  if (viewA.length !== viewB.length) return false;
  let result = 0;
  for (let i = 0; i < viewA.length; i++) result |= viewA[i] ^ viewB[i];
  return result === 0;
}
```

### FINDING-02: API key extractable from APK (Medium)

**STRIDE:** Information Disclosure
**File:** `.env:2`

`EXPO_PUBLIC_OCR_API_KEY` is bundled as cleartext in APK via Expo's `EXPO_PUBLIC_` mechanism. Anyone can extract with apktool/jadx.

**Mitigation:** Architectural limitation — can't hide client secrets. Mitigate with rate limiting (FINDING-03), billing caps, and key rotation plan.

### FINDING-03: No rate limiting on OCR endpoint (High)

**STRIDE:** Denial of Service
**File:** `supabase/functions/ocr/index.ts` (entire endpoint)

Combined with FINDING-02 (extractable key), an attacker can make thousands of authenticated OCR requests. Each costs ~$0.01-0.03 in Claude API.

**Fix:** In-memory rate limiter in edge function:
```typescript
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(id: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(id);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(id, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  return ++entry.count <= RATE_LIMIT;
}
```

### FINDING-04: Auth bypass when SHIFTPAY_API_KEY not set (Medium)

**STRIDE:** Elevation of Privilege
**File:** `supabase/functions/ocr/index.ts:77`

```typescript
if (appApiKey) {  // Entire auth block skipped if secret missing
```

If the Supabase secret is accidentally deleted or not set, the endpoint becomes completely open.

**Fix:** Return 503 when secret is not configured:
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

### FINDING-05: android:allowBackup="true" (Low)

**STRIDE:** Information Disclosure
**File:** `android/app/src/main/AndroidManifest.xml:18`

Allows app data (SQLite with salary info) to be included in Android Auto Backup. Contradicts privacy-by-design principle.

**Fix:** Set `android:allowBackup="false"` or add in `app.json`:
```json
"android": { "allowBackup": false }
```

### FINDING-06: Missing UUID validation in period/[id].tsx (Low)

**STRIDE:** Tampering
**File:** `app/period/[id].tsx:59-64`

`id` parameter passed directly to `getScheduleById()` without UUID format validation. No SQL injection risk (parameterized queries), but inconsistent with confirm/[shiftId].tsx pattern.

**Fix:** Add `UUID_RE.test(id)` check before DB lookup.

### FINDING-07: Stale permissions in compiled manifest (Low)

**STRIDE:** Information Disclosure
**File:** Compiled release manifest (build artifacts)

Dependencies (expo-camera, expo-image-picker) merge in `READ_EXTERNAL_STORAGE`, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`. Source manifest removal doesn't override merged permissions.

**Fix:** Add `tools:node="remove"` in AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" tools:node="remove"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" tools:node="remove"/>
<uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>
```

### FINDING-08: OCR API key missing from EAS build config (Medium)

**STRIDE:** Misconfiguration
**File:** `eas.json`

`EXPO_PUBLIC_OCR_API_KEY` not in EAS env config. EAS builds won't have the key, causing either 401 errors or (if server secret also missing) open endpoint.

**Fix:** `eas secret:create --name EXPO_PUBLIC_OCR_API_KEY --value <key> --scope project`

## Summary

| Severity | Count | Findings |
|----------|-------|----------|
| High | 1 | Rate limiting (#03) |
| Medium | 4 | Timing attack (#01), APK key (#02), Auth bypass (#04), EAS config (#08) |
| Low | 3 | allowBackup (#05), UUID validation (#06), Stale permissions (#07) |

**Overall risk: MEDIUM** (down from HIGH in previous eval)
