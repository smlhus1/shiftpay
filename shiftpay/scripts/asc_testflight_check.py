"""Query App Store Connect API for TestFlight beta groups and public links."""
import json
import time
from pathlib import Path

import jwt
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
KEY_PATH = ROOT / "appstore-api-key.p8"
ISSUER_ID = "8c84abed-3fea-43ba-9ea1-5231362428cb"
KEY_ID = "TKNR3PJVBZ"
APP_ID = "6760037897"

private_key = KEY_PATH.read_text()
now = int(time.time())
token = jwt.encode(
    {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
    private_key,
    algorithm="ES256",
    headers={"kid": KEY_ID, "typ": "JWT"},
)

def call(path: str) -> dict:
    req = urllib.request.Request(
        f"https://api.appstoreconnect.apple.com{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

groups = call(f"/v1/apps/{APP_ID}/betaGroups?limit=200")
print("=== Beta Groups ===")
for g in groups.get("data", []):
    attrs = g.get("attributes", {})
    print(f"- id={g['id']} name={attrs.get('name')!r} "
          f"internal={attrs.get('isInternalGroup')} "
          f"publicLinkEnabled={attrs.get('publicLinkEnabled')} "
          f"publicLink={attrs.get('publicLink')!r} "
          f"limit={attrs.get('publicLinkLimit')}")

builds = call(f"/v1/apps/{APP_ID}/builds?limit=5&sort=-uploadedDate"
              f"&fields[builds]=version,uploadedDate,expired,processingState")
print("\n=== Latest Builds ===")
for b in builds.get("data", []):
    a = b.get("attributes", {})
    print(f"- v{a.get('version')} state={a.get('processingState')} "
          f"expired={a.get('expired')} uploaded={a.get('uploadedDate')}")
