"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
  booking_date: string | null;
  customer_email: string | null;
  price_paid: number | null;
  original_price: number | null;
  discount_amount: number | null;
  tip_amount: number | null;
  deposit_amount: number | null;
  amount_due_now: number | null;
  remaining_balance: number | null;
  payment_mode: string | null;
  balance_status: string | null;
  service_id: number | null;
}

interface AdminInvoice {
  id: number;
  invoice_number: string | null;
  client_name: string | null;
  client_email: string | null;
  title: string | null;
  status: string | null;
  subtotal_amount: number | null;
  discount_amount: number | null;
  tip_amount: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  remaining_balance: number | null;
  created_at: string | null;
  paid_at: string | null;
}

interface ClientContract {
  id: number;
  contract_number: string | null;
  client_name: string | null;
  client_email: string | null;
  title: string | null;
  status: string | null;
  project_value: number | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  created_at: string | null;
}

interface MediaProject {
  id: number;
  project_number: string | null;
  client_name: string | null;
  client_email: string | null;
  project_title: string | null;
  project_type: string | null;
  status: string | null;
  priority: string | null;
  budget_amount: number | null;
  amount_paid: number | null;
  remaining_balance: number | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
}

function toNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: number | null | undefined) {
  return `$${toNumber(value).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function getMonthKey(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        {value}
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
    </div>
  );
}

export default function DashboardAnalyticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [projects, setProjects] = useState<MediaProject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError("");

      const [bookingsResult, invoicesResult, contractsResult, projectsResult] =
        await Promise.all([
          supabase
            .from("bookings")
            .select(
              `
                id,
                status,
                payment_status,
                created_at,
                booking_date,
                customer_email,
                price_paid,
                original_price,
                discount_amount,
                tip_amount,
                deposit_amount,
                amount_due_now,
                remaining_balance,
                payment_mode,
                balance_status,
                service_id
              `
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("admin_invoices")
            .select(
              `
                id,
                invoice_number,
                client_name,
                client_email,
                title,
                status,
                subtotal_amount,
                discount_amount,
                tip_amount,
                total_amount,
                amount_paid,
                remaining_balance,
                created_at,
                paid_at
              `
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("client_contracts")
            .select(
              `
                id,
                contract_number,
                client_name,
                client_email,
                title,
                status,
                project_value,
                sent_at,
                viewed_at,
                signed_at,
                created_at
              `
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("media_projects")
            .select(
              `
                id,
                project_number,
                client_name,
                client_email,
                project_title,
                project_type,
                status,
                priority,
                budget_amount,
                amount_paid,
                remaining_balance,
                start_date,
                due_date,
                created_at,
                updated_at
              `
            )
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (bookingsResult.error) {
        throw bookingsResult.error;
      }

      if (invoicesResult.error) {
        throw invoicesResult.error;
      }

      if (contractsResult.error) {
        throw contractsResult.error;
      }

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      setBookings((bookingsResult.data ?? []) as Booking[]);
      setInvoices((invoicesResult.data ?? []) as AdminInvoice[]);
      setContracts((contractsResult.data ?? []) as ClientContract[]);
      setProjects((projectsResult.data ?? []) as MediaProject[]);
    } catch (error) {
      console.error("ANALYTICS FETCH ERROR:", error);
      setError("Analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const paidBookings = useMemo(() => {
    return bookings.filter((booking) => booking.payment_status === "paid");
  }, [bookings]);

  const confirmedBookings = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "confirmed" ||
        booking.status === "approved" ||
        booking.status === "completed"
    );
  }, [bookings]);

  const paidInvoices = useMemo(() => {
    return invoices.filter((invoice) => invoice.status === "paid");
  }, [invoices]);

  const sentInvoices = useMemo(() => {
    return invoices.filter((invoice) => invoice.status === "sent");
  }, [invoices]);

  const signedContracts = useMemo(() => {
    return contracts.filter((contract) => contract.status === "signed");
  }, [contracts]);

  const sentContracts = useMemo(() => {
    return contracts.filter((contract) => contract.status === "sent");
  }, [contracts]);

  const viewedContracts = useMemo(() => {
    return contracts.filter((contract) => Boolean(contract.viewed_at));
  }, [contracts]);

  const activeProjects = useMemo(() => {
    return projects.filter((project) => {
      return (
        project.status === "planning" ||
        project.status === "scheduled" ||
        project.status === "in_progress" ||
        project.status === "review" ||
        project.status === "revision"
      );
    });
  }, [projects]);

  const completedProjects = useMemo(() => {
    return projects.filter(
      (project) => project.status === "delivered" || project.status === "completed"
    );
  }, [projects]);

  const highPriorityProjects = useMemo(() => {
    return projects.filter(
      (project) => project.priority === "high" || project.priority === "urgent"
    );
  }, [projects]);

  const metrics = useMemo(() => {
    const bookingRevenueCollected = paidBookings.reduce(
      (total, booking) => total + toNumber(booking.price_paid),
      0
    );

    const invoiceRevenueCollected = paidInvoices.reduce(
      (total, invoice) => total + toNumber(invoice.amount_paid),
      0
    );

    const projectRevenueCollected = projects.reduce(
      (total, project) => total + toNumber(project.amount_paid),
      0
    );

    const projectOutstanding = projects.reduce(
      (total, project) => total + toNumber(project.remaining_balance),
      0
    );

    const projectBudgetValue = projects.reduce(
      (total, project) => total + toNumber(project.budget_amount),
      0
    );

    const activeProjectValue = activeProjects.reduce(
      (total, project) => total + toNumber(project.budget_amount),
      0
    );

    const bookingTips = bookings.reduce(
      (total, booking) => total + toNumber(booking.tip_amount),
      0
    );

    const invoiceTips = invoices.reduce(
      (total, invoice) => total + toNumber(invoice.tip_amount),
      0
    );

    const bookingDiscounts = bookings.reduce(
      (total, booking) => total + toNumber(booking.discount_amount),
      0
    );

    const invoiceDiscounts = invoices.reduce(
      (total, invoice) => total + toNumber(invoice.discount_amount),
      0
    );

    const depositsCollected = bookings.reduce((total, booking) => {
      if (booking.payment_mode !== "deposit") {
        return total;
      }

      if (booking.payment_status !== "paid") {
        return total;
      }

      return total + toNumber(booking.deposit_amount || booking.amount_due_now);
    }, 0);

    const bookingOutstanding = bookings.reduce((total, booking) => {
      if (
        booking.balance_status === "balance_paid" ||
        booking.balance_status === "not_applicable" ||
        booking.balance_status === "cancelled"
      ) {
        return total;
      }

      return total + toNumber(booking.remaining_balance);
    }, 0);

    const invoiceOutstanding = invoices.reduce((total, invoice) => {
      if (invoice.status === "paid" || invoice.status === "void") {
        return total;
      }

      return total + toNumber(invoice.remaining_balance);
    }, 0);

    const bookingProjectValue = bookings.reduce((total, booking) => {
      const original = toNumber(booking.original_price);
      const discount = toNumber(booking.discount_amount);
      const tip = toNumber(booking.tip_amount);

      return total + Math.max(original - discount, 0) + tip;
    }, 0);

    const invoiceProjectValue = invoices.reduce(
      (total, invoice) => total + toNumber(invoice.total_amount),
      0
    );

    const signedContractValue = signedContracts.reduce(
      (total, contract) => total + toNumber(contract.project_value),
      0
    );

    const totalContractValue = contracts.reduce(
      (total, contract) => total + toNumber(contract.project_value),
      0
    );

    const totalCollected =
      bookingRevenueCollected +
      invoiceRevenueCollected +
      projectRevenueCollected;

    const totalTips = bookingTips + invoiceTips;

    const totalDiscounts = bookingDiscounts + invoiceDiscounts;

    const totalOutstanding =
      bookingOutstanding + invoiceOutstanding + projectOutstanding;

    const totalProjectValue =
      bookingProjectValue + invoiceProjectValue + projectBudgetValue;

    return {
      bookingRevenueCollected,
      invoiceRevenueCollected,
      projectRevenueCollected,
      totalCollected,
      totalProjectValue,
      totalOutstanding,
      totalTips,
      totalDiscounts,
      depositsCollected,
      bookingOutstanding,
      invoiceOutstanding,
      projectOutstanding,
      signedContractValue,
      totalContractValue,
      projectBudgetValue,
      activeProjectValue,
    };
  }, [
    bookings,
    paidBookings,
    invoices,
    paidInvoices,
    contracts,
    signedContracts,
    projects,
    activeProjects,
  ]);

  const conversionMetrics = useMemo(() => {
    const totalBookings = bookings.length;
    const paidBookingCount = paidBookings.length;
    const confirmedBookingCount = confirmedBookings.length;

    const bookingPaymentRate =
      totalBookings > 0 ? (paidBookingCount / totalBookings) * 100 : 0;

    const bookingConfirmationRate =
      totalBookings > 0 ? (confirmedBookingCount / totalBookings) * 100 : 0;

    const totalInvoices = invoices.length;
    const paidInvoiceCount = paidInvoices.length;

    const invoicePaymentRate =
      totalInvoices > 0 ? (paidInvoiceCount / totalInvoices) * 100 : 0;

    const totalContracts = contracts.length;
    const signedContractCount = signedContracts.length;
    const viewedContractCount = viewedContracts.length;

    const contractSignRate =
      totalContracts > 0 ? (signedContractCount / totalContracts) * 100 : 0;

    const contractViewRate =
      totalContracts > 0 ? (viewedContractCount / totalContracts) * 100 : 0;

    const totalProjects = projects.length;
    const completedProjectCount = completedProjects.length;

    const projectCompletionRate =
      totalProjects > 0 ? (completedProjectCount / totalProjects) * 100 : 0;

    return {
      bookingPaymentRate,
      bookingConfirmationRate,
      invoicePaymentRate,
      contractSignRate,
      contractViewRate,
      projectCompletionRate,
    };
  }, [
    bookings,
    paidBookings,
    confirmedBookings,
    invoices,
    paidInvoices,
    contracts,
    signedContracts,
    viewedContracts,
    projects,
    completedProjects,
  ]);

  const monthlyRevenue = useMemo(() => {
    const months: Record<string, number> = {};

    paidBookings.forEach((booking) => {
      const key = getMonthKey(booking.created_at ?? booking.booking_date);

      months[key] = (months[key] ?? 0) + toNumber(booking.price_paid);
    });

    paidInvoices.forEach((invoice) => {
      const key = getMonthKey(invoice.paid_at ?? invoice.created_at);

      months[key] = (months[key] ?? 0) + toNumber(invoice.amount_paid);
    });

    projects.forEach((project) => {
      const key = getMonthKey(project.updated_at ?? project.created_at);

      months[key] = (months[key] ?? 0) + toNumber(project.amount_paid);
    });

    return Object.entries(months)
      .map(([month, value]) => ({
        month,
        value,
      }))
      .slice(0, 8)
      .reverse();
  }, [paidBookings, paidInvoices, projects]);

  const maxMonthlyRevenue = useMemo(() => {
    return Math.max(...monthlyRevenue.map((item) => item.value), 1);
  }, [monthlyRevenue]);

  const recentPayments = useMemo(() => {
    const bookingPayments = paidBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      type: "Booking",
      title: booking.customer_email ?? `Booking #${booking.id}`,
      amount: toNumber(booking.price_paid),
      date: booking.created_at ?? booking.booking_date,
      status: booking.status ?? "paid",
    }));

    const invoicePayments = paidInvoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "Invoice",
      title: invoice.invoice_number ?? invoice.title ?? `Invoice #${invoice.id}`,
      amount: toNumber(invoice.amount_paid),
      date: invoice.paid_at ?? invoice.created_at,
      status: invoice.status ?? "paid",
    }));

    const projectPayments = projects
      .filter((project) => toNumber(project.amount_paid) > 0)
      .map((project) => ({
        id: `project-${project.id}`,
        type: "Project",
        title: project.project_number ?? project.project_title ?? `Project #${project.id}`,
        amount: toNumber(project.amount_paid),
        date: project.updated_at ?? project.created_at,
        status: project.status ?? "active",
      }));

    return [...bookingPayments, ...invoicePayments, ...projectPayments]
      .sort((a, b) => {
        const aDate = new Date(a.date ?? "").getTime();
        const bDate = new Date(b.date ?? "").getTime();

        return bDate - aDate;
      })
      .slice(0, 8);
  }, [paidBookings, paidInvoices, projects]);

  const recentContracts = useMemo(() => {
    return contracts
      .map((contract) => ({
        id: contract.id,
        contractNumber: contract.contract_number ?? `Contract #${contract.id}`,
        title: contract.title ?? "Untitled Contract",
        client: contract.client_name ?? contract.client_email ?? "No client",
        status: contract.status ?? "sent",
        value: toNumber(contract.project_value),
        date:
          contract.signed_at ??
          contract.viewed_at ??
          contract.sent_at ??
          contract.created_at,
      }))
      .sort((a, b) => {
        const aDate = new Date(a.date ?? "").getTime();
        const bDate = new Date(b.date ?? "").getTime();

        return bDate - aDate;
      })
      .slice(0, 6);
  }, [contracts]);

  const recentProjects = useMemo(() => {
    return projects
      .map((project) => ({
        id: project.id,
        projectNumber: project.project_number ?? `Project #${project.id}`,
        title: project.project_title ?? "Untitled Project",
        client: project.client_name ?? project.client_email ?? "No client",
        status: project.status ?? "planning",
        priority: project.priority ?? "normal",
        value: toNumber(project.budget_amount),
        date: project.updated_at ?? project.created_at ?? project.due_date,
      }))
      .sort((a, b) => {
        const aDate = new Date(a.date ?? "").getTime();
        const bDate = new Date(b.date ?? "").getTime();

        return bDate - aDate;
      })
      .slice(0, 6);
  }, [projects]);

  const outstandingItems = useMemo(() => {
    const bookingBalances = bookings
      .filter(
        (booking) =>
          toNumber(booking.remaining_balance) > 0 &&
          booking.balance_status !== "balance_paid" &&
          booking.balance_status !== "cancelled"
      )
      .map((booking) => ({
        id: `booking-${booking.id}`,
        type: "Booking Balance",
        title: booking.customer_email ?? `Booking #${booking.id}`,
        amount: toNumber(booking.remaining_balance),
        status: booking.balance_status ?? "balance_due",
      }));

    const invoiceBalances = invoices
      .filter(
        (invoice) =>
          toNumber(invoice.remaining_balance) > 0 &&
          invoice.status !== "paid" &&
          invoice.status !== "void"
      )
      .map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: "Invoice",
        title: invoice.invoice_number ?? invoice.title ?? `Invoice #${invoice.id}`,
        amount: toNumber(invoice.remaining_balance),
        status: invoice.status ?? "sent",
      }));

    const projectBalances = projects
      .filter((project) => toNumber(project.remaining_balance) > 0)
      .map((project) => ({
        id: `project-${project.id}`,
        type: "Project",
        title: project.project_number ?? project.project_title ?? `Project #${project.id}`,
        amount: toNumber(project.remaining_balance),
        status: project.status ?? "active",
      }));

    return [...bookingBalances, ...invoiceBalances, ...projectBalances]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [bookings, invoices, projects]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Analytics...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Analytics
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Track booking revenue, invoice revenue, project revenue, tips,
            deposits, discounts, outstanding balances, signed contracts, project
            value, production work, and business performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Dashboard Home
          </Link>

          <button
            onClick={fetchAnalytics}
            className="rounded-full bg-white px-5 py-3 text-sm text-black transition hover:bg-zinc-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Collected"
          value={formatMoney(metrics.totalCollected)}
          description="Money collected through bookings, invoices, and projects."
        />

        <MetricCard
          label="Business Value"
          value={formatMoney(metrics.totalProjectValue)}
          description="Full value of bookings, invoices, and project budgets."
        />

        <MetricCard
          label="Outstanding"
          value={formatMoney(metrics.totalOutstanding)}
          description="Balances still due from bookings, invoices, and projects."
        />

        <MetricCard
          label="Tips"
          value={formatMoney(metrics.totalTips)}
          description="Optional tips added through bookings and invoice payment requests."
        />
      </section>

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Booking Revenue"
          value={formatMoney(metrics.bookingRevenueCollected)}
          description="Collected directly from booking checkout and balance payments."
        />

        <MetricCard
          label="Invoice Revenue"
          value={formatMoney(metrics.invoiceRevenueCollected)}
          description="Collected from standalone admin invoices and payment requests."
        />

        <MetricCard
          label="Project Revenue"
          value={formatMoney(metrics.projectRevenueCollected)}
          description="Paid money recorded directly inside project records."
        />

        <MetricCard
          label="Discounts Given"
          value={formatMoney(metrics.totalDiscounts)}
          description="Total amount discounted across bookings and invoices."
        />
      </section>

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Projects"
          value={String(projects.length)}
          description="Total media or client projects created."
        />

        <MetricCard
          label="Active Projects"
          value={String(activeProjects.length)}
          description="Projects currently in planning, production, review, or revision."
        />

        <MetricCard
          label="Project Budget"
          value={formatMoney(metrics.projectBudgetValue)}
          description="Total budget value across all projects."
        />

        <MetricCard
          label="Active Project Value"
          value={formatMoney(metrics.activeProjectValue)}
          description="Budget value connected to active production work."
        />
      </section>

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Contracts"
          value={String(contracts.length)}
          description="Total client contracts created from the dashboard."
        />

        <MetricCard
          label="Signed Contracts"
          value={String(signedContracts.length)}
          description="Contracts that clients have electronically signed."
        />

        <MetricCard
          label="Signed Contract Value"
          value={formatMoney(metrics.signedContractValue)}
          description="Project value connected to signed contracts."
        />

        <MetricCard
          label="Total Contract Value"
          value={formatMoney(metrics.totalContractValue)}
          description="Potential value across all contracts, signed and unsigned."
        />
      </section>

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Booking Pay Rate
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {conversionMetrics.bookingPaymentRate.toFixed(1)}%
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            {paidBookings.length} of {bookings.length} bookings have been paid.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Invoice Pay Rate
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {conversionMetrics.invoicePaymentRate.toFixed(1)}%
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            {paidInvoices.length} of {invoices.length} invoices have been paid.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Contract View Rate
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {conversionMetrics.contractViewRate.toFixed(1)}%
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            {viewedContracts.length} of {contracts.length} contracts have been
            viewed.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Contract Sign Rate
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {conversionMetrics.contractSignRate.toFixed(1)}%
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            {signedContracts.length} of {contracts.length} contracts have been
            signed.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Project Completion
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {conversionMetrics.projectCompletionRate.toFixed(1)}%
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            {completedProjects.length} of {projects.length} projects are
            delivered or completed.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            High Priority
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {highPriorityProjects.length}
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            Projects marked high or urgent priority.
          </p>
        </div>
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Revenue Trend
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Monthly Collected Revenue
            </h2>
          </div>

          {monthlyRevenue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No paid revenue yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {monthlyRevenue.map((item) => {
                const width = Math.max(
                  (item.value / maxMonthlyRevenue) * 100,
                  4
                );

                return (
                  <div key={item.month}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-zinc-400">
                        {item.month}
                      </span>

                      <span className="font-semibold">
                        {formatMoney(item.value)}
                      </span>
                    </div>

                    <div className="h-4 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Status Snapshot
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Business Health
          </h2>

          <div className="mt-6 grid gap-4">
            {[
              ["Total Bookings", bookings.length],
              ["Paid Bookings", paidBookings.length],
              ["Sent Invoices", sentInvoices.length],
              ["Paid Invoices", paidInvoices.length],
              ["Sent Contracts", sentContracts.length],
              ["Signed Contracts", signedContracts.length],
              ["Active Projects", activeProjects.length],
              ["Completed Projects", completedProjects.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">
                    {label}
                  </span>

                  <span className="font-bold">
                    {value}
                  </span>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">
                  Booking Balances Due
                </span>

                <span className="font-bold">
                  {formatMoney(metrics.bookingOutstanding)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">
                  Invoice Balances Due
                </span>

                <span className="font-bold">
                  {formatMoney(metrics.invoiceOutstanding)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">
                  Project Balances Due
                </span>

                <span className="font-bold">
                  {formatMoney(metrics.projectOutstanding)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Recent Payments
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Paid Activity
              </h2>
            </div>
          </div>

          {recentPayments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No payments collected yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                    {payment.type}
                  </p>

                  <h3 className="mt-1 font-semibold">
                    {payment.title}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {formatDate(payment.date)}
                  </p>

                  <p className="mt-3 text-xl font-bold text-green-300">
                    {formatMoney(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Projects
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Recent Work
              </h2>
            </div>

            <Link
              href="/dashboard/projects"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Open
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No projects created yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                    {project.projectNumber}
                  </p>

                  <h3 className="mt-1 font-semibold">
                    {project.title}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {project.client} · {project.status} · {project.priority}
                  </p>

                  <p className="mt-3 text-xl font-bold text-cyan-300">
                    {formatMoney(project.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Contracts
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Agreements
              </h2>
            </div>

            <Link
              href="/dashboard/contracts"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Open
            </Link>
          </div>

          {recentContracts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No contracts created yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {recentContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                    {contract.contractNumber}
                  </p>

                  <h3 className="mt-1 font-semibold">
                    {contract.title}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {contract.client} · {contract.status}
                  </p>

                  <p className="mt-3 text-xl font-bold text-purple-300">
                    {formatMoney(contract.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Collections
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Outstanding
              </h2>
            </div>
          </div>

          {outstandingItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No outstanding balances.
            </div>
          ) : (
            <div className="grid gap-3">
              {outstandingItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                    {item.type}
                  </p>

                  <h3 className="mt-1 font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm capitalize text-zinc-500">
                    {item.status}
                  </p>

                  <p className="mt-3 text-xl font-bold text-yellow-300">
                    {formatMoney(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}