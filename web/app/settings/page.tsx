"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Building2,
  Package,
  ShoppingCart,
  Bell,
  Save,
  RotateCcw,
  Check,
  Palette,
  ShieldCheck,
  Info,
  ChevronRight,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useTheme, type ThemePreference } from "@/components/providers/ThemeProvider";

type Preferences = {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  lowStockThreshold: number;
  defaultPaymentMethod: string;
  receiptFooter: string;
  lowStockNotifications: boolean;
  outOfStockNotifications: boolean;
  saleNotifications: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  businessName: "My Business",
  email: "",
  phone: "",
  address: "",
  currency: "KES",
  lowStockThreshold: 5,
  defaultPaymentMethod: "Cash",
  receiptFooter: "Thank you for shopping with us!",
  lowStockNotifications: true,
  outOfStockNotifications: true,
  saleNotifications: false,
};

const STORAGE_KEY = "phanvex-settings";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const labelClass = "text-sm font-semibold text-slate-700 dark:text-slate-200";

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);

  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Preferences>;
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch {
      // Keep default preferences if saved data cannot be read.
    }

    setLoaded(true);
  }, []);

  function updatePreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setSaved(true);
    } catch {
      setSaved(false);
      window.alert("Settings could not be saved in this browser.");
      return;
    }

    window.setTimeout(() => setSaved(false), 3000);
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset your business, inventory, and sales preferences to their defaults?",
    );

    if (!confirmed) return;

    setPreferences(DEFAULT_PREFERENCES);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(DEFAULT_PREFERENCES),
      );
    } catch {
      // Defaults still apply for the current session.
    }

    setSaved(false);
  }

  return (
    <div className="min-h-screen bg-[#f3f6f8] text-slate-900 transition-colors dark:bg-[#071923] dark:text-slate-100 lg:flex">
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
                <Settings size={14} />
                System configuration
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Application <span className="text-teal-300">Settings</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Personalise Phanvex, configure your business preferences,
                and control how your inventory and sales workspace behaves.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md sm:min-w-64">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-300/15 text-teal-200">
                  {resolvedTheme === "dark" ? (
                    <Moon size={21} />
                  ) : (
                    <Sun size={21} />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-300">Current appearance</p>
                  <p className="mt-1 font-bold capitalize text-white">
                    {resolvedTheme} mode
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-300">
                Your theme preference is saved automatically in this browser.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8 lg:py-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Preferences
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Configure your workspace and business details.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={resetSettings}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RotateCcw size={16} />
                Reset defaults
              </button>

              <button
                onClick={saveSettings}
                disabled={!loaded}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-bold text-[#071923] transition hover:bg-teal-400 disabled:opacity-50"
              >
                {saved ? <Check size={17} /> : <Save size={17} />}
                {saved ? "Settings saved" : "Save settings"}
              </button>
            </div>
          </div>

          <SettingsSection
            icon={<Palette size={20} />}
            title="Appearance"
            description="Choose how Phanvex looks across your workspace."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <ThemeOption
                title="Light"
                description="A bright, clean interface."
                selected={theme === "light"}
                icon={<Sun size={22} />}
                onClick={() => setTheme("light")}
                preview="bg-white"
              />

              <ThemeOption
                title="Dark"
                description="A darker interface for low-light environments."
                selected={theme === "dark"}
                icon={<Moon size={22} />}
                onClick={() => setTheme("dark")}
                preview="bg-slate-900"
              />

              <ThemeOption
                title="System"
                description="Follow your computer's appearance setting."
                selected={theme === "system"}
                icon={<Monitor size={22} />}
                onClick={() => setTheme("system")}
                preview="bg-gradient-to-r from-white to-slate-800"
              />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-teal-50 p-4 dark:bg-teal-950/40">
              <Info
                size={18}
                className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-300"
              />
              <p className="text-sm leading-6 text-teal-900 dark:text-teal-100">
                Your selected theme takes effect immediately and remains saved
                when you refresh the application. Some pages may need additional
                dark-mode styling for every component to change appearance.
              </p>
            </div>
          </SettingsSection>

          <SettingsSection
            icon={<Building2 size={20} />}
            title="Business profile"
            description="Set the business details used in your workspace."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Business name">
                <input
                  className={inputClass}
                  value={preferences.businessName}
                  onChange={(event) =>
                    updatePreference("businessName", event.target.value)
                  }
                  placeholder="Enter your business name"
                />
              </Field>

              <Field label="Business email">
                <input
                  type="email"
                  className={inputClass}
                  value={preferences.email}
                  onChange={(event) =>
                    updatePreference("email", event.target.value)
                  }
                  placeholder="business@example.com"
                />
              </Field>

              <Field label="Phone number">
                <input
                  type="tel"
                  className={inputClass}
                  value={preferences.phone}
                  onChange={(event) =>
                    updatePreference("phone", event.target.value)
                  }
                  placeholder="Enter your contact number"
                />
              </Field>

              <Field label="Business address">
                <input
                  className={inputClass}
                  value={preferences.address}
                  onChange={(event) =>
                    updatePreference("address", event.target.value)
                  }
                  placeholder="Enter your business address"
                />
              </Field>

              <Field label="Display currency">
                <select
                  className={inputClass}
                  value={preferences.currency}
                  onChange={(event) =>
                    updatePreference("currency", event.target.value)
                  }
                >
                  <option value="KES">KES — Kenyan Shilling</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="UGX">UGX — Ugandan Shilling</option>
                  <option value="TZS">TZS — Tanzanian Shilling</option>
                </select>
              </Field>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              These profile details are currently stored locally in this browser.
              They do not update a server-side business profile.
            </p>
          </SettingsSection>

          <SettingsSection
            icon={<Package size={20} />}
            title="Inventory preferences"
            description="Choose when Phanvex should flag products with low stock."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Low-stock threshold">
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  className={inputClass}
                  value={preferences.lowStockThreshold}
                  onChange={(event) =>
                    updatePreference(
                      "lowStockThreshold",
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                />
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Products at or below this quantity should be considered low
                  stock. Applying this threshold to the actual Products page
                  requires connecting that page to this preference.
                </p>
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection
            icon={<ShoppingCart size={20} />}
            title="Sales preferences"
            description="Set your preferred payment method and receipt footer."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Default payment method">
                <select
                  className={inputClass}
                  value={preferences.defaultPaymentMethod}
                  onChange={(event) =>
                    updatePreference("defaultPaymentMethod", event.target.value)
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </Field>

              <Field label="Receipt footer">
                <input
                  className={inputClass}
                  value={preferences.receiptFooter}
                  onChange={(event) =>
                    updatePreference("receiptFooter", event.target.value)
                  }
                  placeholder="Thank you for shopping with us!"
                />
              </Field>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              These are saved preferences only. The Sales page and any receipt
              generator must be connected to them before they affect transactions.
            </p>
          </SettingsSection>

          <SettingsSection
            icon={<Bell size={20} />}
            title="Notification preferences"
            description="Choose which alerts you would like the application to prepare for."
          >
            <div className="space-y-1">
              <ToggleRow
                title="Low-stock reminders"
                description="Preference for alerts when products reach the configured threshold."
                checked={preferences.lowStockNotifications}
                onChange={(checked) =>
                  updatePreference("lowStockNotifications", checked)
                }
              />

              <ToggleRow
                title="Out-of-stock reminders"
                description="Preference for alerts when product quantities reach zero."
                checked={preferences.outOfStockNotifications}
                onChange={(checked) =>
                  updatePreference("outOfStockNotifications", checked)
                }
              />

              <ToggleRow
                title="Sales notifications"
                description="Preference for notifications when a sale is recorded."
                checked={preferences.saleNotifications}
                onChange={(checked) =>
                  updatePreference("saleNotifications", checked)
                }
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
              These switches save your choices but do not send notifications yet.
              Notification delivery requires additional application logic.
            </p>
          </SettingsSection>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ShieldCheck size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Data and privacy
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Appearance and preference settings are saved in your current
                  browser. They are not account-synchronised and may not follow
                  you to another device or browser.
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Browser preferences
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Stored using local browser storage
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center">
            <p>Phanvex Settings</p>
            <p>Theme: {theme} · Active appearance: {resolvedTheme}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function ThemeOption({
  title,
  description,
  selected,
  icon,
  onClick,
  preview,
}: {
  title: string;
  description: string;
  selected: boolean;
  icon: ReactNode;
  onClick: () => void;
  preview: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/30 dark:ring-teal-400/20"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      }`}
    >
      <div className={`mb-4 flex h-20 items-center justify-center overflow-hidden rounded-xl ${preview}`}>
        <div className="w-3/4 space-y-2 rounded-lg border border-slate-300/40 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-800/90">
          <div className="h-2 w-1/2 rounded bg-teal-500" />
          <div className="h-1.5 w-full rounded bg-slate-300/70 dark:bg-slate-600" />
          <div className="h-1.5 w-2/3 rounded bg-slate-300/70 dark:bg-slate-600" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-teal-700 dark:text-teal-300">{icon}</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {title}
          </span>
        </div>
        {selected && <Check size={18} className="text-teal-600 dark:text-teal-300" />}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-2 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}