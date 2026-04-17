# Play Console MCP — anbefaling

Etter å ha sniffet Play Console i live session er konklusjonen tydelig: **bygg på Googles offisielle `androidpublisher` v3 API, ikke det interne.**

## Hvorfor ikke det interne APIet

Det interne APIet er kraftig, men:

1. **Protobuf-bodies uten schema.** Hver write-operasjon (opplasting, svare på reviews, release creation) bruker `application/json+protobuf` med positional-array format. For å sende disse må vi reverse-engineere hver feltplassering ved å observere ekte requests — **tidkrevende og skjørt**.

2. **SAPISID-cookie er mareritt å administrere.** Cookien roterer, krever aktiv Google-innlogging, og hvis Google endrer auth-flyten brekker alt. Du vil ende opp med å "logge inn på nytt" ofte.

3. **ToS-risiko.** For personlig bruk er risikoen lav, men Google kan stenge dev-kontoen din hvis de mener du misbruker internal tooling. Ikke verdt det.

4. **Google kan endre URL-mønstre når som helst.** De har ingen forpliktelse til stabilitet.

## Hva det offisielle APIet dekker (og ikke)

| Funksjon | Offisielt API? | Kommentar |
|---|---|---|
| **List reviews** | ✅ `reviews.list` | Full støtte, pagination, filters |
| **Reply to review** | ✅ `reviews.reply` | Inntil en uke gammel |
| **Upload AAB/APK** | ✅ `edits.bundles.upload` | Resumable upload, batteri-inkludert |
| **Create release** | ✅ `edits.tracks.update` | Rollouts, release notes per språk |
| **Promote release** | ✅ `edits.tracks.update` | Kopier release mellom tracks |
| **Rollout-håndtering** | ✅ | Halted, in-progress, fullført — alt |
| **Tester-lister** | ✅ `edits.tracks.update` | Email lists per track |
| **Rating summary** | ⚠️ Begrenset | Kun via reporting (Cloud Pub/Sub eller CSV-dump) |
| **Crash-detaljer** | ❌ | Kun i UI / BigQuery-eksport |
| **Pre-launch report** | ❌ | Kun i UI |
| **Store listing experiments** | ⚠️ Begrenset | Grunnleggende støtte via edits API |
| **Reviews analysis** | ❌ | AI-topics er kun i UI |

For ditt behov (**brukerkontroll, tilbakemeldinger, lansering av nye funksjoner**) dekker det offisielle APIet **alt**.

## Konkret forslag

### Steg 1: Sett opp service account (éngangsjobb, 10 min)

1. Google Cloud Console → nytt prosjekt eller bruk eksisterende
2. Aktiver "Google Play Android Developer API"
3. IAM → Service Accounts → Create: `play-console-mcp`
4. Keys → Add key → JSON → last ned (lagre som `play-sa.json` utenfor repo)
5. Play Console → Users and permissions → Invite → service account eposten
6. Gi tilgang til RACK + ShiftPay med "Release manager" og "View app information" permissions

### Steg 2: Utvid eksisterende `play-store-mcp` med reviews + testers

Den nåværende `play-store-mcp` (antoniolg) har bare `deploy_app`, `promote_release`, `get_releases`. Forke og legg til:

```
Tools å legge til:
- list_reviews(packageName, maxResults, startIndex)
- reply_to_review(packageName, reviewId, reply)
- get_rating_summary(packageName)  // derived from reviews aggregation
- list_tracks(packageName)
- get_track(packageName, track)
- add_tester_emails(packageName, track, emails[])
- remove_tester_emails(packageName, track, emails[])
- set_rollout_percentage(packageName, track, percentage)
- halt_rollout(packageName, track)
- resume_rollout(packageName, track)
- upload_images(packageName, listingLanguage, type, paths[])  // screenshots
- update_listing(packageName, language, title, shortDescription, fullDescription)
```

Alle disse er enkle REST-kall til `androidpublisher` v3 med OAuth fra service account JSON.

### Steg 3: Skip Kotlin, gå Node.js

Kotlin-versjonen krever Java runtime. For et personlig verktøy på din Windows-maskin er Node.js enklere — MCP SDK fins for TypeScript, og `googleapis`-npm-pakken har typet støtte for hele androidpublisher v3.

**Ca. 300 linjer TS** for en fullverdig MCP med ~15 tools. Kan bygges på en ettermiddag.

### Steg 4 (valgfri senere): Supplér med internal API

Når du virkelig savner noe som kun finnes internt (f.eks. crash-rate detaljer, reviews analysis topics), utvid MCP-en med en tynn internal-API-klient. Men gjør det kun for read-only endepunkter — da slipper du protobuf-body-skrivingen.

## Beslutningspunkt

Vil du at jeg skal:

**A.** Bygge en Node.js MCP på `androidpublisher` v3 med alle de ~15 verktøyene (mest verdi, mest arbeid — en ettermiddagsjobb)

**B.** Fortsette å reverse-engineere det interne APIet (mindre stabilt, men kan gi tilgang til ting offisielle APIet mangler som crash-detaljer og reviews-analyse). Jeg må i så fall ha en session hvor vi faktisk laster opp en AAB og svarer på en review for å fange de siste endepunktene.

**C.** En minimal versjon som bare gjør det mest smertefulle (upload + reply til reviews), bygd på offisielt API.

Mitt råd: **C først** (kommer raskest til nytte), og så utvide til A-omfang etter som du finner ut hva du virkelig savner.
