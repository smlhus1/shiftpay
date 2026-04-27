/**
 * Property-based tests for the pay calculation. Each `fc.assert` runs
 * the property over a large randomised input space; a single failure
 * prints a shrunk counterexample that names the bug exactly.
 *
 * See research/refactor/pass-4-business-logic.md §3 for the full
 * property catalogue. This file implements the highest-signal subset —
 * enough to catch the classes of bugs most likely to regress during
 * future refactors without slowing CI to a crawl.
 */

import fc from "fast-check";
import {
  calculateExpectedPay,
  calculateOvertimePay,
  shiftDurationHours,
  type Shift,
  type TariffRates,
} from "./calculations";

// Arbitrary generators shared across properties
const shiftType = fc.constantFrom(
  "tidlig" as const,
  "mellom" as const,
  "kveld" as const,
  "natt" as const
);

const timeString = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

// DD.MM.YYYY avoiding the date-rollover trap (day 1-28 covers every month).
const dateString = fc
  .tuple(
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 2023, max: 2032 })
  )
  .map(([d, m, y]) => `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`);

const shiftArb = fc.record({
  date: dateString,
  start_time: timeString,
  end_time: timeString,
  shift_type: shiftType,
}) as fc.Arbitrary<Shift>;

const ratesArb: fc.Arbitrary<TariffRates> = fc.record({
  base_rate: fc.double({ min: 100, max: 600, noNaN: true, noDefaultInfinity: true }),
  evening_supplement: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  night_supplement: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  weekend_supplement: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  holiday_supplement: fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }),
  overtime_supplement: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
});

describe("calculations — properties", () => {
  it("shiftDurationHours is always in [0, 24)", () => {
    fc.assert(
      fc.property(timeString, timeString, (start, end) => {
        const h = shiftDurationHours(start, end);
        return h >= 0 && h < 24;
      })
    );
  });

  it("pay is non-negative for non-negative rates", () => {
    fc.assert(
      fc.property(fc.array(shiftArb, { maxLength: 15 }), ratesArb, (shifts, rates) => {
        return calculateExpectedPay(shifts, rates) >= 0;
      })
    );
  });

  it("empty shifts array → zero pay for any rates", () => {
    fc.assert(fc.property(ratesArb, (rates) => calculateExpectedPay([], rates) === 0));
  });

  it("permutation invariance — order of shifts does not change pay", () => {
    fc.assert(
      fc.property(fc.array(shiftArb, { maxLength: 10 }), ratesArb, (shifts, rates) => {
        const reversed = [...shifts].reverse();
        const a = calculateExpectedPay(shifts, rates);
        const b = calculateExpectedPay(reversed, rates);
        // Single rounding at end means a reversed array can differ by at
        // most one cent due to the Math.round boundary.
        return Math.abs(a - b) <= 0.01;
      }),
      { numRuns: 200 }
    );
  });

  it("additivity — pay(A ++ B) ≈ pay(A) + pay(B) within one-cent tolerance", () => {
    fc.assert(
      fc.property(
        fc.array(shiftArb, { maxLength: 8 }),
        fc.array(shiftArb, { maxLength: 8 }),
        ratesArb,
        (a, b, rates) => {
          const combined = calculateExpectedPay([...a, ...b], rates);
          const split = calculateExpectedPay(a, rates) + calculateExpectedPay(b, rates);
          return Math.abs(combined - split) <= 0.02; // two rounding boundaries
        }
      ),
      { numRuns: 200 }
    );
  });

  it("monotonicity — higher base rate never lowers pay", () => {
    fc.assert(
      fc.property(
        fc.array(shiftArb, { minLength: 1, maxLength: 10 }),
        ratesArb,
        fc.double({ min: 1, max: 100, noNaN: true, noDefaultInfinity: true }),
        (shifts, rates, bump) => {
          const bumped = { ...rates, base_rate: rates.base_rate + bump };
          return calculateExpectedPay(shifts, bumped) >= calculateExpectedPay(shifts, rates);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("overtime scales linearly with minutes", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 600, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 480 }),
        (base_rate, overtime_supplement, minutes) => {
          const rates = { base_rate, overtime_supplement };
          const single = calculateOvertimePay([{ overtime_minutes: minutes }], rates);
          const doubled = calculateOvertimePay(
            [{ overtime_minutes: minutes }, { overtime_minutes: minutes }],
            rates
          );
          // Two shifts of N minutes = one shift of 2N minutes.
          return Math.abs(doubled - single * 2) <= 1e-6;
        }
      )
    );
  });

  it("zero-minute overtime = zero overtime pay regardless of rates", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }),
        (base, supp) =>
          calculateOvertimePay([{ overtime_minutes: 0 }], {
            base_rate: base,
            overtime_supplement: supp,
          }) === 0
      )
    );
  });
});
