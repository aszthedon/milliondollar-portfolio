"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

interface AnalyticsSummary {
  bookings: number;
  clients: number;
  invoices: number;
  contracts: number;
  projects: number;
  paidRevenue: number;
  pendingRevenue: number;
  activeProjects: number;
  pendingBookings: number;
  signedContracts: number;
  generatedAt: string;
}

type Row = Record<string, any>;

function money(value: unknown) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

async function safeCount(table: string, siteSlug: string) {
  const { count, error } = await supabase
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("site_slug", siteSlug);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

async function safeRows(table: string, siteSlug: string, limit = 1000) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("site_slug", siteSlug)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    return [] as Row[];
  }

  return data ?? [];
}

export default function DashboardAnalyticsPage() {
  const siteSlug = getClientSiteSlug();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [latestBookings, setLatestBookings] = useState<Row[]>([]);
  const [latestProjects, setLatestProjects] = useState<Row[]>([]);
  const [latestBriefs, setLatestBriefs] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError("");

      const [
        bookingsCount,
        clientsCount,
        invoicesCount,
        contractsCount,
        projectsCount,
        bookingRows,
        invoiceRows,
        contractRows,
        projectRows,
        briefRows,
      ] = await Promise.all([
        safeCount("bookings", siteSlug),
        safeCount("crm_clients", siteSlug),
        safeCount("admin_invoices", siteSlug),
        safeCount("client_contracts", siteSlug),
        safeCount("media_projects", siteSlug),
        safeRows("bookings", siteSlug, 500),
        safeRows("admin_invoices", siteSlug, 500),
        safeRows("client_contracts", siteSlug, 500),
        safeRows("media_projects", siteSlug, 500),
        safeRows("production_daily_briefs", siteSlug, 10),
      ]);

      const paidRevenue = invoiceRows
        .filter((invoice) =>
          ["paid", "completed", "succeeded"].includes(
            String(invoice.payment_status || invoice.status || "").toLowerCase()
          )
        )
        .reduce(
          (sum, invoice) =>
            sum +
            Number(
              invoice.total_amount ||
                invoice.amount ||
                invoice.amount_paid ||
                0
            ),
          0
        );

      const pendingRevenue = invoiceRows
        .filter((invoice) =>
          ["pending", "sent", "overdue"].includes(
            String(invoice.payment_status || invoice.status || "").toLowerCase()
          )
        )
        .reduce(
          (sum, invoice) =>
            sum +
            Number(
              invoice.balance_due ||
                invoice.total_amount ||
                invoice.amount ||
                0
            ),
          0
        );

      const pendingBookings = bookingRows.filter((booking) =>
        ["pending", "hold"].includes(
          String(booking.status || booking.booking_status || "").toLowerCase()
        )
      ).length;

      const activeProjects = projectRows.filter((project) =>
        ["active", "in_progress", "review"].includes(
          String(project.project_status || project.status || "").toLowerCase()
        )
      ).length;

      const signedContracts = contractRows.filter((contract) =>
        ["signed", "completed"].includes(
          String(contract.contract_status || contract.status || "").toLowerCase()
        )
      ).length;

      setSummary({
        bookings: bookingsCount,
        clients: clientsCount,
        invoices: invoicesCount,
        contracts: contractsCount,
        projects: projectsCount,
        paidRevenue,
        pendingRevenue,
        activeProjects,
        pendingBookings,
        signedContracts,
        generatedAt: new Date().toISOString(),
      });

      setLatestBookings(bookingRows.slice(0, 5));
      setLatestProjects(projectRows.slice(0, 5));
      setLatestBriefs(briefRows.slice(0, 5));
    } catch (analyticsError) {
      setError(
        analyticsError instanceof Error
          ? analyticsError.message
          : "Analytics could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <AdminUnlockGate title="Analytics Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black">Analytics</h1>

              <p className="mt-2 text-sm text-zinc-400">
                Quick production overview for bookings, revenue, clients,
                contracts, projects, and daily briefs.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={loading}
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading && !summary ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
              Loading analytics...
            </div>
          ) : summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Bookings" value={summary.bookings} />
                <Metric label="Clients" value={summary.clients} />
                <Metric label="Invoices" value={summary.invoices} />
                <Metric label="Projects" value={summary.projects} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Paid Revenue" value={money(summary.paidRevenue)} />
                <Metric
                  label="Pending Revenue"
                  value={money(summary.pendingRevenue)}
                />
                <Metric
                  label="Pending Bookings"
                  value={summary.pendingBookings}
                />
                <Metric label="Active Projects" value={summary.activeProjects} />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <Panel title="Latest Bookings">
                  {latestBookings.length > 0 ? (
                    latestBookings.map((booking) => (
                      <SmallRecord
                        key={booking.id}
                        title={
                          booking.service_name ||
                          booking.service_title ||
                          `Booking #${booking.id}`
                        }
                        meta={[
                          booking.customer_email || booking.client_name,
                          booking.booking_date,
                          booking.status || booking.payment_status,
                        ]}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No bookings found.</p>
                  )}
                </Panel>

                <Panel title="Latest Projects">
                  {latestProjects.length > 0 ? (
                    latestProjects.map((project) => (
                      <SmallRecord
                        key={project.id}
                        title={
                          project.project_title ||
                          project.title ||
                          `Project #${project.id}`
                        }
                        meta={[
                          project.client_name || project.client_email,
                          project.project_status || project.status,
                          project.due_date,
                        ]}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No projects found.</p>
                  )}
                </Panel>

                <Panel title="Latest Daily Briefs">
                  {latestBriefs.length > 0 ? (
                    latestBriefs.map((brief) => (
                      <SmallRecord
                        key={brief.id}
                        title={brief.brief_title || `Brief #${brief.id}`}
                        meta={[
                          brief.brief_status,
                          brief.operations_status,
                          brief.created_at
                            ? new Date(brief.created_at).toLocaleString()
                            : "",
                        ]}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">
                      No daily briefs found.
                    </p>
                  )}
                </Panel>
              </div>

              <p className="text-xs text-zinc-600">
                Generated {new Date(summary.generatedAt).toLocaleString()}
              </p>
            </>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
              No analytics loaded.
            </div>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function Metric({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-black text-white">{title}</h2>

      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

function SmallRecord({
  title,
  meta,
}: {
  title: string;
  meta: unknown[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-4">
      <p className="font-bold text-white">{title}</p>

      <div className="mt-2 grid gap-1 text-xs text-zinc-500">
        {meta.filter(Boolean).map((item) => (
          <p key={String(item)}>{String(item)}</p>
        ))}
      </div>
    </div>
  );
}
