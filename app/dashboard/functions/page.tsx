"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type DashboardFunction = {
  id: number;
  function_key: string;
  label: string;
  description: string | null;
  href: string | null;
  category: string;
  is_enabled: boolean;
  sort_order: number;
};

export default function DashboardFunctionsPage() {
  const siteSlug = getClientSiteSlug();
  const [functions, setFunctions] = useState<DashboardFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...getDashboardAuthHeaders(), ...(init?.headers ?? {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function loadFunctions() {
    try {
      setLoading(true); setError("");
      const data = await api("/api/dashboard/functions");
      setFunctions(data.functions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard functions could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadFunctions(); }, []);

  function updateFunction(id: number, updates: Partial<DashboardFunction>) {
    setFunctions((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  async function saveAll() {
    try {
      setSaving(true); setError(""); setMessage("");
      await api("/api/dashboard/functions", { method: "PUT", body: JSON.stringify({ functions }) });
      setMessage("Dashboard functions saved.");
      await loadFunctions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Dashboard functions could not be saved.");
    } finally { setSaving(false); }
  }

  return (
    <AdminUnlockGate title="Dashboard Functions">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Dashboard Functions</h1>
            <p className="mt-4 max-w-3xl text-zinc-400">Choose which dashboard tools appear for this website. Disable production/project tools for booking-only sites and keep only what the client needs.</p>
          </div>
          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}
          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading dashboard functions...</div> : (
            <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div><h2 className="text-2xl font-black">Visible Dashboard Buttons</h2><p className="mt-2 text-sm text-zinc-400">Toggle tools on/off and change their order.</p></div>
                <button onClick={saveAll} disabled={saving} className="rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">{saving ? "Saving..." : "Save Dashboard Functions"}</button>
              </div>
              {functions.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-[0.5fr_1fr_1fr_0.5fr_0.5fr]">
                  <label className="flex items-center gap-3"><input type="checkbox" checked={item.is_enabled} onChange={(event) => updateFunction(item.id, { is_enabled: event.target.checked })} /><span>Enabled</span></label>
                  <Field label="Label" value={item.label} onChange={(value) => updateFunction(item.id, { label: value })} />
                  <Field label="Description" value={item.description ?? ""} onChange={(value) => updateFunction(item.id, { description: value })} />
                  <Field label="Order" value={String(item.sort_order ?? 100)} onChange={(value) => updateFunction(item.id, { sort_order: Number(value) })} />
                  <div><p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Key</p><p className="mt-2 text-sm text-zinc-400">{item.function_key}</p></div>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2"><span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}
