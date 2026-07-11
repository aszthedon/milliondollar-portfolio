"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type SitePage = {
  id: number;
  title: string;
  slug: string;
  page_type: string;
  status: string;
  sort_order: number;
  show_in_header: boolean;
  show_in_footer: boolean;
  opens_new_tab: boolean;
  seo_title: string | null;
  seo_description: string | null;
  hero_eyebrow: string | null;
  hero_heading: string | null;
  hero_description: string | null;
  body_content: string | null;
  cta_label: string | null;
  cta_href: string | null;
  layout_style: string;
};

const blankPage: Omit<SitePage, "id"> = {
  title: "",
  slug: "",
  page_type: "custom",
  status: "published",
  sort_order: 100,
  show_in_header: true,
  show_in_footer: false,
  opens_new_tab: false,
  seo_title: "",
  seo_description: "",
  hero_eyebrow: "",
  hero_heading: "",
  hero_description: "",
  body_content: "",
  cta_label: "",
  cta_href: "",
  layout_style: "standard",
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function PagesDashboard() {
  const siteSlug = getClientSiteSlug();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [form, setForm] = useState(blankPage);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...getDashboardAuthHeaders(), ...(init?.headers ?? {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function loadPages() {
    try {
      setLoading(true); setError("");
      const data = await api("/api/dashboard/pages");
      setPages(data.pages ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Pages could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadPages(); }, []);

  function updateForm<K extends keyof typeof blankPage>(key: K, value: (typeof blankPage)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePage(id: number, updates: Partial<SitePage>) {
    setPages((current) => current.map((page) => page.id === id ? { ...page, ...updates } : page));
  }

  async function createPage() {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/pages", { method: "POST", body: JSON.stringify({ ...form, slug: form.slug || slugify(form.title), hero_heading: form.hero_heading || form.title }) });
      setForm(blankPage);
      setMessage("Page created.");
      await loadPages();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Page could not be created.");
    } finally { setBusy(false); }
  }

  async function savePage(page: SitePage) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/pages", { method: "PUT", body: JSON.stringify(page) });
      setMessage("Page saved.");
      await loadPages();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Page could not be saved.");
    } finally { setBusy(false); }
  }

  async function deletePage(id: number) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api(`/api/dashboard/pages?id=${id}`, { method: "DELETE" });
      setMessage("Page deleted.");
      await loadPages();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Page could not be deleted.");
    } finally { setBusy(false); }
  }

  return (
    <AdminUnlockGate title="Pages">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Website Pages</h1>
            <p className="mt-4 max-w-3xl text-zinc-400">Add, edit, delete, publish, and control header/footer visibility for individual website pages.</p>
          </div>
          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black">Create Page</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Page Title" value={form.title} onChange={(value) => { updateForm("title", value); if (!form.slug) updateForm("slug", slugify(value)); }} />
              <Field label="Page Slug" value={form.slug} onChange={(value) => updateForm("slug", slugify(value))} />
              <Select label="Page Type" value={form.page_type} onChange={(value) => updateForm("page_type", value)} options={[["custom", "Custom Text Page"], ["services", "Services Page"], ["booking", "Booking Page"], ["gallery", "Gallery Page"], ["contact", "Contact Page"]]} />
              <Select label="Status" value={form.status} onChange={(value) => updateForm("status", value)} options={[["published", "Published"], ["draft", "Draft"]]} />
              <Field label="Hero Eyebrow" value={form.hero_eyebrow ?? ""} onChange={(value) => updateForm("hero_eyebrow", value)} />
              <Field label="Hero Heading" value={form.hero_heading ?? ""} onChange={(value) => updateForm("hero_heading", value)} />
              <TextArea label="Hero Description" value={form.hero_description ?? ""} onChange={(value) => updateForm("hero_description", value)} />
              <TextArea label="Page Body Text" value={form.body_content ?? ""} onChange={(value) => updateForm("body_content", value)} />
              <Field label="CTA Label" value={form.cta_label ?? ""} onChange={(value) => updateForm("cta_label", value)} />
              <Field label="CTA Link" value={form.cta_href ?? ""} onChange={(value) => updateForm("cta_href", value)} />
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black p-3"><input type="checkbox" checked={form.show_in_header} onChange={(event) => updateForm("show_in_header", event.target.checked)} /> Show in Header</label>
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black p-3"><input type="checkbox" checked={form.show_in_footer} onChange={(event) => updateForm("show_in_footer", event.target.checked)} /> Show in Footer</label>
            </div>
            <button onClick={createPage} disabled={busy} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Page</button>
          </section>

          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading pages...</div> : (
            <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-black">Existing Pages</h2>
              {pages.map((page) => (
                <div key={page.id} className="rounded-2xl border border-white/10 bg-black p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div><h3 className="text-xl font-black">{page.title}</h3><Link href={`/${page.slug}`} className="text-sm text-zinc-400" target="_blank">/{page.slug}</Link></div>
                    <div className="flex gap-2"><button onClick={() => savePage(page)} disabled={busy} className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-400">Save</button><button onClick={() => deletePage(page.id)} disabled={busy} className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400">Delete</button></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Title" value={page.title} onChange={(value) => updatePage(page.id, { title: value })} />
                    <Field label="Slug" value={page.slug} onChange={(value) => updatePage(page.id, { slug: slugify(value) })} />
                    <Select label="Page Type" value={page.page_type} onChange={(value) => updatePage(page.id, { page_type: value })} options={[["custom", "Custom Text Page"], ["services", "Services Page"], ["booking", "Booking Page"], ["gallery", "Gallery Page"], ["contact", "Contact Page"]]} />
                    <Select label="Status" value={page.status} onChange={(value) => updatePage(page.id, { status: value })} options={[["published", "Published"], ["draft", "Draft"]]} />
                    <Field label="Sort Order" value={String(page.sort_order ?? 100)} onChange={(value) => updatePage(page.id, { sort_order: Number(value) })} />
                    <Field label="Hero Eyebrow" value={page.hero_eyebrow ?? ""} onChange={(value) => updatePage(page.id, { hero_eyebrow: value })} />
                    <Field label="Hero Heading" value={page.hero_heading ?? ""} onChange={(value) => updatePage(page.id, { hero_heading: value })} />
                    <TextArea label="Hero Description" value={page.hero_description ?? ""} onChange={(value) => updatePage(page.id, { hero_description: value })} />
                    <TextArea label="Page Body Text" value={page.body_content ?? ""} onChange={(value) => updatePage(page.id, { body_content: value })} />
                    <Field label="CTA Label" value={page.cta_label ?? ""} onChange={(value) => updatePage(page.id, { cta_label: value })} />
                    <Field label="CTA Link" value={page.cta_href ?? ""} onChange={(value) => updatePage(page.id, { cta_href: value })} />
                    <Field label="SEO Title" value={page.seo_title ?? ""} onChange={(value) => updatePage(page.id, { seo_title: value })} />
                    <TextArea label="SEO Description" value={page.seo_description ?? ""} onChange={(value) => updatePage(page.id, { seo_description: value })} />
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><input type="checkbox" checked={page.show_in_header} onChange={(event) => updatePage(page.id, { show_in_header: event.target.checked })} /> Show in Header</label>
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><input type="checkbox" checked={page.show_in_footer} onChange={(event) => updatePage(page.id, { show_in_footer: event.target.checked })} /> Show in Footer</label>
                  </div>
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
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 md:col-span-2"><span className="text-sm text-zinc-400">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
