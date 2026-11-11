import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardWarnings } from "../src/lib/dashboard-warnings";

test("deployed English informational warnings do not appear as quality failures", () => {
  assert.deepEqual(dashboardWarnings([
    "Answer counts are not stored; topic_performance is unavailable.",
    "A student may appear in multiple score ranges when they have multiple assessments.",
    "Excluded 3 undated records from performance_trend.",
  ]), ["Из графика динамики исключено записей без даты: 3."]);
});
