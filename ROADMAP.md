# ShiftPay — Roadmap til første utkast

> Hver fase er et eget plan-mode-sesjon.
> Ikke start neste fase før forrige er ferdig og testet på emulator.

---

## Fase 1 — Prosjektoppsett
*Mål: Expo-app kjører på emulator, lokal DB fungerer, backend er oppe*

- [x] Scaffold Expo-app (TypeScript, Expo Router, NativeWind)
- [x] Sett opp expo-sqlite med skjema (tariff_rates, timesheets)
- [x] Konfigurer EAS Build
- [x] Fork backend fra ShiftSync, fjern unødvendig kode (Stripe, Azure, Supabase, analytics)
- [ ] Deploy OCR-backend: **Render** (Docker, `render.yaml` + `backend/Dockerfile`), **Supabase Edge Function** (kun Vision), eller Railway/Fly.io
- [x] Verifiser: appen starter (Metro på 8081), TypeScript OK, DB-init i kode. Backend: lokalt Python eller Supabase Edge Function (se `supabase/README.md`).

---

## Fase 2 — Kjerneflyt: Import og beregning
*Mål: Bruker kan ta bilde av timeliste, se skift, og få beregnet lønn*

- [x] Skjerm: Tariff-oppsett (grunnlønn + tillegg, lagres lokalt i expo-sqlite)
- [x] Skjerm: Importer timeliste — kamera → send til backend → OCR
- [x] Korreksjonssteg: bruker kan redigere OCR-resultat før lagring
- [x] Lønnsberegningslogikk (timer × sats per skifttype)
- [x] Skjerm: Beregningsresultat — "Du bør ha fått: X"
- [x] Lagre timeliste og beregning lokalt (expo-sqlite)
- [ ] Verifiser: full flyt fra bilde til lønnsberegning på emulator

---

## Fase 3 — Historikk og oversikt
*Mål: Bruker kan se alle perioder samlet, ikke bare siste måned*

- [ ] Dashboard: liste over alle importerte perioder
- [ ] Detaljvisning per periode (skift + beregning)
- [ ] Lokal caching (expo-sqlite) for offline-tilgang
- [ ] Manuell registrering av skift (alternativ til OCR)
- [ ] Verifiser: historikk vises korrekt på emulator

---

## Fase 4 — CSV-import og polish
*Mål: Alternativ importmetode, pen UI, klar for testing*

- [ ] CSV-import (parse og map til skiftstruktur)
- [ ] Ansvarsfraskrivelse innbakt i appen (OCR-feil, egne satser)
- [ ] UI-polish: typografi, spacing, farger, tomme states
- [ ] Feilhåndtering og loading states overalt
- [ ] Onboarding-flyt for nye brukere
- [ ] Verifiser: appen ser bra ut og flyter godt på emulator

---

## Fase 5 — Bygg og distribusjon
*Mål: APK tilgjengelig for testere via Google Play intern testing*

- [ ] EAS Build: generer release APK/AAB
- [ ] Sett opp Google Play Console intern testing-spor
- [ ] Opprett Google Groups for testere
- [ ] Inviter testere (kona first)
- [ ] Samle tilbakemeldinger og fiks kritiske bugs
- [ ] Forbered demo for The Vibe Coding Games (23. feb)

---

## Nøkkelavhengigheter

| Avhengighet | Nødvendig fra |
|-------------|---------------|
| Backend deployet | Fase 2 |
| EAS-konto konfigurert | Fase 5 |
| Play Console intern testing aktiv | Fase 5 |

## Personvernprinsipp (gjentas for klarhet)

All brukerdata ligger kun på enheten (expo-sqlite). Backend er stateless — mottar bilde, returnerer skiftdata, lagrer ingenting. Ingen konto, ingen sky, ingen GDPR-kompleksitet i MVP.

## Tekniske referanser

- `CLAUDE.md` — tech stack, struktur, env vars
- `ideation/prove-you-are-human-2026-02-18.md` — konseptbeslutninger
- `C:\Projects\Personlig\OCR - Kalender` — ShiftSync (OCR-kilde)
