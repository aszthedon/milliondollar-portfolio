"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

type ClientRow = Record<string, any>;

function getClientName(client: ClientRow) {
  return (
    client.full_name ||
    client.name ||
    client.client_name ||
    client.customer_name ||
    client.email ||
    "Unnamed client"
  );
}

function getClientEmail(client: ClientRow) {
  return client.email || client.customer_email || client.client_email || "";
}

export default function DashboardClientsPage() {
  const siteSlug = getClientSiteSlug();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  async function fetchClients() {
    try {
      setLoading(true);
      setError("");

      const { data, error: clientsError } = await supabase
        .from("crm_clients")
        .select("*")
        .eq("site_slug", siteSlug)
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

      if (clientsError) {
        throw clientsError;
      }

      setClients(data ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Clients could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function regeneratePortalToken(client: ClientRow) {
    try {
      setActionLoading(`token-${client.id}`);
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/client/regenerate-project-portal-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getDashboardAuthHeaders(),
          },
          body: JSON.stringify({
            client_id: client.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Portal token could not regenerate.");
      }

      setSuccess(data.message ?? "Portal token regenerated.");
      await fetchClients();
    } catch (tokenError) {
      setError(
        tokenError instanceof Error
          ? tokenError.message
          : "Portal token could not regenerate."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function bulkGeneratePortalTokens() {
    const confirmed = window.confirm(
      "Generate missing project portal tokens for all eligible clients?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading("bulk-tokens");
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/client/bulk-generate-project-portal-tokens",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getDashboardAuthHeaders(),
          },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Bulk token generation failed.");
      }

      setSuccess(data.message ?? "Bulk project portal tokens generated.");
      await fetchClients();
    } catch (bulkError) {
      setError(
        bulkError instanceof Error
          ? bulkError.message
          : "Bulk token generation failed."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function logPortalFollowUp(client: ClientRow) {
    try {
      setActionLoading(`follow-${client.id}`);
      setError("");
      setSuccess("");

      const response = await fetch("/api/client/log-project-portal-follow-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          client_id: client.id,
          note:
            followUpNote ||
            `Dashboard follow-up logged for ${getClientName(client)}.`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Follow-up could not be logged.");
      }

      setSuccess(data.message ?? "Project portal follow-up logged.");
      setFollowUpNote("");
    } catch (followUpError) {
      setError(
        followUpError instanceof Error
          ? followUpError.message
          : "Project portal follow-up could not be logged."
      );
    } finally {
      setActionLoading("");
    }
  }

  function copyPortalLink(client: ClientRow) {
    const token =
      client.project_portal_token ||
      client.portal_token ||
      client.client_portal_token ||
      "";

    if (!token) {
      setError("This client does not have a portal token yet.");
      return;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const url = `${baseUrl}/client/projects?token=${encodeURIComponent(token)}`;

    navigator.clipboard
      .writeText(url)
      .then(() => setSuccess("Portal link copied."))
      .catch(() => setError("Portal link could not be copied."));
  }

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      const searchableText = [
        getClientName(client),
        getClientEmail(client),
        client.phone,
        client.company,
        client.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !query || searchableText.includes(query);
    });
  }, [clients, search]);

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <AdminUnlockGate title="Clients Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black">Clients</h1>

              <p className="mt-2 text-sm text-zinc-400">
                Manage client records, project portal links, and follow-ups.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={bulkGeneratePortalTokens}
                disabled={actionLoading === "bulk-tokens"}
                className="rounded-full bg-blue-500 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                Bulk Tokens
              </button>

              <button
                type="button"
                onClick={fetchClients}
                disabled={loading}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
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

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients..."
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            />

            <textarea
              value={followUpNote}
              onChange={(event) => setFollowUpNote(event.target.value)}
              placeholder="Optional follow-up note..."
              className="mt-3 min-h-20 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                No clients found.
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                      #{client.id}
                    </span>

                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                      {client.project_portal_token ||
                      client.portal_token ||
                      client.client_portal_token
                        ? "portal ready"
                        : "no token"}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-black">
                    {getClientName(client)}
                  </h2>

                  <div className="mt-2 grid gap-1 text-sm text-zinc-400">
                    <p>{getClientEmail(client) || "No email saved"}</p>
                    <p>{client.phone || "No phone saved"}</p>
                    <p>{client.company || ""}</p>
                  </div>

                  <div className="mt-5 grid gap-2">
                    <button
                      type="button"
                      onClick={() => copyPortalLink(client)}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white"
                    >
                      Copy Portal Link
                    </button>

                    <button
                      type="button"
                      onClick={() => regeneratePortalToken(client)}
                      disabled={actionLoading === `token-${client.id}`}
                      className="rounded-full bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Regenerate Token
                    </button>

                    <button
                      type="button"
                      onClick={() => logPortalFollowUp(client)}
                      disabled={actionLoading === `follow-${client.id}`}
                      className="rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
                    >
                      Log Follow-Up
                    </button>
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
