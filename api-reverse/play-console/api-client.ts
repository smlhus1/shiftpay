/**
 * Play Console Internal API Client (reverse-engineered)
 *
 * ⚠️ Uses undocumented internal API. For personal tooling only.
 * For production/distribution use, prefer Google's official `androidpublisher` v3 REST API.
 *
 * Auth requires live Google session cookies — primarily SAPISID.
 * The simplest way to obtain them: open DevTools in Play Console, Application > Cookies,
 * copy the values into env vars PLAY_CONSOLE_SAPISID etc.
 */

import { createHash } from "node:crypto";

const API_KEY = "AIzaSyBAha_rcoO_aGsmiR5fWbNfdOjqT0gXwbk"; // Public key hardcoded in Play Console UI
const ORIGIN = "https://play.google.com";

const DOMAIN = {
  platform: "https://playconsoleplatform-pa.clients6.google.com",
  apps: "https://playconsoleapps-pa.clients6.google.com",
  ratings: "https://playconsoleratings-pa.clients6.google.com",
} as const;

type Domain = keyof typeof DOMAIN;

export interface PlayConsoleCookies {
  SAPISID: string;
  SID: string;
  HSID: string;
  SSID: string;
  APISID: string;
  "__Secure-1PSID": string;
  "__Secure-3PSID": string;
}

export interface PlayConsoleClientOptions {
  developerId: string;
  cookies: PlayConsoleCookies;
  /** Slot in multi-account auth. 0 = primary. */
  authUser?: number;
  /** Optional override. If omitted, a random 8-hex-char ID is generated. */
  sessionId?: string;
}

/** SHA1 hash used in SAPISIDHASH auth. */
function sapisidHash(sapisid: string, origin = ORIGIN): string {
  const ts = Date.now();
  const hash = createHash("sha1")
    .update(`${ts} ${sapisid} ${origin}`)
    .digest("hex");
  return `SAPISIDHASH ${ts}_${hash}`;
}

function randomSessionId(): string {
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16)
      .toString(16)
      .toUpperCase()
  ).join("");
}

function serializeCookies(c: PlayConsoleCookies): string {
  return Object.entries(c)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

export class PlayConsoleClient {
  readonly developerId: string;
  private readonly cookies: PlayConsoleCookies;
  private readonly cookieHeader: string;
  private readonly authUser: number;
  readonly sessionId: string;

  constructor(opts: PlayConsoleClientOptions) {
    this.developerId = opts.developerId;
    this.cookies = opts.cookies;
    this.cookieHeader = serializeCookies(opts.cookies);
    this.authUser = opts.authUser ?? 0;
    this.sessionId = opts.sessionId ?? randomSessionId();
  }

  private buildHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json+protobuf",
      Accept: "application/json+protobuf",
      "X-Goog-AuthUser": String(this.authUser),
      "X-Goog-Api-Key": API_KEY,
      "X-Play-Console-Session-Id": this.sessionId,
      Authorization: sapisidHash(this.cookies.SAPISID),
      Cookie: this.cookieHeader,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/console/`,
    };
  }

  private async request<T = unknown>(
    domain: Domain,
    path: string,
    init: RequestInit & { query?: Record<string, string> } = {}
  ): Promise<T> {
    const url = new URL(DOMAIN[domain] + path);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) url.searchParams.set(k, v);
    }
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { ...this.buildHeaders(), ...(init.headers ?? {}) },
      body: init.body,
    });
    if (!res.ok) {
      throw new Error(`[PlayConsole] ${res.status} ${res.statusText} — ${url.pathname}`);
    }
    return (await res.json()) as T;
  }

  // =========================================================================
  // Verified endpoints
  // =========================================================================

  /** List release summaries for a specific track. */
  listReleaseSummaries(appId: string, trackId: string) {
    return this.request("apps",
      `/v1/developers/${this.developerId}/apps/${appId}/tracks/${trackId}/releases:listSummaries`,
      { query: { view: "RELEASE_SUMMARY_VIEW_FULL" } }
    );
  }

  /** Rating aggregates (mean rating, ratings count, reviews count). */
  getRatingSummary(appId: string) {
    return this.request("ratings",
      `/v1/developers/${this.developerId}/apps/${appId}/ratingSummary`
    );
  }

  /** List all email lists used for tester management. */
  listEmailLists() {
    return this.request("apps", `/v1/developers/${this.developerId}/emaillists`);
  }

  /** Customer support contact info. */
  getCustomerSupportContact() {
    return this.request("apps", `/v1/developers/${this.developerId}/customersupportcontact`);
  }

  // =========================================================================
  // TODO: Verify by live sniffing against an app with real data
  // =========================================================================

  /**
   * List reviews for an app. Pattern inferred — needs live verification.
   * The real call likely requires a protobuf-array POST body with pagination.
   */
  async listReviews(appId: string): Promise<unknown> {
    throw new Error("Not yet implemented — capture a live request from an app with reviews first");
  }

  async replyToReview(appId: string, reviewId: string, reply: string): Promise<unknown> {
    throw new Error("Not yet implemented — needs protobuf body schema");
  }

  async createRelease(appId: string, trackId: string, opts: {
    versionCode: number;
    releaseNotes?: Record<string, string>;
    rolloutPercentage?: number;
  }): Promise<unknown> {
    throw new Error("Not yet implemented — needs protobuf body schema");
  }

  async promoteRelease(appId: string, fromTrackId: string, toTrackId: string, versionCode: number): Promise<unknown> {
    throw new Error("Not yet implemented — needs protobuf body schema");
  }
}

// Example usage:
//
//   import { PlayConsoleClient } from "./api-client";
//
//   const client = new PlayConsoleClient({
//     developerId: "7413483010949790813",
//     cookies: {
//       SAPISID: process.env.PLAY_CONSOLE_SAPISID!,
//       SID: process.env.PLAY_CONSOLE_SID!,
//       HSID: process.env.PLAY_CONSOLE_HSID!,
//       SSID: process.env.PLAY_CONSOLE_SSID!,
//       APISID: process.env.PLAY_CONSOLE_APISID!,
//       "__Secure-1PSID": process.env.PLAY_CONSOLE_SECURE_1PSID!,
//       "__Secure-3PSID": process.env.PLAY_CONSOLE_SECURE_3PSID!,
//     },
//   });
//
//   const summary = await client.getRatingSummary("4972280428520410998");
//   console.log(summary);
