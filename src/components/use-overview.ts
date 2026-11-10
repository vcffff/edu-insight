"use client";
import { useAnalytics, useDataset } from "./providers";
// Overview uses the same source-aware queries as every other screen. Live errors
// remain errors; synthetic placeholders are only allowed in Mock mode.
export function useOverview() {
  const dataset = useDataset();
  const analytics = useAnalytics();
  return { dataset, analytics };
}
