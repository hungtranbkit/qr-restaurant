"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { formatVnd } from "@/lib/format";

const CATEGORICAL = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">{formatVnd(payload[0].value)}</p>
    </div>
  );
}

function CountTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} đơn</p>
    </div>
  );
}

export function RevenueByHourChart({ data }: { data: { hour: number; revenue: number }[] }) {
  const chartData = data.map((d) => ({ hour: `${d.hour}h`, revenue: d.revenue }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={2} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={0} />
        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="revenue" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersByHourChart({ data }: { data: { hour: number; orders: number }[] }) {
  const chartData = data.map((d) => ({ hour: `${d.hour}h`, orders: d.orders }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={2} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={0} allowDecimals={false} />
        <Tooltip content={<CountTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="orders" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopItemsChart({ data }: { data: { name: string; quantity: number }[] }) {
  const chartData = [...data].reverse();
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                <p className="font-medium text-popover-foreground">{label}</p>
                <p className="text-muted-foreground">{payload[0].value as number} đã bán</p>
              </div>
            ) : null
          }
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="quantity" fill="var(--chart-1)" radius={[0, 3, 3, 0]} maxBarSize={16} label={{ position: "right", fontSize: 11, fill: "var(--muted-foreground)" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueByCategoryChart({ data }: { data: { category: string; revenue: number }[] }) {
  const chartData = [...data].sort((a, b) => b.revenue - a.revenue);
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="category"
          width={90}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]} maxBarSize={16}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
