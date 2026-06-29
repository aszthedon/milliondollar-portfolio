"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import jsPDF from "jspdf";

import { supabase } from "@/lib/supabase";

interface InvoiceLineItem {
  id?: number;
  invoice_id?: number;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_amount: number;
  line_total: number;
  sort_order?: number;
}

interface AdminInvoice {
  id: number;
  invoice_number: string | null;
  client_name: string | null;
  client_email: string;
  title: string;
  description: string | null;
  subtotal_amount: number;
  discount_code: string | null;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  amount_paid: number;
  remaining_balance: number;
  allow_tips: boolean;
  status: string;
  due_date: string | null;
  payment_link: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  admin_invoice_line_items?: InvoiceLineItem[];
}

interface LineItemForm {
  item_name: string;
  description: string;
  quantity: string;
  unit_amount: string;
}

const emptyForm = {
  client_name: "",
  client_email: "",
  title: "",
  description: "",
  discount_code: "",
  discount_amount: "",
  tip_amount: "",
  due_date: "",
  notes: "",
};

const emptyLineItem: LineItemForm = {
  item_name: "",
  description: "",
  quantity: "1",
  unit_amount: "",
};

const statusOptions = [
  "all",
  "draft",
  "sent",
  "paid",
  "expired",
  "void",
];

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number | string | null | undefined) {
  return `$${toNumber(value).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function statusClass(status: string) {
  if (status === "paid") {
    return "border-green-500 bg-green-500/10 text-green-300";
  }

  if (status === "sent") {
    return "border-blue-500 bg-blue-500/10 text-blue-300";
  }

  if (status === "expired") {
    return "border-yellow-500 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "void") {
    return "border-red-500 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

export default function DashboardInvoicesPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);

  const [form, setForm] = useState(emptyForm);
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      ...emptyLineItem,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchInvoices() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("admin_invoices")
        .select(
          `
            *,
            admin_invoice_line_items(*)
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setInvoices((data ?? []) as AdminInvoice[]);
    } catch (error) {
      console.error("INVOICES FETCH ERROR:", error);
      setError("Invoices could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoices();

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

  const subtotalAmount = useMemo(() => {
    return roundMoney(
      lineItems.reduce((total, item) => {
        return total + toNumber(item.quantity) * toNumber(item.unit_amount);
      }, 0)
    );
  }, [lineItems]);

  const discountAmount = useMemo(() => {
    return roundMoney(Math.min(toNumber(form.discount_amount), subtotalAmount));
  }, [form.discount_amount, subtotalAmount]);

  const tipAmount = useMemo(() => {
    return roundMoney(Math.max(toNumber(form.tip_amount), 0));
  }, [form.tip_amount]);

  const totalAmount = useMemo(() => {
    return roundMoney(subtotalAmount - discountAmount + tipAmount);
  }, [subtotalAmount, discountAmount, tipAmount]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const searchable = [
        invoice.invoice_number,
        invoice.client_name,
        invoice.client_email,
        invoice.title,
        invoice.description,
        invoice.discount_code,
        invoice.status,
        invoice.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      const matchesClient =
        !clientFilter ||
        normalizeEmail(invoice.client_email) === normalizeEmail(clientFilter);

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [invoices, searchTerm, statusFilter, clientFilter]);

  const summary = useMemo(() => {
    return invoices.reduce(
      (totals, invoice) => {
        totals.total += 1;

        if (invoice.status === "sent") {
          totals.sent += 1;
        }

        if (invoice.status === "paid") {
          totals.paid += 1;
          totals.paidAmount += toNumber(invoice.amount_paid);
        }

        if (invoice.status !== "paid" && invoice.status !== "void") {
          totals.outstanding += toNumber(invoice.remaining_balance);
        }

        totals.totalValue += toNumber(invoice.total_amount);
        totals.tips += toNumber(invoice.tip_amount);
        totals.discounts += toNumber(invoice.discount_amount);

        return totals;
      },
      {
        total: 0,
        sent: 0,
        paid: 0,
        totalValue: 0,
        paidAmount: 0,
        outstanding: 0,
        tips: 0,
        discounts: 0,
      }
    );
  }, [invoices]);

  function clearClientFilter() {
    setClientFilter("");
    setSearchTerm("");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard/invoices");
    }
  }

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateLineItem(
    index: number,
    field: keyof LineItemForm,
    value: string
  ) {
    setLineItems((current) => {
      const next = [...current];

      next[index] = {
        ...next[index],
        [field]: value,
      };

      return next;
    });
  }

  function addLineItem() {
    setLineItems((current) => [
      ...current,
      {
        ...emptyLineItem,
      },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function resetForm() {
    setForm(emptyForm);

    setLineItems([
      {
        ...emptyLineItem,
      },
    ]);
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const normalizedLineItems = lineItems
        .map((item) => ({
          item_name: item.item_name.trim(),
          description: item.description.trim(),
          quantity: toNumber(item.quantity),
          unit_amount: toNumber(item.unit_amount),
        }))
        .filter((item) => item.item_name && item.quantity > 0 && item.unit_amount > 0);

      if (!form.client_email.trim() || !form.title.trim()) {
        setError("Client email and invoice title are required.");
        return;
      }

      if (normalizedLineItems.length === 0) {
        setError("Add at least one invoice line item.");
        return;
      }

      const response = await fetch("/api/invoices/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email,
          title: form.title,
          description: form.description,
          discount_code: form.discount_code,
          discount_amount: discountAmount,
          tip_amount: tipAmount,
          due_date: form.due_date || null,
          notes: form.notes,
          allow_tips: true,
          line_items: normalizedLineItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Invoice could not be created.");
      }

      if (data.payment_link) {
        await navigator.clipboard.writeText(data.payment_link);
      }

      resetForm();
      await fetchInvoices();

      setSuccess(
        data.payment_link
          ? "Invoice created and payment link copied."
          : "Invoice created."
      );
    } catch (error) {
      console.error("CREATE INVOICE ERROR:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Invoice could not be created."
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyPaymentLink(invoice: AdminInvoice) {
    if (!invoice.payment_link) {
      setError("No payment link exists for this invoice.");
      return;
    }

    await navigator.clipboard.writeText(invoice.payment_link);
    setSuccess("Invoice payment link copied.");
  }

  async function markPaid(invoice: AdminInvoice) {
    try {
      setLoadingId(invoice.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("admin_invoices")
        .update({
          status: "paid",
          amount_paid: invoice.total_amount,
          remaining_balance: 0,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (error) {
        throw error;
      }

      await fetchInvoices();
      setSuccess("Invoice marked paid.");
    } catch (error) {
      console.error("MARK PAID ERROR:", error);
      setError("Invoice could not be marked paid.");
    } finally {
      setLoadingId(null);
    }
  }

  async function voidInvoice(invoice: AdminInvoice) {
    const confirmed = window.confirm(
      `Void ${invoice.invoice_number ?? invoice.title}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingId(invoice.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("admin_invoices")
        .update({
          status: "void",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (error) {
        throw error;
      }

      await fetchInvoices();
      setSuccess("Invoice voided.");
    } catch (error) {
      console.error("VOID INVOICE ERROR:", error);
      setError("Invoice could not be voided.");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteInvoice(invoice: AdminInvoice) {
    const confirmed = window.confirm(
      `Delete ${invoice.invoice_number ?? invoice.title}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingId(invoice.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("admin_invoices")
        .delete()
        .eq("id", invoice.id);

      if (error) {
        throw error;
      }

      await fetchInvoices();
      setSuccess("Invoice deleted.");
    } catch (error) {
      console.error("DELETE INVOICE ERROR:", error);
      setError("Invoice could not be deleted.");
    } finally {
      setLoadingId(null);
    }
  }

  function downloadInvoicePDF(invoice: AdminInvoice) {
    const doc = new jsPDF();

    let y = 25;

    doc.setFontSize(24);
    doc.text("Invoice", 20, y);

    y += 15;

    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.invoice_number ?? invoice.id}`, 20, y);

    y += 9;
    doc.text(`Client: ${invoice.client_name || "No name"}`, 20, y);

    y += 9;
    doc.text(`Email: ${invoice.client_email}`, 20, y);

    y += 9;
    doc.text(`Title: ${invoice.title}`, 20, y);

    y += 9;
    doc.text(`Status: ${invoice.status}`, 20, y);

    y += 9;
    doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 20, y);

    y += 15;

    doc.setFontSize(16);
    doc.text("Line Items", 20, y);

    y += 10;

    doc.setFontSize(10);

    const lineItemsForInvoice = invoice.admin_invoice_line_items ?? [];

    lineItemsForInvoice.forEach((item) => {
      if (y > 265) {
        doc.addPage();
        y = 25;
      }

      doc.text(
        `${item.item_name} — Qty ${item.quantity} x ${formatMoney(
          item.unit_amount
        )} = ${formatMoney(item.line_total)}`,
        20,
        y
      );

      y += 7;

      if (item.description) {
        const descriptionLines = doc.splitTextToSize(item.description, 170);

        descriptionLines.forEach((line: string) => {
          doc.text(line, 25, y);
          y += 6;
        });
      }
    });

    y += 10;

    if (y > 245) {
      doc.addPage();
      y = 25;
    }

    doc.setFontSize(12);
    doc.text(`Subtotal: ${formatMoney(invoice.subtotal_amount)}`, 20, y);

    y += 9;
    doc.text(`Discount: -${formatMoney(invoice.discount_amount)}`, 20, y);

    y += 9;
    doc.text(`Tip: ${formatMoney(invoice.tip_amount)}`, 20, y);

    y += 9;
    doc.text(`Total: ${formatMoney(invoice.total_amount)}`, 20, y);

    y += 9;
    doc.text(`Amount Paid: ${formatMoney(invoice.amount_paid)}`, 20, y);

    y += 9;
    doc.text(
      `Remaining Balance: ${formatMoney(invoice.remaining_balance)}`,
      20,
      y
    );

    if (invoice.notes) {
      y += 15;
      doc.text("Notes:", 20, y);

      y += 8;

      const noteLines = doc.splitTextToSize(invoice.notes, 170);

      doc.text(noteLines, 20, y);
    }

    doc.save(`${invoice.invoice_number ?? `invoice-${invoice.id}`}.pdf`);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Invoices...
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
            Invoices
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Create standalone invoices, generate payment links, copy Stripe
            checkout URLs, track paid invoices, filter by client, and download
            invoice PDFs.
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
            onClick={fetchInvoices}
            className="rounded-full bg-white px-5 py-3 text-sm text-black transition hover:bg-zinc-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {clientFilter && (
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-200 md:flex-row md:items-center md:justify-between">
          <p className="break-all">
            Showing invoices for{" "}
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

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Invoices
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.total}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Sent
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.sent}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Paid
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.paid}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Value
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {formatMoney(summary.totalValue)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Collected
          </p>

          <h2 className="mt-3 text-3xl font-bold text-green-300">
            {formatMoney(summary.paidAmount)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Outstanding
          </p>

          <h2 className="mt-3 text-3xl font-bold text-yellow-300">
            {formatMoney(summary.outstanding)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Tips
          </p>

          <h2 className="mt-3 text-3xl font-bold text-purple-300">
            {formatMoney(summary.tips)}
          </h2>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Create
          </p>

          <h2 className="text-3xl font-bold">
            New Invoice
          </h2>

          <form onSubmit={createInvoice} className="mt-8 grid gap-4">
            <input
              value={form.client_name}
              onChange={(event) => updateForm("client_name", event.target.value)}
              placeholder="Client name"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              type="email"
              value={form.client_email}
              onChange={(event) =>
                updateForm("client_email", event.target.value)
              }
              placeholder="Client email"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              placeholder="Invoice title"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <textarea
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
              placeholder="Invoice description"
              rows={3}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Line Items
                </p>

                <button
                  type="button"
                  onClick={addLineItem}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                >
                  Add Item
                </button>
              </div>

              <div className="grid gap-4">
                {lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-black p-4"
                  >
                    <div className="grid gap-3">
                      <input
                        value={item.item_name}
                        onChange={(event) =>
                          updateLineItem(index, "item_name", event.target.value)
                        }
                        placeholder="Item name"
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
                      />

                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          updateLineItem(index, "description", event.target.value)
                        }
                        placeholder="Item description"
                        rows={2}
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
                      />

                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateLineItem(index, "quantity", event.target.value)
                          }
                          placeholder="Quantity"
                          className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_amount}
                          onChange={(event) =>
                            updateLineItem(
                              index,
                              "unit_amount",
                              event.target.value
                            )
                          }
                          placeholder="Unit amount"
                          className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
                        />

                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="rounded-xl border border-red-500 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500 hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={form.discount_code}
                onChange={(event) =>
                  updateForm("discount_code", event.target.value.toUpperCase())
                }
                placeholder="Discount code"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 uppercase outline-none focus:border-white/40"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_amount}
                onChange={(event) =>
                  updateForm("discount_amount", event.target.value)
                }
                placeholder="Discount amount"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tip_amount}
                onChange={(event) => updateForm("tip_amount", event.target.value)}
                placeholder="Tip amount"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />
            </div>

            <input
              type="date"
              value={form.due_date}
              onChange={(event) => updateForm("due_date", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Internal notes"
              rows={3}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Subtotal</span>
                  <span>{formatMoney(subtotalAmount)}</span>
                </div>

                <div className="flex justify-between text-green-300">
                  <span>Discount</span>
                  <span>-{formatMoney(discountAmount)}</span>
                </div>

                <div className="flex justify-between text-purple-300">
                  <span>Tip</span>
                  <span>{formatMoney(tipAmount)}</span>
                </div>

                <div className="mt-3 flex justify-between border-t border-white/10 pt-4 text-lg font-bold">
                  <span>Total</span>
                  <span>{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-white px-6 py-4 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Invoice + Copy Link"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-6 grid gap-4 md:grid-cols-[1fr_200px]">
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);

                if (!event.target.value.trim()) {
                  setClientFilter("");
                }
              }}
              placeholder="Search invoices..."
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All" : status}
                </option>
              ))}
            </select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-10 text-center text-zinc-500">
              No invoices found.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-3xl border border-white/10 bg-black/50 p-6"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold">
                          {invoice.invoice_number ?? `Invoice #${invoice.id}`}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs capitalize ${statusClass(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </div>

                      <p className="mt-3 text-lg">
                        {invoice.title}
                      </p>

                      <p className="mt-2 text-sm text-zinc-400">
                        {invoice.client_name || "No client name"} ·{" "}
                        {invoice.client_email}
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-6">
                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Subtotal
                          </p>

                          <p className="mt-2 text-xl font-bold">
                            {formatMoney(invoice.subtotal_amount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Discount
                          </p>

                          <p className="mt-2 text-xl font-bold text-green-300">
                            -{formatMoney(invoice.discount_amount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Tip
                          </p>

                          <p className="mt-2 text-xl font-bold text-purple-300">
                            {formatMoney(invoice.tip_amount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Total
                          </p>

                          <p className="mt-2 text-xl font-bold">
                            {formatMoney(invoice.total_amount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Paid
                          </p>

                          <p className="mt-2 text-xl font-bold text-green-300">
                            {formatMoney(invoice.amount_paid)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Balance
                          </p>

                          <p className="mt-2 text-xl font-bold text-yellow-300">
                            {formatMoney(invoice.remaining_balance)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
                        <p>
                          <span className="text-zinc-600">Due:</span>{" "}
                          {formatDate(invoice.due_date)}
                        </p>

                        <p>
                          <span className="text-zinc-600">Paid At:</span>{" "}
                          {formatDateTime(invoice.paid_at)}
                        </p>
                      </div>

                      {invoice.payment_link && (
                        <div className="mt-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-blue-300">
                            Payment Link
                          </p>

                          <p className="break-all text-xs text-zinc-300">
                            {invoice.payment_link}
                          </p>
                        </div>
                      )}

                      {invoice.notes && (
                        <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black p-4 text-sm text-zinc-300">
                          {invoice.notes}
                        </p>
                      )}
                    </div>

                    <div className="grid min-w-[220px] gap-3">
                      <button
                        onClick={() => copyPaymentLink(invoice)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Copy Link
                      </button>

                      {invoice.payment_link && (
                        <a
                          href={invoice.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-blue-500 px-4 py-2 text-center text-sm text-blue-300 transition hover:bg-blue-500 hover:text-white"
                        >
                          Open Link
                        </a>
                      )}

                      <button
                        onClick={() => markPaid(invoice)}
                        disabled={loadingId === invoice.id || invoice.status === "paid"}
                        className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark Paid
                      </button>

                      <button
                        onClick={() => voidInvoice(invoice)}
                        disabled={loadingId === invoice.id}
                        className="rounded-full border border-yellow-500 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Void
                      </button>

                      <button
                        onClick={() => downloadInvoicePDF(invoice)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Download PDF
                      </button>

                      <button
                        onClick={() => deleteInvoice(invoice)}
                        disabled={loadingId === invoice.id}
                        className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}