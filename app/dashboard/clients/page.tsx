"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface CrmClient {
  id: number;
  full_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  status: string | null;
  source: string | null;
  tags: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Booking {
  id: number;
  crm_client_id: number | null;
  customer_email: string | null;
  status: string | null;
  payment_status: string | null;
  price_paid: number | null;
  remaining_balance: number | null;
  balance_status: string | null;
  created_at: string | null;
  booking_date: string | null;
}

interface AdminInvoice {
  id: number;
  crm_client_id: number | null;
  client_email: string | null;
  status: string | null;
  amount_paid: number | null;
  remaining_balance: number | null;
  total_amount: number | null;
  created_at: string | null;
  paid_at: string | null;
}

interface ClientContract {
  id: number;
  crm_client_id: number | null;
  client_email: string | null;
  status: string | null;
  project_value: number | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  created_at: string | null;
}

interface MediaProject {
  id: number;
  crm_client_id: number | null;
  client_email: string | null;
  status: string | null;
  budget_amount: number | null;
  amount_paid: number | null;
  remaining_balance: number | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ClientStats {
  bookingsCount: number;
  invoicesCount: number;
  contractsCount: number;
  signedContractsCount: number;
  projectsCount: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
  totalPaid: number;
  totalOutstanding: number;
  totalValue: number;
  totalContractValue: number;
  signedContractValue: number;
  projectBudgetValue: number;
  projectPaidValue: number;
  projectRemainingValue: number;
  lastActivity: string | null;
}

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  status: "lead",
  source: "",
  tags: "",
  notes: "",
};

const clientStatuses = [
  "lead",
  "active",
  "past",
  "vip",
  "needs_follow_up",
  "inactive",
];

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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not contacted";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function statusClass(status: string | null) {
  if (status === "vip") {
    return "border-purple-500 bg-purple-500/10 text-purple-300";
  }

  if (status === "active") {
    return "border-green-500 bg-green-500/10 text-green-300";
  }

  if (status === "needs_follow_up") {
    return "border-yellow-500 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "past") {
    return "border-blue-500 bg-blue-500/10 text-blue-300";
  }

  if (status === "inactive") {
    return "border-red-500 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

export default function DashboardClientsPage() {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [projects, setProjects] = useState<MediaProject[]>([]);

  const [form, setForm] = useState(emptyForm);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchClientData() {
    try {
      setLoading(true);
      setError("");

      const [
        clientsResult,
        bookingsResult,
        invoicesResult,
        contractsResult,
        projectsResult,
      ] = await Promise.all([
        supabase
          .from("crm_clients")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("bookings")
          .select(
            `
              id,
              crm_client_id,
              customer_email,
              status,
              payment_status,
              price_paid,
              remaining_balance,
              balance_status,
              created_at,
              booking_date
            `
          ),

        supabase
          .from("admin_invoices")
          .select(
            `
              id,
              crm_client_id,
              client_email,
              status,
              amount_paid,
              remaining_balance,
              total_amount,
              created_at,
              paid_at
            `
          ),

        supabase
          .from("client_contracts")
          .select(
            `
              id,
              crm_client_id,
              client_email,
              status,
              project_value,
              sent_at,
              viewed_at,
              signed_at,
              created_at
            `
          ),

        supabase
          .from("media_projects")
          .select(
            `
              id,
              crm_client_id,
              client_email,
              status,
              budget_amount,
              amount_paid,
              remaining_balance,
              due_date,
              created_at,
              updated_at
            `
          ),
      ]);

      if (clientsResult.error) {
        throw clientsResult.error;
      }

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

      setClients((clientsResult.data ?? []) as CrmClient[]);
      setBookings((bookingsResult.data ?? []) as Booking[]);
      setInvoices((invoicesResult.data ?? []) as AdminInvoice[]);
      setContracts((contractsResult.data ?? []) as ClientContract[]);
      setProjects((projectsResult.data ?? []) as MediaProject[]);
    } catch (error) {
      console.error("CLIENT CRM FETCH ERROR:", error);
      setError("Client CRM data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClientData();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const client = params.get("client");

      if (client) {
        const decodedClient = decodeURIComponent(client).trim().toLowerCase();

        setClientFilter(decodedClient);
        setSearchTerm(decodedClient);
      }
    }
  }, []);

  function getClientStats(client: CrmClient): ClientStats {
    const clientEmail = normalizeEmail(client.email);

    const clientBookings = bookings.filter((booking) => {
      return (
        booking.crm_client_id === client.id ||
        normalizeEmail(booking.customer_email) === clientEmail
      );
    });

    const clientInvoices = invoices.filter((invoice) => {
      return (
        invoice.crm_client_id === client.id ||
        normalizeEmail(invoice.client_email) === clientEmail
      );
    });

    const clientContracts = contracts.filter((contract) => {
      return (
        contract.crm_client_id === client.id ||
        normalizeEmail(contract.client_email) === clientEmail
      );
    });

    const clientProjects = projects.filter((project) => {
      return (
        project.crm_client_id === client.id ||
        normalizeEmail(project.client_email) === clientEmail
      );
    });

    const bookingPaid = clientBookings.reduce((total, booking) => {
      if (booking.payment_status !== "paid") {
        return total;
      }

      return total + toNumber(booking.price_paid);
    }, 0);

    const invoicePaid = clientInvoices.reduce((total, invoice) => {
      if (invoice.status !== "paid") {
        return total;
      }

      return total + toNumber(invoice.amount_paid);
    }, 0);

    const bookingOutstanding = clientBookings.reduce((total, booking) => {
      if (
        booking.balance_status === "balance_paid" ||
        booking.balance_status === "not_applicable" ||
        booking.balance_status === "cancelled"
      ) {
        return total;
      }

      return total + toNumber(booking.remaining_balance);
    }, 0);

    const invoiceOutstanding = clientInvoices.reduce((total, invoice) => {
      if (invoice.status === "paid" || invoice.status === "void") {
        return total;
      }

      return total + toNumber(invoice.remaining_balance);
    }, 0);

    const invoiceValue = clientInvoices.reduce((total, invoice) => {
      return total + toNumber(invoice.total_amount);
    }, 0);

    const bookingValue = clientBookings.reduce((total, booking) => {
      return (
        total +
        toNumber(booking.price_paid) +
        toNumber(booking.remaining_balance)
      );
    }, 0);

    const totalContractValue = clientContracts.reduce((total, contract) => {
      return total + toNumber(contract.project_value);
    }, 0);

    const signedContractValue = clientContracts.reduce((total, contract) => {
      if (contract.status !== "signed") {
        return total;
      }

      return total + toNumber(contract.project_value);
    }, 0);

    const signedContractsCount = clientContracts.filter(
      (contract) => contract.status === "signed"
    ).length;

    const activeProjectsCount = clientProjects.filter((project) => {
      return (
        project.status === "planning" ||
        project.status === "scheduled" ||
        project.status === "in_progress" ||
        project.status === "review" ||
        project.status === "revision"
      );
    }).length;

    const completedProjectsCount = clientProjects.filter((project) => {
      return project.status === "delivered" || project.status === "completed";
    }).length;

    const projectBudgetValue = clientProjects.reduce((total, project) => {
      return total + toNumber(project.budget_amount);
    }, 0);

    const projectPaidValue = clientProjects.reduce((total, project) => {
      return total + toNumber(project.amount_paid);
    }, 0);

    const projectRemainingValue = clientProjects.reduce((total, project) => {
      return total + toNumber(project.remaining_balance);
    }, 0);

    const activityDates = [
      ...clientBookings.map((booking) => booking.created_at ?? booking.booking_date),
      ...clientInvoices.map((invoice) => invoice.paid_at ?? invoice.created_at),
      ...clientContracts.map(
        (contract) =>
          contract.signed_at ??
          contract.viewed_at ??
          contract.sent_at ??
          contract.created_at
      ),
      ...clientProjects.map(
        (project) =>
          project.updated_at ??
          project.created_at ??
          project.due_date
      ),
      client.updated_at,
      client.created_at,
    ].filter(Boolean) as string[];

    const lastActivity =
      activityDates.length > 0
        ? activityDates.sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime()
          )[0]
        : null;

    return {
      bookingsCount: clientBookings.length,
      invoicesCount: clientInvoices.length,
      contractsCount: clientContracts.length,
      signedContractsCount,
      projectsCount: clientProjects.length,
      activeProjectsCount,
      completedProjectsCount,
      totalPaid: bookingPaid + invoicePaid + projectPaidValue,
      totalOutstanding:
        bookingOutstanding + invoiceOutstanding + projectRemainingValue,
      totalValue: bookingValue + invoiceValue + projectBudgetValue,
      totalContractValue,
      signedContractValue,
      projectBudgetValue,
      projectPaidValue,
      projectRemainingValue,
      lastActivity,
    };
  }

  const summary = useMemo(() => {
    return clients.reduce(
      (totals, client) => {
        const stats = getClientStats(client);

        totals.totalClients += 1;
        totals.totalPaid += stats.totalPaid;
        totals.totalOutstanding += stats.totalOutstanding;
        totals.totalContractValue += stats.totalContractValue;
        totals.signedContractValue += stats.signedContractValue;
        totals.projectBudgetValue += stats.projectBudgetValue;
        totals.projectPaidValue += stats.projectPaidValue;
        totals.projectRemainingValue += stats.projectRemainingValue;
        totals.contracts += stats.contractsCount;
        totals.signedContracts += stats.signedContractsCount;
        totals.projects += stats.projectsCount;
        totals.activeProjects += stats.activeProjectsCount;

        if (client.status === "lead") {
          totals.leads += 1;
        }

        if (client.status === "active") {
          totals.active += 1;
        }

        if (client.status === "vip") {
          totals.vip += 1;
        }

        if (client.status === "needs_follow_up") {
          totals.needsFollowUp += 1;
        }

        return totals;
      },
      {
        totalClients: 0,
        leads: 0,
        active: 0,
        vip: 0,
        needsFollowUp: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        contracts: 0,
        signedContracts: 0,
        projects: 0,
        activeProjects: 0,
        totalContractValue: 0,
        signedContractValue: 0,
        projectBudgetValue: 0,
        projectPaidValue: 0,
        projectRemainingValue: 0,
      }
    );
  }, [clients, bookings, invoices, contracts, projects]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchable = [
        client.full_name,
        client.email,
        client.phone,
        client.company,
        client.status,
        client.source,
        client.tags,
        client.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || client.status === statusFilter;

      const matchesClient =
        !clientFilter || normalizeEmail(client.email) === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [clients, searchTerm, statusFilter, clientFilter]);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingClientId(null);
  }

  function clearClientFilter() {
    setClientFilter("");
    setSearchTerm("");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard/clients");
    }
  }

  function editClient(client: CrmClient) {
    setEditingClientId(client.id);

    setForm({
      full_name: client.full_name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      company: client.company ?? "",
      status: client.status ?? "lead",
      source: client.source ?? "",
      tags: client.tags ?? "",
      notes: client.notes ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const cleanEmail = form.email.trim().toLowerCase();

      if (!cleanEmail) {
        setError("Client email is required.");
        return;
      }

      const payload = {
        full_name: form.full_name.trim() || null,
        email: cleanEmail,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        status: form.status,
        source: form.source.trim() || null,
        tags: form.tags.trim() || null,
        notes: form.notes.trim() || null,
        last_contacted_at: new Date().toISOString(),
      };

      if (editingClientId) {
        const { error } = await supabase
          .from("crm_clients")
          .update(payload)
          .eq("id", editingClientId);

        if (error) {
          throw error;
        }

        setSuccess("Client updated.");
      } else {
        const { error } = await supabase.from("crm_clients").insert(payload);

        if (error) {
          throw error;
        }

        setSuccess("Client created.");
      }

      resetForm();
      await fetchClientData();
    } catch (error) {
      console.error("SAVE CLIENT ERROR:", error);
      setError("Client could not be saved. Check if the email already exists.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(client: CrmClient) {
    const confirmed = window.confirm(
      `Delete ${client.full_name || client.email}? This will not delete their bookings, invoices, contracts, or projects.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingId(client.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("crm_clients")
        .delete()
        .eq("id", client.id);

      if (error) {
        throw error;
      }

      await fetchClientData();

      setSuccess("Client deleted.");
    } catch (error) {
      console.error("DELETE CLIENT ERROR:", error);
      setError("Client could not be deleted.");
    } finally {
      setLoadingId(null);
    }
  }

  async function markFollowUp(client: CrmClient) {
    try {
      setLoadingId(client.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("crm_clients")
        .update({
          status: "needs_follow_up",
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      if (error) {
        throw error;
      }

      await fetchClientData();

      setSuccess("Client marked for follow-up.");
    } catch (error) {
      console.error("FOLLOW UP ERROR:", error);
      setError("Client could not be updated.");
    } finally {
      setLoadingId(null);
    }
  }

  async function markContacted(client: CrmClient) {
    try {
      setLoadingId(client.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("crm_clients")
        .update({
          status: client.status === "lead" ? "active" : client.status,
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      if (error) {
        throw error;
      }

      await fetchClientData();

      setSuccess("Client marked contacted.");
    } catch (error) {
      console.error("CONTACTED ERROR:", error);
      setError("Client could not be updated.");
    } finally {
      setLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Client CRM...
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
            Client CRM
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Track client records, contact information, notes, status, booking
            history, invoice history, contract history, project history, total
            paid, signed value, project value, and outstanding balances.
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
            onClick={fetchClientData}
            className="rounded-full bg-white px-5 py-3 text-sm text-black transition hover:bg-zinc-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {clientFilter && (
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-200 md:flex-row md:items-center md:justify-between">
          <p className="break-all">
            Showing CRM record for{" "}
            <span className="font-semibold">{clientFilter}</span>
          </p>

          <button
            onClick={clearClientFilter}
            className="rounded-full border border-blue-400 px-4 py-2 text-sm text-blue-200 transition hover:bg-blue-400 hover:text-black"
          >
            Clear Client Filter
          </button>
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-8 rounded-3xl border border-green-500 bg-green-500/10 p-5 text-green-300">
          {success}
        </div>
      )}

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Clients
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.totalClients}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Leads
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.leads}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Active
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.active}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            VIP
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.vip}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Follow Up
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.needsFollowUp}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Projects
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.projects}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Active Projects
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.activeProjects}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Contracts
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.contracts}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Signed
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.signedContracts}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Total Paid
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {formatMoney(summary.totalPaid)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Outstanding
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {formatMoney(summary.totalOutstanding)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Project Value
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {formatMoney(summary.projectBudgetValue)}
          </h2>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            {editingClientId ? "Edit" : "Create"}
          </p>

          <h2 className="text-3xl font-bold">
            {editingClientId ? "Update Client" : "New Client"}
          </h2>

          <form onSubmit={saveClient} className="mt-8 grid gap-4">
            <input
              value={form.full_name}
              onChange={(event) => updateForm("full_name", event.target.value)}
              placeholder="Full name"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              type="email"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder="Email address"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              value={form.phone}
              onChange={(event) => updateForm("phone", event.target.value)}
              placeholder="Phone number"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              value={form.company}
              onChange={(event) => updateForm("company", event.target.value)}
              placeholder="Company / organization"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <select
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            >
              {clientStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <input
              value={form.source}
              onChange={(event) => updateForm("source", event.target.value)}
              placeholder="Source, e.g. website, referral, Instagram"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              value={form.tags}
              onChange={(event) => updateForm("tags", event.target.value)}
              placeholder="Tags, e.g. wedding, nonprofit, recurring"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Client notes"
              rows={5}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-white px-6 py-4 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingClientId
                    ? "Save Changes"
                    : "Create Client"}
              </button>

              {editingClientId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/10 px-6 py-4 font-medium text-zinc-300 transition hover:bg-white hover:text-black"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-6 grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);

                if (!event.target.value.trim()) {
                  setClientFilter("");
                }
              }}
              placeholder="Search clients..."
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            >
              <option value="all">All Statuses</option>

              {clientStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {filteredClients.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-10 text-center text-zinc-500">
              No clients found.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredClients.map((client) => {
                const stats = getClientStats(client);

                return (
                  <div
                    key={client.id}
                    className="rounded-3xl border border-white/10 bg-black/50 p-6"
                  >
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-bold">
                            {client.full_name || client.email}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs capitalize ${statusClass(
                              client.status
                            )}`}
                          >
                            {(client.status ?? "lead").replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-zinc-400">
                          {client.email}
                        </p>

                        {(client.phone || client.company) && (
                          <p className="mt-2 text-sm text-zinc-500">
                            {client.phone || "No phone"} ·{" "}
                            {client.company || "No company"}
                          </p>
                        )}

                        <div className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-10">
                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Bookings
                            </p>

                            <p className="mt-2 text-2xl font-bold">
                              {stats.bookingsCount}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Invoices
                            </p>

                            <p className="mt-2 text-2xl font-bold">
                              {stats.invoicesCount}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Contracts
                            </p>

                            <p className="mt-2 text-2xl font-bold">
                              {stats.contractsCount}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Projects
                            </p>

                            <p className="mt-2 text-2xl font-bold">
                              {stats.projectsCount}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Active
                            </p>

                            <p className="mt-2 text-2xl font-bold text-blue-300">
                              {stats.activeProjectsCount}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Signed
                            </p>

                            <p className="mt-2 text-2xl font-bold text-green-300">
                              {stats.signedContractsCount}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Paid
                            </p>

                            <p className="mt-2 text-xl font-bold text-green-300">
                              {formatMoney(stats.totalPaid)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Outstanding
                            </p>

                            <p className="mt-2 text-xl font-bold text-yellow-300">
                              {formatMoney(stats.totalOutstanding)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Value
                            </p>

                            <p className="mt-2 text-xl font-bold text-blue-300">
                              {formatMoney(stats.totalValue)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Signed Value
                            </p>

                            <p className="mt-2 text-xl font-bold text-purple-300">
                              {formatMoney(stats.signedContractValue)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
                          <p>
                            <span className="text-zinc-600">Source:</span>{" "}
                            {client.source || "Not set"}
                          </p>

                          <p>
                            <span className="text-zinc-600">Tags:</span>{" "}
                            {client.tags || "None"}
                          </p>

                          <p>
                            <span className="text-zinc-600">
                              Last contacted:
                            </span>{" "}
                            {formatDateTime(client.last_contacted_at)}
                          </p>

                          <p>
                            <span className="text-zinc-600">
                              Last activity:
                            </span>{" "}
                            {formatDate(stats.lastActivity)}
                          </p>
                        </div>

                        {client.notes && (
                          <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black p-4 text-sm leading-relaxed text-zinc-300">
                            {client.notes}
                          </p>
                        )}
                      </div>

                      <div className="grid min-w-[220px] gap-3">
                        <button
                          onClick={() => editClient(client)}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => markContacted(client)}
                          disabled={loadingId === client.id}
                          className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark Contacted
                        </button>

                        <button
                          onClick={() => markFollowUp(client)}
                          disabled={loadingId === client.id}
                          className="rounded-full border border-yellow-500 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Needs Follow-Up
                        </button>

                        <Link
                          href={`/dashboard/bookings?client=${encodeURIComponent(
                            client.email
                          )}`}
                          className="rounded-full border border-blue-500 px-4 py-2 text-center text-sm text-blue-300 transition hover:bg-blue-500 hover:text-white"
                        >
                          View Bookings
                        </Link>

                        <Link
                          href={`/dashboard/invoices?client=${encodeURIComponent(
                            client.email
                          )}`}
                          className="rounded-full border border-purple-500 px-4 py-2 text-center text-sm text-purple-300 transition hover:bg-purple-500 hover:text-white"
                        >
                          View Invoices
                        </Link>

                        <Link
                          href={`/dashboard/contracts?client=${encodeURIComponent(
                            client.email
                          )}`}
                          className="rounded-full border border-pink-500 px-4 py-2 text-center text-sm text-pink-300 transition hover:bg-pink-500 hover:text-white"
                        >
                          View Contracts
                        </Link>

                        <Link
                          href={`/dashboard/projects?client=${encodeURIComponent(
                            client.email
                          )}`}
                          className="rounded-full border border-cyan-500 px-4 py-2 text-center text-sm text-cyan-300 transition hover:bg-cyan-500 hover:text-black"
                        >
                          View Projects
                        </Link>

                        <button
                          onClick={() => deleteClient(client)}
                          disabled={loadingId === client.id}
                          className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}