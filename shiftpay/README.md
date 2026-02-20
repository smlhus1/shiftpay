# ShiftPay

**Snap your timesheet. Set your rates. See if you got paid right.**

Mobile app for shift workers (healthcare, retail, hospitality) who want to **audit their pay**. Take a photo of your schedule, enter your own tariff rates, and get a calculated expected pay to compare with your actual payslip. No account, no cloud storage of your data.

---

## What it does

- **Import** — Photo (OCR), CSV, or manual entry
- **Rates** — Base pay + evening, night, weekend, holiday supplements
- **Expected pay** — "You should have received: X" before the payslip lands
- **Shift tracker (vaktsporer)** — After each shift: local reminder "Did you work it?"; confirm yes / no / overtime; monthly summary (planned vs actual, expected pay)
- **History** — All periods and shifts stored locally (expo-sqlite)

Data stays on device. OCR is stateless and API-key authenticated (Supabase Edge Function or optional Python backend).

---

## Tech (this repo)

| | Stack |
|---|--------|
| **App** | Expo (React Native + TypeScript), Expo Router, NativeWind, expo-sqlite, expo-notifications, EAS Build |
| **OCR** | Supabase Edge Function (Claude Haiku Vision). Optional: `../backend/` FastAPI. |

- **Env:** `EXPO_PUBLIC_API_URL` → OCR endpoint, `EXPO_PUBLIC_OCR_API_KEY` → shared API key. Both set in `shiftpay/.env`.

---

## Quick start

```bash
npm install
npx expo start
```

Then: open in Expo Go (QR) or run **dev build** with `npx expo run:android` / `npx expo run:ios`.  
With dev build: start Metro (`npx expo start`), then open the installed app and connect to the dev server.

**OCR:** Deploy Supabase function and set secrets:
```bash
supabase functions deploy ocr --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-... SHIFTPAY_API_KEY=<random-hex>
```
Then set matching key in `shiftpay/.env`:
```
EXPO_PUBLIC_API_URL=https://<project>.supabase.co/functions/v1/ocr
EXPO_PUBLIC_OCR_API_KEY=<same random-hex>
```

---

## Project layout (this folder)

```
shiftpay/
  app/
    (tabs)/index.tsx, import.tsx, settings.tsx
    period/[id].tsx, confirm/[shiftId].tsx, summary/[yearMonth].tsx
  components/
  lib/
    db.ts        # expo-sqlite: schedules, shifts, tariff_rates
    calculations.ts, api.ts, notifications.ts, csv.ts, dates.ts
```

Full schema, run commands, and AI context: see **CLAUDE.md** in this folder.

---

## Privacy

All user data (rates, schedules, shifts) is stored **only on the device**. OCR receives an image and returns shifts; it does not store images or personal data.

---

Built for [The Vibe Coding Games 2026](https://www.thevibecodinggames.com).  
Root repo: `../` (CLAUDE.md, ROADMAP.md, backend, supabase).
