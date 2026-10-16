"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface Sale {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  created_at?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
}

interface RecentSaleRow {
  sale: Sale;
  productName: string;
  sku: string;
}

function formatCurrency(amount: number) {
  return `KSh ${Number(amount || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatus(paymentMethod: string) {
  const method = paymentMethod.toLowerCase();

  if (method.includes("pending")) return "Pending";
  if (method.includes("cancel")) return "Cancelled";

  return "Recorded";
}

export default function RecentSales() {
  const [rows, setRows] = useState<RecentSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(() => {
    let active = true;

    async function fetchData() {
      try {
        const sales = await apiRequest<Sale[]>("/sales/");

        if (!Array.isArray(sales)) {
          throw new Error("The server returned an unexpected sales response.");
        }

        const products = await apiRequest<Product[]>("/products/?limit=100");

        if (!Array.isArray(products)) {
          throw new Error("The server returned an unexpected products response.");
        }

        const productMap = new Map(
          products.map((product) => [product.id, product])
        );

        const recentRows = sales.slice(0, 5).map((sale) => {
          const product = productMap.get(sale.product_id);

          return {
            sale,
            productName: product?.name ?? `Product #${sale.product_id}`,
            sku: product?.sku ?? "SKU unavailable",
          };
        });

        if (active) {
          setRows(recentRows);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load recent sales."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchData();

    return () => {
      active = false;
    };
  }, []);

  // Fetch when this component mounts; retry by remounting its data section.
  const [dataVersion, setDataVersion] = useState(0);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setReloadKey((value) => value + 1);
    setDataVersion((value) => value + 1);
  };

  const [loadedVersion, setLoadedVersion] = useState(-1);

  if (loadedVersion !== dataVersion) {
    setLoadedVersion(dataVersion);
    // Data fetching is initiated below by the keyed child.
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <ShoppingBag size={20} />
            </div>
            <h2 className="text-lg font-bold text-[#102a43]">
              Recent Sales
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            A summary of your latest transactions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#102a43] transition hover:bg-teal-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link
            href="/sales"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102a43] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#183d5d]"
          >
            View all sales
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <RecentSalesData
        key={reloadKey}
        loadData={loadData}
        rows={rows}
        setRows={setRows}
        loading={loading}
        setLoading={setLoading}
        error={error}
        setError={setError}
      />
    </section>
  );
}

interface RecentSalesDataProps {
  loadData: () => () => void;
  rows: RecentSaleRow[];
  setRows: (rows: RecentSaleRow[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

function RecentSalesData({
  loadData,
  rows,
  setRows,
  loading,
  setLoading,
  error,
  setError,
}: RecentSalesDataProps) {
  // Mount the request through a callback ref to avoid synchronous effect updates.
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      let active = true;

      async function fetchData() {
        try {
          setLoading(true);

          const sales = await apiRequest<Sale[]>("/sales/");
          const products = await apiRequest<Product[]>("/products/?limit=100");

          if (!Array.isArray(sales) || !Array.isArray(products)) {
            throw new Error("Unexpected data returned by the server.");
          }

          const productMap = new Map(
            products.map((product) => [product.id, product])
          );

          const recentRows = sales.slice(0, 5).map((sale) => {
            const product = productMap.get(sale.product_id);

            return {
              sale,
              productName: product?.name ?? `Product #${sale.product_id}`,
              sku: product?.sku ?? "SKU unavailable",
            };
          });

          if (active) {
            setRows(recentRows);
            setError(null);
          }
        } catch (err) {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load recent sales."
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      void fetchData();

      node.dataset.ready = "true";
      node.dataset.request = "sales";

      // Mark the node for cleanup when the callback ref is detached.
      (node as HTMLDivElement & { cancelRequest?: () => void }).cancelRequest =
        () => {
          active = false;
        };
    },
    [setError, setLoading, setRows]
  );

  return (
    <div ref={ref}>
      {loading ? (
        <div className="space-y-4 p-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex animate-pulse gap-4">
              <div className="h-4 w-24 rounded bg-slate-100" />
              <div className="h-4 flex-1 rounded bg-slate-100" />
              <div className="h-4 w-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="m-5 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Could not load recent sales
              </p>
              <p className="mt-1 break-words text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <ShoppingBag size={30} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-[#102a43]">
            No sales recorded yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Your latest transactions will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Sale ID</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(({ sale, productName, sku }) => {
                  const status = getStatus(sale.payment_method);

                  return (
                    <tr key={sale.id} className="transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm font-semibold text-teal-700">
                          #{sale.id}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {productName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Quantity: {sale.quantity}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {sku}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(sale.created_at)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[#102a43]">
                        {formatCurrency(sale.total_amount)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            status === "Recorded"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Showing {rows.length} most recent recorded sales.
            </p>
          </div>
        </>
      )}
    </div>
  );
}