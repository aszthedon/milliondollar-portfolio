"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

type ContractRow = Record<string, any>;
type TemplateRow = Record<string, any>;
type ClientRow = Record<string, any>;

function getContractTitle(contract: ContractRow) {
  return (
    contract.contract_title ||
    contract.title ||
    contract.template_name ||
    `Contract #${contract.id}`
  );
}

function getClientLabel(client: ClientRow) {
  return (
    client.full_name ||
    client.name ||
    client.client_name ||
    client.customer_name ||
    client.email ||
    client.customer_email ||
    client.client_email ||
    `Client #${client.id}`
  );
}

function getClientEmail(client: ClientRow) {
  return client.email || client.customer_email || client.client_email || "";
}

function getTemplateLabel(template: TemplateRow) {
  return (
    template.template_name ||
    template.title ||
    template.name ||
    `Template #${template.id}`
  );
}

function getTemplateContent(template: TemplateRow) {
  return (
    template.contract_body ||
    template.content ||
    template.body ||
    template.template_body ||
    ""
  );
}

function getContractStatus(contract: ContractRow) {
  return String(
    contract.contract_status || contract.status || "unknown"
  ).replaceAll("_", " ");
}

export default function DashboardContractsPage() {
  const siteSlug = getClientSiteSlug();

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdSigningUrl, setCreatedSigningUrl] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newClientId, setNewClientId] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newContractTitle, setNewContractTitle] = useState("");

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  async function fetchContracts() {
    try {
      setLoading(true);
      setError("");

      const [contractsResult, templatesResult, clientsResult] =
        await Promise.all([
          supabase
            .from("client_contracts")
            .select("*")
            .eq("site_slug", siteSlug)
            .order("created_at", {
              ascending: false,
            })
            .limit(300),

          supabase
            .from("contract_templates")
            .select("*")
            .eq("site_slug", siteSlug)
            .order("created_at", {
              ascending: false,
            })
            .limit(100),

          supabase
            .from("crm_clients")
            .select("*")
            .eq("site_slug", siteSlug)
            .order("created_at", {
              ascending: false,
            })
            .limit(500),
        ]);

      if (contractsResult.error) {
        throw contractsResult.error;
      }

      if (templatesResult.error) {
        throw templatesResult.error;
      }

      if (clientsResult.error) {
        throw clientsResult.error;
      }

      setContracts(contractsResult.data ?? []);
      setTemplates(templatesResult.data ?? []);
      setClients(clientsResult.data ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Contracts could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createTemplate() {
    const templateName = newTemplateName.trim();
    const templateContent = newTemplateContent.trim();

    if (!templateName) {
      setError("Enter a template name.");
      return;
    }

    if (!templateContent) {
      setError("Enter template content/body.");
      return;
    }

    try {
      setActionLoading("create-template");
      setError("");
      setSuccess("");
      setCreatedSigningUrl("");

      const response = await fetch("/api/contracts/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          template_name: templateName,
          title: templateName,
          contract_body: templateContent,
          content: templateContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Contract template could not be created.");
      }

      setSuccess(data.message ?? "Contract template created.");
      setNewTemplateName("");
      setNewTemplateContent("");
      setShowTemplateForm(false);

      await fetchContracts();

      if (data.template?.id) {
        setNewTemplateId(String(data.template.id));
      }
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Contract template could not be created."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function createContract() {
    const safeClientId = String(newClientId ?? "").trim();
    const safeTemplateId = String(newTemplateId ?? "").trim();

    if (!safeClientId) {
      setError("Choose a client before creating a contract.");
      return;
    }

    if (!safeTemplateId) {
      setError("Choose a contract template before creating a contract.");
      return;
    }

    try {
      setActionLoading("create-contract");
      setError("");
      setSuccess("");
      setCreatedSigningUrl("");

      const response = await fetch("/api/contracts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          client_id: safeClientId,
          template_id: safeTemplateId,
          contract_title: newContractTitle.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Contract could not be created.");
      }

      setSuccess(data.message ?? "Contract created.");
      setCreatedSigningUrl(data.signing_url ?? data.contract?.signing_url ?? "");
      setNewClientId("");
      setNewTemplateId("");
      setNewContractTitle("");

      await fetchContracts();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Contract could not be created."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function createProjectFromContract(contract: ContractRow) {
    try {
      setActionLoading(`project-${contract.id}`);
      setError("");
      setSuccess("");
      setCreatedSigningUrl("");

      const response = await fetch("/api/projects/create-from-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          contract_id: contract.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Project could not be created.");
      }

      setSuccess(data.message ?? "Project created from contract.");
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

  async function copySigningLink(contract: ContractRow) {
    const signingUrl = String(contract.signing_url ?? "").trim();

    if (!signingUrl) {
      setError("This contract does not have a signing link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(signingUrl);
      setSuccess("Signing link copied.");
      setError("");
    } catch {
      setError("Signing link could not be copied.");
    }
  }

  async function copyCreatedSigningLink() {
    if (!createdSigningUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdSigningUrl);
      setSuccess("Signing link copied.");
    } catch {
      setError("Signing link could not be copied.");
    }
  }

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const status = String(
        contract.contract_status || contract.status || ""
      ).toLowerCase();

      const matchesStatus = statusFilter === "all" || status === statusFilter;

      const searchableText = [
        getContractTitle(contract),
        contract.client_name,
        contract.client_email,
        contract.signer_name,
        contract.signer_email,
        contract.contract_status,
        contract.status,
        contract.template_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [contracts, search, statusFilter]);

  const selectedTemplate = useMemo(() => {
    return templates.find(
      (template) => String(template.id) === String(newTemplateId)
    );
  }, [templates, newTemplateId]);

  useEffect(() => {
    fetchContracts();
  }, []);

  return (
    <AdminUnlockGate title="Contracts Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black">Contracts</h1>

              <p className="mt-2 text-sm text-zinc-400">
                Create templates, generate contracts, copy signing links, and
                create projects from agreements.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchContracts}
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

          {success && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
              {success}

              {createdSigningUrl && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={createdSigningUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-green-500 px-4 py-2 text-xs font-black text-black"
                  >
                    Open Signing Link
                  </a>

                  <button
                    type="button"
                    onClick={copyCreatedSigningLink}
                    className="rounded-full border border-green-500/30 px-4 py-2 text-xs font-black text-green-200"
                  >
                    Copy Signing Link
                  </button>
                </div>
              )}
            </div>
          )}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black">Contract Templates</h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Create reusable agreement templates for production work.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTemplateForm((value) => !value)}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-white"
              >
                {showTemplateForm ? "Close Template Form" : "Create Template"}
              </button>
            </div>

            {showTemplateForm && (
              <div className="mt-5 grid gap-3">
                <input
                  value={newTemplateName}
                  onChange={(event) => setNewTemplateName(event.target.value)}
                  placeholder="Template name, e.g. Standard Production Agreement"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
                />

                <textarea
                  value={newTemplateContent}
                  onChange={(event) =>
                    setNewTemplateContent(event.target.value)
                  }
                  placeholder="Template content/body..."
                  className="min-h-48 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm leading-6 text-white outline-none"
                />

                <button
                  type="button"
                  onClick={createTemplate}
                  disabled={actionLoading === "create-template"}
                  className="w-fit rounded-full bg-blue-500 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {actionLoading === "create-template"
                    ? "Creating Template..."
                    : "Save Template"}
                </button>
              </div>
            )}

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {templates.length === 0 ? (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  No contract templates found yet.
                </div>
              ) : (
                templates.slice(0, 6).map((template) => (
                  <div
                    key={String(template.id)}
                    className="rounded-2xl border border-white/10 bg-black p-4"
                  >
                    <p className="font-bold text-white">
                      {getTemplateLabel(template)}
                    </p>

                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">
                      {getTemplateContent(template) || "No template body saved."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4">
              <h2 className="text-xl font-black">Create Contract</h2>

              <p className="mt-2 text-sm text-zinc-400">
                Choose a client and template, then generate a signing link.
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
              <select
                value={newClientId}
                onChange={(event) => setNewClientId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">
                  {clients.length > 0 ? "Choose client" : "No clients found"}
                </option>

                {clients.map((client) => (
                  <option key={String(client.id)} value={String(client.id)}>
                    {getClientLabel(client)}
                    {getClientEmail(client)
                      ? ` — ${getClientEmail(client)}`
                      : ""}
                  </option>
                ))}
              </select>

              <select
                value={newTemplateId}
                onChange={(event) => setNewTemplateId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">
                  {templates.length > 0
                    ? "Choose template"
                    : "No templates found"}
                </option>

                {templates.map((template) => (
                  <option key={String(template.id)} value={String(template.id)}>
                    {getTemplateLabel(template)}
                  </option>
                ))}
              </select>

              <input
                value={newContractTitle}
                onChange={(event) => setNewContractTitle(event.target.value)}
                placeholder="Optional contract title"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
              />

              <button
                type="button"
                onClick={createContract}
                disabled={
                  actionLoading === "create-contract" ||
                  !newClientId ||
                  !newTemplateId
                }
                className="rounded-full bg-green-500 px-5 py-3 text-sm font-black text-black disabled:opacity-60"
              >
                {actionLoading === "create-contract" ? "Creating..." : "Create"}
              </button>
            </div>

            {selectedTemplate && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Selected Template Preview
                </p>

                <p className="mt-2 font-bold text-white">
                  {getTemplateLabel(selectedTemplate)}
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                  {getTemplateContent(selectedTemplate) ||
                    "No template content saved."}
                </p>
              </div>
            )}

            {(clients.length === 0 || templates.length === 0) && !loading && (
              <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                {clients.length === 0 && (
                  <p>
                    No clients were found in <strong>crm_clients</strong>. Add a
                    client before creating a contract.
                  </p>
                )}

                {templates.length === 0 && (
                  <p className={clients.length === 0 ? "mt-2" : ""}>
                    No templates were found in {" "}
                    <strong>contract_templates</strong>. Create one above before
                    generating a contract.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contracts..."
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
              <option value="viewed">Viewed</option>
              <option value="signed">Signed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </section>

          <section className="grid gap-4">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                Loading contracts...
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                No contracts found.
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <div
                  key={String(contract.id)}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          #{String(contract.id)}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-zinc-300">
                          {getContractStatus(contract)}
                        </span>

                        {contract.invoice_id && (
                          <span className="rounded-full border border-blue-500/30 px-3 py-1 text-xs text-blue-300">
                            Invoice #{String(contract.invoice_id)}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-xl font-black">
                        {getContractTitle(contract)}
                      </h2>

                      <div className="mt-2 grid gap-1 text-sm text-zinc-400">
                        <p>
                          {contract.client_name ||
                            contract.client_email ||
                            "No client label"}
                        </p>

                        {contract.client_email && (
                          <p>{String(contract.client_email)}</p>
                        )}

                        <p>
                          Signed: {" "}
                          {contract.signed_at
                            ? new Date(contract.signed_at).toLocaleString()
                            : "Not signed"}
                        </p>

                        {contract.sent_at && (
                          <p>
                            Sent: {" "}
                            {new Date(contract.sent_at).toLocaleString()}
                          </p>
                        )}

                        {contract.signing_url && (
                          <a
                            href={String(contract.signing_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="w-fit text-blue-300 underline"
                          >
                            Open Signing Link
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:flex sm:flex-wrap xl:grid xl:min-w-48">
                      <button
                        type="button"
                        onClick={() => copySigningLink(contract)}
                        disabled={!contract.signing_url}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Copy Link
                      </button>

                      <button
                        type="button"
                        onClick={() => createProjectFromContract(contract)}
                        disabled={actionLoading === `project-${contract.id}`}
                        className="rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
                      >
                        {actionLoading === `project-${contract.id}`
                          ? "Creating..."
                          : "Make Project"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </main>
    </AdminUnlockGate>
  );
}
