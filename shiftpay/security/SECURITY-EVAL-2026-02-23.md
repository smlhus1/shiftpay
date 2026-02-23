# Security Evaluation: ShiftPay (Re-eval)

> Evaluert: 2026-02-23
> Forrige eval: 2026-02-20 (Risk Level: HIGH)
> Scope: Hele prosjektet (shiftpay/ app + supabase/functions/ocr/ backend)
> Stack: Expo 54 / React Native 0.81.5 / TypeScript / Supabase Edge Function (Deno) / Claude Haiku 4.5 Vision
> Rapporter: `security/00-recon.md`, `security/01-code-audit.md`, `security/02-dep-config-scan.md`, `security/03-attack-scenarios.md`

## Risk Level: 🟡 Moderat (ned fra 🟠 Hoy)

## Oppsummering

ShiftPay har gjort solid fremgang siden forrige eval. Alle 9 kritiske og hoye funn fra 20. feb er korrekt fikset: API-key auth, CORS-restriksjon, schema-validering av LLM-output, feilmelding-sanitering, kryptografisk UUID-generering, input-clamping, og deep link-validering. Den storste gjenstaende risikoen er **kostnadsmisbruk via OCR-endepunktet** — API-nokkelen er ekstraherbar fra APK (EXPO_PUBLIC_), og det finnes ingen rate limiting. I tillegg har auth-designet en "fail open"-feil der slettet SHIFTPAY_API_KEY gjor endepunktet helt apent. For en lokal-forst app med stateless backend er den generelle sikkerhetsprofilen god.

## Threat Model

- **Apptype:** Mobil lonnsauditor for skiftarbeidere. Lokal-only datalagring, stateless OCR-backend.
- **Sensitive data:** ANTHROPIC_API_KEY (finansiell), OCR API key (ekstraherbar fra APK), lokalt lagrede lonnssatser og arbeidsmonstre.
- **Angrepsoverflate:** OCR Edge Function (auth-gated men nokkel i APK), CSV-import, deep links, lokal SQLite, Android Auto Backup.
- **Regulatorisk kontekst:** GDPR-trivielt pga. lokal-only lagring. Ingen PCI-DSS.

## Funn Oversikt

| Severity | Kode-audit | Dependencies | Config | Totalt |
|----------|-----------|--------------|--------|--------|
| 🔴 Critical | 0 | 0 | 0 | **0** |
| 🟠 High | 1 | 0 | 0 | **1** |
| 🟡 Medium | 4 | 0 | 0 | **4** |
| 🟢 Low | 3 | 0 | 0 | **3** |

npm audit: 19 high (alle build-time `minimatch` ReDoS — null produksjonsrisiko, uendret fra forrige eval).

### Endring fra forrige eval

| | 2026-02-20 | 2026-02-23 |
|---|-----------|-----------|
| 🔴 Critical | 1 | **0** |
| 🟠 High | 4 | **1** |
| 🟡 Medium | 5 | **4** |
| 🟢 Low | 4 | **3** |
| Risk Level | 🟠 Hoy | 🟡 Moderat |

## 🟠 Hoyt prioritert funn

### 1. Ingen rate limiting pa OCR-endepunkt + API-nokkel i APK

**Fil:** `supabase/functions/ocr/index.ts` + `.env:2`
**STRIDE:** Denial of Service (finansiell)

API-nokkelen (`EXPO_PUBLIC_OCR_API_KEY`) er bundlet som cleartext i APK via Expo sin `EXPO_PUBLIC_`-mekanisme. Hvem som helst kan ekstrahere den med `apktool` pa 10 minutter. Kombinert med null rate limiting kan angriperen sende tusenvis av autentiserte OCR-requests. Hvert kall koster ~$0.01-0.03 i Claude API — 10 000 requests = ~$500.

**Fix (2 steg):**
1. **Umiddelbart:** Sett billing-cap i Anthropic Dashboard (5 min, ingen kode)
2. **Denne uken:** Implementer in-memory rate limiter i Edge Function (10 req/min per IP)

## 🟡 Medium funn

### 2. Auth bypass nar SHIFTPAY_API_KEY ikke er satt

**Fil:** `supabase/functions/ocr/index.ts:77`

`if (appApiKey)` hopper over hele auth-blokken nar secret mangler. Hvis nokkelen slettes (f.eks. under rotasjon), blir endepunktet helt apent. Dett er spesielt farlig fordi det er den naturlige hendelsesresponsen ved kompromittering som trigger det.

**Fix:**
```typescript
const appApiKey = Deno.env.get("SHIFTPAY_API_KEY");
if (!appApiKey) {
  return jsonResponse({ detail: "Service unavailable" }, 503, req);
}
```

### 3. Timing attack pa API key-sammenligning

**Fil:** `supabase/functions/ocr/index.ts:79`

`!==` er ikke konstant-tid. Lav praktisk risiko pa edge functions, men enkel fix.

**Fix:** HMAC-basert konstant-tid-sammenligning (se `01-code-audit.md`).

### 4. OCR API key mangler i EAS build config

**Fil:** `eas.json`

`EXPO_PUBLIC_OCR_API_KEY` er ikke i EAS env. EAS cloud builds vil mangle nokkelen.

**Fix:** `eas secret:create --name EXPO_PUBLIC_OCR_API_KEY --value <nokkel> --scope project`

### 5. android:allowBackup="true"

**Fil:** `android/app/src/main/AndroidManifest.xml:18`

SQLite med lonnsdata inkluderes i Android Auto Backup. Bryter privacy-by-design-prinsippet.

**Fix:** Sett `android:allowBackup="false"`.

## Angrepskjeder

### Kjede A: APK-ekstraksjon → kostnadsmisbruk (HIGH)

**Funn:** API-nokkel i APK + ingen rate limiting + auth bypass ved sletting.
Angriperen pakker ut APK, finner nokkelen, kjorer parallelscript. $150 pa 10 min, $1400+ over natten. Hvis eieren roterer nokkel og glemmer re-setting → endepunktet apner seg helt.

### Kjede B: Stille auth-bypass under hendelsesrespons (HIGH)

**Funn:** Auth bypass + kompromittert nokkel.
Eier sletter kompromittert SHIFTPAY_API_KEY → endepunktet blir aapent → verre enn for. "Fixen gjor vondt verre."

### Kjede C: Gammel Supabase-URL + timing-angrep (MEDIUM)

**Funn:** Gammel prosjekt-URL i git-historikk + timing attack. Teoretisk — lav praktisk sannsynlighet.

## Dependency-status

- **Kjente CVEer:** 19 high (minimatch ReDoS, build-time only — null produksjonsrisiko)
- **Secrets funnet:** Ingen hardkodede i kildekode. `.env` aldri committet.
- **Config-problemer:** `.env` ikke i shiftpay/.gitignore (dekket av parent), auth bypass ved manglende secret

## Hva som er bra

1. **Alle 9 funn fra forrige eval fikset** — Solid oppfolging, korrekt implementert
2. **Parameteriserte SQL-queries overalt** — Null SQL injection-risiko
3. **Dobbel schema-validering av LLM-output** — Server + klient regex-validering
4. **Kryptografisk UUID-generering** — expo-crypto getRandomValues()
5. **Generiske feilmeldinger** — Aldri interne detaljer til klient
6. **Origin-basert CORS** — Ingen wildcard, mobilapp upavirket
7. **Deep link UUID-validering** — Regex-sjekk for routing
8. **Input clamping** — Tariff rates >= 0 pa bade UI og DB
9. **Filstorrelse + MIME-validering** — 5MB cap, kun JPEG/PNG
10. **Transaksjonell batch-insert** — Atomisk schedule+shifts-lagring
11. **Dev-only logging** — console.log bak __DEV__-guard
12. **Clean dependency split** — expo-dev-client i devDependencies

## Handlingsplan

### Umiddelbart (i dag)

1. [ ] **Sett billing-cap i Anthropic Dashboard** — 5 min — Dashboard > Settings > Limits
2. [ ] **Fiks auth bypass** — 5 min — `supabase/functions/ocr/index.ts:76-82`: erstatt `if (appApiKey)` med `if (!appApiKey) return 503`
3. [ ] **Deploy OCR-fix** — 2 min — `supabase functions deploy ocr --no-verify-jwt`

### Denne uken

4. [ ] **Rate limiting pa OCR** — 30 min — In-memory rate limiter i Edge Function (10 req/min/IP)
5. [ ] **Timing-safe key comparison** — 15 min — HMAC-basert sammenligning i OCR-endepunkt
6. [ ] **Sett allowBackup="false"** — 5 min — `android/app/src/main/AndroidManifest.xml`
7. [ ] **Legg .env til shiftpay/.gitignore** — 2 min
8. [ ] **Fjern stale permissions med tools:node="remove"** — 10 min — AndroidManifest.xml

### Planlegg inn

9. [ ] **Sett OCR-nokkel i EAS Secrets** — 5 min — `eas secret:create`
10. [ ] **UUID-validering i period/[id].tsx** — 5 min
11. [ ] **Verifiser gammel Supabase-prosjekt er deaktivert** — 5 min

### Akseptert risiko

12. [ ] **EXPO_PUBLIC_OCR_API_KEY i APK** — Arkitektonisk begrensning. Mitigert med billing-cap + rate limiting + rotasjonsplan.
13. [ ] **minimatch ReDoS (19 npm audit high)** — Build-time only, null produksjonsrisiko.

## Vedlegg

- `security/00-recon.md` — Reconnaissance & threat model (re-eval)
- `security/01-code-audit.md` — Full kode-audit (8 funn, 9 verifikasjoner)
- `security/02-dep-config-scan.md` — Dependency & config scan
- `security/03-attack-scenarios.md` — Angrepsscenarier (4 individuelle + 3 kjeder)
- `security/SECURITY-EVAL-2026-02-20.md` — Forrige eval (referanse)
