"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type HeaderFooterForm = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  headerCtaLabel: string;
  headerCtaHref: string;
  showDashboardButton: boolean;
  showClientPortalButton: boolean;
  footerDescription: string;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  footerInstagramUrl: string;
  footerFacebookUrl: string;
  footerTiktokUrl: string;
  footerYoutubeUrl: string;
  footerCopyrightText: string;
  showFooter: boolean;
  seoTitle: string;
  seoDescription: string;
};

const blankForm: HeaderFooterForm = {
  siteName: "",
  logoUrl: "",
  faviconUrl: "",
  headerCtaLabel: "Book Now",
  headerCtaHref: "/#booking",
  showDashboardButton: true,
  showClientPortalButton: false,
  footerDescription: "",
  footerEmail: "",
  footerPhone: "",
  footerAddress: "",
  footerInstagramUrl: "",
  footerFacebookUrl: "",
  footerTiktokUrl: "",
  footerYoutubeUrl: "",
  footerCopyrightText: "",
  showFooter: true,
  seoTitle: "",
  seoDescription: "",
};

export default function HeaderFooterDashboardPage() {
  const siteSlug = getClientSiteSlug();
  const [form, setForm] = useState<HeaderFooterForm>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function setField<K extends keyof HeaderFooterForm>(key: K, value: HeaderFooterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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

  async function loadHeaderFooter() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/dashboard/site-branding");
      const settings = data.settings ?? {};

      setForm({
        siteName: settings.business_name || settings.navbar_brand_text || data.site?.name || "",
        logoUrl: settings.logo_url || "",
        faviconUrl: settings.favicon_url || "",
        headerCtaLabel: settings.header_cta_label || "Book Now",
        headerCtaHref: settings.header_cta_href || "/#booking",
        showDashboardButton: settings.show_dashboard_button ?? true,
        showClientPortalButton: settings.show_client_portal_button ?? false,
        footerDescription: settings.footer_description || "",
        footerEmail: settings.footer_email || "",
        footerPhone: settings.footer_phone || "",
        footerAddress: settings.footer_address || "",
        footerInstagramUrl: settings.footer_instagram_url || "",
        footerFacebookUrl: settings.footer_facebook_url || "",
        footerTiktokUrl: settings.footer_tiktok_url || "",
        footerYoutubeUrl: settings.footer_youtube_url || "",
        footerCopyrightText: settings.footer_copyright_text || "",
        showFooter: settings.show_footer ?? true,
        seoTitle: settings.seo_title || settings.business_name || "",
        seoDescription: settings.seo_description || "",
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Header/footer settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function saveHeaderFooter() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api("/api/dashboard/site-branding", {
        method: "POST",
        body: JSON.stringify({
          branding: {
            logoUrl: form.logoUrl,
            faviconUrl: form.faviconUrl,
            primaryColor: "#ffffff",
            secondaryColor: "#a1a1aa",
            accentColor: "#3b82f6",
            backgroundColor: "#000000",
            foregroundColor: "#ffffff",
          },
          theme: {
            mode: "dark",
            style: "premium",
            radius: "rounded",
            fontFamily: "",
          },
          content: {
            siteName: form.siteName,
            heroHeading: "",
            heroDescription: "",
            headerCtaLabel: form.headerCtaLabel,
            headerCtaHref: form.headerCtaHref,
            ctaHeading: "",
            ctaDescription: "",
            ctaPrimaryLabel: form.headerCtaLabel,
            ctaPrimaryHref: form.headerCtaHref,
            ctaSecondaryLabel: "View Services",
            ctaSecondaryHref: "/#services",
            showCtaSection: true,
            showDashboardButton: form.showDashboardButton,
            showClientPortalButton: form.showClientPortalButton,
            seoTitle: form.seoTitle || form.siteName,
            seoDescription: form.seoDescription,
            seoKeywords: "",
            seoOgImageUrl: "",
          },
          contact: {
            heading: "",
            description: "",
            buttonLabel: "Send Message",
            showSection: true,
          },
          footer: {
            description: form.footerDescription,
            email: form.footerEmail,
            phone: form.footerPhone,
            address: form.footerAddress,
            instagramUrl: form.footerInstagramUrl,
            facebookUrl: form.footerFacebookUrl,
            tiktokUrl: form.footerTiktokUrl,
            youtubeUrl: form.footerYoutubeUrl,
            copyrightText: form.footerCopyrightText,
            showFooter: form.showFooter,
          },
        }),
      });

      setMessage("Header and footer saved. Refresh the public site to see changes.");
      await loadHeaderFooter();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Header/footer settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadHeaderFooter();
  }, []);

  return (
    <AdminUnlockGate title="Header & Footer Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-5xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Header & Footer</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">Edit the exact areas circled on the public site: front-left navbar brand, footer heading, footer paragraph, contact/socials, and copyright line.</p>
          </div>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading header and footer...</div>
          ) : (
            <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-black">Header</h2>
              <Field label="Navbar Brand Text / Business Name" value={form.siteName} onChange={(value) => setField("siteName", value)} />
              <Field label="Logo URL" value={form.logoUrl} onChange={(value) => setField("logoUrl", value)} />
              <Field label="Favicon URL" value={form.faviconUrl} onChange={(value) => setField("faviconUrl", value)} />
              <Field label="Header Button Label" value={form.headerCtaLabel} onChange={(value) => setField("headerCtaLabel", value)} />
              <Field label="Header Button Link" value={form.headerCtaHref} onChange={(value) => setField("headerCtaHref", value)} />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={form.showDashboardButton} onChange={(event) => setField("showDashboardButton", event.target.checked)} /><span>Show Dashboard Button</span></label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={form.showClientPortalButton} onChange={(event) => setField("showClientPortalButton", event.target.checked)} /><span>Show Client Portal Button</span></label>

              <h2 className="pt-4 text-2xl font-black">Footer</h2>
              <TextArea label="Footer Description" value={form.footerDescription} onChange={(value) => setField("footerDescription", value)} />
              <Field label="Footer Email" value={form.footerEmail} onChange={(value) => setField("footerEmail", value)} />
              <Field label="Footer Phone" value={form.footerPhone} onChange={(value) => setField("footerPhone", value)} />
              <Field label="Footer Address" value={form.footerAddress} onChange={(value) => setField("footerAddress", value)} />
              <Field label="Instagram URL" value={form.footerInstagramUrl} onChange={(value) => setField("footerInstagramUrl", value)} />
              <Field label="Facebook URL" value={form.footerFacebookUrl} onChange={(value) => setField("footerFacebookUrl", value)} />
              <Field label="TikTok URL" value={form.footerTiktokUrl} onChange={(value) => setField("footerTiktokUrl", value)} />
              <Field label="YouTube URL" value={form.footerYoutubeUrl} onChange={(value) => setField("footerYoutubeUrl", value)} />
              <Field label="Footer Copyright Line" value={form.footerCopyrightText} onChange={(value) => setField("footerCopyrightText", value)} />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4"><input type="checkbox" checked={form.showFooter} onChange={(event) => setField("showFooter", event.target.checked)} /><span>Show Footer</span></label>

              <h2 className="pt-4 text-2xl font-black">Browser Tab</h2>
              <Field label="Browser Tab Name / SEO Title" value={form.seoTitle} onChange={(value) => setField("seoTitle", value)} />
              <TextArea label="SEO Description" value={form.seoDescription} onChange={(value) => setField("seoDescription", value)} />

              <button type="button" onClick={saveHeaderFooter} disabled={saving} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">{saving ? "Saving..." : "Save Header & Footer"}</button>
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
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}
