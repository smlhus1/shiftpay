/**
 * Baseline tests for lib/dates.ts.
 * Freezes current behaviour — including one known bug (Pass 4 fixes).
 */
import {
  parseDateSafe,
  parseDateTimeSafe,
  dateToComparable,
  displayToIso,
  isoToDisplay,
} from "./dates";

describe("parseDateSafe", () => {
  it("parses a valid DD.MM.YYYY date", () => {
    const d = parseDateSafe("02.03.2026");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2); // JS month 0-indexed
    expect(d!.getDate()).toBe(2);
  });

  it("returns null on wrong format", () => {
    expect(parseDateSafe("2026-03-02")).toBeNull();
    expect(parseDateSafe("02/03/2026")).toBeNull();
    expect(parseDateSafe("02.03")).toBeNull();
  });

  it("returns null on out-of-range year", () => {
    expect(parseDateSafe("01.01.1999")).toBeNull();
    expect(parseDateSafe("01.01.2101")).toBeNull();
  });

  it("returns null on out-of-range month/day", () => {
    expect(parseDateSafe("32.13.2026")).toBeNull();
    expect(parseDateSafe("00.01.2026")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(parseDateSafe("  02.03.2026  ")).not.toBeNull();
  });

  // BUG (Pass 4): parseDateSafe accepts 31.02.2026 and silently rolls over to 03.03.2026
  // because `new Date(2026, 1, 31)` JS auto-rollover passes !isNaN.
  it("accepts invalid rollover date 31.02.2026 (BUG — Pass 4 fixes)", () => {
    const d = parseDateSafe("31.02.2026");
    expect(d).not.toBeNull();
    // Silently rolls over to March 3
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(3);
  });
});

describe("dateToComparable", () => {
  it("converts DD.MM.YYYY to YYYY-MM-DD", () => {
    expect(dateToComparable("02.03.2026")).toBe("2026-03-02");
    expect(dateToComparable("17.05.2026")).toBe("2026-05-17");
  });

  it("pads single-digit month and day", () => {
    expect(dateToComparable("01.01.2026")).toBe("2026-01-01");
  });

  it("preserves lexical sort order for same-year dates", () => {
    const a = dateToComparable("02.03.2026");
    const b = dateToComparable("15.03.2026");
    const c = dateToComparable("01.04.2026");
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });
});

describe("displayToIso / isoToDisplay", () => {
  it("converts DD.MM.YYYY → YYYY-MM-DD", () => {
    expect(displayToIso("02.03.2026")).toBe("2026-03-02");
    expect(displayToIso("17.05.2026")).toBe("2026-05-17");
  });

  it("converts YYYY-MM-DD → DD.MM.YYYY", () => {
    expect(isoToDisplay("2026-03-02")).toBe("02.03.2026");
    expect(isoToDisplay("2026-05-17")).toBe("17.05.2026");
  });

  it("is idempotent — passing the wrong direction returns input unchanged", () => {
    expect(displayToIso("2026-03-02")).toBe("2026-03-02");
    expect(isoToDisplay("02.03.2026")).toBe("02.03.2026");
  });

  it("round-trips on every well-formed display date", () => {
    expect(isoToDisplay(displayToIso("01.01.2026"))).toBe("01.01.2026");
    expect(displayToIso(isoToDisplay("2026-12-31"))).toBe("2026-12-31");
  });

  it("trims whitespace", () => {
    expect(displayToIso("  02.03.2026  ")).toBe("2026-03-02");
    expect(isoToDisplay("  2026-03-02  ")).toBe("02.03.2026");
  });
});

describe("parseDateTimeSafe", () => {
  it("combines a DD.MM.YYYY date with an HH:MM time", () => {
    const d = parseDateTimeSafe("02.03.2026", "14:30");
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  it("returns null on invalid date", () => {
    expect(parseDateTimeSafe("32.13.2026", "14:30")).toBeNull();
  });

  it("returns null on out-of-range hour", () => {
    expect(parseDateTimeSafe("02.03.2026", "25:00")).toBeNull();
  });

  // BUG (Pass 4): NaN-valued time components slip past the `h == null` check and
  // produce an invalid Date. A strict isNaN guard or `Number.isInteger` fixes it.
  it("returns an invalid Date for non-numeric time components (BUG — Pass 4 fixes)", () => {
    const d = parseDateTimeSafe("02.03.2026", "ab:cd");
    expect(d).toBeInstanceOf(Date);
    expect(Number.isNaN(d!.getTime())).toBe(true);
  });

  it("handles 00:00 as midnight", () => {
    const d = parseDateTimeSafe("02.03.2026", "00:00");
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(0);
  });

  it("handles 23:59 as last minute of day", () => {
    const d = parseDateTimeSafe("02.03.2026", "23:59");
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(23);
    expect(d!.getMinutes()).toBe(59);
  });
});
