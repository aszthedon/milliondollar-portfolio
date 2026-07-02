"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectRow = Record<string, any>;
type ClientRow = Record<string, any>;

function getProjectTitle(project: ProjectRow) {
  return (
    project.project_title ||
    project.title ||
    project.name ||
    `Project #${project.id}`
  );
}

function getProjectStatus(project: ProjectRow) {
  return String(project.project_status || project.status || "active").replaceAll(
    "_",
    " "
  );
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

export default function ClientProjectsPage() {
  const [token, setToken] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [client, setClient] = useState<ClientRow | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProjects(nextToken: string) {
    if (!nextToken.trim()) {
      setLoading(false);
      setError("A project portal token is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const params = new URLSearchParams({
        token: nextToken.trim(),
      });

      const response = await fetch(`/api/client/project-portal-token?${params}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Project portal could not be loaded.");
      }

      setClient(data.client ?? null);
      setProjects(data.projects ?? []);

      await fetch("/api/client/log-project-portal-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: nextToken.trim(),
        }),
      }).catch(() => null);

      setSuccess(data.message ?? "Project portal loaded.");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Project portal could not be loaded."
      );
      setClient(null);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  const activeProjects = useMemo(() => {
    return projects.filter((project) =>
      ["active", "in_progress", "review"].includes(
        String(project.project_status || project.status || "").toLowerCase()
      )
    );
  }, [projects]);

  const completedProjects = useMemo(() => {
    return projects.filter((project) =>
      ["completed", "archived"].includes(
        String(project.project_status || project.status || "").toLowerCase()
      )
    );
  }, [projects]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token") ?? "";

    setToken(urlToken);
    setManualToken(urlToken);

    loadProjects(urlToken);
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Million Dollar Ticket Productions
          </p>

          <h1 className="mt-3 text-4xl font-black">Client Project Portal</h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            View project status, timelines, deliverables, and updates connected
            to your booking, invoice, or contract.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && !error && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
            {success}
          </div>
        )}

        {!token && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Portal Token
              </span>

              <input
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
                placeholder="Paste your project portal token"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => loadProjects(manualToken)}
              className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Load Portal
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
            Loading project portal...
          </div>
        ) : (
          <>
            {client && (
              <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-300">
                  Client
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {client.full_name ||
                    client.name ||
                    client.client_name ||
                    client.email ||
                    "Client Portal"}
                </h2>

                <p className="mt-2 text-sm text-zinc-300">
                  {client.email || client.customer_email || client.client_email || ""}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Total Projects" value={projects.length} />
              <Metric label="Active" value={activeProjects.length} />
              <Metric label="Completed" value={completedProjects.length} />
            </div>

            <section className="grid gap-4">
              <h2 className="text-2xl font-black">Active Projects</h2>

              {activeProjects.length > 0 ? (
                activeProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                  No active projects found.
                </div>
              )}
            </section>

            {completedProjects.length > 0 && (
              <section className="grid gap-4">
                <h2 className="text-2xl font-black">Completed Projects</h2>

                {completedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectRow }) {
  const deliverables = Array.isArray(project.deliverables)
    ? project.deliverables
    : [];

  const updates = Array.isArray(project.updates) ? project.updates : [];

  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
          #{project.id}
        </span>

        <span className="rounded-full border border-blue-500/30 px-3 py-1 text-xs text-blue-300">
          {getProjectStatus(project)}
        </span>
      </div>

      <h3 className="mt-3 text-xl font-black">{getProjectTitle(project)}</h3>

      <div className="mt-3 grid gap-1 text-sm text-zinc-400">
        <p>Due: {formatDate(project.due_date || project.deadline)}</p>
        <p>
          Source: {project.source_type || project.created_from || "project"}
        </p>
        {project.description && <p>{project.description}</p>}
      </div>

      {deliverables.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Deliverables
          </p>

          <ul className="mt-3 grid gap-2 text-sm text-zinc-300">
            {deliverables.map((deliverable: unknown, index: number) => (
              <li key={`${String(deliverable)}-${index}`}>
                • {String(deliverable)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {updates.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Updates
          </p>

          <ul className="mt-3 grid gap-2 text-sm text-zinc-300">
            {updates.map((update: unknown, index: number) => (
              <li key={`${String(update)}-${index}`}>• {String(update)}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}