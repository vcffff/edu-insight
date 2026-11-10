import type {
  Allocation,
  Analytics,
  Assessment,
  Comparison,
  Filters,
} from "./types";
import { topicDefinitions } from "./mock-data";
export const mean = (rows: Assessment[]) =>
  rows.length
    ? Math.round(
        (rows.reduce((sum, r) => sum + r.score_pct, 0) / rows.length) * 10,
      ) / 10
    : 0;
export function filterRecords(records: Assessment[], filters: Filters) {
  return records.filter(
    (r) =>
      (filters.grade === "all" || r.grade === Number(filters.grade)) &&
      (filters.school === "all" || r.school_id === filters.school),
  );
}
export function analyze(records: Assessment[]): Analytics {
  const ids = [...new Set(records.map((r) => r.topic_id))];
  const topics = ids.map((id) => {
    const def = topicDefinitions.find((t) => t.id === id);
    const rows = records.filter((r) => r.topic_id === id);
    return {
      id,
      name: def?.name ?? id,
      short: def?.short ?? id,
      domain: def?.domain ?? "Пользовательская тема",
      mastery: mean(rows),
      students: new Set(rows.map((r) => r.student_id)).size,
      belowTarget: rows.filter((r) => r.score_pct < 75).length,
    };
  });
  const studentScores = new Map<string, number[]>();
  records.forEach((r) =>
    studentScores.set(r.student_id, [
      ...(studentScores.get(r.student_id) ?? []),
      r.score_pct,
    ]),
  );
  const averages = [...studentScores.values()].map(
    (scores) => scores.reduce((a, b) => a + b, 0) / scores.length,
  );
  const campuses = [...new Set(records.map((r) => r.school_id))].sort();
  return {
    students: studentScores.size,
    average: mean(records),
    critical: topics.filter((t) => t.mastery < 60).length,
    textbooks: [...new Set(records.map((r) => r.textbook_edition))],
    topics,
    records: records.length,
    campuses,
    distribution: [
      {
        name: "Высокий уровень · ≥85%",
        value: averages.filter((s) => s >= 85).length,
        color: "#006e4c",
      },
      {
        name: "Освоено · 75–84%",
        value: averages.filter((s) => s >= 75 && s < 85).length,
        color: "#4f46e5",
      },
      {
        name: "В процессе · 60–74%",
        value: averages.filter((s) => s >= 60 && s < 75).length,
        color: "#bec6e0",
      },
      {
        name: "Нужна поддержка · <60%",
        value: averages.filter((s) => s < 60).length,
        color: "#ba1a1a",
      },
    ],
    heatmap: topics.map((t) => ({
      topic: t.id,
      values: Object.fromEntries(
        campuses.map((c) => [
          c,
          mean(records.filter((r) => r.topic_id === t.id && r.school_id === c)),
        ]),
      ),
    })),
  };
}
export function compare(
  records: Assessment[],
  a: string,
  b: string,
): Comparison {
  const rowsA = records.filter((r) => r.textbook_edition === a),
    rowsB = records.filter((r) => r.textbook_edition === b);
  return {
    nA: new Set(rowsA.map((r) => r.student_id)).size,
    nB: new Set(rowsB.map((r) => r.student_id)).size,
    averageA: mean(rowsA),
    averageB: mean(rowsB),
    rows: [...new Set(records.map((r) => r.topic_id))].map((id) => {
      const ra = rowsA.filter((r) => r.topic_id === id),
        rb = rowsB.filter((r) => r.topic_id === id);
      const av = ra.length ? mean(ra) : null,
        bv = rb.length ? mean(rb) : null;
      return {
        topic: topicDefinitions.find((t) => t.id === id)?.name ?? id,
        a: av,
        b: bv,
        nA: ra.length,
        nB: rb.length,
        delta:
          av !== null && bv !== null ? Math.round((av - bv) * 10) / 10 : null,
      };
    }),
  };
}
export function createAllocations(analytics: Analytics): Allocation[] {
  const selected = [...analytics.topics]
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 6);
  const units = Math.floor(72 / Math.max(1, selected.length));
  return selected.map((t, i) => ({
    id: t.id,
    name: t.name,
    mastery: t.mastery,
    baseline: (units + (i === 0 ? 72 - units * selected.length : 0)) / 2,
    hours: (units + (i === 0 ? 72 - units * selected.length : 0)) / 2,
    locked: false,
  }));
}
// Transfers half-hour units between unlocked topics; the 36-hour budget never changes.
export const allocationLimit = (topicCount: number) =>
  topicCount < 3 ? 36 - 2 * Math.max(0, topicCount - 1) : 16;
export function rebalance(
  rows: Allocation[],
  id: string,
  value: number,
): Allocation[] {
  const target = rows.find((r) => r.id === id);
  if (!target || target.locked) return rows;
  const next = rows.map((r) => ({ ...r }));
  const row = next.find((r) => r.id === id)!;
  const limit = allocationLimit(rows.length);
  const desired = Math.round(Math.min(limit, Math.max(2, value)) * 2) / 2;
  let remaining = desired - row.hours;
  const donors = next
    .filter((r) => r.id !== id && !r.locked)
    .sort((a, b) =>
      remaining > 0 ? b.mastery - a.mastery : a.mastery - b.mastery,
    );
  for (const other of donors) {
    if (Math.abs(remaining) < 0.01) break;
    const transfer =
      remaining > 0
        ? Math.min(remaining, other.hours - 2)
        : -Math.min(-remaining, limit - other.hours);
    other.hours -= transfer;
    row.hours += transfer;
    remaining -= transfer;
  }
  return next;
}
export function optimize(
  rows: Allocation[],
  mode: "balanced" | "exam",
): Allocation[] {
  let next = rows.map((r) => ({ ...r, hours: r.baseline }));
  // Respect locks, including their current allocation.
  if (rows.some((r) => r.locked)) next = rows.map((r) => ({ ...r }));
  const weak = [...rows]
    .filter((r) => !r.locked)
    .sort((a, b) => a.mastery - b.mastery)[0];
  if (weak)
    next = rebalance(
      next,
      weak.id,
      weak.baseline + (mode === "exam" ? 5.5 : 4),
    );
  return next;
}
