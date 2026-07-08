"use client";

import Link from "next/link";
import { useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";

const dashboardLinks = [
  {
    title: "Site Settings",
    description: "Edit brand colors, hero copy, CTA text, footer text, SEO fields, logo URLs, and visibility toggles.",
    href: "/dashboard/settings",
  },
  {
    title: "Header & Footer",
    description: "Edit the front-left navbar brand text, header button, footer copy, contact info, socials, and tab metadata.",
    href: "/dashboard/header-footer",
  },
  {
    title: "Navigation & Tab Name",
    description: "Edit the navbar brand text, browser tab name, SEO description, and menu links.",
    href: "/dashboard/navigation",
  },
  {
    title: "Services & Variations",
    description: "Create services, prices, deposits, durations, and service variations for booking.",
    href: "/dashboard/service-manager",
  },
  {
    title: "Add-ons & Deposit Rules",
    description: "Create service add-ons, enable add-ons for specific services, and set automatic deposit rules by client/service/total.",
    href: "/dashboard/addons-deposits",
  },
  {
    title: "Policies",
    description: "Edit the public policies page, deposits, cancellations, no-show rules, and preparation notes.",
    href: "/dashboard/policies",
  },
  {
    title: "Bookings",
    description: "View bookings, reschedule appointments, cancel bookings, collect balances, and create projects.",
    href: "/dashboard/bookings",
  },
  {
    title: "Clients",
    description: "Manage client records, client portal links, contact information, and follow-up actions.",
    href: "/dashboard/clients",
  },
  {
    title: "Invoices",
    description: "Create invoice checkout links, track payments, and convert invoices into projects.",
    href: "/dashboard/invoices",
  },
  {
    title: "Contracts",
    description: "Create contracts, track signatures, and generate project records from signed contracts.",
    href: "/dashboard/contracts",
  },
  {
    title: "Projects",
    description: "Track production/project status and manage client-facing project portal information.",
    href: "/dashboard/projects",
  },
  {
    title: "Analytics",
    description: "Review production metrics, booking metrics, cron logs, system health, and dashboard activity.",
    href: "/dashboard/analytics",
  },
  {
    title: "Public Website",
    description: "Open the public homepage to check visible changes after saving dashboard edits.",
    href: "/",
  },
  {
    title: "Public Policies Page",
    description: "Open the public policies page to confirm policy dashboard changes are visible.",
    href: "/policies",
  },
  {
    title: "Client Portal",
    description: "Open the public client portal/project lookup page.",
    href: "/client/projects",
  },
];

const dashboardActions = [
  {
    key: "reminders",
    title: "Run Booking Reminders",
    description: "Checks upcoming bookings and reminder needs.",
    url: "/api/dashboard/run-reminders-cron",
    body: { days: 1 },
  },
  {
    key: "follow-ups",
    title: "Run Project Follow-Ups",
    description: "Scans stale active projects and queues project portal follow-ups.",
    url: "/api/dashboard/run-project-portal-follow-ups",
    body: { days: 3 },
  },
  {
    key: "health",
    title: "Run System Health Snapshot",
    description: "Creates a fresh system health snapshot for launch monitoring.",
    url: "/api/dashboard/run-system-health-snapshot",
    body: {},
  },
];

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

export default function DashboardPage() {
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function runDashboardAction(action: (typeof dashboardActions)[number]) {
    try {
      setActionLoading(action.key);
      setError("");
      setSuccess("");

      const data = await fetchJson(action.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });

      setSuccess(data.message ?? `${action.title} completed.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Dashboard action failed.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <AdminUnlockGate title="Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Launch Control</p>
                <h1 className="mt-3 text-4xl font-black md:text-5xl">Dashboard</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                  Use these buttons to manage every changeable site element: branding, header, footer, navbar, tab name, services, variations, add-ons, deposit rules, policies, bookings, clients, contracts, invoices, projects, and analytics.
                </p>
              </div>

              <Link href="/" className="rounded-full bg-white px-5 py-3 text-sm font-black text-black">
                View Public Site
              </Link>
            </div>
          </section>

          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          {success && <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">{success}</div>}

          <section className="grid gap-4 lg:grid-cols-3">
            {dashboardActions.map((action) => (
              <div key={action.key} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-black">{action.title}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{action.description}</p>
                <button
                  type="button"
                  onClick={() => runDashboardAction(action)}
                  disabled={actionLoading === action.key}
                  className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
                >
                  {actionLoading === action.key ? "Running..." : "Run Action"}
                </button>
              </div>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboardLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-white/30">
                <h2 className="text-xl font-black">{link.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{link.description}</p>
                <p className="mt-5 text-sm font-black text-white">Open →</p>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </AdminUnlockGate>
  );
}
