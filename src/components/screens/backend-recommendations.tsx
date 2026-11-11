"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataSource } from "@/hooks/use-data-source";
import { sourceKey } from "@/lib/data-source";
import { ApiError } from "@/lib/data-source/api-provider";
import { useDataset } from "../providers";
import { Card, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PageHeading, LoadingState } from "../shared";
import { download } from "@/lib/utils";
import { evidenceUnit, evidenceValue, metricLabel } from "@/lib/report-presentation";

const statusLabels = { needs_attention: "Требует внимания", satisfactory: "Удовлетворительно", insufficient_data: "Недостаточно данных" };
const priorityLabels = { high: "Высокий приоритет", medium: "Средний приоритет", low: "Низкий приоритет" };
const severityLabels = { critical: "Критично", high: "Высокая важность", medium: "Средняя важность", low: "Низкая важность", info: "Для информации" };
const languageLabels = { ru: "Русский", en: "Английский", kk: "Казахский" };

export function BackendRecommendations() {
  const { repository } = useDataSource();
  const ds = useDataset();
  const client = useQueryClient();
  const q = useQuery({ queryKey: sourceKey("api", "report", ds.data?.id), queryFn: ({ signal }) => repository.analysis!(signal), enabled: !!ds.data, retry: false,
    refetchInterval: (query) => query.state.error instanceof ApiError && query.state.error.status === 409 ? 3000 : false });
  const regenerate = useMutation({ mutationFn: () => repository.analysis!(undefined, true), onSuccess: (report) => { client.setQueryData(sourceKey("api", "report", ds.data?.id), report); void client.invalidateQueries({ queryKey: sourceKey("api", "datasets") }); } });
  if (q.isError || ds.isError) return <Card className="space-y-3 p-5" role="alert"><p>{(q.error ?? ds.error)?.message}</p><Button onClick={() => { void ds.refetch(); void q.refetch(); }}>Повторить</Button></Card>;
  if (q.isPending || ds.isPending) return <LoadingState />;
  const report = q.data;
  if (!report) return <Card className="space-y-3 p-6"><CardTitle>Сначала загрузите CSV</CardTitle><Button asChild><Link href="/datasets">Загрузить данные</Link></Button></Card>;
  return <>
    <PageHeading title="Рекомендации" eyebrow={ds.data?.name} subtitle="Выводы и действия из отчёта backend по выбранному набору данных. Цифры ниже — основания для рекомендаций, а не прогноз улучшения результатов.">
      <Button variant="outline" onClick={() => download("eduinsight-report.json", JSON.stringify(report, null, 2), "application/json")}>Экспорт отчёта</Button>
      <Button disabled={q.isFetching || regenerate.isPending} onClick={() => regenerate.mutate()}>{regenerate.isPending ? "Анализ…" : "Пересчитать отчёт"}</Button>
    </PageHeading>
    {regenerate.isError && <p role="alert" className="text-sm text-error">{regenerate.error.message}</p>}
    <Card className="space-y-3 p-5"><CardTitle>{report.executive_summary.title}</CardTitle><p className="text-sm leading-6">{report.executive_summary.summary}</p><p className="text-xs text-secondary">Статус: {statusLabels[report.executive_summary.overall_status]} · Язык отчёта: {languageLabels[report.generated_language]}</p></Card>
    {report.key_findings.length > 0 && <Card className="space-y-4 p-5"><CardTitle>Что обнаружено</CardTitle>{report.key_findings.map((f) => <div key={f.id} className="space-y-2"><h3 className="font-semibold">{f.title}</h3><p className="text-sm">{f.description}</p><p className="text-xs text-secondary">{severityLabels[f.severity]}{f.topic ? ` · Тема: ${f.topic}` : ""}</p>{f.evidence.length > 0 && <div className="space-y-2 rounded-lg bg-surface-container-low p-3"><p className="text-xs font-semibold">На каких данных основан вывод</p><dl className="space-y-2">{f.evidence.map((e, i) => <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs" key={i}><dt className="text-secondary">{metricLabel(e.metric)}</dt><dd className="font-medium">{evidenceValue(e.value)} {evidenceUnit(e.unit)}</dd></div>)}</dl></div>}</div>)}</Card>}
    <div className="grid gap-4 lg:grid-cols-2">{report.recommendations.map((r) => <Card key={r.id} className="space-y-3 p-5"><p className="text-xs text-primary">{priorityLabels[r.priority]}{r.related_topics.length > 0 ? ` · Темы: ${r.related_topics.join(", ")}` : ""}</p><CardTitle>{r.title}</CardTitle><div><h3 className="mb-1 text-xs font-semibold">Что сделать</h3><p className="text-sm leading-6">{r.action}</p></div><div><h3 className="mb-1 text-xs font-semibold">Почему это предложено</h3>{r.evidence.length ? <ul className="list-disc space-y-1 pl-4">{r.evidence.map((e, i) => <li key={i} className="text-xs leading-5 text-secondary">{e}</li>)}</ul> : <p className="text-xs text-secondary">Backend не предоставил отдельного обоснования для этой рекомендации.</p>}</div></Card>)}</div>
    {report.topic_analysis.map((t) => <Card key={t.topic} className="space-y-2 p-4"><CardTitle>{t.topic}</CardTitle><p className="text-sm">{t.interpretation}</p>{t.main_concern && <p className="text-sm text-error">{t.main_concern}</p>}</Card>)}
    {report.textbook_analysis.map((t) => <Card key={t.textbook} className="space-y-2 p-4"><CardTitle>{t.textbook}</CardTitle><p className="text-sm">{t.observation}</p><p className="text-xs text-secondary">Уверенность в выводе: {t.confidence === "limited" ? "ограниченная" : "умеренная"}</p>{t.limitations.map((l, i) => <p key={i} className="text-xs text-secondary">{l}</p>)}</Card>)}
    <Card className="space-y-3 p-5"><CardTitle>Как предлагается распределить часы</CardTitle><p className="text-sm">{report.curriculum_explanation.summary}</p><p className="text-xs text-secondary">Это предложение для планирования преподавателем, а не прогноз роста баллов.</p>{report.curriculum_explanation.topic_explanations.map((t) => <div className="space-y-1 border-t border-outline-variant pt-3 text-sm" key={t.topic}><h3 className="font-semibold">{t.topic}</h3><p>Сейчас: <strong>{t.current_hours} ч.</strong> · Предлагается: <strong>{t.recommended_hours} ч.</strong></p><p className="text-secondary">Причина: {t.reason}</p></div>)}</Card>
    {[...report.limitations, ...report.data_quality_warnings].length > 0 && <Card className="space-y-2 p-5"><CardTitle>Ограничения и качество данных</CardTitle>{[...report.limitations, ...report.data_quality_warnings].map((w, i) => <p className="text-sm text-secondary" key={i}>{w}</p>)}</Card>}
  </>;
}
