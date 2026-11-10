import Papa from "papaparse";
import type { Assessment } from "./types";
export const requiredHeaders = [
  "student_id",
  "school_id",
  "assessment_name",
  "topic_id",
  "score_pct",
  "textbook_edition",
  "date",
];
export interface Validation {
  records: Assessment[];
  errors: string[];
  warnings: string[];
}
export function validateCSV(text: string): Validation {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) =>
      h
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase(),
  });
  const errors: string[] = [],
    warnings: string[] = [];
  const missing = requiredHeaders.filter(
    (h) => !parsed.meta.fields?.includes(h),
  );
  if (missing.length)
    return {
      records: [],
      errors: [`Отсутствуют обязательные столбцы: ${missing.join(", ")}`],
      warnings,
    };
  if (parsed.errors.length)
    errors.push(
      ...parsed.errors
        .slice(0, 5)
        .map(
          (e) =>
            `Строка ${(e.row ?? 0) + 2}: некорректная структура CSV (${e.code}).`,
        ),
    );
  if (!parsed.data.length)
    errors.push("В CSV есть заголовки, но нет результатов оценивания.");
  if (parsed.data.length > 100000)
    errors.push("За одну загрузку допускается не более 100 000 строк.");
  const records: Assessment[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  parsed.data.forEach((r, i) => {
    const row = i + 2;
    const empty = requiredHeaders.filter((k) => !r[k]?.trim());
    const score = Number(r.score_pct);
    const grade = r.grade?.trim() ? Number(r.grade) : 10;
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(r.date?.trim()) &&
      !Number.isNaN(Date.parse(r.date)) &&
      new Date(r.date).toISOString().slice(0, 10) === r.date.trim();
    if (
      empty.length ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100 ||
      !validDate ||
      !Number.isInteger(grade) ||
      grade < 1 ||
      grade > 12
    ) {
      if (errors.length < 10)
        errors.push(
          `Строка ${row}: ${empty.length ? `не заполнено ${empty.join(", ")}` : !validDate ? "дата должна быть корректной в формате ГГГГ-ММ-ДД" : grade < 1 || grade > 12 || !Number.isInteger(grade) ? "класс должен быть целым числом от 1 до 12" : "score_pct должен быть числом от 0 до 100"}.`,
        );
      return;
    }
    const key = [
      r.student_id.trim(),
      r.topic_id.trim(),
      r.assessment_name.trim(),
      r.date.trim(),
    ].join("|");
    if (seen.has(key)) {
      duplicates++;
      return;
    }
    seen.add(key);
    records.push({
      student_id: r.student_id.trim(),
      school_id: r.school_id.trim(),
      assessment_name: r.assessment_name.trim(),
      topic_id: r.topic_id.trim(),
      score_pct: score,
      textbook_edition: r.textbook_edition.trim(),
      date: r.date.trim(),
      grade,
    });
  });
  if (!parsed.meta.fields?.includes("grade"))
    warnings.push("Столбец grade не найден. Для записей выбран 10 класс.");
  if (duplicates)
    warnings.push(
      `${duplicates} повторяющихся записей удалено (учащийся, тема, работа, дата).`,
    );
  if (
    parsed.meta.fields?.some((h) =>
      /email|first_name|last_name|phone|address|full_name/i.test(h),
    )
  )
    warnings.push(
      "Дополнительные столбцы с персональными данными исключены. Сохранены только поля результатов. Используйте обезличенные ID учащихся.",
    );
  return { records: errors.length ? [] : records, errors, warnings };
}
export function toCSV(records: Assessment[]) {
  return Papa.unparse(records, { escapeFormulae: true });
}
