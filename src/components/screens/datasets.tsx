"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { loadMockDemo } from "@/lib/data-source/mock-provider";
import { sourceKey } from "@/lib/data-source";
import { useDataSource } from "@/hooks/use-data-source";
import {
  requiredHeaders,
  toCSV,
  validateCSV,
  type Validation,
} from "@/lib/csv";
import { useDataset, useFilters } from "../providers";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent } from "../ui/dialog";
import { ErrorState, LoadingState, PageHeading } from "../shared";
import { cn, download, number } from "@/lib/utils";
import type { Dataset } from "@/lib/types";
import { sourceLabel, topicLabel } from "@/lib/locale";
import { BackendDatasets } from "./backend-datasets";
const PAGE_SIZE = 8;
export function DatasetsScreen() {
  const { source } = useDataSource();
  return source === "api" ? <BackendDatasets /> : <DemoDatasetsScreen />;
}
function DemoDatasetsScreen() {
  const { source, repository } = useDataSource();
  const q = useDataset();
  const client = useQueryClient();
  const { setFilters } = useFilters();
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [drag, setDrag] = useState(false),
    [progress, setProgress] = useState(0),
    [processing, setProcessing] = useState(false),
    [validation, setValidation] = useState<Validation | null>(null),
    [filename, setFilename] = useState(""),
    [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [confirmDemo, setConfirmDemo] = useState(false);
  const demo = useMutation({
    mutationFn: loadMockDemo,
    onSuccess: (r) => {
      setConfirmDemo(false);
      activate(r.dataset, r.persisted);
      setValidation(null);
      setFilename("");
      toast.success("Демоданные загружены.");
    },
    onError: () =>
      toast.error("Не удалось загрузить демоданные. Попробуйте ещё раз."),
  });
  function activate(data: Dataset, persisted: boolean) {
    client.setQueryData(sourceKey(source, "dataset"), data);
    void client.invalidateQueries({ queryKey: sourceKey(source) });
    setFilters({ grade: "all", school: "all" });
    setPage(0);
    setSearch("");
    if (!persisted)
      toast.warning("Набор данных доступен только в памяти.", {
        description:
          "Хранилище браузера заполнено. Не закрывайте вкладку или экспортируйте записи.",
      });
  }
  async function ingest(file: File) {
    if (busy.current) return;
    setValidation(null);
    setFilename(file.name);
    setProgress(0);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setValidation({
        records: [],
        warnings: [],
        errors: [
          "Выберите файл .csv. Файлы Excel сначала нужно сохранить в формате CSV.",
        ],
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidation({
        records: [],
        warnings: [],
        errors: [
          "Размер файла превышает 10 МБ. Разделите его на несколько файлов.",
        ],
      });
      return;
    }
    busy.current = true;
    setProcessing(true);
    setProgress(15);
    try {
      const text = await file.text();
      setProgress(40);
      const result = validateCSV(text);
      setValidation(result);
      if (result.errors.length) {
        setProgress(0);
        return;
      }
      setProgress(75);
      const data: Dataset = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.csv$/i, ""),
        uploadedAt: new Date().toISOString(),
        source: "CSV upload",
        records: result.records,
      };
      const saved = await repository.upload(data);
      activate(saved.dataset, saved.persisted);
      setProgress(100);
      toast.success(`${number(result.records.length)} результатов загружено.`, {
        description: "Все разделы аналитики используют новый набор.",
      });
    } catch {
      setValidation({
        records: [],
        warnings: [],
        errors: [
          "Не удалось прочитать файл. Сохраните его как CSV в UTF-8 и повторите загрузку.",
        ],
      });
      setProgress(0);
    } finally {
      busy.current = false;
      setProcessing(false);
      if (input.current) input.current.value = "";
    }
  }
  if (q.isError) return <ErrorState retry={() => void q.refetch()} />;
  if (!q.data) return <LoadingState />;
  const ds = q.data;
  const filtered = ds.records.filter(
    (r) =>
      !search ||
      Object.values(r).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, pages - 1);
  return (
    <>
      <PageHeading
        title="Источники данных"
        eyebrow="Загрузка результатов"
        subtitle="Загрузка результатов учащихся с понятной проверкой структуры данных."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            download("eduinsight-assessments.csv", toCSV(ds.records))
          }
        >
          <Download />
          Экспорт текущих данных
        </Button>
        <Button
          size="sm"
          disabled={source === "api" || demo.isPending || processing}
          onClick={() =>
            ds.source === "CSV upload" ? setConfirmDemo(true) : demo.mutate()
          }
        >
          <RefreshCw className={demo.isPending ? "animate-spin" : ""} />
          {demo.isPending ? "Загрузка…" : "Загрузить демоданные"}
        </Button>
      </PageHeading>
      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-4 xl:col-span-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CloudUpload size={19} className="text-primary" />
              <CardTitle>Загрузка результатов оценивания</CardTitle>
              <Badge>CSV</Badge>
            </div>
            <Badge tone="primary">
              {source === "mock"
                ? "Локальная обработка"
                : "Загрузка через Live API"}
            </Badge>
          </CardHeader>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!processing) setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files.length > 1) {
                setValidation({
                  records: [],
                  warnings: [],
                  errors: [
                    "Загружайте по одному CSV. Вы перетащили несколько файлов.",
                  ],
                });
                return;
              }
              const file = e.dataTransfer.files[0];
              if (file) void ingest(file);
            }}
            className={cn(
              "flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/55 bg-surface/60 p-5 text-center transition-colors",
              drag && "border-primary bg-primary-fixed/30",
              processing && "opacity-60",
            )}
          >
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-surface-container-low text-primary">
              <CloudUpload size={27} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium">
              Перетащите сюда CSV с результатами
            </p>
            <p className="my-2 text-xs text-secondary">
              или выберите файл на компьютере · до 10 МБ
            </p>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              aria-label="Загрузить CSV с результатами"
              className="sr-only"
              disabled={processing || demo.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void ingest(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={processing || demo.isPending}
              onClick={() => {
                if (input.current) {
                  input.current.value = "";
                  input.current.click();
                }
              }}
            >
              <FileText />
              Выбрать файл
            </Button>
            <p className="mt-3 text-[10px] text-secondary">
              {source === "mock"
                ? "CSV в UTF-8 · до 100 000 строк · без отправки на сервер"
                : "CSV в UTF-8 · до 100 000 строк · проверенные записи отправляются на сервер"}
            </p>
          </div>
          {(processing || progress === 100) && (
            <div className="mt-4" role="status">
              <div className="mb-2 flex justify-between gap-2 text-xs">
                <span className="truncate">
                  {processing ? "Проверка и загрузка" : "Загрузка завершена"} ·{" "}
                  {filename}
                </span>
                <span>{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Загрузка набора данных"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 rounded-full bg-surface-container"
              >
                <div
                  className="h-full rounded-full bg-primary-container transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {validation && (
            <div
              role={validation.errors.length ? "alert" : "status"}
              className={cn(
                "mt-4 rounded-lg border p-3",
                validation.errors.length
                  ? "border-error/20 bg-error-container/30"
                  : "border-emerald-200 bg-emerald-50/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold">
                  {validation.errors.length ? (
                    <TriangleAlert size={15} className="text-error" />
                  ) : (
                    <CheckCircle2
                      size={15}
                      className="text-tertiary-container"
                    />
                  )}
                  {validation.errors.length
                    ? "Обнаружены ошибки"
                    : `${number(validation.records.length)} корректных результатов`}
                </h3>
                <button
                  aria-label="Закрыть результат проверки"
                  onClick={() => {
                    setValidation(null);
                    setProgress(0);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              {validation.errors.map((e) => (
                <p className="mt-2 text-xs leading-5 text-error" key={e}>
                  {e}
                </p>
              ))}
              {validation.warnings.map((w) => (
                <p className="mt-2 text-xs leading-5 text-amber-800" key={w}>
                  {w}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-surface-container-low px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
              Обязательные столбцы
            </p>
            <p className="mt-1.5 break-words font-mono text-[10px] leading-5">
              {requiredHeaders.join(", ")}
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-secondary">
              Необязательно: <code>grade</code> (1–12, по умолчанию 10). Баллы:
              0–100. Даты: ГГГГ-ММ-ДД. Одна строка на учащегося, тему, работу и
              дату.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-secondary">
              <ShieldCheck size={14} />
              Используйте обезличенные ID: автоматического обезличивания нет.
            </span>
            <button
              onClick={() =>
                download(
                  "eduinsight-template.csv",
                  requiredHeaders.join(",") +
                    ",grade\nSTU-001,Северная школа,Промежуточная работа,geometry,48,Integrated Math II,2025-01-18,10\nSTU-002,Западная школа,Промежуточная работа,geometry,62,Pearson,2025-01-18,10",
                )
              }
              className="flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Скачать шаблон CSV
              <ArrowRight size={13} />
            </button>
          </div>
        </Card>
        <Card className="p-4 xl:col-span-4">
          <CardHeader>
            <CardTitle>Качество данных</CardTitle>
            <Badge tone="success">Проверка доступна</Badge>
          </CardHeader>
          <div className="space-y-5">
            <div className="flex gap-3">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-tertiary-container"
              />
              <div>
                <h3 className="text-xs font-semibold">Проверка структуры</h3>
                <Badge tone="success" className="my-1.5">
                  Обязательные поля проверены
                </Badge>
                <p className="text-[11px] leading-5 text-secondary">
                  Проверяются ID, диапазоны баллов и классов, даты и
                  повторяющиеся записи.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <h3 className="text-xs font-semibold">
                  {source === "mock"
                    ? "Обработка в браузере"
                    : "Обработка на сервере"}
                </h3>
                <p className="mt-1.5 text-[11px] leading-5 text-secondary">
                  {source === "mock"
                    ? "Записи остаются в текущем сеансе браузера. Демоверсия не сертифицирована для хранения персональных данных учащихся. Загружайте только обезличенные данные."
                    : "Проверенные записи отправляются на настроенный сервер. Перед загрузкой реальных результатов проверьте права доступа и правила хранения."}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <FileSpreadsheet
                size={19}
                className="mt-0.5 shrink-0 text-secondary"
              />
              <div>
                <h3 className="text-xs font-semibold">
                  Охват учебной программы
                </h3>
                <p className="mt-1.5 text-[11px] leading-5 text-secondary">
                  {new Set(ds.records.map((r) => r.textbook_edition)).size}{" "}
                  учебников · {new Set(ds.records.map((r) => r.topic_id)).size}{" "}
                  тем · {new Set(ds.records.map((r) => r.school_id)).size} школ
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-6 w-full"
            onClick={() => {
              const result = validateCSV(toCSV(ds.records));
              setValidation(result);
              toast.success(
                result.errors.length
                  ? "Проверка завершена: обнаружены ошибки."
                  : "Структура данных корректна.",
              );
            }}
          >
            <ShieldCheck />
            Проверить структуру
          </Button>
        </Card>
      </div>
      <Card className="p-4">
        <CardHeader>
          <div>
            <CardTitle>Загруженные наборы данных</CardTitle>
            <p className="mt-1 text-[11px] text-secondary">
              Все разделы используют один текущий набор. Новая загрузка заменяет
              его.
            </p>
          </div>
          <Badge>1 текущий набор</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название набора</th>
                <th>Источник</th>
                <th>Дата загрузки</th>
                <th className="text-right">Строк</th>
                <th>Статус</th>
                <th className="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="flex items-center gap-2 font-medium">
                    <Database size={16} className="text-primary" />
                    {ds.name}
                  </span>
                </td>
                <td className="text-secondary">{sourceLabel(ds.source)}</td>
                <td className="text-secondary">
                  {new Date(ds.uploadedAt).toLocaleDateString("ru-RU", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="text-right tabular-nums">
                  {number(ds.records.length)}
                </td>
                <td>
                  <Badge tone="success">
                    <Check size={11} />
                    Проверен
                  </Badge>
                </td>
                <td className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Скачать текущие данные"
                    onClick={() =>
                      download("assessment-records.csv", toCSV(ds.records))
                    }
                  >
                    <Download />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-4">
        <CardHeader>
          <div>
            <CardTitle>Предпросмотр результатов</CardTitle>
            <p className="mt-1 text-[11px] text-secondary">
              Показаны {filtered.length ? activePage * PAGE_SIZE + 1 : 0}–
              {Math.min((activePage + 1) * PAGE_SIZE, filtered.length)} из{" "}
              {number(filtered.length)} записей
            </p>
          </div>
          <input
            type="search"
            aria-label="Поиск по результатам"
            placeholder="Поиск записей…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-8 w-36 rounded-lg border border-outline-variant/50 bg-surface px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary sm:w-52"
          />
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID учащегося</th>
                <th>Тема / раздел</th>
                <th>Школа</th>
                <th className="text-right">Балл</th>
                <th>Учебник / издание</th>
                <th>Класс</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE)
                .map((r, i) => (
                  <tr key={`${r.student_id}-${r.topic_id}-${i}`}>
                    <td className="font-mono text-[10px] text-secondary">
                      {r.student_id}
                    </td>
                    <td className="font-medium">{topicLabel(r.topic_id)}</td>
                    <td className="text-secondary">{r.school_id}</td>
                    <td
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        r.score_pct < 60 ? "text-error" : "text-on-surface",
                      )}
                    >
                      {number(r.score_pct)}%
                    </td>
                    <td
                      className="max-w-[230px] truncate text-secondary"
                      title={r.textbook_edition}
                    >
                      {r.textbook_edition}
                    </td>
                    <td>{r.grade}</td>
                    <td className="text-secondary">{r.date}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="py-10 text-center text-sm text-secondary">
              Нет записей по запросу «{search}».
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3 text-[11px] text-secondary">
          <span>
            Страница {activePage + 1} из {number(pages)}
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="outline"
              className="size-7"
              disabled={activePage === 0}
              aria-label="Предыдущая страница записей"
              onClick={() => setPage(activePage - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-7"
              disabled={activePage >= pages - 1}
              aria-label="Следующая страница записей"
              onClick={() => setPage(activePage + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </Card>
      <Dialog open={confirmDemo} onOpenChange={setConfirmDemo}>
        <DialogContent
          title="Заменить текущий набор данных?"
          description="Демоданные заменят текущий CSV во всех разделах. Если хотите сохранить записи, сначала экспортируйте их."
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDemo(false)}>
              Отмена
            </Button>
            <Button disabled={demo.isPending} onClick={() => demo.mutate()}>
              {demo.isPending ? "Загрузка…" : "Заменить демоданными"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
