# ShiftPay

Shift worker payroll auditor — take a photo of your timesheet, enter your own rates, find out if you've been paid correctly.

Bygget for The Vibe Coding Games 2026 (18-23 feb).

## Konsept

Shift workers (healthcare etc.) can't easily verify their pay. Systems are closed, history is limited to the last month, and complex supplements (night, weekend, holidays) make it impossible to audit.

ShiftPay lets you import timesheets (photo OCR / CSV / manual), set your own tariff rates, and get a calculated expected pay — so you can compare against your actual payslip.

**First user:** Wife works in healthcare — validated, real problem.

## Beslutninger

| Beslutning | Valg | Begrunnelse |
|-----------|------|-------------|
| Platform | Android-app (Expo / React Native) | Mobil-first, Play Store |
| Språk | Engelsk (internasjonal) | Bredere rekkevidde |
| Auth | Ingen — ingen konto nødvendig | Lavere friksjon, enklere |
| Lagring | Lokal (expo-sqlite) | Personvern by design, GDPR-trivielt |
| Sky-sync | Ikke i MVP — opt-in i v2 | Brukeren eier sine data |
| OCR | Foto → stateless FastAPI backend | Lagrer ingenting, prosesserer og returnerer |
| Testing | Google Play Console (intern spor) + Google Groups | Rask distribusjon |
| Play Console | ✅ Konto finnes | |

## Personvernprinsipp

**All brukerdata lagres kun på enheten.** Backend er stateless — den mottar et bilde, returnerer strukturerte skiftdata, og lagrer ingenting. Ingen konto, ingen sky, ingen GDPR-hodepine. Valgfri sky-backup kan legges til i v2 som et aktivt brukervalg.

## Tech Stack

### App
- **Expo** (React Native + TypeScript)
- **Expo Router** (filbasert routing)
- **NativeWind** (Tailwind for React Native)
- **expo-sqlite** (all lokal lagring — satser, historikk, skift)
- **Expo Camera** (bilde av timeliste)
- **EAS Build** (bygg til Play Store)

### Backend (stateless OCR-prosessor)
- **Alternativ 1: Render** (Docker) — `render.yaml` + `backend/Dockerfile`. Tesseract + Vision. Koble repo i Render, sett env vars (SECRET_SALT, valgfri OPENAI_API_KEY, ALLOWED_ORIGINS).
- **Alternativ 2: Supabase Edge Function** — `supabase/functions/ocr/` (Deno, kun OpenAI Vision). Deploy: `supabase functions deploy ocr` + secret `OPENAI_API_KEY`.
- **Alternativ 3:** **FastAPI** i `backend/` — Railway, Fly.io eller egen server med Dockerfile.
- **Ingen database** i backend — prosesserer og returnerer, lagrer ingenting.

## Prosjektstruktur

```
app/                      # Expo Router pages
  (tabs)/
    index.tsx             # Dashboard / historikk
    import.tsx            # OCR / CSV / manuell import
    settings.tsx          # Tilleggssatser oppsett
components/
  ShiftTable.tsx          # Redigerbart skiftoversikt
  PaySummary.tsx          # Lønnsberegning
  RateSetup.tsx           # Sats-konfigurasjon
lib/
  db.ts                   # expo-sqlite oppsett og queries
  calculations.ts         # Lønnsberegningslogikk
  api.ts                  # OCR backend-klient
backend/                  # FastAPI (forket fra ShiftSync)
  app/
    ocr/                  # Kopiert fra ShiftSync
    api/
```

## Database

**App (MVP):** Kun lokal lagring med expo-sqlite i `shiftpay/lib/db.ts`.

**Supabase (valgfri):** Samme schema finnes som migrasjon i `supabase/migrations/20260218000000_shiftpay_schema.sql`. Kjør i Supabase Dashboard → SQL Editor eller med `supabase db push` for å ha tabellene klare (f.eks. for sync i v2 eller MCP).

## Lokal database (expo-sqlite)

### tariff_rates
- `id` INTEGER PK
- `base_rate` REAL — grunnlønn per time
- `evening_supplement` REAL
- `night_supplement` REAL
- `weekend_supplement` REAL
- `holiday_supplement` REAL
- `updated_at` TEXT

### timesheets
- `id` TEXT PK (uuid)
- `period_start` TEXT (ISO date)
- `period_end` TEXT (ISO date)
- `shifts` TEXT (JSON)
- `expected_pay` REAL
- `source` TEXT (ocr / csv / manual)
- `created_at` TEXT

## Fra ShiftSync gjenbrukes

- `ocr/processor.py` — Tesseract OCR for norsk vaktplan
- `ocr/vision_processor.py` — GPT-4o Vision
- `ocr/confidence_scorer.py` — Confidence scoring
- Skiftklassifisering: tidlig (06-12), mellom (12-16), kveld (16-22), natt (22-06)
- Norsk måneds- og ukedagsparsing

## Env vars

### App
- `EXPO_PUBLIC_API_URL` — OCR-endepunkt: Supabase `https://<project-ref>.supabase.co/functions/v1/ocr` eller Python-backend `http://...:8000/api/ocr`

### Backend
- `OPENAI_API_KEY` — for GPT-4o Vision
- `SECRET_SALT` — rate limiting / request signing

## Kjøre lokalt

**Windows:** Bruk `py` (ikke `python`) for Python.

```bash
# App
cd shiftpay && npm install && npx expo start

# OCR: enten Supabase Edge Function (anbefalt) eller Python
# Supabase: supabase functions serve ocr --env-file supabase/.env.local
# Python: fra prosjektrot: py -m pip install -r backend/requirements.txt, deretter
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
