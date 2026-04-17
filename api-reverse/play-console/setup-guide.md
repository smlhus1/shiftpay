# Google Play Android Developer API (androidpublisher v3) — Node.js MCP Setup Guide

> Researched: 2026-04-13 | Focus: service-account auth for a Node.js MCP server | Sources consulted: 15+

## TL;DR

1. Create GCP project → enable `androidpublisher.googleapis.com` (no OAuth consent screen, no billing required).
2. Create a service account in GCP → download JSON key. Grant **no GCP roles**.
3. In Play Console → Users & Permissions → invite the service-account email → grant app-level permissions (View app info + the operations you need).
4. Install `googleapis` (171.4.0 latest). Auth via `GoogleAuth` with scope `https://www.googleapis.com/auth/androidpublisher`.
5. For uploads: `edits.insert` → `edits.bundles.upload` (resumable) → `edits.tracks.update` → `edits.commit`.
6. **Gotcha:** first release of a brand-new app **must be done manually** in Play Console before the API can take over.

---

## 1. Google Cloud Console setup (2026 UI)

### 1.1 Create/select a project
- Go to https://console.cloud.google.com/projectcreate
- Any project works. You can reuse an existing one. **Naming note:** the project name is cosmetic, but the **project ID** is permanent — pick something like `shiftpay-play-api`.
- You no longer need to link the Play developer account to a specific Cloud project (Google removed that requirement). The service-account linkage happens entirely through the email invite.

### 1.2 Enable the API
- Top search bar → type `Google Play Android Developer API` → click the result.
- Click **Enable**. Exact API name on the backend is `androidpublisher.googleapis.com`.
- Takes a few seconds. No confirmation email.

### 1.3 OAuth consent screen
- **Not required for service accounts.** The consent screen is only for user-delegated OAuth flows. Skip it entirely.

### 1.4 Billing
- **Not required.** The Play Developer API has no per-call charge. Quotas are enforced separately (see §5).
- You do not need to attach a billing account to the project.

---

## 2. Service account creation

### 2.1 Create the account
- Cloud Console → **IAM & Admin → Service Accounts → + Create Service Account**
- Fields:
  - **Name:** `shiftpay-mcp` (display name, cosmetic)
  - **ID:** will become `shiftpay-mcp@<project-id>.iam.gserviceaccount.com` — **copy this email, you'll need it in Play Console**
  - **Description:** optional

### 2.2 GCP roles
- **Skip step 2 ("Grant this service account access to project") — leave it empty.**
- You are right: no GCP-level roles needed. All authorization for Play Developer API comes from Play Console permissions, not GCP IAM. Granting `Owner` or `Editor` here does **nothing** for Play API access and widens the blast radius unnecessarily.

### 2.3 Generate JSON key
- On the service account row → **Actions (⋮) → Manage keys → Add key → Create new key → JSON → Create**.
- File downloads automatically. **This is the only copy — Google does not store the private key.**
- Rename it to something descriptive like `shiftpay-play-sa.json`.

### 2.4 Key storage best practices
- **Never commit the JSON to git.** Add `*.sa.json` and `*-play-sa.json` to `.gitignore`.
- Two clean options for the MCP server:
  1. **File-based (recommended for local dev):** set env var `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/shiftpay-play-sa.json`. The Google SDK picks it up automatically, no code changes.
  2. **Inline (recommended for production/CI):** load the entire JSON into a single env var (e.g. `PLAY_SA_JSON`), `JSON.parse()` it, and pass as `credentials` to `GoogleAuth`. Works well on Fly.io, Railway, Render, Supabase Edge Functions.
- Rotate keys every 90 days if possible. Delete old keys in Cloud Console after rotation.
- Restrict filesystem perms: `chmod 600` on Linux, ACL to your user only on Windows.

---

## 3. Play Console linking

### 3.1 Invite the service account
- https://play.google.com/console → **Users and permissions** (left nav).
- **Only the Play Console account owner can invite service accounts.** Admin-level users cannot.
- Click **Invite new users**.
- **Email address:** paste the service account email (`shiftpay-mcp@<project>.iam.gserviceaccount.com`).
- **Access expiry:** leave at "Never" for automation.
- Grant permissions (next section), then **Invite user**. The invite does **not** need to be accepted — service accounts don't sign in. Access is immediate.

### 3.2 Permissions to grant

Play Console distinguishes **Account permissions** (apply to all apps) from **App permissions** (per-app). For an MCP server, prefer **app-level** scoping to your specific package name unless the MCP is intentionally multi-app.

Concrete mapping from your use cases to permission names in the 2026 UI:

| Task | Permission name | Scope |
|------|-----------------|-------|
| Read reviews | **View app information (read-only)** | App |
| Reply to reviews | **Reply to reviews** | App |
| Upload AAB/APK | **Release to testing tracks** *and/or* **Release to production, exclude devices, and use Play App Signing** | App |
| Manage internal/closed/open test tracks | **Release to testing tracks** | App |
| Manage testers (email lists, Google Groups) | **Manage testing tracks and release to them** (includes tester list mgmt) | App |
| Manage store listing / screenshots | **Manage store presence** | App |
| View pre-launch reports | **View app quality information** | App |

**Minimum for a review-reply bot:** `View app information` + `Reply to reviews`.
**Minimum for an upload bot:** `View app information` + `Release to testing tracks` (add `Release to production…` only if you actually push to prod from code).

Always grant least privilege — you can edit permissions later from the same screen.

### 3.3 Account-level vs app-level
Use **app-specific permissions** for MCP servers. Account-wide is convenient but means a leaked key exposes every app in the Play account.

---

## 4. Node.js implementation

### 4.1 Packages

| Package | Latest (Apr 2026) | When to use |
|---------|-------------------|-------------|
| `googleapis` | **171.4.0** | Full client for every Google API. What you want for androidpublisher. |
| `@googleapis/androidpublisher` | Separately versioned | Only the androidpublisher client. Thinner install, same API surface. Good if bundle size matters. |
| `google-auth-library` | ~9.x | Lower-level auth. `googleapis` already depends on this — don't install separately unless you need custom token flows. |

**Recommendation:** `npm install googleapis` for an MCP server. Simpler; bundle size isn't a concern for a Node server process.

The `googleapis` package is in **"complete / maintenance mode"** — Google only ships critical bug and security fixes, no new features. This is fine: the androidpublisher API itself is stable and updates flow through regenerated type definitions on each release.

### 4.2 Authentication

```ts
import { google } from 'googleapis';

// Option A: GOOGLE_APPLICATION_CREDENTIALS env var points to the JSON file
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

// Option B: inline JSON from env (production)
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.PLAY_SA_JSON!),
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({ version: 'v3', auth });
```

The single scope `https://www.googleapis.com/auth/androidpublisher` covers **everything** — reviews, edits, tracks, bundles, in-app products, subscriptions. There are no finer-grained scopes for this API; authorization is enforced by Play Console permissions instead.

### 4.3 Key API surfaces

```ts
// Reviews
androidpublisher.reviews.list({ packageName, maxResults: 100 });
androidpublisher.reviews.reply({
  packageName,
  reviewId,
  requestBody: { replyText: '...' },
});

// Edits lifecycle (all writes go through this)
const { data: edit } = await androidpublisher.edits.insert({ packageName });
// ... modify things via edit.id ...
await androidpublisher.edits.commit({ packageName, editId: edit.id! });

// Bundle upload (resumable)
const { data: bundle } = await androidpublisher.edits.bundles.upload({
  packageName,
  editId: edit.id!,
  media: {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream('./app-release.aab'),
  },
});
// bundle.versionCode is what you put in the track

// Assign bundle to a track
await androidpublisher.edits.tracks.update({
  packageName,
  editId: edit.id!,
  track: 'internal', // or 'alpha', 'beta', 'production'
  requestBody: {
    track: 'internal',
    releases: [{
      versionCodes: [String(bundle.versionCode)],
      status: 'completed', // or 'draft', 'inProgress', 'halted'
      releaseNotes: [{ language: 'en-US', text: 'Bugfixes and improvements' }],
    }],
  },
});
```

### 4.4 Edit lifecycle — the rules

1. **Only one edit per package at a time.** Calling `edits.insert` while another edit is open for the same package will error. Clean up or delete abandoned edits.
2. **Edits expire after ~7 days** if not committed.
3. **`edits.commit` is atomic.** Either all staged changes apply or none do.
4. To abort an open edit: `edits.delete`.
5. Edits are effectively **optimistic locking** — if the app's state changes underneath you, commit will fail with 409 and you must restart the edit.

### 4.5 AAB upload — resumable is automatic

The `googleapis` client uses resumable uploads automatically when you pass a stream to `media.body`. You don't need to manually handle the `/resumable/upload/...` URI — the library negotiates it.

**Critical:** bump the HTTP timeout. Google explicitly recommends 2+ minutes for bundle uploads:

```ts
await androidpublisher.edits.bundles.upload({
  packageName,
  editId,
  media: { mimeType: 'application/octet-stream', body: fs.createReadStream(path) },
}, {
  // Per-call override
  timeout: 10 * 60 * 1000, // 10 minutes
});
```

AAB max size: **200 MB for the base module**; 1.5 GB total when you count asset packs. (Your ShiftPay AAB is ~30 MB — irrelevant.)

---

## 5. Known gotchas (2026)

### 5.1 First-release-must-be-manual
**The single biggest trap.** For a brand-new app, you **cannot** use the API to create the first production release. You must:
1. Create the app listing manually in Play Console.
2. Upload the first AAB to **at least the internal track** through the UI.
3. Complete all required store listing steps (content rating, data safety, target audience, etc.).

After that, the API can manage subsequent releases to any track. ShiftPay v1.1.0 is already released, so you're past this.

### 5.2 Quotas (current as of April 2026)
- **200,000 queries/day** total across the API (midnight Pacific reset).
- **3,000 queries/minute per bucket.** Buckets include `Publishing` (edits/tracks/bundles), `Subscriptions`, `One-time purchases`, `Orders`. Each bucket's quota is independent — a reply-to-reviews storm won't starve bundle uploads.
- View current usage: Cloud Console → **APIs & Services → Google Play Android Developer API → Quotas & System Limits**.
- Quota increases: request form via Cloud Console; typical turnaround is days to weeks and requires justification.

### 5.3 Internal testing track specifics
- Internal track supports up to **100 testers** via email lists or Google Groups.
- Releases to internal are available to testers within **minutes** (vs hours for closed/open).
- No review required — internal skips Play's review pipeline entirely.
- You can release the same AAB to internal, then **promote** it to closed/open/production via `edits.tracks.update` without re-uploading. This is cheaper than uploading twice.

### 5.4 Reviews API limitations
- Returns **only the last 7 days** of reviews by default, max 1 week window historically.
- Only reviews with a **text comment** are returned — star-only ratings are invisible to the API.
- You can reply once. Editing a reply overwrites the previous one (calling `reviews.reply` again is effectively an edit).
- No pagination beyond 7 days — if you need historical reviews, export CSV manually.

### 5.5 Deprecations to watch
- `edits.apks.upload` still works but **AABs are mandatory** for all new apps and all updates since August 2021. Use `edits.bundles.upload`.
- `ackBundleInstallationWarning` parameter is **deprecated** (the underlying installation-size warning was removed). Don't pass it.
- The old `reviews.reply` v2 endpoint is gone — v3 only.

### 5.6 Developer verification rollout (March 2026)
Google rolled out **mandatory developer verification** to all Play Console developers in March 2026. This is account-level — doesn't affect API usage, but if you haven't completed verification, you can't publish any releases (UI or API). Check Play Console → Settings → Developer account → Verification status.

### 5.7 Common trip-ups
- **Propagation delay after inviting the service account:** usually instant, but wait ~60s before the first API call. 403s in the first minute are spurious.
- **Package name mismatch** between what's in Play Console and the AAB's manifest → upload succeeds but commit fails with cryptic "APK specifies a version code that has already been used" or similar.
- **VersionCode collisions:** if you accidentally re-upload the same versionCode, you get a 400. Always bump.
- **Timezone:** dates in the API are UTC. Quota reset is Pacific. Don't conflate.
- **Service account JSON has `type: "service_account"`** — if you downloaded an OAuth client JSON by accident (type `"authorized_user"` or `"installed"`), auth will silently use the wrong flow. Verify the `type` field.

---

## 6. End-to-end smoke test

Once set up, run this to verify auth works before building the full MCP:

```ts
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});
const pub = google.androidpublisher({ version: 'v3', auth });

const res = await pub.reviews.list({
  packageName: 'no.fenrir.shiftpay', // your actual package
  maxResults: 5,
});
console.log(res.data);
```

Expected: 200 with `reviews: []` (or populated) and no error. If you get **401**, the JSON key path is wrong. If **403**, the service account isn't invited in Play Console or lacks the `View app information` permission. If **404**, package name is wrong or the app doesn't exist in this Play Console account.

---

## Sources

- [Getting Started | Google Play Developer API](https://developers.google.com/android-publisher/getting_started)
- [Quotas | Google Play Developer API](https://developers.google.com/android-publisher/quotas)
- [Method: edits.bundles.upload](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload)
- [Method: edits.commit](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit)
- [Reply to Reviews](https://developers.google.com/android-publisher/reply-to-reviews)
- [google-api-nodejs-client (GitHub)](https://github.com/googleapis/google-api-nodejs-client)
- [googleapis on npm](https://www.npmjs.com/package/googleapis) — 171.4.0 latest
- [@googleapis/androidpublisher on npm](https://www.npmjs.com/package/@googleapis/androidpublisher)
- [Add developer account users and manage permissions](https://support.google.com/googleplay/android-developer/answer/9844686)
- [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Android Developer Verification rollout (March 2026)](https://android-developers.googleblog.com/2026/03/android-developer-verification-rolling-out-to-all-developers.html)
