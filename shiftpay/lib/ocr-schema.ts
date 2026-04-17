/**
 * Client-side Valibot schema for the OCR response body.
 *
 * Shared contract with the Supabase edge function in
 * supabase/functions/ocr/schema.ts — keep the two files in sync. The
 * duplication is intentional: Metro cannot reach across to supabase/
 * from the RN bundle root, and Deno cannot import RN code without
 * transpile shims. Two small mirrored files are cheaper than either
 * toolchain workaround.
 *
 * Any response that fails this schema throws a descriptive Error from
 * postOcr(), which the import UI surfaces as a generic "OCR failed"
 * with a retry button. A drifted schema is thus a visible bug, not a
 * silent corruption of the imported shifts.
 */

import * as v from "valibot";

const DateString = v.pipe(v.string(), v.regex(/^\d{1,2}\.\d{1,2}\.\d{4}$/, "Expected DD.MM.YYYY"));

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
  confidence: v.optional(v.number()),
});

export const OcrResponseSchema = v.object({
  shifts: v.array(OcrShiftSchema),
  confidence: v.number(),
  method: v.union([v.literal("claude-vision"), v.literal("vision"), v.literal("tesseract")]),
});

export type OcrShift = v.InferOutput<typeof OcrShiftSchema>;
export type OcrResponse = v.InferOutput<typeof OcrResponseSchema>;
