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
import { Badge } from "./ui/badge";
import { Metric, ScoreBar } from "./shared";
import { BookOpen, CircleAlert, Database, SlidersHorizontal, TrendingUp, Users } from "lucide-react";

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
  const focus = [...raw.topic_mastery].sort((a, b) => a.score - b.score);
  const weak = focus[0];
  return <>
    <PageHeading title={uploadPreview ? "Аналитика CSV" : "Обзор учебной программы"} eyebrow={uploadPreview ? undefined : "Аналитика результатов"} subtitle="Результаты выбранного набора данных; целевой уровень освоения — 75%."><Button variant="outline" disabled={q.isFetching} onClick={() => void q.refetch()}>Обновить анализ</Button>{!uploadPreview && <Button asChild><Link href="/curriculum-optimizer"><SlidersHorizontal />Открыть оптимизатор</Link></Button>}</PageHeading>
    <AnalyticsFilters options={options} includeTopic={uploadPreview} />
    <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
      <Metric label="Учащихся в анализе" value={number(raw.overview.total_students)} note={raw.overview.total_observations === undefined ? "Уникальных учащихся в выборке" : `${number(raw.overview.total_observations)} проверенных результатов`} icon={Users}><Badge tone="success">Текущая группа</Badge></Metric>
      <Metric label="Среднее освоение" value={raw.overview.average_score === null ? "—" : `${number(raw.overview.average_score)}%`} note={raw.overview.average_score === null ? "Нет результатов" : `${number(Math.abs(75 - raw.overview.average_score))} п. п. ${raw.overview.average_score < 75 ? "ниже" : "выше"} цели`} icon={TrendingUp}><Badge>Цель: 75%</Badge></Metric>
      <Metric label="Критические темы" value={number(raw.overview.critical_topics)} note="Темы со средним освоением ниже 60%" icon={CircleAlert} danger={raw.overview.critical_topics > 0}><Badge tone={raw.overview.critical_topics ? "danger" : "success"}>{raw.overview.critical_topics ? "Требуют внимания" : "В пределах нормы"}</Badge></Metric>
      <Metric label="Учебников в данных" value={number(options.textbooks.length)} note="Учебные материалы этой группы" icon={BookOpen}><Badge>Текущий набор</Badge></Metric>
    </div>
    {focus.length > 0 && <div className="grid gap-3.5 xl:grid-cols-12">
      <Card className="p-4 xl:col-span-7"><CardTitle>Освоение тем</CardTitle><p className="mb-4 mt-1 text-xs text-secondary">Средний балл по темам и целевой уровень 75%</p><div className="space-y-3.5">{focus.map((t) => <Link key={t.topic} href={`/topic-analytics?topic=${encodeURIComponent(t.topic)}`} className="group block"><div className="mb-1 flex justify-between gap-2 text-xs"><span className={t.score < 60 ? "font-medium text-error" : "font-medium"}>{t.topic}{t.score < 60 && <Badge tone="danger" className="ml-2 py-0">Пробел</Badge>}</span><strong>{number(t.score)}%</strong></div><ScoreBar value={t.score} className="h-2.5 group-hover:opacity-80" /></Link>)}</div></Card>
      <Card className="flex flex-col border-l-4 border-l-error p-4 xl:col-span-5"><div className="mb-4 flex items-center justify-between gap-2"><CardTitle>Приоритетное действие</CardTitle><Badge tone={weak.score < 60 ? "danger" : "warning"}>{weak.score < 60 ? "Критический пробел" : "Тема для внимания"}</Badge></div><h3 className="font-heading text-lg font-semibold">{weak.topic}</h3><p className="mt-1 text-xs text-secondary">{weak.score < 75 ? `${number(75 - weak.score)} п. п. ниже цели` : "Целевой уровень достигнут"}</p><div className="my-4 rounded-lg bg-surface-container-low p-3 text-sm">Выборка по теме: <strong>{number(weak.student_count)} учащихся</strong><p className="mt-2 text-xs text-secondary">{weak.below_target_count === undefined ? "Число результатов ниже цели недоступно в этой версии API." : `${number(weak.below_target_count)} результатов ниже цели`}</p></div><Button asChild className="mt-auto w-full"><Link href={`/topic-analytics?topic=${encodeURIComponent(weak.topic)}`}>Изучить тему</Link></Button></Card>
    </div>}
    <Card className="p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><CardTitle>Приоритетные темы</CardTitle><span className="text-xs text-secondary">Темы с наименьшим освоением</span></div>{focus.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Тема</th><th className="text-right">Текущее освоение</th><th className="text-right">Размер группы</th><th className="text-right">Действие</th></tr></thead><tbody>{focus.slice(0, 4).map((t) => <tr key={t.topic}><td className="font-medium">{t.topic}</td><td className="text-right">{number(t.score)}%</td><td className="text-right">{number(t.student_count)} учащихся</td><td className="text-right"><Button asChild size="sm" variant="secondary"><Link href={`/topic-analytics?topic=${encodeURIComponent(t.topic)}`}>Подробнее</Link></Button></td></tr>)}</tbody></table></div> : <p className="text-sm text-secondary">Нет тем по выбранным условиям.</p>}</Card>
    {raw.data_quality_warnings.length > 0 && <Card className="border-amber-200 p-4" role="status"><CardTitle>Предупреждения о качестве данных</CardTitle>{raw.data_quality_warnings.map((w, i) => <p key={i} className="mt-2 text-sm">{w}</p>)}</Card>}
    <div className="grid gap-4 xl:grid-cols-2">
      <Graph title="Динамика результатов" empty={!raw.performance_trend.length}><ResponsiveContainer width="100%" height="100%"><LineChart data={[...raw.performance_trend].sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="assessment_date" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} /><Tooltip /><Line dataKey="score" name="Средний балл (%)" stroke="#4f46e5" strokeWidth={2} /></LineChart></ResponsiveContainer></Graph>
      <Card className="p-4"><CardTitle>Распределение результатов</CardTitle><p className="mt-1 text-xs text-secondary">{raw.student_average_distribution ? "Учащиеся по среднему баллу" : "Диапазоны баллов отдельных оцениваний"}</p><div className="mt-6">{q.data.distribution.length ? <DistributionChart data={q.data.distribution} total={raw.student_average_distribution ? raw.overview.total_students : raw.score_distribution.reduce((sum, p) => sum + p.students_count, 0)} countLabel="учащихся в группе" totalLabel={raw.student_average_distribution ? "всего учащихся" : "всего по группам"} explanation={raw.student_average_distribution ? "Каждый ученик входит в одну группу по сумме набранных баллов относительно суммы максимальных баллов." : "Один ученик с несколькими оцениваниями может попасть в разные группы: число в центре — сумма по группам, не обязательно число уникальных учащихся."} /> : <p className="text-sm text-secondary">Нет данных для этого графика.</p>}</div></Card>
      {uploadPreview && raw.topic_performance.length > 0 && <Graph title="Правильные и неправильные ответы" empty={false}><ResponsiveContainer width="100%" height="100%"><BarChart data={raw.topic_performance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="topic" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="correct_answers" name="Правильные" stackId="answers" fill="#00856a" /><Bar dataKey="incorrect_answers" name="Неправильные" stackId="answers" fill="#ba1a1a" /></BarChart></ResponsiveContainer></Graph>}
    </div>
    <Card className="flex flex-col p-4"><div className="mb-3 flex items-center gap-2"><Database size={17} className="text-primary" /><CardTitle>Текущий набор данных</CardTitle></div><h3 className="text-sm font-semibold">{ds.data.name}</h3><p className="mt-1 text-xs text-secondary">Live API · {new Date(ds.data.uploadedAt).toLocaleDateString("ru-RU")}</p><div className="my-5 grid grid-cols-2 gap-3"><div><p className="text-[10px] uppercase text-secondary">Строк CSV</p><p className="text-lg font-semibold">{number(ds.data.rowCount ?? 0)}</p></div><div><p className="text-[10px] uppercase text-secondary">Темы</p><p className="text-lg font-semibold">{number(raw.overview.total_topics)}</p></div></div><Button asChild variant="secondary" className="mt-auto"><Link href="/datasets">Посмотреть данные</Link></Button></Card>
  </>;
}
