import { test } from "node:test";
import assert from "node:assert/strict";
import { evidenceUnit, evidenceValue, metricLabel } from "../src/lib/report-presentation";

test("report evidence uses readable labels and preserves unknown metrics", () => {
  assert.equal(metricLabel("average_score"), "Средний балл");
  assert.equal(metricLabel("custom_backend_metric"), "custom backend metric");
  assert.equal(evidenceUnit("hours"), "ч.");
  assert.equal(evidenceUnit("percent"), "%");
  assert.equal(evidenceUnit("ratio"), "");
  assert.equal(evidenceUnit("custom"), "custom");
  assert.equal(evidenceUnit(null), "");
});

test("report evidence does not invent percentages or missing values", () => {
  assert.equal(evidenceValue(0), "0");
  assert.equal(evidenceValue(0.44), "0,44");
  assert.equal(evidenceValue(0.35, "ratio"), "35%");
  assert.equal(evidenceValue(null), "Нет данных");
  assert.equal(evidenceValue(undefined), "Нет данных");
  assert.equal(evidenceValue(false), "Нет");
  assert.equal(evidenceValue(true), "Да");
  assert.equal(evidenceValue("Backend explanation"), "Backend explanation");
});

test("structured evidence is presented without raw JSON", () => {
  assert.equal(evidenceValue({ topic: "Algebra", current_hours: 8 }), "Тема: Algebra; Текущие часы: 8");
  assert.equal(evidenceValue([40, 60]), "40; 60");
  assert.equal(evidenceValue([]), "Нет данных");
  assert.equal(evidenceValue({}), "Нет данных");
});
