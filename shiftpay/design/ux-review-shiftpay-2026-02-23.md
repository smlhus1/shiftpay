# UX-evaluering: ShiftPay

> Dato: 2026-02-23 | Deep mode (interaksjon + tilgjengelighet + design)

---

## Sammendrag

| Omrade | Score |
|--------|-------|
| Forstegangsopplevelse | 3/5 |
| Kognitiv belastning | Lav-Medium |
| Flyter analysert | 5 (import, bekreftelse, settings, dashboard, oppsummering) |
| AI-estetikk score | 5/10 (gjenkjennelig AI-generert) |
| Tilgjengelighet | Godt grunnlag, 5 kritiske funn |

### Topp 5 funn

1. **KRITISK: Import-flyten mangler progresjon og feedback** -- OCR tar 10-30s med bare en spinner i tomrom. Ingen skeleton, ingen forklaring av hva som skjer. Brukeren lurer pa om appen har hengt seg.

2. **KRITISK: ShiftEditor er kaotisk pa smaa skjermer** -- Dato + 2 tid-inputs + 4 shift-type pills + slett-ikon pa en flex-wrap-rad. Knekker stygt pa <380px skjermer.

3. **VIKTIG: Settings gir null veiledning** -- 6 identiske TextInput-felt uten gruppering, uten enhetshint, uten eksempelverdier. En sykepleier vet ikke om "Night supplement" er kr eller %. Placeholder "0" hjelper ikke.

4. **VIKTIG: Historikk-listen er flat** -- Bare "February 2026 >" uten info om antall vakter eller beregnet lonn. Brukeren ma trykke pa hver for a se noe nyttig.

5. **FORBEDRING: Appen mangler personlighet** -- Sky-blue accent (Tailwind sky-400), identiske kort overalt, null illustrasjoner. Fungerer, men foeles generert.

---

## Del 1: Interaksjonsdesign

### Flyt 1: Import (hovedflyt)

**Styrker:**
- Tydelig prioritering: Kamera > Galleri/Fil > CSV/Manuell
- "More options" gjemmer avanserte valg
- Deduplisering mot eksisterende vakter i DB
- Multi-image OCR med fremdriftsindikator
- Advarsel om base_rate=0 med lenke til Settings

**Problemer:**

| # | Problem | Alvorlighet |
|---|---------|-------------|
| I1 | OCR loading state er tom flate med spinner. 10-30s uten kontekst. | Kritisk |
| I2 | Etter vellykket OCR: ShiftEditor vises, men brukeren vet ikke at de kan redigere. Ingen instruksjon. | Viktig |
| I3 | "Calculate" og "Save" er separate handlinger. Brukeren ma trykke Calculate forst, deretter Save. Hvorfor ikke bare Save? | Viktig |
| I4 | Etter Save: kort "Saved!" (2s), sa forsvinner alt. Ingen navigasjon til dashboardet. Brukeren star pa import-skjermen med tom tilstand. | Viktig |
| I5 | Kameratillatelse-feil er hardkodet engelsk: "Camera permission required to take a photo." | Moderat |
| I6 | "OCR failed" er hardkodet engelsk | Moderat |
| I7 | Alert for gallery vs files er ikke standard for Android (brukere forventer bottom sheet) | Lavt |

**Forslag I1 -- OCR Loading:**
Erstatt naken spinner med:
- Skan-ikon med rotasjonsanimasjon
- "Reading your timesheet..." tekst
- 2-3 skeleton shift-kort som shimmerer
- Fremdriftstekst under ("Image 1 of 3...")

**Forslag I3 -- Foren Calculate+Save:**
- "Save" bor automatisk beregne lonn (vises i result-kortet etter save)
- Eller: "Calculate" blir preview, "Save & calculate" blir CTA
- Navaerende: 2 steg for a fa lonn + 1 steg for a lagre = 3 trykk. Bor vaere 1-2.

**Forslag I4 -- Etter Save:**
Vis suksess-skjerm med:
- Checkmark-animasjon
- "3 shifts saved for Feb 18-24"
- "View schedule" knapp (-> period detail)
- "Import more" knapp
- Automatisk redirect til dashboard etter 3s

### Flyt 2: Bekreft vakt (fra notifikasjon)

**Styrker:**
- Deep link fra push-notifikasjon fungerer
- UUID-validering pa shiftId
- Tre tydelige valg: Completed (gronn), Missed (noytral), Overtime (accent)
- Redigerbare dato/tid-felt for korreksjoner
- Haptic feedback pa bekreftelse

**Problemer:**

| # | Problem | Alvorlighet |
|---|---------|-------------|
| C1 | Auto-navigasjon etter 1.5s gir ikke nok tid til a lese suksessmeldingen, spesielt for skjermleserbrukere | Viktig |
| C2 | Redigeringsfeltene vises alltid, men er kun relevante nar noe er feil. Visuell stoy. | Moderat |
| C3 | Overtime-input krever at man taster timer OG minutter. Burde vaere enten minutter eller en enklere velger. | Moderat |

**Forslag C1:** Legg til en eksplisitt "Back"-knapp pa suksess-skjermen. Behold auto-redirect, men ok til 3s.

**Forslag C2:** Collapse redigeringsfelt bak en "Edit shift details" expander. Vis kun nar brukeren trenger det.

### Flyt 3: Settings (satser)

**Styrker:**
- Lokal lagring, ingen konto noodvendig
- Haptic feedback pa save
- Sprak/valuta/tema-velgere med radio-grupper
- About-seksjon med versjonsnummer

**Problemer:**

| # | Problem | Alvorlighet |
|---|---------|-------------|
| S1 | 6 identiske felt uten gruppering. "Base rate" og "supplements" er konseptuelt ulike. | Viktig |
| S2 | Ingen enhetshint. Er "Evening supplement" i kr/time, %, eller fast belop? | Viktig |
| S3 | Placeholder "0" gir null veiledning. Bruk "f.eks. 250" eller typiske verdier. | Viktig |
| S4 | Ingen forklaring av overtime_supplement (det er prosent, men feltet ser ut som de andre). | Viktig |
| S5 | Save-knappen er alltid synlig, ikke bare nar noe er endret. | Lavt |

**Forslag S1-S4:**
```
[Grunnlonn]
Timelonn (kr/t):  [  250  ]

[Tillegg per time (kr/t)]
Kveld:      [  56  ]
Natt:       [  75  ]
Helg:       [  50  ]
Helligdag:  [  133 ]

[Overtid]
Prosenttillegg:  [  40  ] %
```

### Flyt 4: Dashboard

**Styrker:**
- Pull-to-refresh
- Godt informasjonshierarki: neste vakt > lonn > ventende > uke > historikk
- Empty state med CTA til import
- Countdown til neste vakt

**Problemer:**

| # | Problem | Alvorlighet |
|---|---------|-------------|
| D1 | Historikk-kort er flat: bare "February 2026 >". Null info om innhold. | Viktig |
| D2 | "Pending confirmation"-tile og listen under overlapper. Tile viser tall, listen viser max 3 vakter. Forvirrende dobbelt-visning. | Moderat |
| D3 | Ingen visuell distinksjon mellom denne ukens vakter og neste-vakt-kortet | Lavt |

**Forslag D1:** Legg til mini-summary per maaned i historikken: "February 2026 -- 12 shifts, kr 34,500"

### Flyt 5: Manedsoversikt

**Styrker:**
- Stor lonnssum dominant ooverst
- Stat-bokser (planned/completed/overtime)
- Maaned-navigasjon med pil-knapper
- CSV-eksport
- Slett enkelt-vakter med bekreftelsesdialog

**Problemer:**

| # | Problem | Alvorlighet |
|---|---------|-------------|
| M1 | Ingen sammenligning med faktisk lonn. Det er hele poenget -- "ble jeg betalt riktig?" | Viktig |
| M2 | Navigasjonsknappene (forrige/neste maaned) er visuelt svake og mangler accessibilityLabel | Moderat |

**Forslag M1:** Legg til et felt for "Actual pay received" slik at brukeren kan se differansen. Eventuelt i v2, men det er kjernebrukscaset.

---

## Del 2: Tilgjengelighet (WCAG 2.1 AA)

### Kritisk (5 funn)

| # | Problem | Fil | WCAG |
|---|---------|-----|------|
| K1 | Modaler (onboarding, feil) mangler `accessibilityViewIsModal`, `accessibilityRole`, knapper mangler labels | `_layout.tsx:110-144` | 2.4.3, 4.1.2 |
| K2 | Next-shift-kortet: ingen samlende label, confirm-knapp mangler label | `(tabs)/index.tsx:209-225` | 4.1.2 |
| K3 | Ubekreftede-tile og listeelementer mangler accessibilityLabel | `(tabs)/index.tsx:249-283` | 4.1.2 |
| K4 | Kamera-skjerm utilgjengelig: CameraView uten a11y, overlegg i pointerEvents="none" | `CameraCapture.tsx` | 4.1.2, 1.1.1 |
| K5 | ShiftEditor-inputs har hardkodede engelske labels ("Date", "Start time"), ikke unike per rad | `ShiftEditor.tsx:72-96` | 4.1.2, 3.3.2 |

### Alvorlig (10 funn)

- Feilmeldinger annonseres ikke (mangler `accessibilityLiveRegion="assertive"`)
- Loading/OCR-progresjon annonseres ikke til skjermlesere
- Slett-knapper og navigasjonsknapper mangler accessibilityLabel pa flere skjermer
- AnimatedCard respekterer ikke "reduce motion"-preferanse
- Shift-type radio-knapper mangler radiogroup-wrapper
- Alle ActivityIndicator mangler accessibilityLabel
- Import-knapper (kamera, galleri, CSV, manuell) mangler accessibilityLabel

### Moderat (9 funn)

- ShiftEditor TextInput touch targets for smaa (~28-32px, minimum 44px)
- Section-overskrifter mangler `accessibilityRole="header"` (Dashboard: "Next shift", "This week", etc.)
- Amber tekst pa hvit bg: kontrast ~3.4:1 (grense for stor bold tekst)
- Hardkodede engelske feilmeldinger (kameratillatelse, OCR failed)
- Auto-navigasjon 1.5s pa confirm-success (WCAG 2.2.1: Timing Adjustable)
- StatBox mangler samlende accessibilityLabel
- PressableScale begrenser accessibilityRole til 3 verdier

**Full tilgjengelighetsrapport med kodeforslag:** Se accessibility-agent output.

---

## Del 3: Visuell design

### AI-estetikk score: 5/10
(10 = helt generisk AI, 0 = tydelig menneskelig)

**AI-rodflagg:**
- Sky-blue accent (#38BDF8) = Tailwind sky-400 = default i halvparten av AI-apper
- Identisk card-struktur overalt (`rounded-xl border bg-token p-4/p-5`)
- Inter font uten typografisk spenning
- Null illustrasjoner eller visuell personlighet
- Dark mode foeles som standardvalg, ikke bevisst

**Det som redder den:**
- Amber for lonnstall er semantisk smart og universelt
- Disiplinert fargesystem
- Ingen overdrivelser (gradienter, glassmorphism, unodvendige skygger)
- Haptics og mikrointeraksjoner gir kvalitetsfornemmelse

### Det som fungerer visuelt
1. Informasjonsarkitektur pa dashboardet
2. Loennstallet i amber/gull (text-4xl) dominerer riktig
3. Bekreftelsesflyt med fargekodede knapper (gronn/noytral/accent)
4. PressableScale med spring-animasjon (0.97 scale) + haptics
5. AnimatedCard staggered fade-in (350ms, 80ms delay)
6. StatusColor-badges med light/dark-varianter
7. Tab-struktur (3 tabs = perfekt for denne appen)

### Det som ikke fungerer visuelt
1. Settings = 6 identiske felt fra 2015
2. Loading state = spinner i tomrom
3. Empty state = generisk tekst uten visuell hook
4. ShiftEditor bryter pa smaa skjermer
5. Historikk-listen er flat uten informasjonsduft

### Designretning (anbefalt)

**Vibe:** "Warm utilitarian" -- som et godt arbeidsverktoy med menneskelig varme

**Farger:** Bytt sky-blue til dypere bla (#1D4ED8 light, #3B82F6 dark). Behold amber for lonn. Vurder varmere noytraler (stone i stedet for slate).

**Typografi:** Behold Inter, men med mer spenning: headings med `tracking-tight`, vurder DM Mono for lonnstall.

**Referanser:** Gentler Streak (varme), Things 3 (ren med omtanke), Vipps (norsk/funksjonelt), Linear (card-hierarki), Monzo (lonnsdata pa mobil).

---

## Prioritert handlingsplan

### Fase 1: Kritisk UX (1-2 dager)

1. **OCR loading state** -- Erstatt spinner med skeleton-kort, skan-ikon, fremdriftstekst
2. **ShiftEditor layout** -- To-rads: dato+tid pa rad 1, shift-type pills pa rad 2
3. **Settings gruppering** -- Seksjon-headers, enhetshint (kr/t, %), eksempelverdier
4. **Etter-save navigasjon** -- Suksess-skjerm med "View schedule" / "Import more"
5. **A11y: Modaler** -- `accessibilityViewIsModal`, roller, labels

### Fase 2: Viktig UX (1-2 dager)

6. **Historikk med mini-summary** -- "Feb 2026 -- 12 shifts, kr 34,500"
7. **Empty state med personlighet** -- Ikon, varm tekst, kamera-CTA
8. **A11y: Live regions** -- Feilmeldinger og loading-tilstander
9. **A11y: Alle accessibilityLabels** -- Import-knapper, navigasjon, slett-knapper
10. **Foren Calculate+Save** -- En handling i stedet for to

### Fase 3: Polering (2-3 dager)

11. **Fargebytte** -- Fra sky-blue til dypere bla
12. **AnimatedCard: reduce motion** -- Respekter systempreferanse
13. **Confirm auto-redirect** -- ok til 3s + eksplisitt back-knapp
14. **Sammenligning mot faktisk lonn** -- Input-felt for "What you actually got paid"
15. **Varmere noytraler** -- stone i stedet for slate
