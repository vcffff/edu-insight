import type {
  Allocation,
  Analytics,
  Comparison,
  Dataset,
  Filters,
  Plan,
} from "../types";
export type DataSource = "mock" | "api";
export type ConnectionStatus =
  "synthetic" | "connecting" | "connected" | "unavailable";
export interface Recommendation {
  id: string;
  kind: "allocation" | "diagnostic" | "textbook";
  priority: "High priority" | "Review";
  title: string;
  description: string;
  evidence: string[];
  explanation: string;
  href: string;
  action: string;
}
export interface OptimizationInput {
  filters: Filters;
  scenario: "balanced" | "exam";
  allocations?: Allocation[];
}
export interface Repository {
  health?(signal?: AbortSignal): Promise<{ status: "ok"; database: "ok" | "unavailable" }>;
  analysis?(signal?: AbortSignal, regenerate?: boolean, subject?: string): Promise<import("./backend-schemas").BackendReport | null>;
  datasets?(signal?: AbortSignal): Promise<Dataset[]>;
  selectDataset?(id: string): void;
  uploadFile?(file: File): Promise<{ dataset: Dataset; persisted: boolean }>;
  uploadItems?(datasetId: string, file: File): Promise<{ dataset_id: number; row_count: number; skill_count: number }>;
  skills?(datasetId: string, topic?: string, signal?: AbortSignal, subject?: string): Promise<import("./backend-schemas").SkillAnalytics>;
  dataset(signal?: AbortSignal): Promise<Dataset>;
  analytics(filters: Filters, signal?: AbortSignal): Promise<Analytics>;
  textbooks(filters: Filters, signal?: AbortSignal): Promise<string[]>;
  comparison(
    filters: Filters,
    a: string,
    b: string,
    signal?: AbortSignal,
  ): Promise<Comparison>;
  optimization(
    input: OptimizationInput,
    signal?: AbortSignal,
  ): Promise<Allocation[]>;
  recommendations(
    filters: Filters,
    signal?: AbortSignal,
  ): Promise<Recommendation[]>;
  upload(dataset: Dataset): Promise<{ dataset: Dataset; persisted: boolean }>;
  savePlan(plan: Plan): Promise<Plan>;
  savedPlan(signal?: AbortSignal): Promise<Plan | null>;
}
