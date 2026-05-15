# Hva jeg kan kjøre automatisk via ASC API

Når du gir grønt lys, kan jeg kjøre disse oppgavene direkte mot App Store Connect API uten at du må klikke i ASC-UI. Tid: ~15 minutter totalt.

---

## 1. Lage / oppdatere App Store Version 1.1.0

- Slett eller arkiver 1.0-placeholder
- Opprett ny `appStoreVersion` med `versionString = "1.1.0"`, `platform = IOS`, `releaseType = MANUAL`
- Returnerer nytt version-ID som brukes nedover

**API:** `POST /v1/appStoreVersions`

## 2. Koble Build 8 til versjon 1.1.0

- Setter `relationships.build = build 8` på versjonen

**API:** `PATCH /v1/appStoreVersions/{id}`

## 3. Fylle inn alle tekstfelt for en-US

- App-navn → "ShiftPay"
- Subtitle → "Verify your shift pay"
- Promotional Text → fra `01-metadata-en-US.md`
- Description → fra `01-metadata-en-US.md`
- Keywords → fra `01-metadata-en-US.md`
- What's New → fra `01-metadata-en-US.md`
- Marketing URL → `https://shiftpay.no`
- Support URL → `https://shiftpay.no#kontakt`

**API:** `POST` ny `appStoreVersionLocalization` (eller `PATCH` eksisterende)

## 4. Sette app-level Privacy Policy URL

**API:** `PATCH /v1/appInfoLocalizations/{id}` med `privacyPolicyUrl`

## 5. Sette kategorier (Primary = Finance, Secondary = Productivity)

**API:** `PATCH /v1/appInfos/{id}` med relationships til de to category-objektene

## 6. Sette Copyright

- "2026 Stian Melhus"

**API:** Del av `appStoreVersion`-payload

## 7. Sette Content Rights Declaration

- "USES_THIRD_PARTY_CONTENT = false" (alt innhold er eget)

**API:** `PATCH /v1/apps/{id}`

## 8. (Hvis tilgjengelig) Sette Pricing til Free, alle territorier

- `priceTier = 0`, `availableInNewTerritories = true`

**API:** Egne pricing-endepunkter (denne er litt mer ustabil)

---

## Hva jeg IKKE kan kjøre via API (krever deg manuelt i ASC)

### Sterk regel — Apple låser disse til UI:

- **App Privacy nutrition label** (svarene fra `02-app-privacy.md`)
   Apple's API støtter ikke alle nutrition-felter; må fylles ut i ASC-UI én gang. Etter det kan oppdateringer gjøres delvis via API.

- **Age Rating questionnaire** (svarene fra `03-age-rating.md`)
   Krever interaktiv flow med "Begin" → 30 spørsmål → submit. Ikke API-eksponert.

- **Sign-in with Apple-erklæring** (vi velger "ingen sign-in" → trivielt)

### Praktisk — krever filer du må generere først:

- **Screenshot-opplasting** — jeg kan opplaste når filene finnes i `screenshots-target/`. Jeg har API for hele flowen (presigned upload → SHA256 verify → finalize), men trenger ferdig­dimensjonerte filer.

- **App Review Information** (notatene fra `04-app-review-info.md`)
   Kan delvis API-es, men "Demo Account"-feltet og "Sign-in Required"-toggelen er trygere å sette i UI for å unngå formatfeil.

---

## Forslag — to scenarier å velge mellom

### Scenario A: "Kjør alt API-en kan nå"

Jeg setter i gang punktene 1–7 over. Du logger inn i ASC etterpå og:
1. Svarer på App Privacy questionnaire (5 min — bruk `02-app-privacy.md` som mal)
2. Svarer på Age Rating questionnaire (3 min — bruk `03-age-rating.md` som mal)
3. Limer inn App Review Information (2 min)
4. Laster opp screenshots når du har dem
5. Trykker Submit for Review

Estimat: 10 min API-arbeid hos meg + 10 min manuelt hos deg + screenshots = klar for review

### Scenario B: "Jeg vil se prøvene først"

Jeg viser hver API-endring som JSON-payload og venter på OK før jeg sender. Trygt men tregt — du trenger sannsynligvis ~30 min ekstra for å lese gjennom.

Si fra hvilket scenario du vil ha.
