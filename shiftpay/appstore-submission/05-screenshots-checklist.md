# Screenshots Checklist

App Store krever screenshots i opptil tre størrelser. **Minst 6.7" er obligatorisk** i 2026. De andre er valgfrie men anbefalt.

---

## Påkrevd / anbefalt

| Størrelse | Resolution | Påkrevd? | Eksempel-enhet |
|---|---|---|---|
| **6.9" / 6.7"** | **1290 × 2796** | **JA** | iPhone 14/15/16 Pro Max |
| 6.5" | 1242 × 2688 | Nei (men anbefalt) | iPhone 11 Pro Max / XS Max |
| 5.5" | 1242 × 2208 | Nei | iPhone 8 Plus |
| iPad 13" | 2064 × 2752 | Bare hvis du tilbyr iPad | — |

Antall per størrelse: min 2, max 10. **5–8 er optimalt** for konvertering.

---

## Hva som finnes i repoet i dag

Alle bilder i `Screenshots/` og `Screenshots/nye_screenshots/` er **1080 × 2400** — det er Android-størrelse, ikke iPhone. Kan ikke brukes direkte.

```
Screenshots/nye_screenshots/
  calc_pay.png         1080×2400
  gallery.png          1080×2400
  monthly.png          1080×2400
  overview_dark.png    1080×2400
  photo.png            1080×2400
  prossesing.png       1080×2400
  set_base.png         1080×2400
  set_language.png     1080×2400
```

---

## Hvordan generere iPhone-screenshots

Velg én av disse — i prioritert rekkefølge:

### Alternativ 1 — iOS Simulator (anbefalt hvis du har Xcode)

```bash
# I shiftpay-mappa:
npx expo run:ios -d "iPhone 15 Pro Max"
# Når appen kjører i simulator:
# Cmd+S i Simulator-appen → lagrer screenshot til skrivebordet i 1290×2796
```

For 6.5" og 5.5"-størrelser: bytt simulator-enhet i Xcode → Open Developer Tool → Simulator → Hardware → Device.

### Alternativ 2 — Fysisk iPhone du har

Hvis du har en iPhone 14/15/16 Pro Max → ta screenshot i appen (volume up + power) → de er allerede 1290×2796.

For å treffe de andre to størrelsene må du enten:
- Låne en eldre iPhone
- Bruke en device-farm-tjeneste (BrowserStack, Sauce Labs — koster, men effektivt)
- Hoppe over 6.5" og 5.5" og bare submitte 6.7" (Apple tillater det)

### Alternativ 3 — Generere bilder fra design

Lag screenshots i Figma med iPhone-frames og eksporter i riktig piksel-størrelse. Mer arbeid, mindre autentisk. Apple aksepterer det, men reviewers liker ekte app-bilder.

---

## Innholdsforslag — 7 skjermbilder

For best konvertering, anbefales følgende rekkefølge med korte caption-overlays:

1. **Dashboard / oversikt** — "Se hva du skal få. Vakt for vakt."
2. **Foto-import (kamera-view)** — "Ta bilde av timelisten."
3. **OCR-resultat / redigerbar tabell** — "Sjekk og rett før du regner."
4. **Sats-oppsett** — "Dine satser. Dine tall."
5. **Månedssammendrag** — "Forventet vs. faktisk."
6. **Vakt-bekreftelse** — "Jobbet du den vakten?"
7. **Innstillinger / privacy** — "Ingen konto. Ingen sky."

Caption-overlays er valgfritt — Apple aksepterer rene skjermbilder. Men de fungerer godt for konvertering.

---

## Filnavnskonvensjon — anbefalt struktur

Når du har genererert dem, lagre i:

```
shiftpay/appstore-submission/screenshots-target/
  6.7/
    1-dashboard.png
    2-import.png
    3-ocr-result.png
    4-rates.png
    5-summary.png
    6-confirm.png
    7-privacy.png
  6.5/
    (same filnames)
  5.5/
    (same filnames)
```

Når strukturen er på plass kan jeg laste dem opp til ASC via API automatisk (en file per `appScreenshot`-poster — Apple presigner upload + jeg verifiserer SHA256).

---

## Minimum levering

Hvis du vil submitte FORT med minst mulig screenshot-arbeid:

- **Bare 6.7":** 5 bilder fra iPhone 15/16 Pro Max
- Drop 6.5" og 5.5" — Apple tillater å mangle disse

Det er det jeg ville gjort på første runde. Du kan legge til de andre størrelsene i en senere oppdatering.
