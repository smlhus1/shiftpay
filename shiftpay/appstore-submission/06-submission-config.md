# Submission Config

Konkrete valg som må gjøres for App Store-submission og hvorfor.

---

## Categories

| Slot | Valg | Begrunnelse |
|---|---|---|
| **Primary** | **Finance** | Apple's eksempler under Finance inkluderer payroll-verktøy. Største synlige plass. |
| **Secondary** | **Productivity** | Fanger søk etter "timesheet", "work tracker". Sekundærsynlighet. |

Alternativer vurdert:
- "Business" — for korporativ, ikke for individuell forbruker
- "Utilities" — for generisk, mister konteksten
- "Lifestyle" — feil tone, mister finansiell troverdighet

---

## URLs (en-US localization)

| Felt | Verdi |
|---|---|
| Marketing URL | `https://shiftpay.no` |
| Support URL | `https://shiftpay.no#kontakt` |
| Privacy Policy URL | `https://shiftpay.no/privacy/` |

---

## App Information (app-level, settes én gang)

| Felt | Verdi |
|---|---|
| Bundle ID | `no.fenrirstudio.shiftpay` (allerede satt) |
| Primary Language | English (U.S.) |
| Subtitle | `Verify your shift pay` |
| Privacy Policy URL | `https://shiftpay.no/privacy/` |
| Content Rights | Yes — own all rights to content |

---

## Version (1.1.0)

| Felt | Verdi |
|---|---|
| Version Number | `1.1.0` |
| Copyright | `2026 Stian Melhus` |
| Routing App Coverage | Leave blank |
| Trade Representative Contact Info | Leave blank (ikke krevd for solo dev) |

**Build to attach:** Build 8 (build_id `c1cb5eed-dff2-4ada-bba6-97f052cd4d54`)

---

## Pricing & Availability

| Felt | Verdi |
|---|---|
| Price | Free (Tier 0) |
| Availability | All territories der norsk shift-work er aktuelt |

**Anbefalt regions** for første launch:
- Norge (primær)
- Sverige
- Danmark
- Finland
- Island (testmarked, lite arbeid)

Du kan også velge **Available in all territories** — appen er multi-locale og forhindrer ingenting i å la noen i UK eller Spania installere den. Men markedsføringen din er norsk.

Mitt forslag: **All territories**, så er det åpent. Hvis du senere vil snevre inn, kan du.

---

## Release Type

**After App Review:**

```
☑ Manually release this version
```

Du får tilbake kontroll over når 1.1.0 går live. Etter Apple godkjenner, kommer et "Ready for Sale, pending Developer Release" — du trykker en knapp og den er live i butikken.

Alternativ: **Automatically release this version** — går live så snart Apple godkjenner. Risiko: hvis du har en marketing-plan for launch-dag, er du ikke i kontroll.

Anbefaling: **Manuell** for første release.

---

## Phased Release

```
☑ Release update over 7-day period
```

Ikke aktuelt for 1.1.0 (det er første offentlige release). Aktuell for senere oppdateringer der du vil ramp opp gradvis.

---

## Version Release for Family Sharing

Family Sharing krever at appen koster penger eller har in-app purchase. ShiftPay er gratis uten IAP → ikke aktuelt.

---

## In-App Events

Ikke aktuelt for 1.1.0. Kan brukes senere for å markedsføre store oppdateringer.

---

## App Store Connect API IDs

| Identifier | Verdi | Hvor brukes |
|---|---|---|
| ASC App ID | `6760037897` | API-spørringer, eas.json submit-config |
| Bundle ID | `no.fenrirstudio.shiftpay` | Xcode + Expo |
| App Store Version ID (1.0 placeholder) | `740eed86-ce62-4d18-ad74-3608005aee4a` | Slettes/erstattes når 1.1.0 lages |
| Build ID (build 8) | `c1cb5eed-dff2-4ada-bba6-97f052cd4d54` | Knyttes til 1.1.0 version |
| External Group (Testers_External) | `f1c30866-398a-441b-aaae-1485bab0db0d` | TestFlight, ikke App Store |
| ASC API Key | TKNR3PJVBZ | I `eas.json` + `scripts/asc_jwt.py` |
| ASC API Issuer | `8c84abed-3fea-43ba-9ea1-5231362428cb` | Samme |
