"use client";

import {
  useCallback,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CheckCircle2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { apiRequest } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  category?: string | null;
};

type Movement = {
  id: number;
  product_id: number;
  movement_type: "stock_in" | "stock_out";
  quantity: number;
  reason: string;
  created_at: string;
};

type MovementForm = {
  product_id: string;
  movement_type: "stock_in" | "stock_out";
  quantity: string;
  reason: string;
};

type MovementFilter = "all" | "stock_in" | "stock_out";

const initialForm: MovementForm = {
  product_id: "",
  movement_type: "stock_in",
  quantity: "1",
  reason: "",
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function StockMovementsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MovementFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MovementForm>(initialForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [productData, movementData] = await Promise.all([
        apiRequest<Product[]>("/products/?limit=100"),
        apiRequest<Movement[]>("/stock-movements/"),
      ]);

      setProducts(productData);
      setMovements(movementData);
    } catch (error: unknown) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  const productMap = new Map(
    products.map((product) => [product.id, product])
  );

  const stockInCount = movements.filter(
    (movement) => movement.movement_type === "stock_in"
  ).length;

  const stockOutCount = movements.filter(
    (movement) => movement.movement_type === "stock_out"
  ).length;

  const filteredMovements = movements.filter((movement) => {
    const product = productMap.get(movement.product_id);

    const searchableText = [
      product?.name ?? "",
      product?.sku ?? "",
      movement.reason,
      String(movement.product_id),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" || movement.movement_type === filter;

    return matchesSearch && matchesFilter;
  });

  function openModal() {
    setForm({
      ...initialForm,
      product_id: products[0] ? String(products[0].id) : "",
    });
    setFormError("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const productId = Number(form.product_id);
    const quantity = Number(form.quantity);
    const reason = form.reason.trim();

    if (!Number.isInteger(productId) || productId <= 0) {
      setFormError("Please select a product.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFormError("Quantity must be a positive whole number.");
      return;
    }

    if (!reason || reason.length > 200) {
      setFormError("Enter a reason between 1 and 200 characters.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest<Movement>("/stock-movements/", {
        method: "POST",
        body: JSON.stringify({
          product_id: productId,
          movement_type: form.movement_type,
          quantity,
          reason,
        }),
      });

      setModalOpen(false);
      setForm(initialForm);
      setSuccessMessage("Stock movement recorded successfully.");

      await loadData();
    } catch (error: unknown) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f8] text-slate-900 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div
          className="relative isolate overflow-hidden bg-[#092d3a] bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(105deg, rgba(7,25,43,0.96), rgba(9,51,64,0.82)), url('/images/jacques-dillies-jcav1COVvOc-unsplash.jpg')",
          }}
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#07192b]/40 to-transparent" />

          <header className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 text-white sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-12">
            <div>
              <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-teal-200 uppercase">
                Inventory management
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Stock Movements
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                Track stock received and issued, review transaction history,
                and maintain a clear record of inventory changes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  loadData().catch((error: unknown) => {
                    setPageError(getErrorMessage(error));
                  });
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
                {loading
                  ? "Loading..."
                  : hasLoaded
                    ? "Refresh Data"
                    : "Load Data"}
              </button>

              <button
                type="button"
                onClick={openModal}
                disabled={!hasLoaded || products.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={18} />
                Record Movement
              </button>
            </div>
          </header>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {pageError && (
            <div
              role="alert"
              className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <p>{pageError}</p>

              <button
                type="button"
                onClick={() => {
                  loadData().catch((error: unknown) => {
                    setPageError(getErrorMessage(error));
                  });
                }}
                className="font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-6 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"
            >
              <CheckCircle2 size={18} />
              {successMessage}
            </div>
          )}

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Movements"
              value={movements.length}
              icon={<ArrowLeftRight size={21} />}
              description="All recorded transactions"
            />

            <StatCard
              title="Stock Received"
              value={stockInCount}
              icon={<ArrowDownToLine size={21} />}
              description="Stock-in transactions"
            />

            <StatCard
              title="Stock Issued"
              value={stockOutCount}
              icon={<ArrowUpFromLine size={21} />}
              description="Stock-out transactions"
            />

            <StatCard
              title="Products Tracked"
              value={products.length}
              icon={<CheckCircle2 size={21} />}
              description="Products in your inventory"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Movement History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Search and review inventory transactions.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search movements..."
                    aria-label="Search movements"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:w-64"
                  />
                </div>

                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as MovementFilter)
                  }
                  aria-label="Filter movement type"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="all">All movements</option>
                  <option value="stock_in">Stock in</option>
                  <option value="stock_out">Stock out</option>
                </select>
              </div>
            </div>

            {!hasLoaded && !loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 rounded-2xl bg-teal-50 p-4 text-teal-800">
                  <ArrowLeftRight size={28} />
                </div>

                <h3 className="font-semibold text-slate-800">
                  Load your stock movements
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Select Load Data to retrieve your products and movement
                  history.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    loadData().catch((error: unknown) => {
                      setPageError(getErrorMessage(error));
                    });
                  }}
                  disabled={loading}
                  className="mt-4 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60"
                >
                  Load Data
                </button>
              </div>
            ) : loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
                <LoaderCircle
                  size={21}
                  className="animate-spin text-teal-700"
                />
                Loading stock movements...
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
                  <ArrowLeftRight size={28} />
                </div>

                <h3 className="font-semibold text-slate-800">
                  No movements found
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  {movements.length === 0
                    ? "Record a stock-in or stock-out transaction to begin tracking inventory changes."
                    : "Try changing your search or filter."}
                </p>

                {products.length > 0 && movements.length === 0 && (
                  <button
                    type="button"
                    onClick={openModal}
                    className="mt-4 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900"
                  >
                    Record your first movement
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Product</th>
                      <th className="px-6 py-4 font-semibold">Type</th>
                      <th className="px-6 py-4 font-semibold">Quantity</th>
                      <th className="px-6 py-4 font-semibold">Reason</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredMovements.map((movement) => {
                      const product = productMap.get(movement.product_id);
                      const isStockIn =
                        movement.movement_type === "stock_in";

                      return (
                        <tr
                          key={movement.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">
                              {product?.name ??
                                `Product #${movement.product_id}`}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {product?.sku ?? "SKU unavailable"}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                isStockIn
                                  ? "bg-teal-50 text-teal-800"
                                  : "bg-orange-50 text-orange-800"
                              }`}
                            >
                              {isStockIn ? (
                                <ArrowDownToLine size={14} />
                              ) : (
                                <ArrowUpFromLine size={14} />
                              )}

                              {isStockIn ? "Stock In" : "Stock Out"}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-semibold">
                            <span
                              className={
                                isStockIn
                                  ? "text-teal-700"
                                  : "text-orange-700"
                              }
                            >
                              {isStockIn ? "+" : "-"}
                              {movement.quantity}
                            </span>
                          </td>

                          <td className="max-w-xs px-6 py-4 text-slate-600">
                            {movement.reason}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {formatDate(movement.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {hasLoaded && !loading && filteredMovements.length > 0 && (
              <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
                Showing {filteredMovements.length} of {movements.length}{" "}
                movements
              </div>
            )}
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="movement-modal-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2
                  id="movement-modal-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Record Stock Movement
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update inventory and record the reason.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {products.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Add a product before recording stock movements.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="movement-type"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Movement type
                  </label>

                  <select
                    id="movement-type"
                    value={form.movement_type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        movement_type: event.target.value as
                          | "stock_in"
                          | "stock_out",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="stock_in">
                      Stock In — receive stock
                    </option>
                    <option value="stock_out">
                      Stock Out — issue stock
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="movement-product"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Product
                  </label>

                  <select
                    id="movement-product"
                    required
                    value={form.product_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        product_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">Select a product</option>

                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} — {product.sku} (Stock:{" "}
                        {product.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="movement-quantity"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Quantity
                  </label>

                  <input
                    id="movement-quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.quantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="movement-reason"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Reason
                  </label>

                  <textarea
                    id="movement-reason"
                    rows={3}
                    maxLength={200}
                    required
                    value={form.reason}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    placeholder={
                      form.movement_type === "stock_in"
                        ? "e.g. New supplier delivery"
                        : "e.g. Customer order or damaged goods"
                    }
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {form.reason.length}/200
                  </p>
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {formError}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && (
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                    )}

                    {saving ? "Saving..." : "Save Movement"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <div className="rounded-xl bg-teal-50 p-2.5 text-teal-800">
          {icon}
        </div>
      </div>

      <p className="text-3xl font-bold tracking-tight text-slate-900">
        {value.toLocaleString()}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}