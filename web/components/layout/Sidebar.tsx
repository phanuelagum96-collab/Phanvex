"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  BarChart3,
  Settings,
  HelpCircle,
  Boxes,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
  },
  {
    label: "Sales",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    label: "Stock Movements",
    href: "/stock-movements",
    icon: ArrowLeftRight,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
];

const secondaryNavigation = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Help & Support",
    href: "/help-support",
    icon: HelpCircle,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function closeMobileMenu() {
    setIsMobileOpen(false);
  }

  // Close the mobile menu when Escape is pressed.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        aria-label={
          isMobileOpen
            ? "Close navigation menu"
            : "Open navigation menu"
        }
        aria-expanded={isMobileOpen}
        aria-controls="phanvex-sidebar"
        className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#102a43] shadow-md transition hover:bg-slate-50 lg:hidden"
      >
        {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="phanvex-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[280px] shrink-0 flex-col overflow-y-auto bg-[#102a43] px-5 py-6 text-white shadow-2xl transition-transform duration-300 ease-in-out sm:px-6 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-[260px] lg:translate-x-0 lg:shadow-none ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="mb-10 flex items-center justify-between gap-3">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f9d91] shadow-lg shadow-black/10">
              <Boxes size={25} strokeWidth={2.2} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Phanvex
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Inventory management
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        {/* Main navigation */}
        <div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <nav
            aria-label="Workspace navigation"
            className="space-y-1.5"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all duration-200 ${
                    active
                      ? "bg-[#0f9d91] font-semibold text-white shadow-md shadow-black/10"
                      : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.3 : 1.8}
                    className={
                      active
                        ? "text-white"
                        : "text-slate-400 transition-colors group-hover:text-teal-300"
                    }
                  />

                  <span className="flex-1">{item.label}</span>

                  {active && (
                    <ChevronRight
                      size={16}
                      className="text-white/80"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Preferences */}
        <div className="mt-9">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Preferences
          </p>

          <nav
            aria-label="Preferences navigation"
            className="space-y-1.5"
          >
            {secondaryNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all duration-200 ${
                    active
                      ? "bg-[#0f9d91] font-semibold text-white"
                      : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <Icon
                    size={19}
                    className={
                      active
                        ? "text-white"
                        : "text-slate-400 group-hover:text-teal-300"
                    }
                  />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspace status */}
        <div className="mt-auto pt-10">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400" />

              <p className="text-xs font-semibold text-slate-200">
                Workspace status
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Your inventory workspace is ready for setup.
            </p>
          </div>

          {/* Administrator profile */}
          <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal-400/20 bg-teal-500/15 text-sm font-bold text-teal-300">
              PA
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Phanvex Admin
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}