import { expect, test, type Page } from "@playwright/test";
import { createDemoDataset } from "../src/lib/mock-data";
import {
  analyze,
  compare,
  createAllocations,
  filterRecords,
  optimize,
} from "../src/lib/analytics";
import { buildRecommendations } from "../src/lib/data-source/recommendations";
import type { Dataset, Filters } from "../src/lib/types";
// Network fixtures are test-only. Live production requests never return mock data.
const dataset: Dataset = {
  ...createDemoDataset(),
  id: "live-test",
  name: "Набор API для проверки",
  source: "Live API",
  records: createDemoDataset()
    .records.slice(0, 48)
    .map((r) => ({ ...r, score_pct: 58, grade: 10, school_id: "Школа API" })),
};
async function backend(
  page: Page,
  mode: "success" | "empty" | "error" | "offline" | "slow" = "success",
) {
  await page.route("http://127.0.0.1:8000/**", async (route) => {
    if (mode === "offline") {
      await route.abort("connectionrefused");
      return;
    }
    if (mode === "error") {
      await route.fulfill({ status: 503, json: { detail: "Unavailable" } });
      return;
    }
    if (mode === "slow") await new Promise((r) => setTimeout(r, 800));
    const url = new URL(route.request().url());
    const filters: Filters = {
      grade: url.searchParams.get("grade") ?? "all",
      school: url.searchParams.get("school") ?? "all",
    };
    const d = mode === "empty" ? { ...dataset, records: [] } : dataset;
    const records = filterRecords(d.records, filters);
    const a = analyze(records);
    const payload =
      url.pathname === "/dataset"
        ? d
        : url.pathname === "/analytics"
          ? a
          : url.pathname === "/textbooks"
            ? a.textbooks
            : url.pathname === "/comparison"
              ? compare(
                  records,
                  url.searchParams.get("a") ?? "",
                  url.searchParams.get("b") ?? "",
                )
              : url.pathname === "/recommendations"
                ? buildRecommendations(a, d.id)
                : url.pathname === "/curriculum/optimization"
                  ? optimize(createAllocations(a), "balanced")
                  : null;
    await route.fulfill({ json: payload });
  });
}
test("Демоданные → API → Демоданные: фильтры сохраняются, кэши изолированы", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().includes(":8000/")) requests++;
  });
  await backend(page);
  await page.goto("/");
  await expect(page.getByText("1 248", { exact: true }).first()).toBeVisible();
  expect(requests).toBe(0);
  await page.getByLabel("Фильтр по классу", { exact: true }).selectOption("10");
  await expect(page.getByText("416", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Live API", exact: true }).click();
  await expect(page.getByText("58%", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("1 248", { exact: true })).toHaveCount(0);
  await expect(
    page.getByLabel("Фильтр по классу", { exact: true }),
  ).toHaveValue("10");
  expect(requests).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Демоданные", exact: true }).click();
  await expect(page.getByText("416", { exact: true }).first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByText("58%", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("режим сохраняется после обновления, все экраны используют API", async ({
  page,
}) => {
  await backend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Live API", exact: true }).click();
  await expect(page.getByText("58%", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Live API", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("58%", { exact: true }).first()).toBeVisible();
  for (const [path, title] of [
    ["/topic-analytics", "Результаты по темам"],
    ["/textbook-comparison", "Результаты по учебникам"],
    ["/curriculum-optimizer", "Оптимизатор программы"],
    ["/recommendations", "Рекомендации"],
    ["/datasets", "Источники данных"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Загрузка аналитики" }),
    ).toHaveCount(0);
    await expect(page.getByText("1 248", { exact: true })).toHaveCount(0);
  }
});
for (const mode of ["offline", "error", "empty"] as const) {
  test(`API ${mode}: нет подстановки демоданных`, async ({ page }) => {
    await backend(page, mode);
    await page.goto("/");
    await page.getByRole("button", { name: "Live API", exact: true }).click();
    if (mode === "empty")
      await expect(
        page.getByRole("heading", { name: "В этой группе нет данных" }),
      ).toBeVisible();
    else {
      await expect(
        page.getByRole("heading", { name: "API недоступен", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Повторить", exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("status", { name: "Загрузка аналитики" }),
    ).toHaveCount(0);
    await expect(page.getByText("1 248", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Демоданные", exact: true }).click();
    await expect(
      page.getByText("1 248", { exact: true }).first(),
    ).toBeVisible();
  });
}
test("запоздалый ответ API не заменяет демоданные", async ({ page }) => {
  await backend(page, "slow");
  await page.goto("/");
  await page.getByRole("button", { name: "Live API", exact: true }).click();
  await page.getByRole("button", { name: "Демоданные", exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("1 248", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Фильтр по классу", { exact: true }).selectOption("10");
  await expect(page.getByText("416", { exact: true }).first()).toBeVisible();
});
test("повторный запрос восстанавливает API без смены режима", async ({
  page,
}) => {
  await backend(page, "error");
  await page.goto("/");
  await page.getByRole("button", { name: "Live API", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "API недоступен", exact: true }),
  ).toBeVisible();
  await page.unroute("http://127.0.0.1:8000/**");
  await backend(page);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByText("58%", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("status", { name: "API подключён", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Фильтр по школе", { exact: true })
    .selectOption("Школа API");
  await expect(page.getByText("58%", { exact: true }).first()).toBeVisible();
});
test("зависший API завершается ошибкой, а не вечной загрузкой", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:8000/**", async (route) => {
    await new Promise((r) => setTimeout(r, 6500));
    await route.abort().catch(() => {});
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Live API", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "API недоступен", exact: true }),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByRole("status", { name: "Загрузка аналитики" }),
  ).toHaveCount(0);
  await expect(page.getByText("1 248", { exact: true })).toHaveCount(0);
});
for (const storageMode of ["writes-denied", "all-denied"] as const) {
  test(`переключатель работает при заблокированном хранилище: ${storageMode}`, async ({
    page,
  }) => {
    await backend(page);
    await page.addInitScript((mode) => {
      localStorage.setItem("eduinsight-data-source", "mock");
      Storage.prototype.setItem = () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };
      if (mode === "all-denied")
        Storage.prototype.getItem = () => {
          throw new DOMException("Access denied", "SecurityError");
        };
    }, storageMode);
    await page.goto("/");
    await expect(
      page.getByText("1 248", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Live API", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Live API", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("58%", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Демоданные", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Демоданные", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("1 248", { exact: true }).first(),
    ).toBeVisible();
  });
}
