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
    <PageHeading title="Рекомендации" eyebrow={ds.data?.name} subtitle="Отчёт рассчитан и сохранён backend.">
      <Button variant="outline" onClick={() => download("eduinsight-report.json", JSON.stringify(report, null, 2), "application/json")}>Экспорт отчёта</Button>
      <Button disabled={q.isFetching || regenerate.isPending} onClick={() => regenerate.mutate()}>{regenerate.isPending ? "Анализ…" : "Пересчитать отчёт"}</Button>
    </PageHeading>
    {regenerate.isError && <p role="alert" className="text-sm text-error">{regenerate.error.message}</p>}
    <Card className="space-y-3 p-5"><CardTitle>{report.executive_summary.title}</CardTitle><p className="text-sm leading-6">{report.executive_summary.summary}</p><p className="text-xs text-secondary">Статус: {report.executive_summary.overall_status} · Язык: {report.generated_language}</p></Card>
    {report.key_findings.length > 0 && <Card className="space-y-4 p-5"><CardTitle>Ключевые выводы</CardTitle>{report.key_findings.map((f) => <div key={f.id}><h3 className="font-semibold">{f.title}</h3><p className="text-sm">{f.description}</p><p className="text-xs text-secondary">{f.severity}{f.topic ? ` · ${f.topic}` : ""}</p>{f.evidence.map((e, i) => <p className="text-xs text-secondary" key={i}>{e.metric}: {typeof e.value === "object" ? JSON.stringify(e.value) : String(e.value)} {e.unit}</p>)}</div>)}</Card>}
    <div className="grid gap-4 lg:grid-cols-2">{report.recommendations.map((r) => <Card key={r.id} className="space-y-3 p-5"><p className="text-xs text-primary">{r.priority} · {r.related_topics.join(", ")}</p><CardTitle>{r.title}</CardTitle><p className="text-sm leading-6">{r.action}</p>{r.evidence.map((e, i) => <p key={i} className="text-xs text-secondary">{e}</p>)}</Card>)}</div>
    {report.topic_analysis.map((t) => <Card key={t.topic} className="space-y-2 p-4"><CardTitle>{t.topic}</CardTitle><p className="text-sm">{t.interpretation}</p>{t.main_concern && <p className="text-sm text-error">{t.main_concern}</p>}</Card>)}
    {report.textbook_analysis.map((t) => <Card key={t.textbook} className="space-y-2 p-4"><CardTitle>{t.textbook}</CardTitle><p className="text-sm">{t.observation}</p><p className="text-xs text-secondary">Уверенность: {t.confidence}</p>{t.limitations.map((l, i) => <p key={i} className="text-xs text-secondary">{l}</p>)}</Card>)}
    <Card className="space-y-3 p-5"><CardTitle>Объяснение распределения часов</CardTitle><p className="text-sm">{report.curriculum_explanation.summary}</p>{report.curriculum_explanation.topic_explanations.map((t) => <p className="text-sm" key={t.topic}>{t.topic}: {t.current_hours} → {t.recommended_hours} ч. {t.reason}</p>)}</Card>
    {[...report.limitations, ...report.data_quality_warnings].length > 0 && <Card className="space-y-2 p-5"><CardTitle>Ограничения и качество данных</CardTitle>{[...report.limitations, ...report.data_quality_warnings].map((w, i) => <p className="text-sm text-secondary" key={i}>{w}</p>)}</Card>}
  </>;
}
