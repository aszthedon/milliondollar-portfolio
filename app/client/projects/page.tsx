"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface MediaProjectDeliverable {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

interface MediaProjectUpdate {
  id: number;
  project_id: number;
  update_title: string;
  update_body: string | null;
  visibility: string;
  created_at: string;
}

interface MediaProject {
  id: number;
  project_number: string | null;
  client_name: string | null;
  client_email: string;
  project_title: string;
  project_type: string | null;
  status: string;
  priority: string;
  description: string | null;
  budget_amount: number;
  amount_paid: number;
  remaining_balance: number;
  start_date: string | null;
  due_date: string | null;
  delivery_link: string | null;
  created_at: string;
  updated_at: string | null;
  media_project_deliverables?: MediaProjectDeliverable[];
}

interface ClientContract {
  id: number;
  contract_number: string | null;
  signing_token: string;
  client_name: string | null;
  client_email: string;
  title: string;
  project_value: number | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  due_date: string | null;
}

interface AdminInvoice {
  id: number;
  invoice_number: string | null;
  client_name: string | null;
  client_email: string;
  title: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  remaining_balance: number;
  due_date: string | null;
  payment_link: string | null;
  paid_at: string | null;
  created_at: string;
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
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

function calculateProgress(deliverables: MediaProjectDeliverable[]) {
  if (deliverables.length === 0) {
    return 0;
  }

  const completed = deliverables.filter((deliverable) => {
    return (
      deliverable.status === "approved" ||
      deliverable.status === "delivered" ||
      deliverable.status === "completed"
    );
  }).length;

  return Math.round((completed / deliverables.length) * 100);
}

function statusClass(status: string | null) {
  if (status === "completed" || status === "delivered" || status === "signed") {
    return "border-green-500 bg-green-500/10 text-green-300";
  }

  if (status === "in_progress" || status === "sent") {
    return "border-blue-500 bg-blue-500/10 text-blue-300";
  }

  if (status === "review" || status === "revision") {
    return "border-purple-500 bg-purple-500/10 text-purple-300";
  }

  if (status === "on_hold" || status === "scheduled") {
    return "border-yellow-500 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "cancelled" || status === "void") {
    return "border-red-500 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

export default function ClientProjectsPortalPage() {
  const [emailInput, setEmailInput] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");

  const [projects, setProjects] = useState<MediaProject[]>([]);
  const [updates, setUpdates] = useState<MediaProjectUpdate[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function fetchPortalData(email: string) {
    try {
      setLoading(true);
      setSearched(true);
      setError("");

      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail) {
        setError("Enter the email address connected to your project.");
        return;
      }

      setSearchedEmail(cleanEmail);

      const [projectsResult, contractsResult, invoicesResult] =
        await Promise.all([
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
                description,
                budget_amount,
                amount_paid,
                remaining_balance,
                start_date,
                due_date,
                delivery_link,
                created_at,
                updated_at,
                media_project_deliverables(
                  id,
                  project_id,
                  title,
                  description,
                  status,
                  due_date,
                  completed_at,
                  sort_order,
                  created_at,
                  updated_at
                )
              `
            )
            .eq("client_email", cleanEmail)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("client_contracts")
            .select(
              `
                id,
                contract_number,
                signing_token,
                client_name,
                client_email,
                title,
                project_value,
                status,
                sent_at,
                viewed_at,
                signed_at,
                due_date
              `
            )
            .eq("client_email", cleanEmail)
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
                total_amount,
                amount_paid,
                remaining_balance,
                due_date,
                payment_link,
                paid_at,
                created_at
              `
            )
            .eq("client_email", cleanEmail)
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      if (contractsResult.error) {
        throw contractsResult.error;
      }

      if (invoicesResult.error) {
        throw invoicesResult.error;
      }

      const projectData = (projectsResult.data ?? []) as MediaProject[];

      setProjects(projectData);
      setContracts((contractsResult.data ?? []) as ClientContract[]);
      setInvoices((invoicesResult.data ?? []) as AdminInvoice[]);

      const projectIds = projectData.map((project) => project.id);

      if (projectIds.length === 0) {
        setUpdates([]);
        return;
      }

      const { data: updatesData, error: updatesError } = await supabase
        .from("media_project_updates")
        .select(
          `
            id,
            project_id,
            update_title,
            update_body,
            visibility,
            created_at
          `
        )
        .in("project_id", projectIds)
        .eq("visibility", "client")
        .order("created_at", {
          ascending: false,
        });

      if (updatesError) {
        throw updatesError;
      }

      setUpdates((updatesData ?? []) as MediaProjectUpdate[]);
    } catch (error) {
      console.error("CLIENT PROJECT PORTAL ERROR:", error);
      setError("Project portal could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") ?? params.get("client");

    if (email) {
      const cleanEmail = decodeURIComponent(email).trim().toLowerCase();

      setEmailInput(cleanEmail);
      fetchPortalData(cleanEmail);
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    fetchPortalData(emailInput);
  }

  function getProjectUpdates(projectId: number) {
    return updates.filter((update) => update.project_id === projectId);
  }

  const summary = useMemo(() => {
    return projects.reduce(
      (totals, project) => {
        totals.totalProjects += 1;
        totals.totalBudget += toNumber(project.budget_amount);
        totals.totalPaid += toNumber(project.amount_paid);
        totals.totalRemaining += toNumber(project.remaining_balance);

        if (
          project.status === "planning" ||
          project.status === "scheduled" ||
          project.status === "in_progress" ||
          project.status === "review" ||
          project.status === "revision"
        ) {
          totals.activeProjects += 1;
        }

        if (project.status === "delivered" || project.status === "completed") {
          totals.completedProjects += 1;
        }

        return totals;
      },
      {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalBudget: 0,
        totalPaid: 0,
        totalRemaining: 0,
      }
    );
  }, [projects]);

  const signedContractsCount = useMemo(() => {
    return contracts.filter((contract) => contract.status === "signed").length;
  }, [contracts]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
              Client Portal
            </p>

            <h1 className="text-5xl font-bold md:text-7xl">
              Project Status
            </h1>

            <p className="mt-5 max-w-3xl text-zinc-400">
              View your project status, deliverables, client-visible updates,
              balances, delivery links, invoices, and contracts.
            </p>
          </div>

          <Link
            href="/client"
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Client Home
          </Link>
        </div>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="Enter the email used for your project"
              className="rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none placeholder:text-zinc-600 focus:border-white/40"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-white px-8 py-4 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "View My Projects"}
            </button>
          </form>
        </section>

        {error && (
          <div className="mb-8 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}

        {searched && !loading && (
          <>
            <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-7">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Projects
                </p>

                <h2 className="mt-3 text-4xl font-bold">
                  {summary.totalProjects}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Active
                </p>

                <h2 className="mt-3 text-4xl font-bold">
                  {summary.activeProjects}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Completed
                </p>

                <h2 className="mt-3 text-4xl font-bold">
                  {summary.completedProjects}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Budget
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  {formatMoney(summary.totalBudget)}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Paid
                </p>

                <h2 className="mt-3 text-3xl font-bold text-green-300">
                  {formatMoney(summary.totalPaid)}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Remaining
                </p>

                <h2 className="mt-3 text-3xl font-bold text-yellow-300">
                  {formatMoney(summary.totalRemaining)}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Signed Contracts
                </p>

                <h2 className="mt-3 text-4xl font-bold">
                  {signedContractsCount}
                </h2>
              </div>
            </section>

            <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Account
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {searchedEmail}
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                Only project information connected to this email is shown.
              </p>
            </section>

            {projects.length === 0 ? (
              <section className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <h2 className="text-3xl font-bold">
                  No projects found.
                </h2>

                <p className="mt-3 text-zinc-400">
                  Check that you entered the same email used when booking,
                  signing, or starting the project.
                </p>
              </section>
            ) : (
              <section className="grid gap-8">
                {projects.map((project) => {
                  const deliverables =
                    project.media_project_deliverables ?? [];

                  const projectUpdates = getProjectUpdates(project.id);

                  const progress = calculateProgress(deliverables);

                  return (
                    <div
                      key={project.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-8"
                    >
                      <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
                            {project.project_number ?? `Project #${project.id}`}
                          </p>

                          <h2 className="mt-3 text-4xl font-bold">
                            {project.project_title}
                          </h2>

                          <p className="mt-3 text-zinc-400">
                            {project.client_name || project.client_email}
                          </p>

                          {project.project_type && (
                            <p className="mt-2 text-sm text-zinc-500">
                              Type: {project.project_type}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <span
                            className={`rounded-full border px-4 py-2 text-sm capitalize ${statusClass(
                              project.status
                            )}`}
                          >
                            {project.status.replaceAll("_", " ")}
                          </span>

                          <span className="rounded-full border border-white/10 px-4 py-2 text-sm capitalize text-zinc-300">
                            {project.priority} priority
                          </span>
                        </div>
                      </div>

                      <div className="mb-6 grid gap-4 md:grid-cols-5">
                        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Progress
                          </p>

                          <p className="mt-2 text-3xl font-bold text-blue-300">
                            {progress}%
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Budget
                          </p>

                          <p className="mt-2 text-2xl font-bold">
                            {formatMoney(project.budget_amount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Paid
                          </p>

                          <p className="mt-2 text-2xl font-bold text-green-300">
                            {formatMoney(project.amount_paid)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Remaining
                          </p>

                          <p className="mt-2 text-2xl font-bold text-yellow-300">
                            {formatMoney(project.remaining_balance)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Due
                          </p>

                          <p className="mt-2 text-sm font-semibold">
                            {formatDate(project.due_date)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-6 h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      {project.description && (
                        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-5 leading-relaxed text-zinc-300">
                          {project.description}
                        </p>
                      )}

                      {project.delivery_link && (
                        <a
                          href={project.delivery_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-6 block rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-300 underline"
                        >
                          Open Delivery Link
                        </a>
                      )}

                      <div className="grid gap-6 xl:grid-cols-2">
                        <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
                          <div className="mb-5 flex items-center justify-between gap-4">
                            <h3 className="text-2xl font-bold">
                              Deliverables
                            </h3>

                            <span className="text-sm text-zinc-500">
                              {deliverables.length} items
                            </span>
                          </div>

                          {deliverables.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
                              No deliverables have been added yet.
                            </p>
                          ) : (
                            <div className="grid gap-3">
                              {deliverables
                                .slice()
                                .sort((a, b) => a.sort_order - b.sort_order)
                                .map((deliverable) => (
                                  <div
                                    key={deliverable.id}
                                    className="rounded-2xl border border-white/10 bg-black p-4"
                                  >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                      <div>
                                        <h4 className="font-semibold">
                                          {deliverable.title}
                                        </h4>

                                        {deliverable.description && (
                                          <p className="mt-2 text-sm text-zinc-400">
                                            {deliverable.description}
                                          </p>
                                        )}

                                        <p className="mt-2 text-xs text-zinc-500">
                                          Due: {formatDate(deliverable.due_date)}
                                        </p>
                                      </div>

                                      <span
                                        className={`rounded-full border px-3 py-1 text-xs capitalize ${statusClass(
                                          deliverable.status
                                        )}`}
                                      >
                                        {deliverable.status.replaceAll("_", " ")}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
                          <div className="mb-5 flex items-center justify-between gap-4">
                            <h3 className="text-2xl font-bold">
                              Project Updates
                            </h3>

                            <span className="text-sm text-zinc-500">
                              {projectUpdates.length} updates
                            </span>
                          </div>

                          {projectUpdates.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
                              No client-visible updates yet.
                            </p>
                          ) : (
                            <div className="grid gap-3">
                              {projectUpdates.map((update) => (
                                <div
                                  key={update.id}
                                  className="rounded-2xl border border-white/10 bg-black p-4"
                                >
                                  <h4 className="font-semibold">
                                    {update.update_title}
                                  </h4>

                                  {update.update_body && (
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
                                      {update.update_body}
                                    </p>
                                  )}

                                  <p className="mt-3 text-xs text-zinc-600">
                                    {formatDateTime(update.created_at)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            <section className="mt-8 grid gap-8 xl:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="text-3xl font-bold">
                  Contracts
                </h2>

                <p className="mt-3 text-sm text-zinc-400">
                  Review agreement status and open unsigned contracts.
                </p>

                <div className="mt-6 grid gap-4">
                  {contracts.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
                      No contracts found.
                    </p>
                  ) : (
                    contracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="rounded-2xl border border-white/10 bg-black/40 p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                              {contract.contract_number ??
                                `Contract #${contract.id}`}
                            </p>

                            <h3 className="mt-2 text-xl font-semibold">
                              {contract.title}
                            </h3>

                            <p className="mt-2 text-sm text-zinc-400">
                              Value: {formatMoney(contract.project_value)}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                              Due: {formatDate(contract.due_date)}
                            </p>
                          </div>

                          <div className="grid gap-3">
                            <span
                              className={`rounded-full border px-4 py-2 text-center text-sm capitalize ${statusClass(
                                contract.status
                              )}`}
                            >
                              {contract.status}
                            </span>

                            {contract.status !== "signed" && (
                              <Link
                                href={`/contracts/${contract.signing_token}`}
                                className="rounded-full bg-white px-4 py-2 text-center text-sm text-black transition hover:bg-zinc-200"
                              >
                                Open Contract
                              </Link>
                            )}

                            {contract.status === "signed" && (
                              <p className="text-center text-sm text-green-300">
                                Signed {formatDate(contract.signed_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="text-3xl font-bold">
                  Invoices
                </h2>

                <p className="mt-3 text-sm text-zinc-400">
                  Review invoice status, paid amounts, and remaining balances.
                </p>

                <div className="mt-6 grid gap-4">
                  {invoices.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
                      No invoices found.
                    </p>
                  ) : (
                    invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="rounded-2xl border border-white/10 bg-black/40 p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                              {invoice.invoice_number ?? `Invoice #${invoice.id}`}
                            </p>

                            <h3 className="mt-2 text-xl font-semibold">
                              {invoice.title}
                            </h3>

                            <p className="mt-2 text-sm text-zinc-400">
                              Total: {formatMoney(invoice.total_amount)}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                              Paid: {formatMoney(invoice.amount_paid)} ·
                              Remaining: {formatMoney(invoice.remaining_balance)}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                              Due: {formatDate(invoice.due_date)}
                            </p>
                          </div>

                          <div className="grid gap-3">
                            <span
                              className={`rounded-full border px-4 py-2 text-center text-sm capitalize ${statusClass(
                                invoice.status
                              )}`}
                            >
                              {invoice.status}
                            </span>

                            {invoice.status !== "paid" &&
                              invoice.payment_link && (
                                <a
                                  href={invoice.payment_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-full bg-white px-4 py-2 text-center text-sm text-black transition hover:bg-zinc-200"
                                >
                                  Pay Invoice
                                </a>
                              )}

                            {invoice.status === "paid" && (
                              <p className="text-center text-sm text-green-300">
                                Paid {formatDate(invoice.paid_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}