# App Privacy — Nutrition Label

Sted: App Store Connect → App Privacy → Get Started / Edit.

Apple stiller en kjede med spørsmål. Under er **eksakte svar for ShiftPay** basert på hvordan appen faktisk fungerer i v1.1.0.

⚠️ **Viktig:** Disse må matche `privacy-policy.md` ord for ord på prinsippnivå.
Hvis du senere legger til analytics eller sky-sync, må dette oppdateres FØR oppdateringen submittes.

---

## Hovedspørsmål 1: "Do you or your third-party partners collect any data from this app?"

**Svar: YES**

Begrunnelse: Selv om vi ikke lagrer data, sender vi opplastet bilde til Anthropic (vår OCR-leverandør) for prosessering. Apple definerer "collection" bredt — alt som sendes ut av enheten må deklareres, selv om det er transient og ikke linkes til bruker.

---

## Datatyper å deklarere

Bare ÉN kategori er aktuell:

### "User Content" → "Photos or Videos"

| Spørsmål | Svar |
|---|---|
| Linked to the user? | **NO** (ingen konto, ingen identifiers sendes) |
| Used for tracking? | **NO** |
| Purpose | **App Functionality** (eneste valg som passer — OCR er kjernen i import-flow) |

**Detaljer å skrive inn hvis Apple spør:**
- Bildet av timelisten lastes opp til en stateless Edge Function på Supabase
- Bildet videresendes til Anthropic Claude Haiku Vision for tekstgjenkjenning
- Hverken Supabase-funksjonen eller Anthropic lagrer bildet etter prosessering
- Ingen brukeridentifikator (UDID, IDFA, epost, IP-loggback) følger med
- Hvis brukeren ikke bruker foto-import, sendes ingenting noensinne ut av enheten

---

## Alle ANDRE datakategorier — eksplisitt NEI

For å være tydelig på dette, her er Apple's full liste og hva ShiftPay svarer:

| Kategori | Collected? |
|---|---|
| Contact Info (name, email, phone, address) | **NO** |
| Health & Fitness | **NO** |
| Financial Info (payment info, credit, salary) | **NO** ⚠ |
| Location (precise, coarse) | **NO** |
| Sensitive Info | **NO** |
| Contacts | **NO** |
| User Content — Emails or Text Messages | **NO** |
| User Content — Photos or Videos | **YES** (se over) |
| User Content — Audio Data | **NO** |
| User Content — Gameplay Content | **NO** |
| User Content — Customer Support | **NO** |
| User Content — Other | **NO** |
| Browsing History | **NO** |
| Search History | **NO** |
| Identifiers — User ID | **NO** |
| Identifiers — Device ID | **NO** |
| Purchases | **NO** |
| Usage Data — Product Interaction | **NO** |
| Usage Data — Advertising Data | **NO** |
| Usage Data — Other | **NO** |
| Diagnostics — Crash Data | **NO** |
| Diagnostics — Performance Data | **NO** |
| Diagnostics — Other Diagnostic Data | **NO** |
| Other Data | **NO** |

⚠ **Om Financial Info:** Brukerens lønnssatser (`base_rate`, supplements) lagres lokalt og forlater aldri enheten. Det er ikke "collection" i Apples forstand fordi det aldri sendes til oss. Svar derfor **NO**.

---

## Privacy Choices

Apple spør om appen lar brukeren slette innsamlet data eller velge bort innsamling.

- **Data Deletion** — Appen samler ikke data som lagres, så det er ikke noe å slette på vår side. Lokal data slettes ved app-uninstall. Svar slik hvis Apple spør for "User Content → Photos".
- **Opt-out** — Bruker kan velge CSV / manuell import i stedet for foto. Ikke obligatorisk å deklarere, men greit å nevne i description.

---

## Når dette må oppdateres

Hvis du senere legger til ett av disse, MÅ du oppdatere nutrition label før du submitter ny versjon:

- Analytics (Firebase, Mixpanel, etc.) → Diagnostics + Identifiers
- Crash reporting (Sentry, Crashlytics) → Diagnostics
- Push notifications mot egen server → Identifiers (device token)
- Sky-sync av shifts → Mange kategorier
- Inn-app kjøp → Purchases + Identifiers

Per i dag har ShiftPay ingen av disse.
