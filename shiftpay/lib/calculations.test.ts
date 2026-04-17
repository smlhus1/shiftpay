/**
 * Baseline tests for lib/calculations.ts.
 *
 * Purpose: freeze current behaviour so Pass 1–6 refactors detect regressions.
 * Known bugs (to be fixed in Pass 4) are documented with it.todo or comments
 * — they match current behaviour, not desired behaviour.
 */
import {
  calculateExpectedPay,
  calculateOvertimePay,
  shiftDurationHours,
  type Shift,
  type TariffRates,
} from "./calculations";

const baseRates: TariffRates = {
  base_rate: 250,
  evening_supplement: 22,
  night_supplement: 45,
  weekend_supplement: 35,
  holiday_supplement: 100, // BUG (Pass 4): never applied in calculateExpectedPay
  overtime_supplement: 50,
};

describe("shiftDurationHours", () => {
  it("computes a simple day shift", () => {
    expect(shiftDurationHours("08:00", "16:00")).toBe(8);
  });

  it("computes a part-hour shift", () => {
    expect(shiftDurationHours("08:00", "08:30")).toBe(0.5);
  });

  it("handles overnight shifts by adding 24 h", () => {
    expect(shiftDurationHours("22:00", "06:00")).toBe(8);
  });

  it("treats equal start/end as 24-hour shift (current behaviour — Pass 4 will revisit)", () => {
    expect(shiftDurationHours("08:00", "08:00")).toBe(24);
  });

  it("handles a shift ending at midnight 00:00 via wrap", () => {
    expect(shiftDurationHours("05:00", "00:00")).toBe(19);
  });

  // BUG (Pass 4): malformed times produce NaN because Number("abc") = NaN bypasses
  // the `??` fallback (?? only catches null/undefined, not NaN). Any pay computed
  // from such a shift is also NaN.
  it("returns NaN for malformed time strings (BUG — Pass 4 fixes)", () => {
    expect(Number.isNaN(shiftDurationHours("abc", "def"))).toBe(true);
  });
});

describe("calculateExpectedPay", () => {
  it("returns 0 for empty shift list", () => {
    expect(calculateExpectedPay([], baseRates)).toBe(0);
  });

  it("prices a weekday morning (tidlig) shift at base rate only", () => {
    const shifts: Shift[] = [
      { date: "02.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 8 h × 250 kr = 2000 kr; Monday, no supplements
    expect(calculateExpectedPay(shifts, baseRates)).toBe(2000);
  });

  it("adds evening supplement for kveld shifts", () => {
    const shifts: Shift[] = [
      { date: "02.03.2026", start_time: "16:00", end_time: "22:00", shift_type: "kveld" },
    ];
    // 6 h × (250 + 22) = 6 × 272 = 1632
    expect(calculateExpectedPay(shifts, baseRates)).toBe(1632);
  });

  it("adds night supplement for natt shifts", () => {
    const shifts: Shift[] = [
      { date: "02.03.2026", start_time: "22:00", end_time: "06:00", shift_type: "natt" },
    ];
    // 8 h × (250 + 45) = 8 × 295 = 2360
    expect(calculateExpectedPay(shifts, baseRates)).toBe(2360);
  });

  it("adds weekend supplement on Saturday", () => {
    const shifts: Shift[] = [
      { date: "07.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 2026-03-07 is a Saturday
    // 8 h × (250 + 35) = 8 × 285 = 2280
    expect(calculateExpectedPay(shifts, baseRates)).toBe(2280);
  });

  it("stacks night + weekend supplements additively", () => {
    const shifts: Shift[] = [
      { date: "07.03.2026", start_time: "22:00", end_time: "06:00", shift_type: "natt" },
    ];
    // Saturday night: 8 × (250 + 45 + 35) = 8 × 330 = 2640
    expect(calculateExpectedPay(shifts, baseRates)).toBe(2640);
  });

  it("sums multiple shifts", () => {
    const shifts: Shift[] = [
      { date: "02.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
      { date: "03.03.2026", start_time: "16:00", end_time: "22:00", shift_type: "kveld" },
    ];
    expect(calculateExpectedPay(shifts, baseRates)).toBe(2000 + 1632);
  });

  // BUG (Pass 4): holiday_supplement is not consumed. 17. mai = Friday, pays base only.
  it("does NOT add holiday supplement on 17. mai (BUG — Pass 4 fixes)", () => {
    const shifts: Shift[] = [
      { date: "17.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 17.05.2026 is a Sunday; only the weekend supplement kicks in, not holiday
    // Sunday: 8 × (250 + 35) = 2280
    expect(calculateExpectedPay(shifts, baseRates)).toBe(2280);
  });

  it("rounds to 2 decimal places", () => {
    const shifts: Shift[] = [
      { date: "02.03.2026", start_time: "08:00", end_time: "08:07", shift_type: "tidlig" },
    ];
    // 7 min = 0.11666... h × 250 = 29.16666... → rounds to 29.17
    expect(calculateExpectedPay(shifts, baseRates)).toBe(29.17);
  });
});

describe("calculateOvertimePay", () => {
  it("returns 0 for zero overtime", () => {
    expect(
      calculateOvertimePay([{ overtime_minutes: 0 }], { base_rate: 250, overtime_supplement: 50 })
    ).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(calculateOvertimePay([], { base_rate: 250, overtime_supplement: 50 })).toBe(0);
  });

  it("computes overtime with % supplement", () => {
    // 60 min = 1 h × (250 × 1.5) = 375
    expect(
      calculateOvertimePay(
        [{ overtime_minutes: 60 }],
        { base_rate: 250, overtime_supplement: 50 }
      )
    ).toBe(375);
  });

  it("sums across multiple shifts", () => {
    // 30 + 90 = 120 min = 2 h × 375 kr/h = 750
    expect(
      calculateOvertimePay(
        [{ overtime_minutes: 30 }, { overtime_minutes: 90 }],
        { base_rate: 250, overtime_supplement: 50 }
      )
    ).toBe(750);
  });
});
