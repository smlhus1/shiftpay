# Pass 3 Research: Senior-Level Security Posture for ShiftPay

> Researched: 2026-04-16 | Sources consulted: 30+ | Confidence: High
> Scope: Local-first Expo/RN app (ShiftPay) with a single stateless cloud touchpoint — Supabase Edge Function running Claude Haiku Vision. No user accounts, no data in the cloud, all tariff rates and shifts live in `expo-sqlite` on device.

## TL;DR

For a local-only app with one stateless endpoint, security is not a deep well — it is a narrow, brittle moat. The most consequential change you can make is to **stop treating the bundled `EXPO_PUBLIC_OCR_API_KEY` as a secret** and **replace it with a short-lived, device-attested token** issued to genuine Play-Store installs via the Play Integrity API. Everything else (rate limiting, EXIF stripping, validator library choice, obfuscation) is secondary hardening that is cheap to add and expensive to skip.

Do this in order of ROI:

1. Add per-IP + global rate limiting on the OCR edge function (Upstash Redis, costs pennies, stops 99% of abuse).
2. Strip EXIF client-side before upload (GPS tags from hospital timesheet photos are real PII).
3. Add magic-number check server-side — MIME headers are client-controlled and cannot be trusted.
4. Integrate `@expo/app-integrity` for Play Integrity attestation. The current shared key is a speed bump, not a lock.
5. Keep Zod out — `valibot` for the tiny OCR response schema is 90% smaller and composes cleanly with tree-shaking.
6. Harden the Data Safety form, enforce HTTPS-only via network security config, and turn on R8 full mode for the release APK.

---

## Threat Model (explicit, with budget)

Before spending any engineering hours, name the adversary. ShiftPay's attack surface is deliberately small; pretending otherwise leads to overbuilt, brittle defences.

### What we defend
- **The Anthropic API budget.** The single expensive operation is a Claude Haiku 4.5 Vision call. Each OCR invocation costs ~$0.001–0.01. An attacker spraying the endpoint can drain the Anthropic wallet and/or trigger Supabase invocation bill shock.
- **The user's on-device data.** Tariff rates, schedules, confirmed shifts. This lives in SQLite on the phone. Cloud has no copy.
- **Photo content in flight.** A timesheet photo transits over TLS to Supabase and from Supabase to Anthropic. It is never persisted on our infrastructure, but it is visible to Supabase (the edge function host) and Anthropic (as API input) for the duration of the request. GPS EXIF, if present, can leak the user's workplace/home.
- **App integrity on the device.** Compliance with Play Store policy; users should see behaviour that matches what the Data Safety form claims.

### From whom

| Adversary | Capability | Motivation | Budget to defend |
|---|---|---|---|
| **Curious user / script kiddie** | Reads APK with `apktool`, finds `EXPO_PUBLIC_OCR_API_KEY` in bundle, curls the endpoint | Fun, blog post, $5 of free OCR | **High** — this is who actually shows up |
| **API-key scraper bot** | Automated GitHub + APK scraping for reusable keys | Resell to spam/scam pipelines | **High** — cheap to mitigate, harsh if ignored |
| **Compromised-device scenario** | Malware on user's phone reads SQLite | Financial fraud, blackmail | **Low** — out of scope; the OS owns this threat |
| **Targeted attacker going after one user** | Phishing + device compromise | Espionage, domestic abuse | **Minimal** — threat model does not cover journalism/activism use cases |
| **Regulatory (GDPR / Play Store)** | Audits Data Safety claims vs. actual behaviour | Enforcement | **High** — one bad claim is a delisting risk |
| **Prompt-injection attacker** | Submits crafted image to poison Claude's output | Data corruption, downstream exploit in app | **Medium** — server+client schema validation already blocks this |

### Explicit non-goals
- Defending against a user with root on their own phone. They already see all their data.
- Preventing a sophisticated attacker from eventually sending requests to the OCR endpoint. Anyone can crack the APK; goal is to make abuse **expensive and slow**, not impossible.
- Protecting against Supabase or Anthropic themselves being compromised. We accept their threat models as peers.

### Budget allocation (≈ 2–3 days of work)
- 30% rate limiting + abuse detection
- 20% Play Integrity integration
- 15% EXIF stripping + magic number validation
- 10% LLM output validation migration (Zod → Valibot)
- 10% ProGuard/R8 + Network Security Config
- 10% Data Safety form, GitHub Actions hardening
- 5% Documentation / threat-model write-up

---

## Q1 — `EXPO_PUBLIC_*` is always in the bundle. Is the key meaningful?

**Short answer: it is a speed bump, not a lock. Treat it as obfuscation, not authentication. The only real mitigation is attestation (see Q2).**

`EXPO_PUBLIC_` variables are inlined at build time — the Metro bundler string-substitutes `process.env.EXPO_PUBLIC_OCR_API_KEY` with the literal value, then Hermes compiles that to bytecode. Extracting it takes `apktool d app.apk`, `grep` on the decompiled bundle, and about 90 seconds. [Expo's own docs say it explicitly:](https://docs.expo.dev/guides/environment-variables/) *"Do not store sensitive info... in `EXPO_PUBLIC_` variables."*

What the key actually buys you:
- **Blocks unsophisticated abuse.** Someone discovering the URL (logs, burp, packet capture) cannot just curl it. They need to also crack the APK. This filters out 90% of drive-by traffic.
- **Simplifies revocation.** If you rotate `SHIFTPAY_API_KEY` in Supabase + ship a new app build, all old APKs break. That is both the feature and the curse.
- **Dev/prod separation.** Lets you keep a different secret in staging vs prod without code forks.

What it does not buy you:
- **Authentication.** Anyone who extracts the key can impersonate every install.
- **Per-user accountability.** You cannot throttle "that abuser" vs "that user" — you see one key.
- **Defense against a motivated attacker.** 10 minutes of work is all it takes.

**Recommendation:** Keep the key as a coarse pre-filter, but stop calling it authentication in code comments or the threat model. Real per-install authentication should come from Play Integrity attestation tokens (Q2). The key becomes a "baseline proof you at least built against our API", not a trust anchor.

---

## Q2 — Play Integrity API for Expo

Play Integrity is Google's attestation service: the Play Store signs a short-lived verdict that says "this request came from a genuine, unmodified install of your package on a real Android device running a stock OS." Your backend verifies the signature and rejects anything that fails.

### Library choice (April 2026)
| Library | Status | Notes |
|---|---|---|
| [`@expo/app-integrity`](https://docs.expo.dev/versions/latest/sdk/app-integrity/) | **Recommended**. Official Expo, unified Android+iOS API, uses Standard request flow | Shipped 2025-Q4. Requires config plugin |
| [`react-native-google-play-integrity`](https://github.com/kedros-as/react-native-google-play-integrity) | Community, Android only | More control, but you wire iOS yourself if ever needed |
| Firebase App Check | Works, but drags in Firebase | Overkill for a no-backend app |

### Standard vs Classic request
- **Standard** (Expo's default): ~few hundred ms, Google caches verdicts and refreshes in background. Right for every OCR request.
- **Classic**: Few seconds, one-shot verdict. Use for high-value, infrequent actions (license checks). Not needed here.

Reference: [Play Integrity overview](https://developer.android.com/google/play/integrity/overview).

### Edge-function verification flow
1. App calls `AppIntegrity.generateIntegrityToken(nonce)` — Google returns a JWT verdict.
2. App sends verdict + `X-API-Key` + image to Supabase.
3. Edge function verifies verdict server-side: either (a) decode JWE using your Google Play Integrity decryption key, or (b) call Google's verify endpoint (simpler, costs one API round-trip).
4. Check verdict fields: `appIntegrity.appRecognitionVerdict === "PLAY_RECOGNIZED"`, `deviceIntegrity.deviceRecognitionVerdict` includes `MEETS_DEVICE_INTEGRITY`, `accountDetails.appLicensingVerdict === "LICENSED"`.
5. Reject if any field is missing or fails.

### Cost & reliability
- Play Integrity itself is **free** for the first ~10,000 requests per day per app. After that, apply for a quota increase (Google grants these routinely).
- Requires Google Play Developer account ($25 one-time — ShiftPay already has one).
- Standard requests: "few hundred ms" latency, high verdict reliability. Occasional `UNKNOWN` verdicts when Play Services is cold — build a graceful fallback.
- Does **not** work outside the Play Store install (sideloaded APKs fail). That is the point, but it means your internal testing track and manual APK distribution need a bypass flag.

### Graceful degradation
- In dev builds (detect via `__DEV__`), skip attestation entirely.
- If Play Services returns an error (e.g. on GrapheneOS, custom ROMs), return a user-friendly "device integrity check failed — try again or use manual entry" rather than a 401.
- Log the verdict (hashed nonce + verdict result, never the raw JWT) to catch widespread failures.

Sources: [Expo App Integrity docs](https://docs.expo.dev/versions/latest/sdk/app-integrity/), [Expo blog intro](https://expo.dev/blog/expo-app-integrity), [Play Integrity practical guide](https://proandroiddev.com/a-practical-guide-to-play-integrity-api-everything-you-need-to-implement-attestation-on-android-c010f0fc8f09).

---

## Q3 — Request signing / HMAC for mobile → edge function

HMAC request signing is the "heavy" alternative to Play Integrity. It ties each request to a device-bound secret instead of a bundled secret. For ShiftPay specifically, it is **overkill relative to Play Integrity** — you get similar abuse-resistance, more code, and no attestation guarantee that the device is genuine.

### How device-bound signing works
1. On first app launch, generate a random device key and store it in Android Keystore (hardware-backed).
2. For each request, compute `HMAC-SHA256(device_key, timestamp || nonce || body_hash || path)`.
3. Send the signature + timestamp + nonce in headers.
4. Server looks up the device key (requires per-device registration, which breaks the "no accounts" principle) and verifies.

### Why it is a poor fit here
- **No-account model breaks.** Device registration requires a server-side record of device_id → device_key. That is state we said we would not have.
- **Still needs a trust anchor.** The first registration has to trust *something* — either Play Integrity (in which case, just use Play Integrity directly) or a bundled key (same problem as today).
- **Replay protection is not free.** [Replay prevention requires either a nonce cache or tight timestamp windows.](https://webhooks.fyi/security/replay-prevention) Supabase edge functions are stateless across invocations, so you would need Redis anyway.

### When it does make sense
Only in scenarios ShiftPay does not hit: multi-endpoint APIs with session state, financial transactions, high-value attestation where Play Integrity outages are unacceptable. [Microsoft's device-bound request signing article](https://developer.microsoft.com/blog/securing-sensitive-mobile-operations-with-device-bound-request-signing) describes the right mental model, but it is written for banking apps.

**Verdict:** Skip HMAC signing. Use Play Integrity for attestation + Upstash for replay/rate windows.

---

## Q4 — LLM output validation: Zod vs Valibot vs hand-rolled

The current code (`lib/api.ts` lines 40–75) uses **hand-rolled** validation. That is fine. The question is whether a library would be better.

### Bundle-size reality (for a tiny schema like `{ shifts: [{date, start_time, end_time, shift_type, confidence}] }`)

| Library | gzipped for this schema | Runtime perf vs Zod v3 | Notes |
|---|---|---|---|
| Hand-rolled (current) | 0 (just your code) | Fastest | Brittle to extend |
| [Valibot](https://valibot.dev/) | ~1.37 kB | ~2x faster | Modular, tree-shakeable functions |
| Zod v4 Mini | ~3.94 kB | Similar to Valibot | Compromise variant |
| Zod v4 (full) | ~16.57 kB | [17x slower than v3](https://dev.to/dzakh/zod-v4-17x-slower-and-why-you-should-care-1m1) on init | Avoid in mobile bundles |
| ArkType | ~7 kB | Fastest overall | More complex mental model |

Sources: [Valibot comparison](https://valibot.dev/guides/comparison/), [Pockit 2026 roundup](https://pockit.tools/blog/zod-valibot-arktype-comparison-2026/), [Valibot bundle deep-dive](https://www.builder.io/blog/valibot-bundle-size).

### Defense-in-depth rationale
Validate on both sides. Here is why:
- **Server-side validation** (Deno) protects your client from a misbehaving Claude response. If Anthropic updates the model and output drifts, you want the server to detect it before 200-OK-ing garbage to 1000 clients.
- **Client-side validation** protects against a compromised server (your own edge function) and against in-flight tampering even though you use TLS. It is cheap and enforces the contract from the client's perspective.

The cost of double validation for this schema: probably <1 ms per request, <2 kB of client code with Valibot.

### Recommendation
- **Migrate to Valibot on both client and server.** One schema definition reused across `lib/api.ts` and the edge function. Gives you clean error messages for free ("shifts[2].date must match DD.MM.YYYY").
- Keep server-side regex checks as the first gate (cheapest rejection), use Valibot for the structural pass.
- Do **not** adopt Zod v4 — 17x slower init and 10x larger bundle for essentially the same API.

---

## Q5 — Supabase Edge Function hardening

### Rate limiting strategies
Supabase now has a recursive-call budget (5,000 req/min per chain, added [March 2026](https://supabase.com/changelog)) but does not offer per-function, per-IP, or per-device rate limiting natively. You build that yourself.

| Strategy | Implementation | Pro | Con |
|---|---|---|---|
| **Per-IP** | Upstash Redis + sliding window by `req.headers.get('x-forwarded-for')` | Stops simple floods | Shared NAT (corporate, mobile carrier) can block real users |
| **Per-device (Play Integrity token hash)** | Hash the verdict JWT, key Redis off that | True per-install limit | Requires attestation already wired up |
| **Global budget** | Counter key `ocr:global:minute`, fail open if hot | Last-line defense against runaway bills | Hurts real users during abuse spikes |
| **Token bucket per API key** | If you ever issue per-user keys | Fair sharing | Not applicable to no-account app |

Recommended layered approach (all three):
1. **Per-IP:** 30 requests/hour from the same `/24` subnet. Real users import a timesheet a few times a month; 30/hr is generous.
2. **Global:** 500 requests/hour across all users. Kills bills dead if something goes wrong.
3. **Per-device (after Play Integrity):** 20 requests/day per verdict-hash. Matches actual usage.

Upstash global Redis is free up to 10k commands/day, ~$0.20/100k after. [Supabase's rate-limit example](https://supabase.com/docs/guides/functions/examples/rate-limiting) shows the pattern.

### Cost controls (critical)
**Important:** Supabase counts invocations **before** your code runs, so rate limiting inside the function does not stop invocation billing. It does stop the expensive Anthropic call, which is the real cost lever. Consider:
- **Supabase project spending cap.** Set one in the dashboard.
- **Anthropic API budget alert.** Set via Anthropic console — email at 50%/80%/100% of monthly cap.
- **Kill switch.** A `KILL_SWITCH=true` Supabase secret that the edge function checks before doing anything. Lets you stop the bleeding in 30 seconds if something goes viral.

### Abuse detection
- Log (without PII) request count per IP+hour bucket to Supabase logs.
- Alert via Logflare/Sentry when p99 latency spikes or 4xx/5xx ratio exceeds 5%.
- Consider a honeypot field in the request — a `version: "1.0"` header bots will either omit or get wrong.

### Logging without PII
[Supabase logging docs](https://supabase.com/docs/guides/telemetry/logs) are clear: log structured JSON, scrub headers. Specifically:
- **Never** log `X-API-Key` values or Play Integrity tokens. Log `key_hash: sha256(key).slice(0, 12)`.
- **Never** log the image or OCR output — those are user's schedule data.
- **Do** log: request_id (uuid), timestamp, ip_prefix (first two octets), file_size, response_status, duration_ms, model_tokens_used.
- **Retention:** Supabase keeps edge function logs 1 day on free, 7 days on pro. Export to S3 if you need longer for incident response.

---

## Q6 — Error sanitization patterns

The current code (`supabase/functions/ocr/index.ts` line 234) does this right: `{ detail: "OCR processing failed. Please try again." }` to the client, `console.error("OCR error:", e)` to logs. Do not change that pattern, but tighten it:

### What to log
- Stack trace + error class name.
- Sanitized request metadata (not body).
- `__DEV__` flag so you can trigger verbose client-side logging in dev builds only (check `process.env.NODE_ENV !== 'production'` or React Native's `__DEV__` global).

### What to return
- Generic message keyed by HTTP status code.
- A correlation ID (`X-Request-ID`) so a user can report "request abc123 failed at 14:02" and you can find it in logs.
- **Never**: internal paths, SDK versions, stack traces, Anthropic error messages verbatim (they sometimes echo parts of the prompt).

### Structured logging
Use JSON structured logs — Supabase Logflare query-es them easily. Shape:
```
{"level":"error","ts":"2026-04-16T14:02:00Z","request_id":"abc123","msg":"anthropic_api_error","status":500,"duration_ms":2300,"model":"claude-haiku-4-5-20251001"}
```
No payload, no headers, no PII.

### Client-side
Respect the `getTranslation("api.ocrError", { status })` pattern already in `lib/api.ts`. Do not `JSON.stringify(err)` to the screen — in `__DEV__` only.

---

## Q7 — Photo upload safety

### EXIF stripping (critical)
Timesheet photos commonly include GPS coordinates from the hospital where the user works. That is **special-category-adjacent PII** (workplace = likely health sector inferrable). [Study: up to 80% of smartphone photos retain GPS through careless upload paths.](https://privacystrip.com/blog/social-media-metadata-policies/)

**Mitigation:** Strip EXIF client-side before upload. Options:
- `expo-image-manipulator`: `manipulateAsync(uri, [{ resize: { width: 2048 } }], { compress: 0.85, format: SaveFormat.JPEG })` — the resize+recompress pass nukes EXIF as a side effect. Already in ShiftPay's roadmap per the `lib/api.ts` comment ("Client-side resize will be re-enabled after next dev build").
- Alternative: explicit `ImageManipulator.SaveFormat.JPEG` with `stripExif: true` is not a documented flag, but the re-encode achieves it regardless.

Re-enable that resize/recompress pass **before** next release. Do not trust the server to strip — timing attacks, logs, and Anthropic all see the image in flight.

### Size/format validation (server)
Current code (index.ts lines 126–134) checks size (5MB) and MIME type. The MIME check is weak because `file.type` comes from the client. Harden:
- **Magic number check.** First 8 bytes should be one of: `FF D8 FF` (JPEG), `89 50 4E 47 0D 0A 1A 0A` (PNG). [Magic numbers cannot be spoofed as easily as the MIME header.](https://transloadit.com/devtips/secure-api-file-uploads-with-magic-numbers/)
- **Dimension sanity check.** Reject > 8000×8000 or < 100×100. A 5MB payload can still be a 50,000×50,000 pixel bomb.
- **Retain size limit** at 5MB — already correct.

### Malicious file rejection
- Reject if magic number ≠ extension ≠ MIME type.
- Reject if the file fails to decode (wrap the Anthropic upload in a try/catch).
- Consider sending a very low-res thumbnail first to Anthropic in a future optimization — it gives you an early-fail path.

---

## Q8 — Dependency supply chain

### Tooling choice

| Tool | Best at | Worst at |
|---|---|---|
| **Renovate** | Monorepos, deep config, OSV-backed vuln PRs, lockfile maintenance | Steep config curve |
| **Dependabot** | GitHub-native, zero-config | Less granular, noisier |
| **npm audit** | Cheap one-shot | No auto-PR |

For ShiftPay (single app, single dev): **Renovate with a `minimumReleaseAge: "7 days"`** config. That delay alone neuters most npm supply-chain attacks (the compromised package gets pulled within 48–72h typically). Plus `osvVulnerabilityAlerts: true` to still get instant PRs for publicly disclosed CVEs. [Renovate supply-chain discussion](https://github.com/renovatebot/renovate/discussions/38070).

**Auto-merge policy:** Do not auto-merge anything. [Auto-merging Dependabot/Renovate PRs is how trivy-action got pwned.](https://blog.gitguardian.com/renovate-dependabot-the-new-malware-delivery-system/) Review each PR, even if it takes 90 seconds.

### Lockfile policy
- Commit `package-lock.json`. No exceptions.
- Enable `packageExtensions` trust scoping in Renovate to prevent `skipInstalls: true` + postinstall scripts bypass.
- `npm ci` in CI, not `npm install`.

### Postinstall scripts
A postinstall script runs arbitrary code on your machine when you `npm install`. That is the #1 supply-chain vector. Hardening:
- Set `npm config set ignore-scripts true` in CI.
- For local dev: `npm install --ignore-scripts` by default; `npm rebuild` only for packages you know need native build steps.
- Review the `scripts.postinstall` of every direct dependency once. For Expo's ecosystem, a handful are legit (sharp, native modules).

### Minimum audit cadence
- `npm audit --audit-level=high` in pre-commit hook.
- Review Renovate PRs weekly.
- Snyk free tier or GitHub Advanced Security scan on PRs.

---

## Q9 — Play Store privacy requirements 2026

### Data Safety form accuracy
Every Play-submitted app must keep the [Data Safety section](https://support.google.com/googleplay/android-developer/answer/10787469) accurate. For ShiftPay:

| Question | Correct answer |
|---|---|
| Does your app collect or share any user data? | **Yes** (photo upload for OCR, even if stateless) |
| Is data collected in transit? | **Yes, encrypted** (HTTPS + TLS) |
| Is data collected deleted on request? | **Not applicable — we store nothing** (but explain clearly) |
| Data types: photos? | **Yes, processed ephemerally for OCR, not stored** |
| Data types: location? | **No**, provided you actually strip EXIF (Q7) |
| Data types: financial info? | Tariff rates stay on device → **No** |

### Cleartext traffic
- Set `android:usesCleartextTraffic="false"` in `AndroidManifest.xml`.
- Add `res/xml/network_security_config.xml` that explicitly disallows cleartext and pins TLS to modern ciphers only. [Android docs.](https://developer.android.com/privacy-and-security/risks/cleartext-communications)
- Since Android 9 (API 28), cleartext is already disabled by default for `URLConnection`/`OkHttp` — double-check Expo's bundled `fetch` polyfill follows this. It does.

### Minimum TLS
- Target TLS 1.3 (default on Android 10+).
- Allow TLS 1.2 fallback for older devices — Supabase supports both.
- Consider certificate pinning for the OCR endpoint via [react-native-ssl-pinning](https://github.com/MaxToyberman/react-native-ssl-pinning). Tradeoff: pin rotation becomes a release dependency. For ShiftPay's threat model, probably not worth it — standard TLS trust is fine.

---

## Q10 — Android app hardening

### ProGuard / R8
Enable in `android/app/build.gradle` release block:
```
minifyEnabled true
shrinkResources true
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
```

And in `gradle.properties`:
```
android.enableR8.fullMode=true
```

R8 replaced ProGuard as default in AGP 3.4+ and is faster/better. [Medium explainer.](https://medium.com/@manishkumar_75473/proguard-vs-r8-in-android-complete-guide-to-code-shrinking-and-obfuscation-5a34a64adbb7)

### What obfuscation does NOT hide
String literals, including your API endpoint URL and (crucially) any fallback API key. ProGuard renames classes/methods, it does not encrypt strings. [DEV.to explainer.](https://dev.to/ajmal_hasan/react-native-code-obfuscation-4d04)

### Mitigations for string extraction
- Do not hardcode secrets. Use Play Integrity verdicts for real secrets.
- Split sensitive strings at build time (trivial obfuscation) only if you also use attestation.
- Move any genuinely secret logic server-side.

### Anti-tamper basics
- Enable `android:debuggable="false"` in release.
- Detect root/emulator with `react-native-device-info` or Play Integrity's `deviceRecognitionVerdict`.
- Do not build your own root detection; it is an arms race you will lose.

### JS bundle
- Hermes is enabled by default in Expo SDK 54. Hermes compiles JS to bytecode, which is a mild deterrent but **not encryption**. `hermes-dec` decompiles it in seconds.

---

## Q11 — Secrets in CI / GitHub Actions

Relevant for the keep-alive workflow and any future release automation.

### Fundamentals
- Use GitHub **environment**-scoped secrets, not repository-scoped, for anything prod. Protected environments add "required reviewers" gates. [GitHub docs.](https://docs.github.com/actions/security-guides/using-secrets-in-github-actions)
- Use OIDC to cloud providers where possible. For Supabase or Anthropic, they do not support OIDC — so you do need static tokens. Scope them minimally and rotate quarterly.
- [GitHub's 2026 security roadmap](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/) separates write access from secret management — follow suit in your own repos.

### Leak prevention
- **Never** `echo $SECRET` in a workflow step. GitHub masks known secrets, but string concatenation and partial logging break masking.
- Set `ACTIONS_STEP_DEBUG: false` (default).
- Pin all third-party actions to a **commit SHA**, not a tag. Tags are mutable; SHAs are not. `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` beats `actions/checkout@v4`.
- Add [step-security/harden-runner](https://github.com/step-security/harden-runner) as the first step — blocks egress to unknown hosts.

### Specific to ShiftPay
- Keep-alive workflow currently pings Supabase. It needs a service-role key — scope it to exactly the row/function it touches. If you can do it with the anon key, even better.
- Play Console MCP credentials should be in a separate environment `production-deploy`, not the default env.

---

## Q12 — Threat-model summary (revisited)

Map each mitigation to the adversary it actually blocks:

| Mitigation | Script kiddie | Scraper bot | Targeted attacker | Prompt injector | Regulator |
|---|---|---|---|---|---|
| Bundled API key | Blocks | Mostly blocks | No effect | No effect | No effect |
| Play Integrity | Blocks | Blocks | Slows | No effect | No effect |
| Per-IP rate limit | Blocks | Blocks (forces distributed) | Slows | No effect | No effect |
| EXIF strip | No effect | No effect | No effect | No effect | **Blocks GDPR exposure** |
| Magic number check | No effect | Blocks | Slows | **Blocks** bomb payloads | No effect |
| Output schema validation | No effect | No effect | No effect | **Blocks** | No effect |
| R8 / ProGuard | Slows extraction | Slows | No effect | No effect | No effect |
| Data Safety accuracy | No effect | No effect | No effect | No effect | **Blocks delisting** |
| Cleartext disabled | No effect | No effect | Slows MITM | No effect | **Blocks delisting** |
| Kill switch | Panic button | Panic button | Panic button | Panic button | No effect |

The model becomes: **Play Integrity + Upstash rate limits = the real defence.** Everything else is hygiene.

---

## Gotchas & Considerations

- **The `X-API-Key` is in your git history** if it was ever committed. Check and rotate if so.
- **Supabase invocation billing is pre-function.** Rate limiting saves Anthropic costs, not Supabase costs. Spending caps are the only hard backstop.
- **Play Integrity does not work on sideloaded or emulator APKs.** Your internal test track users will fail integrity checks unless you add a `__DEV__` bypass or configure the classic endpoint to allow development builds.
- **Valibot has no stable v1 schema migration tool** — if you migrate from hand-rolled, do it once, cover with tests, move on. Do not churn.
- **`expo-image-manipulator` on iOS** has historically had EXIF preservation quirks on some formats. Test before shipping.
- **Claude Vision prompt injection via image** is real but low-impact here: an adversarial photo can only affect the shift data returned, which the user will visually review on the `ShiftTable` anyway. Server-side schema validation catches the structural attacks.
- **Auto-merge for Renovate** feels productive but is the #1 supply-chain vector in 2024–2026. Never enable it for this project.
- **Android Keystore is hardware-backed on most devices 2020+**. Older devices fall back to software keystore. If you ever adopt HMAC signing, log which backing the device has.
- **`ALLOWED_ORIGINS` defaults to empty** in the current edge function — that is correct for mobile (no Origin header) but would reject a legit web client. If you ever ship web, remember to set it.
- **Error messages leak via timing.** The current `safeCompare` protects the API key, but a 401 vs 503 distinction tells an attacker "the key format was right, something else is missing." Consider returning identical 401s for all auth failures.

## Recommendations (prioritised)

1. **Immediately:** Re-enable client-side EXIF-stripping resize in `lib/api.ts`. This is the biggest privacy gap today.
2. **This week:** Add per-IP + global rate limiting via Upstash. Cheap insurance against an APK scrape.
3. **Next sprint:** Migrate server-side validation to Valibot (shared schema with client). Also add magic-number check on file upload.
4. **v2:** Wire Play Integrity with graceful degradation. Moves the API key from "authentication" to "obfuscation" honestly.
5. **Ongoing:** Renovate with `minimumReleaseAge: 7 days`, no auto-merge. Quarterly manual audit of direct dependencies.
6. **Before Play Store submission:** Verify Data Safety form matches actual behaviour. Enable R8 full mode. Add network security config. Document threat model in a short CONTRIBUTING or SECURITY.md.
7. **Do not:** Build HMAC request signing, certificate pinning, or custom root detection. They are complex, brittle, and do not move the needle for this threat model.

---

## Sources

1. [Expo — Environment variables docs](https://docs.expo.dev/guides/environment-variables/) — canonical statement that `EXPO_PUBLIC_` is visible in bundle.
2. [Expo — App Integrity docs](https://docs.expo.dev/versions/latest/sdk/app-integrity/) — official Expo library.
3. [Expo blog — Introducing App Integrity](https://expo.dev/blog/expo-app-integrity) — rationale and flow.
4. [Google — Play Integrity API overview](https://developer.android.com/google/play/integrity/overview) — Standard vs Classic, verdict fields.
5. [ProAndroidDev — Practical Play Integrity guide](https://proandroiddev.com/a-practical-guide-to-play-integrity-api-everything-you-need-to-implement-attestation-on-android-c010f0fc8f09) — server-side verification walk-through.
6. [Supabase — Rate limiting with Upstash](https://supabase.com/docs/guides/functions/examples/rate-limiting) — canonical pattern.
7. [Supabase — Edge Functions limits](https://supabase.com/docs/guides/functions/limits) — invocation budgets, billing semantics.
8. [Supabase — Logging docs](https://supabase.com/docs/guides/telemetry/logs) — structured log format.
9. [Supabase — Changelog](https://supabase.com/changelog) — March 2026 recursive-call rate limits.
10. [Valibot — Comparison guide](https://valibot.dev/guides/comparison/) — bundle size + perf claims.
11. [Pockit — Zod vs Valibot vs ArkType 2026](https://pockit.tools/blog/zod-valibot-arktype-comparison-2026/) — current landscape.
12. [Builder.io — Valibot bundle size](https://www.builder.io/blog/valibot-bundle-size) — 90% reduction demonstration.
13. [DEV — Zod v4 17x slower](https://dev.to/dzakh/zod-v4-17x-slower-and-why-you-should-care-1m1) — why to avoid Zod v4.
14. [Webhooks.fyi — Replay prevention](https://webhooks.fyi/security/replay-prevention) — nonce/timestamp patterns.
15. [GitGuardian — HMAC secrets explained](https://blog.gitguardian.com/hmac-secrets-explained-authentication/) — implementation guidance.
16. [Microsoft for Developers — Device-bound request signing](https://developer.microsoft.com/blog/securing-sensitive-mobile-operations-with-device-bound-request-signing) — when HMAC fits.
17. [PrivacyStrip — Social media metadata policies 2026](https://privacystrip.com/blog/social-media-metadata-policies/) — 80% GPS retention stat.
18. [MetaClean — Social Media EXIF comparison 2026](https://metaclean.app/blog/social-media-metadata-comparison-2026) — platform-level behaviours.
19. [Transloadit — Secure API uploads with magic numbers](https://transloadit.com/devtips/secure-api-file-uploads-with-magic-numbers/) — magic-number primer.
20. [DEV — Multer file-type validation is not safe](https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l) — MIME-type bypass demonstration.
21. [Theodo — Mastering file upload security](https://blog.theodo.com/2023/12/mastering-file-upload-security-by-understanding-file-types/) — defence in depth.
22. [Android Developers — Cleartext communications](https://developer.android.com/privacy-and-security/risks/cleartext-communications) — Network Security Config.
23. [Google Play Help — Data Safety section](https://support.google.com/googleplay/android-developer/answer/10787469) — current form requirements.
24. [DEV — React Native code obfuscation](https://dev.to/ajmal_hasan/react-native-code-obfuscation-4d04) — R8 limits on string literals.
25. [Medium — ProGuard vs R8 complete guide](https://medium.com/@manishkumar_75473/proguard-vs-r8-in-android-complete-guide-to-code-shrinking-and-obfuscation-5a34a64adbb7) — config specifics.
26. [GitGuardian — Renovate/Dependabot malware delivery](https://blog.gitguardian.com/renovate-dependabot-the-new-malware-delivery-system/) — auto-merge risk.
27. [Renovate discussion — Supply chain attacks](https://github.com/renovatebot/renovate/discussions/38070) — `minimumReleaseAge` pattern.
28. [GitHub docs — Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) — env scoping, OIDC.
29. [GitHub Blog — 2026 Actions security roadmap](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/) — separation of write vs secret access.
30. [Blacksmith — GitHub Actions secrets best practices](https://www.blacksmith.sh/blog/best-practices-for-managing-secrets-in-github-actions) — rotation cadence, OIDC.
31. [Claude API docs — Mitigate jailbreaks and prompt injection](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) — pre-screening with Haiku, structured outputs.
32. [OWASP — LLM Prompt Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) — generalised defences.
