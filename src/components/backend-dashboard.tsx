"use client";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAnalytics, useDataset, useFilters } from "./providers";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { LoadingState, PageHeading } from "./shared";
import { DistributionChart } from "./charts";
import { number } from "@/lib/utils";
import type { BackendAnalytics } from "@/lib/data-source/backend-schemas";

export function Graph({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return <Card className="min-w-0 p-4"><CardTitle>{title}</CardTitle>{empty ? <p className="py-12 text-center text-sm text-secondary">Нет данных для этого графика.</p> : <div className="mt-4 h-[280px] w-full" role="img" aria-label={title}>{children}</div>}</Card>;
}
export function AnalyticsFilters({ options, includeTopic = false }: { options: BackendAnalytics["available_filters"]; includeTopic?: boolean }) {
  const { filters, setFilters } = useFilters();
  const fields = [
    { key: "grade", label: "Класс", values: options.grades.map(String) },
    { key: "subject", label: "Предмет", values: options.subjects },
    { key: "textbook", label: "Учебник", values: options.textbooks },
    ...(includeTopic || (filters.topic && filters.topic !== "all") ? [{ key: "topic" as const, label: "Тема", values: options.topics }] : []),
  ] as const;
  return <Card className="flex flex-wrap gap-3 p-4">
    {fields.filter((field) => field.values.length).map(({ key, label, values }) => <label className="min-w-36 flex-1 text-xs" key={key}>{label}<Select className="mt-1 w-full" aria-label={label} value={filters[key as keyof typeof filters] ?? "all"} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}><option value="all">Все</option>{values.map((v) => <option key={v} value={v}>{v}</option>)}</Select></label>)}
    <Button variant="ghost" onClick={() => setFilters({ grade: "all", school: "all" })}>Сбросить фильтры</Button>
  </Card>;
}
export function BackendDashboard({ uploadPreview = false }: { uploadPreview?: boolean }) {
  const q = useAnalytics();
  const ds = useDataset();
  if (q.isError || ds.isError) return <Card className="space-y-3 p-5" role="alert"><p>{(q.error ?? ds.error)?.message}</p><Button onClick={() => { void ds.refetch(); void q.refetch(); }}>Повторить</Button><Button asChild variant="outline"><Link href="/datasets">Загрузить CSV</Link></Button></Card>;
  if (!q.data || !ds.data) return <LoadingState />;
  const raw = q.data.backend;
  if (!raw) return <Card className="space-y-3 p-8 text-center"><CardTitle>Загрузите CSV для построения графиков</CardTitle><Button asChild><Link href="/datasets">Загрузить CSV</Link></Button></Card>;
  const options = raw.available_filters;
  return <>
    <PageHeading title={uploadPreview ? "Аналитика CSV" : "Обзор результатов"} subtitle="Общие показатели, динамика и распределение баллов по выбранному набору данных."><Button variant="outline" disabled={q.isFetching} onClick={() => void q.refetch()}>Обновить</Button></PageHeading>
    <AnalyticsFilters options={options} includeTopic={uploadPreview} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ["Учащихся", number(raw.overview.total_students)],
      ["Средний балл", raw.overview.average_score === null ? "—" : `${number(raw.overview.average_score)}%`],
      ["Тем", number(raw.overview.total_topics)], ["Критических тем", number(raw.overview.critical_topics)],
    ].map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs text-secondary">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</div>
    {raw.data_quality_warnings.length > 0 && <Card className="border-amber-200 p-4" role="status"><CardTitle>Предупреждения о качестве данных</CardTitle>{raw.data_quality_warnings.map((w, i) => <p key={i} className="mt-2 text-sm">{w}</p>)}</Card>}
    <div className="grid gap-4 xl:grid-cols-2">
      {uploadPreview && <Graph title="Освоение тем" empty={!raw.topic_mastery.length}><ResponsiveContainer width="100%" height="100%"><BarChart data={raw.topic_mastery}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="topic" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="score" name="Средний балл (%)" fill="#4f46e5" /></BarChart></ResponsiveContainer></Graph>}
      <Graph title="Динамика результатов" empty={!raw.performance_trend.length}><ResponsiveContainer width="100%" height="100%"><LineChart data={[...raw.performance_trend].sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="assessment_date" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} /><Tooltip /><Line dataKey="score" name="Средний балл (%)" stroke="#4f46e5" strokeWidth={2} /></LineChart></ResponsiveContainer></Graph>
      <Card className="p-4"><CardTitle>Распределение результатов</CardTitle><div className="mt-6">{raw.score_distribution.length ? <DistributionChart data={q.data.distribution} total={raw.score_distribution.reduce((sum, p) => sum + p.students_count, 0)} /> : <p className="text-sm text-secondary">Нет данных для этого графика.</p>}</div></Card>
      {uploadPreview && raw.topic_performance.length > 0 && <Graph title="Правильные и неправильные ответы" empty={false}><ResponsiveContainer width="100%" height="100%"><BarChart data={raw.topic_performance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="topic" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="correct_answers" name="Правильные" stackId="answers" fill="#00856a" /><Bar dataKey="incorrect_answers" name="Неправильные" stackId="answers" fill="#ba1a1a" /></BarChart></ResponsiveContainer></Graph>}
    </div>
    {!uploadPreview && <Card className="space-y-4 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Темы для внимания</CardTitle><Button asChild variant="outline" size="sm"><Link href="/topic-analytics">Подробная аналитика тем</Link></Button></div>{[...raw.topic_mastery].filter((t) => t.score < 75).sort((a, b) => a.score - b.score).slice(0, 3).map((t) => <div key={t.topic} className="flex items-center justify-between gap-3 text-sm"><span>{t.topic}</span><span className={t.score < 60 ? "font-semibold text-error" : "font-semibold"}>{number(t.score)}%</span></div>)}{!raw.topic_mastery.some((t) => t.score < 75) && <p className="text-sm text-secondary">Нет тем ниже целевого уровня 75%.</p>}</Card>}
  </>;
}
