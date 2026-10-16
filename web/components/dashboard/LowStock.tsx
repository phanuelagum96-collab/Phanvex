"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Package,
  RefreshCw,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  sku: string;
  quantity: number;
}

interface LowStockContentProps {
  reloadKey: number;
}

function LowStockContent({ reloadKey }: LowStockContentProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data loading is triggered by the parent remounting this component.
  // The request callback updates state after the server responds.
  const loadProducts = useCallback(() => {
    let active = true;

    apiRequest<Product[]>("/products/low-stock?threshold=10")
      .then((products) => {
        if (!Array.isArray(products)) {
          throw new Error("Unexpected products response from the server.");
        }
        if (active) {
          setItems(products);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load low-stock products."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Use a callback ref so the request begins when the component mounts.
  const cleanupRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        const cleanup = loadProducts();
        node.dataset.reloadKey = String(reloadKey);
        node.dataset.cleanup = "active";
        // Keep cleanup available for unmount.
        (node as HTMLDivElement & { cleanup?: () => void }).cleanup = cleanup;
      }
    },
    [loadProducts, reloadKey]
  );

  return (
    <div ref={cleanupRef}>
      {loading ? (
        <div className="space-y-5" aria-label="Loading low-stock products">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-slate-100" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                </div>
                <div className="h-4 w-14 rounded bg-slate-100" />
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Could not load low-stock products
              </p>
              <p className="mt-1 break-words text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <Package size={30} className="mx-auto text-teal-700" />
          <p className="mt-3 text-sm font-semibold text-[#102a43]">
            All stocked up
          </p>
          <p className="mt-1 text-sm text-slate-500">
            No products have 10 or fewer units remaining.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const quantity = Math.max(0, Number(item.quantity) || 0);
            const minimum = 10;
            const percentage = Math.min(
              100,
              Math.round((quantity / minimum) * 100)
            );
            const critical = quantity <= minimum / 2;

            return (
              <div key={item.id}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Package size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        critical ? "text-red-600" : "text-amber-700"
                      }`}
                    >
                      {quantity} left
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Alert at 10
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      critical ? "bg-red-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-label={`${item.name} stock level`}
                    aria-valuenow={quantity}
                    aria-valuemin={0}
                    aria-valuemax={minimum}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LowStock() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[#102a43]">
              Low Stock Alerts
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Products that need restocking.
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <AlertTriangle size={21} />
        </div>
      </div>

      <div className="mt-6">
        <LowStockContent key={reloadKey} reloadKey={reloadKey} />
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#102a43] transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
        <Link
          href="/products"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#102a43] px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          View products
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}