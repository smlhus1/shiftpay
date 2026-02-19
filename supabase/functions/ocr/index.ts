// ShiftPay OCR — Supabase Edge Function (Claude Haiku 4.5 Vision only, no Tesseract)
// Model ID from https://docs.anthropic.com/en/docs/models-overview (Claude Haiku 4.5)
// Deploy: supabase functions deploy ocr --no-verify-jwt && supabase secrets set ANTHROPIC_API_KEY=...

import { encodeBase64 } from "jsr:@std/encoding/base64";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ detail: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonResponse({ detail: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get("file");
    if (!f || !(f instanceof File)) {
      return jsonResponse({ detail: "Missing or invalid file in form field 'file'" }, 400);
    }
    file = f;
  } catch {
    return jsonResponse({ detail: "Invalid multipart body" }, 400);
  }

  if (file.size > MAX_FILE_BYTES) {
    return jsonResponse({ detail: "File too large (max 5MB)" }, 400);
  }
  let mime = (file.type?.toLowerCase() || "").trim();
  if (!mime || !mime.startsWith("image/")) mime = "image/jpeg";
  if (mime === "image/jpg") mime = "image/jpeg";
  if (!ALLOWED_TYPES.includes(mime)) {
    return jsonResponse({ detail: "Only image/jpeg and image/png allowed" }, 400);
  }

  const buf = await file.arrayBuffer();
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
      return jsonResponse({ detail: "Empty response from Claude" }, 502);
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

    const data = JSON.parse(jsonStr) as {
      shifts?: Array<{
        date: string;
        start_time: string;
        end_time: string;
        shift_type: string;
        confidence?: number;
      }>;
      notes?: string;
    };
    const shifts = (data.shifts ?? []).map((s) => ({
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      shift_type: s.shift_type,
      confidence: Math.min(1, Math.max(0, Number(s.confidence) || 0.85)),
    }));

    const confidence = shifts.length
      ? shifts.reduce((a, s) => a + s.confidence, 0) / shifts.length
      : 0;

    return jsonResponse({
      shifts,
      confidence,
      method: "claude-vision",
    });
  } catch (e) {
    console.error("OCR error:", e);
    const message = e instanceof Error ? e.message : "Claude Vision API error";
    return jsonResponse({ detail: message }, 502);
  }
});
