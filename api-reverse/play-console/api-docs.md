# Play Console Internal API — Reverse Engineering Notes

**Captured:** 2026-04-13 via Chrome MCP (live session against play.google.com/console)
**Target apps:** RACK (`com.rack.app`, appId `4972280428520410998`)
**Developer ID:** `7413483010949790813`

> ⚠️ **Undocumented internal API.** Google can change this at any time. Using it likely violates Play Console ToS for distributed software, but is fine for personal tooling.

---

## Architecture

### Three API domains

| Domain | Purpose |
|---|---|
| `playconsoleplatform-pa.clients6.google.com` | Platform: user settings, feature telemetry |
| `playconsoleapps-pa.clients6.google.com` | App management: tracks, releases, testers, email lists |
| `playconsoleratings-pa.clients6.google.com` | Ratings and reviews |

Base path: `/v1/developers/{developerId}/...`

### Wire format

- **Content-Type:** `application/json+protobuf` (Google's array-based protobuf JSON — nested arrays where position = field number, not `{key: value}` objects)
- **Example request body shape:** `[["4972280428520410998"], 1, null, [2]]`
- **Responses:** Same array format, sometimes wrapped in batch envelopes

### Auth (the hard part)

All requests go through the browser's cookie auth:

| Header | Value | Notes |
|---|---|---|
| `Authorization` | `SAPISIDHASH {timestamp}_{hash}` | `hash = SHA1(timestamp + " " + SAPISID_cookie + " " + origin)` where origin = `https://play.google.com` |
| `X-Goog-AuthUser` | `0` | Account slot in multi-account auth (0 = primary) |
| `X-Goog-Api-Key` | `AIzaSyBAha_rcoO_aGsmiR5fWbNfdOjqT0gXwbk` | Public Play Console API key — hardcoded in UI |
| `X-Play-Console-Session-Id` | 8-hex-char (e.g. `43EB35CD`) | Generated once per page load, reused for all requests |
| `Cookie` | `SAPISID=...; SID=...; HSID=...; SSID=...; APISID=...; __Secure-1PSID=...; __Secure-3PSID=...` | Standard Google auth cookies |

**Header transport quirk:** The actual HTTP request often carries headers URL-encoded in a `$httpHeaders` query parameter (CRLF-separated `Key:Value` pairs), not as real HTTP headers. Example:
```
?$httpHeaders=Content-Type%3Aapplication%2Fjson%2Bprotobuf%0D%0AX-Goog-AuthUser%3A0%0D%0A...
```

**Method spoofing:** POST requests can use `&$httpMethod=PATCH` or `&$httpMethod=DELETE` in the query string to tunnel other HTTP verbs. Used for `usersettings` updates.

---

## Endpoints observed

### Releases & tracks (`playconsoleapps-pa`)

| Endpoint | Method | Notes |
|---|---|---|
| `/v1/developers/{devId}/apps/{appId}/tracks/{trackId}/releases:listSummaries?view=RELEASE_SUMMARY_VIEW_FULL` | GET | List all releases on a track with full metadata. `trackId` is a numeric ID (not `internal`/`production`) |
| `/v1/developers/{devId}/apps/{appId}/customersupportcontact` (also on playconsoleapps-pa) | GET | Customer support contact info |

**Observed `trackId` for RACK internal testing:** `4701452456607240251`

### Testers / email lists

| Endpoint | Method | Notes |
|---|---|---|
| `/v1/developers/{devId}/emaillists` | GET | List all email groups used across tracks — for managing internal/closed testers |

### Ratings & reviews (`playconsoleratings-pa`)

| Endpoint | Method | Notes |
|---|---|---|
| `/v1/developers/{devId}/apps/{appId}/ratingSummary` | GET | Rating aggregates (mean rating, ratings count, reviews count) |

Reviews list endpoint **not observed** because RACK currently has 0 reviews. Expected pattern based on the `ratingSummary` endpoint:
- `GET /v1/developers/{devId}/apps/{appId}/reviews:list` or `:search` (with pagination + filters)
- `POST /v1/developers/{devId}/apps/{appId}/reviews/{reviewId}:reply`

### Platform (`playconsoleplatform-pa`)

| Endpoint | Method | Notes |
|---|---|---|
| `/v1/developers/{devId}/usersettings` | PATCH (via POST + `$httpMethod=PATCH`) | User preferences. `updateMask.paths=page_header_statuses` in one observed call |
| `/v1/developers/featureEvents` | POST | Telemetry — can be ignored/suppressed |

---

## Endpoints to verify manually

These are required for a useful MCP but weren't triggered during sniffing (no data in RACK yet). Need additional sessions to capture:

1. **Reviews list + reply** — navigate to an app *with* reviews, capture:
   - `reviews:list` or `reviews:search` (pagination params)
   - `reviews:reply` (POST body shape)

2. **Upload bundle** — the actual upload likely goes to a separate `upload.googleapis.com` domain with resumable upload protocol:
   - Initiate: `POST /upload/...` with `X-Goog-Upload-Command: start`
   - Chunked upload: `PUT` with `X-Goog-Upload-Command: upload, finalize`
   - Finalize: returns a bundle/AAB handle to attach to a release

3. **Create release** — probably:
   - `POST /v1/developers/{devId}/apps/{appId}/tracks/{trackId}/releases` with release notes + AAB handle
   - Or `:createDraft` + `:publish` flow

4. **Promote release** — pattern unclear. Possibly:
   - `POST /v1/developers/{devId}/apps/{appId}/tracks/{toTrackId}/releases:promoteFrom` with sourceTrack ref

5. **Manage testers** — pattern unclear. Possibly:
   - `POST /v1/developers/{devId}/emaillists` (create)
   - `PATCH /v1/developers/{devId}/emaillists/{id}` (edit)
   - Linking email list to track: `PATCH /v1/developers/{devId}/apps/{appId}/tracks/{trackId}` with tester config

---

## Building an MCP — feasibility

### What we know works
- Auth mechanism is standard Google SAPISID — well-documented from other reverse-engineering efforts
- URL patterns are predictable
- `GET` endpoints for read operations are easy (no protobuf body required)

### Hard parts
1. **Protobuf request bodies.** `json+protobuf` is the positional-array format where field numbers matter. For each write endpoint (upload, reply, promote) we'd need to:
   - Capture a real request body from the browser
   - Reverse-engineer which array positions map to which fields
   - Build request bodies matching the exact shape
   
   This is doable for 5-10 endpoints but tedious.

2. **Cookie management.** SAPISID cookie rotates on Google session refresh (typically weeks, not days). MCP needs:
   - **Option A:** User pastes SAPISID cookie once, refreshes when it breaks (simplest)
   - **Option B:** Headless Chrome launches with user's profile (`--user-data-dir=C:\Users\...\Chrome Profile`) — fragile, locks profile
   - **Option C:** Capture cookies live from running Chrome via DevTools Protocol — needs Chrome started with `--remote-debugging-port`
   
   **Recommendation:** A for v1.

3. **AAB upload.** Resumable upload protocol isn't observed yet. Will need a separate sniffing session during an actual upload.

### Recommended MCP scope (v1)

Start minimal, expand based on actual pain points:

| Tool | Complexity | Value |
|---|---|---|
| `list_apps` | ⭐ | Low — only 2 apps |
| `get_release_summaries` | ⭐ | Medium — see what's on each track |
| `list_reviews` | ⭐⭐ | **High** — core user need |
| `reply_to_review` | ⭐⭐⭐ (needs protobuf body) | **High** — core user need |
| `list_email_lists` | ⭐ | Medium |
| `add_tester_to_list` | ⭐⭐⭐ | **High** |
| `upload_aab` | ⭐⭐⭐⭐⭐ | **Highest** but hardest — resumable upload |
| `create_release` | ⭐⭐⭐⭐ | **Highest** — depends on upload |
| `promote_release` | ⭐⭐⭐ | High |

### Alternative: Use official API where possible

Google's `androidpublisher` v3 REST API **does** support most of the above (reviews, reviews:reply, edits/tracks/releases for deploys). It's the right tool for release/tester/review management — the Play Console internal API doesn't give you capabilities the official API lacks for those flows.

**Where official API falls short:** vitals/crash rate details, pre-launch report details, store listing experiments stats, reviews analysis/topic extraction. Those are genuinely internal-only.

**Honest recommendation:** Build the MCP on the official `androidpublisher` API with a service account. Use internal API only for things the official API doesn't expose. This gives:
- Stable, documented auth (service account JSON)
- Long-lived credentials (no SAPISID refresh dance)
- Lower risk of ToS issues
- Well-documented protobuf schemas

The existing `play-store-mcp` does this for deploy/promote. We'd extend it with reviews and testers using the same official API.
