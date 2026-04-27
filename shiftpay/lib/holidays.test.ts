/**
 * Holidays tests — validated against timeanddate.com's published
 * holiday calendar for Norway 2020-2035. Easter dates cross-checked
 * with the Roman Catholic/Protestant calendar table.
 */
import { computeEasterSunday, getHolidayFor, holidaysInYear, isHoliday } from "./holidays";

describe("computeEasterSunday", () => {
  // Authoritative Easter Sunday dates (Gregorian calendar) for common years
  // used as sanity anchors. Expand if bugs sneak in.
  it.each([
    [2020, 4, 12],
    [2021, 4, 4],
    [2022, 4, 17],
    [2023, 4, 9],
    [2024, 3, 31],
    [2025, 4, 20],
    [2026, 4, 5],
    [2027, 3, 28],
    [2028, 4, 16],
    [2029, 4, 1],
    [2030, 4, 21],
    [2031, 4, 13],
    [2032, 3, 28],
    [2033, 4, 17],
    [2034, 4, 9],
    [2035, 3, 25],
  ])("Easter %d = %d.%d", (year, month, day) => {
    expect(computeEasterSunday(year)).toEqual({ month, day });
  });
});

describe("holidaysInYear", () => {
  it("produces 12 nasjonale helligdager per year (5 fixed + 7 Easter-anchored)", () => {
    // Note: Sunday is NOT counted as a helligdag here — that is a tariff-
    // level distinction (weekend supplement, not holiday supplement).
    expect(holidaysInYear(2026)).toHaveLength(12);
  });

  it("includes the fixed Norwegian set for any year", () => {
    const names = holidaysInYear(2026).map((h) => h.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Nyttårsdag",
        "Offentlig høytidsdag",
        "Grunnlovsdagen",
        "1. juledag",
        "2. juledag",
        "Skjærtorsdag",
        "Langfredag",
        "1. påskedag",
        "2. påskedag",
        "Kristi himmelfartsdag",
        "1. pinsedag",
        "2. pinsedag",
      ])
    );
  });
});

describe("getHolidayFor / isHoliday", () => {
  // Anchor dates validated against timeanddate.com — Norway 2026.
  it.each([
    ["01.01.2026", "Nyttårsdag"],
    ["02.04.2026", "Skjærtorsdag"],
    ["03.04.2026", "Langfredag"],
    ["05.04.2026", "1. påskedag"],
    ["06.04.2026", "2. påskedag"],
    ["01.05.2026", "Offentlig høytidsdag"],
    ["14.05.2026", "Kristi himmelfartsdag"],
    ["17.05.2026", "Grunnlovsdagen"],
    ["24.05.2026", "1. pinsedag"],
    ["25.05.2026", "2. pinsedag"],
    ["25.12.2026", "1. juledag"],
    ["26.12.2026", "2. juledag"],
  ])("2026: %s is %s", (dateStr, name) => {
    const holiday = getHolidayFor(dateStr);
    expect(holiday).not.toBeNull();
    expect(holiday?.name).toBe(name);
    expect(isHoliday(dateStr)).toBe(true);
  });

  it("returns null for an ordinary weekday", () => {
    expect(getHolidayFor("15.03.2026")).toBeNull();
    expect(isHoliday("15.03.2026")).toBe(false);
  });

  it("returns null on parse failure without throwing", () => {
    expect(getHolidayFor("")).toBeNull();
    expect(getHolidayFor("not a date")).toBeNull();
    expect(getHolidayFor("31.13.2026")).toBeNull();
  });

  it("correctly handles leap-year Easter movement (2024 early Easter)", () => {
    // 2024 Easter = 31.03.2024 → Skjærtorsdag = 28.03.2024
    expect(getHolidayFor("28.03.2024")?.name).toBe("Skjærtorsdag");
  });

  it("17. mai 2026 is both Sunday AND Grunnlovsdagen (holiday wins in the policy layer)", () => {
    // The calendar doesn't decide stacking. It just reports "this IS a
    // holiday". calculations.ts decides whether holiday replaces weekend.
    expect(isHoliday("17.05.2026")).toBe(true);
  });
});
