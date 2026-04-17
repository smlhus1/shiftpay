/**
 * Google Play Console API client wrapper.
 * Handles auth and the edit-lifecycle dance for write operations.
 */
import fs from "node:fs";
import { google, androidpublisher_v3 } from "googleapis";

export type TrackName = "internal" | "alpha" | "beta" | "production";
export type ReleaseStatus = "draft" | "inProgress" | "halted" | "completed";

export interface UploadOptions {
  packageName: string;
  filePath: string;
  track: TrackName;
  releaseName?: string;
  releaseNotes?: { language: string; text: string }[];
  /** 0.0–1.0. Omit for full rollout (100%). */
  userFraction?: number;
  /** completed (100%), inProgress (staged), draft, halted. Default: completed. */
  status?: ReleaseStatus;
}

export class PlayClient {
  readonly pub: androidpublisher_v3.Androidpublisher;

  constructor(credentialsPath?: string) {
    if (credentialsPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    this.pub = google.androidpublisher({ version: "v3", auth });
  }

  // ====================================================================
  // Reviews
  // ====================================================================

  async listReviews(
    packageName: string,
    opts: { maxResults?: number; translationLanguage?: string; startIndex?: number; token?: string } = {}
  ) {
    const res = await this.pub.reviews.list({
      packageName,
      maxResults: opts.maxResults ?? 100,
      translationLanguage: opts.translationLanguage,
      startIndex: opts.startIndex,
      token: opts.token,
    });
    return res.data;
  }

  async getReview(packageName: string, reviewId: string, translationLanguage?: string) {
    const res = await this.pub.reviews.get({ packageName, reviewId, translationLanguage });
    return res.data;
  }

  async replyToReview(packageName: string, reviewId: string, replyText: string) {
    const res = await this.pub.reviews.reply({
      packageName,
      reviewId,
      requestBody: { replyText },
    });
    return res.data;
  }

  // ====================================================================
  // Edit helpers
  // ====================================================================

  /**
   * Run a block of work inside an edit: insert → work → commit.
   * If the block throws, the edit is deleted.
   */
  async withEdit<T>(
    packageName: string,
    work: (editId: string) => Promise<T>,
    options?: { changesNotSentForReview?: boolean }
  ): Promise<T> {
    const { data: edit } = await this.pub.edits.insert({ packageName });
    const editId = edit.id!;
    try {
      const result = await work(editId);
      await this.pub.edits.commit({
        packageName,
        editId,
        changesNotSentForReview: options?.changesNotSentForReview,
      });
      return result;
    } catch (e) {
      try {
        await this.pub.edits.delete({ packageName, editId });
      } catch {
        /* ignore cleanup error */
      }
      throw e;
    }
  }

  /** Read-only use of an edit (auto-deleted, not committed). */
  async withReadOnlyEdit<T>(packageName: string, work: (editId: string) => Promise<T>): Promise<T> {
    const { data: edit } = await this.pub.edits.insert({ packageName });
    const editId = edit.id!;
    try {
      return await work(editId);
    } finally {
      try {
        await this.pub.edits.delete({ packageName, editId });
      } catch {
        /* ignore */
      }
    }
  }

  // ====================================================================
  // Tracks & releases (read)
  // ====================================================================

  async listTracks(packageName: string) {
    return this.withReadOnlyEdit(packageName, async (editId) => {
      const res = await this.pub.edits.tracks.list({ packageName, editId });
      return res.data;
    });
  }

  async getTrack(packageName: string, track: string) {
    return this.withReadOnlyEdit(packageName, async (editId) => {
      const res = await this.pub.edits.tracks.get({ packageName, editId, track });
      return res.data;
    });
  }

  // ====================================================================
  // Uploads
  // ====================================================================

  async uploadBundle(opts: UploadOptions) {
    return this.withEdit(opts.packageName, async (editId) => {
      const bundle = await this.pub.edits.bundles.upload(
        {
          packageName: opts.packageName,
          editId,
          media: {
            mimeType: "application/octet-stream",
            body: fs.createReadStream(opts.filePath),
          },
        },
        { timeout: 10 * 60 * 1000 } // 10 min
      );
      const versionCode = bundle.data.versionCode!;
      const track = await this.pub.edits.tracks.update({
        packageName: opts.packageName,
        editId,
        track: opts.track,
        requestBody: {
          track: opts.track,
          releases: [
            {
              name: opts.releaseName,
              versionCodes: [String(versionCode)],
              status: opts.status ?? (opts.userFraction != null && opts.userFraction < 1 ? "inProgress" : "completed"),
              userFraction: opts.userFraction,
              releaseNotes: opts.releaseNotes,
            },
          ],
        },
      });
      return { versionCode, track: track.data };
    });
  }

  async uploadApk(opts: UploadOptions) {
    return this.withEdit(opts.packageName, async (editId) => {
      const apk = await this.pub.edits.apks.upload(
        {
          packageName: opts.packageName,
          editId,
          media: {
            mimeType: "application/vnd.android.package-archive",
            body: fs.createReadStream(opts.filePath),
          },
        },
        { timeout: 10 * 60 * 1000 }
      );
      const versionCode = apk.data.versionCode!;
      const track = await this.pub.edits.tracks.update({
        packageName: opts.packageName,
        editId,
        track: opts.track,
        requestBody: {
          track: opts.track,
          releases: [
            {
              name: opts.releaseName,
              versionCodes: [String(versionCode)],
              status: opts.status ?? (opts.userFraction != null && opts.userFraction < 1 ? "inProgress" : "completed"),
              userFraction: opts.userFraction,
              releaseNotes: opts.releaseNotes,
            },
          ],
        },
      });
      return { versionCode, track: track.data };
    });
  }

  // ====================================================================
  // Rollout management
  // ====================================================================

  /** Copy the most recent release from `fromTrack` to `toTrack`. */
  async promoteRelease(
    packageName: string,
    fromTrack: TrackName,
    toTrack: TrackName,
    userFraction?: number,
    status?: ReleaseStatus
  ) {
    return this.withEdit(packageName, async (editId) => {
      const fromRes = await this.pub.edits.tracks.get({ packageName, editId, track: fromTrack });
      const releases = fromRes.data.releases ?? [];
      if (releases.length === 0) throw new Error(`No releases on track ${fromTrack}`);
      // Use the most recent release that is not halted/draft
      const source = releases.find((r) => r.status === "completed" || r.status === "inProgress") ?? releases[0];
      const targetStatus = status ?? (userFraction != null && userFraction < 1 ? "inProgress" : "completed");
      const res = await this.pub.edits.tracks.update({
        packageName,
        editId,
        track: toTrack,
        requestBody: {
          track: toTrack,
          releases: [
            {
              name: source.name,
              versionCodes: source.versionCodes,
              releaseNotes: source.releaseNotes,
              status: targetStatus,
              userFraction: targetStatus === "inProgress" ? userFraction ?? 0.1 : undefined,
            },
          ],
        },
      });
      return res.data;
    });
  }

  async setRollout(packageName: string, track: TrackName, userFraction: number) {
    if (userFraction <= 0 || userFraction > 1) throw new Error("userFraction must be in (0, 1]");
    return this.withEdit(packageName, async (editId) => {
      const cur = await this.pub.edits.tracks.get({ packageName, editId, track });
      const release = (cur.data.releases ?? []).find((r) => r.status === "inProgress" || r.status === "halted");
      if (!release) throw new Error(`No staged/halted release on ${track}`);
      const res = await this.pub.edits.tracks.update({
        packageName,
        editId,
        track,
        requestBody: {
          track,
          releases: [{ ...release, status: userFraction >= 1 ? "completed" : "inProgress", userFraction: userFraction < 1 ? userFraction : undefined }],
        },
      });
      return res.data;
    });
  }

  async haltRollout(packageName: string, track: TrackName) {
    return this.withEdit(packageName, async (editId) => {
      const cur = await this.pub.edits.tracks.get({ packageName, editId, track });
      const release = (cur.data.releases ?? []).find((r) => r.status === "inProgress");
      if (!release) throw new Error(`No in-progress release on ${track}`);
      const res = await this.pub.edits.tracks.update({
        packageName,
        editId,
        track,
        requestBody: { track, releases: [{ ...release, status: "halted" }] },
      });
      return res.data;
    });
  }

  async resumeRollout(packageName: string, track: TrackName, userFraction = 0.1) {
    return this.withEdit(packageName, async (editId) => {
      const cur = await this.pub.edits.tracks.get({ packageName, editId, track });
      const release = (cur.data.releases ?? []).find((r) => r.status === "halted");
      if (!release) throw new Error(`No halted release on ${track}`);
      const res = await this.pub.edits.tracks.update({
        packageName,
        editId,
        track,
        requestBody: {
          track,
          releases: [{ ...release, status: userFraction >= 1 ? "completed" : "inProgress", userFraction: userFraction < 1 ? userFraction : undefined }],
        },
      });
      return res.data;
    });
  }

  // ====================================================================
  // Bundles & APKs (list)
  // ====================================================================

  async listBundles(packageName: string) {
    return this.withReadOnlyEdit(packageName, async (editId) => {
      const res = await this.pub.edits.bundles.list({ packageName, editId });
      return res.data;
    });
  }

  async listApks(packageName: string) {
    return this.withReadOnlyEdit(packageName, async (editId) => {
      const res = await this.pub.edits.apks.list({ packageName, editId });
      return res.data;
    });
  }

  // ====================================================================
  // Store listing
  // ====================================================================

  async listListings(packageName: string) {
    return this.withReadOnlyEdit(packageName, async (editId) => {
      const res = await this.pub.edits.listings.list({ packageName, editId });
      return res.data;
    });
  }

  async getListing(packageName: string, language: string) {
    return this.withReadOnlyEdit(packageName, async (editId) => {
      const res = await this.pub.edits.listings.get({ packageName, editId, language });
      return res.data;
    });
  }

  async updateListing(
    packageName: string,
    language: string,
    fields: { title?: string; shortDescription?: string; fullDescription?: string; video?: string }
  ) {
    return this.withEdit(packageName, async (editId) => {
      const current = await this.pub.edits.listings.get({ packageName, editId, language }).catch(() => null);
      const body = {
        language,
        ...current?.data,
        ...fields,
      };
      const res = await this.pub.edits.listings.update({
        packageName,
        editId,
        language,
        requestBody: body,
      });
      return res.data;
    });
  }

  // ====================================================================
  // App details
  // ====================================================================

  async getAppDetails(packageName: string) {
    return this.withReadOnlyEdit(packageName, async (editId) => {
      const res = await this.pub.edits.details.get({ packageName, editId });
      return res.data;
    });
  }
}
