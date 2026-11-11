"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDataSource } from "@/hooks/use-data-source";
import type { Allocation } from "@/lib/types";
import { useAnalytics, useDataset } from "../providers";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { PageHeading, LoadingState, ScoreBar } from "../shared";
import { AllocationChart } from "../charts";
import { download, number } from "@/lib/utils";
import { BrainCircuit, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Papa from "papaparse";

export function BackendOptimizer() {
  const q = useAnalytics();
  const ds = useDataset();
  if (q.isError || ds.isError) return <Card className="space-y-3 p-5" role="alert"><p>{(q.error ?? ds.error)?.message}</p><Button onClick={() => { void q.refetch(); void ds.refetch(); }}>Повторить</Button></Card>;
  if (!q.data || !ds.data) return <LoadingState />;
  if (!q.data.backend?.available_filters.topics.length) return <Card className="p-6">Загрузите CSV с темами для оптимизации.</Card>;
  return <HourInputs key={`${ds.data.id}:${q.data.backend.available_filters.topics.join("|")}`} topics={q.data.backend.available_filters.topics} />;
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
    <PageHeading title="Оптимизатор программы" eyebrow="Планирование программы" subtitle="Укажите текущие часы по темам. CSV не содержит часов; начальное значение 1 — только поле ввода."><Button variant="outline" disabled={!result} onClick={() => result && exportRows(result)}>Экспорт плана</Button></PageHeading>
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="grid grid-cols-2 gap-8 rounded-lg bg-surface-container-low px-4 py-3"><div><p className="text-[10px] uppercase text-secondary">Текущий бюджет</p><p className="font-heading text-xl font-semibold">{Number.isFinite(total) ? total : "—"} ч</p></div><div><p className="text-[10px] uppercase text-secondary">Рекомендовано</p><p className="font-heading text-xl font-semibold text-primary">{result ? result.reduce((sum, row) => sum + row.hours, 0) : "—"} ч</p></div></div>{result && <Badge tone="success"><ShieldCheck size={12} />Бюджет сохранён</Badge>}</Card>
    <Card className="space-y-4 p-5"><CardTitle>Текущие часы по темам</CardTitle><p className="text-xs text-secondary">Целые числа, от 0. Backend сохраняет общий бюджет и рассчитывает рекомендуемые часы. Порог слабой темы: 60%, максимальное изменение: 4 часа.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{topics.map((topic) => <label key={topic} className="flex items-center justify-between gap-3 text-sm">{topic}<input type="number" min={0} step={1} value={Number.isNaN(hours[topic]) ? "" : hours[topic]} aria-label={`Текущие часы: ${topic}`} disabled={mutation.isPending} onChange={(e) => { setHours({ ...hours, [topic]: e.target.valueAsNumber }); mutation.reset(); }} className="w-24 rounded-lg border border-outline-variant/50 p-2" /></label>)}</div>
      <p className="text-sm">Общий бюджет: {Number.isFinite(total) ? total : "—"} ч.</p><Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Расчёт на сервере…" : "Оптимизировать"}</Button>
      {mutation.isError && <p role="alert" className="text-sm text-error">{mutation.error.message}</p>}
    </Card>
    {result && <div className="grid items-start gap-4 xl:grid-cols-12"><Card className="overflow-hidden xl:col-span-7"><div className="flex items-center gap-2 border-b border-outline-variant/20 px-4 py-3"><SlidersHorizontal size={17} className="text-primary" /><CardTitle>Распределение часов</CardTitle></div><div className="divide-y divide-outline-variant/20">{result.map((r) => <div key={r.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="mb-2 flex flex-wrap items-center gap-2"><strong className="text-sm">{r.name}</strong><Badge tone={r.mastery < 60 ? "danger" : r.mastery < 75 ? "warning" : "success"}>{number(r.mastery)}%</Badge></div><ScoreBar value={r.mastery} className="h-1.5" /><p className="mt-2 text-xs text-secondary">Исходно: {r.baseline} ч</p></div><div className="text-sm font-semibold text-primary">{r.hours} ч <Badge tone={r.hours > r.baseline ? "success" : "neutral"}>{r.hours - r.baseline > 0 ? "+" : ""}{r.hours - r.baseline} ч</Badge></div></div>)}</div></Card><div className="min-w-0 space-y-4 xl:col-span-5"><Card className="p-4"><CardHeader><div className="flex items-center gap-2"><BrainCircuit size={18} className="text-primary" /><CardTitle>Почему такие изменения?</CardTitle></div><Badge>Расчёт сервера</Badge></CardHeader><p className="text-xs leading-6 text-secondary">Часы перераспределены в пользу тем с меньшим освоением. Общий бюджет сохранён; максимальное изменение одной темы — 4 часа. Это планирование, а не прогноз роста результатов.</p>{result[0] && <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs">Главный приоритет: <strong>{result[0].name}</strong> · освоение {number(result[0].mastery)}%</p>}</Card><Card className="p-4"><CardHeader><CardTitle>Распределение до и после</CardTitle></CardHeader><AllocationChart rows={result} /></Card></div><p className="text-xs text-secondary xl:col-span-12">Сохранение планов API не поддерживает. Чтобы включить это распределение в рекомендации, откройте рекомендации и нажмите «Пересчитать отчёт».</p></div>}
  </>;
}
