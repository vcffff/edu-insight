import { z } from "zod";
const score = z.number().min(0).max(100);
const count = z.number().int().nonnegative();
const assessment = z.object({
  student_id: z.string(),
  school_id: z.string(),
  assessment_name: z.string(),
  topic_id: z.string(),
  score_pct: score,
  textbook_edition: z.string(),
  date: z.string(),
  grade: z.number().int().min(1).max(12),
});
export const datasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  uploadedAt: z.string(),
  source: z.enum(["Demo dataset", "CSV upload", "Live API"]),
  records: z.array(assessment),
});
export const analyticsSchema = z.object({
  students: count,
  average: score,
  critical: count,
  textbooks: z.array(z.string()),
  topics: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      short: z.string(),
      domain: z.string(),
      mastery: score,
      students: count,
      belowTarget: count,
    }),
  ),
  distribution: z.array(
    z.object({
      name: z.string(),
      value: count,
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
  ),
  campuses: z.array(z.string()),
  records: count,
  heatmap: z.array(
    z.object({ topic: z.string(), values: z.record(z.string(), score) }),
  ),
});
export const comparisonSchema = z.object({
  rows: z.array(
    z.object({
      topic: z.string(),
      a: score.nullable(),
      b: score.nullable(),
      nA: count,
      nB: count,
      delta: z.number().nullable(),
    }),
  ),
  nA: count,
  nB: count,
  averageA: score,
  averageB: score,
});
export const allocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  mastery: score,
  baseline: z.number().min(0).max(36),
  hours: z.number().min(0).max(36),
  locked: z.boolean(),
});
export const planSchema = z.object({
  allocations: z.array(allocationSchema),
  savedAt: z.string(),
  datasetId: z.string(),
});
export const recommendationSchema = z.object({
  id: z.string(),
  kind: z.enum(["allocation", "diagnostic", "textbook"]),
  priority: z.enum(["High priority", "Review"]),
  title: z.string(),
  description: z.string(),
  evidence: z.array(z.string()),
  explanation: z.string(),
  href: z
    .string()
    .refine((v) =>
      /^\/(curriculum-optimizer|topic-analytics)(\?|$)/.test(
        v,
      ),
    ),
  action: z.string(),
});
