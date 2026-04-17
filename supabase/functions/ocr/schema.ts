/**
 * Valibot schema for the OCR response body.
 *
 * Shared contract between this Deno edge function and shiftpay's
 * lib/api.ts. Client mirrors the same types in shiftpay/lib/ocr-schema.ts —
 * keep the two in sync (they intentionally duplicate the shape; Metro
 * cannot reach across the supabase/ directory from the RN bundle root).
 *
 * Parse result is trusted downstream. Any mismatch against the shape below
 * causes a 502 from the server or a thrown Error from the client — never
 * a silently-shaped "result" that looks valid but isn't.
 */

import * as v from "npm:valibot@^1";

// DD.MM.YYYY — DD, MM, and YYYY. No stricter range-check here (calculator
// catches invalid dates). Leaving lenient means OCR noise becomes a parse
// failure we can bubble to the UI instead of a silent miscalculation.
const DateString = v.pipe(
  v.string(),
  v.regex(/^\d{1,2}\.\d{1,2}\.\d{4}$/, "Expected DD.MM.YYYY")
);

// HH:MM — single- or double-digit hour, always two-digit minute.
const TimeString = v.pipe(v.string(), v.regex(/^\d{1,2}:\d{2}$/, "Expected HH:MM"));

const ShiftType = v.union([
  v.literal("tidlig"),
  v.literal("mellom"),
  v.literal("kveld"),
  v.literal("natt"),
]);

export const OcrShiftSchema = v.object({
  date: DateString,
  start_time: TimeString,
  end_time: TimeString,
  shift_type: ShiftType,
  // Server floor/caps to [0, 1]; this just requires it's a number if present.
  confidence: v.optional(v.number()),
});

export const OcrResponseSchema = v.object({
  shifts: v.array(OcrShiftSchema),
  confidence: v.number(),
  method: v.union([
    v.literal("claude-vision"),
    v.literal("vision"),
    v.literal("tesseract"),
  ]),
});

/** Raw Claude output shape before validation — what we get from the LLM. */
export const ClaudeRawShiftSchema = v.object({
  date: v.string(),
  start_time: v.string(),
  end_time: v.string(),
  shift_type: v.string(),
  confidence: v.optional(v.union([v.number(), v.string()])),
});
export const ClaudeRawOutputSchema = v.object({
  shifts: v.optional(v.array(ClaudeRawShiftSchema)),
  notes: v.optional(v.nullable(v.string())),
});

export type OcrShift = v.InferOutput<typeof OcrShiftSchema>;
export type OcrResponse = v.InferOutput<typeof OcrResponseSchema>;
