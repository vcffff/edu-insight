"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataSource } from "@/hooks/use-data-source";
import { sourceKey } from "@/lib/data-source";
import { ApiError } from "@/lib/data-source/api-provider";
import { useAnalytics, useDataset, useFilters } from "../providers";
import { Card, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { PageHeading, LoadingState } from "../shared";
import { download } from "@/lib/utils";
import { evidenceUnit, evidenceValue, metricLabel } from "@/lib/report-presentation";
import { ArrowRight, BrainCircuit, Check, CheckCircle2, ChevronDown, ChevronUp, Download, Lightbulb, ShieldCheck } from "lucide-react";

const statusLabels = { needs_attention: "Требует внимания", satisfactory: "Удовлетворительно", insufficient_data: "Недостаточно данных" };
const priorityLabels = { high: "Высокий приоритет", medium: "Средний приоритет", low: "Низкий приоритет" };
const severityLabels = { critical: "Критично", high: "Высокая важность", medium: "Средняя важность", low: "Низкая важность", info: "Для информации" };
const languageLabels = { ru: "Русский", en: "Английский", kk: "Казахский" };

export function BackendRecommendations() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "completed">("all");
  const { repository } = useDataSource();
  const ds = useDataset();
  const { filters, setFilters } = useFilters();
  const analytics = useAnalytics();
  const subjectFilter = analytics.data?.backend?.available_filters.subjects.length ? <Card className="p-4"><label className="block max-w-sm text-xs">Предмет отчёта<Select className="mt-1 w-full" aria-label="Предмет отчёта" value={filters.subject ?? "all"} onChange={(e) => setFilters({ ...filters, subject: e.target.value })}><option value="all">Все предметы</option>{analytics.data.backend.available_filters.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</Select></label></Card> : null;
  const client = useQueryClient();
  const q = useQuery({ queryKey: sourceKey("api", "report", ds.data?.id, filters.subject), queryFn: ({ signal }) => repository.analysis!(signal, false, filters.subject), enabled: !!ds.data, retry: false,
    refetchInterval: (query) => query.state.error instanceof ApiError && query.state.error.status === 409 ? 3000 : false });
  const regenerate = useMutation({ mutationFn: () => repository.analysis!(undefined, true, filters.subject), onSuccess: (report) => { client.setQueryData(sourceKey("api", "report", ds.data?.id, filters.subject), report); void client.invalidateQueries({ queryKey: sourceKey("api", "datasets") }); } });
  if (q.isError || ds.isError) return <>{subjectFilter}<Card className="space-y-3 p-5" role="alert"><p>{(q.error ?? ds.error)?.message}</p><Button onClick={() => { void ds.refetch(); void q.refetch(); }}>Повторить</Button></Card></>;
  if (q.isPending || ds.isPending) return <LoadingState />;
  const report = q.data;
  if (!report) return <Card className="space-y-3 p-6"><CardTitle>Сначала загрузите CSV</CardTitle><Button asChild><Link href="/datasets">Загрузить данные</Link></Button></Card>;
  return <>
    <PageHeading title="Рекомендации" eyebrow={ds.data?.name} subtitle="Выводы и действия из отчёта backend по выбранному набору данных. Цифры ниже — основания для рекомендаций, а не прогноз улучшения результатов.">
      <Button variant="outline" onClick={() => download("eduinsight-report.json", JSON.stringify(report, null, 2), "application/json")}><Download />Экспорт отчёта</Button>
      <Button disabled={q.isFetching || regenerate.isPending} onClick={() => regenerate.mutate()}>{regenerate.isPending ? "Анализ…" : "Пересчитать отчёт"}</Button>
    </PageHeading>
    {subjectFilter}
    {regenerate.isError && <p role="alert" className="text-sm text-error">{regenerate.error.message}</p>}
    <Card className="flex flex-wrap items-start justify-between gap-4 p-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary-container p-2.5 text-white"><BrainCircuit size={23} /></div><div><h2 className="font-heading text-base font-semibold">Сводка для методиста</h2><p className="mt-1 text-xs text-secondary">{report.recommendations.length} действий · {completed.filter((id) => report.recommendations.some((r) => r.id === id)).length} изучено</p></div></div><Badge>{statusLabels[report.executive_summary.overall_status]}</Badge><div className="w-full"><CardTitle>{report.executive_summary.title}</CardTitle><p className="mt-2 text-sm leading-6">{report.executive_summary.summary}</p><p className="mt-2 text-xs text-secondary">Язык отчёта: {languageLabels[report.generated_language]}</p></div></Card>
    {report.key_findings.length > 0 && <Card className="space-y-4 p-5"><CardTitle>Что обнаружено</CardTitle>{report.key_findings.map((f) => <div key={f.id} className="space-y-2"><h3 className="font-semibold">{f.title}</h3><p className="text-sm">{f.description}</p><p className="text-xs text-secondary">{severityLabels[f.severity]}{f.topic ? ` · Тема: ${f.topic}` : ""}</p>{f.evidence.length > 0 && <div className="space-y-2 rounded-lg bg-surface-container-low p-3"><p className="text-xs font-semibold">На каких данных основан вывод</p><dl className="space-y-2">{f.evidence.map((e, i) => <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs" key={i}><dt className="text-secondary">{metricLabel(e.metric)}</dt><dd className="font-medium">{evidenceValue(e.value, e.unit)} {evidenceUnit(e.unit)}</dd></div>)}</dl></div>}</div>)}</Card>}
    <div className="flex w-fit gap-1 rounded-lg bg-surface-container p-1" role="group" aria-label="Фильтр рекомендаций">{([{ value: "all", label: "Все действия" }, { value: "open", label: "К изучению" }, { value: "completed", label: "Изучено" }] as const).map((item) => <Button key={item.value} size="sm" variant={filter === item.value ? "outline" : "ghost"} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</Button>)}</div>
    <div className="space-y-4">{report.recommendations.filter((r) => filter === "all" || (filter === "completed") === completed.includes(r.id)).map((r) => { const done = completed.includes(r.id); const open = expanded.includes(r.id); return <Card key={r.id} className={`overflow-hidden border-l-[3px] ${done ? "border-l-tertiary-container" : "border-l-primary-container"}`}><div className="p-4 sm:p-5"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge tone={done ? "success" : r.priority === "high" ? "danger" : "neutral"}>{done ? "Изучено" : priorityLabels[r.priority]}</Badge><span className="text-[10px] text-secondary">На основе результатов · требуется проверка методиста</span></div><h2 className="font-heading text-lg font-semibold">{r.title}</h2><p className="mt-2 text-[13px] leading-6 text-secondary">{r.action}</p>{r.related_topics.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{r.related_topics.map((topic) => <span key={topic} className="rounded-md border border-outline-variant/30 px-2.5 py-1 text-[10px]">{topic}</span>)}</div>}</div><button aria-label={done ? `Отметить «${r.title}» как требующее изучения` : `Отметить «${r.title}» изученным`} aria-pressed={done} onClick={() => setCompleted((prev) => done ? prev.filter((id) => id !== r.id) : [...prev, r.id])} className="rounded-full p-1.5 text-primary">{done ? <CheckCircle2 size={22} /> : <Check size={22} />}</button></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 pt-3"><button aria-expanded={open} aria-controls={`explanation-${r.id}`} onClick={() => setExpanded((prev) => open ? prev.filter((id) => id !== r.id) : [...prev, r.id])} className="flex items-center gap-1.5 text-xs font-medium text-secondary"><Lightbulb size={14} />Почему эта рекомендация?{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>{r.related_topics[0] && <Button asChild size="sm"><Link href={`/topic-analytics?topic=${encodeURIComponent(r.related_topics[0])}`}>Изучить тему<ArrowRight /></Link></Button>}</div>{open && <div id={`explanation-${r.id}`} className="mt-3 rounded-lg bg-surface-container-low p-4"><Badge className="mb-2">Основания из отчёта</Badge>{r.evidence.length ? <ul className="list-disc space-y-1 pl-4">{r.evidence.map((e, i) => <li key={i} className="text-xs leading-5 text-secondary">{e}</li>)}</ul> : <p className="text-xs text-secondary">Отдельные основания в ответе API отсутствуют.</p>}</div>}</div></Card>; })}{report.recommendations.length === 0 && <Card className="p-8 text-center text-sm text-secondary">В отчёте нет рекомендаций для этого набора данных.</Card>}</div>
    {report.topic_analysis.map((t) => <Card key={t.topic} className="space-y-2 p-4"><CardTitle>{t.topic}</CardTitle><p className="text-sm">{t.interpretation}</p>{t.main_concern && <p className="text-sm text-error">{t.main_concern}</p>}</Card>)}
    {report.textbook_analysis.map((t) => <Card key={t.textbook} className="space-y-2 p-4"><CardTitle>{t.textbook}</CardTitle><p className="text-sm">{t.observation}</p><p className="text-xs text-secondary">Уверенность в выводе: {t.confidence === "limited" ? "ограниченная" : "умеренная"}</p>{t.limitations.map((l, i) => <p key={i} className="text-xs text-secondary">{l}</p>)}</Card>)}
    <Card className="space-y-3 p-5"><CardTitle>Как предлагается распределить часы</CardTitle><p className="text-sm">{report.curriculum_explanation.summary}</p><p className="text-xs text-secondary">Это предложение для планирования преподавателем, а не прогноз роста баллов.</p>{report.curriculum_explanation.topic_explanations.map((t) => <div className="space-y-1 border-t border-outline-variant pt-3 text-sm" key={t.topic}><h3 className="font-semibold">{t.topic}</h3><p>Сейчас: <strong>{t.current_hours} ч.</strong> · Предлагается: <strong>{t.recommended_hours} ч.</strong></p><p className="text-secondary">Причина: {t.reason}</p></div>)}</Card>
    {[...report.limitations, ...report.data_quality_warnings].length > 0 && <Card className="space-y-2 p-5"><CardTitle>Ограничения и качество данных</CardTitle>{[...report.limitations, ...report.data_quality_warnings].map((w, i) => <p className="text-sm text-secondary" key={i}>{w}</p>)}</Card>}
    <Card className="p-4"><div className="mb-2 flex items-center gap-2"><ShieldCheck size={17} className="text-tertiary-container" /><CardTitle>Для осознанных, а не автоматических решений</CardTitle></div><p className="text-xs leading-6 text-secondary">Рекомендации требуют профессиональной оценки методиста и не гарантируют улучшение результатов. Отметки об изучении сохраняются, пока открыт этот экран.</p></Card>
  </>;
}
