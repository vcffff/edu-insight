const labels: Record<string, string> = {
  average_score: "Средний балл",
  total_students: "Количество учащихся",
  student_count: "Количество учащихся",
  students_count: "Количество учащихся в диапазоне",
  total_topics: "Количество тем",
  critical_topics: "Количество критических тем",
  mastery: "Уровень освоения",
  current_hours: "Текущие часы",
  recommended_hours: "Рекомендуемые часы",
  topic: "Тема",
  textbook: "Учебник",
  score: "Балл",
  sample_size: "Размер выборки",
  skill_accuracy: "Точность по навыку",
  incorrect_answers: "Неверных ответов",
};

export function metricLabel(metric: string): string {
  return labels[metric] ?? metric.replace(/_/g, " ");
}

export function evidenceValue(value: unknown, unit?: string | null): string {
  if (value === null || value === undefined) return "Нет данных";
  if (unit === "ratio" && typeof value === "number") return `${(value * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
  if (typeof value === "number") return value.toLocaleString("ru-RU", { maximumFractionDigits: 4 });
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (Array.isArray(value)) return value.length ? value.map((item) => evidenceValue(item)).join("; ") : "Нет данных";
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length ? entries.map(([key, item]) => `${metricLabel(key)}: ${evidenceValue(item)}`).join("; ") : "Нет данных";
  }
  return String(value);
}

export function evidenceUnit(unit?: string | null): string {
  if (!unit) return "";
  return ({ ratio: "", percent: "%", percentage: "%", hours: "ч.", students: "учащихся", points: "баллов", answers: "ответов", records: "записей" } as Record<string, string>)[unit] ?? unit;
}
