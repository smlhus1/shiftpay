# Beregning — kunnskapsbase for refactor av lønnsberegning

> Opprettet: 2026-04-18. Eier: Windows-sessionen implementerer refactor; Mac-sessionen har gjort forskningen.

Denne mappen samler all kunnskap og forslag knyttet til **refactor av `lib/calculations.ts`** — fra 90-linjers naiv modell til tariff-korrekt beregning.

## Hvorfor denne mappen?

Dagens `calculateExpectedPay` har fem kritiske feil som gjør at appen **systematisk overbetaler eller underbetaler** for alle norske skiftarbeidere. Vi kan ikke publisere appen bredt før dette er rettet. Se `01-calc-review-internal-2026-04-18.md` for hvorfor, og `02-norsk-tariff-beregning-2026-04-18.md` for hvordan.

## Filer

| Fil | Hva |
|---|---|
| `01-calc-review-internal-2026-04-18.md` | Intern gjennomgang av nåværende kode — hva som er feil, konkrete scenarier som bryter, manglende dimensjoner |
| `02-norsk-tariff-beregning-2026-04-18.md` | Deep-research-rapport med faktiske satser og regler for KS, Spekter, Virke HUK, butikk, vekter, renhold, bygg. Inkluderer foreslått ny datamodell (SQL) + 10 test cases |

Les i denne rekkefølgen: `01` først (forstå problemet), deretter `02` (forstå virkeligheten + se planen).

## Kort oppsummering (for de som ikke vil lese alt)

### De 5 største feilene i dagens modell

1. `shift_type` er **kategorisk** (hele vakten blir én type) — faktiske tariffer bruker **tid-brackets** (timer innen et klokkeslettvindu)
2. Tillegg er **flat NOK/time** — faktiske tariffer er **prosent av timelønn, minimum kr Y**
3. **`holiday_supplement` brukes ikke i det hele tatt** — feltet eksisterer i schema, men `calculateExpectedPay` ignorerer det. Røde dager = 133,33 % i offentlig sektor.
4. **Ingen stacking-regler.** Overtid skal erstatte (ikke addere) UT-tillegg i KS. Dette er bakt inn i hver tariff og varierer.
5. Overtid er **én prosent** i modellen, men faktisk **trinnvis** (50/100/133,33 % avhengig av klokkeslett + ukedag + helligdag) og utløses først etter tariffens ukegrense (35,5/37,5/33,6).

### Prioritert plan (fra research-rapporten, §7)

**P0 — må fikses før neste release (appen er feil uten):**
1. Tid-bucket beregning (ikke shift_type-kategorisk)
2. Implementere høytidstillegg (feltet finnes, logikken mangler)
3. Prosent + minimum NOK-struktur
4. Overtid erstatter UT-tillegg
5. Korrekt ukegrense per rolle

**P1 — neste release:**
6. Tariff-maler: KS, Spekter A2, Virke HUK
7. Trinnvis overtid
8. Avrundingsregel

**P2 — senere:**
9. Retail/vekter/renhold/reiseliv/bygg-maler
10. Onboarding wizard med mal-valg
11. Lokal-avtale-editor (override)
12. Kilde-henvisning per tillegg

### Foreslått ny datamodell

Se `02-norsk-tariff-beregning-2026-04-18.md` §6.1 for komplett SQL. Kortversjon:

```
tariff_templates          → KS / Spekter / Virke HUK osv. (id, name, weekly_hours)
tariff_supplements        → per template: time-bracket, pct + min_nok, which days
tariff_overtime_rules     → tiered (first 2h, after, on night, on holiday)
holidays                  → norske røde dager med dato per år
user_selected_template    → hvilken mal brukeren kjører
```

### Flaggede usikkerheter (trenger mer research senere)

- Eksakt **KS-kveldssats** (forhandles lokalt — HTA har ingen sentral minstesats for kveldsdelen)
- **Spekter stacking** av lørsøn + helligdag
- **Riksavtalen** (hotell/restaurant) — PDF ikke lesbar, trenger ny kilde

## Test cases for validering

§8 i research-rapporten har **10 konkrete test cases** (sykepleier dagvakt, seinvakt lørdag, nattevakt søndag, 17. mai, julaften-nattevakt, butikk lørdag kveld, vekter natt, overtid…) — disse kan tas rett inn som enhetstester.

## Arbeidsfordeling

- **Mac-sessionen** har gjort research + dokumentasjon. Rører ikke koden.
- **Windows-sessionen** implementerer refactor basert på dokumentene her.
- Endringer gjøres på ny feature-branch (foreslått navn: `refactor/tariff-v2`).
- Merges til `master` via PR med test-fixtures fra §8.

## Spørsmål / åpne punkter

Legg dem i commit-meldinger eller egen fil her hvis det dukker opp noe under implementering. Mac-sessionen kan følge opp med mer research hvis nødvendig.
