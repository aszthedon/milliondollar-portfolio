"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { supabase } from "@/lib/supabase";

type InvoiceRow = Record<string, any>;

function money(value: unknown) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function getInvoiceClient(invoice: InvoiceRow) {
  return (
    invoice.client_name ||
    invoice.customer_name ||
    invoice.name ||
    invoice.customer_email ||
    invoice.email ||
    "Unknown client"
  );
}

export default function DashboardInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function fetchInvoices() {
    try {
      setLoading(true);
      setError("");

      const { data, error: invoicesError } = await supabase
        .from("admin_invoices")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(300);

      if (invoicesError) {
        throw invoicesError;
      }

      setInvoices(data ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Invoices could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createInvoiceCheckout(invoice: InvoiceRow) {
    try {
      setActionLoading(`checkout-${invoice.id}`);
      setError("");
      setSuccess("");

      const response = await fetch("/api/invoices/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Invoice checkout could not be created.");
      }

      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }

      setSuccess(data.message ?? "Invoice checkout created.");
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Invoice checkout could not be created."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function createProjectFromInvoice(invoice: InvoiceRow) {
    try {
      setActionLoading(`project-${invoice.id}`);
      setError("");
      setSuccess("");

      const response = await fetch("/api/projects/create-from-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Project could not be created.");
      }

      setSuccess(data.message ?? "Project created from invoice.");
    } catch (projectError) {
      setError(
        projectError instanceof Error
          ? projectError.message
          : "Project could not be created."
      );
    } finally {
      setActionLoading("");
    }
  }

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const status = String(
        invoice.status || invoice.invoice_status || invoice.payment_status || ""
      ).toLowerCase();

      const matchesStatus = statusFilter === "all" || status === statusFilter;

      const searchableText = [
        invoice.invoice_number,
        invoice.title,
        getInvoiceClient(invoice),
        invoice.customer_email,
        invoice.email,
        invoice.status,
        invoice.payment_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [invoices, search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <AdminUnlockGate title="Invoices Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black">Invoices</h1>

              <p className="mt-2 text-sm text-zinc-400">
                Review invoices, create checkout links, and convert paid work
                into media projects.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchInvoices}
              disabled={loading}
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              Refresh
            </button>
          </div>

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

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoices..."
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                No invoices found.
              </div>
            ) : (
              filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          #{invoice.id}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          {String(
                            invoice.status ||
                              invoice.invoice_status ||
                              "unknown"
                          ).replaceAll("_", " ")}
                        </span>

                        <span className="rounded-full border border-green-500/30 px-3 py-1 text-xs text-green-300">
                          {invoice.payment_status || "payment unknown"}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black">
                        {invoice.title ||
                          invoice.invoice_number ||
                          `Invoice #${invoice.id}`}
                      </h2>

                      <div className="mt-2 grid gap-1 text-sm text-zinc-400">
                        <p>{getInvoiceClient(invoice)}</p>
                        <p>
                          Total:{" "}
                          {money(
                            invoice.total_amount ||
                              invoice.amount ||
                              invoice.price
                          )}{" "}
                          · Paid: {money(invoice.amount_paid)} · Balance:{" "}
                          {money(invoice.balance_due)}
                        </p>
                        <p>
                          Due:{" "}
                          {invoice.due_date ||
                            invoice.invoice_due_date ||
                            "No due date"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:flex sm:flex-wrap xl:grid xl:min-w-48">
                      <button
                        type="button"
                        onClick={() => createInvoiceCheckout(invoice)}
                        disabled={actionLoading === `checkout-${invoice.id}`}
                        className="rounded-full bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Checkout
                      </button>

                      <button
                        type="button"
                        onClick={() => createProjectFromInvoice(invoice)}
                        disabled={actionLoading === `project-${invoice.id}`}
                        className="rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
                      >
                        Make Project
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </AdminUnlockGate>
  );
}