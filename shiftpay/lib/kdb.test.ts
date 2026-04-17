/**
 * Tests for the Kysely query builder.
 *
 * These do not need a SQLite handle — they assert that Kysely compiles
 * to the SQL we expect, which is the whole reason for adopting it
 * (compile-time guarantees, runtime stays unchanged).
 */
import { kdb } from "./kdb";

describe("kdb (Kysely query builder)", () => {
  it("compiles a parameterised SELECT with our exact column names", () => {
    const compiled = kdb
      .selectFrom("shifts")
      .selectAll()
      .where("schedule_id", "=", "abc-123")
      .where("deleted_at", "is", null)
      .orderBy("date", "asc")
      .compile();

    // Quoting style is Kysely's choice; assert on the structure, not the exact string.
    expect(compiled.sql).toContain('from "shifts"');
    expect(compiled.sql).toContain('"schedule_id" =');
    expect(compiled.sql).toContain('"deleted_at" is null');
    expect(compiled.sql).toContain('order by "date" asc');
    // schedule_id is parameterised (placeholder, not a literal in the SQL).
    expect(compiled.sql).not.toContain("'abc-123'");
    expect(compiled.parameters).toContain("abc-123");
  });

  it("compiles an UPDATE with bound parameters", () => {
    const compiled = kdb
      .updateTable("shifts")
      .set({ deleted_at: "2026-04-17T08:00:00Z", updated_at: "2026-04-17T08:00:00Z" })
      .where("id", "=", "shift-id")
      .compile();

    expect(compiled.sql).toContain('update "shifts"');
    expect(compiled.sql).toContain('"deleted_at" =');
    expect(compiled.parameters).toEqual(
      expect.arrayContaining(["2026-04-17T08:00:00Z", "shift-id"])
    );
  });

  // The point of Kysely: the next two lines would not compile if the schema
  // changes. We can not assert that with `expect`, but the file existing
  // and `npm run typecheck` passing covers the regression.
  it("typechecks against the schema (smoke)", () => {
    const validQuery = kdb.selectFrom("shifts").select("date").compile();
    expect(validQuery.sql.length).toBeGreaterThan(0);

    // A column-name typo would error at the line below.
    // Uncommenting the next line should produce a TS2769:
    //   kdb.selectFrom("shifts").select("dat").compile();
  });
});
