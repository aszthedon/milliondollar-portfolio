"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

type Row = Record<string, any>;

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: unknown) {
  return `$${toNumber(value).toFixed(2)}`;
}

function formatDate(value: unknown) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: unknown) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function statusClass(status: unknown) {
  const cleanStatus = String(status ?? "").toLowerCase();

  if (["completed", "delivered", "signed", "paid"].includes(cleanStatus)) {
    return "border-green-500 bg-green-500/10 text-green-300";
  }

  if (["in_progress", "sent", "active"].includes(cleanStatus)) {
    return "border-blue-500 bg-blue-500/10 text-blue-300";
  }

  if (["review", "revision"].includes(cleanStatus)) {
    return "border-purple-500 bg-purple-500/10 text-purple-300";
  }

  if (["on_hold", "scheduled", "pending"].includes(cleanStatus)) {
    return "border-yellow-500 bg-yellow-500/10 text-yellow-300";
  }

  if (["cancelled", "void"].includes(cleanStatus)) {
    return "border-red-500 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

function getProjectTitle(project: Row) {
  return project.project_title || project.title || `Project #${project.id}`;
}

function getProjectStatus(project: Row) {
  return String(project.project_status || project.status || "unknown");
}

function getContractTitle(contract: Row) {
  return contract.contract_title || contract.title || `Contract #${contract.id}`;
}

function getInvoiceTitle(invoice: Row) {
  return invoice.title || invoice.invoice_number || `Invoice #${invoice.id}`;
}

export default function ClientProjectsPortalPage() {
  const siteSlug = getClientSiteSlug();

  const [emailInput, setEmailInput] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [projects, setProjects] = useState<Row[]>([]);
  const [updates, setUpdates] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Row[]>([]);
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

      const [projectsResult, contractsResult, invoicesResult] = await Promise.all([
        supabase
          .from("media_projects")
          .select("*, media_project_deliverables(*)")
          .eq("site_slug", siteSlug)
          .eq("client_email", cleanEmail)
          .order("created_at", {
            ascending: false,
          }),
        supabase
          .from("client_contracts")
          .select("*")
          .eq("site_slug", siteSlug)
          .eq("client_email", cleanEmail)
          .order("created_at", {
            ascending: false,
          }),
        supabase
          .from("admin_invoices")
          .select("*")
          .eq("site_slug", siteSlug)
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

      const projectData = projectsResult.data ?? [];

      setProjects(projectData);
      setContracts(contractsResult.data ?? []);
      setInvoices(invoicesResult.data ?? []);

      const projectIds = projectData.map((project) => project.id).filter(Boolean);

      if (projectIds.length === 0) {
        setUpdates([]);
        return;
      }

      const { data: updatesData, error: updatesError } = await supabase
        .from("media_project_updates")
        .select("*")
        .in("project_id", projectIds)
        .eq("visibility", "client")
        .order("created_at", {
          ascending: false,
        });

      if (updatesError) {
        throw updatesError;
      }

      setUpdates(updatesData ?? []);
    } catch (portalError) {
      console.error("CLIENT PROJECT PORTAL ERROR:", portalError);
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
    return updates.filter((update) => Number(update.project_id) === Number(projectId));
  }

  const summary = useMemo(() => {
    return projects.reduce(
      (totals, project) => {
        totals.totalProjects += 1;
        totals.totalBudget += toNumber(project.budget_amount || project.project_value);
        totals.totalPaid += toNumber(project.amount_paid);
        totals.totalRemaining += toNumber(project.remaining_balance || project.balance_due);

        if (
          ["planning", "scheduled", "active", "in_progress", "review", "revision"].includes(
            getProjectStatus(project).toLowerCase()
          )
        ) {
          totals.activeProjects += 1;
        }

        if (["delivered", "completed"].includes(getProjectStatus(project).toLowerCase())) {
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
    return contracts.filter((contract) => String(contract.status).toLowerCase() === "signed").length;
  }, [contracts]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
              Client Portal
            </p>

            <h1 className="text-5xl font-bold md:text-7xl">Project Status</h1>

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
              <Metric label="Projects" value={summary.totalProjects} />
              <Metric label="Active" value={summary.activeProjects} />
              <Metric label="Completed" value={summary.completedProjects} />
              <Metric label="Budget" value={formatMoney(summary.totalBudget)} />
              <Metric label="Paid" value={formatMoney(summary.totalPaid)} />
              <Metric label="Remaining" value={formatMoney(summary.totalRemaining)} />
              <Metric label="Signed Contracts" value={signedContractsCount} />
            </section>

            <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Account</p>
              <h2 className="mt-2 text-2xl font-bold">{searchedEmail}</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Only project information connected to this email for this site is shown.
              </p>
            </section>

            {projects.length === 0 ? (
              <section className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <h2 className="text-3xl font-bold">No projects found.</h2>
                <p className="mt-3 text-zinc-400">
                  Check that you entered the same email used when booking,
                  signing, or starting the project.
                </p>
              </section>
            ) : (
              <section className="grid gap-8">
                {projects.map((project) => {
                  const deliverables = project.media_project_deliverables ?? [];
                  const projectUpdates = getProjectUpdates(project.id);

                  return (
                    <div key={project.id} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                      <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
                            {project.project_number ?? `Project #${project.id}`}
                          </p>
                          <h2 className="mt-3 text-4xl font-bold">{getProjectTitle(project)}</h2>
                          <p className="mt-3 text-zinc-400">
                            {project.client_name || project.client_email}
                          </p>
                        </div>

                        <span className={`rounded-full border px-4 py-2 text-sm capitalize ${statusClass(getProjectStatus(project))}`}>
                          {getProjectStatus(project).replaceAll("_", " ")}
                        </span>
                      </div>

                      <div className="mb-6 grid gap-4 md:grid-cols-4">
                        <Info label="Budget" value={formatMoney(project.budget_amount || project.project_value)} />
                        <Info label="Paid" value={formatMoney(project.amount_paid)} />
                        <Info label="Remaining" value={formatMoney(project.remaining_balance || project.balance_due)} />
                        <Info label="Due" value={formatDate(project.due_date || project.deadline)} />
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
                        <Panel title="Deliverables" count={deliverables.length}>
                          {deliverables.length === 0 ? (
                            <Empty text="No deliverables have been added yet." />
                          ) : (
                            deliverables.map((deliverable: Row) => (
                              <RecordCard
                                key={deliverable.id}
                                title={deliverable.title || `Deliverable #${deliverable.id}`}
                                status={deliverable.status}
                                lines={[deliverable.description, `Due: ${formatDate(deliverable.due_date)}`]}
                              />
                            ))
                          )}
                        </Panel>

                        <Panel title="Project Updates" count={projectUpdates.length}>
                          {projectUpdates.length === 0 ? (
                            <Empty text="No client-visible updates yet." />
                          ) : (
                            projectUpdates.map((update) => (
                              <RecordCard
                                key={update.id}
                                title={update.update_title || `Update #${update.id}`}
                                lines={[update.update_body, formatDateTime(update.created_at)]}
                              />
                            ))
                          )}
                        </Panel>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            <section className="mt-8 grid gap-8 xl:grid-cols-2">
              <Panel title="Contracts" count={contracts.length}>
                {contracts.length === 0 ? (
                  <Empty text="No contracts found." />
                ) : (
                  contracts.map((contract) => (
                    <RecordCard
                      key={contract.id}
                      title={getContractTitle(contract)}
                      status={contract.status || contract.contract_status}
                      lines={[
                        contract.contract_number ? `#${contract.contract_number}` : `Contract #${contract.id}`,
                        `Value: ${formatMoney(contract.project_value || contract.total_amount)}`,
                        `Due: ${formatDate(contract.due_date)}`,
                      ]}
                      href={
                        String(contract.status).toLowerCase() !== "signed" && contract.signing_token
                          ? `/contracts/${contract.signing_token}`
                          : undefined
                      }
                      hrefLabel="Open Contract"
                    />
                  ))
                )}
              </Panel>

              <Panel title="Invoices" count={invoices.length}>
                {invoices.length === 0 ? (
                  <Empty text="No invoices found." />
                ) : (
                  invoices.map((invoice) => (
                    <RecordCard
                      key={invoice.id}
                      title={getInvoiceTitle(invoice)}
                      status={invoice.status || invoice.payment_status}
                      lines={[
                        invoice.invoice_number ? `#${invoice.invoice_number}` : `Invoice #${invoice.id}`,
                        `Total: ${formatMoney(invoice.total_amount || invoice.amount)}`,
                        `Paid: ${formatMoney(invoice.amount_paid)} · Remaining: ${formatMoney(invoice.remaining_balance || invoice.balance_due)}`,
                        `Due: ${formatDate(invoice.due_date)}`,
                      ]}
                      href={String(invoice.status).toLowerCase() !== "paid" ? invoice.payment_link : undefined}
                      hrefLabel="Pay Invoice"
                    />
                  ))
                )}
              </Panel>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <h2 className="mt-3 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-2xl font-bold">{title}</h3>
        <span className="text-sm text-zinc-500">{count} items</span>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function RecordCard({
  title,
  status,
  lines,
  href,
  hrefLabel,
}: {
  title: string;
  status?: unknown;
  lines: unknown[];
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <div className="mt-2 grid gap-1 text-sm text-zinc-400">
            {lines.filter(Boolean).map((line) => (
              <p key={String(line)}>{String(line)}</p>
            ))}
          </div>
        </div>

        {status && (
          <span className={`rounded-full border px-3 py-1 text-xs capitalize ${statusClass(status)}`}>
            {String(status).replaceAll("_", " ")}
          </span>
        )}
      </div>

      {href && (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm text-black transition hover:bg-zinc-200"
        >
          {hrefLabel || "Open"}
        </a>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
      {text}
    </p>
  );
}
