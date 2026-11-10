import type { Analytics } from "../types";
import type { Recommendation } from "./types";
export function buildRecommendations(
  d: Analytics,
  datasetId: string,
): Recommendation[] {
  const weak = [...d.topics].sort((a, b) => a.mastery - b.mastery)[0];
  if (!weak) return [];
  return [
    {
      id: `allocate-${datasetId}`,
      kind: "allocation",
      priority: "High priority",
      title: `Выделите время на практику по теме «${weak.short}»`,
      description: `Наименее освоенная тема этой группы — «${weak.name}»: ${weak.mastery.toLocaleString("ru-RU")}%. Рассмотрите перенос части часов из более освоенных тем без увеличения общего бюджета.`,
      evidence: [
        `${weak.mastery.toLocaleString("ru-RU")}% освоения темы`,
        `${weak.students.toLocaleString("ru-RU")} учащихся в выборке`,
        `${weak.belowTarget.toLocaleString("ru-RU")} результатов ниже 75%`,
      ],
      explanation:
        "Рекомендация учитывает наименьший средний балл и целевой уровень 75%. Это не прогноз улучшения. Проверьте посещаемость, охват программы и ошибки в заданиях, затем проведите практику и повторную диагностику.",
      href: "/curriculum-optimizer",
      action: "Открыть оптимизатор",
    },
    {
      id: `diagnose-${datasetId}`,
      kind: "diagnostic",
      priority: "High priority",
      title: "Уточните пробел до изменения программы",
      description: `Проведите короткую диагностику по теме «${weak.short}», чтобы отличить пробелы в понимании от трудностей с форматом заданий.`,
      evidence: [
        `${Math.max(0, 75 - weak.mastery).toLocaleString("ru-RU")} п. п. ниже цели`,
        `${d.campuses.length} школ в выборке`,
        "Нужен анализ отдельных заданий",
      ],
      explanation:
        "Средние баллы указывают, где искать проблему, но не объясняют её причины. Выберите типичные задания, попросите учащихся объяснить решения и сгруппируйте ошибки по навыкам.",
      href: `/topic-analytics?topic=${encodeURIComponent(weak.id)}`,
      action: "Изучить результаты по теме",
    },
  ];
}
