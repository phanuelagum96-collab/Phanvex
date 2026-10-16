import Sidebar from "@/components/layout/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import SalesOverview from "@/components/dashboard/SalesOverview";
import RecentSales from "@/components/dashboard/RecentSales";
import LowStock from "@/components/dashboard/LowStock";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <DashboardHeader />

        <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Warehouse Banner */}
          <section
            className="relative isolate overflow-hidden rounded-2xl bg-slate-900 bg-cover bg-center shadow-lg"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(9, 25, 45, 0.96) 0%, rgba(9, 25, 45, 0.82) 48%, rgba(9, 25, 45, 0.35) 100%), url('/images/jacques-dillies-jcav1COVvOc-unsplash.jpg')",
            }}
          >
            {/* Teal accent */}
            <div className="absolute inset-y-0 left-0 w-1.5 bg-teal-500" />

            {/* Banner content */}
            <div className="relative flex min-h-[240px] flex-col justify-center px-6 py-8 sm:min-h-[280px] sm:px-10 lg:px-12">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-400" />

                <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">
                  Inventory Command Center
                </p>
              </div>

              <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Your business.
                <br />
                <span className="text-teal-400">Under control.</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                Monitor stock levels, track sales, and stay on top of your
                business performance from one central dashboard.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  Inventory Overview
                </span>

                <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-slate-200">
                  Phanvex Management
                </span>
              </div>
            </div>
          </section>

          {/* Business Overview */}
          <section>
            <p className="text-sm font-semibold text-teal-700">
              BUSINESS OVERVIEW
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Monitor your inventory, sales, and business performance.
            </p>
          </section>

          {/* Dashboard Statistics */}
          <section>
            <DashboardStats />
          </section>

          {/* Sales Overview and Low Stock */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <SalesOverview />
            </div>

            <div className="min-w-0">
              <LowStock />
            </div>
          </section>

          {/* Recent Sales */}
          <section>
            <RecentSales />
          </section>

          {/* Footer */}
          <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Phanvex. Inventory and sales
            management.
          </footer>
        </div>
      </main>
    </div>
  );
}