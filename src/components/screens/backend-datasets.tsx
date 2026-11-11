"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataSource } from "@/hooks/use-data-source";
import { sourceKey } from "@/lib/data-source";
import { useDataset, useFilters } from "../providers";
import { BackendDashboard } from "../backend-dashboard";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { PageHeading } from "../shared";
import { Database, Upload, ShieldCheck, ClipboardCheck } from "lucide-react";
import type { Dataset } from "@/lib/types";
import { download, number } from "@/lib/utils";

const labels = { uploaded: "Загружен", processing: "Обработка", completed: "Завершён", failed: "Ошибка обработки" };
export function BackendDatasets() {
  const { repository } = useDataSource();
  const client = useQueryClient();
  const ds = useDataset();
  const { setFilters } = useFilters();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [itemError, setItemError] = useState("");
  const [itemUploading, setItemUploading] = useState(false);
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);
  const list = useQuery({ queryKey: sourceKey("api", "datasets"), queryFn: ({ signal }) => repository.datasets!(signal), retry: false,
    refetchInterval: (query) => query.state.data?.some((d) => d.status === "processing") ? 3000 : false });
  const skills = useQuery({ queryKey: sourceKey("api", "skills", ds.data?.id), queryFn: ({ signal }) => repository.skills!(ds.data!.id, undefined, signal), enabled: !!ds.data && ds.data.id !== "api-empty", retry: false });
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
  async function uploadItems(file: File) {
    if (!ds.data || ds.data.id === "api-empty") return;
    setItemError("");
    if (!file.name.toLowerCase().endsWith(".csv")) { setItemError("Выберите файл CSV в UTF-8."); return; }
    setItemUploading(true);
    try {
      const result = await repository.uploadItems!(ds.data.id, file);
      await client.invalidateQueries({ queryKey: sourceKey("api", "skills", ds.data.id) });
      await client.invalidateQueries({ queryKey: sourceKey("api", "report", ds.data.id) });
      toast.success(`${number(result.row_count)} ответов загружено · ${number(result.skill_count)} навыков.`);
    } catch (e) { setItemError(e instanceof Error ? e.message : "Не удалось загрузить ответы."); }
    finally { setItemUploading(false); if (itemInput.current) itemInput.current.value = ""; }
  }
  return <>
    <PageHeading title="Источники данных" eyebrow="Загрузка результатов оценивания" subtitle="Выберите CSV и изучайте результаты выбранного набора на всех экранах." />
    <Card className="space-y-4 border-dashed p-8 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length !== 1) { setError("Загружайте по одному CSV."); return; } void upload(e.dataTransfer.files[0]); }}>
      <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/5 text-primary"><Upload size={22} /></div><CardTitle>Загрузка результатов оценивания</CardTitle>
      <p className="text-xs text-secondary">Исходный UTF-8 CSV отправляется в backend. Укажите предмет в колонке <code>subject</code>, чтобы фильтровать темы и получать отчёт по предмету. Структуру и содержимое проверяет сервер.</p>
      <Button variant="outline" onClick={() => download("assessments-template.csv", "student_id,subject,topic,textbook,score,max_score,assessment_date,class_id,grade\n", "text/csv")}>Скачать шаблон результатов</Button>
      <input ref={input} className="sr-only" type="file" accept=".csv,text/csv" aria-label="Загрузить CSV с результатами" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      <Button disabled={uploading} onClick={() => input.current?.click()}>{uploading ? "Загрузка и расчёт аналитики…" : "Выбрать CSV"}</Button>
      {uploading && <p role="status" className="text-sm">Отправка файла на сервер…</p>}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </Card>
    <Card className="space-y-4 p-5"><CardHeader><div className="flex items-center gap-2"><ClipboardCheck size={17} className="text-primary" /><CardTitle>Ответы по заданиям</CardTitle></div><Badge>Необязательно</Badge></CardHeader><p className="text-xs leading-5 text-secondary">После выбора основного датасета загрузите отдельный CSV с ответами на задания. Его можно экспортировать из электронной системы; вручную считать проценты не нужно. Поля <code>student_id</code>, <code>topic</code> и <code>subject</code> должны совпадать с основным CSV. Если тема встречается в нескольких предметах, <code>subject</code> обязателен. Повторная загрузка заменяет прежние ответы этого датасета.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => download("item-responses-template.csv", "student_id,subject,topic,skill,item_id,is_correct\n", "text/csv")}>Скачать шаблон</Button><input ref={itemInput} className="sr-only" type="file" accept=".csv,text/csv" aria-label="Загрузить ответы по заданиям" disabled={itemUploading || !ds.data || ds.data.id === "api-empty"} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadItems(file); }} /><Button disabled={itemUploading || !ds.data || ds.data.id === "api-empty"} onClick={() => itemInput.current?.click()}>{itemUploading ? "Загрузка ответов…" : "Загрузить ответы"}</Button></div><p className="text-xs text-secondary">Одна строка — ответ одного ученика на одно задание. <code>is_correct</code>: 1 — верно, 0 — неверно. Повторные попытки обозначайте разными <code>item_id</code>.</p>{skills.data && <p className="text-xs text-secondary">Для выбранного датасета: {number(skills.data.item_response_count)} ответов, {number(skills.data.skills.length)} навыков.</p>}{skills.isError && <p role="alert" className="text-xs text-error">Не удалось получить диагностику навыков: {skills.error.message}</p>}{itemError && <p role="alert" className="text-xs text-error">{itemError}</p>}</Card>
    <Card className="p-4"><CardHeader><div className="flex items-center gap-2"><Database size={17} className="text-primary" /><CardTitle>Загруженные наборы данных</CardTitle></div><Badge tone="success"><ShieldCheck size={12} />Live API</Badge></CardHeader>
      {list.isError && <div role="alert" className="mt-3 text-sm"><p>{list.error.message}</p><Button variant="outline" onClick={() => void list.refetch()}>Повторить</Button></div>}
      {list.isPending && <p className="mt-3 text-sm">Загрузка списка…</p>}
      {list.data?.length === 0 && <p className="mt-3 text-sm text-secondary">Пока нет загруженных CSV.</p>}
      <div className="mt-3 overflow-x-auto"><table className="data-table"><thead><tr><th>Файл</th><th>Строк</th><th>Дата</th><th>Статус отчёта</th><th>Действие</th></tr></thead><tbody>{list.data?.map((d) => <tr key={d.id}><td>{d.name}</td><td>{number(d.rowCount ?? 0)}</td><td>{new Date(d.uploadedAt).toLocaleString("ru-RU")}</td><td>{d.status ? labels[d.status] : "—"}</td><td><Button size="sm" variant={ds.data?.id === d.id ? "secondary" : "outline"} disabled={uploading || ds.data?.id === d.id} onClick={() => void activate(d)}>{ds.data?.id === d.id ? "Выбран" : "Открыть графики"}</Button></td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-secondary">API предоставляет агрегированную аналитику, но не исходные строки CSV. Просмотр и скачивание исходных строк недоступны.</p>
    </Card>
    <BackendDashboard uploadPreview />
  </>;
}
