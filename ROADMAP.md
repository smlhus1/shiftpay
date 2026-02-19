# ShiftPay — Roadmap til første utkast

> Hver fase er et eget plan-mode-sesjon.
> Ikke start neste fase før forrige er ferdig og testet på emulator.

---

## Fase 1 — Prosjektoppsett
*Mål: Expo-app kjører på emulator, lokal DB fungerer, backend er oppe*

- [x] Scaffold Expo-app (TypeScript, Expo Router, NativeWind)
- [x] Sett opp expo-sqlite med skjema (tariff_rates, schedules, shifts — migrering fra timesheets)
- [x] Konfigurer EAS Build
- [x] Fork backend fra ShiftSync, fjern unødvendig kode (Stripe, Azure, Supabase, analytics)
- [x] Deploy OCR-backend: **Supabase Edge Function** (Claude Haiku Vision). Deploy: `supabase functions deploy ocr --no-verify-jwt` + `ANTHROPIC_API_KEY` (se `supabase/README.md`).
- [x] Verifiser: appen starter (Metro på 8081), TypeScript OK, DB-init i kode. Backend: lokalt Python eller Supabase Edge Function (se `supabase/README.md`).

---

## Fase 2 — Kjerneflyt: Import og beregning
*Mål: Bruker kan ta bilde av timeliste, se skift, og få beregnet lønn*

- [x] Skjerm: Tariff-oppsett (grunnlønn + tillegg, lagres lokalt i expo-sqlite)
- [x] Skjerm: Importer timeliste — kamera → send til backend → OCR
- [x] Korreksjonssteg: bruker kan redigere OCR-resultat før lagring
- [x] Lønnsberegningslogikk (timer × sats per skifttype)
- [x] Skjerm: Beregningsresultat — "Du bør ha fått: X"
- [x] Lagre timeliste og beregning lokalt (schedules + shifts; expo-notifications for påminnelser)
- [ ] Verifiser: full flyt fra bilde til lønnsberegning på emulator

---

## Fase 3 — Historikk og oversikt (vaktsporer)
*Mål: Bruker kan se alle perioder, bekrefte vakter, og se månedsoppsummering*

- [x] Dashboard: neste vakt, ubekreftede vakter, månedsoppsummering, ukens vakter
- [x] Detaljvisning per periode (skift + status + «Bekreft» for planlagte)
- [x] Skjerm for å bekrefte vakt (ja/nei/overtid) — `confirm/[shiftId]`, deep link fra varsel
- [x] Månedsoppsummering — planlagt vs. faktisk timer, forventet lønn
- [x] Lokale påminnelser ved vakt-slutt (expo-notifications)
- [x] Manuell registrering av skift (alternativ til OCR)
- [ ] Verifiser: historikk og vaktsporer vises korrekt på emulator

---

## Fase 4 — CSV-import, bildeopplasting og polish
*Mål: Alternativ importmetode, bilde fra galleri, pen UI, klar for testing*

- [x] Bildeopplasting fra galleri (expo-image-picker → OCR)
- [x] CSV-import (parse og map til skiftstruktur, expo-document-picker)
- [x] Ansvarsfraskrivelse innbakt i appen (OCR-feil, egne satser)
- [x] UI-polish: tab-ikoner (Ionicons), spacing, tomme states, norsk tekst
- [x] Feilhåndtering og loading states overalt (timeout OCR 30s, Error Boundary)
- [x] Onboarding-flyt for nye brukere (satser ikke satt → modal til Innstillinger)
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
