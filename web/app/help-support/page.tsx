
"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Clock3,
  Mail,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  LifeBuoy,
} from "lucide-react";

const SUPPORT_EMAIL = "phanvexsupport@gmail.com";
const SUPPORT_PHONE = "0140502234";
const WHATSAPP_NUMBER = "254140502234";

const guides = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn your way around Phanvex.",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-700",
    steps: [
      {
        title: "Open the dashboard",
        content:
          "Use the dashboard to review the summary information available in your Phanvex installation.",
      },
      {
        title: "Manage products",
        content:
          "Open Products to view and manage the product records stored in your inventory.",
      },
      {
        title: "Record sales",
        content:
          "Open Sales, select a product, enter the quantity, choose a payment method, and submit the transaction.",
      },
      {
        title: "Review reports and settings",
        content:
          "Use Reports to review available business figures and Settings to manage supported business details and preferences.",
      },
    ],
  },
  {
    id: "inventory",
    title: "Products & Inventory",
    description: "Manage product records and stock quantities.",
    icon: Boxes,
    color: "bg-teal-50 text-teal-700",
    steps: [
      {
        title: "Review your products",
        content:
          "Open Products to inspect the product information and stock quantities recorded in Phanvex.",
      },
      {
        title: "Keep records accurate",
        content:
          "When adding or updating products, enter the correct details and quantities. Check the saved records after making changes.",
      },
      {
        title: "Monitor low stock",
        content:
          "Review the available low-stock information to identify products that may need replenishment. The low-stock threshold can be configured in Settings.",
      },
      {
        title: "Check quantities after sales",
        content:
          "Review the affected product after recording a sale. If the quantity looks incorrect, verify the product and transaction records.",
      },
    ],
  },
  {
    id: "sales",
    title: "Sales & Payments",
    description: "Record transactions and review sales activity.",
    icon: ShoppingCart,
    color: "bg-violet-50 text-violet-700",
    steps: [
      {
        title: "Record a sale",
        content:
          "Open Sales, choose a product, enter the quantity, select the payment method, and submit the transaction.",
      },
      {
        title: "Review transactions",
        content:
          "Use the sales list to review transactions recorded in Phanvex.",
      },
      {
        title: "Understand the sales summary",
        content:
          "The available sales summary includes total sales, units sold, and total revenue. These figures depend on the transactions stored in the system.",
      },
      {
        title: "Investigate unexpected figures",
        content:
          "Check the relevant transaction and product details. Do not assume a transaction was recorded unless it appears in the system.",
      },
    ],
  },
  {
    id: "reports",
    title: "Reports & Dashboard",
    description: "Understand the business figures available to you.",
    icon: ChartNoAxesCombined,
    color: "bg-amber-50 text-amber-700",
    steps: [
      {
        title: "Review the dashboard",
        content:
          "Use the dashboard to view the summary information provided by your installation.",
      },
      {
        title: "Open Reports",
        content:
          "Review the figures displayed on the Reports page and read the labels provided by the interface.",
      },
      {
        title: "Check the underlying records",
        content:
          "Sales totals and revenue depend on the data stored in the application. Verify that products and transactions have been recorded correctly.",
      },
      {
        title: "Resolve missing figures",
        content:
          "Check the relevant product and sales records. If figures remain inconsistent, contact Phanvex support with a description of the issue.",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings & Customization",
    description: "Manage business information and available preferences.",
    icon: Settings,
    color: "bg-slate-100 text-slate-700",
    steps: [
      {
        title: "Update business information",
        content:
          "Use Settings to maintain the business name, email address, phone number, and business address.",
      },
      {
        title: "Set the low-stock threshold",
        content:
          "Choose the stock quantity at which a product is considered low stock. The value must be zero or greater.",
      },
      {
        title: "Choose a default payment method",
        content:
          "Set the preferred default payment method and update the receipt footer where these options are available.",
      },
      {
        title: "Review notification preferences",
        content:
          "Settings includes email, low-stock, and sales notification preferences. Saving a preference does not guarantee that a notification delivery service is configured or active.",
      },
      {
        title: "Verify your changes",
        content:
          "Save the settings and reopen the page to confirm that the updated values were retained.",
      },
    ],
  },
];

const faqs = [
  {
    question: "Why is a product missing from my inventory?",
    answer:
      "Check whether the product was saved successfully and whether you are viewing the correct list. If it remains missing, contact support with the product name and the steps you took.",
  },
  {
    question: "Why do my sales figures look incorrect?",
    answer:
      "Review the recorded sales, selected products, and quantities. Summary figures depend on the records stored in the application.",
  },
  {
    question: "Can I change the low-stock threshold?",
    answer:
      "Yes. Open Settings, update the low-stock threshold, save your changes, and verify that the new value was retained.",
  },
  {
    question: "Do notification settings guarantee that notifications are sent?",
    answer:
      "No. Stored preferences do not necessarily mean that email or notification delivery is configured. Contact support if you need to confirm the functionality available in your installation.",
  },
  {
    question: "Can I print receipts or process refunds?",
    answer:
      "These features have not been confirmed as implemented in the current version covered by this guide. Treat them as unavailable unless they are present and working in your installation.",
  },
  {
    question: "Can I restore deleted records or backups?",
    answer:
      "Do not assume that deleted records can be recovered or that automated backups are enabled. Ask your system administrator about the backup and recovery arrangements for your installation.",
  },
  {
    question: "What information should I send to support?",
    answer:
      "Describe the page involved, what you expected, what happened, and the steps to reproduce the problem. Remove passwords and confidential customer information from any screenshots.",
  },
];

const privacyTips = [
  "Keep passwords and account credentials private.",
  "Give system access only to people who need it for their work.",
  "Never send passwords or confidential customer information through email or WhatsApp.",
  "Remove sensitive business and customer details from screenshots before sharing them.",
  "Ask your administrator about database access, backups, and record retention.",
];

export default function HelpSupportPage() {
  const [search, setSearch] = useState("");
  const [activeGuide, setActiveGuide] = useState<string | null>(
    "getting-started"
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredGuides = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return guides;

    return guides.filter((guide) =>
      [
        guide.title,
        guide.description,
        ...guide.steps.flatMap((step) => [step.title, step.content]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return faqs;

    return faqs.filter((faq) =>
      `${faq.question} ${faq.answer}`.toLowerCase().includes(query)
    );
  }, [search]);

  const filteredPrivacyTips = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return privacyTips;

    return privacyTips.filter((tip) => tip.toLowerCase().includes(query));
  }, [search]);

  function contactByEmail() {
    const subject = encodeURIComponent("Phanvex Support Request");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
  }

  function contactByWhatsApp() {
    const message = encodeURIComponent(
      "Hello Phanvex Support, I need help with the Phanvex application."
    );

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6f8] text-slate-800 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-5">
        <div className="mx-auto max-w-7xl space-y-7">
          {/* Sticky warehouse banner */}
          <section
            className="sticky top-0 z-20 -mx-4 -mt-20 mb-7 overflow-hidden rounded-b-3xl bg-[#102b46] bg-cover bg-center shadow-md sm:-mx-6 lg:static lg:mx-0 lg:my-0 lg:rounded-3xl lg:shadow-sm"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(8, 30, 49, 0.94) 0%, rgba(8, 30, 49, 0.80) 52%, rgba(8, 30, 49, 0.40) 100%), url('/images/jacques-dillies-jcav1COVvOc-unsplash.jpg')",
            }}
          >
            <div className="flex min-h-[250px] flex-col justify-center gap-6 p-6 sm:min-h-[290px] sm:p-9 lg:p-11">
              <div className="max-w-3xl">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
                  PHANVEX SUPPORT CENTRE
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Help & Support
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                  Find practical guidance for managing your inventory,
                  recording sales, understanding reports, and maintaining
                  your business settings.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2">
                    <Clock3 size={16} className="text-teal-300" />
                    Support available 24/7
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2">
                    <LifeBuoy size={16} className="text-teal-300" />
                    Business support
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Search and contact */}
          <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-[#102b46]">
                What do you need help with?
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Search the guides, common questions, and privacy tips below.
              </p>

              <label
                htmlFor="help-search"
                className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100"
              >
                <Search size={19} className="shrink-0 text-slate-400" />
                <input
                  id="help-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search inventory, sales, reports..."
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>

              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  Clear search
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-[#102b46]">
                Contact support
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Choose a contact method if you need further assistance.
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={contactByEmail}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#102b46] text-white">
                    <Mail size={19} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">
                      Email support
                    </span>
                    <span className="mt-1 block break-all text-xs text-slate-500">
                      {SUPPORT_EMAIL}
                    </span>
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                </button>

                <button
                  type="button"
                  onClick={contactByWhatsApp}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
                    <MessageCircle size={19} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">
                      WhatsApp support
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {SUPPORT_PHONE}
                    </span>
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Help guides */}
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#102b46]">
                  Help guides
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Instructions for the main areas of Phanvex.
                </p>
              </div>

              <span className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm">
                {filteredGuides.length} topics
              </span>
            </div>

            {filteredGuides.length > 0 ? (
              <div className="space-y-3">
                {filteredGuides.map((guide) => {
                  const Icon = guide.icon;
                  const isOpen = activeGuide === guide.id;

                  return (
                    <article
                      key={guide.id}
                      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveGuide(isOpen ? null : guide.id)
                        }
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50 sm:p-5"
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${guide.color}`}
                        >
                          <Icon size={21} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-[#102b46]">
                            {guide.title}
                          </span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {guide.description}
                          </span>
                        </span>

                        <ChevronDown
                          size={19}
                          className={`shrink-0 text-slate-400 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-100 px-5 py-5 sm:px-8">
                          <ol className="space-y-5">
                            {guide.steps.map((step, index) => (
                              <li
                                key={step.title}
                                className="flex gap-3 sm:gap-4"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-800">
                                  {index + 1}
                                </span>

                                <div>
                                  <h3 className="text-sm font-semibold text-slate-800">
                                    {step.title}
                                  </h3>
                                  <p className="mt-1 text-sm leading-6 text-slate-600">
                                    {step.content}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <Search className="mx-auto text-slate-400" size={28} />
                <p className="mt-3 font-semibold text-slate-700">
                  No matching guides found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try another search term.
                </p>
              </div>
            )}
          </section>

          {/* FAQs and privacy */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <CircleHelp size={21} />
                </span>

                <div>
                  <h2 className="font-bold text-[#102b46]">
                    Frequently asked questions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Answers to common questions.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredFaqs.map((faq) => {
                  const originalIndex = faqs.indexOf(faq);
                  const isOpen = openFaq === originalIndex;

                  return (
                    <div key={faq.question}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaq(isOpen ? null : originalIndex)
                        }
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 py-4 text-left"
                      >
                        <span className="flex-1 text-sm font-semibold leading-6 text-slate-700">
                          {faq.question}
                        </span>

                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-slate-400 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <p className="pb-4 text-sm leading-6 text-slate-600">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}

                {filteredFaqs.length === 0 && (
                  <p className="py-5 text-sm text-slate-500">
                    No matching questions found.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <ShieldCheck size={21} />
                </span>

                <div>
                  <h2 className="font-bold text-[#102b46]">
                    Privacy & data protection
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Protect your business information.
                  </p>
                </div>
              </div>

              <ul className="space-y-4">
                {filteredPrivacyTips.map((tip) => (
                  <li key={tip} className="flex gap-3">
                    <ShieldCheck
                      size={17}
                      className="mt-1 shrink-0 text-teal-700"
                    />
                    <span className="text-sm leading-6 text-slate-600">
                      {tip}
                    </span>
                  </li>
                ))}

                {filteredPrivacyTips.length === 0 && (
                  <li className="text-sm text-slate-500">
                    No matching privacy guidance found.
                  </li>
                )}
              </ul>

              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <div className="flex gap-3">
                  <Clock3
                    size={18}
                    className="mt-0.5 shrink-0 text-teal-700"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Support availability: 24/7
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      This reflects the stated support schedule. Actual
                      response times depend on the support team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final contact section */}
          <section className="rounded-2xl border border-teal-100 bg-teal-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                <LifeBuoy size={23} />
              </span>

              <div className="flex-1">
                <h2 className="font-bold text-[#102b46]">
                  Still need assistance?
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Explain the issue and the steps that led to it. Do not
                  include passwords or confidential customer information.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={contactByEmail}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102b46] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#183d5e] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <Mail size={17} />
                  Email support
                </button>

                <button
                  type="button"
                  onClick={contactByWhatsApp}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <MessageCircle size={17} />
                  WhatsApp
                </button>
              </div>
            </div>
          </section>

          <footer className="flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Phanvex Help & Support</p>
            <p className="flex items-center gap-2">
              <ArrowDownRight size={14} />
              Help content reflects features documented for this version.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
