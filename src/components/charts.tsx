"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Allocation, Analytics, ComparisonRow } from "@/lib/types";
const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #c7c4d850",
  fontSize: 12,
  boxShadow: "0 4px 16px #0b1c3010",
};
export function DistributionChart({
  data,
  total,
  countLabel = "учащихся",
  totalLabel = countLabel,
  explanation = "Каждый сектор показывает долю учащихся в диапазоне среднего балла. Диапазон — результат в процентах от максимального балла; доля — размер сектора круга.",
}: {
  data: Analytics["distribution"];
  total: number;
  countLabel?: string;
  totalLabel?: string;
  explanation?: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-secondary">{explanation}</p>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div
        className="relative h-[160px] w-[160px] shrink-0"
        role="img"
        aria-label={data
          .map((d) => `${d.name}: ${d.value} ${countLabel}, ${total ? Math.round((d.value / total) * 100) : 0}% от суммы по диапазонам`)
          .join(", ")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={73}
              stroke="white"
              strokeWidth={3}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} ${countLabel} (${total ? Math.round((Number(value) / total) * 100) : 0}% от суммы)`, `Диапазон ${name}`]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold">
            {total.toLocaleString("ru-RU")}
          </span>
          <span className="text-[10px] text-secondary">{totalLabel}</span>
        </div>
      </div>
      <div className="w-full space-y-3">
        <div className="flex gap-2 text-[10px] text-secondary"><span className="flex-1">Диапазон балла</span><span className="w-12 text-right">Доля</span><span className="w-14 text-right">Кол-во</span></div>
        {data.map((d) => (
          <div className="flex items-center gap-2 text-[11px]" key={d.name}>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: d.color }}
            />
            <span className="flex-1 text-secondary">{d.name}</span>
            <span className="w-12 text-right font-semibold tabular-nums">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
            <span className="w-14 text-right tabular-nums text-secondary">
              {d.value}
            </span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
export function ComparisonChart({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div
      className="chart-container h-[330px]"
      role="img"
      aria-label="Сравнение освоения тем по двум выбранным учебникам"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={rows.map((r) => ({
            ...r,
            label: r.topic.length > 25 ? r.topic.slice(0, 23) + "…" : r.topic,
          }))}
          margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
          barGap={3}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#e5eeff"
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#565e74" }}
          />
          <YAxis
            dataKey="label"
            type="category"
            width={132}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#0b1c30" }}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8f9ff" }} />
          <ReferenceLine x={75} stroke="#4f46e5" strokeDasharray="4 4" />
          <Bar
            dataKey="a"
            name="Учебник A (%)"
            fill="#3525cd"
            radius={[0, 5, 5, 0]}
            maxBarSize={10}
          />
          <Bar
            dataKey="b"
            name="Учебник B (%)"
            fill="#bec6e0"
            radius={[0, 5, 5, 0]}
            maxBarSize={10}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AllocationChart({ rows }: { rows: Allocation[] }) {
  return (
    <div
      className="chart-container h-[225px]"
      role="img"
      aria-label="Учебные часы до и после перераспределения"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows.map((r) => ({ ...r, label: r.name.split(" ")[0] }))}
          margin={{ left: -25, right: 0, top: 10, bottom: 0 }}
          barGap={4}
        >
          <CartesianGrid vertical={false} stroke="#e5eeff" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#565e74" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#565e74" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8f9ff" }} />
          <Bar
            dataKey="baseline"
            name="Текущие часы"
            fill="#bec6e0"
            radius={[4, 4, 0, 0]}
            maxBarSize={23}
          />
          <Bar
            dataKey="hours"
            name="Рекомендованные часы"
            fill="#4f46e5"
            radius={[4, 4, 0, 0]}
            maxBarSize={23}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
