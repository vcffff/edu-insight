import { z } from "zod";
import { toCSV } from "../csv";
import type { Analytics, Dataset, Filters } from "../types";
import type { Repository } from "./types";
import { backendAnalyticsSchema, backendDatasetSchema, datasetListSchema, itemImportSchema, optimizeSchema, reportSchema, skillAnalyticsSchema } from "./backend-schemas";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}
export const API_TIMEOUT_MS = 30000;
const ACTIVE_KEY = "eduinsight-active-backend-dataset";
const emptyDataset: Dataset = { id: "api-empty", name: "Нет загруженных наборов данных", source: "Live API", uploadedAt: "1970-01-01T00:00:00Z", records: [], rowCount: 0 };
const emptyAnalytics: Analytics = { students: 0, average: 0, critical: 0, textbooks: [], topics: [], distribution: [], campuses: [], records: 0, heatmap: [] };

export function createApiProvider(baseUrl: string | undefined, timeoutMs = API_TIMEOUT_MS): Repository {
  // Accept either the server origin or a URL already ending in /api.
  const configuredUrl = baseUrl?.trim();
  const base = configuredUrl?.replace(/\/+$/, "").replace(/\/api$/, "");
  const sameOrigin = configuredUrl === "/";
  let active: string | undefined;
  let lastOptimization: z.infer<typeof optimizeSchema> | undefined;
  async function request<T>(path: string, schema: z.ZodType<T>, options: { signal?: AbortSignal; body?: unknown; method?: string; timeout?: number } = {}): Promise<T> {
    if (!sameOrigin && (!base || !/^https?:\/\//i.test(base))) throw new ApiError("Укажите HTTP(S) адрес сервера или / в NEXT_PUBLIC_API_URL.");
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    const timer = setTimeout(abort, options.timeout ?? timeoutMs);
    try {
      const multipart = options.body instanceof FormData;
      const response = await fetch(`${base}/api${path}`, {
        method: options.method ?? "GET", signal: controller.signal, cache: "no-store",
        headers: { Accept: "application/json", ...(options.body && !multipart ? { "Content-Type": "application/json" } : {}) },
        ...(options.body ? { body: multipart ? options.body as FormData : JSON.stringify(options.body) } : {}),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const detail = typeof error?.detail === "string" ? error.detail : error?.detail ? JSON.stringify(error.detail) : response.statusText;
        throw new ApiError(`Ошибка API (${response.status}): ${detail}`, response.status);
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) throw new ApiError("Ответ API не соответствует openapi.json.");
      return parsed.data;
    } catch (error) {
      if (error instanceof ApiError || options.signal?.aborted) throw error;
      throw new ApiError(controller.signal.aborted ? "Время ожидания API истекло. Повторите запрос." : "Не удалось подключиться к API. Проверьте адрес сервера и CORS.");
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  function selectDataset(id: string) {
    active = id;
    lastOptimization = undefined;
    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* Storage is optional. */ }
  }
  function adaptDataset(row: z.infer<typeof backendDatasetSchema>): Dataset {
    return { id: String(row.dataset_id), name: row.filename, uploadedAt: row.created_at, records: [], source: "Live API", rowCount: row.row_count, status: row.status };
  }
  async function datasets(signal?: AbortSignal) {
    return (await request("/datasets", datasetListSchema, { signal })).datasets.map(adaptDataset);
  }
  async function dataset(signal?: AbortSignal) {
    const rows = await datasets(signal);
    if (!active) { try { active = localStorage.getItem(ACTIVE_KEY) ?? undefined; } catch { /* Optional. */ } }
    const selected = rows.find((row) => row.id === active) ?? [...rows].sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt) || Number(b.id) - Number(a.id))[0];
    if (selected) active = selected.id;
    return selected ?? emptyDataset;
  }
  async function analytics(filters: Filters, signal?: AbortSignal): Promise<Analytics> {
    const ds = await dataset(signal);
    if (ds.id === emptyDataset.id) return emptyAnalytics;
    const params = new URLSearchParams();
    if (filters.grade !== "all") params.set("grade", filters.grade);
    for (const key of ["subject", "textbook", "topic"] as const) if (filters[key] && filters[key] !== "all") params.set(key, filters[key]);
    const raw = await request(`/datasets/${ds.id}/analytics${params.size ? `?${params}` : ""}`, backendAnalyticsSchema, { signal });
    return {
      students: raw.overview.total_students, average: raw.overview.average_score ?? 0, critical: raw.overview.critical_topics,
      textbooks: raw.available_filters.textbooks,
      topics: raw.topic_mastery.map((t) => ({ id: t.topic, name: t.topic, short: t.topic, domain: "—", mastery: t.score, students: t.student_count, belowTarget: t.below_target_count ?? 0 })),
      distribution: (raw.student_average_distribution ?? raw.score_distribution).map((p, i) => ({ name: p.score_range, value: p.students_count, color: ["#ba1a1a", "#b7791f", "#565e74", "#00856a", "#3525cd"][i % 5] })),
      campuses: [], records: raw.overview.total_observations ?? ds.rowCount ?? 0, heatmap: [], backend: raw,
    };
  }
  const uploadFile = async (file: File) => {
    const body = new FormData();
    body.append("file", file, file.name);
    const saved = adaptDataset(await request("/datasets/upload", backendDatasetSchema, { method: "POST", body }));
    selectDataset(saved.id);
    return { dataset: saved, persisted: true };
  };
  async function analysis(signal?: AbortSignal, _regenerate = false, subject?: string) {
    void _regenerate;
    const ds = await dataset(signal);
    if (ds.id === emptyDataset.id) return null;
    const optimization = (!subject || subject === "all") && lastOptimization?.dataset_id === Number(ds.id) ? lastOptimization : undefined;
    return request("/recommendations/analyze", reportSchema, { method: "POST", signal, timeout: Math.max(timeoutMs, 120000), body: { dataset_id: Number(ds.id), language: "ru", ...(subject && subject !== "all" ? { subject } : {}), ...(optimization ? { optimization } : {}) } });
  }
  return {
    dataset, datasets, selectDataset, uploadFile, analytics, analysis,
    uploadItems: async (datasetId, file) => {
      const body = new FormData();
      body.append("file", file, file.name);
      return request(`/datasets/${encodeURIComponent(datasetId)}/items/upload`, itemImportSchema, { method: "POST", body });
    },
    skills: (datasetId, topic, signal, subject) => {
      const params = new URLSearchParams();
      if (topic) params.set("topic", topic);
      if (subject && subject !== "all") params.set("subject", subject);
      return request(`/datasets/${encodeURIComponent(datasetId)}/skills${params.size ? `?${params}` : ""}`, skillAnalyticsSchema, { signal });
    },
    health: (signal) => request("/health", z.object({ status: z.literal("ok"), database: z.enum(["ok", "unavailable"]) }), { signal }),
    upload: (data) => uploadFile(new File([toCSV(data.records)], `${data.name}.csv`, { type: "text/csv" })),
    textbooks: async (filters, signal) => (await analytics(filters, signal)).textbooks,
    comparison: async (filters, a, b, signal) => {
      const raw = (await analytics(filters, signal)).backend;
      const points = raw?.textbook_comparison ?? [];
      const rows = [...new Set(points.filter((p) => p.textbook === a || p.textbook === b).map((p) => p.topic))].map((topic) => {
        const x = points.find((p) => p.topic === topic && p.textbook === a);
        const y = points.find((p) => p.topic === topic && p.textbook === b);
        return { topic, a: x?.average_score ?? null, b: y?.average_score ?? null, nA: x?.student_count ?? 0, nB: y?.student_count ?? 0, delta: x && y ? x.average_score - y.average_score : null };
      });
      // Student counts across topics may overlap; do not invent unique totals.
      return { rows, nA: 0, nB: 0, averageA: 0, averageB: 0 };
    },
    optimization: async (input, signal) => {
      const data = await analytics({ grade: "all", school: "all" }, signal);
      if (!data.backend || !data.topics.length) return [];
      // CSV analytics do not contain teaching hours. These are editable planning defaults, not observed data.
      const current = input.allocations ?? data.topics.map((t, i) => ({ id: t.id, hours: Math.floor(36 / data.topics.length) + (i < 36 % data.topics.length ? 1 : 0) }));
      if (current.some((r) => !Number.isInteger(r.hours))) throw new ApiError("API принимает только целое число часов. Округлите значения перед оптимизацией.");
      const result = await request("/curriculum/optimize", optimizeSchema, { method: "POST", signal, body: { dataset_id: data.backend.dataset_id, current_hours: Object.fromEntries(current.map((r) => [r.id, r.hours])), minimum_hours: 0, max_change_per_topic: 4, weak_threshold: input.scenario === "exam" ? 0.75 : 0.6 } });
      lastOptimization = result;
      return result.allocations.map((r) => ({ id: r.topic, name: r.topic, baseline: r.current_hours, hours: r.recommended_hours, mastery: r.mastery * 100, locked: false }));
    },
    recommendations: async (filters, signal) => {
      const report = await analysis(signal, false, filters.subject);
      if (!report) return [];
      return report.recommendations.map((r) => ({ id: r.id, kind: "diagnostic" as const, priority: r.priority === "high" ? "High priority" as const : "Review" as const, title: r.title, description: r.action, evidence: r.evidence, explanation: [report.executive_summary.summary, ...report.topic_analysis.filter((t) => r.related_topics.includes(t.topic)).map((t) => t.interpretation), ...report.limitations, ...report.data_quality_warnings].join("\n"), href: "/topic-analytics", action: "Изучить результаты" }));
    },
    savePlan: async () => { throw new ApiError("Сохранение планов не предусмотрено API. Экспортируйте план в CSV."); },
    savedPlan: async () => null,
  };
}
