export interface Assessment {
  student_id: string;
  school_id: string;
  assessment_name: string;
  topic_id: string;
  score_pct: number;
  textbook_edition: string;
  date: string;
  grade: number;
}
export interface Dataset {
  id: string;
  name: string;
  uploadedAt: string;
  source: "Demo dataset" | "CSV upload" | "Live API";
  records: Assessment[];
  rowCount?: number;
  status?: "uploaded" | "processing" | "completed" | "failed";
}
export interface Filters {
  grade: string;
  school: string;
  subject?: string;
  textbook?: string;
  topic?: string;
}
export interface Topic {
  id: string;
  name: string;
  short: string;
  domain: string;
  mastery: number;
  students: number;
  belowTarget: number;
}
export interface Analytics {
  students: number;
  average: number;
  critical: number;
  textbooks: string[];
  topics: Topic[];
  distribution: { name: string; value: number; color: string }[];
  campuses: string[];
  records: number;
  heatmap: { topic: string; values: Record<string, number> }[];
  backend?: import("./data-source/backend-schemas").BackendAnalytics;
}
export interface ComparisonRow {
  topic: string;
  a: number | null;
  b: number | null;
  nA: number;
  nB: number;
  delta: number | null;
}
export interface Comparison {
  rows: ComparisonRow[];
  nA: number;
  nB: number;
  averageA: number;
  averageB: number;
}
export interface Allocation {
  id: string;
  name: string;
  mastery: number;
  baseline: number;
  hours: number;
  locked: boolean;
}
export interface Plan {
  allocations: Allocation[];
  savedAt: string;
  datasetId: string;
}
