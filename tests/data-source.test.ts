import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiProvider } from "../src/lib/data-source/api-provider";
import { mockProvider } from "../src/lib/data-source/mock-provider";
const filters = { grade: "all", school: "all" };
const backendDataset = { id: 3, dataset_id: 3, filename: "scores.csv", row_count: 12, created_at: "2026-11-10T12:00:00Z", status: "uploaded" };
const analytics = {
  dataset_id: 3, generated_at: "2026-11-10T12:00:00Z",
  overview: { total_students: 8, average_score: 65, total_topics: 2, critical_topics: 1 },
  topic_mastery: [{ topic: "Algebra", score: 45, student_count: 4 }, { topic: "Geometry", score: 85, student_count: 4 }],
  performance_trend: [{ assessment_date: "2026-11-01", score: 65, student_count: 8 }],
  score_distribution: [{ score_range: "0–59", students_count: 4 }, { score_range: "60–100", students_count: 4 }],
  textbook_comparison: [{ textbook: "A", topic: "Algebra", average_score: 45, student_count: 4 }, { textbook: "B", topic: "Algebra", average_score: 65, student_count: 4 }],
  topic_performance: [{ topic: "Algebra", correct_answers: 4, incorrect_answers: 6 }],
  data_quality_warnings: ["Small sample"], available_filters: { grades: [10], subjects: ["Math"], textbooks: ["A", "B"], topics: ["Algebra", "Geometry"] },
};
test("mock repository never calls fetch and consistently computes all screen data", async () => {
  const old = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("Unexpected backend request");
  };
  try {
    const d = await mockProvider.dataset();
    const a = await mockProvider.analytics(filters);
    const books = await mockProvider.textbooks(filters);
    const c = await mockProvider.comparison(filters, books[0], books[1]);
    const rows = await mockProvider.optimization({
      filters,
      scenario: "balanced",
    });
    const recs = await mockProvider.recommendations(filters);
    assert.equal(d.records.length, 7488);
    assert.equal(a.students, 1248);
    assert.equal(c.nA, 624);
    assert.equal(
      rows.reduce((s, r) => s + r.hours, 0),
      36,
    );
    assert.ok(recs[0].evidence.includes("48,8% освоения темы"));
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = old;
  }
});
test("live adapter passes filters and validates real response payloads", async () => {
  const old = globalThis.fetch;
  let url = "";
  globalThis.fetch = async (input) => {
    url = String(input);
    if (url.endsWith("/datasets")) return Response.json({ datasets: [backendDataset] });
    return Response.json(analytics);
  };
  try {
    const result = await createApiProvider("http://backend/api").analytics({
      grade: "10",
      school: "North High",
      subject: "Math",
    });
    assert.equal(result.students, 8);
    assert.equal(result.records, 12);
    assert.equal(result.topics[0].mastery, 45);
    assert.equal(result.backend?.performance_trend.length, 1);
    assert.deepEqual(result.campuses, []);
    assert.equal(
      url,
      "http://backend/api/datasets/3/analytics?grade=10&subject=Math",
    );
  } finally {
    globalThis.fetch = old;
  }
});
test("live errors and invalid payloads reject instead of returning synthetic data", async () => {
  const old = globalThis.fetch;
  try {
    for (const response of [
      () => new Response("failure", { status: 503 }),
      () => Response.json({ fake: "wrong contract" }),
    ]) {
      globalThis.fetch = async () => response();
      await assert.rejects(
        () => createApiProvider("http://backend").analytics(filters),
        /API|openapi/,
      );
    }
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      () => createApiProvider("http://backend").dataset(),
      /Не удалось подключиться/,
    );
    await assert.rejects(
      () => createApiProvider(undefined).dataset(),
      /NEXT_PUBLIC_API_URL/,
    );
  } finally {
    globalThis.fetch = old;
  }
});
test("an empty dataset list produces empty states, not demo data", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ datasets: [] });
  try {
    const p = createApiProvider("http://backend");
    assert.equal((await p.analytics(filters)).students, 0);
    assert.deepEqual(await p.textbooks(filters), []);
    assert.deepEqual(await p.recommendations(filters), []);
    assert.deepEqual(await p.optimization({ filters, scenario: "exam" }), []);
    assert.equal((await p.dataset()).records.length, 0);
  } finally {
    globalThis.fetch = old;
  }
});
test("live requests are bounded and honor source-switch cancellation", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  try {
    await assert.rejects(
      () => createApiProvider("http://backend", 20).dataset(),
      /Время ожидания API истекло/,
    );
    const controller = new AbortController();
    const pending = createApiProvider("http://backend", 200).dataset(
      controller.signal,
    );
    controller.abort();
    await assert.rejects(() => pending, /Aborted/);
  } finally {
    globalThis.fetch = old;
  }
});
test("uploads send the original CSV as multipart and select the persisted backend ID", async () => {
  const old = globalThis.fetch;
  const file = new File(["topic,score\nAlgebra,45"], "original.csv", { type: "text/csv" });
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/upload")) {
      assert.equal(String(url), "http://backend/api/datasets/upload");
      assert.equal(init?.method, "POST");
      assert.ok(init?.body instanceof FormData);
      const sent = init.body.get("file") as File;
      assert.equal(sent.name, "original.csv");
      assert.equal(await sent.text(), await file.text());
      assert.equal((init.headers as Record<string, string>)["Content-Type"], undefined);
      return Response.json(backendDataset);
    }
    return Response.json({ datasets: [backendDataset, { ...backendDataset, id: 4, dataset_id: 4, created_at: "2026-11-11T12:00:00Z" }] });
  };
  try {
    const provider = createApiProvider("http://backend");
    const result = await provider.uploadFile!(file);
    assert.equal(result.persisted, true);
    assert.equal(result.dataset.id, "3");
    assert.equal((await provider.dataset()).id, "3");
    assert.equal(result.dataset.rowCount, 12);
    assert.deepEqual(result.dataset.records, []);
  } finally { globalThis.fetch = old; }
});
test("optimization uses actual topics and scales backend mastery ratios to percentages", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith("/datasets")) return Response.json({ datasets: [backendDataset] });
    if (path.endsWith("/analytics")) return Response.json(analytics);
    assert.equal(path, "http://backend/api/curriculum/optimize");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.dataset_id, 3);
    assert.deepEqual(body.current_hours, { Algebra: 18, Geometry: 18 });
    return Response.json({ dataset_id: 3, total_hours: 36, method: "Backend", allocations: [{ topic: "Algebra", current_hours: 18, recommended_hours: 22, change: 4, mastery: 0.45, priority: 0.55 }] });
  };
  try {
    const result = await createApiProvider("http://backend").optimization({ filters, scenario: "balanced" });
    assert.equal(result[0].mastery, 45);
    assert.equal(result[0].hours, 22);
    assert.equal(result[0].id, "Algebra");
  } finally { globalThis.fetch = old; }
});
test("backend CSV validation details are shown instead of generic file errors", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ detail: "Missing topic column" }, { status: 422 });
  try { await assert.rejects(() => createApiProvider("http://backend").uploadFile!(new File(["x"], "x.csv")), /Missing topic column/); }
  finally { globalThis.fetch = old; }
});
test("report generation receives the complete optimization and completed reports use the stored endpoint", async () => {
  const old = globalThis.fetch;
  const optimization = { dataset_id: 3, total_hours: 36, method: "Backend priority transfer", allocations: [{ topic: "Algebra", current_hours: 18, recommended_hours: 22, change: 4, mastery: 0.45, priority: 0.55 }, { topic: "Geometry", current_hours: 18, recommended_hours: 14, change: -4, mastery: 0.85, priority: 0.15 }] };
  const report = {
    executive_summary: { title: "Backend report", summary: "Prioritize Algebra", overall_status: "needs_attention", key_findings_count: 0 },
    key_findings: [], topic_analysis: [], textbook_analysis: [],
    curriculum_explanation: { summary: "36 hours preserved", total_hours_preserved: true, topic_explanations: [] },
    recommendations: [{ id: "r1", title: "Practice Algebra", priority: "high", action: "Add focused practice", related_topics: ["Algebra"], evidence: ["45% mastery"] }],
    limitations: ["Small sample"], data_quality_warnings: [], generated_language: "ru",
  };
  let completed = false;
  let generated = 0;
  let stored = 0;
  globalThis.fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === "/api/datasets") return Response.json({ datasets: [backendDataset] });
    if (path.endsWith("/analytics")) return Response.json(analytics);
    if (path.endsWith("/optimize")) return Response.json(optimization);
    if (path.endsWith("/status")) return Response.json({ dataset_id: 3, status: completed ? "completed" : "uploaded", report_id: completed ? 9 : null });
    if (path.endsWith("/analyze")) {
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.optimization, optimization);
      assert.equal(body.language, "ru");
      assert.equal(body.dataset_id, 3);
      generated++;
      completed = true;
      return Response.json(report);
    }
    assert.equal(path, "/api/datasets/3/report");
    stored++;
    return Response.json({ id: 9, dataset_id: 3, status: "completed", report, created_at: backendDataset.created_at });
  };
  try {
    const provider = createApiProvider("http://backend");
    await provider.optimization({ filters, scenario: "balanced" });
    assert.equal((await provider.analysis!())?.executive_summary.title, "Backend report");
    const recs = await provider.recommendations(filters);
    assert.equal(recs[0].title, "Practice Algebra");
    assert.equal(recs[0].priority, "High priority");
    assert.equal(generated, 1);
    assert.equal(stored, 1);
    await provider.analysis!(undefined, true);
    assert.equal(generated, 2);
  } finally { globalThis.fetch = old; }
});
test("processing reports wait without duplicate analysis requests", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/datasets")) return Response.json({ datasets: [backendDataset] });
    assert.ok(String(url).endsWith("/status"));
    return Response.json({ dataset_id: 3, status: "processing", report_id: null });
  };
  try { await assert.rejects(() => createApiProvider("http://backend").analysis!(), (error: unknown) => error instanceof Error && error.message.includes("обрабатывается")); }
  finally { globalThis.fetch = old; }
});
