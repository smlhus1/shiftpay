# ShiftPay — App Store Submission Package

**Status pr. 2026-05-13:** TestFlight ekstern beta er live (build 8, v1.1.0).
App Store-submission må fortsatt fylles ut fra grunnen av.

Denne mappa inneholder ALT du trenger for å sende inn appen til Apple-review,
delt opp i biter du kan kopiere/lime inn eller laste opp uten å lete videre.

## Filoversikt

| Fil | Hva det er | Hvor det skal inn |
|---|---|---|
| `01-metadata-en-US.md` | All tekst (engelsk primær-locale) | App Store Connect → My Apps → ShiftPay → 1.1.0 Prepare → App Information / Pricing / Localization |
| `02-app-privacy.md` | Eksakte svar på nutrition label-spørsmålene | App Store Connect → App Privacy |
| `03-age-rating.md` | Eksakte svar på age rating questionnaire | App Store Connect → App Information → Age Rating |
| `04-app-review-info.md` | Notater til Apple-reviewer + demo-greier | App Store Connect → App Review Information |
| `05-screenshots-checklist.md` | Hva som finnes, hva som mangler, eksakte størrelser | Forberedelse før upload til ASC |
| `06-submission-config.md` | Kategorier, URL-er, build-tilkobling, version | App Store Connect → App Information |
| `07-what-claude-can-do.md` | Hva jeg kan kjøre automatisk via ASC API |

## Anbefalt rekkefølge

1. **Les `07-what-claude-can-do.md`** — bestem hva du vil at jeg skal kjøre via API
2. **Les `06-submission-config.md`** — bekreft eller juster valg (kategori, URL-er)
3. **Skaff iPhone-screenshots** — se `05-screenshots-checklist.md`. Krever iOS-simulator eller iPhone du kan kjøre v1.1.0 på.
4. **Logg inn på ASC** → svar age rating + privacy nutrition label manuelt (kan ikke API-es helt).
   Bruk `02-app-privacy.md` og `03-age-rating.md` som svarmal.
5. **Last opp screenshots** når du har dem.
6. **Submit for Review.**

## Hva som er gjort allerede

- ✅ App ID i ASC (6760037897)
- ✅ Bundle ID: `no.fenrirstudio.shiftpay`
- ✅ iOS Distribution Certificate (utløper 2027-03-02)
- ✅ Provisioning Profile (utløper 2027-03-02)
- ✅ Build 8 / v1.1.0 i TestFlight, Beta-godkjent
- ✅ Privacy policy hostet: https://shiftpay.no/privacy/
- ✅ Marketing site: https://shiftpay.no
- ✅ Encryption Export Compliance: `usesNonExemptEncryption: false`

## Hva som mangler

- ❌ App Store Version 1.1.0 i ASC (det ligger en tom 1.0-placeholder)
- ❌ App-navn (placeholder "ShiftPay (42c9ea)" må byttes)
- ❌ Subtitle
- ❌ Description i ASC
- ❌ Keywords i ASC
- ❌ Promotional text
- ❌ "What's New" tekst
- ❌ Support URL i ASC
- ❌ Marketing URL i ASC
- ❌ Privacy Policy URL i ASC
- ❌ Primary kategori: Finance
- ❌ Secondary kategori: Productivity
- ❌ Age Rating questionnaire
- ❌ App Privacy nutrition label
- ❌ iPhone-screenshots (3 størrelser × 5–8 bilder hver)
- ❌ Build 8 koblet til App Store Version 1.1.0
