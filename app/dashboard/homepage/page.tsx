"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

const allSections = [
  ["hero", "Hero"],
  ["services", "Services"],
  ["booking", "Booking"],
  ["gallery", "Gallery"],
  ["cta", "Call To Action"],
  ["contact", "Contact"],
] as const;

type FormState = {
  sectionOrder: string[];
  showHero: boolean;
  showServices: boolean;
  showBooking: boolean;
  showGallery: boolean;
  showCta: boolean;
  showContact: boolean;
  heroLayout: string;
  servicesLayout: string;
  homeEyebrow: string;
  heroHeading: string;
  heroDescription: string;
  servicesHeading: string;
  servicesDescription: string;
  bookingHeading: string;
  bookingDescription: string;
  galleryHeading: string;
  galleryDescription: string;
  ctaHeading: string;
  ctaDescription: string;
  contactHeading: string;
  contactDescription: string;
};

const blankForm: FormState = {
  sectionOrder: allSections.map(([key]) => key),
  showHero: true,
  showServices: true,
  showBooking: true,
  showGallery: true,
  showCta: true,
  showContact: true,
  heroLayout: "centered",
  servicesLayout: "cards",
  homeEyebrow: "Book Now",
  heroHeading: "",
  heroDescription: "",
  servicesHeading: "Services",
  servicesDescription: "",
  bookingHeading: "Reserve Your Spot",
  bookingDescription: "",
  galleryHeading: "Gallery",
  galleryDescription: "",
  ctaHeading: "",
  ctaDescription: "",
  contactHeading: "",
  contactDescription: "",
};

function keyToToggle(key: string): keyof Pick<FormState, "showHero" | "showServices" | "showBooking" | "showGallery" | "showCta" | "showContact"> {
  if (key === "hero") return "showHero";
  if (key === "services") return "showServices";
  if (key === "booking") return "showBooking";
  if (key === "gallery") return "showGallery";
  if (key === "cta") return "showCta";
  return "showContact";
}

export default function HomepageEditorPage() {
  const siteSlug = getClientSiteSlug();
  const [form, setForm] = useState<FormState>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/dashboard/homepage");
      const settings = data.settings ?? {};
      const layout = settings.homepage_layout_settings ?? {};
      setForm({
        sectionOrder: Array.isArray(layout.sectionOrder) ? layout.sectionOrder : blankForm.sectionOrder,
        showHero: layout.showHero ?? true,
        showServices: layout.showServices ?? true,
        showBooking: layout.showBooking ?? true,
        showGallery: layout.showGallery ?? true,
        showCta: layout.showCta ?? true,
        showContact: layout.showContact ?? true,
        heroLayout: layout.heroLayout ?? "centered",
        servicesLayout: layout.servicesLayout ?? "cards",
        homeEyebrow: settings.home_eyebrow ?? "Book Now",
        heroHeading: settings.hero_heading ?? "",
        heroDescription: settings.hero_description ?? "",
        servicesHeading: settings.home_services_heading ?? "Services",
        servicesDescription: settings.home_services_description ?? "",
        bookingHeading: settings.home_booking_heading ?? "Reserve Your Spot",
        bookingDescription: settings.home_booking_description ?? "",
        galleryHeading: settings.home_gallery_heading ?? "Gallery",
        galleryDescription: settings.home_gallery_description ?? "",
        ctaHeading: settings.cta_heading ?? "",
        ctaDescription: settings.cta_description ?? "",
        contactHeading: settings.home_contact_heading ?? "",
        contactDescription: settings.home_contact_description ?? "",
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Homepage settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSettings(); }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function moveSection(index: number, direction: "up" | "down") {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= form.sectionOrder.length) return;
    const next = [...form.sectionOrder];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    update("sectionOrder", next);
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await api("/api/dashboard/homepage", { method: "POST", body: JSON.stringify(form) });
      setMessage("Homepage appearance saved. Refresh the public site to see changes.");
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Homepage settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminUnlockGate title="Homepage Appearance">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Homepage Appearance</h1>
            <p className="mt-4 max-w-3xl text-zinc-400">Control what appears on the homepage, the order sections appear in, and the headings/copy for each visible section.</p>
          </div>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading homepage settings...</div> : (
            <>
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Section Order & Visibility</h2>
                <p className="mt-2 text-sm text-zinc-400">Move sections up/down and turn them on or off.</p>
                <div className="mt-5 grid gap-3">
                  {form.sectionOrder.map((key, index) => {
                    const label = allSections.find(([sectionKey]) => sectionKey === key)?.[1] ?? key;
                    const toggle = keyToToggle(key);
                    return (
                      <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black p-4">
                        <div>
                          <p className="text-lg font-black">{index + 1}. {label}</p>
                          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={Boolean(form[toggle])} onChange={(event) => update(toggle, event.target.checked)} /> Show this section</label>
                        </div>
                        <div className="flex gap-2"><button type="button" disabled={index === 0} onClick={() => moveSection(index, "up")} className="rounded-full border border-white/10 px-4 py-2 text-sm font-black disabled:opacity-40">Move Up</button><button type="button" disabled={index === form.sectionOrder.length - 1} onClick={() => moveSection(index, "down")} className="rounded-full border border-white/10 px-4 py-2 text-sm font-black disabled:opacity-40">Move Down</button></div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Layout Style</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Select label="Hero Layout" value={form.heroLayout} onChange={(value) => update("heroLayout", value)} options={[["centered", "Centered"], ["split", "Split Text + CTA"], ["minimal", "Minimal"]]} />
                  <Select label="Services Layout" value={form.servicesLayout} onChange={(value) => update("servicesLayout", value)} options={[["cards", "Cards"], ["compact", "Compact List"], ["featured", "Featured Grid"]]} />
                </div>
              </section>

              <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Homepage Text</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Hero Eyebrow" value={form.homeEyebrow} onChange={(value) => update("homeEyebrow", value)} />
                  <Field label="Hero Heading" value={form.heroHeading} onChange={(value) => update("heroHeading", value)} />
                  <TextArea label="Hero Description" value={form.heroDescription} onChange={(value) => update("heroDescription", value)} />
                  <Field label="Services Heading" value={form.servicesHeading} onChange={(value) => update("servicesHeading", value)} />
                  <TextArea label="Services Description" value={form.servicesDescription} onChange={(value) => update("servicesDescription", value)} />
                  <Field label="Booking Heading" value={form.bookingHeading} onChange={(value) => update("bookingHeading", value)} />
                  <TextArea label="Booking Description" value={form.bookingDescription} onChange={(value) => update("bookingDescription", value)} />
                  <Field label="Gallery Heading" value={form.galleryHeading} onChange={(value) => update("galleryHeading", value)} />
                  <TextArea label="Gallery Description" value={form.galleryDescription} onChange={(value) => update("galleryDescription", value)} />
                  <Field label="CTA Heading" value={form.ctaHeading} onChange={(value) => update("ctaHeading", value)} />
                  <TextArea label="CTA Description" value={form.ctaDescription} onChange={(value) => update("ctaDescription", value)} />
                  <Field label="Contact Heading" value={form.contactHeading} onChange={(value) => update("contactHeading", value)} />
                  <TextArea label="Contact Description" value={form.contactDescription} onChange={(value) => update("contactDescription", value)} />
                </div>
                <button type="button" onClick={saveSettings} disabled={saving} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">{saving ? "Saving..." : "Save Homepage Appearance"}</button>
              </section>
            </>
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
  return <label className="grid gap-2 md:col-span-2"><span className="text-sm text-zinc-400">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
