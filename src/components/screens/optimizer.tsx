"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  Check,
  Download,
  LockKeyhole,
  LockKeyholeOpen,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { allocationLimit, rebalance } from "@/lib/analytics";
import { sourceKey } from "@/lib/data-source";
import { useDataSource } from "@/hooks/use-data-source";
import type { Allocation } from "@/lib/types";
import {
  useAnalytics,
  useDataset,
  useOptimization,
  useFilters,
} from "../providers";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
  ScoreBar,
} from "../shared";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { AllocationChart } from "../charts";
import { cn, download, number } from "@/lib/utils";
import Papa from "papaparse";
import { decimal } from "@/lib/locale";
import { BackendOptimizer } from "./backend-optimizer";
export function OptimizerScreen() {
  const { source } = useDataSource();
  return source === "api" ? <BackendOptimizer /> : <DemoOptimizerScreen />;
}
function DemoOptimizerScreen() {
  const q = useAnalytics();
  const ds = useDataset();
  const allocation = useOptimization();
  if (q.isError || ds.isError || allocation.isError)
    return (
      <ErrorState
        retry={() => {
          void q.refetch();
          void ds.refetch();
          void allocation.refetch();
        }}
      />
    );
  if (!q.data || !ds.data || !allocation.data) return <LoadingState />;
  if (!q.data.students) return <EmptyState />;
  if (!allocation.data.length) return <EmptyState />;
  return (
    <Optimizer
      key={`${ds.data.id}-${q.data.students}-${q.data.topics.map((t) => t.mastery).join(",")}`}
      initialRows={allocation.data}
      datasetId={ds.data.id}
    />
  );
}
function Optimizer({
  initialRows,
  datasetId,
}: {
  initialRows: Allocation[];
  datasetId: string;
}) {
  const { source, repository } = useDataSource();
  const { filters } = useFilters();
  const [rows, setRows] = useState<Allocation[]>(initialRows);
  const [scenario, setScenario] = useState("balanced");
  const [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      repository.savePlan({
        allocations: rows,
        savedAt: new Date().toISOString(),
        datasetId,
      }),
    onSuccess: () => {
      setSaved(true);
      void client.invalidateQueries({
        queryKey: sourceKey(source, "saved-plan"),
      });
      toast.success(
        source === "mock"
          ? "Распределение часов сохранено в браузере."
          : "Распределение часов сохранено на сервере.",
        {
          description:
            source === "mock"
              ? "Демоверсия не меняет расписание округа."
              : "Сохранено через Live API.",
        },
      );
    },
    onError: () =>
      toast.error(
        "Не удалось сохранить план. Возможно, хранилище браузера заполнено.",
        {
          description: "Вы можете экспортировать распределение в CSV.",
        },
      ),
  });
  const total = rows.reduce((s, r) => s + r.hours, 0);
  const maxHours = allocationLimit(rows.length);
  const weak = [...rows].sort((a, b) => a.mastery - b.mastery)[0];
  const donor = [...rows].sort(
    (a, b) => a.hours - a.baseline - (b.hours - b.baseline),
  )[0];
  const update = (id: string, value: number) => {
    setRows((prev) => rebalance(prev, id, value));
    setSaved(false);
    setScenario("custom");
  };
  const presetMutation = useMutation({
    mutationFn: (mode: "balanced" | "exam") =>
      repository.optimization({ filters, scenario: mode, allocations: rows }),
    onSuccess: (next, mode) => {
      if (!next.length) {
        toast.info("Сервер не вернул рекомендаций по распределению часов.");
        return;
      }
      setRows(next);
      setScenario(mode);
      setSaved(false);
    },
    onError: () =>
      toast.error(
        "API недоступен. Распределение не изменено. Повторите запрос сценария.",
      ),
  });
  function preset(mode: "balanced" | "exam") {
    presetMutation.mutate(mode);
  }
  return (
    <>
      <PageHeading
        title="Оптимизатор программы"
        eyebrow="Планирование программы"
        subtitle={source === "api" ? "Начальный бюджет 36 часов — редактируемое допущение, не данные CSV. Распределение рассчитывает backend. Сохранение API не поддерживает; используйте экспорт." : "Перераспределите фиксированный бюджет в 36 часов. Изменения автоматически балансируются за счёт незакреплённых тем."}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            download(
              "curriculum-allocation.csv",
              Papa.unparse(
                rows.map((r) => ({
                  topic: r.name,
                  current_hours: r.baseline,
                  recommended_hours: r.hours,
                  delta: r.hours - r.baseline,
                  mastery: r.mastery,
                })),
              ),
            )
          }
        >
          <Download />
          Экспорт плана
        </Button>
        <Button
          size="sm"
          disabled={source === "api" || mutation.isPending || saved || Math.abs(total - 36) > 0.01}
          onClick={() => mutation.mutate()}
        >
          <Check />
          {mutation.isPending
            ? "Сохранение…"
            : saved
              ? source === "mock"
                ? "План сохранён локально"
                : "План сохранён на сервере"
              : "Сохранить распределение"}
        </Button>
      </PageHeading>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="grid w-full grid-cols-3 gap-4 rounded-lg bg-surface-container-low px-4 py-3 sm:w-auto sm:gap-8">
          {[
            { label: "Всего доступно", value: "36,0", primary: false },
            { label: "Исходно", value: "36,0", primary: false },
            { label: "Рекомендовано", value: decimal(total), primary: true },
          ].map((x) => (
            <div key={x.label}>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-secondary">
                {x.label}
              </p>
              <p
                className={cn(
                  "mt-1 font-heading text-xl font-semibold",
                  x.primary && "text-primary",
                )}
              >
                {x.value}
                <span className="ml-1 text-[11px] font-normal text-secondary">
                  ч
                </span>
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">
            <ShieldCheck size={12} />
            Бюджет сохранён
          </Badge>
          <div className="flex rounded-lg bg-surface-container p-1">
            <Button
              size="sm"
              variant={scenario === "balanced" ? "outline" : "ghost"}
              disabled={presetMutation.isPending}
              onClick={() => preset("balanced")}
            >
              Сбалансированный
            </Button>
            <Button
              size="sm"
              variant={scenario === "exam" ? "outline" : "ghost"}
              disabled={presetMutation.isPending}
              onClick={() => preset("exam")}
            >
              К экзамену
            </Button>
          </div>
        </div>
      </Card>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={17} className="text-primary" />
              <CardTitle>Распределение часов</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Badge tone="success">
                <span className="size-1.5 rounded-full bg-tertiary-container" />
                Автобаланс включён
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Вернуть исходное распределение"
                onClick={() => {
                  setRows((prev) =>
                    prev.map((r) => ({
                      ...r,
                      hours: r.baseline,
                      locked: false,
                    })),
                  );
                  setScenario("baseline");
                  setSaved(false);
                }}
              >
                <RotateCcw />
              </Button>
            </div>
          </div>
          <div className="hidden grid-cols-[1.2fr_1fr_auto] gap-4 bg-surface-container-low px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-secondary sm:grid">
            <span>Тема и освоение</span>
            <span>Количество часов</span>
            <span>Изменение</span>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid items-center gap-4 px-4 py-4 sm:grid-cols-[1.2fr_1fr_auto]"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-semibold">{r.name}</h3>
                    <Badge
                      tone={
                        r.mastery < 60
                          ? "danger"
                          : r.mastery < 75
                            ? "neutral"
                            : "success"
                      }
                      className="px-1.5 py-0"
                    >
                      {number(r.mastery)}%{" "}
                      {r.mastery < 60
                        ? "Критично"
                        : r.mastery >= 75
                          ? "Низкая потребность"
                          : "Приоритет"}
                    </Badge>
                  </div>
                  <ScoreBar value={r.mastery} className="h-1.5" />
                  <p className="text-[10px] text-secondary">
                    Исходно: {decimal(r.baseline)} ч
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-6"
                        aria-label={`Уменьшить часы: ${r.name}`}
                        disabled={r.locked || r.hours <= 2}
                        onClick={() => update(r.id, r.hours - 0.5)}
                      >
                        <Minus className="!size-3" />
                      </Button>
                      <output
                        className="w-11 text-center font-heading text-base font-semibold tabular-nums text-primary"
                        htmlFor={`slider-${r.id}`}
                      >
                        {decimal(r.hours)}
                      </output>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-6"
                        aria-label={`Увеличить часы: ${r.name}`}
                        disabled={r.locked || r.hours >= maxHours}
                        onClick={() => update(r.id, r.hours + 0.5)}
                      >
                        <Plus className="!size-3" />
                      </Button>
                    </div>
                    <button
                      aria-label={`${r.locked ? "Открепить" : "Закрепить"} ${r.name}`}
                      aria-pressed={r.locked}
                      onClick={() => {
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, locked: !x.locked } : x,
                          ),
                        );
                        setSaved(false);
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded px-1.5 py-1 text-[10px] hover:bg-surface-container-low",
                        r.locked ? "text-primary" : "text-secondary",
                      )}
                    >
                      {r.locked ? (
                        <LockKeyhole size={12} />
                      ) : (
                        <LockKeyholeOpen size={12} />
                      )}{" "}
                      {r.locked ? "Закреплено" : "Закрепить"}
                    </button>
                  </div>
                  <input
                    id={`slider-${r.id}`}
                    aria-label={`${r.name}: учебные часы`}
                    type="range"
                    min="2"
                    max={maxHours}
                    step="0.5"
                    value={r.hours}
                    disabled={r.locked}
                    onChange={(e) => update(r.id, Number(e.target.value))}
                    className="w-full disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[9px] text-secondary">
                    <span>Мин. 2,0 ч</span>
                    <span>Макс. {decimal(maxHours)} ч</span>
                  </div>
                </div>
                <div className="sm:text-right">
                  <Badge
                    tone={r.hours > r.baseline ? "success" : "neutral"}
                    className="tabular-nums"
                  >
                    {r.hours - r.baseline > 0 ? "+" : ""}
                    {decimal(r.hours - r.baseline)} ч
                  </Badge>
                  <p className="mt-1 text-[9px] text-secondary">
                    {r.hours > r.baseline
                      ? "Приоритет роста"
                      : r.hours < r.baseline
                        ? "Источник часов"
                        : "Без изменений"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 bg-surface-container-low px-4 py-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-tertiary-container" />
              Все <strong>{decimal(total)} учебных часов</strong> распределены.
            </span>
            <span className="font-semibold text-tertiary-container">
              Изменение бюджета: 0,0 ч
            </span>
          </div>
        </Card>
        <div className="space-y-4 xl:col-span-5">
          <Card className="p-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} className="text-primary" />
                <CardTitle>Почему такие изменения?</CardTitle>
              </div>
              <Badge>По правилам</Badge>
            </CardHeader>
            <div className="space-y-3">
              <div className="rounded-lg border border-outline-variant/25 bg-surface p-3">
                <h3 className="mb-2 text-xs font-semibold">
                  Главный приоритет: {weak.name}
                </h3>
                <p className="text-xs leading-6 text-secondary">
                  При освоении{" "}
                  <strong className="text-error">
                    {number(weak.mastery)}%
                  </strong>
                  эта тема имеет наибольший пробел. В плане выделено{" "}
                  <strong className="text-on-surface">
                    {decimal(weak.hours)} ч
                  </strong>
                  , изменение на {decimal(weak.hours - weak.baseline)} ч
                  относительно исходного плана.
                </p>
              </div>
              <div className="rounded-lg border border-outline-variant/25 bg-surface p-3">
                <h3 className="mb-2 text-xs font-semibold">
                  Источник часов: {donor.name}
                </h3>
                <p className="text-xs leading-6 text-secondary">
                  Текущее освоение —{" "}
                  <strong className="text-on-surface">
                    {number(donor.mastery)}%
                  </strong>
                  . План{" "}
                  {donor.hours < donor.baseline
                    ? `высвобождает ${decimal(donor.baseline - donor.hours)} ч`
                    : `сохраняет ${decimal(donor.hours)} ч`}{" "}
                  для поддержки менее освоенных тем без потери охвата программы.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-tertiary-container"
                />
                <p className="text-[11px] leading-5 text-secondary">
                  <strong className="text-on-surface">
                    Ограничения планирования.
                  </strong>{" "}
                  На каждую тему остаётся не менее 2 часов. Закреплённые часы не
                  меняются. Изменение ограничено доступными часами
                  незакреплённых тем.
                </p>
              </div>
            </div>
          </Card>
          <Card className="min-w-0 p-4">
            <CardHeader>
              <CardTitle>Распределение до и после</CardTitle>
              <div className="flex gap-2 text-[9px]">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-secondary-fixed" />
                  Сейчас
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-primary-container" />
                  Предложено
                </span>
              </div>
            </CardHeader>
            <AllocationChart rows={rows} />
            <p className="mt-3 text-[10px] leading-5 text-secondary">
              Это рекомендации по планированию, а не прогноз роста освоения.
              Согласуйте минимальные часы по программе с учебной командой.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
