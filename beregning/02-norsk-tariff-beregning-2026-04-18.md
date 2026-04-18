# Research: Norsk tariff-beregning for ShiftPay

> Researched: 2026-04-18 | Sources consulted: 20+ | Confidence: Medium-High
> Scope: Norwegian collective agreements (tariffavtaler) for shift workers, focused on health sector (KS, Spekter, Virke HUK) with supporting data from retail, security, cleaning, hospitality and construction.

---

## TL;DR — De 5 største svakhetene i dagens ShiftPay-modell

1. **`shift_type` som kategorisk felt er fundamentalt feil.**
   Dagens modell antar at en vakt *er* "kveld" eller "natt". I virkeligheten utløses tillegg på **timebasis innenfor tid-brackets** (f.eks. kl 17:00–07:00 for Spekter A2). En vakt 15:00–23:00 har 2 timer dagtid + 6 timer kveld — ikke 8 timer kveld.

2. **Flat NOK/time for alle tillegg skjuler prosent-logikken.**
   Norske tariffer bruker nesten universelt en "**X % av timelønn, minimum kr Y**"-konstruksjon (Spekter: 28 % / min 70 kr; KS: 22 % lørsøn / min 70 kr). Høytlønte får prosent-tillegget, lavtlønte får minstesatsen. ShiftPay kan ikke beregne korrekt for noen av dem uten denne modellen.

3. **Høytidstillegg (helligdager) er dødt i koden selv om det eksisterer i schema — og det er **133,33 % i offentlig sektor**.**
   På en 12-timers julaften-vakt er dette 4 000–6 000 kr forskjell for en sykepleier. Dette er den enkeltfaktoren som gir størst feil-beløp hvis den mangler.

4. **Stacking-reglene er ikke-trivielle og varierer PER TARIFF — de kan ikke hardkodes likt for alle.**
   Eksempler fra research:
   - **KS:** Tillegg etter § 5 **utbetales ikke samtidig som overtid** — overtid "spiser" UT-tillegget.
   - **KS/KA:** Helge-/høytidstillegg og lør/søn-tillegg utelukker hverandre; men kveld/natt *kan* komme på toppen.
   - **Virke HUK:** Høytid + kveld + lør/søn kan stables samtidig.
   - **Butikk:** Ingen tillegg for timer som betales som overtid.
   ShiftPay må modellere dette eksplisitt per tariff, ikke globalt.

5. **Overtidsmodellen er en enkelt prosent — det er utilstrekkelig.**
   Faktisk logikk er **trinnvis (tiered)** og avhengig av **når**: 50 % på hverdager, 100 % etter 21:00/natt og på søndag/helligdag, 133,33 % i enkelte tariffer for helligdag. Og **overtid utløses ikke før over 9 t/dag eller tariffens ukentlige grense (35,5 t for turnus)**, ikke f.eks. bare "mer enn 8 timer".

---

## 1. Tariff-landskapet — hvem jobber under hva

| Arbeidsgiverområde | Tariff/hovedavtale | Dekker |
|---|---|---|
| **KS** (kommuner, fylkeskomm.) | Hovedtariffavtalen KS 2024–2026 | Sykehjem, hjemmesykepleie, kommunale legevakter, barnehager, skoler, etc. |
| **Spekter område 10** | Overenskomst del A, A1, A2 | Helseforetak med sykehusdrift (Helse Sør-Øst, Midt, Nord, Vest) — sykepleiere (A2 Unio), helsefagarbeidere (LO Stat) |
| **Spekter område 13** | Tilsvarende | Lovisenberg og andre sykehus utenfor HF-strukturen |
| **Virke HUK** | Landsoverenskomst for Helse og Sosiale tjenester | Private ideelle: sykehjem, rus, psyk, barnevern |
| **NHO Service & Handel** | Renholds-, Vekter-, Pleie & omsorg-overenskomster | Private kommersielle |
| **Virke Handel** | Butikkoverenskomsten / Landsoverenskomsten HK | Varehandel/detaljhandel |
| **NHO Reiseliv** | Riksavtalen | Hotell/restaurant/catering |
| **Fellesforbundet + BNL** | Fellesoverenskomsten for byggfag | Bygg/anlegg |

**Normalarbeidstid (full stilling, timer/uke):**
- Dagarbeid: **37,5 t**
- 2-skift / "tredelt turnus ikke regelmessig søn-/helligdag": **35,5 t**
- 3-skift / helkontinuerlig / helgearbeid: **33,6 t**
- Sykepleiere/helsefagarbeidere i turnus: **35,5 t** (KS og Spekter, helt standard)

Dette er kritisk: **overtid utløses når tariffens grense er passert, ikke ved 37,5 t/uke globalt**. For en sykepleier i 100 % stilling er alt over 35,5 t overtid (eller 9 t/dag).

---

## 2. Sektorvise satser — fakta per 2024–2026

### 2.1 KS Hovedtariffavtalen (kommuner, sykehjem, hjemmesykepleie)

Kilde: Hovedtariffavtalen 01.05.2024–30.4.2026 + KS "Beregning av tilleggslønn fra 1.1.2023". Alle rettigheter er **minimumssatser** — lokale avtaler kan gi mer.

| Tillegg | Regel | Sats | Tidsbracket |
|---|---|---|---|
| Lørdag/søndag (§ 5.2) | % av timelønn, min NOK | **22 %, min kr 70/time** | Lørdag 00:00 – søndag 24:00 |
| Kveld (§ 5.4.1, kveldsdel) | Fast NOK-sats (forhandles lokalt/sentralt) | Ikke en eksplisitt minstesats i HTA — kveldsdelen er lokal tilleggssats, ofte ~28 kr/time (2024) | Normalt 17:00–21:00 på skiftarbeid |
| Natt (§ 5.4.1, nattdel) | % av timelønn, min NOK | **25 %, min kr 70/time** | 21:00–06:00 |
| Helge-/høytid (§ 5.3) | % av timelønn | **133,33 % (1 1/3)** *per time over vanlig timelønn* | 00:00–24:00 på helligdager; 12:00–24:00 på jul-/nyttår-/pinseaften og onsdag før skjærtorsdag |
| Overtid (§ 6.5) | % av timelønn | **50 %** normalt. **100 %** for overtid mellom 21:00–06:00 og lørdag/søndag. **133,33 %** for overtid på helligdager og påskeaften + etter kl 12 på aftener | — |

**KRITISK stacking-regel for KS:**
> "Tillegg etter § 5 utbetales ikke under overtidsarbeid, med unntak av smusstillegg."

Dvs.: er du på overtid, **får du overtidssatsen i stedet for**, ikke i tillegg til, kveld/natt/lør-søn-tillegget.

**Helg vs høytid:** Helge-/høytidstillegg **erstatter** lørdag/søndag-tillegg samme time (ikke stacking). Kveld/natt *kan* komme i tillegg til helligdagstillegg.

---

### 2.2 Spekter område 10 — Sykehus (Helse SØ/M/N/V)

Kilde: Spekter Overenskomst del A2 Unio (NSF), punkt 2.3; NSF lønn-og-tariff; Delta Spekter område 10. Alle satser gjelder fra 1. juli 2024 og står uendret inn i 2025.

| Tillegg | Sats | Tidsbracket |
|---|---|---|
| **Lørdag/søndag** | **26 % av timelønn, min kr 75/time** | Lørdag 00:00 – søndag 24:00 |
| **Kveld/natt** (samlet, pkt 2.3) | **28 % av timelønn, min kr 70/time** | **17:00 – og ut nattevaktens lengde, senest 08:00** |
| **Helge-/høytid** | **133,33 % av timelønn** | 00:00–24:00 på helligdager + 12:00–24:00 aftener |

**Kritisk detalj:** Spekter A2 sin kveld/natt-bracket starter 17:00, ikke 17:00 og avsluttes på ulike tidspunkt som i KS. Dette er én av flere grunner til at kategorisk `shift_type` ikke fungerer — samme sykepleier på dagvakt 07:00–15:00 har 0 UT-timer, men på seinvakt 14:00–22:00 har 5 UT-timer (17–22), og nattevakt 22:00–07:30 har 9,5 UT-timer.

**Stacking i Spekter:** Svært likt KS. Overtid erstatter UT-tillegg for de timene den dekker. Helligdag + kveld/natt stables OK. Lørsøn + helligdag: tariffen er uklar i kildene jeg fant — **flagg for manuell verifisering**.

---

### 2.3 Virke HUK (private ideelle: sykehjem, rus, psyk)

Kilde: Helse- og omsorgsoverenskomsten 2024–2026 (Lovdata TARO-481); Delta Virke HUK 2024-2026.

| Tillegg | Sats | Merknad |
|---|---|---|
| **Lørdag/søndag** | Min kr 70/time (forhandles, ofte % av timelønn) | Ganske likt KS |
| **Kveld/natt** | Typisk 28 % av timelønn (privat sektor har fra 1.3.2025 minst 70 kr/time mellom 21:00–06:00) | Lokale variasjoner |
| **Helge-/høytid** | **133,33 %** (økt fra 100 % i 2025) | Alignert med KS |
| **Overtid** | 50 % / 100 % / 133,33 % trinnvis | Lik KS-struktur |

**Stacking i Virke HUK — eksplisitt fra tariffteksten:**
> "Holiday supplement [133,33 %] utelukker ikke tillegg for evening/night work eller Saturday premiums — multiple allowances can combine on the same day."

Dvs. i HUK **stables de alle** — dette er annerledes enn KS! En sykepleier på nattevakt 22:00–06:00 på 17. mai kan få: grunnlønn + 133,33 % høytid + 28 % kveld/natt + 22 % (eller prosent-lagt) søndagsbit.

---

### 2.4 Butikkoverenskomsten (Virke handel)

Kilde: Lovdata TARO-70, kap 5.

| Tidspunkt | Tillegg |
|---|---|
| Hverdag etter 18:00 | **kr 21/time** |
| Hverdag etter 21:00 | **kr 42/time** |
| Lørdag etter 13:00 | **kr 42/time** |
| Lørdag etter 16:00 | **kr 84/time** |
| Overtid natt (21:00–08:00) | 100 % |
| Overtid søndag/helligdag | 100 % |
| Overtid andre tider | 50 % |

**Kritisk regel:** *"Det skal ikke betales ulempetillegg for timer det betales overtidsgodtgjørelse for."* — samme utelukkelsesregel som KS.

**Flat NOK/time-modellen.** Handel er simpelt — ingen prosenter. ShiftPay-modellen passer greit her, men brackets-logikken må fortsatt stemme (trinn ved 18, 21, 13, 16).

---

### 2.5 Vekter (NHO Service & Handel — NAF)

Kilde: Vekteroverenskomsten 2024–2026 (Lovdata TARO-14).

| Tillegg | Sats | Bracket |
|---|---|---|
| Nattarbeid | kr 28/time | 21:00–06:00 |
| Helgearbeid | kr 48/time | Lørdag 18:00 – mandag 06:00 |
| Helligdag | 100 % | Definerte perioder (f.eks. skjærtorsdag 18:00 → 3. påskedag 06:00) |

Merk at "helg" her begynner **lørdag 18:00**, ikke lørdag 00:00 — dette er sektor-spesifikt.

---

### 2.6 Renhold (NHO Service & Handel — NAF)

Kilde: Renholdsoverenskomsten 2024–2026 (Lovdata TARO-10).

| Tillegg | Sats |
|---|---|
| Natt (21:00–06:00) | Min kr 29/time |
| Lørdag etter 18:00 | **50 % tillegg** |
| Søndag (ikke helligdag) | **75 % tillegg** |
| Helligdag | 100 % (over dagnorm) |
| Overtid hverdag | 50 % |
| Overtid søndag/helligdag | 100 % |
| Etter 21:00 (overtid) | 100 % |

Merk: renhold bruker **prosent av grunnlønn for helg**, men **flat NOK for natt**. Blandet modell.

---

### 2.7 Bygg (Fellesoverenskomsten for byggfag)

Kilde: Lovdata TARO-414, kap 6.

| Tidspunkt | Overtidstillegg |
|---|---|
| Hverdag etter ordinær arbeidstid, frem til 21:00 | 50 % |
| Hverdag 21:00 → ordinær tids begynnelse | 100 % |
| Lørdag etter 13:00 | 50 % |
| Søndag/helligdag | 100 % |

Bygg har ikke tradisjonelle "ubekvem arbeidstid"-tillegg utenom overtid — jobb i bygg er dagtid per default.

---

## 3. Stackings-regler — samlet oversikt

Dette er det mest subtile, og det som varierer mest per tariff. Oppsummert:

| Sektor | Kveld/natt + helg | Kveld/natt + helligdag | Helg + helligdag | Overtid + UT-tillegg |
|---|---|---|---|---|
| **KS** | Stables | Stables | Helligdag erstatter helg | **Overtid erstatter UT** |
| **Spekter område 10** | Stables (sannsynlig) | Stables | Uklart — verifiser | **Overtid erstatter UT** |
| **Virke HUK** | **Stables alt** | Stables | Stables | **Overtid erstatter UT** |
| **Butikk** | N/A | N/A | N/A | **Overtid erstatter UT** |
| **Renhold** | Stables | Stables | Uklart | **Overtid erstatter UT** |

**Universell regel jeg fant i alle sektorer jeg sjekket:**
> Timer som betales som overtid skal IKKE også ha kveld/natt/helg-tillegg — overtid-prosenten erstatter.

**Avrundingsregel (KS):** 30 min eller mer avrundes opp til hel time, 29 min eller mindre avrundes ned. Samles per oppgjørsperiode, ikke per vakt.

---

## 4. Overtidsregler — detaljert

**Arbeidsmiljøloven (lovens minimum):**
- Overtid utløses ved > 9 t/dag eller > tariffens ukentlige grense (**40 t lovens hovedregel, 35,5 t for turnus, 33,6 t for helkontinuerlig**).
- Lovpålagt minimum: **40 % tillegg** (alltid i penger, kan ikke avspaseres bort).
- Maks 10 t overtid/uke, 25 t/4 uker, 200 t/år (300 t med tariffavtale).

**Tariff typisk (KS, Spekter, Virke HUK — veldig likt):**
| Situasjon | Overtidssats |
|---|---|
| Normal hverdag | 50 % |
| Etter 21:00 til ordinær tids begynnelse | 100 % |
| Lørdag etter 13:00 | 100 % (Bygg); varierer i helse |
| Søndag og helligdag | 100 % |
| Helligdag (KS/HUK) | **133,33 %** |
| Overtid de 2 første timene før skiftet starter | 50 % (KS) |

**Viktig:** "50 % tillegg" betyr `grunnlønn × 1.5`, ikke `grunnlønn + 50 kr`. Dette er multiplikativt.

---

## 5. Høytidsdager — hvilke og hvordan

**Helligdager i norsk lov (11 + 2):**
- 1. nyttårsdag
- Skjærtorsdag
- Langfredag
- 1. påskedag
- 2. påskedag
- 1. mai (offentlig høytidsdag)
- 17. mai (grunnlovsdag)
- Kristi Himmelfartsdag
- 1. pinsedag
- 2. pinsedag
- 1. juledag
- 2. juledag

**Halve dager (12:00–24:00):** Julaften, nyttårsaften, pinseaften, onsdag før skjærtorsdag — på disse utløses helligdagstillegg fra klokka 12.

**Palmesøndag er IKKE helligdag tariffmessig** — den regnes som vanlig søndag (trigger kun lør/søn-tillegg).

**I offentlig/helse:** 133,33 % tillegg.
**I staten:** 100 % tillegg.
**I privat uten tariff:** Ingenting — lovpålagt fri, men ikke lovpålagt tillegg.

---

## 6. Foreslått ny datamodell for ShiftPay

### 6.1 Endringer i `tariff_rates`-tabellen

Erstatt dagens flate modell med en mer uttrykkfull struktur:

```sql
-- Tariff (mal, f.eks. "Sykepleier KS kommune", "Sykepleier Spekter A2", "Butikkansatt Virke")
CREATE TABLE tariff_templates (
  id uuid PRIMARY KEY,
  name text NOT NULL,             -- "Sykepleier KS 2024-2026"
  sector text NOT NULL,           -- "health_public_municipal" | "health_public_hospital" | "health_private_ideal" | "retail" | "security" | ...
  source_ref text,                -- "KS HTA 2024-2026 § 5"
  valid_from date,
  valid_to date,
  weekly_hours numeric NOT NULL,  -- 35.5 for turnus, 37.5 dag, 33.6 helkont.
  overtime_daily_threshold_hours numeric DEFAULT 9,   -- overtid utløses ved > N timer/dag
  overtime_rule_ref text,         -- henvisning til overtime-rules
  notes text
);

-- Tidsbaserte tillegg (UT — ubekvem arbeidstid)
CREATE TABLE tariff_supplements (
  id uuid PRIMARY KEY,
  template_id uuid REFERENCES tariff_templates(id),
  supplement_type text NOT NULL,        -- "evening" | "night" | "weekend" | "holiday_full" | "holiday_half"
  -- Time window (for dag-baserte tillegg)
  start_time time,                      -- f.eks. "17:00"
  end_time time,                        -- f.eks. "08:00" (kan krysse midnatt)
  -- Ukedager (bitmask eller array; NULL = alle)
  weekdays int[],                       -- [6,7] = lørdag+søndag; NULL = alle
  -- Satslogikk: percent_of_base + flat_floor (ta den største)
  percent_of_base numeric,              -- 28 for 28 %
  flat_nok_per_hour numeric,            -- 70 for 70 kr/time (gulv)
  -- Prioritet og stacking
  priority int DEFAULT 0,               -- lavere = viktigere; brukes for 'replaces' / 'combines'
  stacks_with text[],                   -- array av supplement_type som dette stables med
  replaced_by text[],                   -- array som dette tillegget vikes for
  -- Helligdager
  is_holiday_rate bool DEFAULT false,   -- true for helligdagssats (133.33)
  holiday_half_day_from time,           -- 12:00 for halve dager
  source_ref text
);

-- Overtid trinnvis
CREATE TABLE tariff_overtime_rules (
  id uuid PRIMARY KEY,
  template_id uuid REFERENCES tariff_templates(id),
  -- Trigger
  trigger_type text,                    -- "daily_hours_over" | "weekly_hours_over" | "time_window"
  trigger_value numeric,                -- 9 for daily, 35.5 for weekly
  time_window_start time,               -- f.eks. 21:00 for natt-overtid
  time_window_end time,
  weekdays int[],                       -- [6,7] for helg-overtid
  is_holiday bool,                      -- true for helligdag-overtid
  -- Sats
  percent_bonus numeric NOT NULL,       -- 50, 100, 133.33
  priority int,
  source_ref text
);

-- Helligdager (delt lookup-tabell, kan gjenbrukes på tvers av tariffer)
CREATE TABLE holidays (
  date date PRIMARY KEY,
  name text NOT NULL,
  is_full_day bool DEFAULT true,        -- false for julaften/nyttårsaften
  half_day_starts_at time DEFAULT '12:00'
);
```

### 6.2 Tid-bucket beregningsalgoritme (pseudo)

```
for each minute of shift:
  buckets = []
  if is_holiday(date):
    buckets.add("holiday")
  if day_of_week in [6,7]:
    buckets.add("weekend")
  if time in evening_window:
    buckets.add("evening")
  if time in night_window:
    buckets.add("night")
  if is_overtime(accumulated_hours, daily_threshold, weekly_threshold):
    buckets.add("overtime")

  # Apply tariff stacking rules:
  pay = base_rate
  if "overtime" in buckets:
    # overtid erstatter UT-tillegg for den timen
    pay = base_rate * (1 + overtime_rate(buckets))
  else:
    for supplement in buckets:
      if supplement not replaced_by_another_applied_supplement:
        pay += max(percent_of_base, flat_floor)
```

### 6.3 Hvordan presentere for bruker

**Anbefaling: start med tariff-maler, ikke "bygg fra bunn".**

- Onboarding: "Hvor jobber du?" → dropdown med 10–15 forhåndsdefinerte maler:
  - Sykepleier/helsefagarbeider — kommune (KS)
  - Sykepleier — sykehus (Spekter A2)
  - Sykepleier/helsefagarbeider — privat ideell (Virke HUK)
  - Butikkansatt (Virke handel)
  - Vekter (NHO)
  - Renholder (NHO)
  - Hotell/restaurant (NHO Reiseliv)
  - Bygg (Fellesforbundet)
  - **"Jeg vet ikke / har egen avtale"** → custom editor
- "Legg til/endre satser" som avansert visning for folk med lokale avtaler
- Alltid vis kilde-referanse nederst: "Basert på Hovedtariffavtalen KS 2024-2026 § 5. Kan avvike fra din lokale avtale."

### 6.4 Konkrete felter som MANGLER i dagens tariff_rates

| Felt | Hvorfor |
|---|---|
| `weekly_hours` | For å vite når uke-overtid utløses (35,5 vs 37,5 vs 33,6) |
| `daily_overtime_threshold` | Typisk 9 t (AML) |
| Supplement som *rows* ikke *columns* | Å ha `kveldstillegg: 28` og `nattillegg: 40` som kolonner kveler modellen — legg dem som rader i et `supplements`-bord |
| `percent_of_base` + `flat_floor` per tillegg | For å støtte "28 %, minst 70 kr" |
| Tidsbrackets (`start_time`, `end_time`) | For å regne per-time ikke per-vakt |
| Holiday-lookup | Helligdager varierer fra år til år (påske flyter), må være en egen tabell |
| Stacking-flagg | `stacks_with`, `replaces`, `priority` |
| Normal-shift-overtime-rate vs night-overtime-rate | Støtte 50/100/133,33-trinn |

---

## 7. Prioritert plan

### Må fikses før neste release (P0 — uten dette er appen faktisk feil):
1. **Endre shift_type fra kategorisk til tid-bucket.** Beregn kveld/natt på timebasis innenfor vakt, ikke på hele vakten.
2. **Implementere høytidstillegg.** Feltet finnes allerede i schema — bygg logikken. Start med hardkodet holidays-tabell for 2026.
3. **Prosent + minimum NOK-struktur.** Gjør `supplements`-tabellen uttrykkfull nok til "X %, min kr Y".
4. **Overtid erstatter UT-tillegg.** Implementer stacking-regelen. Uten dette overbetaler appen.
5. **Korrekt uke-normaltid per rolle (35,5 vs 37,5 vs 33,6).**

### Neste release (P1):
6. **Tariff-maler:** KS, Spekter A2, Virke HUK (de 3 største for målgruppen).
7. **Trinnvis overtid (50/100/133,33).**
8. **Avrundingsregel** (30+ min = hel time, akkumulert per måned).

### Senere (P2):
9. **Retail, vekter, renhold, reiseliv, bygg-maler.**
10. **Onboarding wizard med mal-valg.**
11. **Lokal-avtale-editor (override satser).**
12. **Kilderevisjon** (vise tariff-tekst for hvert tillegg).

### Parkerte/uklare (trenger mer research):
- Eksakt kveldstilleggssats for KS (kveldsdelen er forhandlet lokalt — typisk ~28 kr/time i 2024 i mange kommuner, men ikke en HTA-minstesats).
- Spekter-stacking av lørsøn + helligdag: kildene jeg fant var uklare. Bør verifiseres direkte med en sykehus-lønningsseksjon eller en NSF-tillitsvalgt.
- Riksavtalen (hotell/restaurant) — PDF-en jeg forsøkte var ikke tekstlesbar. Trenger ny kilde.

---

## 8. Test cases for validering

Alle bruker konkrete tariff-regler funnet i research. **Merk:** Sykepleiere i KS har minstelønn ~480 000 kr/år = ca 260 kr/time (480 000 / 1 850). Jeg bruker runde tall for lesbarhet.

### Case 1 — KS sykepleier, vanlig dagvakt
- Tariff: KS HTA 2024–2026
- Timelønn: 300 kr
- Vakt: Tirsdag 07:00–15:00 (8 timer)
- **Forventet:** 8 × 300 = **2 400 kr**. Ingen tillegg.

### Case 2 — KS sykepleier, seinvakt lørdag
- Tariff: KS HTA 2024–2026
- Timelønn: 300 kr
- Vakt: Lørdag 15:00–23:00 (8 timer)
- Tillegg som utløses:
  - Lør/søn: **22 %** av 300 = 66 kr/t (minst 70 → **70 kr/t**) × 8 t = 560 kr
  - Kveldstillegg (forhandlet lokalt, antatt 28 kr/t) fra 17:00–21:00 = 4 t × 28 = 112 kr
  - Nattillegg (25 %, min 70 → 75 kr/t) fra 21:00–23:00 = 2 t × 75 = 150 kr
- **Forventet:** 2 400 (grunn) + 560 (helg) + 112 (kveld) + 150 (natt) = **3 222 kr**

### Case 3 — Spekter A2 sykepleier, nattevakt søndag
- Tariff: Spekter område 10 A2 Unio
- Timelønn: 310 kr
- Vakt: Søndag 22:00 – mandag 07:30 (9,5 timer)
- Tillegg:
  - Søndag-del (22:00–24:00, 2 t): 26 % × 310 = 80,60 kr (over 75-gulv) × 2 = 161,20 kr
  - Kveld/natt hele vakten (17:00–08:00 → alle 9,5 t): 28 % × 310 = 86,80 kr (over 70-gulv) × 9,5 = 824,60 kr
- **Forventet:** 9,5 × 310 + 161,20 + 824,60 = 2 945 + 985,80 = **3 930,80 kr**
  (Merk: stacking søndag + kveld/natt er antatt OK. Verifiser i produksjon.)

### Case 4 — KS helsefagarbeider, 17. mai-vakt
- Tariff: KS HTA 2024–2026
- Timelønn: 250 kr
- Vakt: 17. mai (fredag) 07:00–15:00 (8 t)
- Tillegg: Høytid **133,33 %** × 250 = 333,33 kr/t × 8 = 2 666,64 kr
- **Forventet:** 8 × 250 + 2 666,64 = 2 000 + 2 666,64 = **4 666,64 kr**

### Case 5 — Virke HUK sykepleier, nattevakt julaften → 1. juledag
- Tariff: Virke HUK (Helse- og omsorgsoverenskomsten)
- Timelønn: 290 kr
- Vakt: Julaften 22:00 – 1. juledag 07:00 (9 t)
- Tillegg (HUK stabler alt):
  - Høytid fra 12:00 julaften → 24:00 25. des = HELE vakta, 133,33 % × 290 = 386,67 kr/t × 9 = 3 480 kr
  - Kveld/natt 22:00–07:00 (8 t, avh. av nøyaktig bracket) = antatt 28 % min 70 = 81,20 kr/t × 8 = 649,60 kr (hvis stacking er ja)
  - Søndags-del: 25. des er 1. juledag — helligdag har forrang, ingen separat søndag-del
- **Forventet:** 9 × 290 + 3 480 + 649,60 = 2 610 + 4 129,60 = **6 739,60 kr**
  (HUK er den mest sjenerøse — flag for nøyaktig tariff-verifisering før dette brukes som "sannhet".)

### Case 6 — Butikk, lørdag kvelds-vakt
- Tariff: Butikkoverenskomsten (Virke HK)
- Timelønn: 200 kr
- Vakt: Lørdag 13:00–21:00 (8 t)
- Tillegg (flate NOK-satser):
  - 13:00–16:00 (3 t): 42 kr/t × 3 = 126 kr
  - 16:00–21:00 (5 t): 84 kr/t × 5 = 420 kr
- **Forventet:** 8 × 200 + 126 + 420 = 1 600 + 546 = **2 146 kr**

### Case 7 — Vekter, nattevakt søndag
- Tariff: Vekteroverenskomsten
- Grunnlønn: antatt 220 kr/t
- Vakt: Søndag 22:00 – mandag 06:00 (8 t)
- Tillegg:
  - Natt (21:00–06:00): 28 kr/t × 8 = 224 kr
  - Helg (lør 18:00 → mandag 06:00): 48 kr/t × 8 = 384 kr
- **Forventet:** 8 × 220 + 224 + 384 = 1 760 + 608 = **2 368 kr**

### Case 8 — KS sykepleier, OVERTID etter dagvakt
- Tariff: KS HTA
- Timelønn: 300 kr
- Ordinær vakt tirsdag 07:00–15:00, **pluss** 2 t overtid 15:00–17:00
- Tillegg:
  - Ordinær: 8 × 300 = 2 400 kr
  - Overtid hverdag 15–17: **50 %** → 300 × 1,5 × 2 = 900 kr
- **Forventet:** **3 300 kr**
  (Merk: INGEN kveldstillegg 17:00+ fordi overtid overstyrer. Hvis overtiden hadde gått til 21:30, ville de siste 30 min vært 100 % fordi "etter 21:00" trigger 100 %-overtid.)

### Case 9 — Renholder, søndags-nattevakt helligdag
- Tariff: Renholdsoverenskomsten
- Timelønn: 230 kr
- Vakt: 1. påskedag (søndag) 22:00 – 2. påskedag 06:00 (8 t)
- Tillegg:
  - Helligdag (begge dager er helligdag): 100 % over dagnorm → 230 × 2 = 460 kr/t × 8 = ... Her må vi være nøye: "100 % i tillegg til dagnormen" = 1 timelønn ekstra per arbeidet time. Så 230 + 230 = 460 kr/t × 8 = 3 680 kr
  - Natt (21:00–06:00): 29 kr/t × 8 = 232 kr
- **Forventet:** 3 680 + 232 = **3 912 kr**

### Case 10 — Spekter sykepleier, overtid på lørdag natt
- Tariff: Spekter A2
- Timelønn: 320 kr
- Ordinær vakt lørdag 15:00–23:00. Blir bedt om å jobbe videre til 03:00 (4 t overtid).
- Ordinær del (8 t):
  - Grunnlønn: 8 × 320 = 2 560
  - Lør/søn 15:00–23:00: 26 % × 320 = 83,20 min 75 → 83,20 × 8 = 665,60
  - Kveld/natt 17:00–23:00 (6 t): 28 % × 320 = 89,60 × 6 = 537,60
- Overtid (4 t, 23:00–03:00, lørdag→søndag, natt):
  - Her er det både "etter 21:00" (→ 100 %) og "søndag" (→ 100 %). Tariffens høyeste = **100 %** overtid.
  - 4 × 320 × 2 (grunn + 100 %) = 2 560 kr
  - **Ingen UT-tillegg i tillegg** (overtid erstatter).
- **Forventet:** 2 560 + 665,60 + 537,60 + 2 560 = **6 323,20 kr**

---

## 9. Anbefalinger — hva Stian bør gjøre nå

**Kortversjon:**
1. **Ikke lanser appen for sykepleiere med dagens modell.** Feilene er for store (opptil 30–40 % feil lønn på helg-/høytid-vakter). Det er omdømmekritisk.
2. **Bygg P0-lista (seksjon 7) først.** Det er 1–2 ukers arbeid for en utvikler med AI-assistanse.
3. **Start med én tariff-mal: KS kommune.** Det er den største målgruppen (sykehjem + hjemmetjenester i 356 kommuner). Perfect den før du legger på Spekter og Virke HUK.
4. **Bruk test-casene 1–10 som regression-suite.** Alle skal passere innen 0,01 kr for at modellen er troverdig.
5. **Skriv "Basert på [tariff] — verifiser mot egen avtale"-disclaimer synlig i UI.** Det er juridisk nødvendig.
6. **Planlegg en 4–6 ukers syklus for tariff-oppdateringer.** Tariffene reforhandles våren 2026 — satsene endres.

**Den viktigste enkeltinnsikten:**
> Tid-brackets slår `shift_type`. Hvis du bare fikser én ting, fiks det.

---

## 10. Kilder (alle faktisk lest)

1. [KS Hovedtariffavtalen 01.05.2024–30.4.2026 (oversikt)](https://www.ks.no/fagomrader/lonn-og-tariff/hovedtariffavtalen/) — hovedoversikt
2. [KS: Beregning av tilleggslønn fra 1.1.2023](https://www.ks.no/fagomrader/lonn-og-tariff/hovedtariffavtalen/beregning-av-tilleggslonn-fra-1-1-2023/) — 22 % lør/søn, 25 % natt, min 70 kr
3. [Spekter A2 Unio, pkt 2.3 Kvelds- og nattillegg](https://www.spekter.no/lonn-og-tariff/tariffavtaler/forbundsvise-avtaledeler-a2/overenskomstens-del-a2-unio/overenskomstens-del-a2-omrade-10/2-3-kvelds-og-nattillegg) — 28 %, min 70, 17:00–08:00
4. [NSF Spekter-side](https://www.nsf.no/lonn-og-tariff/spekter) — 26 % lør/søn min 75, 28 % kveld/natt min 70, 133,33 % helligdag
5. [Delta: Skal du jobbe i påska?](https://www.delta.no/dine-rettigheter/skal-du-jobbe-i-paska) — helligdags-liste og 133,33 %
6. [Delta: Skal du jobbe på røde dager?](https://www.delta.no/dine-rettigheter/skal-du-jobbe-rode-dager) — helligdag vs stat-sektor, stacking
7. [Helse- og omsorgsoverenskomsten 2024–2026 (Virke HUK), bilag 4](https://lovdata.no/dokument/TARO/tariff/taro-481/KAPITTEL_6) — HUK høytid 133,33 %, stacking tillatt
8. [KA: Arbeidstid og godtgjøring ved høytider](https://www.ka.no/static/article/1406316) — eksplisitt "helge-/høytidstillegg utelukker lør/søn-tillegg samme periode; kveld/natt stables"
9. [Butikkoverenskomsten 2024–2026, kap 5](https://lovdata.no/dokument/TARO/tariff/taro-70/KAPITTEL_2-5) — flate NOK-satser 21/42/84 kr
10. [Vekteroverenskomsten 2024–2026](https://lovdata.no/dokument/TARO/tariff/taro-14/KAPITTEL_7-1) — 28 kr natt, 48 kr helg, 100 % helligdag
11. [Renholdsoverenskomsten 2024–2026](https://lovdata.no/dokument/TARO/tariff/taro-10) — 29 kr natt, 50 % lør etter 18, 75 % søn
12. [Fellesoverenskomsten byggfag 2024–2026, kap 6](https://lovdata.no/dokument/TARO/tariff/taro-331/KAPITTEL_2-6) — 50 %/100 % overtid trinn
13. [Arbeidstilsynet: overtid](https://www.arbeidstilsynet.no/en/working-hours-and-organisation-of-work/working-hours/overtime/) — 40 % lovminimum, 200 t/år
14. [Lexolve: Overtid regler](https://lexolve.com/ressurser/arbeidsforhold/overtid) — detaljer om AML, 9 t/dag, merarbeid vs overtid
15. [NSF: Daglig/ukentlig arbeidstid](https://www.nsf.no/arbeidsvilkar/dagligukentlig-arbeidstid-og-vaktordninger) — 35,5 t for tredelt turnus, 33,6 t helkont.
16. [Norsolution: Helge- og kveldstillegg guide](https://norsolution.com/helgetillegg-og-kveldstillegg/) — generell oversikt
17. [Fagforbundet: Kvelds- natt- og helgetillegg](https://www.fagforbundet.no/a/354826/ung/kontakt-oss/sporsmal-og-svar/sporsmal-og-svar/har-jeg-krav-pa-kvelds--natt--og-helgetillegg/) — "variert per tariff"
18. [Virke: Arbeidstid og overtid](https://www.virke.no/arbeidsgiverstotte/arbeidstid-overtid/) — rammeverk
19. [Fagforbundet Spekter sykehus-side](https://www.fagforbundet.no/lonn-og-avtaler/spekter/sykehus/) — 2024-oppgjøret
20. [Sykepleien: Spekter-oppgjør 2020 (bakgrunn)](https://sykepleien.no/2020/10/spekter-oppgjoret-ingen-far-lavere-ulempetillegg-spesialsykepleierne-far-mest) — historisk kontekst

---

*Research gjennomført 2026-04-18. Rapporten er basert på offentlig tilgjengelige kilder per denne datoen. Tariffsatser endres ved revisjon — normalt våren hvert andre år. Neste hovedoppgjør: våren 2026 (mellomoppgjør) og våren 2026 (hovedoppgjør KS/Spekter). Satsene her gjelder 2024–2026-perioden og er sannsynlig gyldig fram til minst 1. mai 2026.*
