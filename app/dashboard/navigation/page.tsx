"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type NavLink = {
  id: number;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  opens_new_tab: boolean;
};

type Settings = {
  seo_title: string;
  seo_description: string;
  navbar_brand_text: string;
  show_policies_link: boolean;
};

const blankLink = {
  label: "",
  href: "",
  sort_order: "10",
  is_visible: true,
  opens_new_tab: false,
};

const blankSettings: Settings = {
  seo_title: "",
  seo_description: "",
  navbar_brand_text: "",
  show_policies_link: true,
};

export default function DashboardNavigationPage() {
  const siteSlug = getClientSiteSlug();
  const [links, setLinks] = useState<NavLink[]>([]);
  const [newLink, setNewLink] = useState(blankLink);
  const [settings, setSettings] = useState<Settings>(blankSettings);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...getDashboardAuthHeaders(),
        ...(init?.headers ?? {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function loadNavigation() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/dashboard/navigation");
      setLinks(data.links ?? []);
      setSettings({ ...blankSettings, ...(data.settings ?? {}) });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Navigation could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNavigation();
  }, []);

  function updateLocal(id: number, updates: Partial<NavLink>) {
    setLinks((current) => current.map((link) => (link.id === id ? { ...link, ...updates } : link)));
  }

  async function createLink() {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await api("/api/dashboard/navigation", {
        method: "POST",
        body: JSON.stringify({ ...newLink, sort_order: Number(newLink.sort_order) }),
      });
      setNewLink(blankLink);
      setMessage("Navigation link created.");
      await loadNavigation();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Navigation link could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLink(link: NavLink) {
    try {
      setActiveId(link.id);
      setError("");
      setMessage("");
      await api("/api/dashboard/navigation", { method: "PUT", body: JSON.stringify(link) });
      setMessage("Navigation link saved.");
      await loadNavigation();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Navigation link could not be saved.");
    } finally {
      setActiveId(null);
    }
  }

  async function deleteLink(id: number) {
    try {
      setActiveId(id);
      setError("");
      setMessage("");
      await api(`/api/dashboard/navigation?id=${id}`, { method: "DELETE" });
      setMessage("Navigation link deleted.");
      await loadNavigation();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Navigation link could not be deleted.");
    } finally {
      setActiveId(null);
    }
  }

  async function saveSettings() {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await api("/api/dashboard/navigation", { method: "PATCH", body: JSON.stringify(settings) });
      setMessage("Navbar and tab settings saved.");
      await loadNavigation();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Navigation settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminUnlockGate title="Navigation Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Navigation & Tab Name</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">Edit navbar links, brand text, and browser tab SEO title without touching code.</p>
          </div>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black">Navbar / Browser Tab Settings</h2>
            <Field label="Navbar Brand Text" value={settings.navbar_brand_text ?? ""} onChange={(value) => setSettings((current) => ({ ...current, navbar_brand_text: value }))} />
            <Field label="Browser Tab Name / SEO Title" value={settings.seo_title ?? ""} onChange={(value) => setSettings((current) => ({ ...current, seo_title: value }))} />
            <TextArea label="SEO Description" value={settings.seo_description ?? ""} onChange={(value) => setSettings((current) => ({ ...current, seo_description: value }))} />
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={settings.show_policies_link ?? true} onChange={(event) => setSettings((current) => ({ ...current, show_policies_link: event.target.checked }))} /><span>Show Policies link</span></label>
            <button type="button" onClick={saveSettings} disabled={busy} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Save Navbar / Tab Settings</button>
          </section>

          <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black">Add Navbar Link</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Label" value={newLink.label} onChange={(value) => setNewLink((current) => ({ ...current, label: value }))} />
              <Field label="Href" value={newLink.href} onChange={(value) => setNewLink((current) => ({ ...current, href: value }))} />
              <Field label="Sort Order" type="number" value={newLink.sort_order} onChange={(value) => setNewLink((current) => ({ ...current, sort_order: value }))} />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={newLink.is_visible} onChange={(event) => setNewLink((current) => ({ ...current, is_visible: event.target.checked }))} /><span>Visible</span></label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={newLink.opens_new_tab} onChange={(event) => setNewLink((current) => ({ ...current, opens_new_tab: event.target.checked }))} /><span>Open in new tab</span></label>
            </div>
            <button type="button" onClick={createLink} disabled={busy} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Link</button>
          </section>

          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading navigation...</div> : <section className="grid gap-5">{links.map((link) => <div key={link.id} className="rounded-3xl border border-white/10 bg-white/5 p-6"><div className="grid gap-4 md:grid-cols-2"><Field label="Label" value={link.label} onChange={(value) => updateLocal(link.id, { label: value })} /><Field label="Href" value={link.href} onChange={(value) => updateLocal(link.id, { href: value })} /><Field label="Sort Order" type="number" value={String(link.sort_order)} onChange={(value) => updateLocal(link.id, { sort_order: Number(value) })} /><label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={link.is_visible} onChange={(event) => updateLocal(link.id, { is_visible: event.target.checked })} /><span>Visible</span></label><label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={link.opens_new_tab} onChange={(event) => updateLocal(link.id, { opens_new_tab: event.target.checked })} /><span>Open in new tab</span></label></div><div className="mt-5 flex flex-wrap gap-3"><button disabled={activeId === link.id} onClick={() => saveLink(link)} className="rounded-full border border-green-500 px-5 py-2 text-green-400 disabled:opacity-50">Save Link</button><button disabled={activeId === link.id} onClick={() => deleteLink(link.id)} className="rounded-full border border-red-500 px-5 py-2 text-red-500 disabled:opacity-50">Delete Link</button></div></div>)}</section>}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}
