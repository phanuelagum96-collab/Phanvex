"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  minimum: number;
};

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  price: string;
  quantity: string;
  minimum: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

const CATEGORIES = [
  "Other",
  "Electronics",
  "Clothing",
  "Food & Beverages",
  "Home & Office",
  "Health & Beauty",
  "Accessories",
];

const EMPTY_FORM: ProductForm = {
  name: "",
  sku: "",
  category: "Other",
  price: "",
  quantity: "0",
  minimum: "5",
};

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();

      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((item: { msg?: string }) => item.msg || "Invalid input")
          .join(", ");
      }
    } catch {
      // Retain the HTTP error message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  // Load saved products from the FastAPI backend.
  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      try {
        const data = await apiRequest<Product[]>(
          "/products/?limit=100",
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setProducts(data);
          setPageError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Unable to load products.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchProducts();

    return () => controller.abort();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      const lowStock = product.quantity <= product.minimum;

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && lowStock) ||
        (stockFilter === "healthy" && !lowStock) ||
        (stockFilter === "out" && product.quantity === 0);

      const matchesCategory =
        categoryFilter === "all" ||
        product.category === categoryFilter;

      return matchesSearch && matchesStock && matchesCategory;
    });
  }, [products, search, stockFilter, categoryFilter]);

  const lowStockCount = products.filter(
    (product) => product.quantity <= product.minimum,
  ).length;

  const inventoryValue = products.reduce(
    (total, product) => total + product.quantity * product.price,
    0,
  );

  async function refreshProducts() {
    setLoading(true);
    setPageError("");

    try {
      const data = await apiRequest<Product[]>("/products/?limit=100");
      setProducts(data);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load products.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPageError("");
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: String(product.price),
      quantity: String(product.quantity),
      minimum: String(product.minimum),
    });

    setPageError("");
    setShowForm(true);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPageError("");

    const price = Number(form.price);
    const quantity = Number(form.quantity);
    const minimum = Number(form.minimum);

    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !Number.isInteger(minimum) ||
      minimum < 0
    ) {
      setPageError(
        "Enter a product name and SKU, a positive price, and valid stock quantities.",
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      price,
      quantity,
      minimum,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await apiRequest<Product>(`/products/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<Product>("/products/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await refreshProducts();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;

    setPageError("");

    try {
      await apiRequest<void>(`/products/${product.id}`, {
        method: "DELETE",
      });

      await refreshProducts();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to delete product.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f8] text-slate-900 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        {/* Warehouse background and page header */}
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
                Inventory management
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Product <span className="text-teal-300">Catalogue</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Manage your products, monitor stock levels, track pricing,
                and keep your inventory organised in one place.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openAddForm}
                  className="rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-[#082533] shadow-lg shadow-teal-950/20 transition hover:bg-teal-300"
                >
                  + Add New Product
                </button>

                <button
                  type="button"
                  onClick={() => void refreshProducts()}
                  disabled={loading}
                  className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
                >
                  ↻ Refresh Inventory
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-64">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-slate-300">Total products</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {products.length}
                </p>
                <p className="mt-1 text-xs text-teal-200">Catalogue items</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-slate-300">Low stock</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {lowStockCount}
                </p>
                <p className="mt-1 text-xs text-amber-200">Needs attention</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8 lg:py-10">
          {pageError && (
            <div
              role="alert"
              className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center"
            >
              <span>{pageError}</span>

              <button
                type="button"
                onClick={() => void refreshProducts()}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Inventory summary cards */}
          <section className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Products
                  </p>
                  <p className="mt-3 text-3xl font-bold text-[#102b40]">
                    {products.length}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Products in your catalogue
                  </p>
                </div>

                <span className="rounded-xl bg-teal-50 p-3 text-xl text-teal-800">
                  ◈
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Low Stock Products
                  </p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {lowStockCount}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    At or below minimum stock
                  </p>
                </div>

                <span className="rounded-xl bg-amber-50 p-3 text-xl text-amber-700">
                  △
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Inventory Value
                  </p>
                  <p className="mt-3 text-2xl font-bold text-[#102b40]">
                    {formatCurrency(inventoryValue)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Stock quantity × selling price
                  </p>
                </div>

                <span className="rounded-xl bg-sky-50 p-3 text-xl text-sky-700">
                  ◉
                </span>
              </div>
            </div>
          </section>

          {/* Add and edit product form */}
          {showForm && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#102b40]">
                    {editingId === null ? "Add a Product" : "Edit Product"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the details for this inventory item.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                <label className="space-y-2 text-sm font-semibold">
                  Product name
                  <input
                    required
                    maxLength={150}
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g. Wireless Mouse"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  SKU
                  <input
                    required
                    maxLength={50}
                    value={form.sku}
                    onChange={(e) =>
                      setForm({ ...form, sku: e.target.value })
                    }
                    placeholder="e.g. WM-001"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  Category
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-teal-600"
                  >
                    {!CATEGORIES.includes(form.category) && (
                      <option value={form.category}>{form.category}</option>
                    )}

                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  Selling price (KSh)
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-600"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  Quantity in stock
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-600"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  Minimum stock level
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.minimum}
                    onChange={(e) =>
                      setForm({ ...form, minimum: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-600"
                  />
                </label>

                <div className="flex flex-wrap gap-3 pt-2 sm:col-span-2 lg:col-span-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#0c3444] px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId === null
                        ? "Save Product"
                        : "Update Product"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(EMPTY_FORM);
                    }}
                    className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Product catalogue and filters */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-5 border-b border-slate-100 p-5 sm:p-6 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-bold text-[#102b40]">
                  Product Catalogue
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search, filter, and manage your inventory.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:flex">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="⌕  Search products..."
                  aria-label="Search products"
                  className="min-w-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-600 xl:w-56"
                />

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  aria-label="Filter by stock level"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="all">All stock levels</option>
                  <option value="low">Low stock</option>
                  <option value="healthy">Healthy stock</option>
                  <option value="out">Out of stock</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="all">All categories</option>

                  {Array.from(
                    new Set(products.map((product) => product.category)),
                  ).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50/90 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Quantity</th>
                    <th className="px-6 py-4 font-semibold">Stock Status</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-16 text-center text-slate-500"
                      >
                        <span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700" />
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-800">
                          ◈
                        </div>

                        <p className="font-semibold text-slate-800">
                          {products.length === 0
                            ? "Your catalogue is empty"
                            : "No matching products"}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          {products.length === 0
                            ? "Add your first product to get started."
                            : "Try another search or adjust your filters."}
                        </p>

                        {products.length === 0 && (
                          <button
                            type="button"
                            onClick={openAddForm}
                            className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                          >
                            Add your first product
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const outOfStock = product.quantity === 0;
                      const lowStock =
                        product.quantity <= product.minimum;

                      return (
                        <tr
                          key={product.id}
                          className="transition hover:bg-teal-50/30"
                        >
                          <td className="px-6 py-5">
                            <p className="font-semibold text-slate-900">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              SKU: {product.sku}
                            </p>
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {product.category}
                          </td>

                          <td className="px-6 py-5 font-semibold text-slate-800">
                            {formatCurrency(product.price)}
                          </td>

                          <td className="px-6 py-5">
                            <span className="font-semibold">
                              {product.quantity}
                            </span>
                            <p className="mt-1 text-xs text-slate-400">
                              Minimum: {product.minimum}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                                outOfStock
                                  ? "bg-red-50 text-red-700"
                                  : lowStock
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-teal-50 text-teal-800"
                              }`}
                            >
                              {outOfStock
                                ? "Out of stock"
                                : lowStock
                                  ? "Low stock"
                                  : "Healthy"}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => openEditForm(product)}
                                className="font-semibold text-teal-800 hover:underline"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(product)}
                                className="font-semibold text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
              <span>
                Showing {filteredProducts.length} of {products.length} products
              </span>

              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                Connected to inventory API
              </span>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}