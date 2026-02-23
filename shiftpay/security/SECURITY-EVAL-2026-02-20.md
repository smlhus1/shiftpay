# Security Evaluation: ShiftPay

> Evaluert: 2026-02-20
> Scope: Hele prosjektet (shiftpay/ app + supabase/functions/ocr/ backend)
> Stack: Expo 54 / React Native 0.81.5 / TypeScript / Supabase Edge Function (Deno) / Claude Haiku 4.5 Vision
> Rapporter: `security/00-recon.md`, `security/01-code-audit.md`, `security/02-dep-config-scan.md`, `security/03-attack-scenarios.md`

## Risk Level: 🟠 Hoy

## Oppsummering

ShiftPay har en solid lokal-only arkitektur som minimerer de fleste typiske sikkerhetsrisikoer (ingen brukerkontoer, ingen skylagring, parametrisert SQL overalt). Det mest kritiske funnet er at **OCR-endepunktet er helt aapent paa internett** — ingen autentisering, ingen rate limiting, ingen CORS-begrensning — noe som gir hvem som helst gratis tilgang til aa brenne gjennom Anthropic API-kreditten din. Dette inngaar i alle tre identifiserte angrepskjeder. I tillegg mangler schema-validering av AI-generert output, og feilmeldinger lekker intern informasjon. Utover OCR-endepunktet er kodebasen overraskende solid for et hackathon-prosjekt.

## Threat Model

- **Apptype:** Mobil loennsauditor for skiftarbeidere. Lokal-only datalagring, stateless OCR-backend.
- **Sensitive data:** ANTHROPIC_API_KEY (direkte finansiell), timesheet-bilder under transit (kan inneholde PII), lokalt lagrede loennssatser og arbeidsmonstre.
- **Angrepsoverflate:** OCR Edge Function (internett-eksponert, uautentisert), CSV-import, deep links, lokal SQLite.
- **Regulatorisk kontekst:** GDPR-trivielt pga. lokal-only lagring. Ingen PCI-DSS.

## Funn Oversikt

| Severity | Kode-audit | Dependencies | Config | Totalt |
|----------|-----------|--------------|--------|--------|
| 🔴 Critical | 1 | 0 | 0 | **1** |
| 🟠 High | 3 | 0 | 1 | **4** |
| 🟡 Medium | 5 | 0 | 0 | **5** |
| 🟢 Low | 4 | 0 | 0 | **4** |

npm audit: 19 high (alle build-time `minimatch` ReDoS, null produksjonsrisiko).

## 🔴 Kritiske Funn (fix FOR deploy)

### 1. OCR-endepunkt har null autentisering — kostnadsmisbruk

**Fil:** `supabase/functions/ocr/index.ts` (hele endepunktet)
**STRIDE:** Denial of Service / Elevation of Privilege

Endepunktet er deployet med `--no-verify-jwt`, har ingen API-noekkel, ingen rate limiting, og CORS `*`. En angriper finner URL-en ved aa dekompilere APK-en med `apktool` (URL er bundlet via `EXPO_PUBLIC_`), og kjorer et enkelt curl-script med 50 parallelle requests med 4.9MB bilder. Resultatet er hundrevis av USD i Anthropic-regninger.

**Angrepskjede:** Inngaar i alle 3 identifiserte kjeder (Chain 1: APK reverse -> open endpoint -> cost abuse, Chain 2: prompt injection -> schema bypass -> corrupt data, Chain 3: error probing -> timed attack).

**Fix:**
```typescript
// I supabase/functions/ocr/index.ts — legg til etter method-check:
const APP_SECRET = Deno.env.get("SHIFTPAY_API_KEY");
if (APP_SECRET) {
  const provided = req.headers.get("x-api-key");
  if (provided !== APP_SECRET) {
    return jsonResponse({ detail: "Unauthorized" }, 401);
  }
}
```

Sett `SHIFTPAY_API_KEY` via `supabase secrets set`. I appen: send nokkelen som header (lagre som EAS Secret, **IKKE** `EXPO_PUBLIC_`). Sett ogsaa billing-cap i Anthropic Dashboard som sikkerhetsnett.

## 🟠 Hoy Prioritet (fix snart)

### 2. Ingen schema-validering av AI-generert OCR-output
**Fil:** `supabase/functions/ocr/index.ts:138-154`
**STRIDE:** Tampering

JSON.parse paa Claudes respons uten validering av dato/tid-format eller shift_type-enum. Prompt injection via bilde kan produsere vilkaarlige feltverdier. Fix: Legg til regex-validering foer shifts returneres.

### 3. Feilmeldinger lekker intern info til klient
**Fil:** `supabase/functions/ocr/index.ts:165-168`
**STRIDE:** Information Disclosure

Anthropic SDK-feilmeldinger (modell-ID, rate-limit-status, kontotilstand) sendes direkte til klienten. Fix: Erstatt med generisk melding, behold console.error for serverlogger.

### 4. CORS wildcard
**Fil:** `supabase/functions/ocr/index.ts:43-47`
**STRIDE:** Spoofing

`Access-Control-Allow-Origin: *` lar enhver nettside sende POST til OCR. Kombinert med manglende auth muliggjor distribuert misbruk via besoekendes nettlesere. Fix: Fjern CORS-headere helt (mobilapp sender ikke Origin), eller begrens til spesifikke domener.

### 5. OCR-endepunkt mangler rate limiting
**Fil:** Supabase config
Ingen throttling paa Edge Function. Fix: Aktiver Supabase built-in rate limiting i Dashboard, eller legg til IP-basert throttling med Deno KV.

## Angrepskjeder

### Chain 1: APK Reverse -> Open Endpoint -> Cost Abuse (CRITICAL)
**Funn:** FINDING-01 + 04 + 09 | `EXPO_PUBLIC_API_URL` er klartekst i APK-bundlen -> ingen auth paa endpoint -> CORS `*` muliggjor nettleser-basert misbruk -> massiv API-regning.

### Chain 2: Prompt Injection -> Schema Bypass -> Corrupt Data (HIGH)
**Funn:** FINDING-01 + 02 + 11 | Spesiallaget bilde til aapent endpoint -> Claude returnerer manipulerte shifts -> ingen schema-validering -> ingen client-validering -> korrupte loennsberegninger i brukerens app.

### Chain 3: Error Probing -> Intelligence -> Timed Attack (HIGH)
**Funn:** FINDING-03 + 01 + 04 | Malformede requests avslorer API-kontostatus via lekkede feilmeldinger -> angriperen timer cost-attack for maksimal skade.

## Dependency-status

- **Kjente CVEer:** 19 high (alle `minimatch` ReDoS, build-time only — null produksjonsrisiko)
- **CVE-2025-11953:** Kritisk RCE i React Native Community CLI — **ikke pavirket** (Expo bruker `@expo/cli`)
- **Secrets funnet:** Ingen hardkodede secrets i aktiv kode. `backend/.env` har tom API-nokkel (arkivert)
- **Config-problemer:** `.env` ikke eksplisitt i `shiftpay/.gitignore` (reddet av parent gitignore)

## Hva som er bra

1. **Parameteriserte SQL-queries overalt** — Null string concatenation for SQL. Solid injection-beskyttelse.
2. **Privacy by design** — All data lokal, ingen kontoer, ingen skylagring. GDPR-trivielt.
3. **Console.log bak __DEV__-guard** — Nesten all debug-logging korrekt innpakket.
4. **Robust CSV-validering** — `csv.ts` validerer dato, tid, gir per-rad feilmeldinger, dropper ingen data stille.
5. **Filstorrelsesvalidering** — OCR sjekker max 5MB og MIME-type foer API-kall.
6. **HTTP timeout** — 30s AbortController paa OCR-kall forhindrer hengende app.
7. **Transaksjonell batch-insert** — Atomisk schedule+shifts-lagring via `withTransactionAsync`.
8. **Overnight shift-haandtering** — `shiftDurationHours` haandterer nattskift korrekt.

## Handlingsplan

### Umiddelbart (i dag)

1. [ ] **Sett billing-cap i Anthropic Dashboard** — 5 min — Sikkerhetsnett mot kostnadsmisbruk uavhengig av kodefix
2. [ ] **Legg til API-key auth paa OCR-endepunktet** — 30 min — `supabase/functions/ocr/index.ts` + `supabase secrets set SHIFTPAY_API_KEY=...` + oppdater `lib/api.ts` til aa sende header
3. [ ] **Sanitiser feilmeldinger** — 5 min — `supabase/functions/ocr/index.ts:165-168`
4. [ ] **Legg `.env` til `shiftpay/.gitignore`** — 2 min — `shiftpay/.gitignore`

### Denne uken

5. [ ] **Schema-validering av OCR-output** — 30 min — `supabase/functions/ocr/index.ts:138-154`
6. [ ] **Client-side OCR response-validering** — 15 min — `lib/api.ts:62`
7. [ ] **Fjern CORS-headere eller begrens** — 10 min — `supabase/functions/ocr/index.ts:43-47`
8. [ ] **Bytt Math.random() til crypto.getRandomValues()** — 15 min — `lib/db.ts:216-222`
9. [ ] **Guard fallback URL med __DEV__** — 5 min — `lib/api.ts:7-11`

### Planlegg inn

10. [ ] **Input-validering paa tariff rates** — 15 min — `settings.tsx` + `lib/db.ts`
11. [ ] **UUID-validering paa deep link params** — 10 min — `app/confirm/[shiftId].tsx`
12. [ ] **ErrorBoundary: generisk melding i prod** — 10 min — `components/ErrorBoundary.tsx`
13. [ ] **console.warn __DEV__ guard** — 2 min — `app/_layout.tsx:41`

### Vurder paa sikt

14. [ ] **SQLite-kryptering** — SQLCipher eller felt-kryptering for loennssatser
15. [ ] **Rate limiting paa Edge Function** — Supabase Dashboard eller Deno KV
16. [ ] **npm audit overrides for minimatch** — Kun relevant hvis CI/CD innfores

## Vedlegg

- `security/00-recon.md` — Reconnaissance & threat model
- `security/01-code-audit.md` — Full kode-audit (13 funn med STRIDE-tagging)
- `security/02-dep-config-scan.md` — Dependency & config scan (npm audit, secrets, config)
- `security/03-attack-scenarios.md` — Angrepsscenarier (5 individuelle + 3 kjeder)
