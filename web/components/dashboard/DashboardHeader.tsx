"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  CalendarDays,
  UserRound,
  Settings,
  LogOut,
  Package,
  ShoppingCart,
  AlertTriangle,
  LoaderCircle,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  sku?: string;
  quantity: number;
  price?: number;
};

type Sale = {
  id: number;
  product_id: number;
  quantity: number;
  total_amount: number;
  created_at?: string;
};

type SearchResult = {
  id: number;
  title: string;
  subtitle: string;
  type: "product" | "sale";
};

export default function DashboardHeader() {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const [notificationLoaded, setNotificationLoaded] = useState(false);

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Close open menus when clicking outside the header.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
        setShowProfile(false);
        setShowSearch(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Search real products and sales.
  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    setShowSearch(true);
    setSearchLoading(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const encodedQuery = encodeURIComponent(query);

      const [productsResult, salesResult] = await Promise.allSettled([
        apiRequest<Product[]>(`/products/?search=${encodedQuery}&limit=100`),
        apiRequest<Sale[]>("/sales/"),
      ]);

      const results: SearchResult[] = [];

      if (productsResult.status === "fulfilled") {
        const matchingProducts = productsResult.value.filter((product) =>
          `${product.name} ${product.sku ?? ""} ${product.id}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );

        matchingProducts.slice(0, 5).forEach((product) => {
          results.push({
            id: product.id,
            title: product.name,
            subtitle: `SKU: ${product.sku ?? "N/A"} · Stock: ${product.quantity}`,
            type: "product",
          });
        });
      }

      if (salesResult.status === "fulfilled") {
        const matchingSales = salesResult.value.filter((sale) =>
          [
            String(sale.id),
            String(sale.product_id),
            String(sale.quantity),
            String(sale.total_amount),
          ].some((value) => value.toLowerCase().includes(query.toLowerCase()))
        );

        matchingSales.slice(0, 5).forEach((sale) => {
          results.push({
            id: sale.id,
            title: `Sale #${sale.id}`,
            subtitle: `Product #${sale.product_id} · KES ${Number(
              sale.total_amount
            ).toLocaleString("en-KE")}`,
            type: "sale",
          });
        });
      }

      if (
        productsResult.status === "rejected" &&
        salesResult.status === "rejected"
      ) {
        throw new Error("Could not search products or sales. Check your API connection.");
      }

      setSearchResults(results);

      if (
        productsResult.status === "rejected" ||
        salesResult.status === "rejected"
      ) {
        setSearchError("Some search results could not be loaded.");
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Search failed."
      );
    } finally {
      setSearchLoading(false);
    }
  }

  // Load real low-stock products and recent sales when notifications open.
  async function loadNotifications() {
    setNotificationLoading(true);
    setNotificationError("");

    try {
      const [products, sales] = await Promise.all([
        apiRequest<Product[]>("/products/low-stock?threshold=10"),
        apiRequest<Sale[]>("/sales/"),
      ]);

      setLowStockProducts(products);
      setRecentSales(sales.slice(0, 3));
      setNotificationLoaded(true);
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Could not load notifications."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  function toggleNotifications() {
    const nextState = !showNotifications;

    setShowNotifications(nextState);
    setShowProfile(false);
    setShowSearch(false);

    if (nextState && !notificationLoaded) {
      void loadNotifications();
    }
  }

  function openSearchResult(result: SearchResult) {
    setShowSearch(false);

    if (result.type === "product") {
      router.push(`/products/${result.id}`);
    } else {
      router.push("/sales");
    }
  }

  const notificationCount = lowStockProducts.length;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl"
    >
      <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="min-w-0">
          <p className="hidden text-xs text-slate-400 sm:block">
            Workspace / Overview
          </p>
          <h2 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900">
            Business dashboard
          </h2>
        </div>

        {/* Search and actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* API-connected search */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-teal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/10 md:flex"
          >
            <Search size={17} className="shrink-0 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setShowSearch(false);
              }}
              onFocus={() => {
                if (search.trim()) setShowSearch(true);
              }}
              placeholder="Search products or sales..."
              aria-label="Search products or sales"
              className="w-32 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 lg:w-48"
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setSearchResults([]);
                  setShowSearch(false);
                  setSearchError("");
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="submit"
              aria-label="Submit search"
              className="text-teal-700 hover:text-teal-900"
            >
              <Search size={15} />
            </button>
          </form>

          {/* Search results */}
          {showSearch && (
            <div className="absolute right-28 top-[68px] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:right-48">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  Search results
                </p>
                <button
                  type="button"
                  onClick={() => setShowSearch(false)}
                  aria-label="Close search results"
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              {searchLoading ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                  <LoaderCircle size={17} className="animate-spin" />
                  Searching your records...
                </div>
              ) : searchError && searchResults.length === 0 ? (
                <p className="px-4 py-5 text-sm text-red-600">
                  {searchError}
                </p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-5 text-sm text-slate-500">
                  No matching products or sales found.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto py-1">
                  {searchResults.map((result, index) => (
                    <button
                      type="button"
                      key={`${result.type}-${result.id}-${index}`}
                      onClick={() => openSearchResult(result)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 rounded-lg bg-teal-50 p-2 text-teal-700">
                        {result.type === "product" ? (
                          <Package size={16} />
                        ) : (
                          <ShoppingCart size={16} />
                        )}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {result.title}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {result.subtitle}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchError && searchResults.length > 0 && (
                <p className="border-t border-slate-100 px-4 py-2 text-xs text-amber-700">
                  {searchError}
                </p>
              )}
            </div>
          )}

          {/* Date */}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 xl:flex">
            <CalendarDays size={16} className="text-teal-700" />
            <span className="text-xs font-medium text-slate-600">
              {today}
            </span>
          </div>

          {/* API-connected notifications */}
          <div className="relative">
            <button
              type="button"
              aria-label="Toggle notifications"
              aria-expanded={showNotifications}
              onClick={toggleNotifications}
              className={`relative rounded-xl border p-2.5 transition ${
                showNotifications
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Bell size={19} />

              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[9px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">
                    Notifications
                  </h3>

                  <button
                    type="button"
                    aria-label="Refresh notifications"
                    disabled={notificationLoading}
                    onClick={() => void loadNotifications()}
                    className="text-xs font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {notificationLoading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                    <LoaderCircle size={17} className="animate-spin" />
                    Loading alerts...
                  </div>
                ) : notificationError ? (
                  <div className="p-4">
                    <p className="text-sm text-red-600">
                      {notificationError}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadNotifications()}
                      className="mt-3 text-sm font-medium text-teal-700 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {lowStockProducts.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          router.push("/products");
                        }}
                        className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-amber-50/50"
                      >
                        <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
                          <AlertTriangle size={17} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">
                            Low-stock alert
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {lowStockProducts.length} product
                            {lowStockProducts.length === 1 ? "" : "s"} have 10
                            or fewer units in stock.
                          </span>
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                        <span className="rounded-lg bg-teal-50 p-2 text-teal-700">
                          <Package size={17} />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-slate-800">
                            Stock levels
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            No low-stock products found at the current threshold.
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Recent sales
                      </p>

                      {recentSales.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No sales recorded yet.
                        </p>
                      ) : (
                        recentSales.map((sale) => (
                          <button
                            type="button"
                            key={sale.id}
                            onClick={() => {
                              setShowNotifications(false);
                              router.push("/sales");
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                          >
                            <span>
                              <span className="block text-sm font-medium text-slate-700">
                                Sale #{sale.id}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                Product #{sale.product_id}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-slate-800">
                              KES{" "}
                              {Number(sale.total_amount).toLocaleString(
                                "en-KE"
                              )}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile menu */}
          <div className="relative">
            <button
              type="button"
              aria-label="Toggle profile menu"
              aria-expanded={showProfile}
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
                setShowSearch(false);
              }}
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 sm:gap-3 sm:pl-2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-800 ring-1 ring-teal-100">
                PA
              </span>

              <span className="hidden text-left lg:block">
                <span className="block text-sm font-semibold text-slate-800">
                  Phanvex Admin
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Administrator
                </span>
              </span>

              <ChevronDown
                size={16}
                className={`hidden text-slate-400 transition sm:block ${
                  showProfile ? "rotate-180" : ""
                }`}
              />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Phanvex Admin
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Administrator
                  </p>
                </div>
               <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  <UserRound size={16} />
                  Account profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  <Settings size={16} />
                  Preferences
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    router.push("/login");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}