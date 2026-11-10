import { topicDefinitions } from "./mock-data";
import type { Dataset } from "./types";
export const sourceLabel = (source: Dataset["source"]) =>
  ({
    "Demo dataset": "Демоданные",
    "CSV upload": "Загрузка CSV",
    "Live API": "Live API",
  })[source];
export const topicLabel = (id: string) =>
  topicDefinitions.find((topic) => topic.id === id)?.name ?? id;
export const decimal = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
