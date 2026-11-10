"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Toaster } from "sonner";
import { DataSourceProvider } from "@/providers/data-source-provider";
import { useDataSource } from "@/hooks/use-data-source";
import { sourceKey } from "@/lib/data-source";
import {
  mockInitialDataset,
  mockInitialAnalytics,
} from "@/lib/data-source/mock-provider";
import type { Filters } from "@/lib/types";
const FilterContext = createContext<{
  filters: Filters;
  setFilters: (v: Filters) => void;
}>({ filters: { grade: "all", school: "all" }, setFilters: () => {} });
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  const [filters, setFilters] = useState<Filters>({
    grade: "all",
    school: "all",
  });
  return (
    <QueryClientProvider client={queryClient}>
      <FilterContext.Provider value={{ filters, setFilters }}>
        <DataSourceProvider>
          <FilterCompatibility />
          {children}
        </DataSourceProvider>
        <Toaster richColors position="bottom-right" closeButton />
      </FilterContext.Provider>
    </QueryClientProvider>
  );
}
export const useFilters = () => useContext(FilterContext);
export const useDataset = () => {
  const { source, repository } = useDataSource();
  return useQuery({
    queryKey: sourceKey(source, "dataset"),
    queryFn: ({ signal }) => repository.dataset(signal),
    initialData: source === "mock" ? mockInitialDataset : undefined,
    initialDataUpdatedAt: 0,
    retry: false,
    networkMode: "always",
  });
};
export const useAnalytics = () => {
  const { filters } = useFilters();
  const { source, repository } = useDataSource();
  const { data } = useDataset();
  const local = useMemo(
    () =>
      source === "mock" && data
        ? mockInitialAnalytics(data, filters)
        : undefined,
    [source, data, filters],
  );
  return useQuery({
    queryKey: sourceKey(source, "analytics", data?.id ?? "active", filters),
    queryFn: ({ signal }) => repository.analytics(filters, signal),
    enabled: !!data,
    placeholderData: local,
    retry: false,
    networkMode: "always",
  });
};
export function useTextbooks() {
  const { source, repository } = useDataSource();
  const { filters } = useFilters();
  const { data } = useDataset();
  return useQuery({
    queryKey: sourceKey(source, "textbooks", data?.id, filters),
    queryFn: ({ signal }) => repository.textbooks(filters, signal),
    enabled: !!data,
    retry: false,
    networkMode: "always",
  });
}
export function useRecommendations() {
  const { source, repository } = useDataSource();
  const { filters } = useFilters();
  const { data } = useDataset();
  return useQuery({
    queryKey: sourceKey(source, "recommendations", data?.id, filters),
    queryFn: ({ signal }) => repository.recommendations(filters, signal),
    enabled: !!data,
    retry: false,
    networkMode: "always",
  });
}
export function useOptimization() {
  const { source, repository } = useDataSource();
  const { filters } = useFilters();
  const { data } = useDataset();
  return useQuery({
    queryKey: sourceKey(source, "optimization", data?.id, filters),
    queryFn: ({ signal }) =>
      repository.optimization({ filters, scenario: "balanced" }, signal),
    enabled: !!data,
    retry: false,
    networkMode: "always",
  });
}
function FilterCompatibility() {
  const { data, isSuccess } = useDataset();
  const { filters, setFilters } = useFilters();
  useEffect(() => {
    if (!isSuccess || !data?.records.length) return;
    const grade =
      filters.grade === "all" ||
      data.records.some((r) => String(r.grade) === filters.grade)
        ? filters.grade
        : "all";
    const school =
      filters.school === "all" ||
      data.records.some((r) => r.school_id === filters.school)
        ? filters.school
        : "all";
    if (grade !== filters.grade || school !== filters.school)
      setFilters({ grade, school });
  }, [data, isSuccess, filters, setFilters]);
  return null;
}
