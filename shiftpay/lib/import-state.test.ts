/**
 * Import-flow reducer tests. Drives the state machine directly so we
 * can freeze the transitions without mounting the screen.
 */

import {
  importReducer,
  initialImportState,
  type ImportAction,
  type ImportState,
  type SavedResult,
} from "./import-state";
import type { CsvRowResult } from "@/lib/csv";

const okRow = (date: string): CsvRowResult => ({
  ok: true,
  shift: { date, start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
});

const savedFixture: SavedResult = {
  scheduleId: "abc-123",
  shiftCount: 3,
  periodStart: "01.05.2026",
  periodEnd: "31.05.2026",
};

function play(actions: ImportAction[], from: ImportState = initialImportState): ImportState {
  return actions.reduce(importReducer, from);
}

describe("importReducer — happy paths", () => {
  it("OCR flow: initial → loading → review → calculate_done → save → saved", () => {
    const after = play([
      { type: "load_start", source: "ocr", progress: "1/3" },
      { type: "load_progress", progress: "2/3" },
      { type: "load_success", source: "ocr", rows: [okRow("01.05.2026"), okRow("02.05.2026")] },
      { type: "calculate_start" },
      { type: "calculate_done", expectedPay: 1234 },
      { type: "save_start" },
      { type: "save_success", result: savedFixture },
    ]);
    expect(after.phase.phase).toBe("saved");
    if (after.phase.phase === "saved") {
      expect(after.phase.result.shiftCount).toBe(3);
    }
    expect(after.error).toBeNull();
  });

  it("manual_start lands directly in review with empty rows + source=manual", () => {
    const after = importReducer(initialImportState, { type: "manual_start" });
    expect(after.phase.phase).toBe("review");
    if (after.phase.phase === "review") {
      expect(after.phase.source).toBe("manual");
      expect(after.phase.rows).toEqual([]);
      expect(after.phase.expectedPay).toBeNull();
      expect(after.phase.calculating).toBe(false);
    }
  });

  it("rows_update inside review updates rows and clears expectedPay", () => {
    const after = play([
      { type: "load_start", source: "csv" },
      { type: "load_success", source: "csv", rows: [okRow("01.05.2026")] },
      { type: "calculate_done", expectedPay: 999 },
      { type: "rows_update", rows: [okRow("02.05.2026"), okRow("03.05.2026")] },
    ]);
    expect(after.phase.phase).toBe("review");
    if (after.phase.phase === "review") {
      expect(after.phase.rows).toHaveLength(2);
      expect(after.phase.expectedPay).toBeNull();
    }
  });
});

describe("importReducer — errors and cancellations", () => {
  it("load_error returns to initial with banner error", () => {
    const after = play([
      { type: "load_start", source: "gallery" },
      { type: "load_error", error: "OCR boom" },
    ]);
    expect(after.phase.phase).toBe("initial");
    expect(after.error).toBe("OCR boom");
  });

  it("load_cancel returns silently to initial without an error", () => {
    const after = play([{ type: "load_start", source: "ocr" }, { type: "load_cancel" }]);
    expect(after.phase.phase).toBe("initial");
    expect(after.error).toBeNull();
  });

  it("load_success carries warning into the error banner without losing rows", () => {
    const after = importReducer(initialImportState, {
      type: "load_success",
      source: "csv",
      rows: [okRow("01.05.2026")],
      warning: "Some rows had bad data",
    });
    expect(after.phase.phase).toBe("review");
    expect(after.error).toBe("Some rows had bad data");
  });

  it("save_error returns from saving → review preserving rows for retry", () => {
    const after = play([
      { type: "load_start", source: "ocr" },
      { type: "load_success", source: "ocr", rows: [okRow("01.05.2026")] },
      { type: "calculate_done", expectedPay: 200 },
      { type: "save_start" },
      { type: "save_error", error: "DB write failed" },
    ]);
    expect(after.phase.phase).toBe("review");
    if (after.phase.phase === "review") {
      expect(after.phase.rows).toHaveLength(1);
      expect(after.phase.expectedPay).toBe(200);
      expect(after.phase.calculating).toBe(false);
    }
    expect(after.error).toBe("DB write failed");
  });
});

describe("importReducer — invariants", () => {
  it("load_progress is ignored outside the loading phase", () => {
    const before = play([
      { type: "load_start", source: "ocr" },
      { type: "load_success", source: "ocr", rows: [okRow("01.05.2026")] },
    ]);
    const after = importReducer(before, { type: "load_progress", progress: "noisy" });
    expect(after).toBe(before); // identity — no copy on no-op
  });

  it("calculate_start is ignored outside the review phase", () => {
    const after = importReducer(initialImportState, { type: "calculate_start" });
    expect(after).toBe(initialImportState);
  });

  it("save_start is ignored outside the review phase", () => {
    const after = importReducer(initialImportState, { type: "save_start" });
    expect(after).toBe(initialImportState);
  });

  it("rows_update is ignored outside the review phase", () => {
    const before: ImportState = {
      phase: { phase: "loading", source: "ocr", progress: null },
      error: null,
    };
    const after = importReducer(before, { type: "rows_update", rows: [okRow("01.05.2026")] });
    expect(after).toBe(before);
  });

  it("clear_error preserves the phase", () => {
    const before = play([
      { type: "load_start", source: "ocr" },
      { type: "load_error", error: "x" },
    ]);
    const after = importReducer(before, { type: "clear_error" });
    expect(after.phase.phase).toBe("initial");
    expect(after.error).toBeNull();
  });

  it("reset_to_initial wipes everything", () => {
    const before = play([
      { type: "load_start", source: "csv" },
      { type: "load_success", source: "csv", rows: [okRow("01.05.2026")] },
    ]);
    const after = importReducer(before, { type: "reset_to_initial" });
    expect(after).toEqual(initialImportState);
  });
});
