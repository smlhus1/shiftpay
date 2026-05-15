#!/bin/bash
# Install the ShiftPay-inbox launchd agent. Copies the plist to
# ~/Library/LaunchAgents/, loads it, and verifies it is scheduled.

set -euo pipefail

PLIST_SRC="/Users/stianmelhus/projects/personal/shiftpay/shiftpay/scripts/launchd/com.smlhus.shiftpay-inbox.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.smlhus.shiftpay-inbox.plist"
LABEL="com.smlhus.shiftpay-inbox"

if [[ ! -f "$PLIST_SRC" ]]; then
  echo "Source plist not found: $PLIST_SRC" >&2
  exit 1
fi

cp "$PLIST_SRC" "$PLIST_DST"
echo "Copied plist to $PLIST_DST"

# Unload first in case it is already loaded (idempotent re-install).
launchctl unload "$PLIST_DST" 2>/dev/null || true

launchctl load "$PLIST_DST"
echo "Loaded $LABEL"

echo ""
echo "Verifying ..."
launchctl list | grep "$LABEL" || {
  echo "WARNING: $LABEL not found in launchctl list — check Console.app for errors." >&2
  exit 1
}

echo ""
echo "Done. The agent runs daily at 20:00 local time."
echo "Logs:"
echo "  /Users/stianmelhus/projects/personal/shiftpay/shiftpay/scripts/launchd/triage.log     (script)"
echo "  /Users/stianmelhus/projects/personal/shiftpay/shiftpay/scripts/launchd/launchd-stdout.log"
echo "  /Users/stianmelhus/projects/personal/shiftpay/shiftpay/scripts/launchd/launchd-stderr.log"
echo ""
echo "To trigger a manual run:"
echo "  launchctl start $LABEL"
echo ""
echo "To uninstall:"
echo "  launchctl unload $PLIST_DST && rm $PLIST_DST"
