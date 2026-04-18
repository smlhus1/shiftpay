# ShiftPay-beregningsmodell — intern gjennomgang

> Dato: 2026-04-18
> Fil analysert: `shiftpay/lib/calculations.ts` (90 linjer) + schema fra `shiftpay/CLAUDE.md`.
> Mål: finne svakheter / feil / gaps i beregningslogikken før vi setter kursen videre.

## TL;DR — 7 kritiske svakheter

1. **Shift-type er kategorisk, ikke time-basert.** En «kveld»-vakt får kveldstillegg for *alle* timer, selv om den starter 15:00. Faktiske tariffer gir kveldstillegg kun for timer etter kl. 17 (varierer per tariff).
2. **Nattgrense er feil.** Bare vakter som *starter* 22:00-05:59 får nattillegg. En vakt 15:00-23:00 («kveld») får 0 nattillegg selv om kl. 22-23 er natt.
3. **Høytidstillegg brukes ikke i det hele tatt.** Feltet finnes i schema og UI, men `calculateExpectedPay` ignorerer det fullstendig. Røde dager (17. mai, 1. mai, jul, påske, pinse, himmelfart) gir ingen ekstra lønn.
4. **Tilleggsstabling mangler logikk.** Ingen håndtering av at nattillegg + helgetillegg + høytidstillegg stables i reelle tariffer (med ulike regler per tariff).
5. **Tillegg er flat NOK/time, alltid.** Mange tariffer bruker **prosent av grunnlønn** — dette bryter skaleringslogikken (en høytlønnet får like mye helgetillegg som lavtlønnet).
6. **Ingen tariff-templates.** Bruker må gjette eller slå opp alle satsene manuelt. For sykepleier i KS er det ca. 6 ulike tillegg å holde styr på.
7. **Ingen sanity checks.** Ingen grense på ukentlig/daglig timer, ingen validering av at rates gir meningsfulle tall, ingen varsler hvis vakten virker umulig (f.eks. 18 timer).

---

## Nåværende modell — formell beskrivelse

```
for shift in shifts:
    hours = (end - start) / 60          # håndterer overnattig via +24h
    rate  = base_rate
          + (shift_type == "kveld" ? evening_supplement : 0)
          + (shift_type == "natt"  ? night_supplement   : 0)
          + (isWeekend(date)        ? weekend_supplement : 0)
    total += hours * rate

for shift in shifts (if overtime_minutes > 0):
    overtime_pay += (overtime_minutes / 60) * base_rate * (1 + overtime_supplement/100)
```

Der `shift_type` bestemmes av `start_time`:
- 06:00-11:59 → `tidlig`
- 12:00-15:59 → `mellom`
- 16:00-21:59 → `kveld`
- 22:00-05:59 → `natt`

## Konkrete scenarier der modellen feiler

### Scenario A: Kveldsvakt 15-23 (vanlig i helse)
- **Modell:** Alle 8 timer regnes som `kveld` (fordi start = 15 → «mellom»... vent, 15 er mellom. Så hele vakten får ingen tillegg!). Feil allerede på klassifiseringen.
- **Faktisk:** 15-17 er dag (0), 17-21 kvelds­tillegg, 21-23 er ofte aften- eller natt­tillegg i flere tariffer. 

### Scenario B: Nattvakt 20-08 (kombinert kveld/natt)
- **Modell:** Start = 20:00 → `kveld`. Hele 12-timersvakten får kveldstillegg, ingen natt-tillegg. Fullstendig feil.
- **Faktisk:** 20-22 kvelds, 22-06 natt, 06-08 dag. Tre ulike satser.

### Scenario C: Søndagsvakt 08-16 (ren dagvakt)
- **Modell:** Start = 08:00 → `tidlig`. Bare grunnlønn + helgetillegg. Greit.
- **Faktisk:** Litt greit, men mange tariffer har høyere tillegg på søndag vs lørdag. Vår modell har én `weekend_supplement` som ikke skiller.

### Scenario D: 17. mai på en onsdag
- **Modell:** `holiday_supplement` brukes ikke. Vakten beregnes som vanlig onsdag.
- **Faktisk:** Tillegg opp mot 133% av grunnlønn (store høytidsdager).

### Scenario E: Overtid 2 timer etter en natt-vakt
- **Modell:** `base_rate * (1 + overtime_supplement/100)` — ett tall uansett.
- **Faktisk:** Første 2 timer overtid: +50%. Videre: +100%. Utenom ordinær turnus: ofte +133% eller +100%. Vår modell mister nyansen.

### Scenario F: Vakt i KS med grunnlønn 350 NOK/time
- **Modell:** Bruker setter `evening_supplement = 53 NOK/time` (eksempel). Fast tall.
- **Faktisk:** Tariff sier «kveldstillegg 21% av timelønn for ugunstig arbeidstid kl. 17-21». Ved grunnlønn 350 = 73.50 NOK/time. Vi undervurderer konsekvent.

---

## Manglende dimensjoner

Felter/regler modellen vår ikke engang prøver å dekke:

| Dimensjon | Hvorfor det matter |
|---|---|
| **Tid-bracketed beregning** | Kveldstillegg skal per time etter 17:00, ikke hele vakten |
| **Kombinasjonsregler** | Nattillegg på søndag: stables? Maks av? Spesiell sats? |
| **Prosent-basert tillegg** | Skaleres med grunnlønn |
| **Lønnstrinn / ansiennitet** | KS, Spekter-rammer bruker tariff-trinn, ikke fast beløp |
| **Normalarbeidstid per uke** | 35.5 / 33.6 / 37.5 — avgjør når overtid utløses |
| **Delt dagsverk** | Vikarbyrå — splittet vakt utløser eget tillegg |
| **Matpause betalt eller ubetalt** | Trekk eller ikke trekk fra timene |
| **Oppmøtetillegg** | Kort varslingstid, helgekompensasjon |
| **Utkommandering/innkalling** | Kalt inn på fridag — egen kompensasjon |
| **Minstelønn** | Enkelte tariffer har garantert minstelønn per vakt (f.eks. 4 t) uansett faktisk tid |

## Robusthet og validering

- **Ingen grense for antall timer per dag.** Bruker kan lage en 36-timersvakt → stort urealistisk tall. Bør advare.
- **Ingen grense for ugentlig sum.** Arbeidstidsloven: 9 t/dag, 40 t/uke (med unntak for turnus opp til 48 t).
- **Negativ eller null grunnlønn** blokkeres med clamp >= 0, men lønn på 0 aksepteres og gir 0 kr — misvisende UI-opplevelse.
- **Ingen sanity-test av resultatet.** Hvis forventet månedslønn er 5.000 eller 50.000 kr, ingen varsler.

## Testdekning

```
No test files exist yet.
```

Denne beregnings­logikken har **0 enhetstester**. Hver endring er risiko. Før vi utvider modellen, bør vi:
- Lage et sett fixtures med reelle vakter + forventet lønn fra faktiske tariff-tabeller
- Snapshot-teste hver beregning
- Flag-regresjoner før deploy

## Forslag til ny datamodell (å teste mot research-agent)

```typescript
interface TariffRates {
  // Baseline
  base_rate: number;                   // NOK/time
  
  // Time-brackets (per hour worked within window)
  evening: {
    start: string;      // "17:00"
    end: string;        // "21:00"
    supplement_pct: number | null;     // 21 = 21% of base_rate
    supplement_nok: number | null;     // alternativt: fast NOK/time
  };
  night: {
    start: string;      // "21:00" or "22:00"
    end: string;        // "06:00"
    supplement_pct: number | null;
    supplement_nok: number | null;
  };
  
  // Weekend — differensiert lørdag/søndag
  saturday_supplement_pct: number | null;
  sunday_supplement_pct: number | null;
  
  // Holidays (røde dager)
  holiday_supplement_pct: number;      // ofte 133%
  
  // Stacking rules
  stacking_mode: "additive" | "max_wins" | "custom";
  // "additive": 21% + 25% + 50% = 96% over base
  // "max_wins": høyeste tillegg vinner (vanlig i noen tariffer)
  
  // Overtid
  normal_weekly_hours: number;         // 35.5 / 37.5 / 33.6
  overtime_first_2h_pct: number;       // 50
  overtime_after_pct: number;          // 100
  overtime_holiday_pct: number;        // 133
  
  // Minstelønn per vakt
  minimum_shift_hours: number | null;  // e.g. 4.0
}
```

Og vakter får per-time breakdown i `calculateExpectedPay`:

```typescript
function calculateShiftPay(shift, rates): {
  hours: Array<{ hour: number; hourly_rate: number; reason: string[] }>,
  total: number,
} {
  // Splitt vakten i 15-min intervaller
  // For hvert intervall: beregn hvilke tillegg gjelder (time-bracket match + weekend + holiday)
  // Stable etter stacking_mode
  // Returner bruddstykket + sum
}
```

Dette gir:
- Nøyaktig per-time-lønn
- Brukeren kan se *hvorfor* lønna blir som den blir
- Fungerer for enhver tariff uten hardkoding per bransje

---

## Hva jeg venter på fra research

En parallell research-agent undersøker:
- Faktiske tariff-satser per sektor (KS, Spekter, Virke, NHO)
- Eksakte tid-brackets per tariff
- Stablings-regler (additive vs max_wins)
- Røde dager per norsk arbeidsrett
- Overtids-trappens konkrete satser

Når den rapporten er inne, kan vi validere/justere datamodellen ovenfor og lage test-fixtures.

Rapport: `/Users/stianmelhus/projects/personal/shiftpay/research/norsk-tariff-beregning-2026-04-18.md` (når klar)
