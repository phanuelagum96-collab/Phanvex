"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "@/lib/api";

type Period = "Weekly" | "Monthly" | "Yearly";

interface SalesChartPoint {
  label: string;
  sales: number;
}

interface SalesChartResponse {
  period: Period;
  data: SalesChartPoint[];
  total: number;
  average: number;
  average_label: string;
}

const PERIODS: Period[] = ["Weekly", "Monthly", "Yearly"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAxisCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `KSh ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `KSh ${(value / 1_000).toFixed(0)}K`;
  }
  return `KSh ${value}`;
}

export default function SalesOverview() {
  const [period, setPeriod] = useState<Period>("Weekly");
  const [chart, setChart] = useState<SalesChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSales() {
      try {
        const result = await apiRequest<SalesChartResponse>(
          `/dashboard/sales-chart?period=${period}`
        );

        if (
          !result ||
          !Array.isArray(result.data) ||
          typeof result.total !== "number" ||
          typeof result.average !== "number"
        ) {
          throw new Error("The server returned an unexpected sales chart response.");
        }

        if (!cancelled) {
          setChart(result);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setChart(null);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sales data. Please try again."
          );
          setLoading(false);
        }
      }
    }

    void loadSales();

    return () => {
      cancelled = true;
    };
  }, [period, refreshKey]);

  function refreshSales() {
    setLoading(true);
    setRefreshKey((value) => value + 1);
  }

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <BarChart3 size={21} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Sales Overview
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Track your recorded sales over time.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshSales}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              aria-pressed={period === item}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                period === item
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays size={16} />
          <span>
            {period === "Weekly"
              ? "Current week"
              : period === "Monthly"
                ? "Current month"
                : "Current year"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-sm font-medium text-slate-500">
            Total for selected period
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {loading && !chart
              ? "Loading..."
              : formatCurrency(chart?.total ?? 0)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp size={14} className="text-teal-600" />
            Recorded sales revenue
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-sm font-medium text-slate-500">
            {chart?.average_label ??
              (period === "Weekly"
                ? "Average per day"
                : period === "Monthly"
                  ? "Average per week"
                  : "Average per month")}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {loading && !chart
              ? "Loading..."
              : formatCurrency(chart?.average ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Average across the selected intervals
          </p>
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <div
            role="alert"
            className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 px-5 text-center"
          >
            <AlertCircle size={28} className="text-red-500" />
            <h3 className="mt-3 font-semibold text-red-800">
              Could not load sales data
            </h3>
            <p className="mt-1 max-w-md text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={refreshSales}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : loading && !chart ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin text-teal-600" />
              Loading sales data...
            </div>
          </div>
        ) : (
          <div className="h-[280px] w-full sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chart?.data ?? []}
                margin={{ top: 12, right: 12, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  minTickGap={12}
                />
                <YAxis
                  tickFormatter={formatAxisCurrency}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={82}
                  tickMargin={8}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "Sales",
                  ]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    padding: "10px 14px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#0f766e",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#0f766e",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {!error && chart && chart.total === 0 && !loading && (
        <p className="mt-3 text-center text-sm text-slate-500">
          No sales were recorded during this period.
        </p>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
        Figures are based on recorded sales in your database.
      </div>
    </section>
  );
}