# Known limitations — pay calculation

This document captures the parts of pay calculation ShiftPay does **not**
get right (yet), so that users can sanity-check the result against their
payslip and contributors know where the deferred work lives.

> ShiftPay is built around the principle that **the user owns the rates**.
> The numbers we compute are only as accurate as the supplements you put
> in. Use the calculation as a baseline — not as a substitute for the
> tariff document your union or employer publishes.

## Half-day eves (julaften, nyttårsaften, etc.)

The Norwegian holiday calendar treats four "halve helligdager" as red
days only after 12:00 (or 14:00 in a few tariffs):

- Onsdag før skjærtorsdag
- Pinseaften
- Julaften (24. desember)
- Nyttårsaften (31. desember)

ShiftPay currently treats these as **regular weekdays** (no holiday
supplement). A shift that starts at 14:00 on julaften will pay the
weekday rate, not the holiday rate.

**Why deferred:** the cutover hour varies between tariffs (NSF/KS uses
12:00; others use 14:00), and "did this shift start before or after the
cutover" needs UI for the user to declare which tariff they're on. That's
a Pass 5+ scope.

**Workaround:** override the `holiday_supplement` field manually on those
days, or split the shift in two and tag the after-cutover half differently
(future shift-tagging UI).

## Non-Norway holidays

Pass 4 ships only the Norwegian fixed-date and Easter-anchored helligdager
in `lib/holidays.ts`. The holiday-supplement settings UI is locale-aware
(translations exist in nb/en/sv/da), but the **calendar itself is
hard-coded to Norway**.

A Swedish nurse using ShiftPay will:

- See "1. maj" treated as a regular Friday (not a holiday).
- See "Midsommardagen" and "Trettondedag jul" treated as regular days.
- See "1. mai" (the Norwegian fixed-date holiday on the same date) treated
  as a holiday — which is *technically* still correct for Sweden, by
  coincidence.

**Why deferred:** building a multi-country holiday table is a research
task in itself (calendars are split by region — e.g. Allehelgensdag falls
on different days in NO/SE), and the v1 user is a Norwegian healthcare
worker.

**Workaround:** Swedish users can use the calculation as-is and override
the result manually for known SE-only holidays. We will revisit this when
the user pool justifies it.

## Integer-øre arithmetic deferred

The master plan called for an integer-øre rewrite of `calculateExpectedPay`
in Pass 4. We chose **single-round-at-output** in float instead, because:

1. Property-based tests (permutation invariance, additivity) stay green
   with single-round; the compound-rounding anti-pattern is what causes
   drift, not float per se.
2. Integer-øre adds a `× 100` and a brand-cast at every call-site — no
   user-visible benefit in MVP, where the largest realistic monthly pay
   total is ≈80 000 NOK and float64 has 15 digits of precision before any
   accumulation matters.
3. The `Ore` brand and `makeOre` constructor land in this pass anyway, so
   the type system is ready for a future migration with no API churn.

If the property tests ever surface a real rounding bug, the migration
path is clean: convert at `calculations.ts` boundaries, leave the call-
sites alone.

## DST is calculated, not adjusted

`lib/dst.ts` exposes `dstAdjustmentMinutes(date, start, end)` returning
the signed minute correction for shifts that bracket a Europe/Oslo DST
transition. **The calculator does not yet apply it** — `calculateExpectedPay`
still computes duration as `endMin − startMin` (with the +24h overnight
fix) and ignores the DST correction.

A 22:00→06:00 shift on the Saturday before spring-forward in March will
overpay by one hour. A 22:00→06:00 shift on the Saturday before fall-back
in October will underpay by one hour. Both errors are bounded to
+/- 1 × hourly_rate per shift, twice per year.

**Why deferred:** wiring the adjustment into the calculator is a one-line
change inside `shiftDurationHours`. Doing it now without an end-to-end
test that exercises a real-clock DST shift on a real device risks shipping
a regression we can't verify before the competition. The helper is in
place; the wiring lands in Pass 4c if it's worth fixing in the
competition window, otherwise post-launch.

**Workaround:** users with a DST-bracket shift can manually subtract /
add one hour from the expected pay total for the affected month.

## What ShiftPay does correctly

For completeness, the things to **trust**:

- Shift-type supplements (kveld / natt) per the user-set rate.
- Weekend supplement (Saturday + Sunday).
- Holiday supplement (Norwegian helligdager + Easter-anchored, 2020-2035
  table-tested).
- Stacking policy (additive / replace / max — user-selectable).
- Overtime supplement (separate rate, pure linear scaling per minute).
- Round-trip date validation (31.02 is rejected, leap years are correct).
- All math runs with a single rounding at output to ~øre precision.
