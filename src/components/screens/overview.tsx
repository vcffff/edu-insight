"use client";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CircleAlert,
  Database,
  Lightbulb,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Users,
  TriangleAlert as Warning,
} from "lucide-react";
import { toast } from "sonner";
import { useOverview } from "../use-overview";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle } from "../ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  PageHeading,
  ScoreBar,
} from "../shared";
import { DistributionChart } from "../charts";
import { number } from "@/lib/utils";
import { sourceLabel } from "@/lib/locale";
import { useDataSource } from "@/hooks/use-data-source";
import { BackendDashboard } from "../backend-dashboard";
import { ActiveDataset } from "../active-dataset";
export function Overview() {
  const { source } = useDataSource();
  return <><ActiveDataset />{source === "api" ? <BackendDashboard /> : <DemoOverview />}</>;
}
function DemoOverview() {
  const { analytics: query, dataset } = useOverview();
  if (query.isError || dataset.isError)
    return (
      <ErrorState
        retry={() => {
          void query.refetch();
          void dataset.refetch();
        }}
      />
    );
  if (!query.data || !dataset.data) return <LoadingState />;
  const d = query.data;
  if (!d.students || !d.topics.length) return <EmptyState />;
  const focus = [...d.topics].sort((a, b) => a.mastery - b.mastery);
  const weak = focus[0];
  return (
    <>
      <PageHeading
        title="Обзор учебной программы"
        eyebrow="Аналитика результатов округа"
      >
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={async () => {
            const result = await query.refetch();
            if (result.isError) {
              toast.error(
                "API недоступен. Повторите запрос, когда сервер будет доступен.",
              );
            } else {
              toast.success("Анализ обновлён по текущему набору данных.");
            }
          }}
        >
          <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
          Обновить анализ
        </Button>
        <Button asChild size="sm">
          <Link href="/curriculum-optimizer">
            <SlidersHorizontal />
            Запустить оптимизацию
          </Link>
        </Button>
      </PageHeading>
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Metric
          label="Учащихся в анализе"
          value={number(d.students)}
          note={`${number(d.records)} проверенных результатов`}
          icon={Users}
        >
          <Badge tone="success">Текущая группа</Badge>
        </Metric>
        <Metric
          label="Среднее освоение"
          value={`${number(d.average)}%`}
          note={`${number(Math.abs(75 - d.average))} п. п. ${d.average < 75 ? "ниже" : "выше"} цели`}
          icon={TrendingUp}
        >
          <Badge>Цель: 75%</Badge>
        </Metric>
        <Metric
          label="Критические темы"
          value={String(d.critical)}
          note="Темы со средним освоением ниже 60%"
          icon={CircleAlert}
          danger={d.critical > 0}
        >
          <Badge tone={d.critical ? "danger" : "success"}>
            {d.critical ? "Требуют внимания" : "В пределах нормы"}
          </Badge>
        </Metric>
        <Metric
          label="Учебников в данных"
          value={String(d.textbooks.length)}
          note="Учебные материалы этой группы"
          icon={BookOpen}
        >
          <Badge>Для сравнения</Badge>
        </Metric>
      </div>
      <div className="grid gap-3.5 xl:grid-cols-12">
        <Card className="p-4 xl:col-span-7">
          <CardHeader>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Освоение тем</CardTitle>
                <Badge>N={number(d.students)}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-secondary">
                Средний балл по темам и целевой уровень освоения
              </p>
            </div>
            <div className="hidden items-center gap-3 text-[10px] text-secondary sm:flex">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-tertiary-container" />
                ≥75%
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-secondary" />
                60–74%
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-error" />
                &lt;60%
              </span>
            </div>
          </CardHeader>
          <div className="relative space-y-3.5">
            <div className="pointer-events-none absolute bottom-5 left-[75%] top-0 z-10 border-l border-dashed border-primary/35" />
            {d.topics.map((t) => (
              <Link
                key={t.id}
                href={`/topic-analytics?topic=${encodeURIComponent(t.id)}`}
                className="group block"
              >
                <div className="mb-1.5 flex justify-between gap-2 text-[12px]">
                  <span
                    className={
                      t.mastery < 60 ? "font-medium text-error" : "font-medium"
                    }
                  >
                    {t.name}
                    {t.mastery < 60 && (
                      <Badge tone="danger" className="ml-2 py-0">
                        Пробел
                      </Badge>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {number(t.mastery)}%
                  </span>
                </div>
                <ScoreBar
                  value={t.mastery}
                  className="h-2.5 group-hover:opacity-80"
                />
              </Link>
            ))}
            <div className="flex justify-between pt-1 text-[9px] text-secondary">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span className="font-semibold text-primary">Цель 75%</span>
              <span>100%</span>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col border-l-4 border-l-error p-4 xl:col-span-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-error-container/60 p-1.5 text-error">
                <CircleAlert size={17} />
              </div>
              <CardTitle>Приоритетное действие</CardTitle>
            </div>
            <Badge tone="danger">
              {weak.mastery < 60 ? "Критический пробел" : "Тема для внимания"}
            </Badge>
          </CardHeader>
          <h3 className="font-heading text-lg font-semibold">{weak.name}</h3>
          <p className="mt-1 text-[12px] text-secondary">
            {number(75 - weak.mastery)} п. п. ниже целевого уровня 75%
          </p>
          <div className="my-4 rounded-lg bg-surface-container-low p-3">
            <div className="flex items-start gap-2">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-[13px] leading-6">
                Усильте практику по теме{" "}
                <strong className="font-semibold text-primary">
                  «{weak.short}»
                </strong>
                . Рассмотрите перенос часов из тем, в которых целевой уровень
                уже достигнут.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-outline-variant/25 pt-2.5 text-[11px] text-secondary">
              <span>
                Выборка по теме:{" "}
                <strong className="text-on-surface">
                  {number(weak.students)} учащихся
                </strong>
              </span>
              <span className="text-error">
                {number(weak.belowTarget)} результатов ниже цели
              </span>
            </div>
          </div>
          <p className="mb-4 flex items-start gap-2 text-[11px] leading-5 text-secondary">
            <Warning size={14} className="mt-0.5 shrink-0" />
            Распределение часов помогает планировать, но не предсказывает рост
            результатов.
          </p>
          <Button asChild className="mt-auto w-full">
            <Link href="/curriculum-optimizer">
              Открыть оптимизатор
              <ArrowRight />
            </Link>
          </Button>
        </Card>
      </div>
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="danger">ТРЕБУЮТ ВНИМАНИЯ</Badge>
            <CardTitle>Приоритетные темы</CardTitle>
          </div>
          <span className="text-[11px] text-secondary">
            Учебные цели с наименьшим освоением
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Тема</th>
                <th>Раздел</th>
                <th className="text-right">Текущее освоение</th>
                <th className="text-right">Размер группы</th>
                <th className="text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {focus.slice(0, 4).map((t, i) => (
                <tr key={t.id}>
                  <td className="font-medium">
                    <span
                      className={`mr-2 inline-block size-1.5 rounded-full ${t.mastery < 60 ? "bg-error" : "bg-secondary"}`}
                    />
                    {t.name}
                  </td>
                  <td className="text-secondary">{t.domain}</td>
                  <td
                    className={`text-right font-semibold tabular-nums ${t.mastery < 60 ? "text-error" : ""}`}
                  >
                    {number(t.mastery)}%
                  </td>
                  <td className="text-right text-secondary">
                    {number(t.students)} учащихся
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant={i === 0 ? "default" : "secondary"}
                      asChild
                    >
                      <Link
                        href={
                          i === 0
                            ? "/curriculum-optimizer"
                            : `/topic-analytics?topic=${encodeURIComponent(t.id)}`
                        }
                      >
                        {i === 0 ? "Открыть в оптимизаторе" : "Подробнее"}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card className="p-4">
          <CardHeader>
            <div>
              <CardTitle>Распределение результатов</CardTitle>
              <p className="mt-1 text-[11px] text-secondary">
                Распределение учащихся по среднему баллу
              </p>
            </div>
          </CardHeader>
          <DistributionChart data={d.distribution} total={d.students} />
        </Card>
        <Card className="flex flex-col p-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database size={17} className="text-primary" />
              <CardTitle>Текущий набор данных</CardTitle>
            </div>
            <Badge tone="success">Проверен</Badge>
          </CardHeader>
          <h3 className="text-sm font-semibold">{dataset.data.name}</h3>
          <p className="mt-1 text-xs text-secondary">
            {sourceLabel(dataset.data.source)} ·{" "}
            {new Date(dataset.data.uploadedAt).toLocaleDateString("ru-RU", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <div className="my-5 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-secondary">
                Записи
              </p>
              <p className="mt-1 font-heading text-lg font-semibold">
                {number(dataset.data.records.length)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-secondary">
                Школы
              </p>
              <p className="mt-1 font-heading text-lg font-semibold">
                {d.campuses.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-secondary">
                Темы
              </p>
              <p className="mt-1 font-heading text-lg font-semibold">
                {d.topics.length}
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="mt-auto w-full">
            <Link href="/datasets">
              Посмотреть данные
              <ArrowRight />
            </Link>
          </Button>
        </Card>
      </div>
    </>
  );
}
