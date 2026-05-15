# ShiftPay — Android startup-hang: hypotesesett

**Dato:** 2026-05-14
**Symptom:** Android-appen henger på den grønne splash-skjermen (teal `#0f766e` + `splash-icon.png`), kommer aldri videre. Ingen feilskjerm. Bekreftet på vC2 (Windows-bygget) OG vC5 (rent EAS-config lokalbygg, New Arch + Nitro/MMKV korrekt kompilert, riktig signert). Byggemiljøet er dermed **utelukket** — feilen ligger i kode/konfig.

---

## 1. To strukturelle feilmoduser

Splash-skjermen vises fordi `app/_layout.tsx` kaller `SplashScreen.preventAutoHideAsync()` på modul-nivå. Den skjules KUN av `SplashScreen.hideAsync()`, som ligger i `finally`-blokken i `runInit()`. `runInit()` kjøres i en `useEffect` som er gated på `fontsLoaded`.

Alt henger derfor på én av to ting:

### Modus A — JS-bundelen krasjer under modul-evaluering (før React monterer)
Hvis en `import` i `_layout.tsx` (eller transitivt) kaster under modul-evaluering, blir hele bundelen aldri ferdig lastet. React monterer aldri. `ErrorBoundary` finnes ikke ennå (den er inni React-treet). Splash blir stående evig, ingen feil-UI. **Symptomet matcher eksakt.**

### Modus B — React monterer, men `hideAsync()` kalles aldri
- **B-fonts:** `fontsLoaded` blir aldri `true` → `runInit` kjøres aldri → `hideAsync()` kalles aldri.
- **B-init:** `runInit` kjører, men `await initDb()` (eller en annen await) **henger** (resolver/rejecter aldri) → `finally` nås aldri.

Begge gir identisk symptom. **Bare `adb logcat` skiller dem.**

---

## 2. Hypoteser — rangert

### H1 — `useFonts` fullfører aldri i release-bundelen ⭐ (høy sannsynlighet, enkel mekanisme)

**Mekanisme:** `app/_layout.tsx` laster **17 font-vekter** over 4 familier (Inter, Inter Tight, Fraunces, JetBrains Mono) via `useFonts({...})`. expo-font v14 sin `useFonts`: ved lastefeil settes `error`, men `loaded` forblir `false`. Koden destrukturerer `const [fontsLoaded] = useFonts(...)` — **`error` ignoreres helt**. Hvis én eneste font-asset ikke bundles/lastes riktig i release → `fontsLoaded` blir `false` for alltid → `if (!fontsLoaded) return null;` → splash for alltid, helt stille.

**For:** Trenger ingen native-modul-feil, ingen R8. Ren JS. Dev laster fonter via Metro dev-server; release laster fra bundlede assets — klassisk "dev funker, release henger". Koden ignorerer `error` aktivt.

**Mot:** Asset-bundling pleier å være robust. `index.js` i hver font-pakke bruker `require('./...ttf')` korrekt.

**Bekreft:**
- `adb logcat` viser font-relatert feil ELLER ingenting (stille).
- Kjappere kodetest: les ut `error` fra `useFonts` og rendre den. Eller: midlertidig reduser til ÉN font og se om hangen forsvinner.
- **Fix uansett:** ALDRI ignorer `useFonts` sin `error`. Vis den, og hvis fonter feiler — hide splash + render med systemfont som fallback. En manglende font skal aldri kunne fryse hele appen.

---

### H2 — `createMMKV()` kaster på modul-nivå (høy sannsynlighet, modus A)

**Mekanisme:** `lib/storage.ts` linje 20: `const mmkv = createMMKV({ id: "shiftpay" })` kjøres på **modul-nivå**. `createMMKV` → `getMMKVFactory()` → `NitroModules.createHybridObject('MMKVFactory')`. Hvis Nitro ikke finner den registrerte HybridObject-en kaster dette **synkront** → `lib/storage.ts` evaluerer aldri ferdig → `lib/i18n` (importerer storage) feiler → `app/_layout.tsx` feiler → bundelen død → splash evig.

**For:** MMKV ble lagt til i Pass 5b. vC1 (pre-MMKV) funket; alt fra Pass 5b og utover henger. Module-scope-kall = krasj før noen feilgrense finnes. `react-native-mmkv` og `react-native-nitro-modules` shipper **ingen consumer-proguard-regler** — de er kun beskyttet av `extraProguardRules` i app.json.

**Mot:** `extraProguardRules` blir faktisk applisert (verifisert: expo-build-properties appender til `proguard-rules.pro`), og `-keep class com.margelo.nitro.** { *; }` dekker `com.margelo.nitro.mmkv`. Så et rent R8-strip er mindre sannsynlig. Hvis det var konsekvent ødelagt ville det også feilet i dev-client-bygg.

**Bekreft:** `adb logcat` viser en JS-exception (`createHybridObject` / `MMKVFactory` / Nitro) under bundle-load. Definitivt.

---

### H3 — Versjons-mismatch: MMKV 4.3.1 / Nitro 0.35.5 / RN 0.81 (medium)

**Mekanisme:** `react-native-mmkv@4.3.1` sine devDeps pinner `react-native@0.82.0`, `react-native-nitro-modules@0.35.0`, `nitrogen@0.35.0`. Prosjektet kjører `react-native@0.81.5` + `react-native-nitro-modules@^0.35.5`. MMKV 4.3.1 er altså utviklet mot RN 0.82 sin New Architecture-ABI. Det kompilerte fint (kildekode-kompatibelt), men en **runtime ABI-mismatch** i HybridObject-registreringen kan gi at `createHybridObject('MMKVFactory')` kaster eller at C++-OnLoad ikke registrerer fabrikken.

**For:** Forklarer hvorfor `createMMKV` kan feile selv med korrekte proguard-regler. New Arch ABI endret seg 0.81→0.82.

**Mot:** Ville sannsynligvis også feilet i dev-client. Pre-1.0 patch-versjoner (0.35.0→0.35.5) er som regel ABI-stabile.

**Bekreft:** logcat. Eller: nedgrader MMKV til en versjon hvis devDeps pinner RN 0.81 (f.eks. MMKV 4.1.x/4.2.x), eller løft Nitro til eksakt 0.35.0 for å matche MMKV sin nitrogen.

---

### H4 — R8/`shrinkResources` brekker native-registrering KUN i release (medium)

**Mekanisme:** Pass 7 slo på `enableMinifyInReleaseBuilds` + `enableShrinkResourcesInReleaseBuilds`. Debug/dev-client-bygg har IKKE R8 → forklarer perfekt "dev funker, release henger". Selv om keep-reglene dekker `com.margelo.nitro.**` og `expo.modules.**`, er det ting de IKKE dekker:
- **App-pakka `com.smlhus.shiftpay`** — RN New Architecture-codegen (TurboModule/Fabric-registrering, generert PackageList) lander her. **Ingen keep-regel for appens egen pakke.**
- `shrinkResources` kan fjerne en ressurs som slås opp via refleksjon.
- `-assumenosideeffects class android.util.Log` fjerner `Log.v/d`-kall — hvis et slikt kall inneholdt et uttrykk med sideeffekt, ryker sideeffekten med.

**For:** Den ENESTE forskjellen mellom kjent-fungerende (dev/pre-Pass-7) og hengende (release) som treffer native-laget bredt. Forklarer hvorfor H2/H3 kan manifestere seg kun i release.

**Mot:** Keep-reglene for de åpenbare pakkene ER på plass. RN sin gradle-plugin legger normalt til egne consumer-regler for generert kode.

**Bekreft (sterk isolasjonstest):** Bygg med `enableMinifyInReleaseBuilds: false` + `enableShrinkResourcesInReleaseBuilds: false`. Henger den fortsatt → R8 er uskyldig (se H1/H2/H3/H5). Funker den → R8 bekreftet, og vi finstiller keep-regler (legg til `-keep class com.smlhus.shiftpay.** { *; }` og verifiser hver native modul).

---

### H5 — `initDb()` / `expo-sqlite` `openDatabaseAsync` henger (modus B-init, medium)

**Mekanisme:** `runInit()` gjør `await initDb()` → `SQLite.openDatabaseAsync(DB_NAME)`. Hvis expo-sqlite sin native-modul ikke er registrert (New Arch / R8), kan dette async-kallet **henge** (native-promiset settles aldri) i stedet for å kaste. Da nås aldri `finally { hideAsync() }`. expo-sqlite shipper heller **ingen consumer-proguard-regler** — kun beskyttet av `-keep class expo.modules.** { *; }`.

**For:** En hengende (ikke kastende) await gir nøyaktig "splash evig, React montert bak". Konsistent med modus B.

**Mot:** `expo.modules.**`-regelen dekker `expo.modules.sqlite`. expo-moduler er normalt robuste mot autolinking-problemer.

**Bekreft:** logcat — vil vise om vi kommer forbi bundle-load (React monterer) men henger i en native-bro. Legg ev. inn et `console.log`/timeout rundt `initDb()`.

---

### H6 — `SafeAreaProvider` mangler / `ShiftTintStripe` kaster utenfor ErrorBoundary (lav)

**Mekanisme:** `RootLayout` wrapper kun `LocaleProvider` → `ThemeProvider` → `RootLayoutInner`. Ingen eksplisitt `SafeAreaProvider`. `ShiftTintStripe` kaller `useSafeAreaInsets()` og rendres som **søsken til** (utenfor) `ErrorBoundary`. Hvis expo-router ikke leverer en `SafeAreaProvider` automatisk, kaster `useSafeAreaInsets()` — og fordi det er utenfor ErrorBoundary, fanges det ikke.

**For:** En ufanget render-throw kan gi hvit/fryst skjerm.

**Mot:** expo-router v6 wrapper normalt appen i `SafeAreaProvider`. Ville sannsynligvis også feilet i dev.

**Bekreft:** logcat / midlertidig fjern `ShiftTintStripe`.

---

## 3. Det mest sannsynlige bildet

To uavhengige, troverdige rotårsaker peker seg ut:

1. **H1 (fonter)** — ren JS, trenger ingenting annet, og koden ignorerer feilen aktivt. Billigst å utelukke.
2. **H2/H4 sammen** — `createMMKV()` på modul-nivå er en tikkende bombe; R8 (Pass 7) er den eneste store release-vs-dev-forskjellen som kan tenne den.

Tidslinjen støtter en kombinasjon: vC1 (pre-MMKV, pre-R8) funket. Alt etter Pass 5b+Pass 7 henger.

---

## 4. Diagnoseplan (i morgen)

**Steg 1 — `adb logcat` (master-nøkkelen).** Med telefonen koblet til Mac-en:
```
adb logcat -c && adb logcat | grep -iE "shiftpay|ReactNative|AndroidRuntime|nitro|mmkv|sqlite|FATAL|Hermes"
```
Start appen. logcat skiller umiddelbart modus A vs B og peker på riktig hypotese:
- JS-exception om `createHybridObject`/`MMKVFactory` → H2/H3
- Font/asset-feil eller stille → H1
- Kommer forbi bundle-load, henger i native-bro → H5
- `ClassNotFoundException`/`NoSuchMethodError` → H4

**Steg 2 — isolasjonsbygg (parallelt, hvis logcat er tvetydig):** Bygg med R8 av (`enableMinifyInReleaseBuilds: false`). Skiller H4 fra resten.

**Steg 3 — målrettet fiks** basert på hva Steg 1–2 viser.

---

## 5. Fiks som bør gjøres UANSETT rotårsak

Disse er korrekte uavhengig av hva logcat viser, og flere av dem ville gjort at appen **feilet synlig** i stedet for å henge stille:

1. **Ikke ignorer `useFonts` sin `error`.** Les `const [fontsLoaded, fontError] = useFonts(...)`. Ved feil: `hideAsync()` + render videre med systemfont. En manglende font skal aldri fryse appen.
2. **Ikke kall `createMMKV()` på modul-nivå.** Flytt MMKV-instansieringen bak en lazy getter (`function getMmkv()` med memoisering), eller wrap i try/catch som faller tilbake til en in-memory shim. En native-modul-feil skal degradere, ikke krasje bundelen.
3. **Watchdog på splash:** I `_layout.tsx`, sett en `setTimeout` (f.eks. 10 s) som tvangskaller `SplashScreen.hideAsync()` + viser en feilskjerm. Da ser brukeren ALDRI en evig splash igjen — verste fall er en feilmelding de kan rapportere.
4. **`runInit` bør ikke gates bak `fontsLoaded`.** DB-init og font-load er uavhengige; å koble dem betyr at fontfeil også blokkerer DB. Kjør dem parallelt, hide splash når BEGGE er ferdige ELLER watchdog løser ut.
5. **Legg til keep-regel for app-pakka:** `-keep class com.smlhus.shiftpay.** { *; }` (dekker New Arch-codegen).
6. **Flytt `react-native-worklets` fra devDependencies til dependencies** — den er en runtime native-avhengighet av Reanimated 4.
7. **Vurder MMKV/Nitro-versjonsjustering** så de matcher RN 0.81 (H3).
