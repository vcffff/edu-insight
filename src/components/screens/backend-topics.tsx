"use client";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Papa from "papaparse";
import { useAnalytics, useDataset } from "../providers";
import { AnalyticsFilters } from "../backend-dashboard";
import { Card, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Badge } from "../ui/badge";
import { LoadingState, PageHeading, ScoreBar } from "../shared";
import { cn, download, number } from "@/lib/utils";

const status = (score: number) => score < 60 ? "Критический пробел" : score < 75 ? "Ниже цели" : "Цель достигнута";

export function BackendTopics() {
  const q = useAnalytics();
  const ds = useDataset();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("weakest");
  if (q.isError || ds.isError) return <Card className="space-y-3 p-5" role="alert"><p>{(q.error ?? ds.error)?.message}</p><Button onClick={() => { void ds.refetch(); void q.refetch(); }}>Повторить</Button></Card>;
  if (!q.data || !ds.data) return <LoadingState />;
  const raw = q.data.backend;
  if (!raw) return <Card className="space-y-3 p-8"><CardTitle>Загрузите CSV для анализа тем</CardTitle><Button asChild><Link href="/datasets">Загрузить CSV</Link></Button></Card>;
  const topics = raw.topic_mastery.filter((t) => t.topic.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => sort === "name" ? a.topic.localeCompare(b.topic, "ru") : sort === "strongest" ? b.score - a.score : a.score - b.score);
  const topic = topics.find((t) => t.topic === selected) ?? topics[0];
  const answers = raw.topic_performance.find((t) => t.topic === topic?.topic);
  return <>
    <PageHeading title="Аналитика тем" eyebrow={ds.data.name} subtitle="Сравните освоение тем, найдите пробелы и изучите результаты выбранной темы.">
      <Button variant="outline" disabled={!topics.length} onClick={() => download("topic-analysis.csv", Papa.unparse(topics))}>Экспорт тем CSV</Button>
    </PageHeading>
    <AnalyticsFilters options={raw.available_filters} />
    <Card className="flex flex-wrap items-end gap-3 p-4">
      <label className="min-w-48 flex-1 text-xs">Поиск темы<input type="search" aria-label="Поиск темы" placeholder="Название темы…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-outline-variant/50 bg-surface px-3 text-sm" /></label>
      <label className="text-xs">Сортировка<Select className="mt-1 block" aria-label="Сортировка тем" value={sort} onChange={(e) => setSort(e.target.value)}><option value="weakest">Сначала слабые</option><option value="strongest">Сначала сильные</option><option value="name">По названию</option></Select></label>
      <p className="pb-2 text-xs text-secondary">{topics.length} из {raw.topic_mastery.length} тем</p>
    </Card>
    {!topics.length ? <Card className="p-8 text-center text-sm text-secondary">Нет тем по выбранным условиям.</Card> : <>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <Card className="min-w-0 p-4 xl:col-span-8">
          <CardTitle>Сравнение освоения тем</CardTitle>
          <p className="mt-2 text-xs text-secondary">Средние баллы в процентах. Пунктир — целевой уровень 75%.</p>
          <div className="mt-4 max-h-[600px] overflow-y-auto" role="img" aria-label="Сравнение освоения тем">
            <div style={{ height: Math.max(240, topics.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%"><BarChart data={topics} layout="vertical" margin={{ right: 20 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="topic" width={120} tick={{ fontSize: 11 }} /><Tooltip /><ReferenceLine x={75} stroke="#4f46e5" strokeDasharray="4 4" /><Bar dataKey="score" name="Освоение (%)" radius={[0, 4, 4, 0]}>{topics.map((t) => <Cell key={t.topic} fill={t.score < 60 ? "#ba1a1a" : t.score < 75 ? "#565e74" : "#00856a"} />)}</Bar></BarChart></ResponsiveContainer>
            </div>
          </div>
        </Card>
        {topic && <Card className="space-y-4 p-4 xl:col-span-4" aria-label="Подробности выбранной темы">
          <CardTitle>Подробности темы</CardTitle>
          <label className="block text-xs">Выберите тему<Select aria-label="Выберите тему" className="mt-1 w-full" value={topic.topic} onChange={(e) => setSelected(e.target.value)}>{topics.map((t) => <option key={t.topic}>{t.topic}</option>)}</Select></label>
          <h3 className="text-lg font-semibold">{topic.topic}</h3>
          <Badge tone={topic.score < 60 ? "danger" : topic.score < 75 ? "warning" : "success"}>{status(topic.score)}</Badge>
          <p className="text-3xl font-semibold">{number(topic.score)}%</p><ScoreBar value={topic.score} />
          <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-secondary">Учащихся по теме</dt><dd className="font-semibold">{number(topic.student_count)}</dd></div><div className="flex justify-between gap-3"><dt className="text-secondary">{topic.score < 75 ? "До цели 75%" : "Выше цели 75%"}</dt><dd>{number(Math.abs(75 - topic.score))} п. п.</dd></div></dl>
          {answers ? <dl className="space-y-2 rounded-lg bg-surface p-3 text-sm"><div className="flex justify-between"><dt>Правильные ответы</dt><dd>{number(answers.correct_answers)}</dd></div><div className="flex justify-between"><dt>Неправильные ответы</dt><dd>{number(answers.incorrect_answers)}</dd></div></dl> : <p className="rounded-lg bg-surface p-3 text-xs leading-5 text-secondary">Backend не предоставил количество правильных и неправильных ответов по этой теме. Баллы не заменяют количество ответов.</p>}
          <Button asChild variant="outline" className="w-full"><Link href="/curriculum-optimizer">Планировать часы</Link></Button>
        </Card>}
      </div>
      <Card className="p-4"><CardTitle>Результаты по каждой теме</CardTitle><div className="mt-4 overflow-x-auto"><table className="data-table"><thead><tr><th>Тема</th><th>Освоение</th><th>Учащихся</th><th>Статус</th></tr></thead><tbody>{topics.map((t) => <tr key={t.topic} className={cn(t.topic === topic?.topic && "bg-primary-fixed/20")}><td><button className="text-left font-medium hover:text-primary" aria-pressed={t.topic === topic?.topic} onClick={() => setSelected(t.topic)}>{t.topic}</button></td><td>{number(t.score)}%</td><td>{number(t.student_count)}</td><td>{status(t.score)}</td></tr>)}</tbody></table></div></Card>
    </>}
  </>;
}
