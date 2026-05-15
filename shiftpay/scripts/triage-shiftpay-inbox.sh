#!/bin/bash
# Daily ShiftPay-inbox triage. Invoked by ~/Library/LaunchAgents/com.smlhus.shiftpay-inbox.plist
# at 20:00 local time. Runs Claude Code non-interactively against the project,
# reads queued Discord messages, files them as structured todos, and posts a
# Norwegian summary back to both channels.

set -u
set -o pipefail

PROJECT_DIR="/Users/stianmelhus/projects/personal/shiftpay"
LOG_FILE="$PROJECT_DIR/shiftpay/scripts/launchd/triage.log"
CLAUDE_BIN="/Users/stianmelhus/.nvm/versions/node/v20.19.4/bin/claude"
NODE_DIR="/Users/stianmelhus/.nvm/versions/node/v20.19.4/bin"

export PATH="$NODE_DIR:/usr/local/bin:/usr/bin:/bin"
export HOME="/Users/stianmelhus"

cd "$PROJECT_DIR" || exit 1

{
  echo ""
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') triage run ==="
} >> "$LOG_FILE"

PROMPT='Det er kl 20:00 og din daglige Shiftpay-inbox-triage skal kjøres. Følg disse stegene i rekkefølge:

1. Kall mcp__mcp-discord__check_watched med channel_id=1503433242890469418 for å hente nye meldinger fra Shiftpay #general siden forrige kjøring.

2. Hvis køen er TOM:
   - Send en kort norsk melding via mcp__mcp-discord__send_message til channel_id=1503433242890469418: "Daglig triage 20:00 — ingen ny aktivitet siden sist. 👋"
   - Send en kopi via mcp__plugin_discord_discord__reply til chat_id=1488615122548162631 med samme tekst.
   - Stopp.

3. Hvis det er nye meldinger: For hver melding, avgjør kategori:
   - bugs (noe virker ikke som forventet)
   - features (ny funksjonalitet)
   - ui-ux (visuelt eller flytforbedring)
   - marketing (nettside, store-listing, tekster)
   - infra (OCR, Supabase, EAS, CI)
   - outreach (hvem skal teste, kommunikasjon med folk)

4. For hver nye idé/sak: sjekk eksisterende filer under shiftpay/todos/inbox/<kategori>/ for duplikat (Glob/Grep på slug eller key-fraser). Hvis duplikat: oppdater eksisterende fil med ny info. Hvis ny: lag shiftpay/todos/inbox/<kategori>/<kort-slug>.md med struktur:

```
# <Tittel>

## Kilde
Discord #general, <forfatter>, <ts>

## Beskrivelse
<klargjort innhold>

## Type
<bugs|features|ui-ux|marketing|infra|outreach>

## Status
inbox

## Notater
<eventuelle påfølgende meldinger eller egen analyse>
```

5. Oppdater shiftpay/todos/INBOX.md sin "Levende index"-seksjon med pekere til nye/oppdaterte filer. Hold den kortfattet — én linje per fil.

6. Post en kort norsk oppsummering på maks 6 punktlinjer via mcp__mcp-discord__send_message til channel_id=1503433242890469418. Inkluder: antall behandlede meldinger, antall nye todos opprettet, antall oppdaterte (duplikater), og 1-2 høydepunkter. Eksempel:

"📋 Daglig triage 20:00
• 4 nye meldinger behandlet
• 3 nye todos: features/kjoregodtgjorelse.md, ui-ux/mindre-tekst-nettside.md, outreach/test-bjorn-einar.md
• 1 oppdatert: outreach/testpersoner.md (lagt til Linda Larsen)
• Høydepunkt: Ronja foreslår bom/km/skattehjelp som egen feature-pakke
Se shiftpay/todos/INBOX.md"

7. Send samme oppsummering via mcp__plugin_discord_discord__reply til chat_id=1488615122548162631.

8. Avslutt uten å gjøre noe annet. Ikke commit. Ikke push.

VIKTIG: Bruk kun de tools du trenger. Aldri commit. Ikke endre kode utenfor shiftpay/todos/. Hvis noe går galt, send en kort feilmelding til chat_id=1488615122548162631 og avslutt.'

"$CLAUDE_BIN" \
  --print \
  --model sonnet \
  --permission-mode bypassPermissions \
  --add-dir "$PROJECT_DIR/shiftpay/todos" \
  --append-system-prompt "Du er den daglige inbox-triagen. Vær konsis, ikke utforsk. Følg promptet eksakt." \
  "$PROMPT" >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

{
  echo "exit_code=$EXIT_CODE"
  echo "=== end ==="
} >> "$LOG_FILE"

exit $EXIT_CODE
