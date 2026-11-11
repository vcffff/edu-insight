"use client";
import Link from "next/link";
import { AlertCircle, ArrowRight, Database, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataSource } from "@/hooks/use-data-source";
export function PageHeading({
  title,
  eyebrow,
  subtitle,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const { source } = useDataSource();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
      <div>
        {eyebrow && (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="primary" className="uppercase">
              {eyebrow}
            </Badge>
            <span className="size-1.5 rounded-full bg-tertiary-container" />
            {source === "mock" && <span className="text-[11px] text-secondary">
              Исходные данные · III четверть
            </span>}
          </div>
        )}
        <h1 className="font-heading text-2xl font-semibold tracking-[-0.025em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-secondary">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
  icon: Icon,
  children,
  danger = false,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-secondary">
          {label}
        </p>
        <div className="my-1 flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              "font-heading text-[28px] font-semibold leading-9 tracking-tight tabular-nums",
              danger && "text-error",
            )}
          >
            {value}
          </span>
          {children}
        </div>
        <p className="text-[11px] text-secondary">{note}</p>
      </div>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary",
          danger && "bg-error-container/70 text-error",
        )}
      >
        <Icon size={20} />
      </div>
    </Card>
  );
}
export function LoadingState() {
  return (
    <div role="status" aria-label="Загрузка аналитики" className="space-y-4">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-surface-container" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((x) => (
          <div key={x} className="h-28 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl bg-white" />
        <div className="h-80 animate-pulse rounded-xl bg-white" />
      </div>
      <span className="sr-only">Загрузка результатов оценивания…</span>
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  const { source } = useDataSource();
  return (
    <Card className="flex flex-col items-center gap-3 p-12 text-center">
      <AlertCircle className="text-error" />
      <h2 className="font-heading text-lg font-semibold">
        {source === "api" ? "API недоступен" : "Не удалось загрузить раздел"}
      </h2>
      <p className="text-sm text-secondary">
        {source === "api"
          ? "Повторите подключение к серверу или выберите «Демоданные» для работы с примером."
          : "Ваши данные сохранены. Попробуйте обновить анализ."}
      </p>
      <Button onClick={retry}>
        <RefreshCw />
        Попробовать снова
      </Button>
    </Card>
  );
}
export function EmptyState() {
  return (
    <Card className="flex flex-col items-center gap-3 p-12 text-center">
      <Database className="text-secondary" />
      <h2 className="font-heading text-lg font-semibold">
        В этой группе нет данных
      </h2>
      <p className="text-sm text-secondary">
        Выберите другой класс или школу либо загрузите новый набор данных.
      </p>
      <Button asChild>
        <Link href="/datasets">
          Управление данными
          <ArrowRight />
        </Link>
      </Button>
    </Card>
  );
}
export function PanelNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border-t border-outline-variant/20 pt-3 text-[11px] leading-5 text-secondary">
      {children}
    </p>
  );
}
export function ScoreBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 overflow-hidden rounded-full bg-surface-container-low",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          value < 60
            ? "bg-error"
            : value >= 75
              ? "bg-tertiary-container"
              : "bg-secondary",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
