# KONSEPT VALGT: ShiftPay

> Dato: 2026-02-18 | Status: Klar for bygging

---

## TL;DR

Helsearbeidere og skiftarbeidere kan ikke kontrollere om lønnen stemmer. Systemene er lukkede, historikken er begrenset til siste måned, og komplekse tillegg gjør det umulig å etterprøve utbetalt lønn.

**ShiftPay** lar deg importere timelister (foto/CSV/manuelt), legge inn dine egne satser, og få beregnet hva du *skal* ha fått betalt — slik at du kan sammenligne mot faktisk lønnsslipp.

---

## Beslutninger

| Beslutning | Valg | Begrunnelse |
|-----------|------|-------------|
| Kodebase | Nytt prosjekt, kopierer fra ShiftSync | Renere, ingen teknisk gjeld |
| Platform | Android-app (Play Store) | Mobil-first, helsearbeidere på farten |
| Auth | Innlogging + lokal lagring | Data overlever enhetsbytte |
| Testing | Google Play Console (intern spor) + Google Groups | Rask distribusjon til testere |
| OCR | Foto → backend API (ShiftSync-logikk gjenbrukes) | Allerede validert og testet |

---

## Tech Stack

### App (mobil)
- **Expo** (React Native + TypeScript)
- **Expo Camera** for å ta bilde av timeliste
- **AsyncStorage / SQLite** for lokal lagring
- **Supabase** for auth + sky-synkronisering

### Backend
- **FastAPI** (Python) — kopierer OCR-pipeline fra ShiftSync
- **Tesseract + GPT-4o Vision** (to motorer, samme som ShiftSync)
- **Supabase** som database (PostgreSQL)

### Deploy
- **Backend:** Railway eller Fly.io (rask deploy, gratis tier)
- **App:** EAS Build → Google Play Console intern testing

### Distribution
- Google Play Console (intern testspor)
- Google Groups for testere

---

## Brukerflyt

1. **Registrer / logg inn** (Supabase auth)
2. **Oppsett (én gang):** Legg inn dine satser
   - Grunnlønn per time
   - Kveldstillegg (kr/t eller %)
   - Nattillegg
   - Helgetillegg
   - Helligdagstillegg
3. **Importer timeliste:**
   - 📷 Ta bilde → OCR → korrigér resultat
   - 📄 CSV-upload
   - ✏️ Manuell registrering
4. **Se beregning:**
   - Timer per skifttype
   - "Du bør ha fått: 28 450 kr denne perioden"
5. **Historikk:** Alle perioder samlet, ikke bare siste måned

---

## Fra ShiftSync gjenbruker vi

- `ocr/processor.py` — Tesseract OCR-pipeline for norsk vaktplan
- `ocr/vision_processor.py` — GPT-4o Vision alternativ
- `ocr/confidence_scorer.py` — Confidence scoring
- Skiftklassifisering: tidlig (06-12), mellom (12-16), kveld (16-22), natt (22-06)
- Norsk måneds- og ukedagsparsing
- Filvalidering og sikkerhetslag

---

## 5-dagers plan

| Dag | Fokus |
|-----|-------|
| 1 | Expo-app scaffold, Supabase auth, backend fork fra ShiftSync |
| 2 | Sats-oppsett, OCR-flyt i appen, lønnsberegningslogikk |
| 3 | Historikkvisning, sammenligningsvisning, lokal lagring |
| 4 | CSV-import, polish, EAS build, Play Console oppsett |
| 5 | Intern testing med testere via Google Groups, bugfiks, demo |

---

## Ansvarsfraskrivelse (innbakt i appen)

"Dette er et personlig oversiktsverktøy basert på satser du selv har lagt inn. Verifiser alltid mot din kontrakt og offisiell lønnsslipp. OCR kan gjøre feil — kontroller alltid importerte data."

---

## Åpne spørsmål

- [ ] Navn? (ShiftPay, Vaktpay, Lønnskontroll, Vaktsjekk?)
- [x] Play Console developer-konto: JA
- [x] Språk: Engelsk (internasjonalt)
- [x] Navn: **ShiftPay**
- [ ] Trenger kona mulighet til å teste på iOS også, eller kun Android?
