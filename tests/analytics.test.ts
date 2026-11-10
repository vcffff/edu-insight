import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  compare,
  createAllocations,
  filterRecords,
  optimize,
  rebalance,
} from "../src/lib/analytics";
import { createDemoDataset } from "../src/lib/mock-data";
import { toCSV, validateCSV } from "../src/lib/csv";
const dataset = createDemoDataset();
test("demo metrics derive consistently from records", () => {
  const a = analyze(dataset.records);
  assert.equal(a.students, 1248);
  assert.equal(a.records, 7488);
  assert.equal(a.topics.length, 6);
  assert.equal(a.textbooks.length, 4);
  assert.equal(
    a.distribution.reduce((s, r) => s + r.value, 0),
    a.students,
  );
  assert.equal(a.critical, a.topics.filter((t) => t.mastery < 60).length);
});
test("grade and campus filters scope the cohort", () => {
  const records = filterRecords(dataset.records, {
    grade: "10",
    school: "Северная школа",
  });
  assert.ok(records.length > 0);
  assert.ok(
    records.every((r) => r.grade === 10 && r.school_id === "Северная школа"),
  );
});
test("comparison uses actual resource samples and deltas", () => {
  const books = [...new Set(dataset.records.map((r) => r.textbook_edition))];
  const c = compare(dataset.records, books[0], books[1]);
  assert.equal(c.nA, 624);
  assert.equal(c.nB, 416);
  c.rows.forEach((r) =>
    assert.equal(r.delta, Math.round((r.a! - r.b!) * 10) / 10),
  );
});
test("empty datasets produce valid empty analytics", () => {
  const a = analyze([]);
  assert.equal(a.students, 0);
  assert.equal(a.average, 0);
  assert.equal(a.topics.length, 0);
});
test("optimizer always preserves 36 hours and topic bounds", () => {
  let rows = createAllocations(analyze(dataset.records));
  for (let i = 0; i < 100; i++) {
    rows = rebalance(rows, rows[i % rows.length].id, 2 + (i % 29) / 2);
    assert.equal(
      rows.reduce((s, r) => s + r.hours, 0),
      36,
    );
    assert.ok(rows.every((r) => r.hours >= 2 && r.hours <= 16));
  }
  for (const mode of ["exam", "balanced"] as const) {
    rows = optimize(rows, mode);
    assert.equal(
      rows.reduce((s, r) => s + r.hours, 0),
      36,
    );
  }
});
test("locked rows cannot change directly or through autobalance or presets", () => {
  let rows = createAllocations(analyze(dataset.records));
  rows[0].locked = true;
  const original = rows[0].hours;
  rows = rebalance(rows, rows[0].id, 16);
  assert.equal(rows[0].hours, original);
  rows = rebalance(rows, rows[1].id, 16);
  assert.equal(rows[0].hours, original);
  rows = optimize(rows, "exam");
  assert.equal(rows[0].hours, original);
  assert.equal(
    rows.reduce((s, r) => s + r.hours, 0),
    36,
  );
});
test("all locked optimizer is stable", () => {
  const rows = createAllocations(analyze(dataset.records)).map((r) => ({
    ...r,
    locked: true,
  }));
  assert.deepEqual(rebalance(rows, rows[0].id, 16), rows);
  assert.deepEqual(optimize(rows, "balanced"), rows);
});
test("small uploaded curricula remain feasible within a fixed 36-hour budget", () => {
  for (const count of [1, 2]) {
    const ids = new Set(dataset.records.slice(0, count).map((r) => r.topic_id));
    let rows = createAllocations(
      analyze(dataset.records.filter((r) => ids.has(r.topic_id))),
    );
    rows = optimize(rows, "exam");
    rows = rebalance(rows, rows[0].id, 36);
    assert.equal(
      rows.reduce((sum, r) => sum + r.hours, 0),
      36,
    );
    assert.ok(rows.every((r) => r.hours >= 2 && r.hours <= 36));
  }
});
test("CSV roundtrip preserves valid records", () => {
  const result = validateCSV(toCSV(dataset.records.slice(0, 20)));
  assert.deepEqual(result.errors, []);
  assert.equal(result.records.length, 20);
});
test("CSV rejects invalid headers, scores, dates, grades and empty IDs", () => {
  assert.ok(validateCSV("foo,bar\n1,2").errors.length);
  const r = dataset.records[0];
  for (const patch of [
    { score_pct: 101 },
    { score_pct: -1 },
    { date: "2025-02-30" },
    { grade: 13 },
    { student_id: "" },
  ])
    assert.ok(validateCSV(toCSV([{ ...r, ...patch }])).errors.length);
});
test("CSV handles quoted fields, BOM, grade defaults and deduplication", () => {
  const row = { ...dataset.records[0], assessment_name: 'Math, "Midterm"' };
  const duplicate = validateCSV("\uFEFF" + toCSV([row, row]));
  assert.equal(duplicate.records.length, 1);
  assert.ok(duplicate.warnings.some((w) => w.includes("повторяющихся")));
  const { grade: omitted, ...withoutGrade } = row;
  void omitted;
  const result = validateCSV(toCSV([withoutGrade] as typeof dataset.records));
  assert.equal(result.records[0].grade, 10);
});
