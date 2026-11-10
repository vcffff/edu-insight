"use client";
import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  ArrowRight,
  Download,
  Grid2X2,
  Lightbulb,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useAnalytics } from "../providers";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  PageHeading,
  ScoreBar,
} from "../shared";
import { cn, download, number } from "@/lib/utils";
import Papa from "papaparse";
import { useDataSource } from "@/hooks/use-data-source";
import { BackendTopics } from "./backend-topics";
export function Topics() {
  const { source } = useDataSource();
  return source === "api" ? <BackendTopics /> : <DemoTopics />;
}
function DemoTopics() {
  const q = useAnalytics();
  const [selected, setSelected] = useState<string | null>(null);
  if (q.isError) return <ErrorState retry={() => void q.refetch()} />;
  if (!q.data) return <LoadingState />;
  const d = q.data;
  if (!d.students || !d.topics.length) return <EmptyState />;
  const initial =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("topic")
      : null;
  const topic =
    d.topics.find((t) => t.id === (selected ?? initial)) ??
    [...d.topics].sort((a, b) => a.mastery - b.mastery)[0];
  return (
    <>
      <PageHeading
        title="Результаты по темам"
        eyebrow="Диагностика программы"
        subtitle="Карта освоения тем и учебных пробелов по школам."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => download("topic-report.csv", Papa.unparse(d.topics))}
        >
          <Download />
          Экспорт отчёта по темам
        </Button>
      </PageHeading>
      <div className="grid gap-3.5 sm:grid-cols-3">
        <Metric
          label="Среднее освоение"
          value={`${number(d.average)}%`}
          note="По выбранной группе"
          icon={TrendingUp}
        />
        <Metric
          label="Главный приоритет"
          value={[...d.topics].sort((a, b) => a.mastery - b.mastery)[0].short}
          note="Наименьший средний балл"
          icon={TriangleAlert}
          danger
        />
        <Metric
          label="Выборка выбранной темы"
          value={number(topic.students)}
          note={`${topic.name} · учащихся в выборке`}
          icon={Users}
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <Card className="p-4 xl:col-span-8">
          <CardHeader>
            <div>
              <div className="flex items-center gap-2">
                <Grid2X2 size={17} className="text-primary" />
                <CardTitle>Карта освоения программы</CardTitle>
              </div>
              <p className="mt-1 text-[11px] text-secondary">
                {d.topics.length} тем по школам · выберите тему для подробностей
              </p>
            </div>
          </CardHeader>
          <div className="mb-4 flex justify-end gap-3 text-[10px] text-secondary">
            {[
              { l: "<60%", c: "bg-error-container" },
              { l: "60–74%", c: "bg-surface-container" },
              { l: "≥75%", c: "bg-emerald-100" },
            ].map((x) => (
              <span key={x.l} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-sm ${x.c}`} />
                {x.l}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Тема</th>
                  {d.campuses.map((c) => (
                    <th key={c} className="text-center">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.topics.map((t, i) => (
                  <tr
                    key={t.id}
                    className={topic.id === t.id ? "bg-primary-fixed/20" : ""}
                  >
                    <td>
                      <button
                        onClick={() => setSelected(t.id)}
                        className="flex items-center gap-2 text-left font-medium hover:text-primary"
                      >
                        <span className="text-[10px] text-secondary">
                          {i + 1}.
                        </span>
                        {t.name}
                        {topic.id === t.id && (
                          <Badge tone="primary">Выбрано</Badge>
                        )}
                      </button>
                    </td>
                    {d.campuses.map((c) => {
                      const v =
                        d.heatmap.find((h) => h.topic === t.id)?.values[c] ?? 0;
                      return (
                        <td key={c} className="!px-1.5">
                          <button
                            aria-label={`Изучить ${t.name}, ${c}: ${number(v)}% освоения`}
                            onClick={() => setSelected(t.id)}
                            className={cn(
                              "w-full rounded-md px-3 py-4 text-center text-sm font-semibold tabular-nums",
                              v < 60
                                ? "bg-error-container/65 text-error"
                                : v >= 75
                                  ? "bg-emerald-50 text-tertiary-container"
                                  : "bg-surface-container text-secondary",
                            )}
                          >
                            {number(v)}%
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[11px] text-secondary">
            В ячейках показаны средние баллы, а не оценки прогресса во времени.
          </p>
        </Card>
        <Card className="p-4 xl:col-span-4">
          <CardHeader>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-secondary">
                Подробности темы
              </p>
              <CardTitle>{topic.name}</CardTitle>
            </div>
          </CardHeader>
          <Badge
            tone={
              topic.mastery < 60
                ? "danger"
                : topic.mastery < 75
                  ? "warning"
                  : "success"
            }
          >
            {topic.mastery < 60
              ? "Критический пробел"
              : topic.mastery < 75
                ? "В процессе освоения"
                : "Выше целевого уровня"}
          </Badge>
          <div className="my-5">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs text-secondary">Текущее освоение</span>
              <span className="font-heading text-3xl font-semibold">
                {number(topic.mastery)}%
              </span>
            </div>
            <ScoreBar value={topic.mastery} />
          </div>
          <div className="space-y-3 rounded-lg bg-surface p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-secondary">Объём выборки</span>
              <strong>{number(topic.students)} учащихся</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Результатов ниже цели</span>
              <strong>{number(topic.belowTarget)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Целевой уровень</span>
              <strong>75% освоения</strong>
            </div>
          </div>
          <div className="my-4 rounded-lg border border-outline-variant/25 bg-surface-container-low p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <Lightbulb size={15} className="text-primary" />
              Комментарий методиста
            </div>
            <p className="text-xs leading-6 text-secondary">
              {topic.mastery < 75
                ? "Перед выбором мер изучите ответы на отдельные задания. Короткая диагностика поможет отличить пробелы в понимании от трудностей с форматом вопросов."
                : "Сохраняйте практику повторения. Оцените, можно ли направить часть часов на менее освоенные темы без сокращения содержания."}
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/curriculum-optimizer">
              Изменить часы в оптимизаторе
              <ArrowRight />
            </Link>
          </Button>
          <p className="mt-3 flex gap-1.5 text-[10px] leading-5 text-secondary">
            <BarChart3 size={14} className="mt-0.5 shrink-0" />
            Для диагностики отдельных навыков нужны ответы на задания: средних
            баллов по теме недостаточно.
          </p>
        </Card>
      </div>
    </>
  );
}
