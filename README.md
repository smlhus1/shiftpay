# ShiftPay

**Snap your timesheet. Set your rates. See if you got paid right.**

ShiftPay is a mobile app for shift workers (healthcare, retail, hospitality) who want to **audit their pay** without fighting closed payroll systems. Take a photo of your schedule, enter your own tariff rates, and get a calculated “you should have received: **X**” — then compare with your actual payslip.

No account. No cloud storage of your data. Just you, your phone, and the numbers.

---

## Why this exists

Shift workers often can’t verify their pay: employer systems are closed, history is short, and supplements (night, weekend, holiday) make mental math impossible. **ShiftPay** was validated with a real user: a healthcare worker who needed exactly this. The problem is real; the app is the answer.

---

## What it does

- **Import timesheets** — Photo (OCR), CSV, or manual entry
- **Your rates** — Base pay + evening, night, weekend, holiday supplements
- **Expected pay** — “You should have received: X” before the payslip lands
- **History** — All periods stored locally on your device

Everything stays on the device. The OCR backend is stateless: it receives an image, returns structured shifts, stores nothing.

---

## Tech

| Part | Stack |
|------|--------|
| **App** | Expo (React Native + TypeScript), Expo Router, NativeWind, expo-sqlite, EAS Build |
| **OCR backend** | Python (FastAPI) with Tesseract + optional GPT-4o Vision, or Supabase Edge Function (Vision only) |
| **Deploy** | Render (Docker), Supabase Edge, or any host that runs the Dockerfile |

- **Repo layout:** `shiftpay/` = app, `backend/` = FastAPI OCR, `supabase/` = optional DB schema + Edge Function OCR.

See **[CLAUDE.md](./CLAUDE.md)** for full stack, env vars, and run instructions.

---

## Quick start

**App (local)**

```bash
cd shiftpay && npm install && npx expo start
```

**OCR backend (local)**

- From repo root: `py -m pip install -r backend/requirements.txt`
- Then: `$env:PYTHONPATH = "backend"; py -m uvicorn app.main:app --reload --port 8000 --host 127.0.0.1`  
  (Windows: use `py`; on macOS/Linux use `python3` and set `PYTHONPATH` accordingly.)

**Deploy**

- **Render:** Connect this repo, set Root Directory = `backend`, Runtime = Docker. Add env: `SECRET_SALT`, `ALLOWED_ORIGINS`, optional `OPENAI_API_KEY`.
- **Supabase:** `supabase functions deploy ocr` and set secret `OPENAI_API_KEY`. See `supabase/README.md`.

---

## Privacy

All user data (rates, timesheets, history) is stored **only on the device** (expo-sqlite). The OCR service receives an image and returns shifts; it does not store images or personal data. No account, no mandatory cloud, no GDPR headache for the MVP.

---

## Roadmap

See **[ROADMAP.md](./ROADMAP.md)** for phases (setup → core flow → history → CSV & polish → build & distribution).

---

## Credits

Built for **[The Vibe Coding Games 2026](https://www.thevibecodinggames.com)** (18–23 Feb).  
OCR logic adapted from ShiftSync (Norwegian shift-schedule parsing).

---

## License

MIT (or as specified in the repo).
