"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";

type DashboardData = {
  remindersSummary: Record<string, any> | null;
  projectPortalFollowUps: Record<string, any> | null;
  cronRunLogs: Record<string, any> | null;
  systemHealth: Record<string, any> | null;
  adminLoginAttempts: Record<string, any> | null;
};

const initialDashboardData: DashboardData = {
  remindersSummary: null,
  projectPortalFollowUps: null,
  cronRunLogs: null,
  systemHealth: null,
  adminLoginAttempts: null,
};

function buildHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);

  for (const [key, value] of Object.entries(getDashboardAuthHeaders())) {
    nextHeaders.set(key, value);
  }

  return nextHeaders;
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: buildHeaders(options?.headers),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? `${url} failed.`);
  }

  return data;
}

function getSettledValue(result: PromiseSettledResult<Record<string, any>>) {
  return result.status === "fulfilled" ? result.value : null;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialDashboardData);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError("");

      const [
        remindersSummary,
        projectPortalFollowUps,
        cronRunLogs,
        systemHealth,
        adminLoginAttempts,
      ] = await Promise.allSettled([
        fetchJson("/api/dashboard/reminders-summary?days=14"),
        fetchJson("/api/dashboard/project-portal-follow-ups?limit=10"),
        fetchJson("/api/dashboard/cron-run-logs?limit=5"),
        fetchJson("/api/dashboard/system-health-snapshots?limit=1"),
        fetchJson("/api/dashboard/admin-login-attempts?limit=5"),
      ]);

      setDashboardData({
        remindersSummary: getSettledValue(remindersSummary),
        projectPortalFollowUps: getSettledValue(projectPortalFollowUps),
        cronRunLogs: getSettledValue(cronRunLogs),
        systemHealth: getSettledValue(systemHealth),
        adminLoginAttempts: getSettledValue(adminLoginAttempts),
      });
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runDashboardAction({
    key,
    url,
    body = {},
  }: {
    key: string;
    url: string;
    body?: Record<string, unknown>;
  }) {
    try {
      setActionLoading(key);
      setError("");
      setSuccess("");

      const data = await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      setSuccess(data.message ?? "Dashboard action completed.");
      await fetchDashboardData();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Dashboard action failed."
      );
    } finally {
      setActionLoading("");
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const reminderSummary = dashboardData.remindersSummary?.summary ?? {};
  const followUpSummary = dashboardData.projectPortalFollowUps?.summary ?? {};
  const projectSummary =
    dashboardData.projectPortalFollowUps?.projects_summary ?? {};
  const cronSummary = dashboardData.cronRunLogs?.summary ?? {};
  const healthSnapshot =
    dashboardData.systemHealth?.snapshots?.[0] ??
    dashboardData.systemHealth?.snapshot ??
    null;

  const healthStatus =
    healthSnapshot?.health_status || healthSnapshot?.status || "unknown";

  return (
    <AdminUnlockGate title="Production Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Million Dollar Ticket Productions
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-5xl">
                  Dashboard
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                  Manage bookings, clients, invoices, contracts, projects,
                  reminders, follow-ups, cron logs, security, and system health.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchDashboardData}
                disabled={loading}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh Dashboard"}
              </button>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
              {success}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Upcoming Bookings"
              value={reminderSummary.upcoming_booking_count ?? 0}
              href="/dashboard/bookings"
            />

            <MetricCard
              label="Due Tomorrow"
              value={reminderSummary.due_tomorrow_count ?? 0}
              href="/dashboard/bookings"
            />

            <MetricCard
              label="Stale Projects"
              value={projectSummary.stale_project_count ?? 0}
              href="/dashboard/projects"
            />

            <MetricCard
              label="System Health"
              value={healthStatus}
              href="/dashboard/analytics"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ActionPanel
              title="Reminders"
              description="Run booking reminder checks and review upcoming reminder needs."
              loading={actionLoading === "reminders"}
              buttonLabel="Run Reminders"
              onClick={() =>
                runDashboardAction({
                  key: "reminders",
                  url: "/api/dashboard/run-reminders-cron",
                  body: {
                    days: 1,
                  },
                })
              }
            />

            <ActionPanel
              title="Project Follow-Ups"
              description="Scan stale active projects and queue project portal follow-ups."
              loading={actionLoading === "follow-ups"}
              buttonLabel="Run Follow-Ups"
              onClick={() =>
                runDashboardAction({
                  key: "follow-ups",
                  url: "/api/dashboard/run-project-portal-follow-ups",
                  body: {
                    days: 3,
                  },
                })
              }
            />

            <ActionPanel
              title="System Health"
              description="Create a fresh system health snapshot for launch monitoring."
              loading={actionLoading === "health"}
              buttonLabel="Run Health Snapshot"
              onClick={() =>
                runDashboardAction({
                  key: "health",
                  url: "/api/dashboard/run-system-health-snapshot",
                })
              }
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <QuickLinkCard
              title="Bookings"
              description="Reschedule, cancel, collect balances, and create projects."
              href="/dashboard/bookings"
            />

            <QuickLinkCard
              title="Clients"
              description="Manage client records, portal links, and follow-up actions."
              href="/dashboard/clients"
            />

            <QuickLinkCard
              title="Invoices"
              description="Create checkout links and convert invoices into projects."
              href="/dashboard/invoices"
            />

            <QuickLinkCard
              title="Contracts"
              description="Create contracts, track signatures, and generate projects."
              href="/dashboard/contracts"
            />

            <QuickLinkCard
              title="Projects"
              description="Track production status and client project portals."
              href="/dashboard/projects"
            />

            <QuickLinkCard
              title="Analytics"
              description="Review production metrics, cron logs, and health data."
              href="/dashboard/analytics"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <InfoPanel title="Reminder Summary">
              <InfoLine
                label="Today"
                value={reminderSummary.due_today_count ?? 0}
              />
              <InfoLine
                label="Tomorrow"
                value={reminderSummary.due_tomorrow_count ?? 0}
              />
              <InfoLine
                label="Missing Emails"
                value={reminderSummary.missing_email_count ?? 0}
              />
              <InfoLine
                label="Sent Last 30 Days"
                value={reminderSummary.reminders_sent_last_30_days ?? 0}
              />
            </InfoPanel>

            <InfoPanel title="Project Portal Follow-Ups">
              <InfoLine
                label="Loaded Follow-Ups"
                value={followUpSummary.loaded_count ?? 0}
              />
              <InfoLine
                label="Queued"
                value={followUpSummary.queued_loaded_count ?? 0}
              />
              <InfoLine
                label="Completed"
                value={followUpSummary.completed_loaded_count ?? 0}
              />
              <InfoLine
                label="Missing Emails"
                value={projectSummary.missing_project_email_count ?? 0}
              />
            </InfoPanel>

            <InfoPanel title="Cron + Security">
              <InfoLine
                label="Cron Logs Loaded"
                value={cronSummary.loaded_count ?? 0}
              />
              <InfoLine
                label="Cron Errors"
                value={cronSummary.error_loaded_count ?? 0}
              />
              <InfoLine
                label="Latest Cron Run"
                value={
                  cronSummary.latest_run_at
                    ? new Date(cronSummary.latest_run_at).toLocaleString()
                    : "None"
                }
              />
              <InfoLine
                label="Login Attempts"
                value={
                  dashboardData.adminLoginAttempts?.attempts?.length ??
                  dashboardData.adminLoginAttempts?.login_attempts?.length ??
                  0
                }
              />
            </InfoPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <RecordPanel title="Upcoming Bookings">
              {loading ? (
                <p className="text-sm text-zinc-500">Loading...</p>
              ) : dashboardData.remindersSummary?.upcoming_bookings?.length ? (
                dashboardData.remindersSummary.upcoming_bookings
                  .slice(0, 6)
                  .map((booking: Record<string, any>) => (
                    <SmallRecord
                      key={`booking-${booking.id}`}
                      title={booking.title || `Booking #${booking.id}`}
                      meta={[
                        booking.client_name,
                        booking.email,
                        `${booking.booking_date ?? ""} ${
                          booking.booking_time ?? ""
                        }`.trim(),
                      ]}
                    />
                  ))
              ) : (
                <p className="text-sm text-zinc-500">
                  No upcoming bookings found.
                </p>
              )}
            </RecordPanel>

            <RecordPanel title="Stale Projects">
              {loading ? (
                <p className="text-sm text-zinc-500">Loading...</p>
              ) : dashboardData.projectPortalFollowUps?.stale_projects?.length ? (
                dashboardData.projectPortalFollowUps.stale_projects
                  .slice(0, 6)
                  .map((project: Record<string, any>) => (
                    <SmallRecord
                      key={`project-${project.id}`}
                      title={
                        project.project_title ||
                        project.title ||
                        `Project #${project.id}`
                      }
                      meta={[
                        project.client_name || project.client_email,
                        project.project_status || project.status,
                        project.updated_at
                          ? new Date(project.updated_at).toLocaleString()
                          : "",
                      ]}
                    />
                  ))
              ) : (
                <p className="text-sm text-zinc-500">
                  No stale projects found.
                </p>
              )}
            </RecordPanel>
          </section>
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function MetricCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-white/30"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black capitalize text-white">
        {String(value).replaceAll("_", " ")}
      </p>
    </Link>
  );
}

function ActionPanel({
  title,
  description,
  buttonLabel,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-xl font-black">{title}</h2>

      <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
      >
        {loading ? "Running..." : buttonLabel}
      </button>
    </div>
  );
}

function QuickLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-white/30"
    >
      <h2 className="text-xl font-black">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>

      <p className="mt-5 text-sm font-black text-white">Open →</p>
    </Link>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-black">{title}</h2>

      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm">
      <span className="text-zinc-500">{label}</span>

      <span className="font-bold text-white">{value}</span>
    </div>
  );
}

function RecordPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-xl font-black">{title}</h2>

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