# Research: Gat (Visma GatGo / MinGat) — iCal/ICS-eksport for ShiftPay

> Researched: 2026-04-15 | Sources consulted: 10+ | Confidence: **Høy** på hovedkonklusjonen, **Medium** på edge cases (Exchange-integrasjon detaljer)

## TL;DR

**NEI — Gat tilbyr IKKE en abonnement-bar iCal/webcal-URL** som ShiftPay kan lese direkte over HTTP. Det som finnes er en **statisk .ics-fil** brukeren manuelt eksporterer fra "Min Kalender" i MinGat-portalen. Filen inneholder vakter (kode, start/slutt, beskrivelse, avdeling) men oppdateres **ikke automatisk** — brukeren må re-eksportere ved hver vaktendring og re-importere i kalenderen. Den eneste live-synkroniseringen Gat tilbyr går via **Microsoft Exchange-integrasjon** (server-til-server, krever Exchange-lisens og admin-oppsett — ikke en URL bruker kan dele med en tredjepartsapp).

**Konsekvens for ShiftPay:** OCR-løypa kan IKKE erstattes av en enkel "lim inn iCal-URL"-flyt for Gat-brukere. Et alternativ er en "importer .ics-fil"-flyt (engangs-eller-periodisk manuell upload), men dette gir bare marginalt bedre UX enn OCR og krever fortsatt at brukeren gjør et aktivt valg ved hver endring.

---

## Key Findings

### 1. iCal-funksjonalitet eksisterer — men som statisk eksport

Bekreftet via flere offisielle MinGat-instanser (Hvaler kommune, Kvam, Oslo kommune, Lovisenberg/LDS, Haraldsplass):

- Funksjonen heter **"Eksport til kalender med iCal format"** og ligger under **Min Kalender → Innstillinger → Eksporter-knappen**.
- Resultatet er en **.ics-fil som lastes ned til brukerens enhet** — ingen URL eller webcal-link genereres.
- Dokumentasjonen sier eksplisitt: *"Vaktene som blir eksportert blir ikke automatisk oppdatert."* Brukeren må:
  1. Re-eksportere ny .ics-fil
  2. Slette gammel import i kalenderklienten
  3. Re-importere den nye filen

Kilde-URLer:
- `https://mingat.hvaler.kommune.no/help/ical.html`
- `https://mingat.kvam.no/help/ical.html`
- `https://mingat.oslo.kommune.no/MinGAT/help/ical.html`

(alle har samme hjelpetekst — det er Gat sitt standardhjelpesystem)

### 2. Innhold i .ics-eksporten

Bekreftet av offisiell hjelpetekst:

| Felt | Tilstede |
|------|----------|
| Vaktkode (shift code) | Ja |
| Start-tid | Ja |
| Slutt-tid | Ja |
| Beskrivelse | Ja |
| Avdeling | Ja |
| Oppgaver (tasks) | **Nei** — eksplisitt unntatt |
| Pauser | Ikke nevnt — sannsynligvis ikke separat felt |
| Notater/kommentarer | Ikke nevnt |

**Tidsdekning:** "En uke tilbake i tid og så langt frem som det ligger vaktinformasjon."

### 3. Exchange-integrasjon (live, men ikke bruker-eksponert)

MinGat har en **Exchange/Outlook-integrasjon** som synkroniserer vakter direkte til brukerens Exchange-kalender med **fem oppsett**:
- Kun vakter
- Kun oppgaver
- Vakter + oppgaver
- Utvalgte vakter/oppgaver
- Med fravær og frivakter

Dette er **server-til-server-integrasjon** som krever:
- Exchange-lisens for brukeren
- Administrativ aktivering på Gat-siden
- Det produseres **ingen iCal-URL** brukeren kan dele med en tredjepartsapp som ShiftPay

Når aktivert oppdateres endringer automatisk i Exchange, og fra Exchange kan vakter potensielt nås via EWS/Microsoft Graph — men dette er en helt annen integrasjon enn iCal-URL.

### 4. Autentisering / URL-format

Ingen autentisering relevant fordi ingen URL eksisterer — eksporten skjer i innlogget MinGat-sesjon, og .ics-filen lagres lokalt. Det finnes ingen signert token-URL i offentlig dokumentasjon.

### 5. GatGo (mobilapp) tilbyr ikke kalender-eksport

GatGo-appen viser vakter i appen selv, men brukerveiledning fra 2022 og 2024 (sykehuspartner.no, ntnu.no) viser **ingen .ics-eksport eller URL-deling i mobilappen**. All eksport-funksjonalitet ligger i web-portalen MinGat.

---

## Alternative norske/nordiske systemer — sammenligning

| System | iCal-URL (live abonnement)? | Statisk .ics-eksport? | Notater |
|--------|-----------------------------|-----------------------|---------|
| **Gat (Visma)** | Nei | Ja (manuell, statisk) | Live kun via Exchange-integrasjon |
| **Visma Enterprise Ressursstyring (Notus)** | Ukjent / ikke dokumentert offentlig | Sannsynligvis (Visma-familien deler patterns) | Brukes av flere norske kommuner |
| **Bluegarden / My Visma** | Ikke funnet dokumentert | Ukjent | Mest lønn/HR-fokus |
| **Tamigo** | **Ja** — personlig iCal-URL fra brukerprofil | Ja | Best-in-class for denne use casen |
| **Planday** | **Ja** — sync-link fra profil (iOS/Android) | Ja | Brukt av retail/HoReCa, ikke helsesektor |
| **Quinyx** | Ikke funnet dokumentert i søk | Ukjent | Sjekk direkte |

**Implikasjon:** Hvis ShiftPay sikter på helsesektor (Gat dominerer der), er iCal-URL ikke en farbar vei. For retail/varehandel (Tamigo/Planday) er det en stor mulighet.

---

## Gotchas & Considerations

- **"iCal-eksport finnes" ≠ "iCal-URL finnes".** Mange Gat-brukere vil si "ja, jeg kan eksportere kalenderen min" — men de mener nedlasting av .ics-fil, ikke en abonnement-URL. Dette er en kommunikasjonsfelle i kundeintervjuer.
- **Statisk .ics + ShiftPay:** Hvis dere bygger en "last opp .ics"-flyt, har brukeren samme problem som med OCR — de må re-laste hver gang turnusen endres. Vakter bytter ofte i helsesektor (sykefravær, vaktbytter), så dette gir ikke god UX.
- **Exchange-omveien:** Hvis brukeren har Gat→Exchange-synk aktivert og bruker Outlook/Microsoft 365, kan ShiftPay teoretisk integrere via Microsoft Graph. Dette krever OAuth-flow mot Microsoft, og fungerer kun for de med riktig oppsett. Stor kompleksitet for liten dekning.
- **Personvern:** Bruker eksporterer sine egne data — GDPR-rettslig uproblematisk så lenge ShiftPay (a) er tydelig på hva som lagres, (b) ikke sender vaktinfo til tredjepart uten samtykke, (c) tilbyr sletting. Vaktdata kan implisitt avsløre arbeidsgiver/avdeling/spesialfelt — særlig kategori i visse tilfeller (helse), så vær forsiktig med analytics.
- **Domene-mønster:** MinGat-instanser ligger på `mingat.<organisasjon>.no` (kommuner) eller `mingat.<sykehus>.no/MinGatEXT` — hver kunde har egen instans. Selv om en URL eksisterte, ville den vært per-tenant.

---

## Teknisk implementasjon (hvis dere likevel går for .ics-fil-flyt)

For en "last opp .ics-fil"-løype i React Native / Expo:

- **Filvalg:** `expo-document-picker` for å la bruker velge .ics-fil fra Files/Drive
- **Parser:** `cal-parser` (npm) er den anbefalte for React Native fordi den ikke bruker Node-native moduler. `node-ical` er rikere men har Node-avhengigheter som ikke fungerer i RN. Sjekk lisens (begge er typisk MIT, men verifiser før commit).
- **Mapping:** Hver `VEVENT` → ShiftPay-vakt-objekt med `start (DTSTART)`, `end (DTEND)`, `title (SUMMARY)`, `description (DESCRIPTION)`, `location (LOCATION)`. Avdeling kommer trolig i SUMMARY eller DESCRIPTION fra Gat — verifiser med en faktisk testfil.
- **Re-import-flyt:** Detekter overlap/duplikater på (start, end, title) og oppdater eksisterende vakter i stedet for å lage nye.
- **Cache-invalidering:** Hvis brukeren laster ny fil, marker tidligere "stale" vakter (de som ikke er i ny fil i samme tidsperiode) som potensielt slettet — be om bekreftelse før sletting.

---

## Recommendations

1. **Ikke bygg en "lim inn Gat iCal-URL"-flyt** — den eksisterer ikke. Hvis dere annonserer det, vil Gat-brukere bli forvirret/frustrert.
2. **Vurder en "importer .ics-fil"-flyt som komplement til OCR**, ikke erstatning. For brukere med stabile turnuser kan dette være en bedre engangs-onboarding, men OCR forblir nødvendig for løpende endringer.
3. **For maksimal langsiktig verdi: bygg adapter-arkitektur** der OCR er én input-kilde, .ics-import en annen, Exchange/Graph en tredje, og evt. iCal-URL (for Tamigo/Planday-kunder) en fjerde. Da kan ShiftPay dekke flere arbeidsgivere uten å være låst til OCR.
4. **Verifiser direkte med Gat (gatressurs.no / Visma)** om de har en uoffisiell ical-feed-funksjon eller en API. Noen Visma-produkter har offisielle API-er som ikke er synlige i sluttbruker-dokumentasjonen. Dette er den eneste måten å være 100% sikker på.
5. **Snakk med 3-5 sykepleiere/helsearbeidere** før noe bygges — bekreft at de faktisk *bruker* iCal-eksport i dag (sannsynlig svar: nei, fordi det ikke oppdaterer seg). Det vil avgjøre om import-flyten i det hele tatt er verdt arbeidet.

## Suggested follow-ups

- Få tak i en faktisk Gat .ics-fil for å verifisere nøyaktig feltformat (særlig hvordan avdeling og pauser kodes)
- Direkte-spørring til Visma support: "Finnes det en personlig iCal-feed-URL for MinGat-brukere, eller planer om dette?"
- Sjekk om Helse Bergen / OUS har laget egne wrappers/integrasjoner over Gat (kommunale IT-team gjør ofte dette)

## Sources

1. [Eksport til kalender med iCal format (Hvaler)](https://mingat.hvaler.kommune.no/help/ical.html) — primær bekreftelse på statisk .ics-eksport, ingen URL
2. [Min Kalender (Kvam)](https://mingat.kvam.no/help/employee_mycalendar.html) — beskriver Exchange-integrasjon med 5 valg
3. [iCal-eksport (Kvam)](https://mingat.kvam.no/help/ical.html) — bekrefter "ikke automatisk oppdatert"
4. [Min Kalender (Lovisenberg/LDS)](https://mingat.lds.no/MinGatEXT/help/employee_mycalendar.html) — bekrefter samme funksjonalitet på sykehus-instans
5. [Brukerveiledning GatGo 2022.2 (Sykehuspartner)](https://www.sykehuspartner.no/49bf00/siteassets/documents/logg-inn/brukerveiledning-gatgo-2022.2.pdf) — ingen iCal-URL nevnt for mobilapp
6. [Brukerveiledning GatGo 2024 (NTNU)](https://i.ntnu.no/documents/portlet_file_entry/1305837853/Brukerveiledning+GatGo+-+2024.pdf/a824d153-f48c-4757-b251-6caa5729e12f) — nyere versjon, samme bilde
7. [Gat Ressursstyring produktside](https://gatressurs.no/) — ingen kalenderintegrasjon nevnt offentlig
8. [Brukermanual MinGat (Haraldsplass)](https://www.haraldsplass.no/Documents/GAT/MinGat-Brukermanual.pdf) — supplement, mest screenshots
9. [cal-parser (npm)](https://www.npmjs.com/package/cal-parser) — anbefalt RN-kompatibel ICS-parser
10. [Planday calendar sync](https://help.planday.com/en/articles/30327-how-to-sync-your-planday-schedule-with-an-external-calendar) — sammenligningssystem som *har* URL-feed
11. [Tamigo iCal service](https://www.tamigo.com/workforce-management-solution) — sammenligningssystem, personlig iCal-link
