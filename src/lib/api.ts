import { analyze, compare, filterRecords } from "./analytics";
import { createDemoDataset } from "./mock-data";
import type { Dataset, Filters, Plan } from "./types";
const DATA_KEY = "eduinsight-dataset-v1",
  PLAN_KEY = "eduinsight-plan-v1";
let current: Dataset | null = null;
const delay = () => new Promise((resolve) => setTimeout(resolve, 280));
function readDataset(): Dataset {
  if (current) return current;
  try {
    const saved = sessionStorage.getItem(DATA_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Dataset;
      if (
        parsed.id &&
        Array.isArray(parsed.records) &&
        parsed.records.every(
          (r) =>
            typeof r.score_pct === "number" && typeof r.student_id === "string",
        )
      )
        current =
          parsed.source === "Demo dataset" ? createDemoDataset() : parsed;
    }
  } catch {
    /* Storage is optional in private browsing. */
  }
  return current ?? (current = createDemoDataset());
}
// Async mock adapter. Replace these methods with fetch() once the backend contract is provided.
export const api = {
  async dataset(): Promise<Dataset> {
    return readDataset();
  },
  async analytics(filters: Filters) {
    return analyze(filterRecords(readDataset().records, filters));
  },
  async comparison(filters: Filters, a: string, b: string) {
    return compare(filterRecords(readDataset().records, filters), a, b);
  },
  async upload(
    dataset: Dataset,
  ): Promise<{ dataset: Dataset; persisted: boolean }> {
    await delay();
    current = dataset;
    try {
      sessionStorage.setItem(DATA_KEY, JSON.stringify(dataset));
      return { dataset, persisted: true };
    } catch {
      return { dataset, persisted: false };
    }
  },
  async loadDemo() {
    return this.upload(createDemoDataset());
  },
  async savePlan(plan: Plan): Promise<Plan> {
    await delay();
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    return plan;
  },
  async savedPlan(): Promise<Plan | null> {
    await delay();
    try {
      const v = localStorage.getItem(PLAN_KEY);
      return v ? (JSON.parse(v) as Plan) : null;
    } catch {
      return null;
    }
  },
};
