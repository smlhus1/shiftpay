/**
 * Import-flow state machine.
 *
 * The screen has five distinct life-cycle phases (initial → loading →
 * review → saving → saved) plus a transient `calculating` sub-state
 * inside review. Modelled as a discriminated union so impossible states
 * (e.g. "loading" with rows present) cannot be expressed.
 *
 * Error is kept orthogonal: it can appear alongside ANY phase, since
 * the screen's banner renders independently of the body. clearing it is
 * an explicit action.
 *
 * Lives in its own file so tests can drive the reducer directly without
 * mounting the screen.
 */

import type { CsvRowResult } from "@/lib/csv";

export type ImportSource = "ocr" | "manual" | "gallery" | "csv";

export interface SavedResult {
  scheduleId: string;
  shiftCount: number;
  periodStart: string;
  periodEnd: string;
}

export type ImportPhase =
  | { phase: "initial" }
  | { phase: "loading"; source: ImportSource; progress: string | null }
  | {
      phase: "review";
      source: ImportSource;
      rows: CsvRowResult[];
      expectedPay: number | null;
      calculating: boolean;
    }
  | {
      phase: "saving";
      source: ImportSource;
      rows: CsvRowResult[];
      expectedPay: number | null;
    }
  | { phase: "saved"; result: SavedResult };

export interface ImportState {
  phase: ImportPhase;
  /** Banner-style error/warning. Shown above every phase except the
   *  body of saved-success. Cleared explicitly via clear_error. */
  error: string | null;
}

export const initialImportState: ImportState = {
  phase: { phase: "initial" },
  error: null,
};

export type ImportAction =
  | { type: "load_start"; source: ImportSource; progress?: string | null }
  | { type: "load_progress"; progress: string }
  | { type: "load_success"; source: ImportSource; rows: CsvRowResult[]; warning?: string | null }
  | { type: "load_error"; error: string }
  /** Cancelled by user (e.g. file picker dismissed). Returns to whatever
   *  the previous useful state was — currently always 'initial'. */
  | { type: "load_cancel" }
  | { type: "manual_start" }
  | { type: "rows_update"; rows: CsvRowResult[] }
  | { type: "calculate_start" }
  | { type: "calculate_done"; expectedPay: number; warning?: string | null }
  | { type: "save_start" }
  | { type: "save_success"; result: SavedResult }
  | { type: "save_error"; error: string }
  | { type: "reset_to_initial" }
  | { type: "clear_error" };

/**
 * Pure state-transition function. No side effects. Tests freeze the
 * intended transitions; the screen's action handlers are the only place
 * that talks to the network/DB.
 */
export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case "load_start":
      return {
        phase: {
          phase: "loading",
          source: action.source,
          progress: action.progress ?? null,
        },
        error: null,
      };

    case "load_progress":
      // Only meaningful while loading — ignore otherwise so a stale event
      // can't smuggle a phase change.
      if (state.phase.phase !== "loading") return state;
      return {
        ...state,
        phase: { ...state.phase, progress: action.progress },
      };

    case "load_success":
      return {
        phase: {
          phase: "review",
          source: action.source,
          rows: action.rows,
          expectedPay: null,
          calculating: false,
        },
        error: action.warning ?? null,
      };

    case "load_error":
      return { phase: { phase: "initial" }, error: action.error };

    case "load_cancel":
      return { phase: { phase: "initial" }, error: null };

    case "manual_start":
      return {
        phase: {
          phase: "review",
          source: "manual",
          rows: [],
          expectedPay: null,
          calculating: false,
        },
        error: null,
      };

    case "rows_update":
      // Only meaningful while reviewing. Updates clear expectedPay since
      // the previous calculation no longer matches the rows.
      if (state.phase.phase !== "review") return state;
      return {
        ...state,
        phase: { ...state.phase, rows: action.rows, expectedPay: null },
      };

    case "calculate_start":
      if (state.phase.phase !== "review") return state;
      return {
        ...state,
        phase: { ...state.phase, calculating: true },
        error: null,
      };

    case "calculate_done":
      if (state.phase.phase !== "review") return state;
      return {
        phase: {
          ...state.phase,
          expectedPay: action.expectedPay,
          calculating: false,
        },
        error: action.warning ?? null,
      };

    case "save_start":
      if (state.phase.phase !== "review") return state;
      return {
        phase: {
          phase: "saving",
          source: state.phase.source,
          rows: state.phase.rows,
          expectedPay: state.phase.expectedPay,
        },
        error: null,
      };

    case "save_success":
      return { phase: { phase: "saved", result: action.result }, error: null };

    case "save_error":
      // Stay on the review/saving phase so the user can retry without
      // losing their edits.
      if (state.phase.phase === "saving") {
        return {
          phase: {
            phase: "review",
            source: state.phase.source,
            rows: state.phase.rows,
            expectedPay: state.phase.expectedPay,
            calculating: false,
          },
          error: action.error,
        };
      }
      return { ...state, error: action.error };

    case "reset_to_initial":
      return initialImportState;

    case "clear_error":
      return { ...state, error: null };
  }
}
