/**
 * Brand constructor tests. The brand types themselves carry zero runtime
 * weight — what matters is that the constructors reject bad input. These
 * tests freeze the contract.
 */

import { makeMinutes, makeOre, makeShiftDate, makeShiftTime, makeUuid } from "./brands";

describe("makeShiftDate", () => {
  it("accepts a valid DD.MM.YYYY date", () => {
    expect(makeShiftDate("17.05.2026")).toBe("17.05.2026");
  });

  it("trims surrounding whitespace", () => {
    expect(makeShiftDate("  02.05.2026 ")).toBe("02.05.2026");
  });

  it.each([
    ["wrong separator", "17/05/2026"],
    ["short year", "17.05.26"],
    ["letters", "ab.cd.efgh"],
    ["empty", ""],
    ["only spaces", "   "],
  ])("rejects %s (%s)", (_label, raw) => {
    expect(() => makeShiftDate(raw)).toThrow(/Invalid ShiftDate/);
  });

  it("rejects rollover dates that JS would silently accept", () => {
    // new Date(2026, 1, 31) === 03.03.2026 — must be rejected.
    expect(() => makeShiftDate("31.02.2026")).toThrow(/not a real date/);
    expect(() => makeShiftDate("30.02.2026")).toThrow(/not a real date/);
    expect(() => makeShiftDate("29.02.2025")).toThrow(/not a real date/); // 2025 not a leap year
  });

  it("accepts 29.02 only on leap years", () => {
    expect(makeShiftDate("29.02.2024")).toBe("29.02.2024");
    expect(() => makeShiftDate("29.02.2023")).toThrow(/not a real date/);
  });

  it("rejects years outside 2000–2100", () => {
    expect(() => makeShiftDate("01.01.1999")).toThrow(/year out of range/);
    expect(() => makeShiftDate("01.01.2101")).toThrow(/year out of range/);
  });
});

describe("makeShiftTime", () => {
  it.each(["00:00", "06:30", "12:00", "23:59"])("accepts %s", (raw) => {
    expect(makeShiftTime(raw)).toBe(raw);
  });

  it.each([
    ["24:00 (out of range)", "24:00"],
    ["12:60 (out of range)", "12:60"],
    ["7:00 (no padding)", "7:00"],
    ["letters", "ab:cd"],
    ["empty", ""],
  ])("rejects %s", (_label, raw) => {
    expect(() => makeShiftTime(raw)).toThrow(/Invalid ShiftTime/);
  });
});

describe("makeMinutes", () => {
  it("accepts integers, including negatives and zero", () => {
    expect(makeMinutes(0)).toBe(0);
    expect(makeMinutes(60)).toBe(60);
    expect(makeMinutes(-30)).toBe(-30);
  });

  it("rejects non-integers and non-finite values", () => {
    expect(() => makeMinutes(1.5)).toThrow(/finite integer/);
    expect(() => makeMinutes(NaN)).toThrow(/finite integer/);
    expect(() => makeMinutes(Infinity)).toThrow(/finite integer/);
  });
});

describe("makeOre", () => {
  it("accepts non-negative integers", () => {
    expect(makeOre(0)).toBe(0);
    expect(makeOre(12345)).toBe(12345);
  });

  it("rejects negative values", () => {
    expect(() => makeOre(-1)).toThrow(/non-negative/);
  });

  it("rejects fractions and NaN", () => {
    expect(() => makeOre(1.5)).toThrow(/finite integer/);
    expect(() => makeOre(NaN)).toThrow(/finite integer/);
  });
});

describe("makeUuid", () => {
  it("accepts a v4 UUID", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(makeUuid(id)).toBe(id);
  });

  it("accepts upper-case", () => {
    const id = "550E8400-E29B-41D4-A716-446655440000";
    expect(makeUuid(id)).toBe(id);
  });

  it.each([
    ["wrong version (v1)", "550e8400-e29b-11d4-a716-446655440000"],
    ["bad variant", "550e8400-e29b-41d4-1716-446655440000"],
    ["truncated", "550e8400-e29b-41d4-a716"],
    ["empty", ""],
  ])("rejects %s", (_label, raw) => {
    expect(() => makeUuid(raw)).toThrow(/Invalid Uuid/);
  });
});
