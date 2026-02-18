/**
 * Pay calculation logic — used in Phase 2.
 * Stub for now.
 */

export type ShiftType = "tidlig" | "mellom" | "kveld" | "natt";

export interface Shift {
  date: string;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  confidence?: number;
}

export interface TariffRates {
  base_rate: number;
  evening_supplement: number;
  night_supplement: number;
  weekend_supplement: number;
  holiday_supplement: number;
}

export function calculateExpectedPay(
  _shifts: Shift[],
  _rates: TariffRates
): number {
  return 0;
}
