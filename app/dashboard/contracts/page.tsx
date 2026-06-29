"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import jsPDF from "jspdf";

import { supabase } from "@/lib/supabase";

interface ContractTemplate {
  id: number;
  template_name: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface ClientContract {
  id: number;
  contract_number: string | null;
  signing_token: string;
  crm_client_id: number | null;
  booking_id: number | null;
  invoice_id: number | null;
  client_name: string | null;
  client_email: string;
  title: string;
  content: string;
  project_value: number | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signature_text: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CrmClient {
  id: number;
  full_name: string | null;
  email: string;
}

const emptyContractForm = {
  client_name: "",
  client_email: "",
  title: "",
  content: "",
  project_value: "",
  due_date: "",
  notes: "",
  booking_id: "",
  invoice_id: "",
};

const emptyTemplateForm = {
  template_name: "",
  title: "",
  content: "",
};

function getSiteUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
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
  if (status === "signed") {
    return "border-green-500 bg-green-500/10 text-green-300";
  }

  if (status === "sent") {
    return "border-blue-500 bg-blue-500/10 text-blue-300";
  }

  if (status === "viewed") {
    return "border-purple-500 bg-purple-500/10 text-purple-300";
  }

  if (status === "void" || status === "cancelled") {
    return "border-red-500 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

export default function DashboardContractsPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);

  const [contractForm, setContractForm] = useState(emptyContractForm);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [creatingContract, setCreatingContract] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchContractsData() {
    try {
      setLoading(true);
      setError("");

      const [templatesResult, contractsResult, clientsResult] =
        await Promise.all([
          supabase
            .from("contract_templates")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("client_contracts")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("crm_clients")
            .select("id, full_name, email")
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (templatesResult.error) {
        throw templatesResult.error;
      }

      if (contractsResult.error) {
        throw contractsResult.error;
      }

      if (clientsResult.error) {
        throw clientsResult.error;
      }

      setTemplates((templatesResult.data ?? []) as ContractTemplate[]);
      setContracts((contractsResult.data ?? []) as ClientContract[]);
      setClients((clientsResult.data ?? []) as CrmClient[]);
    } catch (error) {
      console.error("CONTRACTS DATA FETCH ERROR:", error);
      setError("Contracts data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContractsData();

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

  const summary = useMemo(() => {
    return contracts.reduce(
      (totals, contract) => {
        totals.total += 1;

        if (contract.status === "sent") {
          totals.sent += 1;
        }

        if (contract.status === "signed") {
          totals.signed += 1;
        }

        if (contract.viewed_at) {
          totals.viewed += 1;
        }

        if (contract.status === "void") {
          totals.void += 1;
        }

        totals.projectValue += Number(contract.project_value ?? 0);

        return totals;
      },
      {
        total: 0,
        sent: 0,
        viewed: 0,
        signed: 0,
        void: 0,
        projectValue: 0,
      }
    );
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const searchable = [
        contract.contract_number,
        contract.client_name,
        contract.client_email,
        contract.title,
        contract.status,
        contract.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || contract.status === statusFilter;

      const matchesClient =
        !clientFilter ||
        normalizeEmail(contract.client_email) === normalizeEmail(clientFilter);

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [contracts, searchTerm, statusFilter, clientFilter]);

  function updateContractForm(
    field: keyof typeof emptyContractForm,
    value: string
  ) {
    setContractForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTemplateForm(
    field: keyof typeof emptyTemplateForm,
    value: string
  ) {
    setTemplateForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);

    const template = templates.find((item) => String(item.id) === templateId);

    if (!template) {
      return;
    }

    setContractForm((current) => ({
      ...current,
      title: template.title,
      content: template.content,
    }));
  }

  function selectClient(email: string) {
    const client = clients.find((item) => item.email === email);

    setContractForm((current) => ({
      ...current,
      client_email: email,
      client_name: client?.full_name ?? current.client_name,
    }));
  }

  function clearClientFilter() {
    setClientFilter("");
    setSearchTerm("");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard/contracts");
    }
  }

  function resetContractForm() {
    setContractForm(emptyContractForm);
    setSelectedTemplateId("");
  }

  async function createContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCreatingContract(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/contracts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: contractForm.client_name,
          client_email: contractForm.client_email,
          title: contractForm.title,
          content: contractForm.content,
          project_value: Number(contractForm.project_value || 0),
          due_date: contractForm.due_date || null,
          notes: contractForm.notes,
          booking_id: contractForm.booking_id || null,
          invoice_id: contractForm.invoice_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Contract could not be created.");
      }

      if (data.signing_url) {
        await navigator.clipboard.writeText(data.signing_url);
      }

      await fetchContractsData();
      resetContractForm();

      setSuccess(
        data.signing_url
          ? "Contract created and signing link copied."
          : "Contract created."
      );
    } catch (error) {
      console.error("CREATE CONTRACT ERROR:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Contract could not be created."
      );
    } finally {
      setCreatingContract(false);
    }
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingTemplate(true);
      setError("");
      setSuccess("");

      if (
        !templateForm.template_name.trim() ||
        !templateForm.title.trim() ||
        !templateForm.content.trim()
      ) {
        setError("Template name, title, and content are required.");
        return;
      }

      const { error } = await supabase.from("contract_templates").insert({
        template_name: templateForm.template_name.trim(),
        title: templateForm.title.trim(),
        content: templateForm.content.trim(),
        is_active: true,
      });

      if (error) {
        throw error;
      }

      setTemplateForm(emptyTemplateForm);
      await fetchContractsData();
      setSuccess("Contract template saved.");
    } catch (error) {
      console.error("SAVE TEMPLATE ERROR:", error);
      setError("Template could not be saved.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function updateContractStatus(
    contract: ClientContract,
    status: string
  ) {
    try {
      setLoadingId(contract.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("client_contracts")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (error) {
        throw error;
      }

      await fetchContractsData();
      setSuccess(`Contract marked ${status}.`);
    } catch (error) {
      console.error("CONTRACT STATUS ERROR:", error);
      setError("Contract could not be updated.");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteContract(contract: ClientContract) {
    const confirmed = window.confirm(
      `Delete ${contract.contract_number ?? contract.title}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingId(contract.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("client_contracts")
        .delete()
        .eq("id", contract.id);

      if (error) {
        throw error;
      }

      await fetchContractsData();
      setSuccess("Contract deleted.");
    } catch (error) {
      console.error("DELETE CONTRACT ERROR:", error);
      setError("Contract could not be deleted.");
    } finally {
      setLoadingId(null);
    }
  }

  async function copySigningLink(contract: ClientContract) {
    const url = `${getSiteUrl()}/contracts/${contract.signing_token}`;

    await navigator.clipboard.writeText(url);

    setSuccess("Signing link copied.");
  }

  function downloadContractPDF(contract: ClientContract) {
    const doc = new jsPDF();

    let y = 25;

    doc.setFontSize(24);
    doc.text("Contract Agreement", 20, y);

    y += 15;

    doc.setFontSize(12);
    doc.text(`Contract #: ${contract.contract_number ?? contract.id}`, 20, y);

    y += 9;
    doc.text(`Client: ${contract.client_name || "No name"}`, 20, y);

    y += 9;
    doc.text(`Email: ${contract.client_email}`, 20, y);

    y += 9;
    doc.text(`Status: ${contract.status}`, 20, y);

    y += 9;
    doc.text(`Project Value: ${formatMoney(contract.project_value)}`, 20, y);

    y += 9;
    doc.text(`Due Date: ${formatDate(contract.due_date)}`, 20, y);

    y += 15;

    doc.setFontSize(16);
    doc.text(contract.title, 20, y);

    y += 10;

    doc.setFontSize(10);

    const contentLines = doc.splitTextToSize(contract.content, 170);

    contentLines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 25;
      }

      doc.text(line, 20, y);
      y += 6;
    });

    if (contract.status === "signed") {
      if (y > 230) {
        doc.addPage();
        y = 25;
      }

      y += 15;
      doc.setFontSize(14);
      doc.text("Electronic Signature", 20, y);

      y += 10;
      doc.setFontSize(11);
      doc.text(`Signer: ${contract.signer_name ?? ""}`, 20, y);

      y += 8;
      doc.text(`Signer Email: ${contract.signer_email ?? ""}`, 20, y);

      y += 8;
      doc.text(`Signed At: ${formatDateTime(contract.signed_at)}`, 20, y);

      y += 12;
      doc.setFontSize(20);
      doc.text(contract.signature_text ?? "", 20, y);
    }

    doc.save(`${contract.contract_number ?? `contract-${contract.id}`}.pdf`);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Contracts...
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
            Contracts
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Create contract templates, send client agreements, copy signing
            links, track signatures, filter by client, and download signed PDFs.
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
            onClick={fetchContractsData}
            className="rounded-full bg-white px-5 py-3 text-sm text-black transition hover:bg-zinc-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {clientFilter && (
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-200 md:flex-row md:items-center md:justify-between">
          <p className="break-all">
            Showing contracts for{" "}
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

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Contracts
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
            Viewed
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.viewed}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Signed
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.signed}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Void
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.void}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Value
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {formatMoney(summary.projectValue)}
          </h2>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="grid gap-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
              Send
            </p>

            <h2 className="text-3xl font-bold">
              New Contract
            </h2>

            <form onSubmit={createContract} className="mt-8 grid gap-4">
              <select
                value={selectedTemplateId}
                onChange={(event) => applyTemplate(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              >
                <option value="">Select template</option>

                {templates
                  .filter((template) => template.is_active)
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name}
                    </option>
                  ))}
              </select>

              <select
                value={contractForm.client_email}
                onChange={(event) => selectClient(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              >
                <option value="">Select CRM client, optional</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.email}>
                    {client.full_name || client.email} — {client.email}
                  </option>
                ))}
              </select>

              <input
                value={contractForm.client_name}
                onChange={(event) =>
                  updateContractForm("client_name", event.target.value)
                }
                placeholder="Client name"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                type="email"
                value={contractForm.client_email}
                onChange={(event) =>
                  updateContractForm("client_email", event.target.value)
                }
                placeholder="Client email"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                value={contractForm.title}
                onChange={(event) =>
                  updateContractForm("title", event.target.value)
                }
                placeholder="Contract title"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <textarea
                value={contractForm.content}
                onChange={(event) =>
                  updateContractForm("content", event.target.value)
                }
                placeholder="Contract terms"
                rows={12}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <div className="grid gap-4 md:grid-cols-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractForm.project_value}
                  onChange={(event) =>
                    updateContractForm("project_value", event.target.value)
                  }
                  placeholder="Project value"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
                />

                <input
                  type="date"
                  value={contractForm.due_date}
                  onChange={(event) =>
                    updateContractForm("due_date", event.target.value)
                  }
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
                />

                <input
                  value={contractForm.booking_id}
                  onChange={(event) =>
                    updateContractForm("booking_id", event.target.value)
                  }
                  placeholder="Booking ID"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
                />
              </div>

              <input
                value={contractForm.invoice_id}
                onChange={(event) =>
                  updateContractForm("invoice_id", event.target.value)
                }
                placeholder="Invoice ID"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <textarea
                value={contractForm.notes}
                onChange={(event) =>
                  updateContractForm("notes", event.target.value)
                }
                placeholder="Internal notes"
                rows={3}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <button
                type="submit"
                disabled={creatingContract}
                className="rounded-full bg-white px-6 py-4 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingContract
                  ? "Creating..."
                  : "Create + Copy Signing Link"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
              Templates
            </p>

            <h2 className="text-3xl font-bold">
              Save New Template
            </h2>

            <form onSubmit={saveTemplate} className="mt-8 grid gap-4">
              <input
                value={templateForm.template_name}
                onChange={(event) =>
                  updateTemplateForm("template_name", event.target.value)
                }
                placeholder="Template name"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                value={templateForm.title}
                onChange={(event) =>
                  updateTemplateForm("title", event.target.value)
                }
                placeholder="Default contract title"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <textarea
                value={templateForm.content}
                onChange={(event) =>
                  updateTemplateForm("content", event.target.value)
                }
                placeholder="Template terms"
                rows={8}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <button
                type="submit"
                disabled={savingTemplate}
                className="rounded-full border border-white/10 px-6 py-4 font-medium text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingTemplate ? "Saving..." : "Save Template"}
              </button>
            </form>
          </div>
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
              placeholder="Search contracts..."
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="signed">Signed</option>
              <option value="void">Void</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {filteredContracts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-10 text-center text-zinc-500">
              No contracts found.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="rounded-3xl border border-white/10 bg-black/50 p-6"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold">
                          {contract.contract_number ??
                            `Contract #${contract.id}`}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs capitalize ${statusClass(
                            contract.status
                          )}`}
                        >
                          {contract.status}
                        </span>
                      </div>

                      <p className="mt-3 text-lg text-white">
                        {contract.title}
                      </p>

                      <p className="mt-2 text-sm text-zinc-400">
                        {contract.client_name || "No client name"} ·{" "}
                        {contract.client_email}
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Value
                          </p>

                          <p className="mt-2 text-xl font-bold">
                            {formatMoney(contract.project_value)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Sent
                          </p>

                          <p className="mt-2 text-sm font-semibold">
                            {formatDate(contract.sent_at)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Viewed
                          </p>

                          <p className="mt-2 text-sm font-semibold">
                            {formatDate(contract.viewed_at)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Signed
                          </p>

                          <p className="mt-2 text-sm font-semibold">
                            {formatDate(contract.signed_at)}
                          </p>
                        </div>
                      </div>

                      {contract.status === "signed" && (
                        <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
                          <p className="text-sm uppercase tracking-[0.2em] text-green-300">
                            Signature
                          </p>

                          <p className="mt-3 text-3xl italic">
                            {contract.signature_text}
                          </p>

                          <p className="mt-3 text-sm text-green-200">
                            Signed by {contract.signer_name} at{" "}
                            {formatDateTime(contract.signed_at)}
                          </p>
                        </div>
                      )}

                      {contract.notes && (
                        <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black p-4 text-sm text-zinc-300">
                          {contract.notes}
                        </p>
                      )}
                    </div>

                    <div className="grid min-w-[220px] gap-3">
                      <button
                        onClick={() => copySigningLink(contract)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Copy Signing Link
                      </button>

                      <a
                        href={`/contracts/${contract.signing_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-blue-500 px-4 py-2 text-center text-sm text-blue-300 transition hover:bg-blue-500 hover:text-white"
                      >
                        Open Contract
                      </a>

                      <button
                        onClick={() => downloadContractPDF(contract)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Download PDF
                      </button>

                      <button
                        onClick={() => updateContractStatus(contract, "void")}
                        disabled={loadingId === contract.id}
                        className="rounded-full border border-yellow-500 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Void
                      </button>

                      <button
                        onClick={() => deleteContract(contract)}
                        disabled={loadingId === contract.id}
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