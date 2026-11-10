import { test, expect } from "@playwright/test";

test("backend CSV upload renders charts and persists dataset selection across navigation", async ({ page }) => {
  let uploaded = false;
  const dataset = { id: 7, dataset_id: 7, filename: "uploaded-results.csv", row_count: 3, created_at: "2026-11-10T12:00:00Z", status: "uploaded" };
  const analytics = {
    dataset_id: 7, generated_at: "2026-11-10T12:00:00Z",
    overview: { total_students: 3, average_score: 65, total_topics: 2, critical_topics: 1 },
    topic_mastery: [{ topic: "CSV Algebra", score: 45, student_count: 3 }, { topic: "CSV Geometry", score: 85, student_count: 3 }],
    performance_trend: [{ assessment_date: "2026-11-01", score: 65, student_count: 3 }, { assessment_date: "2026-11-10", score: 72, student_count: 3 }],
    score_distribution: [{ score_range: "60–79", students_count: 2 }, { score_range: "80–100", students_count: 1 }],
    textbook_comparison: [], topic_performance: [{ topic: "CSV Algebra", correct_answers: 8, incorrect_answers: 3 }],
    data_quality_warnings: ["Small CSV sample"], available_filters: { grades: [10], subjects: ["Mathematics"], textbooks: [], topics: ["CSV Algebra", "CSV Geometry"] },
  };
  await page.route(/https?:\/\/[^/]+\/api\/.*/, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" } });
    const send = (body: unknown) => route.fulfill({ json: body, headers: { "Access-Control-Allow-Origin": "*" } });
    if (path === "/api/datasets/upload") {
      expect(route.request().headers()["content-type"]).toContain("multipart/form-data; boundary=");
      expect(route.request().postDataBuffer()?.toString()).toContain("uploaded-results.csv");
      uploaded = true;
      return send(dataset);
    }
    if (path === "/api/datasets") return send({ datasets: uploaded ? [dataset] : [] });
    if (path === "/api/datasets/7/analytics") return send(analytics);
    throw new Error(`Unexpected backend request: ${path}`);
  });
  await page.goto("/datasets");
  await expect(page.getByText("Пока нет загруженных CSV.")).toBeVisible();
  await page.getByLabel("Загрузить CSV с результатами").setInputFiles({ name: "uploaded-results.csv", mimeType: "text/csv", buffer: Buffer.from("topic,score\nCSV Algebra,72") });
  await expect(page.getByRole("img", { name: "Освоение тем", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Динамика результатов", exact: true })).toBeVisible();
  await expect(page.getByText("Small CSV sample")).toBeVisible();
  await expect(page.getByRole("cell", { name: "uploaded-results.csv" })).toBeVisible();
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Обзор результатов" })).toBeVisible();
  await expect(page.getByLabel("Текущий файл анализа")).toContainText("uploaded-results.csv");
  await expect(page.getByRole("img", { name: "Освоение тем", exact: true })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Динамика результатов", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Уведомления/ })).toHaveCount(0);
  await expect(page.getByText("Образовательный округ Окридж")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Текущий файл анализа")).toContainText("uploaded-results.csv");
  await page.getByRole("combobox", { name: "Предмет", exact: true }).selectOption("Mathematics");
  await expect.poll(() => page.getByRole("combobox", { name: "Предмет", exact: true }).inputValue()).toBe("Mathematics");
  await page.getByRole("link", { name: "Аналитика тем", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Аналитика тем", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Сравнение освоения тем", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Динамика результатов", exact: true })).toHaveCount(0);
  const inspector = page.getByLabel("Подробности выбранной темы");
  await expect(inspector).toContainText("45%");
  await page.getByRole("combobox", { name: "Выберите тему", exact: true }).selectOption("CSV Geometry");
  await expect(inspector).toContainText("85%");
  await expect(inspector).toContainText("Backend не предоставил количество");
  await page.getByRole("searchbox", { name: "Поиск темы" }).fill("Algebra");
  await expect(page.getByRole("button", { name: "CSV Geometry", exact: true })).toHaveCount(0);
  await expect(inspector).toContainText("45%");
  await page.getByRole("searchbox", { name: "Поиск темы" }).fill("No topic");
  await expect(page.getByText("Нет тем по выбранным условиям.")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Открыть навигацию" }).click();
  await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeVisible();
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await expect(page.getByLabel("Текущий файл анализа")).toContainText("uploaded-results.csv");
});
