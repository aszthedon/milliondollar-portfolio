"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { supabase } from "@/lib/supabase";

type ProjectRow = Record<string, any>;

function getProjectTitle(project: ProjectRow) {
  return (
    project.project_title ||
    project.title ||
    project.name ||
    `Project #${project.id}`
  );
}

export default function DashboardProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function fetchProjects() {
    try {
      setLoading(true);
      setError("");

      const { data, error: projectsError } = await supabase
        .from("media_projects")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

      if (projectsError) {
        throw projectsError;
      }

      setProjects(data ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Projects could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateProjectStatus(project: ProjectRow, status: string) {
    try {
      setActionLoading(`${status}-${project.id}`);
      setError("");
      setSuccess("");

      const { error: updateError } = await supabase
        .from("media_projects")
        .update({
          project_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(`Project marked ${status.replaceAll("_", " ")}.`);
      await fetchProjects();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Project status could not be updated."
      );
    } finally {
      setActionLoading("");
    }
  }

  function copyPortalLink(project: ProjectRow) {
    const token =
      project.project_portal_token ||
      project.portal_token ||
      project.client_portal_token ||
      "";

    if (!token) {
      setError("This project does not have a portal token.");
      return;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const url = `${baseUrl}/client/projects?token=${encodeURIComponent(token)}`;

    navigator.clipboard
      .writeText(url)
      .then(() => setSuccess("Project portal link copied."))
      .catch(() => setError("Project portal link could not be copied."));
  }

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const status = String(
        project.project_status || project.status || ""
      ).toLowerCase();

      const matchesStatus = statusFilter === "all" || status === statusFilter;

      const searchableText = [
        getProjectTitle(project),
        project.client_name,
        project.client_email,
        project.project_status,
        project.status,
        project.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [projects, search, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <AdminUnlockGate title="Projects Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black">Projects</h1>

              <p className="mt-2 text-sm text-zinc-400">
                Track media projects, client portals, deliverables, and review
                status.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchProjects}
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
              placeholder="Search projects..."
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                Loading projects...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                No projects found.
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          #{project.id}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          {String(
                            project.project_status ||
                              project.status ||
                              "unknown"
                          ).replaceAll("_", " ")}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black">
                        {getProjectTitle(project)}
                      </h2>

                      <div className="mt-2 grid gap-1 text-sm text-zinc-400">
                        <p>
                          {project.client_name ||
                            project.client_email ||
                            "No client label"}
                        </p>
                        <p>
                          Due:{" "}
                          {project.due_date ||
                            project.deadline ||
                            "No due date"}
                        </p>
                        <p>
                          Source:{" "}
                          {project.source_type ||
                            project.created_from ||
                            "manual/unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:flex sm:flex-wrap xl:grid xl:min-w-52">
                      <button
                        type="button"
                        onClick={() => copyPortalLink(project)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold"
                      >
                        Copy Portal
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateProjectStatus(project, "in_progress")
                        }
                        disabled={
                          actionLoading === `in_progress-${project.id}`
                        }
                        className="rounded-full bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        In Progress
                      </button>

                      <button
                        type="button"
                        onClick={() => updateProjectStatus(project, "review")}
                        disabled={actionLoading === `review-${project.id}`}
                        className="rounded-full bg-purple-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Review
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateProjectStatus(project, "completed")
                        }
                        disabled={
                          actionLoading === `completed-${project.id}`
                        }
                        className="rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
                      >
                        Complete
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