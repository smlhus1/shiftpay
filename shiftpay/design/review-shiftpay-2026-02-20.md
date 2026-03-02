# Design Review: ShiftPay

> Evaluert: 2026-02-20 | Type: Mobile (React Native / NativeWind / Expo)
> Fokus: Brukerflyt og redusere barrierer for bruk

---

## Forsteintrykk

ShiftPay er en app med et ekte og veldefinert problem — sykepleieren som nettopp jobbet nattevakt og lurer på om lønnen stemmer. Det er bra. Men designet kommuniserer ikke dette. Apen apner til en skjerm som heter "Historikk" med en tom liste og en knapp som sier "Ga til Import". Det er som a apne et regneark. Det er ingen folelse av at dette er et verktoy for deg, noen som har jobbet deg gjennom ei vanskelig natt.

Brukerflyt-logikken er solid under panseret, men overflaten er sa naken at den skaper usikkerhet: "Hva er dette? Hva skal jeg gjore forst? Forstar den appen hva jeg driver med?" Det er ingen personlighet, ingen varme, ingen bekreftelse pa at den vet hvem du er.

---

## AI-Aesthetic Score: 3/10

*10 = helt generisk AI-output, 0 = tydelig menneskelig og gjennomtenkt*

**Score: 3/10** — Lavere enn forventet. Dette er ikke et typisk AI-design med gradienter og glassmorphism. Det er faktisk det motsatte: ratt og funksjonelt til det kjedsommelige. Det gjor det ikke til godt design — det er bare en annen feil. AI-flagg som er til stede:

- `bg-blue-600` pa alle primere handlinger uten unntak — ingen vurdering av kontekst
- Absolutt identisk knapp-struktur pa tvers av alle skjermbilder (rounded-lg, py-3, font-medium text-white)
- Ingen typografisk hierarki utover `font-medium` vs ingenting
- Alle kort: `rounded-lg border border-gray-200 bg-white p-4` — copy-pastet 8 ganger
- Null personlighet. Ingen mikrokopi. Ingen karakter.
- Blank gray-50 bakgrunn som ikke tilforer noe
- Settings-siden er pa engelsk i en norsk app (ikke AI-flag, men avslorer at ingen har tenkt gjennom hele flyten som en bruker)

Det som *ikke* er typisk AI: ingen gradienter, ingen illustrasjoner, ingen overdreven spacing. Koden er kompetent. Det er en MVP skrevet raskt av noen som kan kode men ikke har prioritert design. Det er faktisk mer menneskelig enn det fleste AI-apper — men det er ikke det samme som godt.

---

## Det som fungerer

- **Feilhanding er gjennomtenkt.** Nettverksfeil, tom-states, loading-states — alt har en fallback. `withDb()` retry-logikken vises ikke men pavirker opplevelsen positivt.
- **Confirm-flyten er riktig i konseptet.** Tre valg (fullfort/ikke fullfort/overtid) er den rette mental modellen. Ingen over-engineering.
- **OCR-progress feedback.** "Behandler 1 av 3 bilder..." er god konkret feedback under ventetid.
- **Onboarding-logikken er faktisk smart.** Sjekker om base_rate > 0 og sender til innstillinger. Lite friksjon.
- **Allerede bekreftet-tilstanden** i `confirm/[shiftId].tsx` viser korrekt status istedenfor a krasje eller tillate dobbel-bekreftelse.
- **Pull-to-refresh** pa Dashboard er riktig mobil-idiom.
- **Manuell skift-editor** har left-border amber varsel pa feil-rader — god pattern.
- **ShiftCard compact-modus** er et fornuftig komponent-valg for a gjenbruke pa tvers av kontekster.

---

## Det som ikke fungerer

### 1. Feil forste tab — "Historikk" er feil navn og feil forste inntrykk

Den forste tabben heter "Historikk" med et klokke-ikon. Men den viser neste vakt, ubekreftede vakter og ukens vakter — dette er *na*, ikke historikk. For en ny bruker er det forvirrende. For en erfaren bruker er det feil.

Problemet er dypere: Dashboard er den viktigste skjermen men ser ut som et arkiv. Ingenting sier "dette er din status akkurat na."

### 2. Tom-state pa Dashboard er for passiv og kald

```tsx
// Eksisterende:
<Text className="text-lg font-medium text-gray-900">Ingen vaktplaner enna</Text>
<Text className="mt-2 text-center text-gray-600">
  Importer fra Import-fanen eller legg inn skift manuelt.
</Text>
<TouchableOpacity className="mt-6 rounded-lg bg-blue-600 px-6 py-3">
  <Text className="font-medium text-white">Ga til Import</Text>
</TouchableOpacity>
```

Dette forteller brukeren at appen er tom. Det burde fortelle brukeren hva de far igjen. En sykepleier apner appen for forste gang — de trenger en grunn til a bry seg, ikke en instruksjon om a ga et annet sted.

### 3. Fem importknapper med identisk visuell vekt

Pa import-skjermen er det fem knapper i rad. Fire ser identiske ut (hvit/gra border). En er bla. Det er ingen hierarki-signalering utover fargen pa primær-knappen. Brukeren ma lese alle fem for a ta et valg.

```
[Ta bilde av timeliste]       <- bla, primær
[Velg bilder fra galleri]     <- hvit
[Velg bilder fra filer]       <- hvit
[Importer CSV-fil]            <- hvit
[Legg til skift manuelt]      <- hvit
```

"Velg bilder fra galleri" og "Velg bilder fra filer" er mentalt sett det samme valget for brukeren. De er teknisk forskjellige (ImagePicker vs DocumentPicker) men en sykepleier skjoner ikke den distinksjonen. Den skaper falsk valg-stress.

### 4. Settings er pa engelsk i en norsk app

```tsx
// lib/format.ts — norsk
// app/(tabs)/settings.tsx — engelsk
label="Base rate"
label="Evening supplement"
label="Night supplement"
// ...
<Text className="text-center font-medium text-white">Save</Text>
<Text className="mt-3 text-center text-green-600">Saved.</Text>
```

Og i ShiftEditor:
```tsx
<Text className="text-center text-gray-600">+ Add another shift</Text>
<Text className="mt-3 text-center text-green-600">Saved. You can import another.</Text>
```

Dette er ikke bare estetikk — det er et tillits-problem. En norsk sykepleier som skal taste inn lonnen sin og ser engelske labels begynner a tvile pa om appen er laget for dem.

### 5. Kamera-UI er fratatt all kontekst

`CameraCapture` er en ren sort skjerm med kamera og to knapper: "Cancel" (gra) og "Take photo" (bla). Begge pa engelsk. Ingen veiledning om hva som skal fotograferes, ingen viewfinder-markering, ingen hint om format (liggende? staende? narre plass?).

En timeliste pa papir er typisk A4 i liggende format. Appen gir ingen antydning om dette. Brukeren tar et bilde, venter pa OCR, og far kanskje et halvt resultat fordi bildet var for skakt.

### 6. Confirm-flyten er gjemt og har et potensielt farlig friksjonspunkt

"Neste vakt"-kortet pa Dashboard har en "Bekreft vakt"-knapp. Men vakten er ikke ferdig enna — den *starter* om X timer. En bruker som klikker den fordi de vil se hva som skjer, bekrefter vakten for tidlig.

Knappen burde vaere skjult til vakten faktisk er over (basert pa end_time), eller i det minste veere tydelig pa at "Bekreft vakt" betyr "Rapporter at du fullforte vakten."

### 7. Maanedsoppsummering viser for mange tall pa for liten plass

```tsx
<Text className="text-gray-600">
  Planlagt: {summary.plannedShifts} vakter, {summary.plannedHours.toFixed(1)} t
</Text>
<Text className="text-gray-600">
  Fullfort: {summary.completedShifts} · Overtid: {summary.overtimeShifts} · Ikke mott: {summary.missedShifts}
</Text>
```

To linjer med komma-separerte tall i body-tekst. Dette er den skjermen brukeren faktisk bryr seg om — "ble jeg betalt riktig?" — og den er designet som en datadump. Den viktigste informasjonen (forventet lonn) er gjemt under to kort med statistikk.

### 8. "Bekreft vakt"-knapp pa neste-vakt-kortet er misvisende

Se punkt 6. I tillegg: selve kortets primærhandling (ga til vakt-detaljer) finnes ikke. Brukeren kan ikke trykke pa kortet for a se mer — det er ikke klikkbart. De kan bare bekrefte. Det gir ikke mening na vakten ikke har startet enna.

### 9. ShiftCard er et flex-wrap-rot pa smal skjerm

```tsx
className="mb-2 flex-row flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
```

`flex-wrap` pa en rad med dato, tid, type-badge, status-badge og confirm-knapp betyr at pa smale skjermer vil elementene bryte vilkarlig. En dato + tid kan ende opp pa en linje, shift_type-badgen pa neste, og confirm-knappen pa en tredje. Det gir ikke et organisert inntrykk.

### 10. "Start pa nytt"-lenken i ShiftEditor har for liten touch target

```tsx
<TouchableOpacity className="mt-4 rounded-lg border border-gray-300 py-2">
  <Text className="text-center text-gray-700">Start pa nytt</Text>
</TouchableOpacity>
```

`py-2` = 8px padding. Med standard linjehoyden er dette langt under 44px touch target-kravet. Pa en mobil med skjolding eller tykke fingre treffer man lett utenfor.

---

## AI-rodflagg funnet

- Identisk knapp-komposisjon (`rounded-lg bg-blue-600 py-3 font-medium text-white`) brukt ukritisk pa alle primere handlinger, uavhengig av kontekst eller alvorlighetsgrad
- `border-gray-200 bg-white p-4 rounded-lg` som universalt kort-format, 8+ steder
- `bg-gray-50` som bakgrunn — den noytreste mulige valget, ingen varmde, ingen personlighet
- Ingen typografisk skala. To vaekter brukt: `font-medium` og ingenting. Ingen `font-semibold` brukt konsekvent, ingen `text-base` vs `text-sm` system
- Bade engelsk og norsk UI-tekst — typisk for at ingen har gatt gjennom hele flyten fra utsiden
- Tom-states er rene tekstbeskjeder uten noen visuell karakter

---

## Brukervennlighet

| Omrade | Score | Hovedfunn |
|--------|-------|-----------|
| Hierarki | 3/5 | Fem like importknapper. Confirm-knapp pa ikke-ferdig vakt. Summary begraver hoved-tallet. |
| Typografi | 2/5 | Ingen skala. font-medium vs ingenting. Ingen heading-hierarki. Tall-display-stiler mangler. |
| Farger | 3/5 | Funksjonelle status-farger er bra. Blue-600 overalt drukner semantikken. Ingen varme. |
| Whitespace | 3/5 | Konsistent 16px padding. Men kortet-pa-kort-pa-kort gir ingen pusterom. |
| Interaktivitet | 2/5 | Confirm-pa-ikke-ferdig-vakt. ShiftCard er ikke klikkbart der det burde vaere. touch targets er for sma pa sekundaere handlinger. |
| Responsivitet | 3/5 | flex-wrap i ShiftCard er uprediktabelt. Ingen gjennomgaende minimum touch target. |
| Tom/feil-states | 3/5 | Feil-states finnes og er ryddig. Tom-states mangler personlighet og kontekst. |

---

## Topp 5 forbedringer (prioritert)

---

### 1. Gi Dashboard en identitet og rett navn

**Na:** Tab heter "Historikk" med klokke-ikon. Innholdet er neste vakt og ukens oversikt. Tom-state er "Ingen vaktplaner enna" + knapp til import.

**Hvorfor det ikke funker:** Feil navn skaper feil forventning. Tom-state er instruksjonell, ikke motiverende. En sykepleier som apner appen pa vei fra nattevakten forstar ikke hva de ma gjore.

**Forslag:**
Rename tab til "Oversikt" (ikon: `home-outline` eller `pulse-outline`). Skriv om tom-state til noe som adresserer brukeren direkte:

```tsx
// Istedenfor den kalde versjonen:
<Text className="text-lg font-medium text-gray-900">Ingen vaktplaner enna</Text>

// Noe som snakker til en sykepleier:
<Text className="text-xl font-semibold text-gray-900">God morgen</Text>
<Text className="mt-2 text-gray-600">
  Ta et bilde av timelisten din, sa hjelper ShiftPay deg a sjekke at lonnen stemmer.
</Text>
```

**Tailwind:** Ingen endring i strukturen — bare copy og tab-navn. Effekt er stor, kostnad er minimal.

**Referanse:** Gentler Streak (fitness-app) — apner alltid med en direkte henvendelse til brukeren basert pa kontekst. Things 3 — tom-state har personlighet uten a vaere masete.

---

### 2. Reduser import-valg til 3, og separar dem tydelig

**Na:** 5 knapper, 4 med identisk stil. "Velg bilder fra galleri" og "Velg bilder fra filer" er teknisk ulike men konseptuelt like for brukeren.

**Hvorfor det ikke funker:** Valgparalysering. Brukeren ma lese og vurdere 5 alternativer. Det to midterste alternativene er egentlig det samme valget i brukerens hode.

**Forslag:** Collapser "Velg bilder fra galleri" og "Velg bilder fra filer" til ett valg "Velg fra galleri eller filer" som enten viser en picker eller gir en undermeny. Legg frem tre primere valg med klar prioritering:

```tsx
// Primær — stor og tydelig:
<TouchableOpacity className="rounded-xl bg-blue-600 py-4">
  <Text className="text-center text-base font-semibold text-white">
    Ta bilde av timeliste
  </Text>
</TouchableOpacity>

// Sekundar — tydelig men ikke like dominerende:
<TouchableOpacity className="mt-3 rounded-xl border-2 border-gray-200 bg-white py-4">
  <Text className="text-center text-base font-medium text-gray-800">
    Velg fra galleri / filer
  </Text>
</TouchableOpacity>

// Tertiær — lenke-stil, ikke knapp:
<TouchableOpacity className="mt-4 py-3">
  <Text className="text-center text-sm text-gray-500">
    Importer CSV eller legg inn manuelt
  </Text>
</TouchableOpacity>
```

**Referanse:** Linear sin onboarding — tre valg, klar prioritering, ingen valgparalyse.

---

### 3. Oversett alt til norsk — konsekvent

**Na:** Settings-skjermen er pa engelsk (`Base rate`, `Save`, `Saved.`). ShiftEditor har `+ Add another shift` og `Saved. You can import another.`. CameraCapture har `Cancel` og `Take photo`.

**Hvorfor det ikke funker:** En sykepleier som taster inn lonnen sin og ser engelske labels mister tilliten. Det signaliserer at appen ikke er ferdig, eller ikke er laget for dem. For en konkurranse-demo er dette ekstra synlig.

**Forslag — konkrete tekstendringer:**

```tsx
// settings.tsx
label="Base rate"            -> label="Grunnlonn (kr/t)"
label="Evening supplement"   -> label="Kveldstillegg (kr/t)"
label="Night supplement"     -> label="Nattillegg (kr/t)"
label="Weekend supplement"   -> label="Helgetillegg (kr/t)"
label="Holiday supplement"   -> label="Helligdagstillegg (kr/t)"
"Save"                       -> "Lagre satser"
"Saved."                     -> "Lagret."

// ShiftEditor.tsx
"+ Add another shift"                -> "+ Legg til skift"
"Saved. You can import another."     -> "Lagret. Du kan importere en til."

// CameraCapture.tsx
"Cancel"     -> "Avbryt"
"Take photo" -> "Ta bilde"

// import.tsx — feil-melding ved kamera-tilgang
"Camera permission required to take a photo." -> "Kameratilgang er nodvendig for a ta bilde."

// import.tsx — OCR-feil
"OCR failed" -> "Kunne ikke lese bildet. Prøv igjen."
```

**Referanse:** Vipps — konsekvent norsk gjennom hele appen, ingen engelske snutter.

---

### 4. Fiks Confirm-flyt: skjul eller kontekstuell "Bekreft vakt"-knapp

**Na:** "Neste vakt"-kortet pa Dashboard viser alltid en "Bekreft vakt"-knapp, ogsa nar vakten er mange timer unna. En bruker som klikker bekrefter vakten for tidlig.

**Hvorfor det ikke funker:** En vakt som starter om 8 timer kan ikke bekreftes — den er ikke gjennomfort. Knappen er misvisende og kan fore til feil data i systemet. Den store gronne knappen pa confirm-skjermen ("Ja, fullfort") bekrefter ogsa uten noen tidssperre.

**Forslag:** Skjul "Bekreft vakt"-knappen pa Dashboard til etter vaktens end_time. Vis istedenfor vakttidspunktet som primær info:

```tsx
// Istedenfor a alltid vise bekreft-knapp:
{isShiftOver(nextShift) ? (
  <TouchableOpacity
    onPress={() => onPressConfirm(nextShift.id)}
    className="mt-3 self-start rounded-lg bg-green-600 px-4 py-2"
  >
    <Text className="text-sm font-medium text-white">Bekreft vakt</Text>
  </TouchableOpacity>
) : (
  <Text className="mt-2 text-sm text-blue-700">
    Starter {countdownToShift(nextShift)}
  </Text>
)}

// Hjelpefunksjon:
function isShiftOver(shift: ShiftRow): boolean {
  const [d, m, y] = shift.date.split(".").map(Number);
  const [h, min] = shift.end_time.split(":").map(Number);
  const end = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
  // Nattevakter: legg til 24t om end < start
  return new Date() >= end;
}
```

**Referanse:** Things 3 sin "Today" — viser kontekstuell handling basert pa hva som er relevant akkurat na.

---

### 5. Gi Maanedsoppsummering et klart visuelt hierarki

**Na:** Forventet lonn er det andre kortet, skjult under et statistikk-kort. Tallene i statistikk-kortet er inline tekst i gra farge uten visuell vekting.

**Hvorfor det ikke funker:** Brukeren apner oppsummeringen for ett formal: "Ble jeg betalt riktig?" Det svaret er begravd. De ma scrolle, lese og parse tekst for a fa det de kom for.

**Forslag:** Flytt forventet lonn opp og gjor det til det dominerende elementet. Bruk storrelse og vekting for a skille "hoved-tall" fra "detalj-tall":

```tsx
// Forste element pa siden — ikke det andre:
<View className="mb-4 rounded-xl bg-blue-600 p-5">
  <Text className="text-sm font-medium text-blue-100">Forventet lonn</Text>
  <Text className="mt-1 text-3xl font-bold text-white">
    {Math.round(expectedPay).toLocaleString("nb-NO")} kr
  </Text>
  <Text className="mt-1 text-xs text-blue-200">
    Basert pa {summary.completedShifts + summary.overtimeShifts} fullforte vakter
  </Text>
</View>

// Deretter statistikk — men komprimert:
<View className="mb-4 flex-row gap-3">
  <StatBox label="Planlagt" value={`${summary.plannedHours.toFixed(0)}t`} />
  <StatBox label="Faktisk" value={`${summary.actualHours.toFixed(0)}t`} />
  <StatBox label="Overtid" value={`${summary.overtimeHours.toFixed(0)}t`} />
</View>
```

Bruken av `text-3xl font-bold` mot hvit bakgrunn (eller blatt kort) siger umiddelbart: dette er hoved-tallet. Alt annet er kontekst.

**Referanse:** Holvi, Spiir — fintech-apper som alltid setter kronebelop som hoved-element, ikke som en av mange tekst-linjer.

---

## Kamera-flyt: tilleggsnotat

**Problem:** `CameraCapture` er en tom sort skjerm uten veiledning. Brukeren vet ikke:
- Hvilken orientering (liggende / staende)
- Hvor langt unna de skal holde kameraet
- Om siden skal fylle hele bildet

**Forslag:** Legg til en lett viewfinder-overlay som en guide. I React Native kan dette gjores med en absolutt-posisjonert `View` med `border-2 border-white/50 rounded-lg` som visuell ramme over kamera-viewen:

```tsx
// I CameraCapture.tsx — over kamera men under knapper:
<View className="absolute inset-x-8 top-1/4 bottom-1/3 rounded-xl border-2 border-white/60" />
<Text className="absolute top-[30%] left-0 right-0 text-center text-sm text-white/80">
  Hold timelisten innenfor rammen
</Text>
```

Dette ene grepet vil forbedre OCR-treffrate og bruker-tillit markant.

---

## Designretning

**Navaerende vibe:** "Midlertidig intern tool" — funksjonelt, men ingen folelse av at noen har tenkt pa brukeren bak skjermen.

**Anbefalt vibe:** "Trygg og direkte" — en app som kjenner arbeidslivet til brukeren og snakker til dem uten omsvop. Varmt, men profesjonelt. Som en palalitelig kollega, ikke et rapportsystem.

**Referanser:**
- Gentler Streak (varm, menneskelig, fitness-kontekst — perfekt analog)
- Vipps (norsk, direkte, ingen unodige steg)
- Halide (funksjonell kamera-app med gjennomtenkt detalj)
- Things 3 (kontekstuell handling, rolig, tillitsvekkende)

**Typografi:** System font (San Francisco / Roboto via Expo) er OK for MVP. Hvis man vil ha mer karakter: `DM Sans` eller `Plus Jakarta Sans` — begge lesbare, litt varmere enn Inter.

**Farger:** Behold blue-600 som primær, men introduser en sekundar farge med varme:
- Primary: `#2563eb` (bla-600) — uendret
- Accent: `#0f766e` (teal-700) — for positive tall / lonn / suksess istedenfor grønn-600
- Background: `#fafaf9` istedenfor `#f9fafb` — mikroskopisk varmere, men merkbart
- Card: `#ffffff` med `shadow-sm` istedenfor border — mykere separasjon

**Spacing:** Eksisterende 16px/8px system er greit. Oke til 20px padding pa dashboard-kort for mer luft.

**Nøkkelprinsipp:** Hoved-tallet (forventet lonn) skal alltid vaere storst. Alt annet er kontekst for det ene svaret brukeren er der for.

---

## Inspirasjon

- **Gentler Streak** — https://www.gentlerstreak.com/ — varm, menneskelig fitness-app. Maler for hvordan man snakker til en bruker som gjor noe vanskelig (helse, arbeid).
- **Vipps** — fintech pa norsk, uten friksjon, ingen unodige engelske ord.
- **Spiir** — skandinavisk personlig okonomi-app. Hoved-tall alltid forst og storst.
- **Things 3** — kontekstuell handling, rolig design, aldri mer informasjon enn nodvendig.
- **Halide** — kamera-app som viser at selv et enkelt kamera-UI kan ha gjennomtenkt veiledning.
