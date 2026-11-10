import type { Assessment, Dataset } from "./types";
export const topicDefinitions = [
  {
    id: "functions",
    name: "Функции и отношения",
    short: "Функции",
    domain: "Функции и преобразования",
    target: 91,
  },
  {
    id: "algebra",
    name: "Алгебра и многочлены",
    short: "Алгебра",
    domain: "Алгебраические выражения",
    target: 84,
  },
  {
    id: "trigonometry",
    name: "Основы тригонометрии",
    short: "Тригонометрия",
    domain: "Тригонометрия",
    target: 73,
  },
  {
    id: "statistics",
    name: "Описательная и выводная статистика",
    short: "Статистика",
    domain: "Анализ данных",
    target: 67,
  },
  {
    id: "probability",
    name: "Вероятность и комбинаторика",
    short: "Вероятность",
    domain: "Дискретная математика",
    target: 62,
  },
  {
    id: "geometry",
    name: "Геометрия: евклидовы доказательства",
    short: "Геометрия",
    domain: "Планиметрия",
    target: 48,
  },
];
export const textbooks = [
  "Integrated Mathematics II (Kendall Hunt)",
  "Core Geometry & Algebra (Pearson)",
  "CPM Core Connections",
  "OpenStax Algebra II",
];
export const campuses = [
  "Северная школа",
  "Западная школа",
  "Центральная школа",
  "Восточная школа",
];
export function createDemoDataset(): Dataset {
  const records: Assessment[] = [];
  for (let i = 0; i < 1248; i++) {
    topicDefinitions.forEach((topic, j) => {
      const bookIndex =
        i % 12 < 6 ? 0 : i % 12 < 10 ? 1 : i % 12 === 10 ? 2 : 3;
      const bookEffect =
        topic.id === "geometry"
          ? [8, -9, 2, -4][bookIndex]
          : [2, -2, 0, -1][bookIndex];
      const spread = ((i * 17 + j * 13) % 41) - 20;
      records.push({
        student_id: `STU-${String(i + 1).padStart(5, "0")}`,
        school_id: campuses[Math.floor(i / 12) % 4],
        assessment_name: "Промежуточная работа по математике 2025",
        topic_id: topic.id,
        score_pct: Math.min(
          100,
          Math.max(0, topic.target + bookEffect + spread),
        ),
        textbook_edition: textbooks[bookIndex],
        date: "2025-01-18",
        grade: 9 + Math.floor(i / 416),
      });
    });
  }
  return {
    id: "demo-midterm-2025",
    name: "Промежуточная работа по математике 2025",
    uploadedAt: "2025-01-18T09:30:00Z",
    source: "Demo dataset",
    records,
  };
}
