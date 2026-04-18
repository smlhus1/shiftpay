# Research: iOS design-test workarounds on MacBook Air 7,2 (Early 2015) for ShiftPay (Expo SDK 54)

> Researched: 2026-04-17 | Sources consulted: 20+ | Confidence: High

## TL;DR

**Gjør dette (i prioritert rekkefølge):**

1. **Primær loop:** Bruk `eas build --profile development --platform ios` én gang, installer dev-build på din egen iPhone via TestFlight Internal eller direkte ad-hoc-link, og deretter `npx expo start --dev-client` for hot reload mot iPhone. Dette gir deg den eneste virkelig **iOS-native** test-loopen — på ekte iOS-runtime, med ekte fonter, ekte SafeArea, ekte gestures. Du trenger ikke Xcode lokalt for dette.
2. **Sekundær loop (visuell sanity check uten å åpne telefonen):** Kjør `npx expo start --web` for raske layout-iterasjoner i nettleseren. React Native Web treffer ikke iOS-pixel-perfekt, men er gull for komponentlogikk og spacing.
3. **Cloud simulator når du absolutt må se iOS-skjermen på Macen:** Bruk EAS sin `preview-simulator`-build (du har den allerede konfigurert) og last opp `.tar.gz`-en til **Appetize.io** (gratis 100 min/mnd, $40/mnd hvis du trenger mer). Dette gir deg en iOS-simulator i nettleseren — null Xcode lokalt.

**Ikke gjør dette:**

- **Ikke installer Xcode 14.2 og bygg/test lokalt.** Xcode 14.2 er det høyeste du kan kjøre på Monterey, og den simulator-banen krever +30 GB diskplass, dual-core i5 sliter med kompilering, og du sitter fast på iOS 16-SDK-er. Den jobben gjør EAS bedre i skyen.
- **Ikke OCLP-patche maskinen til Sequoia bare for Xcode.** OCLP fungerer på MacBookAir7,2, men Xcode 16+ på Broadwell dual-core 8 GB blir så smertefullt at du kommer til å hate maskinen. OCLP-prosjektet er også i en usikker fase — lead-utvikler gikk til Apple, ingen Tahoe-støtte ennå (apr 2026).
- **Ikke betal for AWS EC2 Mac eller MacStadium.** $5–7/time eller $109/mnd er overkill for design-iterasjoner. Scaleway M1 til €0.11/time er teoretisk billigere, men du får alltid mer ut av en lokal dev-build på iPhone.

---

## Hovedfunn per seksjon

### 1) Xcode-matrise og iOS-SDK på Monterey

**Maks Xcode på macOS 12.7.6 Monterey: Xcode 14.2** (krever 12.5+).

| Xcode | macOS-krav | iOS SDK ut-av-boks | Simulator-runtimes nedlastbart |
|---|---|---|---|
| 14.2 | Monterey 12.5+ | iOS 16.2 | iOS 11–16.4 |
| 14.3.1 | Ventura 13.x | iOS 16.4 | iOS 11–16.4 |
| 15.4 | Sonoma 14.x | iOS 17.5 | iOS 12–17.5 |
| 16.4 | Sequoia 15.3+ | iOS 18.5 | iOS 15–18.5 |
| 26.x | Tahoe 26.2+ | iOS 26 | iOS 16+ |

**Den brutale konklusjonen:** Med Xcode 14.2 kan du i beste fall simulere opp til **iOS 16.4**. ShiftPay målretter Expo SDK 54 / RN 0.81, som kompilerer mot iOS 18 SDK. Du har **ingen offisiell vei** til en iOS 18-simulator på Monterey.

**Den uoffisielle workarounden** (Ivan Ugrins post): Bygg lokalt i Xcode 14, kopier `.app`-bundle inn på en iOS 17/18-simulator via `xcrun simctl install booted <path>`. Men:
- Apple droppet "Device Support Files"-konseptet i Xcode 15 — workarounden er fragil
- Du må ha selve simulator-runtime-DMG-en, og iOS 18-runtimes nektes ofte download via Xcode 14-kanaler
- Build-toolchainen din er fortsatt iOS 16 SDK — du tester ikke faktisk iOS 18-binærer

**Verdikt:** Lokal Xcode-løype på Monterey er en blindvei for ShiftPay. Glem den.

### 2) OpenCore Legacy Patcher (OCLP) — kan MacBookAir7,2 kjøre Sonoma/Sequoia?

**Kort svar: Ja teknisk, men nei praktisk for Xcode-bruk.**

**Modellstatus (Dortania docs):** MacBookAir7,2 (Broadwell, Intel HD 6000) er listet som supported, ingen "no additional info" warnings utover Legacy Metal GPU-patches. OCLP 2.4.1 er stable og leverer Sequoia-support.

**Hva som funker / ikke funker på Broadwell + Sequoia:**

| Komponent | Status |
|---|---|
| Wi-Fi / Bluetooth (Broadcom) | Patchet, fungerer |
| Intel HD 6000 GPU | Krever Legacy Metal-patches + MetallibSupportPkg |
| iPhone Mirroring | **Fungerer ikke** — krever T2-chip attestation |
| Apple Intelligence | **Fungerer ikke** på patched Macs |
| USB 1.1-enheter | Ikke støttet i Sequoia |
| Sleep/wake | Generelt OK, men avhenger av build |

**Performance-realitetssjekk fra brukerrapporter:**

- Brukere på MacRumors-tråden (2015 MBA 8GB) rapporterer at Sequoia "kjører rather well" til vanlig bruk, men at Ventura+ "relies heavily on AVX2.0 for UI rendering, and emulating the missing instruction set with OCLP consumes excessive CPU". Broadwell har ikke AVX2, så UI-rendering er emulert med ekstra CPU-overhead.
- En kommentator: "I would stay with Monterey due to slowness or a little overheating".
- 8 GB RAM er minimum for Sequoia — under det er det "not fun at all".
- Intel dual-core i5-5250U + 8 GB + emulert AVX2 + Xcode 16 (>50 GB build, indeksering, simulator) = du kommer til å vente lenge på alt.

**OCLP-prosjektets fremtid (apr 2026):**
- Lead-utvikler Mykola Grymalyuk forlot OCLP og gikk til Apple sent 2025
- Teamet sluttet å ta imot donasjoner i mars 2026
- **Ingen stable Tahoe (macOS 26) støtte** — kun eksperimentelle nightlies
- Apple fjerner aktivt Intel-spesifikk kode fra frameworks, så grunnlaget OCLP bygger på krymper

**Real showstoppers for Xcode 16+ på Broadwell:**
- Xcode 16 krever Sequoia 15.2+, som er på selvsamme stresset OCLP-stack
- iOS Simulator runtime er *ekstremt* RAM-hungrige — 8 GB blir spist live
- Indeksering av en RN/Expo-prosjekt i Xcode på en dual-core blir time-lange økter
- Hvis OCLP knekker etter en macOS-oppdatering, sitter du potensielt med en ubrukelig hovedmaskin

**Verdikt:** OCLP-veien er teknisk mulig men strategisk dum. Du vil bruke timer på vedlikehold og fortsatt ha en treig opplevelse. Skip.

### 3) Cloud iOS-simulator-tjenester

| Tjeneste | Pris | Format | Best for | Caveat |
|---|---|---|---|---|
| **Appetize.io** | Free 100 min/mnd (3 min/sesjon), Basic $40/mnd, Premium $400/mnd | Last opp `.tar.gz` (iOS Simulator-build) eller `.ipa` | **Solo dev iterations** — last opp en sim-build, del lenke, klikk og test i nettleser | 3-min sesjons-cap på free tier kan være irriterende for lengre design-runder |
| **BrowserStack App Live** | Individual $29/mnd, Team $25/bruker/mnd | Last opp `.ipa` | Test på **ekte fysiske iPhones** (ikke simulator) — bedre for visuell validering | Ingen ekte simulator — hvis du har iPhone selv, gir dette mindre verdi |
| **LambdaTest** | Lignende prising, real device cloud | `.ipa` | QA-automation > design-iterasjon | Mer enterprise-fokusert |
| **Sauce Labs** | Enterprise-pris (kontakt salg) | `.ipa` / `.zip` | Stor team / CI | Overkill for solo |

**Beste valg for ShiftPay-iterasjoner:** **Appetize.io på free-tier** for spot-checking, oppgrader til $40/mnd hvis du faktisk bruker det daglig. Kombinerer godt med EAS — Expo har offisielt fremhevet Appetize-integrasjonen.

**Workflow:**
```bash
eas build --profile preview-simulator --platform ios
# Last ned .tar.gz fra EAS dashboard
# Pakk ut → .app
# Last opp på Appetize → få URL
# Del eller åpne i nettleser
```

### 4) EAS cloud-basert iOS Simulator preview

**Du har allerede satt det opp:** `preview-simulator`-profilen i `shiftpay/eas.json` gir deg en iOS Simulator-build i skyen.

**Det viktige spørsmålet — kan du *kjøre* tarball-en uten lokal Xcode?**

Nei, ikke direkte. iOS Simulator binæren (`Simulator.app`) ligger inne i Xcode-bundlet. Den finnes ikke som standalone download fra Apple.

**Praktiske alternativer for å kjøre `.tar.gz` fra EAS:**

| Hvor | Krever | Kostnad |
|---|---|---|
| Lokal iOS Simulator | Xcode (uansett versjon) | 30+ GB disk, må ha kompatibel Mac |
| **Appetize.io** | Bare en konto + upload | Free / $40/mnd |
| Remote Mac (MacinCloud / Scaleway) | RDP/VNC-klient | €0.11–€6.50/time |

**Beste løype:** EAS bygger sim-build → upload til Appetize → test i nettleser. Du trenger aldri å åpne Xcode.

### 5) Hybrid: remote Mac i skyen

**Pris-sammenligning (apr 2026):**

| Leverandør | Modell | Pris | Min. periode | Latens fra Norge |
|---|---|---|---|---|
| **Scaleway M1** | 8GB/256GB | €0.11/time, €75/mnd | 24t (Apple-krav) | Paris — ~30-50ms, OK |
| Scaleway M2 | 16GB | €0.17/time, €115/mnd | 24t | Paris |
| Scaleway M4 | 16GB | €0.22/time, €149/mnd | 24t | Paris |
| MacStadium M1 | 8GB | $109/mnd | Månedlig | US-baserte DC, høy latens |
| AWS EC2 mac2.metal | M2 | ~$6.50/time, ~$4 700/mnd | **24t per host-allokering** | EU-region tilgjengelig |
| MacinCloud (Managed) | Diverse | $30–80/mnd | Månedlig | Mest US |

**Realitetssjekk for design-iterasjon:**
- Apples lisens krever **minimum 24 timers host-allokering** uansett tjeneste. €0.11/time × 24 = €2.64 per "økt" på Scaleway. Dette gir deg én dag med iOS Simulator i skyen, billig.
- VNC/RDP til en Mac for å iterere på design er **kjip opplevelse**. Du mister gestures, font-rendering ser litt rart ut over kompresjon, og round-trip-tid på touchen blir forsinket.
- Du trenger fortsatt å installere Xcode på remote-Macen (laste ned 10+ GB), kjøre EAS lokalt der eller hente builds — det er dev-environment-setup hver gang hvis du ikke har persistent storage.

**Verdikt:** Reserve-løsning, ikke daglig bruk. Hvis du skulle gått denne ruten, er **Scaleway M1 €0.11/time i Paris** suverent best (EU-DC, cheap, on-demand). Men prefer iPhone-loopen.

### 6) Expo Go / Snack på iPhone — den oversette winnen

**Dette er løsningen folk glemmer.**

ShiftPay er Expo SDK 54. På din egen iPhone kan du:

1. Last ned **Expo Go** fra App Store (gratis)
2. `npx expo start` på Macen
3. Skann QR-kode med iPhone → app åpnes i Expo Go med hot reload

**Begrensninger for ShiftPay spesifikt:**
- Expo Go støtter en fast set av native moduler. ShiftPays `expo-sqlite`, `expo-camera`, `expo-notifications`, `expo-crypto`, `expo-localization`, `expo-router` — **alt dette er bundled i Expo Go**
- `nativewind` (styling) — JS-only, fungerer
- Det som *ikke* fungerer i Expo Go: custom dev-client, modifiserte `app.json`-konfigurasjoner som krever native rebuild, push notifications fra server (men lokale notifications fungerer)

**Strengere alternativ — Development Build på iPhone:**

```bash
eas build --profile development --platform ios
# Build kommer til EAS dashboard
# Åpne lenken på iPhone, install (krever Apple Developer + dev-cert)
# npx expo start --dev-client
# Skann QR i din egen dev-build → hot reload
```

**Forskjell:**
- **Expo Go:** Raskest å komme i gang. Begrenset til Expo SDK-pakkene. For ShiftPay: **fungerer 100% siden alle native moduler er Expo-bundled**.
- **Dev build:** Egen versjon av Expo Go med dine eksakte native moduler. Bygger én gang, så lever du i samme hot-reload-loop. Mer fleksibelt hvis du legger til en library Expo Go ikke har.

**For ShiftPays MVP:** Expo Go er nok. Du har ingen native moduler utenfor Expo SDK.

### 7) React Native Web som design-loop

**`npx expo start --web` gir deg appen i nettleseren.** Den bruker `react-native-web` til å mappe RN-komponenter til DOM.

**Hvor godt treffer det iOS?**

- ✅ Layout (Flexbox-modell er identisk)
- ✅ Spacing, padding, borders
- ✅ NativeWind/Tailwind-styling fungerer
- ✅ Komponentstruktur, props, state — alt fungerer
- ❌ iOS-fonter (San Francisco) — nettleser bruker fallback med mindre du embedder
- ❌ SafeAreaView — nettleser har ikke notch-modell
- ❌ Native gestures (swipe-back i Stack)
- ❌ iOS-spesifikke shadows ser annerledes ut (nettleseren bruker `box-shadow`, RN iOS bruker layer-skygge)
- ❌ Kamera, SQLite, notifications — krever shims eller fungerer ikke
- ❌ `expo-router` deep links og modaler oppfører seg litt annerledes

**For ShiftPay:** Bra for å iterere på dashboard-layout, summary-skjermer, settings — alt som er ren UI uten kamera/SQLite. Dårlig for å validere "hvordan ser det egentlig ut på en iPhone 14 Pro".

**Verdikt:** Suverent for komponentutvikling. Ikke en erstatning for ekte iOS-render.

### 8) iOS-spesifikke design-test-verktøy uten build

| Verktøy | Hva det gjør | Når det er nyttig |
|---|---|---|
| **Figma iOS-mockup** | Designe screens i iOS UI Kit, Apple-fonter, ekte komponenter | **Før** du skriver kode — for å lock spec |
| **Apple Design Resources** | Offisielle Sketch/Figma-templates, SF Pro-font, iOS-komponenter | Brand-konsistens |
| **Storybook for React Native** | Komponentkatalog, isolated rendering | Utvikle design-system, dokumentere komponenter |
| **Expo Snack** | Browser-basert RN-sandbox, deler via lenke | Prototype én skjerm, deler med andre for feedback |
| **Polypane** (web-fokusert) | Multi-viewport browser-sjekk | Hvis du tester web-versjonen |

**For ShiftPays scope:** Figma-mockup for nye skjermer + iPhone-on-device-testing er den realistiske design-loopen. Storybook er overkill for et 5-dagers MVP.

---

## Sammenligning — alle alternativene

| Tilnærming | Kostnad/mnd | Fidelitet | Iterasjonshastighet | Setup-arbeid | Anbefales? |
|---|---|---|---|---|---|
| **Expo Go på egen iPhone** | 0 kr | 100% iOS | Sekunder (hot reload) | Minimalt | ✅ Primær |
| **EAS dev-build på egen iPhone** | 0 kr (15 builds gratis) | 100% iOS | Sekunder (hot reload) | 15-20 min første gang | ✅ Primær (når du legger til native moduler) |
| **`npx expo start --web`** | 0 kr | ~70% iOS | Sekunder | 0 | ✅ Sekundær (rask layout-sjekk) |
| **Appetize.io free** | 0 kr | 95% iOS | 5-10 min per build | 10 min | ✅ Tertiær (når du må se sim) |
| **Appetize.io paid** | $40/mnd | 95% iOS | 5-10 min | 10 min | Bare hvis free er for restriktivt |
| **Scaleway M1 ad-hoc** | €2.64/24h, ~€10-30/mnd | 100% iOS sim | Tregt remote-loop | 1-2t per ny instance | Reserveplan |
| **OCLP + Xcode 16** | 0 kr (men tid) | 100% iOS sim | Veldig tregt | 4-8t setup, evig vedlikehold | ❌ Skip |
| **Lokal Xcode 14.2** | 0 kr | 80% (kun iOS 16-SDK) | Tregt | 30+ GB, lang install | ❌ Skip |
| **AWS EC2 Mac** | $700-4700/mnd | 100% | Greit | Komplisert | ❌ For dyrt for solo |
| **MacStadium** | $109/mnd | 100% | Greit | Medium | ❌ Bedre Scaleway |
| **BrowserStack App Live** | $29/mnd | 100% (ekte enheter) | Treg upload-loop | Lett | Hvis du ikke har egen iPhone |

---

## Gotchas og kjente showstoppers

### Per tilnærming

**Expo Go / dev-build på iPhone:**
- iPhonen må være på samme Wi-Fi som Macen for hot reload (eller bruk tunnel-modus: `npx expo start --tunnel` — tregere)
- Dev-build krever paid Apple Developer ($99/år) — du har dette allerede
- Hvis du legger til en native modul som ikke er i Expo Go, må du bygge dev-build på nytt
- iPhone trenger Developer Mode aktivert (Settings → Privacy & Security → Developer Mode)

**Appetize:**
- Free-tier 3-min sesjons-cap er reell. Du logges automatisk ut etter 3 min, må starte om
- Touchen via nettleser har litt latens — gestures som swipe back føles ikke 100%
- Privat builds krever conto — ikke del lenker offentlig på free-tier hvis du har sensitive data

**EAS sim-build:**
- Build-tid er typisk 8-15 minutter på free queue (kø kan være lang)
- Free-tier: 15 iOS-builds/mnd — fort spist hvis du itererer ofte
- `.tar.gz` må pakkes ut til `.app` før upload til Appetize: `tar -xzf build.tar.gz`

**OCLP på MacBookAir7,2:**
- Hver macOS-punkt-oppdatering krever potensielt re-patching av root volume
- OCLP-team mister momentum (lead → Apple)
- Hvis du tråkker feil, kan du brick boot-volumet og må reinstalle Monterey fra scratch

**React Native Web:**
- Krever at appen ikke har web-incompatible imports — `expo-sqlite` for eksempel kaster på web. Du må wrappe med `Platform.OS !== 'web'`-guards eller mocke

**Lokal Xcode 14.2:**
- Apples Developer Portal kan finne på å ikke vise gamle Xcode-versjoner uten å logge inn med Apple Developer-konto + søke i "More Downloads"
- 30+ GB disk
- Kan krasje på Monterey 12.7.6 grunnet senere security-changes — mange har rapportert problemer

**Scaleway / AWS Mac:**
- 24-timers minimum-allokering = du betaler for hele dagen selv om du bare bruker 1 time
- Latens fra Norge til Paris (Scaleway): OK for kode-arbeid, ikke ideelt for visuell iterasjon
- Du må sette opp utviklingsmiljøet ditt på remote-Macen hver gang (med mindre du betaler for persistent disk)

---

## Kostnadsoversikt (tid + penger)

### Anbefalt setup (Plan A)

| Element | Tid | Kostnad |
|---|---|---|
| Installer Expo Go på iPhone | 2 min | 0 kr |
| Aktiver Developer Mode på iPhone | 2 min | 0 kr |
| `npx expo start` første gang | 5 min | 0 kr |
| Sett opp tunnel hvis Wi-Fi-issue | 10 min (én gang) | 0 kr |
| **Subtotal Plan A** | **~20 min** | **0 kr** |

### Sekundær: EAS dev-build på iPhone (når du trenger native moduler utenfor Expo Go)

| Element | Tid | Kostnad |
|---|---|---|
| Konfigurer dev-build profile | 5 min (allerede gjort) | 0 kr |
| `eas build --profile development --platform ios` | 10 min build + 5 min install | 0 kr (free-tier) |
| Hver re-iterasjon | Hot reload (sekunder) | 0 kr |
| **Subtotal Plan B** | **~15 min første gang, sekunder etterpå** | **0 kr** opp til 15 builds/mnd |

### Tertiær: Appetize for sim-preview

| Element | Tid | Kostnad |
|---|---|---|
| `eas build --profile preview-simulator --platform ios` | 10 min | 0 kr (counts mot 15/mnd) |
| Pakk ut `.tar.gz` → `.app` | 1 min | 0 kr |
| Last opp til Appetize | 2 min | 0 kr (free) eller $40/mnd (paid) |
| Iterer | 3 min sesjoner (free) eller ubegrenset (paid) | — |

### Hva du *ikke* skal bruke penger på

- AWS EC2 Mac: $4 700/mnd — ren galskap for solo dev
- MacStadium: $109/mnd — du bruker det aldri nok
- BrowserStack ekte enheter: $29/mnd — du har egen iPhone
- LambdaTest, Sauce Labs: enterprise-tools, ikke for solo

---

## Komplett anbefaling — én vei

**Hvis jeg skulle valgt én vei for ShiftPay-utvikling fra MacBook Air 7,2 i 2026, ville det vært:**

### Daglig loop: iPhone + Expo Go / dev-build
1. Kjør `npx expo start` på Macen
2. Skann QR med iPhone (Expo Go for nå, dev-build hvis du legger til native moduler)
3. Hot reload sekunder per iterasjon
4. Sluttbruker-test på fysisk hardware = høyest fidelitet du kan få

### Når du *må* se en iOS-simulator (sjelden)
- `eas build --profile preview-simulator --platform ios` (du har allerede profile)
- Last opp `.tar.gz` til Appetize.io free-tier
- Klikk gjennom i nettleser, ta screenshots

### App Store-submission (cloud, ingen Mac trengs)
- `eas build --profile production --platform ios`
- `eas submit --platform ios` (du har allerede ASC API-key konfigurert i eas.json)
- Apples iOS 18 SDK-krav fra apr 2025 håndteres av EAS-buildmiljøet, ikke din Mac

### Web-loop for raske layout-sjekker
- `npx expo start --web` for å iterere på styling i nettleseren
- Wrappe `expo-sqlite` og `expo-camera`-imports med `Platform.OS !== 'web'`-guards så ikke web krasjer

### Hva du gir slipp på
- Du får ikke kjørt iOS Simulator direkte på Macen — det er greit, du har bedre alternativer
- Du får ikke testet den splitt-sekundens animation-jank som bare vises på simulator vs. enhet — også greit
- Du får ikke debugget med Xcode Instruments lokalt — bruk Flipper / React DevTools / Sentry hvis du trenger profiling

### Hvorfor denne, og ikke OCLP

OCLP er en feature-killer — du kommer til å bruke uker av livet ditt på vedlikehold, og når Apple slipper en større macOS-oppdatering kan du ende med en uvelding maskin. Du har en hovedmaskin du bruker daglig — ikke gjør den til et lab-eksperiment. Bruk EAS og iPhone — som er design-flyten Expo selv anbefaler i 2026.

---

## Suggested follow-ups

- Hvis du oftere enn ~3 ganger/uke trenger sim, prøv én måned med Appetize Basic ($40) for å se om det er verdt det
- Hvis du på sikt vil ha en lokal iOS-utviklingsmaskin, vent på en brukt M1 Mac mini (~3000-4000 kr i 2026 som brukt) — det er den billigste vei til "ekte" iOS-utvikling
- Vurder å sette opp en GitHub Actions workflow som auto-bygger sim-builds på hver push og publiserer til Appetize automatisk

---

## Sources

1. [Apple Developer — Xcode Support](https://developer.apple.com/support/xcode/) — Offisiell Xcode/macOS/iOS-SDK kompatibilitetsmatrise
2. [Dortania — OCLP Supported Models](https://dortania.github.io/OpenCore-Legacy-Patcher/MODELS.html) — Bekreftet MacBookAir7,2 supportstatus
3. [Dortania — Sequoia Drop](https://dortania.github.io/OpenCore-Legacy-Patcher/SEQUOIA-DROP.html) — Hvilke modeller / features falt ut i Sequoia
4. [ITech4Mac — OCLP Tahoe Reality April 2026](https://www.itech4mac.net/2026/04/is-your-old-mac-stuck-on-sequoia-forever-the-oclp-macos-tahoe-reality-in-april-2026/) — OCLP-prosjektets status, lead-utvikler til Apple, ingen Tahoe
5. [MacRumors — OCLP on 2015 MacBook Air 4GB](https://forums.macrumors.com/threads/opencore-legacy-patcher-on-2015-macbook-air-4gb.2440737/) — Real-world rapporter om Broadwell + Sequoia ytelse
6. [Expo Docs — Build for iOS Simulators](https://docs.expo.dev/build-reference/simulators/) — `preview-simulator`-profile dokumentasjon
7. [Expo Docs — Create Development Build](https://docs.expo.dev/develop/development-builds/create-a-build/) — iPhone-dev-build krever Apple Developer-konto
8. [Expo Docs — iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/) — Bekreftet at Xcode kreves for lokal sim
9. [Expo Docs — Expo Orbit](https://docs.expo.dev/build/orbit/) — Også Orbit krever Xcode for iOS sim
10. [Expo Blog — Apple SDK Minimum Requirements](https://expo.dev/blog/apple-sdk-minimum-requirements) — iOS 18 SDK-krav fra apr 2025 (håndteres av EAS, ikke din Mac)
11. [Cathy Lai — Run Expo App on Physical iPhone (SDK 54)](https://medium.com/@cathylai_40144/run-your-expo-app-on-a-physical-phone-with-a-development-build-expo-54-expo-router-fa2adc796b7f) — Praktisk dev-build-på-iPhone-guide
12. [Appetize.io Pricing](https://appetize.io/pricing) — $40/mnd Basic, $400/mnd Premium
13. [Find Free For Dev — Appetize Free Tier](https://findfree.org/resource/appetize) — 100 min/mnd, 3 min/sesjon
14. [BrowserStack App Live Pricing](https://www.browserstack.com/pricing) — $29/mnd individual, ekte enheter
15. [Bitrise Blog — Deploying Expo to Appetize](https://blog.bitrise.io/post/deploying-expo-react-native-to-appetize) — Praktisk Expo + Appetize-integrasjon
16. [Scaleway Apple Silicon Pricing](https://www.scaleway.com/en/pricing/apple-silicon/) — €0.11/time M1, EU-region (Paris), 24t-minimum
17. [AWS EC2 Mac FAQs](https://aws.amazon.com/ec2/instance-types/mac/faqs/) — Dedicated host-modell, 24t-minimum, ~$6.50/time
18. [MacStadium Pricing](https://macstadium.com/pricing) — $109/mnd M1 mac mini
19. [Ivan Ugrin — Xcode 14 with iOS 17 Simulator](https://ivan-ugrin.medium.com/using-xcode-14-with-ios-17-simulator-d74cbc03da4d) — Uoffisiell workaround, fragil
20. [Apple Developer Forums — Xcode on Monterey](https://discussions.apple.com/thread/255410125) — Brukerrapporter Xcode 14 install-issues på 12.7.x
21. [React Native Journal — RN for Web 2025](https://medium.com/react-native-journal/react-native-for-web-in-2025-one-codebase-all-platforms-b985d8f7db28) — Hva web-versjonen treffer / ikke treffer
22. [Expo Docs — New Architecture / SDK 54](https://expo.dev/changelog/sdk-54) — Bekreftet RN 0.81 + iOS 18 SDK target
