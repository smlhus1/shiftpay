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

  it("treats equal start/end as zero-hour shift", () => {
    expect(shiftDurationHours("08:00", "08:00")).toBe(0);
  });

  it("handles a shift ending at midnight 00:00 via wrap", () => {
    expect(shiftDurationHours("05:00", "00:00")).toBe(19);
  });

  it("returns 0 for malformed time strings (garbage-in = zero-out)", () => {
    // NaN no longer leaks through — Number.isFinite guard floors to 0.
    expect(shiftDurationHours("abc", "def")).toBe(0);
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

  it("adds holiday supplement on 17. mai (Grunnlovsdagen, default additive policy)", () => {
    const shifts: Shift[] = [
      { date: "17.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 17.05.2026 is Sunday + Grunnlovsdagen.
    // Additive: 8 h × (250 base + 35 weekend + 100 holiday) = 8 × 385 = 3080
    expect(calculateExpectedPay(shifts, baseRates)).toBe(3080);
  });

  it("'replace' policy lets holiday supplement replace weekend on same day", () => {
    const shifts: Shift[] = [
      { date: "17.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // Replace: holiday wins over weekend. 8 × (250 + 100) = 2800
    expect(calculateExpectedPay(shifts, baseRates, "replace")).toBe(2800);
  });

  it("'max' policy picks the larger of holiday/weekend supplements", () => {
    const shifts: Shift[] = [
      { date: "17.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // Max of {weekend 35, holiday 100} = 100. 8 × (250 + 100) = 2800.
    expect(calculateExpectedPay(shifts, baseRates, "max")).toBe(2800);
  });

  it("applies holiday supplement on 25. desember regardless of weekday (additive)", () => {
    // 25.12.2026 is a Friday. No weekend supplement, just holiday.
    const shifts: Shift[] = [
      { date: "25.12.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 8 × (250 + 100) = 2800
    expect(calculateExpectedPay(shifts, baseRates)).toBe(2800);
  });

  it("'replace' policy applies weekend supplement when no holiday (line 131)", () => {
    // 02.05.2026 is a Saturday and NOT a holiday.
    const shifts: Shift[] = [
      { date: "02.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 8 × (250 + 35) = 2280
    expect(calculateExpectedPay(shifts, baseRates, "replace")).toBe(2280);
  });

  it("'replace' policy adds no day-supplement on a weekday non-holiday", () => {
    // 04.05.2026 is a Monday and NOT a holiday.
    const shifts: Shift[] = [
      { date: "04.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 8 × 250 = 2000
    expect(calculateExpectedPay(shifts, baseRates, "replace")).toBe(2000);
  });

  it("'max' policy applies weekend supplement when no holiday", () => {
    const shifts: Shift[] = [
      { date: "02.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // Max of {weekend 35} = 35. 8 × (250 + 35) = 2280.
    expect(calculateExpectedPay(shifts, baseRates, "max")).toBe(2280);
  });

  it("'max' policy skips day-supplement on a weekday non-holiday", () => {
    const shifts: Shift[] = [
      { date: "04.05.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ];
    // 8 × 250 = 2000
    expect(calculateExpectedPay(shifts, baseRates, "max")).toBe(2000);
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
      calculateOvertimePay([{ overtime_minutes: 60 }], { base_rate: 250, overtime_supplement: 50 })
    ).toBe(375);
  });

  it("sums across multiple shifts", () => {
    // 30 + 90 = 120 min = 2 h × 375 kr/h = 750
    expect(
      calculateOvertimePay([{ overtime_minutes: 30 }, { overtime_minutes: 90 }], {
        base_rate: 250,
        overtime_supplement: 50,
      })
    ).toBe(750);
  });
});
