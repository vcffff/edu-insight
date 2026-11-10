import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("eduinsight-data-source", "mock"));
});

test("entrance is brief, non-blocking and does not replay the header on navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const header = page.locator(".app-header");
  const file = page.getByLabel("Текущий файл анализа");
  await expect(file).toBeVisible();
  await expect(header).toHaveCSS("animation-name", "chrome-arrive");
  await expect(header).toHaveCSS("animation-duration", "0.44s");
  await expect(header).toHaveCSS("animation-iteration-count", "1");
  await expect(file).toHaveCSS("animation-name", "content-arrive");
  await expect(file).toHaveCSS("opacity", "1");
  const animation = await header.evaluate((element) => element.getAnimations()[0]?.startTime);
  await page.getByRole("link", { name: "Аналитика тем", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Результаты по темам", exact: true })).toBeVisible();
  expect(await header.evaluate((element) => element.getAnimations()[0]?.startTime)).toBe(animation);
});

test("reduced motion skips the entrance and keeps mobile navigation usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const file = page.getByLabel("Текущий файл анализа");
  await expect(file).toBeVisible();
  await expect(page.locator(".app-header")).toHaveCSS("animation-name", "none");
  await expect(file).toHaveCSS("animation-name", "none");
  await expect(file).toHaveCSS("opacity", "1");
  expect(await page.locator(".app-header").evaluate((element) => getComputedStyle(element, "::after").content)).toBe("none");
  await page.getByRole("button", { name: "Открыть навигацию" }).click();
  await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeVisible();
  await page.getByRole("link", { name: "Данные", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Источники данных", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
