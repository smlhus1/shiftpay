#!/usr/bin/env node
/**
 * Play Console MCP Server
 *
 * Exposes the Google Play Android Developer API (androidpublisher v3) as MCP tools.
 * Auth via service account JSON (GOOGLE_APPLICATION_CREDENTIALS env var).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PlayClient, TrackName } from "./play-client.js";

const client = new PlayClient();

const TRACK_ENUM = ["internal", "alpha", "beta", "production"] as const;

const server = new Server(
  { name: "play-console-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// --------------------------------------------------------------------------
// Tool definitions
// --------------------------------------------------------------------------

const tools = [
  // ----- Reviews -----
  {
    name: "list_reviews",
    description: "List recent reviews for an app. Returns last 7 days of reviews with text (star-only reviews are not included by the API).",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string", description: "e.g. com.rack.app" },
        maxResults: { type: "number", default: 100, description: "Max reviews to return, up to 100 per page" },
        translationLanguage: { type: "string", description: "BCP-47 code (e.g. 'en') to translate reviews into" },
        startIndex: { type: "number", description: "For pagination" },
        token: { type: "string", description: "Page token from previous response" },
      },
      required: ["packageName"],
    },
  },
  {
    name: "get_review",
    description: "Get a specific review by ID.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        reviewId: { type: "string" },
        translationLanguage: { type: "string" },
      },
      required: ["packageName", "reviewId"],
    },
  },
  {
    name: "reply_to_review",
    description: "Reply to a user review. Calling again on the same review overwrites the previous reply.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        reviewId: { type: "string" },
        replyText: { type: "string", description: "Max 350 chars" },
      },
      required: ["packageName", "reviewId", "replyText"],
    },
  },

  // ----- Tracks & releases (read) -----
  {
    name: "list_tracks",
    description: "List all tracks (internal/alpha/beta/production) with their current releases.",
    inputSchema: {
      type: "object",
      properties: { packageName: { type: "string" } },
      required: ["packageName"],
    },
  },
  {
    name: "get_track",
    description: "Get details of a specific track and its releases.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        track: { type: "string", enum: [...TRACK_ENUM] },
      },
      required: ["packageName", "track"],
    },
  },

  // ----- Uploads -----
  {
    name: "upload_bundle",
    description: "Upload an AAB file, create a release on the target track, and commit. Returns the versionCode. Use userFraction (0-1) for staged rollouts on production.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        filePath: { type: "string", description: "Absolute path to the .aab file" },
        track: { type: "string", enum: [...TRACK_ENUM] },
        releaseName: { type: "string" },
        releaseNotes: {
          type: "array",
          description: "Per-language release notes",
          items: {
            type: "object",
            properties: {
              language: { type: "string", description: "BCP-47, e.g. en-US, nb-NO" },
              text: { type: "string", description: "Max 500 chars" },
            },
            required: ["language", "text"],
          },
        },
        userFraction: { type: "number", minimum: 0, maximum: 1, description: "0.0-1.0. Omit for 100% rollout." },
        status: { type: "string", enum: ["draft", "inProgress", "halted", "completed"] },
      },
      required: ["packageName", "filePath", "track"],
    },
  },
  {
    name: "upload_apk",
    description: "Upload an APK file (legacy — prefer AAB). Same signature as upload_bundle.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        filePath: { type: "string" },
        track: { type: "string", enum: [...TRACK_ENUM] },
        releaseName: { type: "string" },
        releaseNotes: {
          type: "array",
          items: {
            type: "object",
            properties: { language: { type: "string" }, text: { type: "string" } },
            required: ["language", "text"],
          },
        },
        userFraction: { type: "number", minimum: 0, maximum: 1 },
        status: { type: "string", enum: ["draft", "inProgress", "halted", "completed"] },
      },
      required: ["packageName", "filePath", "track"],
    },
  },

  // ----- Rollout management -----
  {
    name: "promote_release",
    description: "Promote the latest active release from one track to another (e.g. internal → beta → production). Does not re-upload the bundle.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        fromTrack: { type: "string", enum: [...TRACK_ENUM] },
        toTrack: { type: "string", enum: [...TRACK_ENUM] },
        userFraction: { type: "number", minimum: 0, maximum: 1, description: "For staged rollout. Omit for full." },
        status: { type: "string", enum: ["draft", "inProgress", "halted", "completed"] },
      },
      required: ["packageName", "fromTrack", "toTrack"],
    },
  },
  {
    name: "set_rollout",
    description: "Change the staged rollout percentage of an in-progress release. Use 1.0 to complete.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        track: { type: "string", enum: [...TRACK_ENUM] },
        userFraction: { type: "number", minimum: 0.001, maximum: 1 },
      },
      required: ["packageName", "track", "userFraction"],
    },
  },
  {
    name: "halt_rollout",
    description: "Halt an in-progress staged rollout. Use resume_rollout to restart.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        track: { type: "string", enum: [...TRACK_ENUM] },
      },
      required: ["packageName", "track"],
    },
  },
  {
    name: "resume_rollout",
    description: "Resume a halted rollout at the given userFraction.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        track: { type: "string", enum: [...TRACK_ENUM] },
        userFraction: { type: "number", default: 0.1, minimum: 0.001, maximum: 1 },
      },
      required: ["packageName", "track"],
    },
  },

  // ----- Bundles & APKs (list) -----
  {
    name: "list_bundles",
    description: "List all uploaded AABs visible in a new edit.",
    inputSchema: {
      type: "object",
      properties: { packageName: { type: "string" } },
      required: ["packageName"],
    },
  },
  {
    name: "list_apks",
    description: "List all uploaded APKs visible in a new edit.",
    inputSchema: {
      type: "object",
      properties: { packageName: { type: "string" } },
      required: ["packageName"],
    },
  },

  // ----- Store listing -----
  {
    name: "list_listings",
    description: "List all language variants of the store listing.",
    inputSchema: {
      type: "object",
      properties: { packageName: { type: "string" } },
      required: ["packageName"],
    },
  },
  {
    name: "get_listing",
    description: "Get a specific language's store listing (title, descriptions, video).",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        language: { type: "string", description: "BCP-47, e.g. en-US, nb-NO" },
      },
      required: ["packageName", "language"],
    },
  },
  {
    name: "update_listing",
    description: "Update store listing fields for a language. Only provided fields are changed.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: { type: "string" },
        language: { type: "string" },
        title: { type: "string", description: "Max 30 chars" },
        shortDescription: { type: "string", description: "Max 80 chars" },
        fullDescription: { type: "string", description: "Max 4000 chars" },
        video: { type: "string", description: "YouTube URL" },
      },
      required: ["packageName", "language"],
    },
  },

  // ----- App details -----
  {
    name: "get_app_details",
    description: "Get app-level details (default language, contact email, website).",
    inputSchema: {
      type: "object",
      properties: { packageName: { type: "string" } },
      required: ["packageName"],
    },
  },
];

// --------------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const a = args as Record<string, any>;

  try {
    let result: unknown;
    switch (name) {
      // Reviews
      case "list_reviews":
        result = await client.listReviews(a.packageName, {
          maxResults: a.maxResults,
          translationLanguage: a.translationLanguage,
          startIndex: a.startIndex,
          token: a.token,
        });
        break;
      case "get_review":
        result = await client.getReview(a.packageName, a.reviewId, a.translationLanguage);
        break;
      case "reply_to_review":
        result = await client.replyToReview(a.packageName, a.reviewId, a.replyText);
        break;

      // Tracks
      case "list_tracks":
        result = await client.listTracks(a.packageName);
        break;
      case "get_track":
        result = await client.getTrack(a.packageName, a.track);
        break;

      // Uploads
      case "upload_bundle":
        result = await client.uploadBundle({
          packageName: a.packageName,
          filePath: a.filePath,
          track: a.track as TrackName,
          releaseName: a.releaseName,
          releaseNotes: a.releaseNotes,
          userFraction: a.userFraction,
          status: a.status,
        });
        break;
      case "upload_apk":
        result = await client.uploadApk({
          packageName: a.packageName,
          filePath: a.filePath,
          track: a.track as TrackName,
          releaseName: a.releaseName,
          releaseNotes: a.releaseNotes,
          userFraction: a.userFraction,
          status: a.status,
        });
        break;

      // Rollouts
      case "promote_release":
        result = await client.promoteRelease(
          a.packageName,
          a.fromTrack as TrackName,
          a.toTrack as TrackName,
          a.userFraction,
          a.status
        );
        break;
      case "set_rollout":
        result = await client.setRollout(a.packageName, a.track as TrackName, a.userFraction);
        break;
      case "halt_rollout":
        result = await client.haltRollout(a.packageName, a.track as TrackName);
        break;
      case "resume_rollout":
        result = await client.resumeRollout(a.packageName, a.track as TrackName, a.userFraction);
        break;

      // Bundles / APKs
      case "list_bundles":
        result = await client.listBundles(a.packageName);
        break;
      case "list_apks":
        result = await client.listApks(a.packageName);
        break;

      // Listings
      case "list_listings":
        result = await client.listListings(a.packageName);
        break;
      case "get_listing":
        result = await client.getListing(a.packageName, a.language);
        break;
      case "update_listing":
        result = await client.updateListing(a.packageName, a.language, {
          title: a.title,
          shortDescription: a.shortDescription,
          fullDescription: a.fullDescription,
          video: a.video,
        });
        break;

      // App
      case "get_app_details":
        result = await client.getAppDetails(a.packageName);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (e: any) {
    const msg = e?.errors ? JSON.stringify(e.errors, null, 2) : e?.message ?? String(e);
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${msg}` }],
    };
  }
});

// --------------------------------------------------------------------------
// Startup
// --------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[play-console-mcp] ready");
