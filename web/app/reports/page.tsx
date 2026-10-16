
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { apiRequest } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  category?: string;
};

type Sale = {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
};

type SalesSummary = {
  total_sales: number;
  units_sold: number;
  total_revenue: number;
};

type ProductListResponse = {
  items?: Product[];
  products?: Product[];
};

type SaleListResponse = {
  items?: Sale[];
  sales?: Sale[];
};

type SalesSummaryResponse = Partial<SalesSummary>;

type Period = "7" | "30" | "90" | "all";

const money = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(value || 0);

const number = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value || 0);

const getSaleDate = (sale: Sale) => new Date(sale.created_at);

function normalizeProducts(
  response: Product[] | ProductListResponse,
): Product[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.items ?? response.products ?? [];
}

function normalizeSales(
  response: Sale[] | SaleListResponse,
): Sale[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.items ?? response.sales ?? [];
}

function normalizeSummary(
  response: SalesSummaryResponse,
): SalesSummary {
  return {
    total_sales: Number(response.total_sales ?? 0),
    units_sold: Number(response.units_sold ?? 0),
    total_revenue: Number(response.total_revenue ?? 0),
  };
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [summary, setSummary] = useState<SalesSummary>({
    total_sales: 0,
    units_sold: 0,
    total_revenue: 0,
  });

  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [productsResponse, salesResponse, summaryResponse] =
        await Promise.all([
          apiRequest<Product[] | ProductListResponse>(
            "/products/?limit=100",
          ),
          apiRequest<Sale[] | SaleListResponse>("/sales/"),
          apiRequest<SalesSummaryResponse>("/sales/summary"),
        ]);

      setProducts(normalizeProducts(productsResponse));
      setSales(normalizeSales(salesResponse));
      setSummary(normalizeSummary(summaryResponse));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reports. Check your backend connection.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const [productsResponse, salesResponse, summaryResponse] =
          await Promise.all([
            apiRequest<Product[] | ProductListResponse>(
              "/products/?limit=100",
            ),
            apiRequest<Sale[] | SaleListResponse>("/sales/"),
            apiRequest<SalesSummaryResponse>("/sales/summary"),
          ]);

        if (cancelled) return;

        setProducts(normalizeProducts(productsResponse));
        setSales(normalizeSales(salesResponse));
        setSummary(normalizeSummary(summaryResponse));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load reports. Check your backend connection.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const cutoff = (() => {
    if (period === "all") return null;

    const date = new Date();
    date.setDate(date.getDate() - Number(period));

    return date;
  })();

  const filteredSales = sales.filter((sale) => {
    const date = getSaleDate(sale);

    return (
      !Number.isNaN(date.getTime()) &&
      (!cutoff || date >= cutoff) &&
      date <= new Date()
    );
  });

  const filteredRevenue = filteredSales.reduce(
    (total, sale) => total + Number(sale.total_amount || 0),
    0,
  );

  const filteredUnits = filteredSales.reduce(
    (total, sale) => total + Number(sale.quantity || 0),
    0,
  );

  const averageSale = filteredSales.length
    ? filteredRevenue / filteredSales.length
    : 0;

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Math.max(0, Number(product.quantity || 0)) *
        Math.max(0, Number(product.price || 0)),
    0,
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.quantity) > 0 &&
      Number(product.quantity) <= 5,
  );

  const outOfStockProducts = products.filter(
    (product) => Number(product.quantity) <= 0,
  );

  const productPerformance = products
    .map((product) => {
      const productSales = filteredSales.filter(
        (sale) => sale.product_id === product.id,
      );

      return {
        ...product,
        unitsSold: productSales.reduce(
          (total, sale) => total + Number(sale.quantity || 0),
          0,
        ),
        revenue: productSales.reduce(
          (total, sale) => total + Number(sale.total_amount || 0),
          0,
        ),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const bestSellers = [...productPerformance]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .filter((product) => product.unitsSold > 0)
    .slice(0, 5);

  const paymentBreakdown = filteredSales.reduce<
    { method: string; count: number; revenue: number }[]
  >((groups, sale) => {
    const method = sale.payment_method || "Unspecified";
    const existing = groups.find((group) => group.method === method);

    if (existing) {
      existing.count += 1;
      existing.revenue += Number(sale.total_amount || 0);
    } else {
      groups.push({
        method,
        count: 1,
        revenue: Number(sale.total_amount || 0),
      });
    }

    return groups;
  }, []);

  const dailyRevenue = (() => {
    const days = period === "90" ? 30 : 7;
    const result: { label: string; revenue: number; date: string }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dateKey = date.toLocaleDateString("en-CA");

      const revenue = filteredSales
        .filter(
          (sale) =>
            getSaleDate(sale).toLocaleDateString("en-CA") === dateKey,
        )
        .reduce(
          (total, sale) => total + Number(sale.total_amount || 0),
          0,
        );

      result.push({
        label: date.toLocaleDateString("en-KE", {
          day: "numeric",
          month: "short",
        }),
        revenue,
        date: dateKey,
      });
    }

    return result;
  })();

  const maxDailyRevenue = Math.max(
    1,
    ...dailyRevenue.map((day) => day.revenue),
  );

  const exportSales = () => {
    downloadCsv("phanvex-sales-report.csv", [
      [
        "Sale ID",
        "Date",
        "Product",
        "SKU",
        "Quantity",
        "Unit Price (KES)",
        "Total (KES)",
        "Payment Method",
      ],
      ...filteredSales.map((sale) => {
        const product = products.find(
          (item) => item.id === sale.product_id,
        );

        return [
          sale.id,
          getSaleDate(sale).toLocaleString(),
          product?.name ?? `Product #${sale.product_id}`,
          product?.sku ?? "",
          sale.quantity,
          sale.unit_price,
          sale.total_amount,
          sale.payment_method,
        ];
      }),
    ]);
  };

  const exportInventory = () => {
    downloadCsv("phanvex-inventory-report.csv", [
      [
        "Product ID",
        "Product",
        "SKU",
        "Category",
        "Quantity",
        "Unit Price (KES)",
        "Stock Value (KES)",
        "Stock Status",
      ],
      ...products.map((product) => [
        product.id,
        product.name,
        product.sku ?? "",
        product.category ?? "",
        product.quantity,
        product.price,
        product.quantity * product.price,
        product.quantity <= 0
          ? "Out of stock"
          : product.quantity <= 5
            ? "Low stock"
            : "In stock",
      ]),
    ]);
  };

  const exportSummary = () => {
    downloadCsv("phanvex-business-summary.csv", [
      ["Metric", "Value"],
      [
        "Report period",
        period === "all"
          ? "All available records"
          : `Last ${period} days`,
      ],
      ["Transactions in selected period", filteredSales.length],
      ["Revenue in selected period (KES)", filteredRevenue],
      ["Units sold in selected period", filteredUnits],
      ["Average transaction value (KES)", averageSale],
      ["Current inventory value (KES)", inventoryValue],
      ["Products tracked", products.length],
      ["Low-stock products (5 units or fewer)", lowStockProducts.length],
      ["Out-of-stock products", outOfStockProducts.length],
      [],
      ["Payment Method", "Transactions", "Revenue (KES)"],
      ...paymentBreakdown.map((group) => [
        group.method,
        group.count,
        group.revenue,
      ]),
    ]);
  };

  const selectedPeriodLabel =
    period === "all"
      ? "All available records"
      : `Last ${period} days`;

  return (
    <div className="min-h-screen bg-[#f3f6f8] text-slate-900 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <section
          className="relative overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(105deg, rgba(7,25,43,0.96), rgba(9,51,64,0.82)), url('/images/jacques-dillies-jcav1COVvOc-unsplash.jpg')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#07192b]/30 to-transparent" />

          <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:py-16">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
                <span className="h-2 w-2 rounded-full bg-teal-300" />
                Business intelligence
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Reports &{" "}
                <span className="text-teal-300">Analytics</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Understand sales performance, monitor inventory health, and
                make informed decisions with your business data.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={exportSummary}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-[#07192b] transition hover:bg-teal-300"
                >
                  <Download size={17} />
                  Export Summary
                </button>

                <button
                  onClick={() => void loadReports(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw
                    size={17}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  Refresh Reports
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-64">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-300/15 text-teal-200">
                  <Wallet size={19} />
                </div>
                <p className="text-xs font-medium text-slate-300">
                  Period revenue
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {loading ? "—" : money(filteredRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-300/15 text-blue-200">
                  <ShoppingCart size={19} />
                </div>
                <p className="text-xs font-medium text-slate-300">
                  Transactions
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {loading ? "—" : number(filteredSales.length)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8 lg:py-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Business overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Based on {selectedPeriodLabel.toLowerCase()} and current
                inventory.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="report-period"
                className="flex items-center gap-2 text-sm font-medium text-slate-600"
              >
                <CalendarDays size={17} />
                Report period
              </label>

              <div className="relative">
                <select
                  id="report-period"
                  value={period}
                  onChange={(event) =>
                    setPeriod(event.target.value as Period)
                  }
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="all">All available records</option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Reports could not be fully loaded
                </p>
                <p className="mt-1">{error}</p>
                <button
                  onClick={() => void loadReports(true)}
                  className="mt-2 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Revenue in period"
              value={loading ? "—" : money(filteredRevenue)}
              detail={`${number(filteredSales.length)} transactions`}
              icon={<Wallet size={20} />}
              iconClass="bg-teal-50 text-teal-700"
            />

            <SummaryCard
              title="Units sold"
              value={loading ? "—" : number(filteredUnits)}
              detail="Across recorded sales"
              icon={<ShoppingCart size={20} />}
              iconClass="bg-blue-50 text-blue-700"
            />

            <SummaryCard
              title="Average sale"
              value={loading ? "—" : money(averageSale)}
              detail="Revenue per transaction"
              icon={<TrendingUp size={20} />}
              iconClass="bg-violet-50 text-violet-700"
            />

            <SummaryCard
              title="Current inventory value"
              value={loading ? "—" : money(inventoryValue)}
              detail={`${number(products.length)} products tracked`}
              icon={<Package size={20} />}
              iconClass="bg-amber-50 text-amber-700"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Daily revenue
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Revenue recorded each day in the selected period.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
                  <Activity size={15} />
                  {money(filteredRevenue)}
                </div>
              </div>

              <div className="mt-7 flex h-56 items-end gap-2 sm:gap-3">
                {dailyRevenue.map((day) => {
                  const height =
                    day.revenue === 0
                      ? 3
                      : Math.max(
                          8,
                          (day.revenue / maxDailyRevenue) * 100,
                        );

                  return (
                    <div
                      key={day.date}
                      className="flex h-full min-w-0 flex-1 flex-col justify-end"
                    >
                      <div className="mb-2 text-center text-[10px] font-semibold text-slate-500 sm:text-xs">
                        {day.revenue > 0 ? money(day.revenue) : ""}
                      </div>

                      <div className="flex h-36 items-end justify-center">
                        <div
                          title={`${day.label}: ${money(day.revenue)}`}
                          className={`w-full max-w-12 rounded-t-lg transition-all ${
                            day.revenue > 0
                              ? "bg-gradient-to-t from-[#087e83] to-teal-400 hover:from-[#06676b]"
                              : "bg-slate-100"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>

                      <p className="mt-3 truncate text-center text-[10px] text-slate-500 sm:text-xs">
                        {day.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                This chart displays the most recent 7 days, or 30 days when
                the 90-day filter is selected. The headline totals use the
                full selected period.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Inventory health
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Current stock availability.
                  </p>
                </div>

                <Package size={20} className="text-teal-700" />
              </div>

              <div className="mt-6 space-y-5">
                <StockBar
                  label="In stock"
                  count={
                    products.filter((product) => product.quantity > 5).length
                  }
                  total={products.length}
                  color="bg-teal-500"
                />

                <StockBar
                  label="Low stock"
                  count={lowStockProducts.length}
                  total={products.length}
                  color="bg-amber-400"
                />

                <StockBar
                  label="Out of stock"
                  count={outOfStockProducts.length}
                  total={products.length}
                  color="bg-red-400"
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs font-medium text-amber-800">
                    Low stock
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">
                    {number(lowStockProducts.length)}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    1–5 units remaining
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs font-medium text-red-800">
                    Out of stock
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-900">
                    {number(outOfStockProducts.length)}
                  </p>
                  <p className="mt-1 text-xs text-red-700">
                    Needs replenishment
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Best-selling products
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Ranked by units sold in the selected period.
                  </p>
                </div>

                <BarChart3 size={20} className="text-teal-700" />
              </div>

              {bestSellers.length === 0 ? (
                <EmptyState message="No sales found for this period." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {bestSellers.map((product, index) => {
                    const maxUnits = Math.max(
                      1,
                      ...bestSellers.map((item) => item.unitsSold),
                    );

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-4 sm:px-6"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {product.name}
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                              {number(product.unitsSold)} units
                            </p>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#087e83] to-teal-400"
                              style={{
                                width: `${(product.unitsSold / maxUnits) * 100}%`,
                              }}
                            />
                          </div>

                          <p className="mt-1.5 text-xs text-slate-500">
                            Revenue: {money(product.revenue)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Payment breakdown
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Transaction count and revenue by payment method.
                  </p>
                </div>

                <Wallet size={20} className="text-teal-700" />
              </div>

              {paymentBreakdown.length === 0 ? (
                <EmptyState message="No payment data available for this period." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {[...paymentBreakdown]
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((item) => (
                      <div
                        key={item.method}
                        className="flex items-center justify-between gap-4 p-5 sm:px-6"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Wallet size={18} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.method}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {number(item.count)} transactions
                            </p>
                          </div>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-slate-900">
                          {money(item.revenue)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h3 className="font-bold text-slate-900">
                  Product performance
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Sales generated by each product in the selected period.
                </p>
              </div>

              <button
                onClick={exportSales}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-800"
              >
                <FileSpreadsheet size={17} />
                Export sales CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">SKU</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Units sold
                    </th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {productPerformance.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No products available.
                      </td>
                    </tr>
                  ) : (
                    productPerformance
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((product) => (
                        <tr
                          key={product.id}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {product.category || "Uncategorised"}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {product.sku || "—"}
                          </td>

                          <td className="px-6 py-4 text-right font-medium text-slate-700">
                            {number(product.quantity)}
                          </td>

                          <td className="px-6 py-4 text-right font-semibold text-slate-800">
                            {number(product.unitsSold)}
                          </td>

                          <td className="px-6 py-4 text-right font-bold text-slate-900">
                            {money(product.revenue)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FileSpreadsheet size={21} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Download reports
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Export your current data into CSV files that open in Excel
                    or other spreadsheet applications.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportInventory}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
                >
                  <Download size={16} />
                  Inventory CSV
                </button>

                <button
                  onClick={exportSales}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
                >
                  <Download size={16} />
                  Sales CSV
                </button>

                <button
                  onClick={exportSummary}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#082b3a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#104655]"
                >
                  <Download size={16} />
                  Summary CSV
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
            <p>Phanvex Reports · Generated from available application data</p>

            <p className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-teal-600" />
              {loading ? "Loading data..." : "Report data loaded"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StockBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">
          {number(count)}{" "}
          <span className="font-normal text-slate-400">
            ({percentage.toFixed(0)}%)
          </span>
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <BarChart3 size={22} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {message}
      </p>
    </div>
  );
}
