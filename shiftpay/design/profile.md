# ShiftPay — Designprofil

> Versjon 1.0 | 2026-02-20
> React Native + NativeWind (Tailwind CSS) | Android first

---

## 1. Brand Personality

**Trygg. Direkte. Norsk. Tilgjengelig. Rettferdig.**

ShiftPay er en app for folk som har jobbet en lang natt og vil vite om de fikk det de hadde krav på. Den er ikke et analyse-dashbord. Den er ikke et prosjektverktøy. Den er en pålitelig kollega som hjelper deg sjekke én ting — og gjør det uten stress.

**Trygg:** Appen skal aldri føles usikker eller uklar. Brukeren stoler på svarene den gir. Farger, typografi og layout signaliserer stabilitet, ikke eksperiment.

**Direkte:** Hoved-tallet (forventet lønn) er alltid størst og kommer alltid først. Ingen unødvendige steg. Ingen dekorasjon som ikke gjør jobben lettere.

**Norsk:** Ikke teknologisk, ikke klinisk. Språket er som det du bruker på vaktrommet. "Du bør ha fått" — ikke "Expected compensation". Appen er laget for deg, ikke for appbutikken.

**Tilgjengelig:** Brukes etter nattevakt, på bussen, med innsovnede fingre. Alt er lesbart i 16px+. Alle touch-targets er minimum 44px. Kontrast er minimum 4.5:1 overalt.

**Rettferdig:** Appen kjemper for brukeren. Den er på laget til sykepleieren, ikke arbeidsgiveren. Det skal synes i tonen og i designet.

**Referanseapper:**
- Gentler Streak — varm og menneskelig, snakker til brukeren som et menneske i en krevende situasjon
- Vipps — norsk, friksjonsfri, ingen unødvendige engelske ord
- Spiir — skandinavisk økonomi-app, hoved-tall alltid størst og fremst

---

## 2. Fargeplett

### Beslutning: Bytt primærfarge fra `blue-600` til `teal-700`

Blå er pålitelig og funksjonelt, men i helsesammenheng er det klinisk. Teal er varm nok til å ha personlighet, nøytral nok til å beholde autoritet, og skiller seg fra den generiske "AI-appen er blå"-estetikken som reviewen identifiserte. Det gir også bedre visuell separasjon mellom primærhandling (teal) og info/link (blå-grå), som i dag blandes.

```
Primær:           teal-700   #0f766e   — primærknapper, tab-aktiv, viktig aksjoner
Primær-pressed:   teal-800   #115e59   — pressed state, 10% mørkere
Primær-light:     teal-50    #f0fdfa   — primærkortes bakgrunn, fremhevede soner
Primær-border:    teal-200   #99f6e4   — kant på teal-50-kort

Sekundær:         slate-700  #334155   — sekundærknapper, heading-tekst, viktige labels
Sekundær-muted:   slate-500  #64748b   — body-tekst, beskrivelser
Muted:            slate-400  #94a3b8   — timestamps, placeholders, caption

Bakgrunn:         stone-50   #fafaf9   — main background (varmere enn gray-50)
Surface:          white      #ffffff   — kort, input-felter, modaler
Surface-muted:    stone-100  #f5f5f4   — deaktivert overflate, compact kort

Kant:             stone-200  #e7e5e3   — kortborder, input-border (varmere enn gray-200)
Kant-sterk:       stone-300  #d6d3d1   — deler, sterkere skille

Success:          emerald-600 #059669  — fullført vakt, lagret, bekreftelse
Success-light:    emerald-50  #ecfdf5  — success-kortbakgrunn
Success-border:   emerald-200 #a7f3d0  — kant på success-kort

Warning:          amber-600   #d97706  — ubekreftede vakter, mangler
Warning-light:    amber-50    #fffbeb  — warning-kortbakgrunn
Warning-border:   amber-200   #fde68a  — kant på warning-kort

Error:            red-600     #dc2626  — feil, valideringsfeil
Error-light:      red-50      #fef2f2  — error-kortbakgrunn
Error-border:     red-200     #fecaca  — kant på error-kort

Overtid/info:     violet-600  #7c3aed  — overtid-badge (distinkt fra success og warning)
Overtid-light:    violet-50   #f5f3ff  — overtid-kortbakgrunn
```

### Hva fjernes
- `bg-blue-600` som primærfarge på knapper — erstattes av `bg-teal-700`
- `bg-blue-50` / `border-blue-200` som primærkort — erstattes av `bg-teal-50` / `border-teal-200`
- `text-blue-600` som link/aksjonstekst — erstattes av `text-teal-700`
- `bg-gray-50` som bakgrunn — erstattes av `bg-stone-50`
- `border-gray-200` på kort — erstattes av `border-stone-200`

### Hva beholdes
- `bg-green-600` / `bg-emerald-600` for success-aksjoner (fullført vakt-knapp — beholdes grønn, det er riktig semantikk)
- `bg-amber-50` / `border-amber-200` for warning — beholdes, fungerer godt
- `bg-red-100` / `text-red-800` for feil — beholdes, fungerer godt

---

## 3. Typografi

### Font-valg: DM Sans

DM Sans via Google Fonts i Expo (`expo-google-fonts/dm-sans`). Grunner:

1. Veldig lesbar i små størrelser på OLED-skjermer (mange Android-brukere)
2. Har en lett runding i bokstavene som gir varme uten å bli barnslig
3. Skiller seg synlig fra system-Roboto uten å føles fremmed
4. Variabel font — én fil, alle vekter

**Alternativ hvis DM Sans ikke kan lastes:** Inter via `expo-font`, men DM Sans er å foretrekke.

### Typografisk skala

```
Display:      text-3xl   30px / lh-9 (36px)   font-bold      — forventet lønn (hoved-tall)
H1:           text-2xl   24px / lh-8 (32px)   font-semibold  — skjermtitler, periode-navn
H2:           text-xl    20px / lh-7 (28px)   font-semibold  — seksjonstitler, korttitler
H3:           text-lg    18px / lh-6 (24px)   font-medium    — underkategorier, vakt-dato
Body:         text-base  16px / lh-6 (24px)   font-normal    — all brødtekst
Body-small:   text-sm    14px / lh-5 (20px)   font-normal    — sekundær info, beskrivelser
Label:        text-sm    14px / lh-5 (20px)   font-medium    — input-labels, badge-tekst
Caption:      text-xs    12px / lh-4 (16px)   font-normal    — timestamps, disclaimers
```

### Bruk i praksis

```
Forventet lønn-tall:       text-3xl font-bold text-slate-900
Måneds-/skjermtittel:      text-2xl font-semibold text-slate-900
Korttittel:                text-lg font-semibold text-slate-900
Dato/tid på vakt:          text-base font-medium text-slate-900
Beskrivende brødtekst:     text-sm text-slate-500
Input-label:               text-sm font-medium text-slate-700
Badge-tekst:               text-xs font-medium
Disclaimer/OCR-advarsel:   text-xs text-slate-400
```

---

## 4. Spacing og layout

### Grid: 4pt base, 8pt rytme

NativeWind bruker standard Tailwind spacing (1 = 4px). Alt følger 4pt-grid. Primær enhet er 8pt.

```
Sidemargin (ScrollView padding):    px-4      16px — standard skjerm-padding
Kort-padding (internt):             p-4       16px — standard kort
Kort-padding (fremhevet):           p-5       20px — lønn-kort, neste-vakt-kort
Mellomrom mellom kort:              mb-3      12px — standard
Mellomrom seksjon:                  mb-6      24px — mellom logiske grupper
Gap mellom inline-elementer:        gap-2     8px  — badges, knapperader
Gap mellom stat-bokser:             gap-3     12px — månedsstats

Minimum touch target:               min-h-[44px] — ALLE interaktive elementer
Knapp-padding (vertikal):           py-3      12px + tekst-høyde = ~44px OK
Knapp-padding (stor/primær):        py-4      16px + tekst-høyde = ~52px — anbefalt primær
Input-padding:                      px-4 py-3  — min 44px høyde
```

### "Luft"-prinsipp

ShiftPay er en app som leses raskt etter en lang vakt. Prioriter luft over informasjonstetthet. Tomme felter er bedre enn overfylte. Hvert kort skal ha én ting å si — hvis det har tre ting, vurder om to av dem hører hjemme et annet sted.

Unngå: Tre kort stablet uten pusterom. Inline-tekst med komma-separerte tall.
Foretrekk: Stat-bokser side om side, ett tall per boks, mye hvit luft rundt.

---

## 5. Komponentprinsipper

### Knapper

**Primær — klar og tydelig:**
```
bg-teal-700 rounded-xl py-4 px-6
text-base font-semibold text-white text-center
min-h-[52px]

Pressed: bg-teal-800 opacity-90
Disabled: opacity-40
```

**Sekundær — outline, tydelig men tilbaketrukket:**
```
bg-white border-2 border-stone-300 rounded-xl py-4 px-6
text-base font-medium text-slate-700 text-center
min-h-[52px]

Pressed: bg-stone-50
Disabled: opacity-40
```

**Ghost (tertiær / tekstlenke-knapp):**
```
py-3 px-4
text-sm font-medium text-teal-700 text-center
min-h-[44px]
```

**Destructive (farlig handling — "Fjern rad", "Avbryt"):**
```
bg-white border border-stone-200 rounded-xl py-3 px-4
text-sm font-medium text-red-600 text-center
min-h-[44px]
```

**Success-aksjon (Bekreft fullført vakt):**
```
bg-emerald-600 rounded-xl py-4 px-6
text-base font-semibold text-white text-center
min-h-[52px]
```

**Border-radius: `rounded-xl` (12px) overalt.** Ikke `rounded-lg` (8px). Den ekstra rundingen gir varme og skiller seg fra standard Material-utseende.

### Kort

**Standard informasjonskort:**
```
bg-white border border-stone-200 rounded-xl p-4 mb-3
```

**Fremhevet kort (Neste vakt, Forventet lønn):**
```
bg-teal-700 rounded-xl p-5 mb-4
(tekst i white og teal-100/200)
```

**Warning-kort (Venter på bekreftelse):**
```
bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4
```

**Success-kort (Vakt bekreftet):**
```
bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4
```

**Aldri:** Legg én kortstil på alt. Bruk kortfarger som semantisk signal — ikke bare dekorasjon.

### Input-felter

```
bg-white border border-stone-300 rounded-xl px-4 py-3
text-base text-slate-900
min-h-[48px]

Focus: border-teal-500 (via Platform-spesifikk selection color)
Error: border-red-400 bg-red-50
Placeholder: text-slate-400
```

**Label over feltet (alltid synlig, aldri floating):**
```
text-sm font-medium text-slate-700 mb-1.5
```

### Status-badges

Badges brukes på vakt-status (planned, completed, missed, overtime) og skift-type (tidlig, mellom, kveld, natt).

**Status-badges:**
```
Planned:    bg-stone-100 text-slate-600     rounded-full px-2.5 py-0.5 text-xs font-medium
Completed:  bg-emerald-100 text-emerald-800  rounded-full px-2.5 py-0.5 text-xs font-medium
Missed:     bg-red-100 text-red-700          rounded-full px-2.5 py-0.5 text-xs font-medium
Overtime:   bg-violet-100 text-violet-700    rounded-full px-2.5 py-0.5 text-xs font-medium
```

**Skift-type-badges:**
```
Tidlig:  bg-amber-100 text-amber-800   rounded-full px-2 py-0.5 text-xs font-medium
Mellom:  bg-blue-100 text-blue-800     rounded-full px-2 py-0.5 text-xs font-medium
Kveld:   bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5 text-xs font-medium
Natt:    bg-slate-200 text-slate-700   rounded-full px-2 py-0.5 text-xs font-medium
```

**Aldri:** `rounded` (2px) på badges. Bruk `rounded-full` — det er den riktige formen for inline status-indikatorer på mobil.

### Stat-bokser (månedsoversikt)

```jsx
<View className="flex-1 bg-white border border-stone-200 rounded-xl p-3 items-center">
  <Text className="text-2xl font-bold text-slate-900">37.5</Text>
  <Text className="text-xs font-medium text-slate-500 mt-0.5">timer planlagt</Text>
</View>
```

Tre side om side med `gap-3`. Ikke inline tekst med kommaer.

---

## 6. Tone of voice (UI-tekst)

### Prinsipp: Snakk til sykepleieren, ikke til systemet

Appen vet hvem den er laget for. Den bruker "du", ikke passiv form. Den gir svar, ikke bare data. Den bekrefter godt arbeid uten å overgjøre det.

**Register:** Bokmål, uformelt men ikke kameratslig. Ingen sjargong. Ingen tech-ord. Konsekvent "du"-form.

**Direkte eller formell?** Direkte — men aldri frekt. "Du bør ha fått 34 520 kr" er direkte. "Basert på beregningen forventes det at det utbetalte beløpet tilsvarer" er formelt og unødvendig.

### Eksempler

```
GALT:   "Ingen vaktplaner ennå"
RIKTIG: "Ingen vakter ennå"
RIKTIG: "Start med å ta et bilde av timelisten din"

GALT:   "Expected pay: 34520.00 kr"
RIKTIG: "Du bør ha fått 34 520 kr"

GALT:   "Base rate"
RIKTIG: "Grunnlønn"

GALT:   "Night supplement"
RIKTIG: "Nattillegg"

GALT:   "OCR failed"
RIKTIG: "Kunne ikke lese bildet. Prøv igjen."

GALT:   "Saved. You can import another."
RIKTIG: "Lagret. Du kan importere en ny liste."

GALT:   "Camera permission required to take a photo."
RIKTIG: "ShiftPay trenger tilgang til kameraet for å ta bilde av timelisten."

GALT:   "Error loading data"
RIKTIG: "Kunne ikke laste data. Dra ned for å prøve igjen."

GALT:   "Take photo"
RIKTIG: "Ta bilde"

GALT:   "Cancel"
RIKTIG: "Avbryt"

GALT:   "Save"
RIKTIG: "Lagre"

GALT:   "+ Add another shift"
RIKTIG: "+ Legg til nytt skift"

GALT:   "Shift confirmed!"
RIKTIG: "Vakt bekreftet."

GALT:   "Calculate"
RIKTIG: "Beregn lønn"

GALT:   "Timesheet"
RIKTIG: "Timeliste" eller "Vaktplan"
```

### Beløpsformatering

Beløp formateres alltid med norsk lokale og heltallavrunding når det presenteres som hoved-tall:
```
34520.50 kr  →  "34 521 kr"    (hoved-display)
34520.50 kr  →  "34 520,50 kr" (detalj-visning i oppsummering)
```

Bruk `Math.round(pay).toLocaleString('nb-NO') + ' kr'` for hoved-tall.

### Tomme tilstander

Tomme tilstander skal hjelpe, ikke bare konstatere at noe er tomt. De skal fortelle brukeren hva de får når de er ferdige:

```
Dashboard (ingen vakter):
  Tittel: "Ingen vakter ennå"
  Brødtekst: "Ta et bilde av timelisten din for å sjekke om lønnen stemmer."
  CTA: "Ta bilde av timeliste"

Månedsoversikt (ingen data):
  "Ingen fullførte vakter denne måneden."
  (ingen CTA nødvendig — brukeren navigerte hit aktivt)
```

---

## 7. Konkrete Tailwind-klasser: endringer fra i dag

### Erstatt direkte

| Fra (i dag) | Til (ny profil) | Brukes på |
|-------------|-----------------|-----------|
| `bg-blue-600` | `bg-teal-700` | Primærknapper, tab-aktiv |
| `bg-blue-50` | `bg-teal-50` | Primær-kort-bakgrunn |
| `border-blue-200` | `border-teal-200` | Primær-kort-kant |
| `text-blue-600` | `text-teal-700` | Link-tekst, aksjonstekst |
| `text-blue-900` | `text-slate-900` | Tekst på primær-kort |
| `bg-gray-50` | `bg-stone-50` | Skjerm-bakgrunn |
| `border-gray-200` | `border-stone-200` | Kort-kant, input-kant |
| `border-gray-300` | `border-stone-300` | Sekundærknapp-kant |
| `text-gray-900` | `text-slate-900` | Primær tekst |
| `text-gray-700` | `text-slate-700` | Sekundær mørk tekst |
| `text-gray-600` | `text-slate-500` | Brødtekst, beskrivelser |
| `text-gray-500` | `text-slate-400` | Muted, placeholders |
| `bg-gray-100` | `bg-stone-100` | Muted overflate |
| `bg-gray-200` | `bg-stone-200` | Badge-bakgrunn (generisk) |
| `rounded-lg` på kort | `rounded-xl` | Alle kort |
| `rounded-lg` på knapper | `rounded-xl` | Alle knapper |
| `rounded` på badges | `rounded-full` | Alle status-badges |
| `py-2` på sekundær CTA | `py-3` | Sekundærknapper (touch-target) |
| `py-3` på primær CTA | `py-4` | Primærknapper (komfortabel target) |
| `border-gray-100 bg-gray-50` (compact ShiftCard) | `border-stone-100 bg-stone-50` | Compact ShiftCard |

### Tailwind config-utvidelse

Legg disse i `tailwind.config.js` → `theme.extend.colors` for å ha semantiske navn tilgjengelig:

```js
theme: {
  extend: {
    colors: {
      brand: {
        DEFAULT: '#0f766e',   // teal-700
        light: '#f0fdfa',     // teal-50
        dark: '#115e59',      // teal-800
        border: '#99f6e4',    // teal-200
      },
    },
  },
},
```

### Ny tab-bar-konfigurasjon

```tsx
// app/(tabs)/_layout.tsx
screenOptions={{
  tabBarActiveTintColor: '#0f766e',   // teal-700
  tabBarInactiveTintColor: '#94a3b8', // slate-400
  headerStyle: { backgroundColor: '#ffffff' },
  headerTitleStyle: { color: '#0f172a', fontWeight: '600' },
  headerShadowVisible: false,
  tabBarStyle: {
    borderTopColor: '#e7e5e3',  // stone-200
    backgroundColor: '#ffffff',
  },
}}
```

### ActivityIndicator-farger

Bytt alle `color="#2563eb"` til `color="#0f766e"` (teal-700).

### RefreshControl-farger

Bytt `colors={["#2563eb"]}` til `colors={["#0f766e"]}`.

---

## 8. Skjerm-for-skjerm prioriterte endringer

### Dashboard (høy prioritet)

1. Fremhevet "Neste vakt"-kort: `bg-teal-700 p-5 rounded-xl` med tekst i `text-white` og `text-teal-100`
2. Forventet lønn på månedssummary-kortet: `text-3xl font-bold` i hvit på teal-bakgrunn
3. Alle standard kort: `rounded-xl border-stone-200`
4. Tab-ikon: bytt `time-outline` til `home-outline` og rename til "Oversikt"

### Import (høy prioritet)

1. Primærknapp: `bg-teal-700 rounded-xl py-4` — større og tydeligere
2. Sekundærknapp: `border-2 border-stone-300 rounded-xl py-4` — outline, ikke flat
3. Ghost-lenke for CSV/manuell: `text-sm text-slate-400 py-3` — nedgradert visuelt
4. OCR-fremdriftsmeldinger: legg til et subtilt progress-punkt under teksten

### Satser / Settings (høy prioritet)

1. Alle labels: oversett til norsk (se punkt 6)
2. Input-felter: `rounded-xl border-stone-300 px-4 py-3`
3. Label: `text-sm font-medium text-slate-700 mb-1.5`
4. Lagre-knapp: `bg-teal-700 rounded-xl py-4`

### Månedsoversikt (middels prioritet)

1. Flytt forventet lønn til øverst med `text-3xl font-bold` på teal-kort
2. Stat-bokser side om side (3 stk) istedenfor inline tekst
3. Vakt-liste: ShiftCard med `rounded-xl`

### Bekreft vakt (lav prioritet — fungerer godt)

1. Oppdater farger til ny plett
2. Success-state: beholder emerald men oppdaterer `rounded-xl`

---

## 9. Referanseapper

**Gentler Streak** — https://gentlestreak.com
Perfekt analog. Helseapp for folk som gjør noe krevende. Varm, menneskelig tone, snakker alltid direkte til brukeren. Bruker farger som signal, ikke dekorasjon. Tom-states er motiverende, ikke passive.

**Spiir** — skandinavisk personlig økonomi
Hoved-tallet (saldo, forventet utgift) er alltid størst og fremst. Alt annet er kontekst. Bruker tydelig typografisk hierarki for å la brukeren scanne på 2 sekunder. Direkte norsk/skandinavisk språk.

**Vipps** — norsk fintech
Norsk gjennomgående — ingen engelske ord uten grunn. Konsistent og forutsigbar interaksjon. Ingen overraskelser. Friksjonsfri primæraksjon, alt annet er sekundært.

---

## Implementeringsrekkefølge

| Prioritet | Oppgave | Effekt |
|-----------|---------|--------|
| 1 | Erstatt `blue-600` med `teal-700` overalt | Visuell identitet, hoved-fargebytte |
| 2 | Erstatt `gray-*` med `stone-*` / `slate-*` | Varmere nøytralpalette |
| 3 | `rounded-lg` → `rounded-xl` på alle kort og knapper | Mykere, mer moderne |
| 4 | Norsk tekst overalt (se punkt 6) | Tillit og profesjonalitet |
| 5 | Primærknapper: `py-3` → `py-4` | Bedre touch-targets |
| 6 | Fremhevet lønn-kort med teal-bakgrunn | Klar visuell hierarki |
| 7 | Stat-bokser i månedsoversikt | Lesbarhet på hoved-skjerm |
| 8 | DM Sans font | Personlighet og lesbarhet |
