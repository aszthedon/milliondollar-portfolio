"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface CrmClient {
  id: number;
  full_name: string | null;
  email: string;
}

interface MediaProject {
  id: number;
  project_number: string | null;
  crm_client_id: number | null;
  booking_id: number | null;
  invoice_id: number | null;
  contract_id: number | null;
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
  internal_notes: string | null;
  created_at: string;
  updated_at: string | null;
  media_project_deliverables?: MediaProjectDeliverable[];
  media_project_updates?: MediaProjectUpdate[];
}

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

const emptyProjectForm = {
  client_name: "",
  client_email: "",
  project_title: "",
  project_type: "",
  status: "planning",
  priority: "normal",
  description: "",
  budget_amount: "",
  amount_paid: "",
  remaining_balance: "",
  start_date: "",
  due_date: "",
  delivery_link: "",
  internal_notes: "",
  booking_id: "",
  invoice_id: "",
  contract_id: "",
};

const emptyDeliverableForm = {
  title: "",
  description: "",
  status: "not_started",
  due_date: "",
};

const emptyUpdateForm = {
  update_title: "",
  update_body: "",
  visibility: "internal",
};

const projectStatuses = [
  "planning",
  "scheduled",
  "in_progress",
  "review",
  "revision",
  "delivered",
  "completed",
  "on_hold",
  "cancelled",
];

const priorities = [
  "low",
  "normal",
  "high",
  "urgent",
];

const deliverableStatuses = [
  "not_started",
  "in_progress",
  "review",
  "revision",
  "approved",
  "delivered",
  "completed",
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
  if (status === "completed" || status === "delivered") {
    return "border-green-500 bg-green-500/10 text-green-300";
  }

  if (status === "in_progress") {
    return "border-blue-500 bg-blue-500/10 text-blue-300";
  }

  if (status === "review" || status === "revision") {
    return "border-purple-500 bg-purple-500/10 text-purple-300";
  }

  if (status === "on_hold" || status === "scheduled") {
    return "border-yellow-500 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "cancelled") {
    return "border-red-500 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

function priorityClass(priority: string) {
  if (priority === "urgent") {
    return "border-red-500 bg-red-500/10 text-red-300";
  }

  if (priority === "high") {
    return "border-yellow-500 bg-yellow-500/10 text-yellow-300";
  }

  if (priority === "low") {
    return "border-zinc-500 bg-zinc-500/10 text-zinc-300";
  }

  return "border-blue-500 bg-blue-500/10 text-blue-300";
}

function calculateProgress(deliverables: MediaProjectDeliverable[]) {
  if (deliverables.length === 0) {
    return 0;
  }

  const completed = deliverables.filter((deliverable) => {
    return (
      deliverable.status === "completed" ||
      deliverable.status === "delivered" ||
      deliverable.status === "approved"
    );
  }).length;

  return Math.round((completed / deliverables.length) * 100);
}

export default function DashboardProjectsPage() {
  const [projects, setProjects] = useState<MediaProject[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);

  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [deliverableForms, setDeliverableForms] = useState<
    Record<number, typeof emptyDeliverableForm>
  >({});
  const [updateForms, setUpdateForms] = useState<
    Record<number, typeof emptyUpdateForm>
  >({});

  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deliverableLoadingId, setDeliverableLoadingId] =
    useState<number | null>(null);
  const [updateLoadingId, setUpdateLoadingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchProjectData() {
    try {
      setLoading(true);
      setError("");

      const [projectsResult, clientsResult] = await Promise.all([
        supabase
          .from("media_projects")
          .select(
            `
              *,
              media_project_deliverables(*),
              media_project_updates(*)
            `
          )
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

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      if (clientsResult.error) {
        throw clientsResult.error;
      }

      setProjects((projectsResult.data ?? []) as MediaProject[]);
      setClients((clientsResult.data ?? []) as CrmClient[]);
    } catch (error) {
      console.error("PROJECTS FETCH ERROR:", error);
      setError("Projects could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjectData();

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

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const searchable = [
        project.project_number,
        project.project_title,
        project.project_type,
        project.client_name,
        project.client_email,
        project.status,
        project.priority,
        project.description,
        project.internal_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      const matchesClient =
        !clientFilter ||
        normalizeEmail(project.client_email) === normalizeEmail(clientFilter);

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [projects, searchTerm, statusFilter, clientFilter]);

  const summary = useMemo(() => {
    return projects.reduce(
      (totals, project) => {
        totals.total += 1;
        totals.budget += toNumber(project.budget_amount);
        totals.paid += toNumber(project.amount_paid);
        totals.remaining += toNumber(project.remaining_balance);

        if (project.status === "in_progress") {
          totals.inProgress += 1;
        }

        if (project.status === "review" || project.status === "revision") {
          totals.review += 1;
        }

        if (project.status === "delivered" || project.status === "completed") {
          totals.completed += 1;
        }

        if (project.priority === "urgent" || project.priority === "high") {
          totals.highPriority += 1;
        }

        return totals;
      },
      {
        total: 0,
        inProgress: 0,
        review: 0,
        completed: 0,
        highPriority: 0,
        budget: 0,
        paid: 0,
        remaining: 0,
      }
    );
  }, [projects]);

  function clearClientFilter() {
    setClientFilter("");
    setSearchTerm("");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard/projects");
    }
  }

  function updateProjectForm(
    field: keyof typeof emptyProjectForm,
    value: string
  ) {
    setProjectForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateDeliverableForm(
    projectId: number,
    field: keyof typeof emptyDeliverableForm,
    value: string
  ) {
    setDeliverableForms((current) => ({
      ...current,
      [projectId]: {
        ...(current[projectId] ?? emptyDeliverableForm),
        [field]: value,
      },
    }));
  }

  function updateProjectUpdateForm(
    projectId: number,
    field: keyof typeof emptyUpdateForm,
    value: string
  ) {
    setUpdateForms((current) => ({
      ...current,
      [projectId]: {
        ...(current[projectId] ?? emptyUpdateForm),
        [field]: value,
      },
    }));
  }

  function selectClient(email: string) {
    const client = clients.find((item) => item.email === email);

    setProjectForm((current) => ({
      ...current,
      client_email: email,
      client_name: client?.full_name ?? current.client_name,
    }));
  }

  function resetProjectForm() {
    setProjectForm(emptyProjectForm);
    setEditingProjectId(null);
  }

  function editProject(project: MediaProject) {
    setEditingProjectId(project.id);

    setProjectForm({
      client_name: project.client_name ?? "",
      client_email: project.client_email ?? "",
      project_title: project.project_title ?? "",
      project_type: project.project_type ?? "",
      status: project.status ?? "planning",
      priority: project.priority ?? "normal",
      description: project.description ?? "",
      budget_amount: String(project.budget_amount ?? ""),
      amount_paid: String(project.amount_paid ?? ""),
      remaining_balance: String(project.remaining_balance ?? ""),
      start_date: project.start_date ?? "",
      due_date: project.due_date ?? "",
      delivery_link: project.delivery_link ?? "",
      internal_notes: project.internal_notes ?? "",
      booking_id: project.booking_id ? String(project.booking_id) : "",
      invoice_id: project.invoice_id ? String(project.invoice_id) : "",
      contract_id: project.contract_id ? String(project.contract_id) : "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function upsertCrmClient({
    clientEmail,
    clientName,
  }: {
    clientEmail: string;
    clientName: string;
  }) {
    const cleanEmail = clientEmail.trim().toLowerCase();

    if (!cleanEmail) {
      return null;
    }

    const payload: Record<string, unknown> = {
      email: cleanEmail,
      source: "project",
      last_contacted_at: new Date().toISOString(),
    };

    if (clientName.trim()) {
      payload.full_name = clientName.trim();
    }

    const { data, error } = await supabase
      .from("crm_clients")
      .upsert(payload, {
        onConflict: "email",
      })
      .select("id")
      .single();

    if (error) {
      console.error("PROJECT CRM UPSERT ERROR:", error);
      return null;
    }

    return data?.id ?? null;
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingProject(true);
      setError("");
      setSuccess("");

      const clientEmail = projectForm.client_email.trim().toLowerCase();

      if (!clientEmail || !projectForm.project_title.trim()) {
        setError("Client email and project title are required.");
        return;
      }

      const budgetAmount = roundMoney(toNumber(projectForm.budget_amount));
      const amountPaid = roundMoney(toNumber(projectForm.amount_paid));

      const remainingBalance =
        projectForm.remaining_balance.trim() !== ""
          ? roundMoney(toNumber(projectForm.remaining_balance))
          : roundMoney(Math.max(budgetAmount - amountPaid, 0));

      const crmClientId = await upsertCrmClient({
        clientEmail,
        clientName: projectForm.client_name,
      });

      const payload = {
        crm_client_id: crmClientId,
        client_name: projectForm.client_name.trim() || null,
        client_email: clientEmail,
        project_title: projectForm.project_title.trim(),
        project_type: projectForm.project_type.trim() || null,
        status: projectForm.status,
        priority: projectForm.priority,
        description: projectForm.description.trim() || null,
        budget_amount: budgetAmount,
        amount_paid: amountPaid,
        remaining_balance: remainingBalance,
        start_date: projectForm.start_date || null,
        due_date: projectForm.due_date || null,
        delivery_link: projectForm.delivery_link.trim() || null,
        internal_notes: projectForm.internal_notes.trim() || null,
        booking_id: projectForm.booking_id ? Number(projectForm.booking_id) : null,
        invoice_id: projectForm.invoice_id ? Number(projectForm.invoice_id) : null,
        contract_id: projectForm.contract_id
          ? Number(projectForm.contract_id)
          : null,
      };

      if (editingProjectId) {
        const { error } = await supabase
          .from("media_projects")
          .update(payload)
          .eq("id", editingProjectId);

        if (error) {
          throw error;
        }

        setSuccess("Project updated.");
      } else {
        const { error } = await supabase.from("media_projects").insert(payload);

        if (error) {
          throw error;
        }

        setSuccess("Project created.");
      }

      resetProjectForm();
      await fetchProjectData();
    } catch (error) {
      console.error("SAVE PROJECT ERROR:", error);
      setError("Project could not be saved.");
    } finally {
      setSavingProject(false);
    }
  }

  async function updateProjectStatus(project: MediaProject, status: string) {
    try {
      setLoadingId(project.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("media_projects")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      await fetchProjectData();
      setSuccess(`Project marked ${status.replaceAll("_", " ")}.`);
    } catch (error) {
      console.error("PROJECT STATUS ERROR:", error);
      setError("Project status could not be updated.");
    } finally {
      setLoadingId(null);
    }
  }

  async function addDeliverable(project: MediaProject) {
    const form = deliverableForms[project.id] ?? emptyDeliverableForm;

    try {
      setDeliverableLoadingId(project.id);
      setError("");
      setSuccess("");

      if (!form.title.trim()) {
        setError("Deliverable title is required.");
        return;
      }

      const currentDeliverables = project.media_project_deliverables ?? [];

      const { error } = await supabase
        .from("media_project_deliverables")
        .insert({
          project_id: project.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          due_date: form.due_date || null,
          sort_order: currentDeliverables.length,
        });

      if (error) {
        throw error;
      }

      setDeliverableForms((current) => ({
        ...current,
        [project.id]: emptyDeliverableForm,
      }));

      await fetchProjectData();
      setSuccess("Deliverable added.");
    } catch (error) {
      console.error("ADD DELIVERABLE ERROR:", error);
      setError("Deliverable could not be added.");
    } finally {
      setDeliverableLoadingId(null);
    }
  }

  async function updateDeliverableStatus(
    deliverable: MediaProjectDeliverable,
    status: string
  ) {
    try {
      setLoadingId(deliverable.id);
      setError("");
      setSuccess("");

      const completeStatuses = ["approved", "delivered", "completed"];

      const { error } = await supabase
        .from("media_project_deliverables")
        .update({
          status,
          completed_at: completeStatuses.includes(status)
            ? new Date().toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliverable.id);

      if (error) {
        throw error;
      }

      await fetchProjectData();
      setSuccess("Deliverable updated.");
    } catch (error) {
      console.error("DELIVERABLE STATUS ERROR:", error);
      setError("Deliverable could not be updated.");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteDeliverable(deliverable: MediaProjectDeliverable) {
    const confirmed = window.confirm(`Delete ${deliverable.title}?`);

    if (!confirmed) {
      return;
    }

    try {
      setLoadingId(deliverable.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("media_project_deliverables")
        .delete()
        .eq("id", deliverable.id);

      if (error) {
        throw error;
      }

      await fetchProjectData();
      setSuccess("Deliverable deleted.");
    } catch (error) {
      console.error("DELETE DELIVERABLE ERROR:", error);
      setError("Deliverable could not be deleted.");
    } finally {
      setLoadingId(null);
    }
  }

  async function addProjectUpdate(project: MediaProject) {
    const form = updateForms[project.id] ?? emptyUpdateForm;

    try {
      setUpdateLoadingId(project.id);
      setError("");
      setSuccess("");

      if (!form.update_title.trim()) {
        setError("Update title is required.");
        return;
      }

      const { error } = await supabase.from("media_project_updates").insert({
        project_id: project.id,
        update_title: form.update_title.trim(),
        update_body: form.update_body.trim() || null,
        visibility: form.visibility,
      });

      if (error) {
        throw error;
      }

      setUpdateForms((current) => ({
        ...current,
        [project.id]: emptyUpdateForm,
      }));

      await fetchProjectData();
      setSuccess("Project update added.");
    } catch (error) {
      console.error("ADD PROJECT UPDATE ERROR:", error);
      setError("Project update could not be added.");
    } finally {
      setUpdateLoadingId(null);
    }
  }

  async function deleteProject(project: MediaProject) {
    const confirmed = window.confirm(
      `Delete ${project.project_number ?? project.project_title}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingId(project.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("media_projects")
        .delete()
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      await fetchProjectData();
      setSuccess("Project deleted.");
    } catch (error) {
      console.error("DELETE PROJECT ERROR:", error);
      setError("Project could not be deleted.");
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
            Loading Projects...
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
            Project Dashboard
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Manage media projects, client work, deliverables, deadlines,
            production status, delivery links, project balances, and internal
            updates.
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
            onClick={fetchProjectData}
            className="rounded-full bg-white px-5 py-3 text-sm text-black transition hover:bg-zinc-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {clientFilter && (
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-200 md:flex-row md:items-center md:justify-between">
          <p className="break-all">
            Showing projects for{" "}
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

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Projects
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.total}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            In Progress
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.inProgress}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Review
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.review}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Done
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.completed}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            High Priority
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {summary.highPriority}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Budget
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {formatMoney(summary.budget)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Paid
          </p>

          <h2 className="mt-3 text-3xl font-bold text-green-300">
            {formatMoney(summary.paid)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Remaining
          </p>

          <h2 className="mt-3 text-3xl font-bold text-yellow-300">
            {formatMoney(summary.remaining)}
          </h2>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            {editingProjectId ? "Edit" : "Create"}
          </p>

          <h2 className="text-3xl font-bold">
            {editingProjectId ? "Update Project" : "New Project"}
          </h2>

          <form onSubmit={saveProject} className="mt-8 grid gap-4">
            <select
              value={projectForm.client_email}
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
              value={projectForm.client_name}
              onChange={(event) =>
                updateProjectForm("client_name", event.target.value)
              }
              placeholder="Client name"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              type="email"
              value={projectForm.client_email}
              onChange={(event) =>
                updateProjectForm("client_email", event.target.value)
              }
              placeholder="Client email"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              value={projectForm.project_title}
              onChange={(event) =>
                updateProjectForm("project_title", event.target.value)
              }
              placeholder="Project title"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <input
              value={projectForm.project_type}
              onChange={(event) =>
                updateProjectForm("project_type", event.target.value)
              }
              placeholder="Project type, e.g. Website, Video, Event Media"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={projectForm.status}
                onChange={(event) =>
                  updateProjectForm("status", event.target.value)
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              >
                {projectStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>

              <select
                value={projectForm.priority}
                onChange={(event) =>
                  updateProjectForm("priority", event.target.value)
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={projectForm.description}
              onChange={(event) =>
                updateProjectForm("description", event.target.value)
              }
              placeholder="Project description"
              rows={4}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={projectForm.budget_amount}
                onChange={(event) =>
                  updateProjectForm("budget_amount", event.target.value)
                }
                placeholder="Budget amount"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={projectForm.amount_paid}
                onChange={(event) =>
                  updateProjectForm("amount_paid", event.target.value)
                }
                placeholder="Amount paid"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={projectForm.remaining_balance}
                onChange={(event) =>
                  updateProjectForm("remaining_balance", event.target.value)
                }
                placeholder="Remaining balance"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="date"
                value={projectForm.start_date}
                onChange={(event) =>
                  updateProjectForm("start_date", event.target.value)
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                type="date"
                value={projectForm.due_date}
                onChange={(event) =>
                  updateProjectForm("due_date", event.target.value)
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />
            </div>

            <input
              value={projectForm.delivery_link}
              onChange={(event) =>
                updateProjectForm("delivery_link", event.target.value)
              }
              placeholder="Delivery link / Google Drive / final file link"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={projectForm.booking_id}
                onChange={(event) =>
                  updateProjectForm("booking_id", event.target.value)
                }
                placeholder="Booking ID"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                value={projectForm.invoice_id}
                onChange={(event) =>
                  updateProjectForm("invoice_id", event.target.value)
                }
                placeholder="Invoice ID"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                value={projectForm.contract_id}
                onChange={(event) =>
                  updateProjectForm("contract_id", event.target.value)
                }
                placeholder="Contract ID"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />
            </div>

            <textarea
              value={projectForm.internal_notes}
              onChange={(event) =>
                updateProjectForm("internal_notes", event.target.value)
              }
              placeholder="Internal project notes"
              rows={4}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="submit"
                disabled={savingProject}
                className="rounded-full bg-white px-6 py-4 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProject
                  ? "Saving..."
                  : editingProjectId
                    ? "Save Changes"
                    : "Create Project"}
              </button>

              {editingProjectId && (
                <button
                  type="button"
                  onClick={resetProjectForm}
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
              placeholder="Search projects..."
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
            >
              <option value="all">All Statuses</option>

              {projectStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-10 text-center text-zinc-500">
              No projects found.
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredProjects.map((project) => {
                const deliverables = project.media_project_deliverables ?? [];
                const updates = project.media_project_updates ?? [];
                const progress = calculateProgress(deliverables);

                const deliverableForm =
                  deliverableForms[project.id] ?? emptyDeliverableForm;

                const updateForm =
                  updateForms[project.id] ?? emptyUpdateForm;

                return (
                  <div
                    key={project.id}
                    className="rounded-3xl border border-white/10 bg-black/50 p-6"
                  >
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-bold">
                            {project.project_number ?? `Project #${project.id}`}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs capitalize ${statusClass(
                              project.status
                            )}`}
                          >
                            {project.status.replaceAll("_", " ")}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs capitalize ${priorityClass(
                              project.priority
                            )}`}
                          >
                            {project.priority}
                          </span>
                        </div>

                        <p className="mt-3 text-xl font-semibold">
                          {project.project_title}
                        </p>

                        <p className="mt-2 text-sm text-zinc-400">
                          {project.client_name || "No client name"} ·{" "}
                          {project.client_email}
                        </p>

                        {project.project_type && (
                          <p className="mt-2 text-sm text-zinc-500">
                            Type: {project.project_type}
                          </p>
                        )}

                        <div className="mt-5 grid gap-3 md:grid-cols-5">
                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Progress
                            </p>

                            <p className="mt-2 text-2xl font-bold text-blue-300">
                              {progress}%
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Budget
                            </p>

                            <p className="mt-2 text-xl font-bold">
                              {formatMoney(project.budget_amount)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Paid
                            </p>

                            <p className="mt-2 text-xl font-bold text-green-300">
                              {formatMoney(project.amount_paid)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Remaining
                            </p>

                            <p className="mt-2 text-xl font-bold text-yellow-300">
                              {formatMoney(project.remaining_balance)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Due
                            </p>

                            <p className="mt-2 text-sm font-bold">
                              {formatDate(project.due_date)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        {project.description && (
                          <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black p-4 text-sm leading-relaxed text-zinc-300">
                            {project.description}
                          </p>
                        )}

                        {project.delivery_link && (
                          <a
                            href={project.delivery_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 block rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300 underline"
                          >
                            Open Delivery Link
                          </a>
                        )}

                        <div className="mt-6 rounded-3xl border border-white/10 bg-black/60 p-5">
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                              Deliverables
                            </p>

                            <span className="text-sm text-zinc-500">
                              {deliverables.length} items
                            </span>
                          </div>

                          <div className="grid gap-3">
                            {deliverables
                              .slice()
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((deliverable) => (
                                <div
                                  key={deliverable.id}
                                  className="rounded-2xl border border-white/10 bg-black p-4"
                                >
                                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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

                                    <div className="flex flex-wrap gap-2">
                                      <select
                                        value={deliverable.status}
                                        onChange={(event) =>
                                          updateDeliverableStatus(
                                            deliverable,
                                            event.target.value
                                          )
                                        }
                                        className="rounded-full border border-white/10 bg-black px-3 py-2 text-xs"
                                      >
                                        {deliverableStatuses.map((status) => (
                                          <option key={status} value={status}>
                                            {status.replaceAll("_", " ")}
                                          </option>
                                        ))}
                                      </select>

                                      <button
                                        onClick={() =>
                                          deleteDeliverable(deliverable)
                                        }
                                        disabled={loadingId === deliverable.id}
                                        className="rounded-full border border-red-500 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                            {deliverables.length === 0 && (
                              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-zinc-500">
                                No deliverables yet.
                              </p>
                            )}
                          </div>

                          <div className="mt-5 grid gap-3">
                            <input
                              value={deliverableForm.title}
                              onChange={(event) =>
                                updateDeliverableForm(
                                  project.id,
                                  "title",
                                  event.target.value
                                )
                              }
                              placeholder="New deliverable title"
                              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
                            />

                            <textarea
                              value={deliverableForm.description}
                              onChange={(event) =>
                                updateDeliverableForm(
                                  project.id,
                                  "description",
                                  event.target.value
                                )
                              }
                              placeholder="Deliverable description"
                              rows={2}
                              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
                            />

                            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                              <select
                                value={deliverableForm.status}
                                onChange={(event) =>
                                  updateDeliverableForm(
                                    project.id,
                                    "status",
                                    event.target.value
                                  )
                                }
                                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
                              >
                                {deliverableStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="date"
                                value={deliverableForm.due_date}
                                onChange={(event) =>
                                  updateDeliverableForm(
                                    project.id,
                                    "due_date",
                                    event.target.value
                                  )
                                }
                                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
                              />

                              <button
                                onClick={() => addDeliverable(project)}
                                disabled={deliverableLoadingId === project.id}
                                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 rounded-3xl border border-white/10 bg-black/60 p-5">
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                              Updates
                            </p>

                            <span className="text-sm text-zinc-500">
                              {updates.length} notes
                            </span>
                          </div>

                          <div className="grid gap-3">
                            {updates.slice(0, 5).map((update) => (
                              <div
                                key={update.id}
                                className="rounded-2xl border border-white/10 bg-black p-4"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="font-semibold">
                                    {update.update_title}
                                  </h4>

                                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                                    {update.visibility}
                                  </span>
                                </div>

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

                            {updates.length === 0 && (
                              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-zinc-500">
                                No updates yet.
                              </p>
                            )}
                          </div>

                          <div className="mt-5 grid gap-3">
                            <input
                              value={updateForm.update_title}
                              onChange={(event) =>
                                updateProjectUpdateForm(
                                  project.id,
                                  "update_title",
                                  event.target.value
                                )
                              }
                              placeholder="Update title"
                              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
                            />

                            <textarea
                              value={updateForm.update_body}
                              onChange={(event) =>
                                updateProjectUpdateForm(
                                  project.id,
                                  "update_body",
                                  event.target.value
                                )
                              }
                              placeholder="Update notes"
                              rows={2}
                              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
                            />

                            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                              <select
                                value={updateForm.visibility}
                                onChange={(event) =>
                                  updateProjectUpdateForm(
                                    project.id,
                                    "visibility",
                                    event.target.value
                                  )
                                }
                                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
                              >
                                <option value="internal">Internal</option>
                                <option value="client">Client Visible</option>
                              </select>

                              <button
                                onClick={() => addProjectUpdate(project)}
                                disabled={updateLoadingId === project.id}
                                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black disabled:opacity-50"
                              >
                                Add Update
                              </button>
                            </div>
                          </div>
                        </div>

                        {project.internal_notes && (
                          <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black p-4 text-sm text-zinc-400">
                            {project.internal_notes}
                          </p>
                        )}
                      </div>

                      <div className="grid min-w-[220px] gap-3">
                        <button
                          onClick={() => editProject(project)}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            updateProjectStatus(project, "in_progress")
                          }
                          disabled={loadingId === project.id}
                          className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500 hover:text-white disabled:opacity-50"
                        >
                          In Progress
                        </button>

                        <button
                          onClick={() => updateProjectStatus(project, "review")}
                          disabled={loadingId === project.id}
                          className="rounded-full border border-purple-500 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-500 hover:text-white disabled:opacity-50"
                        >
                          Send To Review
                        </button>

                        <button
                          onClick={() =>
                            updateProjectStatus(project, "delivered")
                          }
                          disabled={loadingId === project.id}
                          className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500 hover:text-white disabled:opacity-50"
                        >
                          Delivered
                        </button>

                        <button
                          onClick={() => updateProjectStatus(project, "completed")}
                          disabled={loadingId === project.id}
                          className="rounded-full border border-cyan-500 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500 hover:text-black disabled:opacity-50"
                        >
                          Completed
                        </button>

                        <Link
                          href={`/dashboard/clients?client=${encodeURIComponent(
                            project.client_email
                          )}`}
                          className="rounded-full border border-pink-500 px-4 py-2 text-center text-sm text-pink-300 transition hover:bg-pink-500 hover:text-white"
                        >
                          View Client
                        </Link>

                        <button
                          onClick={() => deleteProject(project)}
                          disabled={loadingId === project.id}
                          className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
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