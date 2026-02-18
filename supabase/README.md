# ShiftPay — Supabase

- **DB:** Migrasjoner i `migrations/` (tariff_rates, timesheets). Kjør i Dashboard → SQL Editor eller `supabase db push`.
- **OCR:** Edge Function i `functions/ocr/` — OpenAI Vision for vaktplan-OCR. Ingen Tesseract (kun Vision).

## Deploy OCR-funksjonen

```bash
# Fra prosjektrot (der supabase/ ligger)
supabase link   # hvis ikke allerede koblet til prosjekt
supabase functions deploy ocr
supabase secrets set OPENAI_API_KEY=sk-...
```

Appen må kalle: `POST https://<project-ref>.supabase.co/functions/v1/ocr` med `multipart/form-data`, feltnavn `file` (jpeg/png, max 5MB).  
Respons: `{ "shifts": [...], "confidence": 0.9, "method": "vision" }` — samme format som Python-backend.

## Lokal testing

```bash
supabase functions serve ocr --env-file supabase/.env.local
# .env.local: OPENAI_API_KEY=sk-...
curl -X POST http://localhost:54321/functions/v1/ocr -F "file=@vaktplan.jpg" -H "Authorization: Bearer $ANON_KEY"
```
