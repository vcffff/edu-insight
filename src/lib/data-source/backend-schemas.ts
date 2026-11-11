import { z } from "zod";

const count = z.number().int().nonnegative();
const hours = z.number().nonnegative();
const score = z.number().min(0).max(100);
export const backendDatasetSchema = z.object({
  id: z.number().int(), dataset_id: z.number().int(), filename: z.string(),
  row_count: count, created_at: z.string(),
  status: z.enum(["uploaded", "processing", "completed", "failed"]),
});
export const datasetListSchema = z.object({ datasets: z.array(backendDatasetSchema) });
export const statusSchema = z.object({
  dataset_id: z.number().int(), status: backendDatasetSchema.shape.status,
  report_id: z.number().int().nullable(),
});
export const backendAnalyticsSchema = z.object({
  dataset_id: z.number().int(), generated_at: z.string(),
  overview: z.object({ total_students: count, total_observations: count.optional(), average_score: score.nullable(), total_topics: count, critical_topics: count }),
  topic_mastery: z.array(z.object({ topic: z.string(), score, student_count: count, sample_size: count.optional(), below_target_count: count.optional() })),
  performance_trend: z.array(z.object({ assessment_date: z.string(), score, student_count: count })),
  score_distribution: z.array(z.object({ score_range: z.string(), students_count: count })),
  student_average_distribution: z.array(z.object({ score_range: z.string(), students_count: count })).optional(),
  textbook_comparison: z.array(z.object({ textbook: z.string(), topic: z.string(), average_score: score, student_count: count })),
  topic_performance: z.array(z.object({ topic: z.string(), correct_answers: count, incorrect_answers: count })),
  data_quality_warnings: z.array(z.string()),
  available_filters: z.object({ grades: z.array(z.number().int()), subjects: z.array(z.string()), textbooks: z.array(z.string()), topics: z.array(z.string()) }),
});
export const optimizeSchema = z.object({
  dataset_id: z.number().int().nullable(), total_hours: hours, method: z.string(),
  allocations: z.array(z.object({ topic: z.string(), current_hours: hours, recommended_hours: hours, change: z.number(), mastery: z.number().min(0).max(1), priority: z.number().min(0).max(1) })),
});
const evidence = z.object({ metric: z.string(), value: z.unknown(), unit: z.string().nullable().optional() });
export const reportSchema = z.object({
  executive_summary: z.object({ title: z.string(), summary: z.string(), overall_status: z.enum(["needs_attention", "satisfactory", "insufficient_data"]), key_findings_count: count }),
  key_findings: z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), severity: z.enum(["critical", "high", "medium", "low", "info"]), topic: z.string().nullable(), evidence: z.array(evidence) })),
  topic_analysis: z.array(z.object({ topic: z.string(), status: z.enum(["critical", "needs_attention", "satisfactory"]), interpretation: z.string(), main_concern: z.string().nullable() })),
  textbook_analysis: z.array(z.object({ textbook: z.string(), observation: z.string(), confidence: z.enum(["limited", "moderate"]), limitations: z.array(z.string()) })),
  curriculum_explanation: z.object({ summary: z.string(), total_hours_preserved: z.boolean().nullable(), topic_explanations: z.array(z.object({ topic: z.string(), current_hours: hours, recommended_hours: hours, reason: z.string() })) }),
  recommendations: z.array(z.object({ id: z.string(), title: z.string(), priority: z.enum(["high", "medium", "low"]), action: z.string(), related_topics: z.array(z.string()), evidence: z.array(z.string()) })),
  limitations: z.array(z.string()), data_quality_warnings: z.array(z.string()), generated_language: z.enum(["en", "ru", "kk"]),
});
export const storedReportSchema = z.object({ id: z.number().int(), dataset_id: z.number().int(), status: z.literal("completed"), report: reportSchema, created_at: z.string() });
export const itemImportSchema = z.object({ dataset_id: z.number().int(), row_count: count, skill_count: count });
export const skillAnalyticsSchema = z.object({
  dataset_id: z.number().int(), item_response_count: count,
  skills: z.array(z.object({
    subject: z.string().nullable().optional(),
    topic: z.string(), skill: z.string(), correct_answers: count, incorrect_answers: count,
    student_count: count, item_count: count, accuracy_percent: score,
    status: z.enum(["insufficient_data", "needs_attention", "on_target"]),
    suggested_action: z.string(),
  })),
});
export type BackendAnalytics = z.infer<typeof backendAnalyticsSchema>;
export type BackendReport = z.infer<typeof reportSchema>;
export type SkillAnalytics = z.infer<typeof skillAnalyticsSchema>;
