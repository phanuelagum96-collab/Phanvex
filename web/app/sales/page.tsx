
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Wallet,
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

type SaleForm = {
  product_id: string;
  quantity: string;
  payment_method: string;
  phone_number: string;
};

type MpesaInitiationResponse = {
  payment_id?: number;
  id?: number;
  status?: string;
  message?: string;
  detail?: string;
  CustomerMessage?: string;
  customer_message?: string;
};

type MpesaPaymentStatus = {
  payment_id: number;
  status: string;
  amount: number;
  sale_id: number | null;
  receipt_number: string | null;
  message: string | null;
};

const EMPTY_SUMMARY: SalesSummary = {
  total_sales: 0,
  units_sold: 0,
  total_revenue: 0,
};

const EMPTY_FORM: SaleForm = {
  product_id: "",
  quantity: "1",
  payment_method: "mpesa",
  phone_number: "",
};

const FINAL_PAYMENT_STATUSES = new Set([
  "success",
  "failed",
  "review",
]);

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    mpesa: "M-Pesa",
    card: "Card",
    bank_transfer: "Bank transfer",
  };

  return labels[method.toLowerCase()] ?? method.replaceAll("_", " ");
}

function normalizeKenyanPhone(value: string) {
  const phone = value.replace(/[\s()-]/g, "");

  if (/^0[17]\d{8}$/.test(phone)) {
    return `254${phone.slice(1)}`;
  }

  if (/^\+254[17]\d{8}$/.test(phone)) {
    return phone.slice(1);
  }

  if (/^254[17]\d{8}$/.test(phone)) {
    return phone;
  }

  if (/^[17]\d{8}$/.test(phone)) {
    return `254${phone}`;
  }

  return null;
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] =
    useState<SalesSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SaleForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) {
      setRefreshing(true);
    }

    try {
      const [productData, salesData, summaryData] = await Promise.all([
        apiRequest<Product[]>("/products/?limit=100"),
        apiRequest<Sale[]>("/sales/"),
        apiRequest<SalesSummary>("/sales/summary"),
      ]);

      setProducts(productData);
      setSales(salesData);
      setSummary(summaryData);
      setPageError("");
      setHasLoaded(true);
    } catch (error: unknown) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchInitialData() {
      try {
        const [productData, salesData, summaryData] = await Promise.all([
          apiRequest<Product[]>("/products/?limit=100", {
            signal: controller.signal,
          }),
          apiRequest<Sale[]>("/sales/", {
            signal: controller.signal,
          }),
          apiRequest<SalesSummary>("/sales/summary", {
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) return;

        setProducts(productData);
        setSales(salesData);
        setSummary(summaryData);
        setPageError("");
        setHasLoaded(true);
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchInitialData();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadData(false);
      }
    }, 15000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadData(false);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadData]);

  const filteredSales = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sales.filter((sale) => {
      const product = products.find(
        (item) => item.id === sale.product_id,
      );

      const productName =
        product?.name ?? `Product #${sale.product_id}`;

      const matchesSearch =
        !query ||
        productName.toLowerCase().includes(query) ||
        String(sale.id).includes(query) ||
        paymentLabel(sale.payment_method)
          .toLowerCase()
          .includes(query);

      const matchesPayment =
        paymentFilter === "all" ||
        sale.payment_method.toLowerCase() === paymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [sales, products, searchTerm, paymentFilter]);

  const lowStockCount = products.filter(
    (product) => product.quantity <= 5,
  ).length;

  const selectedProduct = products.find(
    (product) => String(product.id) === form.product_id,
  );

  const quantity = Number(form.quantity);
  const availableStock = selectedProduct?.quantity ?? 0;

  const estimatedTotal =
    selectedProduct && quantity > 0
      ? selectedProduct.price * quantity
      : 0;

  function openSaleForm() {
    setForm(EMPTY_FORM);
    setFormError("");
    setSuccessMessage("");
    setPageError("");
    setPaymentNotice("");
    setModalOpen(true);
  }

  async function pollPaymentStatus(paymentId: number) {
    const deadline = Date.now() + 120000;

    while (Date.now() < deadline) {
      await sleep(3000);

      const payment = await apiRequest<MpesaPaymentStatus>(
        `/mpesa/status/${paymentId}`,
      );

      const currentStatus = payment.status.toLowerCase();

      if (FINAL_PAYMENT_STATUSES.has(currentStatus)) {
        return payment;
      }

      setPaymentNotice(
        `Payment #${paymentId} is ${currentStatus}. Waiting for confirmation...`,
      );
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setPageError("");
    setSuccessMessage("");
    setPaymentNotice("");

    const productId = Number(form.product_id);
    const saleQuantity = Number(form.quantity);
    const paymentMethod = form.payment_method.toLowerCase();

    if (!Number.isInteger(productId) || productId <= 0) {
      setFormError("Please select a product.");
      return;
    }

    if (!Number.isInteger(saleQuantity) || saleQuantity <= 0) {
      setFormError(
        "Quantity must be a whole number greater than zero.",
      );
      return;
    }

    const product = products.find((item) => item.id === productId);

    if (!product) {
      setFormError(
        "The selected product could not be found. Refresh and try again.",
      );
      return;
    }

    if (saleQuantity > product.quantity) {
      setFormError(
        `Insufficient stock. Only ${product.quantity} unit(s) are available.`,
      );
      return;
    }

    let normalizedPhone: string | null = null;

    if (paymentMethod === "mpesa") {
      normalizedPhone = normalizeKenyanPhone(form.phone_number);

      if (!normalizedPhone) {
        setFormError(
          "Enter a valid Kenyan mobile number, such as 0712345678 or 254712345678.",
        );
        return;
      }
    }

    setSaving(true);

    try {
      if (paymentMethod !== "mpesa") {
        await apiRequest<Sale>("/sales/", {
          method: "POST",
          body: JSON.stringify({
            product_id: productId,
            quantity: saleQuantity,
            payment_method: paymentMethod,
          }),
        });

        setModalOpen(false);
        setForm(EMPTY_FORM);

        await loadData(false);

        setSuccessMessage(
          "Sale recorded successfully. Sales totals and product stock have been refreshed.",
        );

        return;
      }

      const initiation = await apiRequest<MpesaInitiationResponse>(
        "/mpesa/stk-push",
        {
          method: "POST",
          body: JSON.stringify({
            product_id: productId,
            quantity: saleQuantity,
            phone_number: normalizedPhone,
          }),
        },
      );

      const paymentId = initiation.payment_id ?? initiation.id;

      if (
        typeof paymentId !== "number" ||
        !Number.isInteger(paymentId) ||
        paymentId <= 0
      ) {
        throw new Error(
          "The backend did not return a valid payment ID. Check the payment status before trying again.",
        );
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);

      setPaymentNotice(
        initiation.CustomerMessage ||
          initiation.customer_message ||
          initiation.message ||
          `STK Push requested for ${normalizedPhone}. Complete the prompt on the customer's phone.`,
      );

      const payment = await pollPaymentStatus(paymentId);

      if (!payment) {
        setPaymentNotice(
          `Payment #${paymentId} has not reached a final status yet. Check its status before retrying to avoid duplicate payment requests.`,
        );
        return;
      }

      const status = payment.status.toLowerCase();

      if (status === "success") {
        await loadData(false);

        setPaymentNotice("");
        setSuccessMessage(
          `M-PESA payment confirmed. ${
            payment.sale_id ? `Sale #${payment.sale_id}. ` : ""
          }${
            payment.receipt_number
              ? `Receipt: ${payment.receipt_number}. `
              : ""
          }Stock and sales totals have been refreshed.`,
        );

        return;
      }

      if (status === "failed") {
        setPaymentNotice("");
        setPageError(
          payment.message ||
            "The M-PESA payment failed. No successful sale was confirmed.",
        );
        return;
      }

      setPaymentNotice("");
      setPageError(
        payment.message ||
          "The payment requires manual review. Verify its status before trying again.",
      );
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
                Sales management
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Sales <span className="text-teal-300">Management</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Record transactions, monitor revenue, track payment
                methods, and keep your business sales organised in
                one place.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openSaleForm}
                  className="rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-[#082533] shadow-lg shadow-teal-950/20 transition hover:bg-teal-300"
                >
                  + Record New Sale
                </button>

                <button
                  type="button"
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                  className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "↻ Refresh Sales"}
                </button>
              </div>

              <p className="mt-4 flex items-center gap-2 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-teal-300" />
                Automatic updates every 15 seconds
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-64">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-slate-300">Total revenue</p>
                <p className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">
                  {formatCurrency(summary.total_revenue)}
                </p>
                <p className="mt-1 text-xs text-teal-200">
                  Recorded sales
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-slate-300">Transactions</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {summary.total_sales}
                </p>
                <p className="mt-1 text-xs text-teal-200">
                  Completed sales
                </p>
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
                onClick={() => void loadData(true)}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {paymentNotice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <CreditCard size={19} className="mt-0.5 shrink-0" />
              <p>{paymentNotice}</p>
              <button
                type="button"
                aria-label="Dismiss payment notice"
                onClick={() => setPaymentNotice("")}
                className="ml-auto"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"
            >
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              <p>{successMessage}</p>
              <button
                type="button"
                aria-label="Dismiss success message"
                onClick={() => setSuccessMessage("")}
                className="ml-auto"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Revenue"
              value={formatCurrency(summary.total_revenue)}
              description="Revenue from recorded sales"
              icon={<Wallet size={22} />}
              loading={loading && !hasLoaded}
            />

            <SummaryCard
              title="Total Transactions"
              value={summary.total_sales.toLocaleString("en-KE")}
              description="Completed transactions"
              icon={<ShoppingCart size={22} />}
              loading={loading && !hasLoaded}
            />

            <SummaryCard
              title="Units Sold"
              value={summary.units_sold.toLocaleString("en-KE")}
              description="Total units sold"
              icon={<TrendingUp size={22} />}
              loading={loading && !hasLoaded}
            />

            <SummaryCard
              title="Products in Catalogue"
              value={products.length.toLocaleString("en-KE")}
              description={`${lowStockCount} product(s) at or below 5 units`}
              icon={<CheckCircle2 size={22} />}
              loading={loading && !hasLoaded}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-5 border-b border-slate-100 p-5 sm:p-6 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-bold text-[#102b40]">
                  Sales History
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredSales.length} of {sales.length} transaction(s)
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search sales..."
                    aria-label="Search sales"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50 sm:w-56"
                  />
                </div>

                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  aria-label="Filter by payment method"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600"
                >
                  <option value="all">All payment methods</option>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank transfer</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50/90 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Sale ID</th>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Quantity</th>
                    <th className="px-6 py-4 font-semibold">Unit Price</th>
                    <th className="px-6 py-4 font-semibold">Total Amount</th>
                    <th className="px-6 py-4 font-semibold">Payment</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading && !hasLoaded ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                        <LoaderCircle size={28} className="mx-auto animate-spin text-teal-700" />
                        <p className="mt-3">Loading sales...</p>
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                          <ShoppingCart size={23} />
                        </div>
                        <p className="font-semibold text-slate-800">
                          {searchTerm || paymentFilter !== "all"
                            ? "No matching sales"
                            : "No sales recorded yet"}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {searchTerm || paymentFilter !== "all"
                            ? "Try changing your search or payment filter."
                            : "Record your first sale to see it here."}
                        </p>
                        {!searchTerm && paymentFilter === "all" && (
                          <button
                            type="button"
                            onClick={openSaleForm}
                            className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                          >
                            Record your first sale
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => {
                      const product = products.find(
                        (item) => item.id === sale.product_id,
                      );

                      return (
                        <tr key={sale.id} className="transition hover:bg-teal-50/30">
                          <td className="px-6 py-5 font-bold text-[#102b40]">
                            #{sale.id}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-semibold text-slate-900">
                              {product?.name ?? `Product #${sale.product_id}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              SKU: {product?.sku ?? "—"}
                            </p>
                          </td>
                          <td className="px-6 py-5 font-medium text-slate-700">
                            {sale.quantity}
                          </td>
                          <td className="px-6 py-5 text-slate-700">
                            {formatCurrency(sale.unit_price)}
                          </td>
                          <td className="px-6 py-5 font-bold text-[#102b40]">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                              <CreditCard size={14} />
                              {paymentLabel(sale.payment_method)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 text-slate-500">
                            {formatDate(sale.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
              <span>Showing {filteredSales.length} transaction(s)</span>
              <span className="flex items-center gap-2">
                {refreshing ? (
                  <RefreshCw size={14} className="animate-spin text-teal-700" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                )}
                {refreshing ? "Updating sales data..." : "Automatic refresh enabled"}
              </span>
            </footer>
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#071827]/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-modal-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 id="sale-modal-title" className="text-xl font-bold text-[#102b40]">
                  Record a Sale
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Record a transaction and update inventory.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {formError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="sale-product" className="mb-2 block text-sm font-semibold text-slate-700">
                  Product
                </label>
                <select
                  id="sale-product"
                  required
                  value={form.product_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      product_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                      disabled={product.quantity <= 0}
                    >
                      {product.name} — {formatCurrency(product.price)} — Stock: {product.quantity}
                    </option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Add products to your catalogue before recording a sale.
                  </p>
                )}
              </div>

              {selectedProduct && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Available stock</span>
                    <span className={`font-bold ${availableStock > 0 ? "text-teal-700" : "text-red-600"}`}>
                      {availableStock} unit(s)
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Price per unit</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(selectedProduct.price)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="sale-quantity" className="mb-2 block text-sm font-semibold text-slate-700">
                  Quantity
                </label>
                <input
                  id="sale-quantity"
                  type="number"
                  min={1}
                  max={selectedProduct?.quantity ?? undefined}
                  step={1}
                  required
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
                />
              </div>

              <div>
                <label htmlFor="sale-payment" className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Method
                </label>
                <select
                  id="sale-payment"
                  required
                  value={form.payment_method}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      payment_method: event.target.value,
                      phone_number: "",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
                >
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank transfer</option>
                </select>
              </div>

              {form.payment_method === "mpesa" && (
                <div>
                  <label htmlFor="sale-phone" className="mb-2 block text-sm font-semibold text-slate-700">
                    Customer M-PESA Phone Number
                  </label>
                  <input
                    id="sale-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={form.phone_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone_number: event.target.value,
                      }))
                    }
                    placeholder="0712345678"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    The customer must approve the STK Push prompt on their phone.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-sm font-medium text-teal-800">Estimated total</p>
                <p className="mt-1 text-2xl font-bold text-[#102b40]">
                  {formatCurrency(estimatedTotal)}
                </p>
                <p className="mt-1 text-xs text-teal-800/80">
                  The backend determines the final sale amount.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.product_id ||
                    !Number.isInteger(quantity) ||
                    quantity <= 0 ||
                    quantity > availableStock
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c3444] px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {form.payment_method === "mpesa"
                        ? "Request M-PESA Payment"
                        : "Complete Sale"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  loading,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-3 break-words text-2xl font-bold tracking-tight text-[#102b40]">
              {value}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-xl bg-teal-50 p-3 text-teal-800">
          {icon}
        </span>
      </div>
    </div>
  );
}
