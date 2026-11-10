import { expect, test } from "@playwright/test";
test("русский интерфейс: навигация, фильтры, оптимизатор и объяснения", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", { name: "Обзор учебной программы", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 248", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("70,8%", { exact: true })).toBeVisible();
  await page.getByLabel("Фильтр по классу", { exact: true }).selectOption("10");
  await expect(page.getByText("416", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("link", { name: "Сравнение учебников", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Результаты по учебникам" }),
  ).toBeVisible();
  await expect(
    page.getByText("Смещение выборки и внешние факторы"),
  ).toBeVisible();
  await expect(page.getByText("Сходные результаты").first()).toBeVisible();
  await page
    .getByRole("link", { name: "Оптимизатор программы", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Оптимизатор программы", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "К экзамену", exact: true }).click();
  await expect(page.getByText("Бюджет сохранён")).toBeVisible();
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Изменение бюджета: 0,0 ч")).toBeVisible();
  await page.getByRole("button", { name: "Сохранить распределение" }).click();
  await expect(
    page.getByRole("button", { name: "План сохранён локально" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Рекомендации", exact: true }).click();
  await page.getByRole("button", { name: "Запросить объяснение ИИ" }).click();
  await expect(
    page.getByText("ИИ недоступен · объяснения по правилам"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Почему эта рекомендация?" })
    .first()
    .click();
  await expect(page.getByText("Объяснение по правилам · без ИИ")).toBeVisible();
  expect(errors).toEqual([]);
});
test("проверка CSV на русском и пересчёт данных после загрузки", async ({
  page,
}) => {
  await page.goto("/datasets");
  await expect(
    page.getByRole("heading", { name: "Источники данных", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Загрузить CSV с результатами")
    .setInputFiles({
      name: "bad.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("wrong,columns\n1,2"),
    });
  await expect(
    page.getByText(/Отсутствуют обязательные столбцы/),
  ).toBeVisible();
  const csv =
    "student_id,school_id,assessment_name,topic_id,score_pct,textbook_edition,date,grade\nS1,Школа 1,Тест,geometry,40,Учебник A,2025-01-18,10\nS2,Школа 1,Тест,geometry,60,Учебник B,2025-01-18,10\nS1,Школа 1,Тест,algebra,90,Учебник A,2025-01-18,10\nS2,Школа 1,Тест,algebra,80,Учебник B,2025-01-18,10";
  await page
    .getByLabel("Загрузить CSV с результатами")
    .setInputFiles({
      name: "test-cohort.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await expect(page.getByText("4 корректных результатов")).toBeVisible();
  await expect(
    page.getByText("Загрузка завершена · test-cohort.csv"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await expect(page.getByText("67,5%", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("link", { name: "Сравнение учебников", exact: true })
    .click();
  await expect(page.getByText("Недостаточно данных").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Недостаточно данных").first()).toBeVisible();
});
test("все русские экраны помещаются в мобильный экран", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, title] of [
    ["/", "Обзор учебной программы"],
    ["/topic-analytics", "Результаты по темам"],
    ["/textbook-comparison", "Результаты по учебникам"],
    ["/curriculum-optimizer", "Оптимизатор программы"],
    ["/datasets", "Источники данных"],
    ["/recommendations", "Рекомендации"],
    ["/settings", "Настройки пространства"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Открыть навигацию" }).click();
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Обзор учебной программы", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/overview-ru-mobile.png",
    fullPage: true,
  });
});
