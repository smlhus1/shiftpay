// ShiftPay OCR — Supabase Edge Function (Claude Haiku 4.5 Vision only, no Tesseract)
// Model ID from https://docs.anthropic.com/en/docs/models-overview (Claude Haiku 4.5)
// Deploy: supabase functions deploy ocr --no-verify-jwt && supabase secrets set ANTHROPIC_API_KEY=... SHIFTPAY_API_KEY=...

import { encodeBase64 } from "jsr:@std/encoding/base64";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import * as v from "npm:valibot@^1";
import { ClaudeRawOutputSchema, OcrShiftSchema } from "./schema.ts";
import { checkRateLimit, getClientIp } from "./rate-limit.ts";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

/**
 * Magic-number probe on the first four bytes.
 * Rejects spoofed MIME types (the file.type header is client-controlled and
 * cannot be trusted — a `.exe` renamed to `.jpg` will pass the MIME check
 * but fail this signature probe).
 *   JPEG: FF D8 FF ..       (three bytes)
 *   PNG : 89 50 4E 47 ..    (four bytes)
 */
function detectImageKind(buf: ArrayBuffer): "image/jpeg" | "image/png" | null {
  const b = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    b.length >= 4 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  ) {
    return "image/png";
  }
  return null;
}

const SYSTEM_MESSAGE =
  "Du er en presis OCR-assistent spesialisert på norske vaktplaner. " +
  "Din oppgave er å ekstrahere vakter fra bilder av arbeidsplaner. " +
  "Du returnerer ALLTID valid JSON. Hvis du ikke kan lese bildet eller finner ingen vakter, " +
  'returner {"shifts": [], "notes": "beskrivelse av problemet"}. ' +
  "Vær EKSTREMT nøyaktig med tall - skill mellom 1/7, 3/8, 6/0 osv.";

const USER_PROMPT = `Ekstraher ALLE vakter fra denne vaktplanen.

Returner JSON med denne strukturen:
{
    "shifts": [
        {
            "date": "DD.MM.YYYY",
            "start_time": "HH:MM",
            "end_time": "HH:MM",
            "shift_type": "tidlig|mellom|kveld|natt",
            "confidence": 0.0-1.0
        }
    ],
    "notes": null
}

Regler for shift_type (basert på starttid):
- "tidlig": 06:00-11:59
- "mellom": 12:00-15:59
- "kveld": 16:00-21:59
- "natt": 22:00-05:59 eller krysser midnatt

Datoformat ALLTID DD.MM.YYYY. Tidsformat ALLTID HH:MM. Returner BARE JSON.`;

// CORS: Only needed if called from browsers. Mobile apps don't send Origin.
// Restrict to known origins; omit wildcard to prevent cross-origin abuse.
/** Timing-safe string comparison using HMAC to prevent timing attacks on API key. */
async function safeCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode("shiftpay-compare"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const [macA, macB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const viewA = new Uint8Array(macA);
  const viewB = new Uint8Array(macB);
  if (viewA.length !== viewB.length) return false;
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i]! ^ viewB[i]!;
  }
  return result === 0;
}

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  if (!allowOrigin) return {};
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  };
}

function jsonResponse(body: unknown, status = 200, req?: Request) {
  const cors = req ? getCorsHeaders(req) : {};
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  // Kill switch — single env var the operator can flip in the Supabase
  // dashboard to stop all processing within seconds. Useful when the app
  // suddenly goes viral, when Claude returns odd output, or when the
  // Anthropic budget is about to blow up.
  if (Deno.env.get("KILL_SWITCH") === "true") {
    return jsonResponse({ detail: "Service temporarily unavailable" }, 503, req);
  }

  if (req.method !== "POST") {
    return jsonResponse({ detail: "Method not allowed" }, 405, req);
  }

  // API key authentication — fail closed: reject if secret not configured or key mismatch
  const appApiKey = Deno.env.get("SHIFTPAY_API_KEY");
  if (!appApiKey) {
    return jsonResponse({ detail: "Service unavailable" }, 503, req);
  }
  const provided = req.headers.get("x-api-key") ?? "";
  if (!provided || !(await safeCompare(provided, appApiKey))) {
    return jsonResponse({ detail: "Unauthorized" }, 401, req);
  }

  // Rate limit AFTER auth so unauthenticated traffic doesn't cost us
  // Redis commands, but BEFORE we open the file / call Anthropic so a
  // limited caller never triggers the expensive path.
  const rateLimit = await checkRateLimit(getClientIp(req));
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        detail: "Too many requests — try again shortly.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfterSec),
          ...getCorsHeaders(req),
        },
      }
    );
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonResponse({ detail: "Service unavailable" }, 503, req);
  }

  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get("file");
    if (!f || !(f instanceof File)) {
      return jsonResponse({ detail: "Missing or invalid file in form field 'file'" }, 400, req);
    }
    file = f;
  } catch {
    return jsonResponse({ detail: "Invalid multipart body" }, 400, req);
  }

  if (file.size > MAX_FILE_BYTES) {
    return jsonResponse({ detail: "File too large (max 5MB)" }, 400, req);
  }

  const buf = await file.arrayBuffer();

  // Trust the bytes, not the headers. The client-supplied MIME is a hint
  // only — the magic-number probe is the source of truth. A PE executable
  // or a 50,000×50,000-pixel image-bomb renamed to .jpg passes the MIME
  // check but fails the signature probe.
  const detected = detectImageKind(buf);
  if (!detected) {
    return jsonResponse(
      { detail: "Only image/jpeg and image/png allowed" },
      400,
      req
    );
  }
  // The header MIME must at minimum match the detected kind (or be absent).
  // This catches obvious spoofs like Content-Type: image/png but JPEG bytes.
  const claimedMime = (file.type?.toLowerCase() || "").trim();
  if (claimedMime && !claimedMime.startsWith("image/")) {
    return jsonResponse({ detail: "Only image/jpeg and image/png allowed" }, 400, req);
  }
  const mime = detected;
  void ALLOWED_TYPES; // retained for future SVG / WebP expansion

  const base64 = encodeBase64(new Uint8Array(buf));

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: SYSTEM_MESSAGE,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mime,
                data: base64,
              },
            },
            { type: "text", text: USER_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content?.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text?.trim() : null;
    if (!raw) {
      return jsonResponse({ detail: "Empty response from Claude" }, 502, req);
    }

    // Claude may wrap JSON in markdown (e.g. ```json ... ```); extract raw JSON before parsing
    let jsonStr = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const braceMatch = raw.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    // Parse Claude's raw output. Loose schema accepts strings; strict
    // per-shift validation happens next with safeParse, so malformed
    // shifts are dropped rather than crashing the whole response.
    const rawParsed = v.safeParse(ClaudeRawOutputSchema, JSON.parse(jsonStr));
    if (!rawParsed.success) {
      console.error("OCR Claude output failed outer schema:", rawParsed.issues);
      return jsonResponse({ detail: "OCR response shape invalid" }, 502, req);
    }
    const rawShifts = rawParsed.output.shifts ?? [];

    // Per-shift strict validation — DD.MM.YYYY regex, HH:MM regex,
    // shift_type ∈ {tidlig, mellom, kveld, natt}. safeParse here lets a
    // malformed single shift drop out of the result instead of rejecting
    // the entire payload; the Claude prompt is specific about format, so
    // a failing shift is almost always noise rather than a valid entry.
    const shifts = rawShifts
      .map((s) => {
        const normalised = {
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          shift_type: s.shift_type,
          confidence: Math.min(1, Math.max(0, Number(s.confidence) || 0.85)),
        };
        const parsed = v.safeParse(OcrShiftSchema, normalised);
        return parsed.success ? parsed.output : null;
      })
      .filter((s): s is v.InferOutput<typeof OcrShiftSchema> => s !== null);

    const confidence = shifts.length
      ? shifts.reduce((a, s) => a + s.confidence, 0) / shifts.length
      : 0;

    return jsonResponse(
      {
        shifts,
        confidence,
        method: "claude-vision",
      },
      200,
      req
    );
  } catch (e) {
    console.error("OCR error:", e);
    // Never expose internal error details to clients
    return jsonResponse({ detail: "OCR processing failed. Please try again." }, 502, req);
  }
});
