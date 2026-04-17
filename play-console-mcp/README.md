# play-console-mcp

MCP server for Google Play Console via the official Android Publisher API v3. Skrevet for å fjerne smerten med manuell console-administrasjon.

## Hva denne dekker

18 tools fordelt på:

- **Reviews** — `list_reviews`, `get_review`, `reply_to_review`
- **Tracks** — `list_tracks`, `get_track`
- **Uploads** — `upload_bundle` (AAB), `upload_apk`
- **Rollouts** — `promote_release`, `set_rollout`, `halt_rollout`, `resume_rollout`
- **Artifacts** — `list_bundles`, `list_apks`
- **Store listings** — `list_listings`, `get_listing`, `update_listing`
- **App info** — `get_app_details`

## Oppsett (éngangsjobb — allerede gjort)

1. GCP-prosjekt: `android-console-mcp`
2. API aktivert: Google Play Android Developer API
3. Service account: `play-console-mcp@android-console-mcp.iam.gserviceaccount.com`
4. JSON-nøkkel: `C:\Users\StianMelhus\.secrets\play-console-mcp.json`
5. Invitert i Play Console med **Admin (alle tillatelser)** — kontonivå
6. Registrert som MCP: `claude mcp list` viser `play-console: ✓ Connected`

## Bruk

I en Claude Code-sesjon, bare be om det:

> "List reviews for com.rack.app"
> "Upload dist/release.aab to internal track for com.rack.app med release notes 'bugfikser'"
> "Promote siste release fra internal til production med 10% rollout"
> "Halt rollout på com.rack.app production"

## Bygg/kjør lokalt

```bash
npm install
npm run build        # compile TS → dist/
npm run dev          # run via tsx without compile
npm run smoke        # auth sanity check against com.rack.app
```

## Viktige begrensninger

- **Reviews API:** returnerer kun siste 7 dager, og kun reviews med tekst (stjerne-only reviews er usynlige for API-et).
- **Reply:** ny reply overskriver gammel.
- **Første release av ny app må gjøres manuelt** i Play Console — API-et kan ikke opprette første produksjonsrelease. ShiftPay v1.1.0 er allerede ute, så du er forbi dette for RACK og ShiftPay.
- **Edit-lifecycle:** kun én aktiv edit per pakke samtidig. Klient-wrapperen `withEdit()` håndterer insert/commit/delete automatisk.
- **AAB-størrelse:** base-modul max 200 MB, totalt 1.5 GB med asset packs.
- **Quotas:** 200k/dag, 3000/min. Ingen praktisk begrensning for personlig bruk.

## Sikkerhet

- JSON-nøkkelen gir **Admin** på Play Console-kontoen. Behandle som en master-nøkkel.
- Ligger i `~\.secrets\` utenfor repo
- Roter nøkkelen hver 90. dag (Cloud Console → Service Accounts → play-console-mcp → Keys)

## Filstruktur

```
play-console-mcp/
  src/
    server.ts          MCP stdio entry point
    play-client.ts     Thin wrapper over androidpublisher v3
  dist/                Compiled output (gitignored)
  smoke-test.mjs       Standalone auth sanity test
  package.json
  tsconfig.json
```
