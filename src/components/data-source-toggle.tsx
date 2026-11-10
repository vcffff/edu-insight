"use client";
import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useDataSource } from "@/hooks/use-data-source";
import { sourceKey } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
export function useConnectionStatus() {
  const { source } = useDataSource();
  const client = useQueryClient();
  return useSyncExternalStore(
    (callback) => client.getQueryCache().subscribe(callback),
    () => {
      if (source === "mock") return "synthetic";
      const queries = client
        .getQueryCache()
        .findAll({ queryKey: sourceKey(source), type: "active" });
      if (queries.some((q) => q.state.fetchStatus === "fetching"))
        return "connecting";
      if (queries.some((q) => q.state.status === "error")) return "unavailable";
      return queries.some((q) => q.state.status === "success")
        ? "connected"
        : "connecting";
    },
    () => (source === "mock" ? "synthetic" : "connecting"),
  );
}
export function DataSourceToggle() {
  const { source, setSource } = useDataSource();
  const status = useConnectionStatus();
  const label = {
    synthetic: "Синтетические данные",
    connecting: "Подключение",
    connected: "API подключён",
    unavailable: "API недоступен",
  }[status];
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div
        role="group"
        aria-label="Источник данных"
        className="inline-flex rounded-lg border border-outline-variant/30 bg-surface-container-low p-0.5"
      >
        {[
          { value: "mock", label: "Демоданные" },
          { value: "api", label: "Live API" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={source === item.value}
            onClick={() => setSource(item.value as "mock" | "api")}
            className={cn(
              "h-7 rounded-md px-2 text-[10px] font-medium transition-colors sm:px-2.5",
              source === item.value
                ? "bg-white text-primary shadow-sm"
                : "text-secondary hover:text-on-surface",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span
        role="status"
        aria-label={label}
        title={label}
        className="flex items-center gap-1.5 text-[10px] text-secondary"
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "unavailable"
              ? "bg-error"
              : status === "connecting"
                ? "animate-pulse bg-amber-500"
                : "bg-tertiary-container",
          )}
        />
        <span className="sr-only 2xl:not-sr-only">{label}</span>
      </span>
    </div>
  );
}
export function SourceErrorBanner() {
  const { source } = useDataSource();
  const status = useConnectionStatus();
  const client = useQueryClient();
  if (source !== "api" || status !== "unavailable") return null;
  const error = client
    .getQueryCache()
    .findAll({ queryKey: sourceKey(source), type: "active" })
    .find((q) => q.state.status === "error")?.state.error;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-error/20 bg-error-container/25 px-3 py-2"
    >
      <p className="text-xs leading-5 text-error">
        <strong>API недоступен.</strong>{" "}
        {error?.message?.replace(/^API недоступен:\s*/, "") ??
          "Не удалось подключиться к серверу."}{" "}
        В режиме Live API демоданные не подставляются.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          void client.invalidateQueries({ queryKey: sourceKey(source) })
        }
      >
        <RefreshCw />
        Повторить
      </Button>
    </div>
  );
}
