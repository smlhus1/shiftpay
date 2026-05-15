"""Generate a short-lived JWT for App Store Connect API."""
import time
from pathlib import Path
import jwt

KEY_PATH = Path(__file__).resolve().parent.parent / "appstore-api-key.p8"
ISSUER_ID = "8c84abed-3fea-43ba-9ea1-5231362428cb"
KEY_ID = "TKNR3PJVBZ"

now = int(time.time())
print(jwt.encode(
    {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
    KEY_PATH.read_text(),
    algorithm="ES256",
    headers={"kid": KEY_ID, "typ": "JWT"},
))
