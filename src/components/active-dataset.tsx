"use client";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { useDataset } from "./providers";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { number } from "@/lib/utils";
import { sourceLabel } from "@/lib/locale";

export function ActiveDataset() {
  const { data } = useDataset();
  if (!data || data.id === "api-empty") return null;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/25 bg-primary-fixed/15 p-4" aria-label="Текущий файл анализа">
      <div className="flex min-w-0 items-start gap-3">
        <FileSpreadsheet className="mt-1 shrink-0 text-primary" size={24} />
        <div className="min-w-0">
          <p className="text-xs text-secondary">Сейчас анализируем</p>
          <p className="mt-1 break-all text-base font-semibold">{data.name}</p>
          <p className="mt-1 text-xs text-secondary">
            {sourceLabel(data.source)} · {number(data.rowCount ?? data.records.length)} строк · Загружен {new Date(data.uploadedAt).toLocaleString("ru-RU")}
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm"><Link href="/datasets">Выбрать другой файл</Link></Button>
    </Card>
  );
}
