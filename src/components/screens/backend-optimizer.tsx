"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDataSource } from "@/hooks/use-data-source";
import type { Allocation } from "@/lib/types";
import { useAnalytics, useDataset } from "../providers";
import { Card, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PageHeading, LoadingState } from "../shared";
import { AllocationChart } from "../charts";
import { download } from "@/lib/utils";
import Papa from "papaparse";

export function BackendOptimizer() {
  const q = useAnalytics();
  const ds = useDataset();
  if (q.isError || ds.isError) return <Card className="space-y-3 p-5" role="alert"><p>{(q.error ?? ds.error)?.message}</p><Button onClick={() => { void q.refetch(); void ds.refetch(); }}>Повторить</Button></Card>;
  if (!q.data || !ds.data) return <LoadingState />;
  if (!q.data.backend?.available_filters.topics.length) return <Card className="p-6">Загрузите CSV с темами для оптимизации.</Card>;
  return <HourInputs key={ds.data.id} topics={q.data.backend.available_filters.topics} />;
}
function HourInputs({ topics }: { topics: string[] }) {
  const { repository } = useDataSource();
  const [hours, setHours] = useState<Record<string, number>>(() => Object.fromEntries(topics.map((topic) => [topic, 1])));
  const mutation = useMutation({ mutationFn: () => repository.optimization({ filters: { grade: "all", school: "all" }, scenario: "balanced", allocations: topics.map((topic) => ({ id: topic, name: topic, hours: hours[topic], baseline: hours[topic], mastery: 0, locked: false })) }) });
  const result = mutation.data;
  const total = Object.values(hours).reduce((sum, value) => sum + value, 0);
  const valid = Object.values(hours).every((value) => Number.isInteger(value) && value >= 0) && total > 0;
  function exportRows(rows: Allocation[]) {
    download("curriculum-allocation.csv", Papa.unparse(rows.map((r) => ({ topic: r.name, current_hours: r.baseline, recommended_hours: r.hours, change: r.hours - r.baseline, mastery: r.mastery / 100 }))));
  }
  return <>
    <PageHeading title="Оптимизатор программы" subtitle="Укажите реальные текущие часы по темам. Часы не содержатся в аналитике CSV; начальное значение 1 — только поле ввода, не результат анализа." />
    <Card className="space-y-4 p-5"><CardTitle>Текущие часы по темам</CardTitle><p className="text-xs text-secondary">Целые числа, от 0. Backend сохраняет общий бюджет и рассчитывает рекомендуемые часы. Порог слабой темы: 60%, максимальное изменение: 4 часа.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{topics.map((topic) => <label key={topic} className="flex items-center justify-between gap-3 text-sm">{topic}<input type="number" min={0} step={1} value={Number.isNaN(hours[topic]) ? "" : hours[topic]} aria-label={`Текущие часы: ${topic}`} disabled={mutation.isPending} onChange={(e) => { setHours({ ...hours, [topic]: e.target.valueAsNumber }); mutation.reset(); }} className="w-24 rounded-lg border border-outline-variant/50 p-2" /></label>)}</div>
      <p className="text-sm">Общий бюджет: {Number.isFinite(total) ? total : "—"} ч.</p><Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Расчёт на сервере…" : "Оптимизировать"}</Button>
      {mutation.isError && <p role="alert" className="text-sm text-error">{mutation.error.message}</p>}
    </Card>
    {result && <Card className="space-y-4 p-5"><CardTitle>Распределение от backend</CardTitle><AllocationChart rows={result} /><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Тема</th><th>Текущие часы</th><th>Рекомендуемые часы</th><th>Освоение</th></tr></thead><tbody>{result.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.baseline}</td><td>{r.hours}</td><td>{r.mastery.toLocaleString("ru-RU")}%</td></tr>)}</tbody></table></div><Button variant="outline" onClick={() => exportRows(result)}>Экспорт плана CSV</Button><p className="text-xs text-secondary">Сохранение планов API не поддерживает. Чтобы включить это распределение в рекомендации, откройте рекомендации и нажмите «Пересчитать отчёт».</p></Card>}
  </>;
}
