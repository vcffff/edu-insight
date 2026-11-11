import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiProvider } from "../src/lib/data-source/api-provider";
import { mockProvider } from "../src/lib/data-source/mock-provider";
const filters = { grade: "all", school: "all" };
const backendDataset = { id: 3, dataset_id: 3, filename: "scores.csv", row_count: 12, created_at: "2026-11-10T12:00:00Z", status: "uploaded" };
const analytics = {
  dataset_id: 3, generated_at: "2026-11-10T12:00:00Z",
  overview: { total_students: 8, total_observations: 12, average_score: 65, total_topics: 2, critical_topics: 1 },
  topic_mastery: [{ topic: "Algebra", score: 45, student_count: 4, sample_size: 6, below_target_count: 5 }, { topic: "Geometry", score: 85, student_count: 4, sample_size: 6, below_target_count: 0 }],
  performance_trend: [{ assessment_date: "2026-11-01", score: 65, student_count: 8 }],
  score_distribution: [{ score_range: "0–59", students_count: 4 }, { score_range: "60–100", students_count: 4 }],
  student_average_distribution: [{ score_range: "<60", students_count: 3 }, { score_range: "60–74", students_count: 3 }, { score_range: "75–84", students_count: 1 }, { score_range: "≥85", students_count: 1 }],
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
    assert.equal(result.topics[0].belowTarget, 5);
    assert.equal(result.distribution.reduce((sum, group) => sum + group.value, 0), 8);
    assert.equal(result.distribution[0].name, "<60");
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
test("item answers upload to the selected dataset and skill diagnostics stay scoped", async () => {
  const old = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith("/items/upload")) {
      assert.equal(init?.method, "POST");
      assert.ok(init?.body instanceof FormData);
      return Response.json({ dataset_id: 3, row_count: 5, skill_count: 1 });
    }
    return Response.json({ dataset_id: 3, item_response_count: 5, skills: [{
      topic: "Algebra", skill: "Linear equations", correct_answers: 1,
      incorrect_answers: 4, student_count: 5, item_count: 1,
      accuracy_percent: 20, status: "needs_attention",
      suggested_action: "Проведите повторную диагностику.",
    }] });
  };
  try {
    const provider = createApiProvider("http://backend");
    const file = new File(["student_id,topic,skill,item_id,is_correct\n"], "items.csv", { type: "text/csv" });
    assert.equal((await provider.uploadItems!("3", file)).row_count, 5);
    assert.equal((await provider.skills!("3", "Algebra")).skills[0].incorrect_answers, 4);
    assert.deepEqual(urls, [
      "http://backend/api/datasets/3/items/upload",
      "http://backend/api/datasets/3/skills?topic=Algebra",
    ]);
  } finally {
    globalThis.fetch = old;
  }
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
test("report generation receives the complete optimization and uses the scoped endpoint", async () => {
  const old = globalThis.fetch;
  const optimization = { dataset_id: 3, total_hours: 36, method: "Backend priority transfer", allocations: [{ topic: "Algebra", current_hours: 18, recommended_hours: 22, change: 4, mastery: 0.45, priority: 0.55 }, { topic: "Geometry", current_hours: 18, recommended_hours: 14, change: -4, mastery: 0.85, priority: 0.15 }] };
  const report = {
    executive_summary: { title: "Backend report", summary: "Prioritize Algebra", overall_status: "needs_attention", key_findings_count: 0 },
    key_findings: [], topic_analysis: [], textbook_analysis: [],
    curriculum_explanation: { summary: "36 hours preserved", total_hours_preserved: true, topic_explanations: [] },
    recommendations: [{ id: "r1", title: "Practice Algebra", priority: "high", action: "Add focused practice", related_topics: ["Algebra"], evidence: ["45% mastery"] }],
    limitations: ["Small sample"], data_quality_warnings: [], generated_language: "ru",
  };
  let generated = 0;
  globalThis.fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === "/api/datasets") return Response.json({ datasets: [backendDataset] });
    if (path.endsWith("/analytics")) return Response.json(analytics);
    if (path.endsWith("/optimize")) return Response.json(optimization);
    if (path.endsWith("/analyze")) {
      const body = JSON.parse(String(init?.body));
      if (body.subject === "Math") assert.equal(body.optimization, undefined);
      else assert.deepEqual(body.optimization, optimization);
      assert.equal(body.language, "ru");
      assert.equal(body.dataset_id, 3);
      generated++;
      return Response.json(report);
    }
    throw new Error(`Unexpected path: ${path}`);
  };
  try {
    const provider = createApiProvider("http://backend");
    await provider.optimization({ filters, scenario: "balanced" });
    assert.equal((await provider.analysis!())?.executive_summary.title, "Backend report");
    const recs = await provider.recommendations(filters);
    assert.equal(recs[0].title, "Practice Algebra");
    assert.equal(recs[0].priority, "High priority");
    assert.equal(generated, 2);
    await provider.analysis!(undefined, true);
    assert.equal(generated, 3);
    await provider.analysis!(undefined, false, "Math");
    assert.equal(generated, 4);
  } finally { globalThis.fetch = old; }
});
test("processing reports surface the API conflict", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/datasets")) return Response.json({ datasets: [backendDataset] });
    assert.ok(String(url).endsWith("/analyze"));
    return Response.json({ detail: "Analysis is processing" }, { status: 409 });
  };
  try { await assert.rejects(() => createApiProvider("http://backend").analysis!(), (error: unknown) => error instanceof Error && error.message.includes("409")); }
  finally { globalThis.fetch = old; }
});
test("report analysis does not blame the CSV for an earlier failure", async () => {
  const old = globalThis.fetch;
  let generated = false;
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/api/datasets") return Response.json({ datasets: [backendDataset] });
    assert.equal(path, "/api/recommendations/analyze");
    generated = true;
    return Response.json({
      executive_summary: { title: "Report recovered", summary: "Based on data", overall_status: "satisfactory", key_findings_count: 0 },
      key_findings: [], topic_analysis: [], textbook_analysis: [],
      curriculum_explanation: { summary: "No hours", total_hours_preserved: null, topic_explanations: [] },
      recommendations: [], limitations: [], data_quality_warnings: [], generated_language: "ru",
    });
  };
  try {
    const report = await createApiProvider("http://backend").analysis!();
    assert.equal(report?.executive_summary.title, "Report recovered");
    assert.equal(generated, true);
  } finally { globalThis.fetch = old; }
});
