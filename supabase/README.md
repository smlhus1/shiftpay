# ShiftPay — Supabase

- **DB:** Migrasjoner i `migrations/` (tariff_rates, timesheets). Kjør i Dashboard → SQL Editor eller `supabase db push`.
- **OCR:** Edge Function i `functions/ocr/` — Claude Haiku 4.5 Vision for vaktplan-OCR. Ingen Tesseract.

## Deploy OCR-funksjonen

```bash
# Fra prosjektrot (der supabase/ ligger)
supabase link   # hvis ikke allerede koblet til prosjekt
supabase functions deploy ocr --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Appen kaller: `POST https://<project-ref>.supabase.co/functions/v1/ocr` med `multipart/form-data`, feltnavn `file` (jpeg/png, max 5MB).  
Respons: `{ "shifts": [...], "confidence": 0.9, "method": "claude-vision" }`.

I `shiftpay/.env` sett `EXPO_PUBLIC_API_URL=https://<project-ref>.supabase.co/functions/v1/ocr` (erstatt `<project-ref>` med ref fra Supabase Dashboard → Settings → General).

## Lokal testing

```bash
supabase functions serve ocr --env-file supabase/.env.local
# .env.local: ANTHROPIC_API_KEY=sk-ant-...
curl -X POST http://localhost:54321/functions/v1/ocr -F "file=@vaktplan.jpg"
```
