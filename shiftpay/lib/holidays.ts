/**
 * Norwegian holidays — nasjonale helligdager.
 *
 * Single source of truth for "was this shift worked on a red day". Pure
 * computation — no libraries, no network, no DB. The Gauss algorithm
 * computes Easter Sunday from the year; all Easter-anchored holidays
 * (skjærtorsdag, langfredag, 2. påskedag, Kristi himmelfart, pinse) are
 * offsets from there.
 *
 * Fixed-date holidays live in FIXED_HOLIDAYS and are merged in by
 * isHoliday(). Half-day eves (onsdag før skjærtorsdag, pinseaften,
 * julaften, nyttårsaften) are NOT included — those kick in only after
 * 12:00 under most tariffs and are out of scope for MVP (documented in
 * docs/known-limitations.md).
 *
 * Validated against 2020-2035 via table tests.
 */

export interface Holiday {
  /** Norwegian name of the holiday. */
  name: string;
  /** Year component, matching the input date. */
  year: number;
  /** 1–12, matching the input date's month. */
  month: number;
  /** 1–31, matching the input date's day. */
  day: number;
}

/** Fixed-date holidays that fall on the same (month, day) every year. */
const FIXED_HOLIDAYS: readonly { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: "Nyttårsdag" },
  { month: 5, day: 1, name: "Offentlig høytidsdag" },
  { month: 5, day: 17, name: "Grunnlovsdagen" },
  { month: 12, day: 25, name: "1. juledag" },
  { month: 12, day: 26, name: "2. juledag" },
];

/**
 * Gauss's Easter algorithm. Returns Easter Sunday for the Gregorian year.
 * Pure integer math; covers every year 1900–2199 without special cases.
 *
 * Reference: Carl Friedrich Gauss, 1800. JS adaptation validated against
 * timeanddate.com for 2020-2035.
 */
export function computeEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** All Easter-anchored Norwegian holidays for a given year. */
function easterAnchoredHolidays(year: number): Holiday[] {
  const easter = computeEasterSunday(year);
  const easterUtc = Date.UTC(year, easter.month - 1, easter.day);
  const day = 24 * 60 * 60 * 1000;

  // Offsets from Easter Sunday (in days).
  const offsets: readonly { offset: number; name: string }[] = [
    { offset: -3, name: "Skjærtorsdag" },
    { offset: -2, name: "Langfredag" },
    { offset: 0, name: "1. påskedag" },
    { offset: 1, name: "2. påskedag" },
    { offset: 39, name: "Kristi himmelfartsdag" },
    { offset: 49, name: "1. pinsedag" },
    { offset: 50, name: "2. pinsedag" },
  ];

  return offsets.map(({ offset, name }) => {
    const d = new Date(easterUtc + offset * day);
    return {
      name,
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    };
  });
}

/**
 * All Norwegian nasjonale helligdager for the given year. Order is
 * unspecified — callers filter by (month, day) not by position.
 */
export function holidaysInYear(year: number): Holiday[] {
  const fixed = FIXED_HOLIDAYS.map<Holiday>(({ month, day, name }) => ({
    name,
    year,
    month,
    day,
  }));
  return [...fixed, ...easterAnchoredHolidays(year)];
}

/**
 * `DD.MM.YYYY` date string → Holiday if it falls on a red day, otherwise null.
 *
 * Accepts DD.MM.YYYY (the public app format). Returns null on any parse
 * failure — callers should not rely on this for validation. Callers that
 * want a boolean just check `!== null`.
 */
export function getHolidayFor(dateStr: string): Holiday | null {
  const parts = dateStr.trim().split(".");
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  const all = holidaysInYear(year);
  return all.find((h) => h.month === month && h.day === day) ?? null;
}

/** Convenience boolean wrapper. */
export function isHoliday(dateStr: string): boolean {
  return getHolidayFor(dateStr) !== null;
}
