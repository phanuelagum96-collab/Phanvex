
"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Boxes,
  AlertTriangle,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type DashboardSummary = {
  total_products: number;
  total_units_in_stock: number;
  low_stock_products: number;
  total_sales: number;
  total_revenue: number;
};

const statsConfig = [
  {
    key: "total_products",
    title: "Total Products",
    icon: Package,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    accent: "border-blue-100",
    description: "Products recorded",
  },
  {
    key: "total_units_in_stock",
    title: "Units in Stock",
    icon: Boxes,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-700",
    accent: "border-teal-100",
    description: "Units currently in inventory",
  },
  {
    key: "low_stock_products",
    title: "Low Stock Items",
    icon: AlertTriangle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    accent: "border-amber-100",
    description: "Items needing attention",
  },
  {
    key: "total_revenue",
    title: "Total Revenue",
    icon: CircleDollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    accent: "border-emerald-100",
    description: "Revenue from recorded sales",
  },
] as const;

export default function DashboardStats() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiRequest<DashboardSummary>(
          "/dashboard/summary"
        );

        if (active) {
          setSummary(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard statistics."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, []);

  function getValue(key: (typeof statsConfig)[number]["key"]) {
    if (!summary) return "—";

    if (key === "total_revenue") {
      return `KSh ${Number(summary.total_revenue).toLocaleString(
        "en-KE",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;
    }

    return Number(summary[key]).toLocaleString("en-KE");
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">
            Could not load dashboard statistics.
          </p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs">
            Check that the FastAPI backend is running and that its URL
            in your frontend environment settings is correct.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {statsConfig.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.key}
              className={`group rounded-2xl border ${stat.accent} bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <h2
                    className="mt-3 break-words text-2xl font-bold tracking-tight text-[#102a43] sm:text-3xl"
                    aria-live="polite"
                  >
                    {loading ? (
                      <span className="inline-block h-8 w-24 animate-pulse rounded bg-slate-100" />
                    ) : (
                      getValue(stat.key)
                    )}
                  </h2>
                </div>

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}
                >
                  <Icon size={24} strokeWidth={1.8} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                  <TrendingUp size={13} />
                  Live data
                </span>

                <span className="text-xs text-slate-500">
                  {stat.description}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
