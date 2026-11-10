import { api } from "../api";
import {
  analyze,
  filterRecords,
  createAllocations,
  optimize,
} from "../analytics";
import { createDemoDataset } from "../mock-data";
import type { Dataset, Filters } from "../types";
import { buildRecommendations } from "./recommendations";
import type { Repository } from "./types";
export const mockInitialDataset = createDemoDataset();
export const mockInitialAnalytics = (dataset: Dataset, filters: Filters) =>
  analyze(filterRecords(dataset.records, filters));
export const loadMockDemo = () => api.loadDemo();
// Browser-local data only. No fetch or backend calls are made by this provider.
export const mockProvider: Repository = {
  dataset: () => api.dataset(),
  analytics: (filters) => api.analytics(filters),
  textbooks: async (filters) => (await api.analytics(filters)).textbooks,
  comparison: (filters, a, b) => api.comparison(filters, a, b),
  optimization: async (input) =>
    optimize(
      input.allocations ??
        createAllocations(await api.analytics(input.filters)),
      input.scenario,
    ),
  recommendations: async (filters) =>
    buildRecommendations(
      await api.analytics(filters),
      (await api.dataset()).id,
    ),
  upload: (dataset) => api.upload(dataset),
  savePlan: (plan) => api.savePlan(plan),
  savedPlan: () => api.savedPlan(),
};
