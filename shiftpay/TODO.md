# ShiftPay TODO

## Google Play Store — Release checklist

### KRITISK (blokkerer publisering)

- [x] **Sett OCR API key** ✓
  API key generert og satt i `.env` + Supabase secret.

- [x] **Endre app-navn til "ShiftPay"** ✓
  `app.json` og `android/res/values/strings.xml` oppdatert.

- [x] **Rydd permissions** ✓
  Fjernet READ_EXTERNAL_STORAGE, RECORD_AUDIO, SYSTEM_ALERT_WINDOW, WRITE_EXTERNAL_STORAGE fra AndroidManifest.
  Fjernet `exp+shiftpay` dev-scheme.

- [ ] **Verifiser release signing**
  Kjor `eas credentials` for a sjekke at production keystore er satt opp. EAS handterer dette automatisk ved forste build, men verifiser.

### HOY PRIORITET (kreves av Play Console)

- [ ] **Lag Feature Graphic (1024x500 px)**
  Kreves for store listing. `Screenshots/teaser-slack.html` er 1200x630 — kan tilpasses eller lages ny.

- [ ] **Fiks adaptive-icon.png**
  Navarende `assets/adaptive-icon.png` er identisk med `icon.png` (har avrundede hjorner bakt inn).
  Adaptive icon foreground skal vaere UTEN hjorner, pa transparent bakgrunn, med innhold i safe zone (sentrale 66% av 1024px). `backgroundColor: "#0f766e"` i app.json er allerede riktig.

- [ ] **Host privacy policy pa offentlig URL**
  `privacy-policy.md` finnes og er komplett. Play Console krever en URL.
  Enkleste: GitHub Pages, eller legg den pa Vercel (deploy-mappen under Screenshots har allerede Vercel-oppsett).

- [ ] **Forbered store listing-tekster**
  Play Console krever:
  - App-tittel (maks 30 tegn): "ShiftPay"
  - Kort beskrivelse (maks 80 tegn)
  - Full beskrivelse (maks 4000 tegn)
  - Kategori: Finance / Tools
  - Content rating questionnaire

### MEDIUM (anbefalt for ryddig release)

- [ ] **Auto-increment versionCode**
  Legg til i eas.json under production: `"autoIncrement": true`
  Slipper a manuelt bumpe `android.versionCode` i app.json for hver release.

- [x] **Flytt expo-dev-client til devDependencies** ✓
  Flyttet i `package.json`.

- [ ] **Vurder exact alarm-strategi for Android 14+**
  SCHEDULE_EXACT_ALARM er begrenset pa API 34+. expo-notifications handterer fallback,
  men Google kan kreve begrunnelse for denne permission. Alternativ: USE_EXACT_ALARM (krever
  ikke runtime-forespørsel men trenger forklaring i Play Console).

### LAV (polish)

- [ ] **Slett lokal android/-mappe**
  `.gitignore` har `/android` men mappen finnes. EAS bygger sin egen — lokal mappe skaper bare forvirring.

- [ ] **Lag dedikert splash-icon.png**
  Na identisk med icon.png. Bor vaere bare logoen uten bakgrunn, tilpasset splash screen.

- [ ] **Vurder expo-updates for OTA**
  Na disabled — enhver bugfix krever ny Play Store release. Aktiver for raskere hotfixes i v1.1+.

- [ ] **Vurder crash reporting**
  Privacy policy sier "no crash reports". Greit for v1, men vurder Sentry for v2 (oppdater policy).

---

## Sikkerhet (fra sec-eval 2026-02-23)

### Fikset

- [x] **OCR endpoint auth** ✓ — X-API-Key header pakreves
- [x] **CORS wildcard fjernet** ✓ — Origin-basert allowlist
- [x] **Feilmelding-sanitering** ✓ — Generiske feilmeldinger, ingen interne detaljer
- [x] **Schema-validering av LLM-output** ✓ — Server + klient regex-validering
- [x] **Kryptografisk UUID-generering** ✓ — expo-crypto getRandomValues()
- [x] **Input clamping pa tariff rates** ✓ — >= 0 pa UI og DB
- [x] **Deep link UUID-validering** ✓ — UUID v4 regex i confirm/[shiftId]
- [x] **Ingen prod fallback-URL** ✓ — Kaster error hvis EXPO_PUBLIC_API_URL mangler
- [x] **Auth bypass fikset** ✓ — OCR returnerer 503 hvis SHIFTPAY_API_KEY mangler (fail closed)
- [x] **allowBackup="false"** ✓ — SQLite inkluderes ikke i Android Auto Backup

### Gjenstaar

- [x] **Anthropic billing-cap** ✓ — Eget workspace "ShiftPay" med $100/mnd cap og dedikert API-nokkel.
- [ ] **Rate limiting pa OCR-endepunkt** — In-memory rate limiter (10 req/min/IP) i Edge Function.
  Billing-cap er backstop, men rate limiting reduserer stoy og gjor misbruk tregere.
- [ ] **Timing-safe key comparison** — Bytt `!==` til HMAC-basert sammenligning i OCR-endepunktet.
- [ ] **Sett OCR-nokkel i EAS Secrets** — `eas secret:create --name EXPO_PUBLIC_OCR_API_KEY --value <nokkel>`.
  Kun nodvendig for EAS cloud builds (ikke lokale builds).
- [ ] **Fjern stale permissions med tools:node="remove"** — Avhengigheter merger tilbake READ_EXTERNAL_STORAGE etc. i kompilert manifest. Legg til `tools:node="remove"` i AndroidManifest.
- [ ] **UUID-validering i period/[id].tsx** — Mangler UUID-sjekk for routing (confirm/ har det allerede).

---

## UX & Design (fra deep review 2026-02-23)

Full rapport: `design/ux-review-shiftpay-2026-02-23.md`

### Fase 1: Kritisk UX

- [ ] **OCR loading state — erstatt spinner med skeleton**
  `app/(tabs)/import.tsx` linje 430-437. OCR tar 10-30s og brukeren ser bare en ActivityIndicator
  på tom bakgrunn. Erstatt med: roterende skan-ikon (Ionicons `scan-outline` + MotiView rotate),
  "Reading your timesheet..." overskrift, 2-3 skeleton shift-kort (MotiView opacity-puls),
  og fremdriftstekst ("Image 1 of 3..."). Ref: Linear skeleton loading.

- [ ] **ShiftEditor — to-rads layout for shift-rader**
  `components/ShiftEditor.tsx` linje 60-126. Nåværende flex-wrap-rad med dato + 2 tids-inputs +
  4 shift-type pills + slett-ikon knekker på skjermer <380px. Refaktorer til to rader per shift:
  Rad 1: dato (flex-1) + start (w-[72px]) + "–" + slutt (w-[72px]) + slett-ikon.
  Rad 2: 4 shift-type pills med `flex-1` (jevnt fordelt). Legg til `min-h-[44px]` på alle
  TextInput for å møte WCAG 2.5.8 touch target minimum.

- [ ] **Settings — gruppering, enhetshint, eksempelverdier**
  `app/(tabs)/settings.tsx`. 6 identiske TextInput uten kontekst. Brukeren vet ikke om
  "Night supplement" er kr/t eller %. Endre til 3 seksjoner med overskrifter:
  "Grunnlønn" (base_rate med suffix "kr/t"), "Tillegg per time" (evening/night/weekend/holiday
  med suffix "kr/t"), "Overtid" (overtime_supplement med suffix "%"). Bruk eksempelverdier
  som placeholder ("e.g. 250") i stedet for "0".

- [ ] **Etter-save — suksess-skjerm med navigasjon**
  `app/(tabs)/import.tsx` linje 314-318. Etter saveTimesheet() vises "Saved!" i 2s, deretter
  tom skjerm. Erstatt med en suksess-view: checkmark-ikon, "X shifts saved for [period]",
  "View schedule" knapp (→ period/[scheduleId]), "Import more" knapp (reset state).
  Behold auto-redirect til dashboard etter 3s som fallback.

- [ ] **A11y: Modaler med accessibilityViewIsModal + labels**
  `app/_layout.tsx` linje 110-144. Både onboarding- og feilmodalen mangler
  `accessibilityViewIsModal={true}` på `<Modal>`, `accessibilityRole="alert"` på wrapper-View,
  `accessibilityRole="header"` på tittel, og `accessibilityRole="button"` +
  `accessibilityLabel` på Pressable-knappene. Uten dette fanger ikke TalkBack/VoiceOver
  fokus riktig, og skjermleserbrukere kan bli "stuck" i bakgrunnen. WCAG 2.4.3, 4.1.2.

### Fase 2: Viktig UX

- [ ] **Historikk med mini-summary**
  `app/(tabs)/index.tsx` linje 308-331. Historikk-kortene viser bare "February 2026 >"
  uten nyttig info. Legg til antall vakter og beregnet lønn per måned, f.eks.
  "February 2026 — 12 shifts, kr 34,500". Krever ny DB-funksjon `getMonthMiniSummary(year, month)`
  som returnerer count + total pay. Ref: Vipps transaksjonshistorikk.

- [ ] **Empty state med personlighet**
  `app/(tabs)/index.tsx` linje 192-206. Nåværende er generisk tekst uten visuell hook.
  Bytt til: stort ikon (wallet-outline i amber-bg sirkel), varm overskrift ("Ready to check
  your pay?"), forklarende undertekst, kamera-CTA med ikon ("Scan your first timesheet").
  Ref: Things 3 empty inbox.

- [ ] **A11y: Live regions på feil og loading**
  `app/(tabs)/import.tsx` linje 356-359 (error) og 430-437 (loading). Feilmeldinger og
  loading-tilstand annonseres ikke til skjermlesere. Legg til `accessibilityRole="alert"` +
  `accessibilityLiveRegion="assertive"` på error-View, og `accessibilityLiveRegion="polite"`
  på loading-View. WCAG 4.1.3.

- [ ] **A11y: Alle manglende accessibilityLabels**
  Spredt over mange filer. Viktigst:
  - `(tabs)/index.tsx:217-223` — next-shift confirm-knapp: `accessibilityLabel={\`Confirm ${date}\`}`
  - `(tabs)/index.tsx:249-283` — pending-tile og listelementer: labels med dato/tid
  - `CameraCapture.tsx` — `accessibilityElementsHidden` på CameraView, `importantForAccessibility="no"` på overlegg, labels på capture/cancel-knapper
  - `ShiftEditor.tsx:72-96` — lokaliserte labels med radnummer (`"Date, shift 1"`)
  - `period/[id].tsx:154,181` — "View summary" og "Delete" knapper
  - `summary/[yearMonth].tsx:148-177` — prev/next måned-navigasjon
  - Alle ActivityIndicator (5 skjermer): `accessibilityLabel={t("common.loading")}`
  - `(tabs)/import.tsx:382-426` — kamera, galleri, CSV, manuell, "More options" knapper
  - `(tabs)/import.tsx:365-374` — rate-zero-varsel: `accessibilityRole="link"`
  WCAG 4.1.2.

- [ ] **Slå sammen Calculate + Save**
  `components/ShiftEditor.tsx` linje 137-171. Brukeren må trykke Calculate, deretter Save —
  3 trykk for lønn + lagring. Enten: la Save automatisk beregne og vise resultatet, eller
  gjør Calculate til preview med "Save & calculate" som primær-CTA.

### Fase 3: Polering

- [ ] **Accent-farge: sky-blue → dypere blå**
  `tailwind.config.js` og `lib/theme.ts`. Nåværende sky-400 (#38BDF8) / sky-700 (#0284C7)
  er Tailwind-default brukt i halvparten av AI-genererte apper. Bytt til blue-700 (#1D4ED8)
  for light mode og blue-500 (#3B82F6) for dark mode. Oppdater `accent` og `accent-dark`
  tokens i theme. Gir mer autoritet og skiller appen fra generisk AI-estetikk.

- [ ] **AnimatedCard: respekter reduce-motion**
  `components/AnimatedCard.tsx`. Animasjonen kjører alltid uavhengig av systempreferanse.
  Importer `useReducedMotion` fra `react-native-reanimated` (allerede en dependency).
  Hvis aktiv: render vanlig `<View>` uten animasjon. WCAG 2.3.3.

- [ ] **Confirm auto-redirect økt + back-knapp**
  `app/confirm/[shiftId].tsx` linje 89-90 og 102-103. Auto-navigasjon etter 1.5s er for
  kort for skjermleserbrukere. Øk timeout til 3s og legg til eksplisitt "Back to overview"
  PressableScale-knapp i confirmed-view. WCAG 2.2.1.

- [ ] **Varmere nøytraler: slate → stone**
  `tailwind.config.js` og `lib/theme.ts`. Slate-farger gir en kald, teknisk følelse.
  Bytt til stone for varmere grå: bg-light #FAFAF9 (stone-50), text #1C1917 (stone-900),
  bg-dark #0C0A09 (stone-950), surface-dark #1C1917 (stone-900). Oppdater alle tema-tokens.

- [ ] **Sammenligning mot faktisk lønn**
  `app/summary/[yearMonth].tsx`. Hele app-poenget er "ble jeg betalt riktig?" men det finnes
  ingen måte å sammenligne. Legg til et input-felt "What you actually received" (persistert
  i SQLite, ny kolonne eller tabell). Vis differansen prominent: grønn hvis positiv,
  rød hvis negativ. Kan utsettes til v1.1 men er kjerne-brukscaset.

- [ ] **A11y: Section-overskrifter med header-rolle**
  `app/(tabs)/index.tsx` linje 211, 255, 295 + `period/[id].tsx` linje 165 +
  `summary/[yearMonth].tsx` linje 224. Section-titler ("Next shift", "This week", etc.)
  mangler `accessibilityRole="header"`. Skjermleserbrukere navigerer via overskrifter —
  uten denne rollen er flyten flat. WCAG 1.3.1, 2.4.6.

- [ ] **A11y: ShiftEditor radiogroup-wrapper**
  `components/ShiftEditor.tsx` linje 97-115. Shift-type pills har `accessibilityRole="radio"`
  men parent View mangler `accessibilityRole="radiogroup"`. TalkBack annonserer ikke
  "1 of 4" etc. Legg til wrapper + `accessibilityLabel={t("shiftTypes.label")}`.
  Ny i18n-nøkkel: `shiftTypes.label: "Shift type"` / `"Vakttype"`. WCAG 1.3.1.

- [ ] **A11y: PressableScale — utvid accessibilityRole-typer**
  `components/PressableScale.tsx` linje 17. Type er begrenset til `"button" | "link" | "radio"`.
  Bytt til `AccessibilityRole` fra `react-native` for å tillate `"tab"`, `"checkbox"`, etc.

- [ ] **A11y: Amber fargekontrast**
  `text-amber-600` (#D97706) på hvit bg gir ~3.4:1 kontrast. Greit for `text-3xl`/`text-4xl`
  bold (>3:1), men `text-lg` i ShiftEditor.tsx linje 152 er på grensen. Bytt til
  `text-amber-700` (#B45309, ~4.8:1) for trygg AA-compliance overalt. WCAG 1.4.3.

- [ ] **i18n: Hardkodede engelske feilmeldinger**
  `app/(tabs)/import.tsx` linje 217: `"Camera permission required to take a photo."` og
  linje 235: `"OCR failed"`. Erstatt med `t("import.cameraPermissionError")` og
  `t("import.alerts.ocrFailed")`. Legg til nøklene i alle 4 locale-filer (nb/en/sv/da).

- [ ] **StatBox samlet accessibilityLabel**
  `app/summary/[yearMonth].tsx` linje 24-31. Hvert stat-element leses som to separate
  tekster. Legg til `accessible={true}` + `accessibilityLabel={\`${value}: ${label}\`}` på
  wrapper-View, og `importantForAccessibility="no"` på begge Text-barn.

- [ ] **Confirm: collapse redigeringsfelt**
  `app/confirm/[shiftId].tsx` linje 214-265. Dato/tid-redigeringsfeltene vises alltid
  men er kun relevante når noe er feil. Skjul bak en "Edit shift details" expander
  (PressableScale med expanded state) for å redusere visuell støy.

---

## v1.1 — User feedback

### Dual pay periods
Regular shifts and extra shifts have different pay periods:
- **Regular (fast turnus):** 1st – last day of month
- **Extra shifts (ekstra vakter):** 12th – 11th of next month

Pay period dates vary between employers — solution must be configurable, not hardcoded.

**Approach alternatives (not decided):**

**A) Custom start-day in settings**
Two fields: "Regular shifts start day" (default: 1) and "Extra shifts start day" (default: 1). App calculates the rest. Simple, minimal UI. Most users change one number or nothing.

**B) Multiple pay period profiles**
User creates named periods with custom date ranges. More flexible, more complex UI. Overkill for most users?

**C) Toggle: standard month vs custom**
Default is 1st–last. Toggle to "custom" reveals a start-day picker. One toggle per shift type.

**Leaning toward A** — least UI friction, covers the real use case.

Needs (once approach is decided):
- [ ] Shift type distinction: `regular` vs `extra` (new field on shifts table)
- [ ] Way for user to mark a shift as extra (import flow + edit)
- [ ] Pay period settings (configurable start-day per shift type)
- [ ] Period calculation logic that splits by shift type
- [ ] Summary view shows both periods separately (or clearly separated)
- [ ] DB migration to add shift employment type + pay period config

### Overtime visibility
- [ ] Make overtime shifts visually easier to spot (color, icon, badge)

### Extra shifts outside schedule
- [ ] Support adding single extra shifts that aren't part of imported schedule
- [ ] Quick-add flow from dashboard?

---

## v2 — Future

- [ ] Cloud backup (opt-in)
- [ ] SQLite-kryptering (SQLCipher) for lonnssatser
- [ ] Supabase URL to EAS Secrets
