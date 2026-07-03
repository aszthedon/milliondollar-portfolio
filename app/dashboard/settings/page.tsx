"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";

type FormState = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  themeMode: string;
  themeStyle: string;
  themeRadius: string;
  heroHeading: string;
  heroDescription: string;
  headerCtaLabel: string;
  headerCtaHref: string;
  ctaHeading: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  contactHeading: string;
  contactDescription: string;
  contactButtonLabel: string;
  footerDescription: string;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  footerInstagramUrl: string;
  footerFacebookUrl: string;
  footerTiktokUrl: string;
  footerYoutubeUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoOgImageUrl: string;
  showCtaSection: boolean;
  showContactSection: boolean;
  showFooter: boolean;
  showDashboardButton: boolean;
  showClientPortalButton: boolean;
};

const defaultForm: FormState = {
  siteName: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#ffffff",
  secondaryColor: "#a1a1aa",
  accentColor: "#3b82f6",
  backgroundColor: "#000000",
  foregroundColor: "#ffffff",
  themeMode: "dark",
  themeStyle: "premium",
  themeRadius: "rounded",
  heroHeading: "",
  heroDescription: "",
  headerCtaLabel: "Book Now",
  headerCtaHref: "#booking",
  ctaHeading: "",
  ctaDescription: "",
  ctaPrimaryLabel: "Book Now",
  ctaPrimaryHref: "#booking",
  ctaSecondaryLabel: "View Work",
  ctaSecondaryHref: "#gallery",
  contactHeading: "Contact Us",
  contactDescription: "",
  contactButtonLabel: "Send Message",
  footerDescription: "",
  footerEmail: "",
  footerPhone: "",
  footerAddress: "",
  footerInstagramUrl: "",
  footerFacebookUrl: "",
  footerTiktokUrl: "",
  footerYoutubeUrl: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  seoOgImageUrl: "",
  showCtaSection: true,
  showContactSection: true,
  showFooter: true,
  showDashboardButton: true,
  showClientPortalButton: true,
};

function text(value: unknown) {
  return String(value ?? "");
}

export default function DashboardSettingsPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [siteSlug, setSiteSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/site-branding", {
        headers: getDashboardAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Settings could not be loaded.");
      }

      const settings = data.settings ?? {};
      const site = data.site ?? {};
      const branding = settings.branding_settings ?? site.branding ?? {};
      const theme = settings.theme_settings ?? site.theme ?? {};

      setSiteSlug(data.site_slug ?? "");
      setForm({
        ...defaultForm,
        siteName: text(settings.business_name || site.name),
        logoUrl: text(settings.logo_url || branding.logoUrl),
        faviconUrl: text(settings.favicon_url || branding.faviconUrl),
        primaryColor: text(settings.primary_color || branding.primaryColor || defaultForm.primaryColor),
        secondaryColor: text(settings.secondary_color || branding.secondaryColor || defaultForm.secondaryColor),
        accentColor: text(branding.accentColor || defaultForm.accentColor),
        backgroundColor: text(branding.backgroundColor || defaultForm.backgroundColor),
        foregroundColor: text(branding.foregroundColor || defaultForm.foregroundColor),
        themeMode: text(theme.mode || defaultForm.themeMode),
        themeStyle: text(theme.style || defaultForm.themeStyle),
        themeRadius: text(theme.radius || defaultForm.themeRadius),
        heroHeading: text(settings.hero_heading),
        heroDescription: text(settings.hero_description),
        headerCtaLabel: text(settings.header_cta_label || defaultForm.headerCtaLabel),
        headerCtaHref: text(settings.header_cta_href || defaultForm.headerCtaHref),
        ctaHeading: text(settings.cta_heading),
        ctaDescription: text(settings.cta_description),
        ctaPrimaryLabel: text(settings.cta_primary_label || defaultForm.ctaPrimaryLabel),
        ctaPrimaryHref: text(settings.cta_primary_href || defaultForm.ctaPrimaryHref),
        ctaSecondaryLabel: text(settings.cta_secondary_label || defaultForm.ctaSecondaryLabel),
        ctaSecondaryHref: text(settings.cta_secondary_href || defaultForm.ctaSecondaryHref),
        contactHeading: text(settings.contact_heading || defaultForm.contactHeading),
        contactDescription: text(settings.contact_description),
        contactButtonLabel: text(settings.contact_button_label || defaultForm.contactButtonLabel),
        footerDescription: text(settings.footer_description),
        footerEmail: text(settings.footer_email),
        footerPhone: text(settings.footer_phone),
        footerAddress: text(settings.footer_address),
        footerInstagramUrl: text(settings.footer_instagram_url),
        footerFacebookUrl: text(settings.footer_facebook_url),
        footerTiktokUrl: text(settings.footer_tiktok_url),
        footerYoutubeUrl: text(settings.footer_youtube_url),
        seoTitle: text(settings.seo_title || site.name),
        seoDescription: text(settings.seo_description),
        seoKeywords: text(settings.seo_keywords),
        seoOgImageUrl: text(settings.seo_og_image_url),
        showCtaSection: settings.show_cta_section ?? defaultForm.showCtaSection,
        showContactSection: settings.show_contact_section ?? defaultForm.showContactSection,
        showFooter: settings.show_footer ?? defaultForm.showFooter,
        showDashboardButton: settings.show_dashboard_button ?? defaultForm.showDashboardButton,
        showClientPortalButton: settings.show_client_portal_button ?? defaultForm.showClientPortalButton,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/dashboard/site-branding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          branding: {
            logoUrl: form.logoUrl,
            faviconUrl: form.faviconUrl,
            primaryColor: form.primaryColor,
            secondaryColor: form.secondaryColor,
            accentColor: form.accentColor,
            backgroundColor: form.backgroundColor,
            foregroundColor: form.foregroundColor,
          },
          theme: {
            mode: form.themeMode,
            style: form.themeStyle,
            radius: form.themeRadius,
          },
          content: {
            siteName: form.siteName,
            heroHeading: form.heroHeading,
            heroDescription: form.heroDescription,
            headerCtaLabel: form.headerCtaLabel,
            headerCtaHref: form.headerCtaHref,
            ctaHeading: form.ctaHeading,
            ctaDescription: form.ctaDescription,
            ctaPrimaryLabel: form.ctaPrimaryLabel,
            ctaPrimaryHref: form.ctaPrimaryHref,
            ctaSecondaryLabel: form.ctaSecondaryLabel,
            ctaSecondaryHref: form.ctaSecondaryHref,
            seoTitle: form.seoTitle,
            seoDescription: form.seoDescription,
            seoKeywords: form.seoKeywords,
            seoOgImageUrl: form.seoOgImageUrl,
            showCtaSection: form.showCtaSection,
            showDashboardButton: form.showDashboardButton,
            showClientPortalButton: form.showClientPortalButton,
          },
          contact: {
            heading: form.contactHeading,
            description: form.contactDescription,
            buttonLabel: form.contactButtonLabel,
            showSection: form.showContactSection,
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
            showFooter: form.showFooter,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Settings could not be saved.");
      }

      setSuccess(data.message ?? "Settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <AdminUnlockGate title="Site Settings">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-6xl gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Dashboard Settings {siteSlug ? `· ${siteSlug}` : ""}
              </p>
              <h1 className="mt-3 text-4xl font-black">No-Code Site Editor</h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                Update the site name, logo, colors, theme, homepage copy,
                contact info, footer, and SEO without editing code.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadSettings}
                disabled={loading || saving}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={saveSettings}
                disabled={loading || saving}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Settings"}
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

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
              Loading settings...
            </div>
          ) : (
            <div className="grid gap-6">
              <Panel title="Brand Identity">
                <Field label="Site Name" value={form.siteName} onChange={(value) => setField("siteName", value)} />
                <Field label="Logo URL" value={form.logoUrl} onChange={(value) => setField("logoUrl", value)} />
                <Field label="Favicon URL" value={form.faviconUrl} onChange={(value) => setField("faviconUrl", value)} />
              </Panel>

              <Panel title="Colors & Theme">
                <ColorField label="Primary Color" value={form.primaryColor} onChange={(value) => setField("primaryColor", value)} />
                <ColorField label="Secondary Color" value={form.secondaryColor} onChange={(value) => setField("secondaryColor", value)} />
                <ColorField label="Accent Color" value={form.accentColor} onChange={(value) => setField("accentColor", value)} />
                <ColorField label="Background Color" value={form.backgroundColor} onChange={(value) => setField("backgroundColor", value)} />
                <ColorField label="Text Color" value={form.foregroundColor} onChange={(value) => setField("foregroundColor", value)} />
                <Field label="Theme Mode" value={form.themeMode} onChange={(value) => setField("themeMode", value)} />
                <Field label="Theme Style" value={form.themeStyle} onChange={(value) => setField("themeStyle", value)} />
                <Field label="Corner Radius" value={form.themeRadius} onChange={(value) => setField("themeRadius", value)} />
              </Panel>

              <Panel title="Homepage Content">
                <Field label="Hero Heading" value={form.heroHeading} onChange={(value) => setField("heroHeading", value)} />
                <TextArea label="Hero Description" value={form.heroDescription} onChange={(value) => setField("heroDescription", value)} />
                <Field label="Header Button Label" value={form.headerCtaLabel} onChange={(value) => setField("headerCtaLabel", value)} />
                <Field label="Header Button Link" value={form.headerCtaHref} onChange={(value) => setField("headerCtaHref", value)} />
                <Field label="CTA Heading" value={form.ctaHeading} onChange={(value) => setField("ctaHeading", value)} />
                <TextArea label="CTA Description" value={form.ctaDescription} onChange={(value) => setField("ctaDescription", value)} />
                <Field label="CTA Primary Label" value={form.ctaPrimaryLabel} onChange={(value) => setField("ctaPrimaryLabel", value)} />
                <Field label="CTA Primary Link" value={form.ctaPrimaryHref} onChange={(value) => setField("ctaPrimaryHref", value)} />
                <Field label="CTA Secondary Label" value={form.ctaSecondaryLabel} onChange={(value) => setField("ctaSecondaryLabel", value)} />
                <Field label="CTA Secondary Link" value={form.ctaSecondaryHref} onChange={(value) => setField("ctaSecondaryHref", value)} />
              </Panel>

              <Panel title="Contact & Footer">
                <Field label="Contact Heading" value={form.contactHeading} onChange={(value) => setField("contactHeading", value)} />
                <TextArea label="Contact Description" value={form.contactDescription} onChange={(value) => setField("contactDescription", value)} />
                <Field label="Contact Button Label" value={form.contactButtonLabel} onChange={(value) => setField("contactButtonLabel", value)} />
                <TextArea label="Footer Description" value={form.footerDescription} onChange={(value) => setField("footerDescription", value)} />
                <Field label="Footer Email" value={form.footerEmail} onChange={(value) => setField("footerEmail", value)} />
                <Field label="Footer Phone" value={form.footerPhone} onChange={(value) => setField("footerPhone", value)} />
                <Field label="Footer Address" value={form.footerAddress} onChange={(value) => setField("footerAddress", value)} />
                <Field label="Instagram URL" value={form.footerInstagramUrl} onChange={(value) => setField("footerInstagramUrl", value)} />
                <Field label="Facebook URL" value={form.footerFacebookUrl} onChange={(value) => setField("footerFacebookUrl", value)} />
                <Field label="TikTok URL" value={form.footerTiktokUrl} onChange={(value) => setField("footerTiktokUrl", value)} />
                <Field label="YouTube URL" value={form.footerYoutubeUrl} onChange={(value) => setField("footerYoutubeUrl", value)} />
              </Panel>

              <Panel title="SEO & Visibility">
                <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setField("seoTitle", value)} />
                <TextArea label="SEO Description" value={form.seoDescription} onChange={(value) => setField("seoDescription", value)} />
                <Field label="SEO Keywords" value={form.seoKeywords} onChange={(value) => setField("seoKeywords", value)} />
                <Field label="Open Graph Image URL" value={form.seoOgImageUrl} onChange={(value) => setField("seoOgImageUrl", value)} />
                <Toggle label="Show CTA Section" value={form.showCtaSection} onChange={(value) => setField("showCtaSection", value)} />
                <Toggle label="Show Contact Section" value={form.showContactSection} onChange={(value) => setField("showContactSection", value)} />
                <Toggle label="Show Footer" value={form.showFooter} onChange={(value) => setField("showFooter", value)} />
                <Toggle label="Show Dashboard Button" value={form.showDashboardButton} onChange={(value) => setField("showDashboardButton", value)} />
                <Toggle label="Show Client Portal Button" value={form.showClientPortalButton} onChange={(value) => setField("showClientPortalButton", value)} />
              </Panel>
            </div>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <div className="grid grid-cols-[56px_1fr] gap-2">
        <input type="color" value={value || "#ffffff"} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-black" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none" />
      </div>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 md:col-span-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none" />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-3">
      <span className="text-sm font-bold text-white">{label}</span>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" />
    </label>
  );
}
