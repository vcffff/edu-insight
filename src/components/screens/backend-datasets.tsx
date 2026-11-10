"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataSource } from "@/hooks/use-data-source";
import { sourceKey } from "@/lib/data-source";
import { useDataset, useFilters } from "../providers";
import { BackendDashboard } from "../backend-dashboard";
import { Card, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PageHeading } from "../shared";
import type { Dataset } from "@/lib/types";
import { number } from "@/lib/utils";

const labels = { uploaded: "Загружен", processing: "Обработка", completed: "Завершён", failed: "Ошибка обработки" };
export function BackendDatasets() {
  const { repository } = useDataSource();
  const client = useQueryClient();
  const ds = useDataset();
  const { setFilters } = useFilters();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useQuery({ queryKey: sourceKey("api", "datasets"), queryFn: ({ signal }) => repository.datasets!(signal), retry: false,
    refetchInterval: (query) => query.state.data?.some((d) => d.status === "processing") ? 3000 : false });
  async function activate(data: Dataset) {
    await client.cancelQueries({ queryKey: sourceKey("api") });
    repository.selectDataset!(data.id);
    client.setQueryData(sourceKey("api", "dataset"), data);
    setFilters({ grade: "all", school: "all" });
    await client.invalidateQueries({ queryKey: sourceKey("api") });
  }
  async function upload(file: File) {
    if (busy.current) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Выберите файл CSV в UTF-8."); return; }
    busy.current = true;
    setUploading(true);
    try {
      const saved = await repository.uploadFile!(file);
      await activate(saved.dataset);
      toast.success(`${number(saved.dataset.rowCount ?? 0)} строк загружено. Графики обновлены.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить CSV."); }
    finally { busy.current = false; setUploading(false); if (input.current) input.current.value = ""; }
  }
  return <>
    <PageHeading title="Источники данных" subtitle="CSV сохраняется на сервере. После загрузки ниже появятся графики результатов." />
    <Card className="space-y-4 border-dashed p-8 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length !== 1) { setError("Загружайте по одному CSV."); return; } void upload(e.dataTransfer.files[0]); }}>
      <CardTitle>Перетащите CSV или выберите файл</CardTitle>
      <p className="text-xs text-secondary">Исходный UTF-8 CSV отправляется в backend. Структуру и содержимое проверяет сервер.</p>
      <input ref={input} className="sr-only" type="file" accept=".csv,text/csv" aria-label="Загрузить CSV с результатами" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      <Button disabled={uploading} onClick={() => input.current?.click()}>{uploading ? "Загрузка и расчёт аналитики…" : "Выбрать CSV"}</Button>
      {uploading && <p role="status" className="text-sm">Отправка файла на сервер…</p>}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </Card>
    <Card className="p-4"><CardTitle>Наборы данных на сервере</CardTitle>
      {list.isError && <div role="alert" className="mt-3 text-sm"><p>{list.error.message}</p><Button variant="outline" onClick={() => void list.refetch()}>Повторить</Button></div>}
      {list.isPending && <p className="mt-3 text-sm">Загрузка списка…</p>}
      {list.data?.length === 0 && <p className="mt-3 text-sm text-secondary">Пока нет загруженных CSV.</p>}
      <div className="mt-3 overflow-x-auto"><table className="data-table"><thead><tr><th>Файл</th><th>Строк</th><th>Дата</th><th>Статус отчёта</th><th>Действие</th></tr></thead><tbody>{list.data?.map((d) => <tr key={d.id}><td>{d.name}</td><td>{number(d.rowCount ?? 0)}</td><td>{new Date(d.uploadedAt).toLocaleString("ru-RU")}</td><td>{d.status ? labels[d.status] : "—"}</td><td><Button size="sm" variant={ds.data?.id === d.id ? "secondary" : "outline"} disabled={uploading || ds.data?.id === d.id} onClick={() => void activate(d)}>{ds.data?.id === d.id ? "Выбран" : "Открыть графики"}</Button></td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-secondary">API предоставляет агрегированную аналитику, но не исходные строки CSV. Просмотр и скачивание исходных строк недоступны.</p>
    </Card>
    <BackendDashboard uploadPreview />
  </>;
}
