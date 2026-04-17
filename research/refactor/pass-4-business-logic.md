# Pass 4 Research: Business Logic Correctness — Pay Math, Dates, Holidays, Testing

> Researched: 2026-04-16 | Sources consulted: 25+ | Confidence: High (technical) / Medium (NO labor-law edge cases, because primary tariff text requires union-rep interpretation)

## TL;DR

The current `calculations.ts` is functionally correct for the happy path but is a minefield for four classes of bugs: (1) JS `Date`'s silent DST mishandling of overnight shifts at the March/October transitions, (2) float-based money math that accumulates rounding errors across many shifts, (3) no concept of Norwegian helligdager (the `holiday_supplement` field exists in the schema but is never applied), and (4) supplement-stacking rules that almost certainly do not match what NSF/KS/Spekter tariffs actually say. The recommended direction is: minor-unit integer arithmetic (øre) for money, a pure string-based time model (no `Date` in hot paths) plus one vetted holiday lookup, branded TypeScript types to make invalid states unrepresentable, and a fast-check property suite that asserts structural invariants (non-negativity, linearity, permutation-invariance) against a deterministic clock. Temporal is attractive but not worth the polyfill cost for this app today — revisit in 12 months.

## Current state (what the code does today)

Verified by reading `shiftpay/lib/calculations.ts`, `shiftpay/lib/dates.ts`, `shiftpay/lib/format.ts`:

- **Shift duration:** Parses HH:MM into minutes, adds 24h if `end <= start`. No timezone involvement — pure arithmetic on local-clock minutes. This is actually the most correct choice available in JS today (see DST section), but it's implicit and unlabeled.
- **Weekend:** Uses `new Date(y, m-1, d).getDay()` — this constructs a `Date` in the device's local time zone, which is *fine* for pure day-of-week checks on a DD.MM.YYYY calendar date, but adds a subtle trap: on a device set to a non-Norwegian TZ, the answer could drift if the code ever touched UTC conversion.
- **Supplement stacking:** `kveld` → base + evening_supplement; `natt` → base + night_supplement; `tidlig`/`mellom` → base. Weekend supplement stacks additively on top of any of the above. Holiday supplement is **defined in the interface but never used** (silent dead field).
- **Overtime:** Computed independently via `calculateOvertimePay`. Uses `base_rate * (1 + overtime_supplement/100)` — note the semantic shift: here `overtime_supplement` is a *percentage* (50 means 50%), while `evening_supplement` etc. are *absolute kroner per hour*. This inconsistency is unlabeled and undocumented.
- **Rounding:** Single final `Math.round(total * 100) / 100` at the end. All intermediate math is float. This is the classic "many small errors compound before rounding" anti-pattern.
- **Date parsing:** `parseDateSafe` validates ranges but doesn't catch `31.02.2026` (since `new Date(2026, 1, 31)` silently becomes `03.03.2026`). The `!Number.isNaN` check passes. This is a real latent bug.

## 1. Date/time libraries for RN/Expo in 2026

| Library | Bundle (min+gz) | TZ support | Hermes/RN | Verdict for ShiftPay |
|---|---|---|---|---|
| **date-fns v4** | ~14 KB (typical tree-shaken) | First-class via `@date-fns/tz` (TZDate + `tz` helper) since v4.0 (Sept 2024) | Works; pure JS, no native deps | Good fit if we want library support |
| **Day.js** | ~2 KB base | Plugin-based, IANA TZ via plugin adds weight | Works; smallest footprint | Fine for display formatting, weak for correctness-critical math |
| **Luxon** | ~23 KB | Best-in-class; built on `Intl` | Works on Hermes (since Hermes got Intl); but Hermes still defaults TZ to "UTC" unless you set it explicitly | Heaviest; overkill for shift math |
| **Temporal polyfill** | ~34–100 KB depending on polyfill choice | Native-quality TZ model | Works on Hermes V1 (RN 0.84+, Feb 2026) but has not been battle-tested in shipped apps | Correct long-term bet, wrong for this app today |

**Key data points gathered:**
- Temporal advanced to Stage 4 at TC39's March 2026 meeting. Firefox 139 (May 2025) and Chrome 144 (Jan 2026) ship it natively. Safari has it behind a flag.
- React Native 0.84 (Feb 11, 2026) makes Hermes V1 the default engine. Hermes supports `Intl.*` but `Intl.DateTimeFormat`'s timezone on Hermes defaults to UTC, which is the footgun that breaks many RN apps.
- date-fns v4 added first-class TZ via `@date-fns/tz` TZDate + `tz()` helpers (no major breaking changes from v3).
- dinero.js v2.0 stable shipped on March 2, 2026 (after ~17 alpha releases and a multi-year rewrite).

**Recommendation for ShiftPay:** Keep the pure-string model (HH:MM, DD.MM.YYYY) that `dates.ts` already uses. Do **not** introduce a heavyweight date library. Add date-fns v4 only if we need `addDays`, `differenceInDays`, or locale-aware `format` — and pull only those functions via named imports so tree-shaking stays aggressive. Defer Temporal until 2027 when the polyfill cost disappears for most users.

## 2. Temporal proposal — migration horizon

- Stage 4 as of March 2026 meeting → will ship in ECMAScript 2026 spec.
- Native browser support: FF 139+, Chrome 144+. Safari in TP. Node: behind flag.
- Polyfills: `temporal-polyfill` (faster, more compact, currently ~34 KB) vs `@js-temporal/polyfill` (canonical reference implementation, larger). Both have near-complete API coverage.
- Hermes has no native Temporal yet and no announced timeline; polyfill is the only path on RN.
- **Migration horizon for ShiftPay:** earliest viable native-or-near-native adoption is ~Q2 2027. Design interfaces *so that migration is mechanical* (wrap `Date` + minute math behind a thin adapter module), but don't adopt Temporal in Pass 4.

## 3. Property-based testing with fast-check — concrete properties for pay math

fast-check is the de-facto JS library (Jest/Vitest compatible, TS types, built-in shrinking). Key built-in arbitraries: `fc.date()`, `fc.integer()`, `fc.float()`, `fc.record()`, `fc.array()`, `fc.tuple()`, plus combinators `fc.oneof()`, `fc.option()`, `fc.constant()`, `fc.chain()`.

Below is the concrete property list to implement in `shiftpay/lib/__tests__/calculations.prop.test.ts`. Each is framed so a failure points directly at a bug class.

### 3.1 Non-negativity

```
∀ shifts, rates (all rate fields ≥ 0) → calculateExpectedPay(shifts, rates) ≥ 0
∀ shifts → calculateOvertimePay(shifts, rates) ≥ 0
```
Catches sign-flip bugs in supplement subtraction, overflow wraparounds, and NaN propagation (NaN is not ≥ 0).

### 3.2 Zero-hours ⇒ zero pay

```
∀ shifts where every shift has start_time == end_time → calculateExpectedPay = 0
```
Note the subtle interaction with overnight-wrap: the current code treats `end <= start` as overnight, so `08:00 → 08:00` becomes 24h, not 0. **This is a bug we should fix first** (define equal times as 0-hour shift, not 24-hour).

### 3.3 Linearity in hours (monotonicity)

```
∀ shift s, rates → for any extension of end_time by k minutes (same date, no DST cross):
    pay(s with end+k) ≥ pay(s with end)
```
Catches broken duration calc (negative durations, off-by-one at midnight, incorrect wrap).

### 3.4 Permutation invariance / order independence

```
∀ shifts[], rates → calculateExpectedPay(shifts, rates) == calculateExpectedPay(shuffle(shifts), rates)
```
Catches accidental stateful reducers, date-based ordering dependencies, and mutation bugs.

### 3.5 Additivity (linearity in shift list)

```
∀ shifts1[], shifts2[], rates
 → calculateExpectedPay(shifts1 ++ shifts2, rates)
   == calculateExpectedPay(shifts1, rates) + calculateExpectedPay(shifts2, rates)
   (within one-cent rounding tolerance: |diff| ≤ 0.01)
```
Catches any "first/last shift is special" bugs and floating-point accumulation issues. The tolerance bound itself is a property: if it ever needs to be >0.01 we have a rounding design flaw.

### 3.6 Scaling (homogeneity)

```
∀ shifts, rates, k ∈ ℕ → pay(shifts, scaleRates(rates, k)) == k * pay(shifts, rates)   (within tolerance)
∀ shifts, rates, k ∈ ℕ → pay(repeat(shifts, k), rates)     == k * pay(shifts, rates)   (within tolerance)
```
Catches non-linear bugs like `round` placed inside loops.

### 3.7 Idempotence of pure functions

```
∀ date string d → parseDateSafe(formatDate(parseDateSafe(d))) == parseDateSafe(d)
∀ shift s → shiftDurationHours(s.start, s.end) called twice returns same value
```

### 3.8 Rate-component monotonicity

```
∀ shifts, rates, rates' where every field of rates' ≥ rates (field-wise)
 → pay(shifts, rates') ≥ pay(shifts, rates)
```
Catches a broken "maximum of" instead of "sum" in stacking logic, or supplement subtraction.

### 3.9 Weekend classification is day-of-week only

```
∀ DD.MM.YYYY d → isWeekend(d) ⇔ dayOfWeek(d) ∈ {0, 6}
∀ d → isWeekend(d) independent of device timezone (run the property twice with different TZ mocks, compare results)
```

### 3.10 Overnight shift accounting

```
∀ (start, end) where end-clock < start-clock (overnight)
 → duration > 0 AND duration < 24
 → duration == (1440 - start_minutes + end_minutes) / 60
```

### 3.11 Holiday triumphs weekend (once implemented)

```
∀ shift on a date that is BOTH holiday and weekend
 → pay uses holiday_supplement, not weekend_supplement (or both, depending on policy)
```
This makes the stacking policy an explicit testable decision.

### 3.12 Rounding stability

```
∀ shifts → pay is a multiple of 0.01 (two decimal places)
∀ shifts, rates → |pay - referenceImpl(shifts, rates)| ≤ 0.01
```
Where `referenceImpl` is a minor-unit integer implementation.

### 3.13 Rounding is half-even ("bankers"), not half-up

Assert via handcrafted corner cases (7.865 → 7.86, 7.875 → 7.88). Not a property but a table-driven test that pairs with the property suite.

## 4. Decimal/money arithmetic

### The float trap

`2090.5 * 8.61 === 17999.20499999999...` in JS (actual IEEE-754 result) — should be `17999.205`. In pay math this manifests as: two shifts computed separately then summed can differ from the same shifts summed in a different order by 1 øre. Property 3.4 (permutation invariance) will catch this reliably.

### Library options (2026)

| Lib | Status | Size | Verdict |
|---|---|---|---|
| **Integer øre (hand-rolled)** | No dep | 0 KB | **Best for ShiftPay**. All rates in ore (multiply by 100 on input), all math in BigInt or safe integers, divide by 100 only at display. Property 3.5 becomes trivially true. |
| **dinero.js v2.0** | Stable (March 2, 2026) | ~4 KB tree-shaken | Great API, 166 currencies. But adds dependency, and its scale/currency concepts are overkill when we already know everything is NOK/SEK/etc. |
| **big.js** | Mature | ~6 KB | Generic arbitrary-precision. Use for cryptocurrency or unknown-scale math. Overkill here. |
| **currency.js** | Mature | ~1 KB | Lightweight, integer-backed. Reasonable middle ground. |

**Recommendation:** Hand-rolled integer øre arithmetic inside `calculations.ts`. Store all rates in the DB as REAL but convert to integer øre on read; do all math in a single function boundary; round once on output. This is ~20 lines of code and zero dependencies.

### Rounding policy

`Intl.NumberFormat` supports `roundingMode: "halfEven"` (bankers) and `"halfExpand"` (half-up). Norwegian convention for wages is **half-up** (matematisk avrunding). Half-even is used in some banking contexts but employees expect 7.875 → 7.88, not 7.88 (even) or 7.87 (odd-depending). Pick half-up explicitly, document it, and test it.

## 5. Norwegian holiday calculation

### The helligdager set (nasjonale)

Fixed:
- 1. januar (Nyttårsdag)
- 1. mai (Offentlig høytidsdag — "arbeidernes dag")
- 17. mai (Grunnlovsdagen / Constitution Day)
- 25. desember (1. juledag)
- 26. desember (2. juledag)

Moveable (Easter-anchored):
- Skjærtorsdag = Easter Sunday − 3
- Langfredag = Easter Sunday − 2
- 1. påskedag = Easter Sunday
- 2. påskedag = Easter Sunday + 1
- Kristi himmelfartsdag = Easter Sunday + 39
- 1. pinsedag = Easter Sunday + 49
- 2. pinsedag = Easter Sunday + 50

Also red on the calendar:
- All Sundays (but these don't trigger holiday_supplement in tariffs; they trigger weekend_supplement)

### Half-days (from 12:00)

Under most Norwegian tariffs (including KS hovedtariffavtalen), the following give holiday supplement **only from 12:00** (onsdag før skjærtorsdag, pinseaften, julaften, nyttårsaften are NOT red days, but 133 1/3% applies to work after 12:00 if in the relevant tariff). ShiftPay must model either (a) treat these as "half-holiday" and split the shift, or (b) include them with a calendar-level flag. **Scope decision for MVP: skip half-days; flag as known limitation.**

### Easter calculation (Gauss / Butcher)

```
a = year mod 19
b = year div 100
c = year mod 100
d = b div 4
e = b mod 4
f = (b + 8) div 25
g = (b − f + 1) div 3
h = (19a + b − d − g + 15) mod 30
i = c div 4
k = c mod 4
l = (32 + 2e + 2i − h − k) mod 7
m = (a + 11h + 22l) div 451
month = (h + l − 7m + 114) div 31
day = ((h + l − 7m + 114) mod 31) + 1
```
Pure integer math, no Date involvement, testable against a hardcoded table for 2000–2099.

### Library options

- **holidays-norway** (npm, gunnar2k/holidays-norway): MIT, handles moveable holidays, but shows "limited active development" (23 commits, no releases, 1 open PR). Risk: stale.
- **date-holidays** (generic multi-country): heavier, pulls in data for all countries, too much weight for a Norway-only app.
- **Hand-roll it**: ~30 lines of TypeScript, testable, zero deps, zero security surface.

**Recommendation:** Hand-roll `lib/holidays.ts` with Gauss algorithm + the fixed list. Write a table test covering 2020–2030. If we ever need Swedish/Danish holidays for the sv/da locales, extend then. The full set is small enough (12 dates per year) that the property tests can be exhaustive over a 50-year range.

## 6. Overnight shifts + DST edge cases

### Europe/Oslo DST transitions

- **Spring forward (last Sunday of March):** 02:00 local jumps to 03:00. A night shift 22:00 → 06:00 that crosses this boundary is **7 clock hours but 7 worked hours** (or 7, depending on tariff — most tariffs pay actual worked hours, so 7). The current `shiftDurationHours()` returns 8 because it does pure clock-minute arithmetic. **This overpays by 1 hour.**
- **Fall back (last Sunday of October):** 03:00 local returns to 02:00. A night shift 22:00 → 06:00 is **9 worked hours**. Current code returns 8. **This underpays by 1 hour.**

Hits 2 days per year at most. For a nurse who works ~50 night shifts per year, probability of hitting a DST night in a given month ≈ 1/6 in March/October months. Low-frequency but material (1-hour error at night rate is real money).

### Fix options

1. **Ignore it (document as known issue):** acceptable for MVP given wife-validation on non-DST shifts.
2. **Compute duration in UTC via Temporal/date-fns TZDate:** most correct, most complex, and depends on device TZ being right.
3. **Detect DST transition date and adjust by ±60 minutes:** hand-roll a `isDstTransitionNight(date)` helper. Low complexity, testable, no dependency.

**Recommendation:** Option 3. Add `dstAdjustmentMinutes(shift) : -60 | 0 | +60` computed from the shift date against a small Europe/Oslo DST table (2020–2035, regenerable from Gauss-like rules). Document the Nordic locale expansion as needing per-locale DST tables.

### Other overnight edge cases

- Shift exactly 24 hours: 08:00 → 08:00 next day. Currently returns 24 but marks as 0-hour because `end <= start` condition. **Actual bug — fix by adding explicit duration input or by encoding this as "overnight yes/no" flag.**
- Shift longer than 24h (data-entry error): currently wraps silently. Add a validation: if computed duration > 16h, return a `ShiftValidationError`.
- Shift ending exactly at midnight (05:00 → 00:00): `00:00` parses to 0 minutes, so `end <= start` triggers wrap, returning 19h. **Correct behaviour but only by accident.** Add explicit test.

## 7. Supplement stacking — what the tariffs actually say

This is the hardest area to get right, because *the tariffs are ambiguous and local interpretation is required*. Primary sources (NSF, KS, Spekter) confirmed:

### Core rates (minimums, KS HTA 2024–2026)

- **Weekend (lørdag 00:00 → søndag 24:00):** min 22% of hourly wage OR min NOK 70/hour (whichever is higher).
- **Night (21:00–06:00, shift workers):** min 25% OR min NOK 70/hour.
- **Evening (17:00 to start of night):** min 28% OR min NOK 70/hour (Spekter shift).
- **Holiday (red days 00:00–24:00):** 133 1/3% of hourly wage as supplement (this is "one-and-a-third times regular pay *on top of* the regular hour).
- **Half-day eves (onsdag før skjærtorsdag, pinseaften, julaften, nyttårsaften, from 12:00):** 133 1/3% supplement for the afternoon portion.

### Stacking — what's documented and what's not

- **NSF's own FAQ page explicitly says the stacking rules are not documented in the tariff text** and refer to local tillitsvalgt for clarification. (Source: nsf.no/arbeidsvilkar/arbeid-pa-kveld-natt-son-og-helgedager — fetched.)
- **What is documented:** supplements are computed from `timelønn = årslønn / 1900` (or `/ (52 × weekly hours)`). Calculation basis = grunnlønn, excluding other tillegg.
- **Virke/HK carve-out:** no evening/night/weekend supplement on hours for which overtime OR shift-allowance is paid — i.e., no double-dipping with overtime. Similar exclusions exist in most tariffs.
- **Industry consensus (from union FAQ + tariff text):** weekend supplement + night supplement generally stack *additively* for a Saturday night shift. Holiday supplement replaces weekend supplement (not additive), because holiday is the "stronger" red-day category. Overtime is calculated separately on top, NOT by adding overtime% to base-plus-supplements.

### Implication for ShiftPay model

The current code has one material bug already: `holiday_supplement` is declared but never applied. Even if we ignore stacking subtleties, we should at minimum:

1. Detect holiday via the Norwegian calendar.
2. On a holiday: use holiday supplement INSTEAD OF weekend supplement (even if the holiday falls on a weekend — most red days are Sunday-adjacent and the math would double-count).
3. On a holiday: stacking with evening/night is user-configurable (default additive, with a settings toggle "Helligdagstillegg erstatter alle andre tillegg" for tariff compliance with more conservative interpretations).
4. Overtime stays isolated: overtime pay = base_rate × (1 + overtime%) × overtime_hours. No supplement layering.

**Document this as an explicit policy table in a new `lib/tariff-policy.ts`, so the rules are visible, not hidden in branching.**

## 8. Deterministic testing

### Controlling "now" in tests

- **vitest / jest:** `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-03-29T22:00:00+01:00'))` covers DST transition nights for tests.
- **MockDate** (npm): older, still works, simpler API — one-liner `MockDate.set('2026-03-29')`.
- **Temporal pattern:** if/when we migrate, all "now" reads go through a single `clock()` function that tests override; this pattern is available today without Temporal — just wrap `new Date()` in a `Clock` interface and inject it.

**Recommendation:** Introduce a `Clock` interface (one-liner `type Clock = () => Date`) injected into any function that reads current time. For MVP only `notifications.ts` and parts of `dashboard` need this; pay math is already deterministic from inputs.

## 9. Date parsing robustness

Current `parseDateSafe`:
- Accepts `31.02.2026` as valid and silently rolls to `03.03.2026` (JS Date constructor's auto-rollover). **Real bug.**
- Accepts `32.13.2026` and returns null. **Correct.**
- Accepts `1.1.2026` (single-digit) and returns `01.01.2026`. **Possibly wanted, probably not.**

Fix: after `new Date(y, m-1, d)`, verify `date.getDate() === d && date.getMonth() === m-1 && date.getFullYear() === y`. This is the standard JS "strict date parsing" idiom and catches all Feb-30-style bugs.

`parseDateTimeSafe` has the same issue plus a mutation smell: `date.setHours(...)` mutates the parsed `Date`. Harmless here, but inconsistent with the pure style of the rest of the file.

For DD.MM.YYYY parsing, **avoid `Intl.DateTimeFormat.formatToParts()`** for round-tripping — Hermes historically broke this API (removed in 0.77, reverted in 0.74/0.76 per RN release notes). Hand-rolled regex parsing is safer.

## 10. Currency formatting

Current `format.ts` uses `Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(Math.round(amount))`.

Issues:
- `maximumFractionDigits: 0` means we display `kr 1 234` instead of `kr 1 234,50`. For a pay auditor, ørene matter. **Recommend `maximumFractionDigits: 2, minimumFractionDigits: 2`.**
- Hermes Intl on RN 0.84 has known gaps on some older iOS versions — the existing try/catch fallback is good defensive coding.
- Rounding mode is unspecified (defaults to half-expand for `Math.round`, half-even for Intl with `roundingMode: "halfEven"`). Pin it explicitly.

## 11. Branded types — making invalid states unrepresentable

TypeScript is structural. Today `string` is used for date, time, shift_type, UUID, currency, locale. This means any string can flow anywhere. Branded types fix this:

```
type ShiftDate = string & { __brand: 'ShiftDate' };    // DD.MM.YYYY
type ShiftTime = string & { __brand: 'ShiftTime' };    // HH:MM (00:00–23:59)
type Minutes   = number & { __brand: 'Minutes' };
type OreAmount = number & { __brand: 'OreAmount' };    // integer øre
type CurrencyCode = 'NOK' | 'SEK' | 'DKK' | 'EUR' | 'GBP';
```

Constructors (`makeShiftDate`, `makeShiftTime`) validate and brand; they're the only path into these types. Every downstream function then gets free compile-time guarantees: `shiftDurationHours(start: ShiftTime, end: ShiftTime) : Minutes` cannot accidentally be called with UUIDs or user-typed free text.

- **Library options:** `type-brandy`, `effect/Brand`, Zod's `.brand()`. All fine; `ts-brand` is the minimal option.
- **Recommendation:** Roll by hand — branded types in TS are a one-line type alias. Add Zod later if we need runtime schema validation from untrusted sources (already partially in place for OCR response).

## Properties to test with fast-check — checklist

Implement in this order (rough effort after Pass 4 refactor):

1. Non-negativity of pay (property 3.1) — 1h
2. Permutation invariance (3.4) — 1h (will catch float rounding right away)
3. Additivity (3.5) — 1h
4. Scaling/homogeneity (3.6) — 1h
5. Rate monotonicity (3.8) — 1h
6. Overnight duration bounds (3.10) — 2h (includes edge cases around DST dates)
7. Weekend-day-only, timezone-invariant (3.9) — 2h (requires TZ mocking)
8. Rounding stability (3.12) — 2h (requires reference integer impl)
9. Date-parse idempotence (3.7) — 1h
10. Holiday-triumphs-weekend (3.11) — 2h (post-holiday implementation)

Total: ~14 hours of test work, shrinking to hours once patterns are in place. Each property catches an entire bug class.

## Gotchas & considerations

- **Hermes Intl default TZ = UTC unless explicitly set.** If we ever use `new Date().toLocaleString('nb-NO')` we'll get UTC-based times on iOS/Android. Safer: keep pure string math.
- **expo-sqlite stores REAL:** rates in DB are float. On read, multiply by 100 and round to int before any calculation.
- **Overtime semantic:** current `overtime_supplement` is a % but `evening_supplement` etc. are absolute kroner. This is confusing and should either be renamed (`overtime_multiplier_pct`) or homogenised to all-percent. Percent-based is closer to tariff norms (22%, 25%, 28%, 133 1/3%).
- **`holiday_supplement` is dead code.** Fix this first — it's the single most user-visible correctness gap.
- **`getDay()` returns 0=Sunday, 6=Saturday.** Current code correctly checks `day === 0 || day === 6`. Good. But on locales where week starts on Monday, future code might naively use `day === 5 || day === 6` — document with a comment.
- **Wife-validation:** the stacking policy should be verified against her actual payslip from a helligdag night-shift. That's a single data point but high-signal. Build the settings UI to let her (and beta users) toggle "stacking: additive / replace / max" so mismatches can be diagnosed.
- **"ØRE, not øre":** the Norwegian minor unit. All monetary types should be integer øre. Name the type `OreAmount` — it's self-documenting.
- **No holiday_supplement DB migration needed** — it's already in the schema, just not consumed.

## Recommendations (concrete for Pass 4)

1. **Add `lib/holidays.ts`**: hand-rolled, Gauss + fixed list, 2020–2035 table-tested, returns `isHoliday(date: ShiftDate): HolidayInfo | null`.
2. **Add branded types** in `lib/brands.ts`: `ShiftDate`, `ShiftTime`, `Minutes`, `OreAmount`.
3. **Rewrite `calculateExpectedPay`** to use integer-øre arithmetic end-to-end. Single rounding at output.
4. **Fix `parseDateSafe`** to reject rollover dates via round-trip check.
5. **Wire `holiday_supplement`** into the stacking logic. Policy default: holiday replaces weekend, evening/night stacks additively on holiday base.
6. **Add DST adjustment** helper: `dstAdjustmentMinutes(date: ShiftDate, start: ShiftTime, end: ShiftTime): Minutes`. Table-based for Europe/Oslo.
7. **Add fast-check property suite** (10 properties above). Run in CI (even though no CI exists today — add a one-liner `npm test` that runs Vitest).
8. **Introduce a `Clock` type** (`type Clock = () => Date`) so tests can control "now".
9. **Expose policy as config**: `settings.tsx` gets a "Stacking policy" section with help text and three options (replace / additive / max). Default = additive for Spekter/KS, replace for stricter tariffs.
10. **Document known limitations** (DST transition, half-day eves, locale-agnostic holiday table for non-Norway locales) in a `docs/known-limitations.md`.

## Sources

1. [Temporal proposal at TC39 / Stage 4 announcement](https://socket.dev/blog/tc39-advances-temporal-to-stage-4) — confirms Stage 4 in March 2026 meeting.
2. [JavaScript Temporal in 2026 - Bryntum blog](https://bryntum.com/blog/javascript-temporal-is-it-finally-here/) — browser support matrix, polyfill status.
3. [React Native 0.84 blog — Hermes V1 by default (Feb 2026)](https://reactnative.dev/blog/2026/02/11/react-native-0.84) — Hermes/RN engine landscape.
4. [Expo docs — Using Hermes](https://docs.expo.dev/guides/using-hermes/) — Intl availability on Hermes.
5. [date-fns v4.0 release announcement](https://blog.date-fns.org/v40-with-time-zone-support/) — first-class TZ support via `@date-fns/tz`.
6. [date-fns vs Day.js vs Luxon 2026 comparison - PkgPulse](https://www.pkgpulse.com/blog/best-javascript-date-libraries-2026) — bundle sizes and feature matrix.
7. [Dinero.js v2 is out! - Sarah Dayan blog](https://www.sarahdayan.com/blog/dinerojs-v2-is-out) — v2.0 stable shipped March 2026.
8. [fast-check docs](https://fast-check.dev/docs/introduction/getting-started/) — arbitraries, `fc.property`, shrinking.
9. [fast-check examples repo](https://github.com/dubzzz/fast-check-examples) — real property-based test cases.
10. [Handle Money in JavaScript - DEV article by Benjamin Renoux](https://dev.to/benjamin_renoux/financial-precision-in-javascript-handle-money-without-losing-a-cent-1chc) — float traps, integer-cents pattern, dinero/big.js comparison.
11. [currency.js homepage](https://currency.js.org/) — lightweight alternative pattern.
12. [KS — Beregning av tilleggslønn fra 1.1.2023](https://www.ks.no/fagomrader/lonn-og-tariff/hovedtariffavtalen/beregning-av-tilleggslonn-fra-1-1-2023/) — hourly-wage basis, 1900-hour divisor, 22% weekend rule.
13. [NSF — Arbeid på kveld, natt, søn- og helgedager](https://www.nsf.no/arbeidsvilkar/arbeid-pa-kveld-natt-son-og-helgedager) — rate ranges across Spekter/KS/Virke, stacking ambiguity.
14. [Spekter — 2.3 Kvelds- og nattillegg](https://www.spekter.no/lonn-og-tariff/tariffavtaler/forbundsvise-avtaledeler-a2/overenskomstens-del-a2-unio/overenskomstens-del-a2-omrade-10/2-3-kvelds-og-nattillegg) — 28% min or kr 70/h for Spekter.
15. [Delta.no — Skal du jobbe på røde dager?](https://www.delta.no/dine-rettigheter/skal-du-jobbe-rode-dager) — 133 1/3% holiday supplement details.
16. [LO Stat — §16 Helge- og høytidsdager](https://www.lostat.no/lonn-og-avtaler/lonn-og-avtaler-i-staten/hovedtariffavtalen/3-fellesbestemmelsene/16-helge-og-hoytidsdager) — half-day eves rule for staten.
17. [Virke — Røde dager / helligdagstillegg](https://www.virke.no/arbeidsgiverstotte/arbeidstid-overtid/helligdager) — Virke tariff holiday rules.
18. [Lovdata — Lov om helligdager og helligdagsfred](https://lovdata.no/lov/1995-02-24-12) — statutory holiday list.
19. [TimeandDate — Offentlige fridager i Norge 2026](https://www.timeanddate.no/merkedag/norge/2026) — authoritative date table for 2026.
20. [holidays-norway npm/GitHub](https://github.com/gunnar2k/holidays-norway) — reference implementation, MIT, limited maintenance.
21. [GeeksForGeeks — Gauss Easter algorithm in JS](https://www.geeksforgeeks.org/dsa/how-to-calculate-the-easter-date-for-a-given-year-using-gauss-algorithm/) — canonical algorithm.
22. [@dintero/money npm](https://www.npmjs.com/package/@dintero/money) — Norwegian locale money lib (no-NB), øre-aware.
23. [Branded Types in TypeScript - Learning TypeScript](https://www.learningtypescript.com/articles/branded-types) — pattern and idiom.
24. [Europe/Oslo DST table - timezoneconverter](https://www.timezoneconverter.com/cgi-bin/zoneinfo?tz=Europe/Oslo) — transition dates reference.
25. [MDN Intl.NumberFormat — roundingMode option](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat) — half-even vs half-expand behaviour.
