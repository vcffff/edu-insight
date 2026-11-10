"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  Lightbulb,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useRecommendations } from "../providers";
import { useDataSource } from "@/hooks/use-data-source";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "../shared";
import { download } from "@/lib/utils";
import { BackendRecommendations } from "./backend-recommendations";
export function RecommendationsScreen() {
  const { source } = useDataSource();
  return source === "api" ? <BackendRecommendations /> : <DemoRecommendationsScreen />;
}
function DemoRecommendationsScreen() {
  const q = useRecommendations();
  const { source } = useDataSource();
  const [completed, setCompleted] = useState<string[]>([]),
    [expanded, setExpanded] = useState<string[]>([]),
    [filter, setFilter] = useState("all"),
    [ai, setAi] = useState<"idle" | "loading" | "fallback">("idle");
  if (q.isError) return <ErrorState retry={() => void q.refetch()} />;
  if (!q.data) return <LoadingState />;
  if (!q.data.length) return <EmptyState />;
  const icons = {
    allocation: SlidersHorizontal,
    diagnostic: ClipboardCheck,
    textbook: BookOpen,
  };
  const recs = q.data.map((r) => ({ ...r, icon: icons[r.kind] }));
  const visible = recs.filter(
    (r) =>
      filter === "all" ||
      (filter === "open" && !completed.includes(r.id)) ||
      (filter === "completed" && completed.includes(r.id)),
  );
  return (
    <>
      <PageHeading
        title="Рекомендации"
        eyebrow="От данных к действиям"
        subtitle="Приоритетный план действий по текущим результатам оценивания."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            download(
              "eduinsight-action-plan.txt",
              recs
                .map(
                  (r, i) =>
                    `${i + 1}. ${r.title}\n${r.description}\nОбоснование: ${r.evidence.join("; ")}\n${r.explanation}\n`,
                )
                .join("\n"),
              "text/plain",
            )
          }
        >
          <Download />
          Экспорт плана действий
        </Button>
      </PageHeading>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-container p-2.5 text-white">
            <BrainCircuit size={23} />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold">
              Сводка для методиста
            </h2>
            <p className="mt-1 text-xs text-secondary">
              {recs.length} действия на основе данных ·{" "}
              {completed.filter((id) => recs.some((r) => r.id === id)).length}{" "}
              изучено
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={ai === "fallback" ? "warning" : "neutral"}>
            {ai === "fallback"
              ? "ИИ недоступен · объяснения по правилам"
              : source === "mock"
                ? "Доступны объяснения по правилам"
                : "Объяснения с сервера"}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            disabled={source === "api" || ai === "loading"}
            onClick={async () => {
              setAi("loading");
              await new Promise((r) => setTimeout(r, 700));
              setAi("fallback");
              toast.info("ИИ не подключён в демоверсии.", {
                description:
                  "Метрики и объяснения по правилам остаются доступными.",
              });
            }}
          >
            {ai === "loading" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {ai === "loading"
              ? "Проверка доступности…"
              : source === "api"
                ? "Объяснение получено с сервера"
                : "Запросить объяснение ИИ"}
          </Button>
        </div>
      </Card>
      {ai === "fallback" && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 p-3 text-xs leading-5 text-amber-900"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          Объяснения ИИ недоступны. Рекомендации ниже основаны на понятных
          правилах и метриках текущего набора. Сгенерированные утверждения не
          используются.
        </div>
      )}
      <div
        className="flex gap-1 rounded-lg bg-surface-container p-1 w-fit"
        role="group"
        aria-label="Фильтр рекомендаций"
      >
        {[
          { v: "all", l: "Все действия" },
          { v: "open", l: "К изучению" },
          { v: "completed", l: "Изучено" },
        ].map((x) => (
          <Button
            size="sm"
            variant={filter === x.v ? "outline" : "ghost"}
            aria-pressed={filter === x.v}
            onClick={() => setFilter(x.v)}
            key={x.v}
          >
            {x.l}
          </Button>
        ))}
      </div>
      <div className="space-y-4">
        {visible.map((r) => {
          const done = completed.includes(r.id),
            open = expanded.includes(r.id);
          return (
            <Card
              key={r.id}
              className={`overflow-hidden border-l-[3px] ${done ? "border-l-tertiary-container" : "border-l-primary-container"}`}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="hidden rounded-lg bg-surface-container-low p-2.5 text-primary sm:block">
                    <r.icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          done
                            ? "success"
                            : r.priority === "High priority"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {done
                          ? "Изучено"
                          : r.priority === "High priority"
                            ? "Высокий приоритет"
                            : "К изучению"}
                      </Badge>
                      <span className="text-[10px] text-secondary">
                        На основе результатов · требуется проверка методиста
                      </span>
                    </div>
                    <h2 className="font-heading text-lg font-semibold tracking-tight">
                      {r.title}
                    </h2>
                    <p className="mt-2 max-w-4xl text-[13px] leading-6 text-secondary">
                      {r.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {r.evidence.map((e) => (
                        <span
                          className="rounded-md border border-outline-variant/30 bg-surface px-2.5 py-1.5 text-[10px] font-medium"
                          key={e}
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    aria-label={
                      done
                        ? `Отметить «${r.title}» как требующее изучения`
                        : `Отметить «${r.title}» изученным`
                    }
                    aria-pressed={done}
                    onClick={() =>
                      setCompleted((prev) =>
                        done ? prev.filter((v) => v !== r.id) : [...prev, r.id],
                      )
                    }
                    className={`rounded-full p-1.5 ${done ? "bg-emerald-50 text-tertiary-container" : "text-outline-variant hover:text-primary"}`}
                  >
                    {done ? <CheckCircle2 size={22} /> : <Check size={22} />}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 pt-3 sm:ml-[53px]">
                  <button
                    aria-expanded={open}
                    aria-controls={`explanation-${r.id}`}
                    onClick={() =>
                      setExpanded((prev) =>
                        open ? prev.filter((v) => v !== r.id) : [...prev, r.id],
                      )
                    }
                    className="flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary"
                  >
                    <Lightbulb size={14} />
                    Почему эта рекомендация?
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <Button size="sm" asChild>
                    <Link href={r.href}>
                      {r.action}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
                {open && (
                  <div
                    id={`explanation-${r.id}`}
                    className="mt-3 rounded-lg bg-surface-container-low p-4 sm:ml-[53px]"
                  >
                    <Badge className="mb-2">
                      {source === "mock"
                        ? "Объяснение по правилам · без ИИ"
                        : "Объяснение получено с сервера"}
                    </Badge>
                    <p className="text-xs leading-6 text-secondary">
                      {r.explanation}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {!visible.length && (
          <Card className="p-12 text-center">
            <ClipboardCheck className="mx-auto mb-3 text-primary" />
            <h2 className="font-semibold">
              {filter === "completed"
                ? "Пока нет изученных действий"
                : "Все действия изучены"}
            </h2>
            <p className="mt-2 text-sm text-secondary">
              {filter === "completed"
                ? "Нажмите галочку на карточке, чтобы отметить действие как изученное."
                : "Откройте «Все действия», чтобы вернуться к рекомендациям."}
            </p>
          </Card>
        )}
      </div>
      <Card className="p-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-tertiary-container" />
            <CardTitle>Для осознанных, а не автоматических решений</CardTitle>
          </div>
        </CardHeader>
        <p className="text-xs leading-6 text-secondary">
          Рекомендации требуют профессиональной оценки методиста. Они не
          доказывают причинную связь, не гарантируют улучшение и не заменяют
          решения педагогов. Отметки об изучении сохраняются, пока открыт этот
          экран.
        </p>
      </Card>
    </>
  );
}
