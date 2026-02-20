# ShiftPay

Shift worker payroll auditor — take a photo of your timesheet, enter your own rates, find out if you've been paid correctly.

Bygget for The Vibe Coding Games 2026 (18-23 feb).

## Konsept

Shift workers (healthcare etc.) can't easily verify their pay. Systems are closed, history is limited to the last month, and complex supplements (night, weekend, holidays) make it impossible to audit.

ShiftPay lets you import timesheets (photo OCR / CSV / manual), set your own tariff rates, and get a calculated expected pay — so you can compare against your actual payslip.

**Vaktsporer-flyt:** Etter import planlegges lokale påminnelser (expo-notifications) ved slutten av hver vakt. Bruker får varsel: «Fullførte du vakten?» og kan bekrefte (ja/nei/overtid) fra varsel eller skjermen `confirm/[shiftId]`. Månedsoppsummering (`summary/[yearMonth]`) viser planlagt vs. faktisk tid og forventet lønn.

**First user:** Wife works in healthcare — validated, real problem.

## Arbeidsregler

- **Alltid produksjonsklart.** Aldri foreslå lokale workarounds. Sikt mot deploy-klar løsning i alt du gjør.
- **Plan først.** Ikke start implementasjon uten godkjent plan med todos.
- **Beslutningsdilemmaer FØR endring.** Ved veivalg: presenter alternativene til brukeren før du gjør noe.

## Beslutninger

| Beslutning | Valg | Begrunnelse |
|-----------|------|-------------|
| Platform | Android-app (Expo / React Native) | Mobil-first, Play Store |
| Språk | Engelsk (internasjonal) | Bredere rekkevidde |
| Auth | Ingen — ingen konto nødvendig | Lavere friksjon, enklere |
| Lagring | Lokal (expo-sqlite) | Personvern by design, GDPR-trivielt |
| Sky-sync | Ikke i MVP — opt-in i v2 | Brukeren eier sine data |
| OCR | Foto → Supabase Edge Function (Claude Haiku Vision) | Stateless, lagrer ingenting |
| Testing | Google Play Console (intern spor) + Google Groups | Rask distribusjon |
| Play Console | ✅ Konto finnes | |

## Personvernprinsipp

**All brukerdata lagres kun på enheten.** Backend er stateless — den mottar et bilde, returnerer strukturerte skiftdata, og lagrer ingenting. Ingen konto, ingen sky, ingen GDPR-hodepine. Valgfri sky-backup kan legges til i v2 som et aktivt brukervalg.

## Tech Stack

### App
- **Expo** (React Native + TypeScript)
- **Expo Router** (filbasert routing)
- **NativeWind** (Tailwind for React Native)
- **expo-sqlite** (all lokal lagring — satser, schedules, shifts)
- **expo-notifications** (lokale påminnelser ved vakt-slutt, deep link til bekrefte)
- **Expo Camera** (bilde av timeliste)
- **EAS Build** (bygg til Play Store)

### Backend (stateless OCR-prosessor)
- **Anbefalt: Supabase Edge Function** — `supabase/functions/ocr/` (Deno, Claude Haiku 4.5 Vision). Deploy: `supabase functions deploy ocr --no-verify-jwt` + secrets `ANTHROPIC_API_KEY` og `SHIFTPAY_API_KEY`. Krever `X-API-Key`-header for autentisering. Appen resizer bilder client-side (max 2048px, JPEG 85%) før upload.
- **Arkiv: FastAPI** i `backend/` — Tesseract + Claude Vision; kan brukes lokalt eller på Railway/Fly.io/Render hvis ønsket.
- **Ingen database** i backend — prosesserer og returnerer, lagrer ingenting.

## Prosjektstruktur

```
shiftpay/
  app/
    (tabs)/
      index.tsx           # Dashboard (neste vakt, ubekreftede, måned, uke)
      import.tsx          # OCR / CSV / manuell import
      settings.tsx        # Tilleggssatser
    period/[id].tsx       # Periodedetaljer (skift + bekrefte)
    confirm/[shiftId].tsx # Bekreft vakt (ja/nei/overtid)
    summary/[yearMonth].tsx # Månedsoppsummering
  components/
    ShiftTable.tsx        # Redigerbart skiftoversikt
    PaySummary.tsx        # Lønnsberegning
    RateSetup.tsx        # Sats-konfigurasjon
    ErrorBoundary.tsx     # Feilgrense for krasj
  lib/
    db.ts                 # expo-sqlite: schedules, shifts, tariff_rates
    calculations.ts       # Lønnsberegning
    api.ts                # OCR backend-klient
    notifications.ts      # Lokale påminnelser (expo-notifications)
    csv.ts                # CSV-parsing (fleksibel format)
backend/                  # FastAPI (arkiv, OCR kan kjøre lokalt)
  app/ocr/                # Tesseract + Claude Vision
```

## Database

**App (MVP):** Kun lokal lagring med expo-sqlite i `shiftpay/lib/db.ts`.

**Supabase (valgfri):** Samme schema finnes som migrasjon i `supabase/migrations/20260218000000_shiftpay_schema.sql`. Kjør i Supabase Dashboard → SQL Editor eller med `supabase db push` for å ha tabellene klare (f.eks. for sync i v2 eller MCP).

## Lokal database (expo-sqlite)

**All brukerdata ligger kun lokalt.** Supabase brukes kun til OCR (stateless); ingen vakter/skift lagres i skyen.

### tariff_rates
- `id` INTEGER PK
- `base_rate` REAL — grunnlønn per time
- `evening_supplement`, `night_supplement`, `weekend_supplement`, `holiday_supplement` REAL
- `updated_at` TEXT

### schedules
- `id` TEXT PK (uuid)
- `period_start` TEXT, `period_end` TEXT (f.eks. ISO eller dd.MM.yyyy)
- `source` TEXT (ocr / csv / manual)
- `created_at` TEXT

### shifts
- `id` TEXT PK (uuid)
- `schedule_id` TEXT FK → schedules.id
- `date` TEXT, `start_time` TEXT, `end_time` TEXT
- `shift_type` TEXT (tidlig / mellom / kveld / natt)
- `status` TEXT: `planned` | `completed` | `missed` | `overtime`
- `actual_start`, `actual_end` TEXT (valgfritt)
- `overtime_minutes` INTEGER, `confirmed_at` TEXT
- `created_at` TEXT

Migrering: eksisterende `timesheets` (JSON-skift) migreres én gang ved DB-init til `schedules` + `shifts`; deretter droppes `timesheets`.

## Fra ShiftSync gjenbrukes (backend/ arkiv)

- `ocr/processor.py` — Tesseract OCR for norsk vaktplan
- `ocr/vision_processor.py` — Claude Haiku Vision (produksjon bruker Supabase Edge Function)
- `ocr/confidence_scorer.py` — Confidence scoring
- Skiftklassifisering: tidlig (06-12), mellom (12-16), kveld (16-22), natt (22-06)
- Norsk måneds- og ukedagsparsing

## Env vars

### App (`shiftpay/.env`)
- `EXPO_PUBLIC_API_URL` — OCR-endepunkt: Supabase `https://<project-ref>.supabase.co/functions/v1/ocr`
- `EXPO_PUBLIC_OCR_API_KEY` — Delt API-nøkkel for OCR-autentisering

### Supabase secrets (`supabase secrets set`)
- `ANTHROPIC_API_KEY` — for Claude Haiku 4.5 Vision
- `SHIFTPAY_API_KEY` — Må matche `EXPO_PUBLIC_OCR_API_KEY` i appen
- `ALLOWED_ORIGINS` — (valgfri) Kommaseparerte tillatte CORS-origins for web-klienter

## Kjøre lokalt

**Windows:** Bruk `py` (ikke `python`) for Python.

```bash
# App
cd shiftpay && npm install && npx expo start

# OCR: Supabase Edge Function (anbefalt). Lokal: supabase functions serve ocr --env-file supabase/.env.local
# Python-backend (valgfritt): py -m pip install -r backend/requirements.txt, deretter
#   $env:PYTHONPATH = "backend"; py -m uvicorn app.main:app --reload --port 8000 --host 127.0.0.1
```

## 5-dagers plan

| Dag | Fokus |
|-----|-------|
| 1 | Expo scaffold, Supabase auth, backend fork |
| 2 | Sats-oppsett, OCR-flyt, lønnsberegning |
| 3 | Historikkvisning, lokal lagring |
| 4 | CSV-import, polish, EAS build |
| 5 | Play Console intern testing, bugfiks, demo |

## Konkurranse

- **Event:** The Vibe Coding Games 2026 (18-23 feb)
- **Kategorier:** Best Business Use Case, Best Internal Tool
- **Bedømmes på:** Kreativitet, traction, problemløsning, UX, design, vibe
