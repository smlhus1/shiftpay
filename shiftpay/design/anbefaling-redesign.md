# Anbefaling — redesign av ShiftPay-appen

> Dato: 2026-04-15
> Kilder: `shiftpay-site/DESIGN.md` (landingsside-konstitusjon), `shiftpay/research/non-ai-web-design-2026-04-14.md` (AI-design-research), `shiftpay/design/profile.md`, `shiftpay/design/ux-review-shiftpay-2026-02-23.md`.
> Forfatter: Claude (Mac-sesjon).
> Status: **Forslag.** Ingenting er implementert. Appen er live på TestFlight og Play Store intern — enhver endring bør rulles gradvis.

---

## TL;DR

Appens nåværende design er funksjonelt solid, men typisk "React Native SaaS i 2026": Inter + blå aksent + stone-palett + default-Tailwind-tokens. Det ser ikke dårlig ut — men det ser ut som *enhver annen app*. Landingssiden vår har nettopp fått en tydelig signatur ("Kveldsvakt", Fraunces + warm coffee + burnt sienna). Appen bør trekke mot samme familie uten å bli en kopi.

**Primæranbefaling:** Behold den funksjonelle strukturen og begynn en **evolusjonær migrasjon av token-laget**. Ikke rewrite. Bytt farger, typografi og noen utvalgte komponent-detaljer i en 3-fase-plan over 2-3 uker. App-en skal *føles* som samme familie som landingssiden når Kari går fra én til den andre — ikke identisk, men gjenkjennelig.

**Hva du IKKE skal gjøre:** Bytte navigasjonsstrukturen, rive opp lønnsberegninger, eller "modernisere" komponenter som allerede fungerer. Den ekte gevinsten ligger i tokens, typografi og mikrodetaljer.

---

## 1. Hvorfor endre i det hele tatt

### 1.1 Hva nåværende design signaliserer

- **Blå #3B82F6** + stone-grå = "productivity SaaS". Notion-estetikk. Linear-light.
- **Inter overalt** = den mest brente fonten i hele ekosystemet i 2025-26.
- **Default Tailwind-tokens** (amber-500, blue-500, stone-950) = "vibekodet på én kveld".
- **Ingen editorial tyngde.** Alt er sans-serif, alt er "rent", alt er "modern". Ingen personlighet.

Det er ikke galt. Men det betyr at Kari åpner appen første gang og **ingenting forteller henne at dette er laget for henne**.

### 1.2 Hva Kari forventer (fra `shiftpay-site/DESIGN.md §1`)

- Hun er ikke tech-entusiast. Hun er sliten etter en 12-timers vakt.
- Hun er mistenksom mot tech-løsninger på jobb.
- Hun bærer skam + sinne rundt lønna.
- Hun vil ha **rolig, konkret, respektfull** — ikke hype, ikke optimisme, ikke slank-fintech.

### 1.3 Hva web-research viste (fra `non-ai-web-design-2026-04-14.md`)

- LLM-er konvergerer mot median av GitHub 2019-2024 = Inter + blue + centered + rounded-xl.
- Skille seg ut krever **forhåndsforpliktelse** til ikke-median-valg.
- Ett "rart-men-bevisst" element > ti polerte detaljer.
- Ekte innhold > lorem. Spesifikk norsk domene-kunnskap = umulig å AI-replikere.

Disse prinsippene gjelder 1:1 i mobil.

---

## 2. Hva mobil endrer sammenlignet med web

Før jeg trekker for mye fra DESIGN.md, må vi innrømme hva som er annerledes på mobil:

### Begrensninger mobil har

- **Mindre skjermareal.** 96px headings fungerer ikke. Typografi må skaleres ned.
- **iOS HIG / Material 3.** Brukeren har forventninger om platform-conventions (swipe-back, bottom tabs, safe area). Bryt med dem bevisst — ellers blir det friksjon.
- **Touch targets 44×44 min.** Tekst-lenker som CTA funker ikke som på web.
- **Ingen hover-states.** Micro-interactions må være på tap/long-press/scroll.
- **Serif display-fonter i body tekst fungerer dårlig** på små skjermer. Må begrenses til hero-type øyeblikk.
- **Fonter er dyre.** Hver font koster MB + startup-tid. Maks 2-3 font-familier.
- **Dark/light mode er en reell ting** Kari kan bytte mellom.

### Friheter mobil har som web ikke

- **Haptic feedback** er gratis stemning (iOS: `expo-haptics`).
- **Gesture-first UX** er forventet (swipe, pull-to-refresh, long-press).
- **Kontekstuelle animasjoner** (Reanimated/Moti) går langt — men bruk sparsomt.
- **Native system-ting** (bottom sheets, action sheets, segmented controls) kan brukes som "signaturelementer" ved å style dem uvanlig.

---

## 3. Den nye design-retningen: "Kveldsvakt Mobile"

Samme estetikk som landingssiden, men med mobile-translations:

### 3.1 Ord som beskriver opplevelsen

**Rolig. Konkret. Håndskrevet.**

- **Rolig** — ingen bouncing, ingen spinners lenger enn 1s, ingen pop-in-animasjoner på hver kort-visning.
- **Konkret** — tall er store og mono-spaced. Hver skjerm har ETT viktig tall som dominerer visuelt.
- **Håndskrevet** — én liten Fraunces-serif-detalj per skjerm gir editorial tyngde uten å være upraktisk. Tenk "margin-annotasjon" fra en avis, ikke "hero-headline".

### 3.2 Hva den IKKE er

- Ikke Notion/Linear-sleek.
- Ikke material-design-expressive.
- Ikke "banking-app" sterile.
- Ikke pastel-illustrert (Revolut, Lunar etc.).

---

## 4. Ny fargepalett

### 4.1 Dark mode (primær, fordi Kari åpner appen etter vakt)

```typescript
export const darkColors: ThemeColors = {
  // Background / surfaces — warm coffee, aldri ren svart
  bg:             '#1A1614',   // warm coffee black (fra #0C0A09)
  surface:        '#221D1A',   // litt lysere (fra #1C1917)
  elevated:       '#2A2422',   // for kort på kort (fra #292524)

  // Ruler / separators
  border:         'rgba(245, 239, 228, 0.10)',  // (fra white.08)

  // Text — cream, aldri ren hvit
  textPrimary:    '#F5EFE4',   // (fra #F5F5F4)
  textSecondary:  '#A8A095',   // (fra #A8A29E) — varm grey
  textMuted:      '#9A928A',   // bumped fra #78716C for WCAG AA

  // Accent — burnt sienna, ikke blå
  accent:         '#8B3E23',   // accent-deep som default (WCAG AA mot cream: 8.85:1)
  accentMuted:    '#C65D3A',   // burnt sienna, brukes som hover / active
  accentSoft:     '#E8A57C',   // myk aftenhimmel — links, highlights

  // Warm — for "tidlig vakt" / oransje-tilfeller
  warm:           '#F4D58D',   // mykere oker (fra #F59E0B)

  // Functional signals (brukes SPARSOMT)
  success:        '#5B8B6F',   // dempet skogrønn (fra #10B981)
  error:          '#B85450',   // rustrød (fra #EF4444)

  // Tabs
  tabActive:      '#C65D3A',
  tabInactive:    '#756E64',
};
```

### 4.2 Light mode

```typescript
export const lightColors: ThemeColors = {
  bg:             '#F5EFE4',   // cream (fra #FAFAF9)
  surface:        '#FBF7ED',   // litt lysere
  elevated:       '#EDE5D4',   // subtle cream grey

  border:         'rgba(26, 22, 20, 0.12)',

  textPrimary:    '#1A1614',   // warm coffee
  textSecondary:  '#5A544A',   // varm grey (WCAG AA)
  textMuted:      '#756E64',

  accent:         '#8B3E23',
  accentMuted:    '#C65D3A',
  accentSoft:     '#B85435',   // dypere for light bg

  warm:           '#B8831D',   // dypere oker for light bg
  success:        '#3D6B51',
  error:          '#9F3B37',

  tabActive:      '#8B3E23',
  tabInactive:    '#A8A095',
};
```

### 4.3 Migrasjonsstrategi

Alle endringer ligger i `lib/theme.ts` + `tailwind.config.js`. Siden både NativeWind og `useThemeColors()` peker til samme kilde, er det **én fil som endrer farge-fundamentet for hele appen**.

Step 1: Oppdater `lib/theme.ts` — appen renderer umiddelbart i ny palett.
Step 2: Oppdater `tailwind.config.js` med samme tokens — NativeWind-klasser følger.
Step 3: Finn og erstatt hardkodede hex-farger i komponenter (`grep -r "#3B82F6"` etc.).

Estimert tid: **2-3 timer**.

---

## 5. Typografi

### 5.1 Nåværende

- Kun Inter (400/500/600/700) via `@expo-google-fonts/inter`.
- Ingen display-font. Ingen mono-font. Tall blandes inn i body.

### 5.2 Anbefalt

**Tre familier:**

| Rolle | Font | Hvor brukt | Pakke |
|---|---|---|---|
| Display (editorial tyngde) | **Fraunces** | Skjerm-titler, tall-stats, tomme states | `@expo-google-fonts/fraunces` |
| Body (les lenge) | **Inter Tight** | Alt brødtekst, labels, knapper | `@expo-google-fonts/inter-tight` |
| Mono (tall) | **JetBrains Mono** | Alle KPI-tall, tider, beløp | `@expo-google-fonts/jetbrains-mono` |

Hvorfor Inter Tight og ikke vanlig Inter: tightere karakter-spacing gir kraftigere rytme på liten skjerm. Samme argument som på landingssiden.

### 5.3 Skala

```typescript
// lib/typography.ts (ny fil)
export const typography = {
  // Display (Fraunces — bruk sparsomt)
  heroTitle:    { family: 'Fraunces_700Bold',      size: 32, lineHeight: 36, letterSpacing: -0.8 },
  screenTitle:  { family: 'Fraunces_700Bold',      size: 24, lineHeight: 28, letterSpacing: -0.5 },
  bigNumber:    { family: 'JetBrainsMono_500',     size: 44, lineHeight: 46, letterSpacing: -1.2 },

  // Section (Fraunces for editorial / Inter Tight for tech)
  sectionTitle: { family: 'Fraunces_600SemiBold',  size: 18, lineHeight: 22, letterSpacing: -0.3 },
  cardTitle:    { family: 'InterTight_600SemiBold', size: 17, lineHeight: 22, letterSpacing: -0.2 },

  // Body (Inter Tight)
  body:         { family: 'InterTight_400Regular', size: 16, lineHeight: 22 },
  bodyStrong:   { family: 'InterTight_500Medium',  size: 16, lineHeight: 22 },
  small:        { family: 'InterTight_400Regular', size: 14, lineHeight: 19 },
  caption:      { family: 'InterTight_500Medium',  size: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },

  // Mono (tall)
  mono:         { family: 'JetBrainsMono_400Regular', size: 14, lineHeight: 19 },
  monoLarge:    { family: 'JetBrainsMono_500Medium',  size: 20, lineHeight: 24, letterSpacing: -0.3 },
};
```

### 5.4 Regler

- **Dark-mode body:** øk vekt fra 400 → 500 for anti-aliasing-anemi (samme regel som web).
- **Aldri Fraunces under 16px.** Serif-glyfer faller fra hverandre på liten skjerm.
- **Aldri Inter (vanlig).** Bare Inter Tight, eller en av de andre to.
- **Tall-kolonner:** alltid mono. Da står desimalene i linje.

### 5.5 Implementeringskostnad

- Legg til 3 font-pakker (`npm install @expo-google-fonts/fraunces @expo-google-fonts/inter-tight @expo-google-fonts/jetbrains-mono`).
- `useFonts()` i `_layout.tsx` for å laste alle.
- Bootsplash må fortsatt vises til fonter er klare.
- **Startup-kostnad:** +~300-500ms første gang, +~80ms subsequent (fonts caches). Verdt det.

---

## 6. Komponent-for-komponent anbefalinger

### 6.1 Dashboard-skjerm (`app/(tabs)/index.tsx`)

**Nå:** Lønn-info over flere kort, blå aksent, Inter bold på tall.

**Forslag:**
- Gjør **månedens total-diff** til DET dominante elementet — 44px JetBrains Mono, fargekodet (grønn for underbetaling, rustrød for overbetaling).
- Mindre kort under: "Neste vakt", "Uker denne måneden", "Ubekreftede". Bruk Fraunces for kort-tittel, Inter Tight for body.
- Hver kort har venstre-border 2px i en farge som betyr noe:
  - Burnt sienna for kveldstillegg-vakter
  - Dyp marine for natt
  - Grønn for normale dag-vakter
- Pull-to-refresh: gi den haptic feedback ved trigger.

**Mikro-detalj som gir karakter:** øverst på skjermen, vis en liten tekstlinje:
> *Vakt #12 denne måneden — kveld*

i `italic Fraunces 14px` på `textMuted` — som et "notebook-notat" i margen. Dette ER signatur-elementet for appen.

### 6.2 Import-skjerm (`app/(tabs)/import.tsx`)

**Nå:** Tre knapper (Kamera, Bilde, CSV). OK, men flat.

**Forslag:**
- Bruk segmented control øverst for "Nytt bilde / Fra galleri / CSV / Manuell" — ekte iOS-følelse.
- Kamera-preview med en konkret tekst-linje i bunnen: *"Rett kamera mot timelisten. Vi leser vaktene selv."* (Fraunces italic).
- Etter OCR-scan: vakter dukker opp med en liten stagger-animasjon (50ms per rad, totalt 500ms). IKKE bounce. Kun fade-up 8px.
- Redigér-knappen per vakt: long-press for quick edit, tap for full edit.

### 6.3 Satser-skjerm (`app/(tabs)/settings.tsx`)

**Nå:** Lister av input-felt med labels.

**Forslag:**
- Hver sats-rad bruker mono-font for tall-input (right-aligned, tabular).
- Over hver gruppe, en liten Fraunces-overskrift: *"Kveld"*, *"Natt"*, *"Helg"*, *"Høytid"*.
- Hjelpe-tekst i italic Fraunces 12px under hver label: *"Fra kl. 17 — sjekk tariffavtalen din"*.
- Stepper (-/+) for prosent-input på touch-hensyn, ikke kun tastatur.

### 6.4 ShiftCard (`components/ShiftCard.tsx`)

Dette er kjerne-komponenten. Gjør den RIKTIG:

```tsx
// Layout:
//   ┌──────────────────────────────────┐
//   │ FREDAG          |  kveld         │  ← caption mono 12px, accent-soft
//   │ 13. mars        |  17:00–01:00   │  ← Fraunces 17 semibold / mono 14
//   │                                  │
//   │ 8t 0m                            │  ← JetBrains Mono 20 medium
//   │ 1 840 kr                         │  ← JetBrains Mono 24 medium (+accent)
//   └──────────────────────────────────┘
// - Venstre 2px border i skift-type-farge
// - Long-press → context menu (rediger / marker som fri / overtid)
```

Fjerne: rounded-xl på alle sidene. Bruk rounded-sm (4px) eller flat.
Beholde: kortets struktur, data-hierarki.

### 6.5 Bottom tabs (`app/(tabs)/_layout.tsx`)

**Nå:** Standard Expo Router tabs med Ionicons.

**Forslag:**
- Bytt Ionicons → **Phosphor Duotone** (via `phosphor-react-native`). Gir tabs mer karakter uten å se "generic-material".
- Fjern tab-bar label på tablet (kun ikon). Behold på telefon.
- Aktiv tab har tykk bunn-border (2px) i accent-farge, ikke tekst-farge-bytte. Stille signal, sterk visuell.

---

## 7. Signaturelementer (ekvivalent til web's diff-teller + skift-tint)

### 7.1 Primær: "Kveldsvakt-tint"

Samme logikk som på landingssiden — toppen av hver skjerm har en 3px farge-linje til venstre, som skifter basert på DAGENS hovedvakt-type:

- **Tidlig (06-11):** myk oker `#F4D58D`
- **Mellom (12-15):** cream `#F5EFE4` (usynlig på dark bg — hopp over tint)
- **Kveld (16-21):** burnt sienna `#C65D3A`
- **Natt (22-05):** dyp marine `#1E2A3A`

Implementering: en `<ShiftTintStripe />`-komponent som renderes øverst i `_layout.tsx`, leser `Date.now()` ved mount.

### 7.2 Sekundær: "Håndskrevet undertekst"

Hver skjerm har ÉN Fraunces italic-linje (14px) et sted — aldri som hovedtittel, alltid som subtil kontekst:

- Dashboard: *"Vakt #12 denne måneden — kveld"*
- Import: *"Rett kamera mot timelisten. Vi leser vaktene selv."*
- Settings: *"Fra kl. 17 — sjekk tariffavtalen din"*
- Summary: *"Mars 2026 — 12 vakter, mest kveld og natt"*
- Confirm: *"Var det en lang vakt?"*

Dette ER det samme som landingssidens tilfeldighet → gjenkjennelig familie.

### 7.3 Tertiær: "Haptic signatur"

Tre typer haptikk, brukt KUN på disse stedene:

- **Light:** toggle aksepter/avslå vakt, pull-to-refresh
- **Medium:** OCR ferdig, beregning fullført (brukeren får vite "det skjedde noe")
- **Heavy:** diff-resultat vises etter beregning — gir vekt til øyeblikket

`expo-haptics` — koster ~10 linjer kode.

---

## 8. Motion / animasjon

### 8.1 Regler (samme som web)

- **Én orkestrert skjerm-mount,** ellers stillhet.
- Ingen micro-interactions som ikke betyr noe.
- `prefers-reduced-motion` (React Native: `AccessibilityInfo.isReduceMotionEnabled`) respekteres.

### 8.2 Konkret

- Skjerm-transition: ingen slide/fade-combo. Bruk enten ren slide (iOS default) eller fade (for modaler). Ikke begge.
- Skjerm-mount: fade-up 8px, 60ms stagger per "block" — maks 4 blocks per skjerm.
- Knapp-press: `scale(0.97)` på `onPressIn`, 120ms ease-out.
- Ingen Lottie. Ingen bouncy-springs. Reanimated `withTiming({duration: 240, easing: Easing.out(Easing.cubic)})`.

### 8.3 Hvor brukes animasjon meningsfylt

- OCR-prosessering: en rolig "pulse" på selve OCR-status-indikatoren (ikke spinner).
- Diff-tall ruller opp når Summary mountes (samme mekanikk som hero-teller på web) — 1.4s, ease-out-cubic.
- Swipe-to-confirm på vakt: ekte gesture-håndtering, ikke modal.

---

## 9. Ikonografi

### 9.1 Nå

Ionicons (via `@expo/vector-icons`). Samme set som 10 000 andre apper.

### 9.2 Forslag

**Bytt til Phosphor Duotone.** Gjør det i én slurk:

```bash
npm install phosphor-react-native
```

Phosphor har:
- 6 weight-varianter (Thin → Duotone → Fill)
- Distinkt karakter (mer geometrisk enn Ionicons, mindre stramt enn Lucide)
- Åpen lisens (MIT)

Bruk **Duotone** som default, **Regular** for inaktive tabs. Gir appen øyeblikkelig karakter uten å være anmassende.

### 9.3 Eksempler

| Hvor | Nåværende (Ionicons) | Phosphor |
|---|---|---|
| Home tab | home | <HouseSimple weight="duotone" /> |
| Import tab | camera | <Camera weight="duotone" /> |
| Settings tab | settings-outline | <Sliders weight="duotone" /> |
| Plus | add-circle | <PlusCircle weight="duotone" /> |

---

## 10. Copy og språk

Appen snakker allerede norsk bra. Men noen grep fra landingssiden kan løftes inn:

### 10.1 Erstatt generiske strings

| Nå | Foreslått |
|---|---|
| "Ingen vakter registrert" | "Ingen vakter her enda — importer timelisten din?" |
| "Lagrer…" | "Lagrer lokalt — ingen sky involvert." |
| "Feil" (i toast) | "Hmm, noe gikk skjevt. Prøv igjen?" |
| "Velg dato" | "Hvilken dato jobbet du?" |

### 10.2 Tom-state-tekster

Bruk ekte Fraunces italic for tom-states. Ikke tegneseriefigur, ikke emojis — bare ord:

```
<View centered>
  <Text style={tomStateTittel}>Ingen data enda.</Text>
  <Text style={italicUndertekst}>
    Importér en timeliste, så fyller vi ut resten.
  </Text>
  <Button>Importér nå</Button>
</View>
```

### 10.3 Tall-formatering

Samme regler som web:
- `1 840 kr` — non-breaking space som tusenskiller
- `62,9 %` — komma, mellomrom før `%`
- `22:00–06:00` — endash, ikke hyphen

Eksisterer allerede i `lib/format.ts` delvis — verifisér og konsolider.

---

## 11. 3-fase migrasjonsplan

### Fase 1 — Token-swap (1-2 dager)

- [ ] Oppdater `lib/theme.ts` (dark + light palett)
- [ ] Oppdater `tailwind.config.js`
- [ ] Finn og erstatt hardkodede hex-farger
- [ ] Sjekk kontrastverdier (WCAG AA) mot nye tokens
- [ ] Smoke-test alle 5 skjermer — ingenting skal være ulesbart
- [ ] Release som v1.2.0 "design: palette refresh"

**Hva brukeren merker:** appen er plutselig varmere, mindre techy. Ingen funksjonelle endringer.

### Fase 2 — Typografi (2-3 dager)

- [ ] Installer de 3 font-pakkene
- [ ] Opprett `lib/typography.ts`
- [ ] Lag `<Text>`-wrapper som applies tokens (eller utvid eksisterende)
- [ ] Migrér alle tekst-elementer til ny skala
- [ ] Verifiser dark-mode bump (500+ vekt)
- [ ] Release som v1.3.0 "design: typography"

**Hva brukeren merker:** tallene ser mer "kvittering", overskrifter mer "avis". Appen begynner å føle seg gjennomtenkt.

### Fase 3 — Signaturelementer + ikon-bytte (3-4 dager)

- [ ] Bytt Ionicons → Phosphor Duotone
- [ ] Implementer skift-tint-stripe i `_layout.tsx`
- [ ] Legg inn de 5 håndskrevne undertekstene
- [ ] Implementer haptic på 3 nøkkelsteder
- [ ] Diff-teller-animasjon på Summary-mount
- [ ] Release som v1.4.0 "design: signatur"

**Hva brukeren merker:** appen har karakter nå. Kari tenker *"dette er laget med omhu"* selv om hun ikke kan sette ord på hvorfor.

---

## 12. Hva skal IKKE gjøres

Disse endringene er fristende men skader mer enn de hjelper:

- ❌ **Bytte navigasjonsstrukturen.** Tabs fungerer. Ikke bli kreativ.
- ❌ **Lage egen komponentbibliotek fra null.** Reuse Expo / React Native Reanimated.
- ❌ **Bruke Lottie-animasjoner for illustrasjoner.** Blir plastikk raskt.
- ❌ **Legge til onboarding-tutorials / coach-marks.** Hvis appen trenger det, er UX-en feil.
- ❌ **"Hero-bilder" i dashboard.** Mobile screens ≠ landing pages. Hvert px er jobb.
- ❌ **Bytte ut Expo SDK** eller store infrastruktur-bits.

---

## 13. Akseptansekriterier

Når fase 3 er ferdig, Kari-testen: **Lukk appen, kopier navnet bort fra app-ikonet og spør en fremmed "hvilken app er dette?". Hvis svaret inkluderer ordet 'finans' eller 'banking' eller 'produktivitet' — tilbake til tegnebrettet.**

Riktig svar: *"vet ikke — en slags kalender? ser hjemmelaget ut på en fin måte."*

---

## 14. Resurser / referanser

- `shiftpay-site/DESIGN.md` — web design constitution (mor-dokumentet)
- `shiftpay/research/non-ai-web-design-2026-04-14.md` — AI-design-research
- `shiftpay/design/ux-review-shiftpay-2026-02-23.md` — forrige UX-review
- [Phosphor Icons](https://phosphoricons.com/)
- [Expo Google Fonts](https://docs.expo.dev/guides/using-custom-fonts/#using-a-google-font)
- [React Native Typography Patterns](https://github.com/Shopify/restyle) (referanseimplementasjon)

---

## 15. Neste steg

1. Les gjennom denne anbefalingen og commit på retningen.
2. Velg én fase å starte på (**anbefalt: Fase 1 først** — liten commit, stort visuelt utslag).
3. Lag en feature-branch `design/kveldsvakt-fase-1`.
4. Deploy en preview-build via EAS til deg selv og kona — se hvordan det faktisk føles på telefon i 2 dager før du commer'er til veien.
5. Itererer.

**Ikke bygg alt på én gang.** Appen er live. Rull gradvis og observer.

---

*Laget med utgangspunkt i Kari. Alle valg her handler om å gjøre henne mer villig til å åpne appen neste gang hun føler at lønnsslippen ikke stemmer.*
