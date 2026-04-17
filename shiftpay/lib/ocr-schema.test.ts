/**
 * Tests for the Valibot OCR schema used at the client-side boundary of
 * lib/api.ts. Keep these assertions identical in semantic to any server-
 * side tests of the mirrored schema in supabase/functions/ocr/schema.ts.
 */
import * as v from "valibot";
import { OcrResponseSchema, OcrShiftSchema } from "./ocr-schema";

describe("OcrShiftSchema", () => {
  it("accepts a well-formed shift", () => {
    const result = v.safeParse(OcrShiftSchema, {
      date: "02.03.2026",
      start_time: "08:00",
      end_time: "16:00",
      shift_type: "tidlig",
      confidence: 0.95,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a shift without confidence (optional field)", () => {
    const result = v.safeParse(OcrShiftSchema, {
      date: "02.03.2026",
      start_time: "08:00",
      end_time: "16:00",
      shift_type: "tidlig",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["2026-03-02", "ISO date format is NOT accepted"],
    ["2/3/2026", "slashes not accepted"],
    ["02.03.26", "2-digit year not accepted"],
    ["", "empty string"],
  ])("rejects invalid date format: %s (%s)", (date) => {
    const result = v.safeParse(OcrShiftSchema, {
      date,
      start_time: "08:00",
      end_time: "16:00",
      shift_type: "tidlig",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["8:5", "minutes need two digits"],
    ["08:00:00", "seconds not allowed"],
    ["", "empty string"],
  ])("rejects bad time format: %s (%s)", (start_time) => {
    const result = v.safeParse(OcrShiftSchema, {
      date: "02.03.2026",
      start_time,
      end_time: "16:00",
      shift_type: "tidlig",
    });
    expect(result.success).toBe(false);
  });

  // NB: schema regex is syntactic only — "25:00" passes the HH:MM regex
  // even though no day has hour 25. calculations.ts is the range gate.
  it("accepts syntactically valid but semantically wrong hour (schema is not the range gate)", () => {
    const result = v.safeParse(OcrShiftSchema, {
      date: "02.03.2026",
      start_time: "25:00",
      end_time: "16:00",
      shift_type: "tidlig",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown shift_type (typo or made-up values)", () => {
    const result = v.safeParse(OcrShiftSchema, {
      date: "02.03.2026",
      start_time: "08:00",
      end_time: "16:00",
      shift_type: "dag", // not in the enum
    });
    expect(result.success).toBe(false);
  });
});

describe("OcrResponseSchema", () => {
  it("parses a full server response", () => {
    const result = v.safeParse(OcrResponseSchema, {
      shifts: [
        {
          date: "02.03.2026",
          start_time: "08:00",
          end_time: "16:00",
          shift_type: "tidlig",
          confidence: 0.9,
        },
      ],
      confidence: 0.9,
      method: "claude-vision",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.shifts).toHaveLength(1);
    }
  });

  it("rejects response with missing shifts array", () => {
    const result = v.safeParse(OcrResponseSchema, {
      confidence: 0.9,
      method: "claude-vision",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown method string", () => {
    const result = v.safeParse(OcrResponseSchema, {
      shifts: [],
      confidence: 0,
      method: "gpt-4-vision", // not one of the allowed literals
    });
    expect(result.success).toBe(false);
  });
});
