"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface FooterSettings {
  id: number;
  footer_brand_text: string | null;
  footer_description: string | null;
  footer_email: string | null;
  footer_phone: string | null;
  footer_address: string | null;
  footer_instagram_url: string | null;
  footer_facebook_url: string | null;
  footer_tiktok_url: string | null;
  footer_youtube_url: string | null;
  footer_copyright_text: string | null;
  show_footer: boolean | null;
}

export default function FooterDashboardPage() {
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [footerBrandText, setFooterBrandText] = useState("");
  const [footerDescription, setFooterDescription] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [footerPhone, setFooterPhone] = useState("");
  const [footerAddress, setFooterAddress] = useState("");
  const [footerInstagramUrl, setFooterInstagramUrl] = useState("");
  const [footerFacebookUrl, setFooterFacebookUrl] = useState("");
  const [footerTiktokUrl, setFooterTiktokUrl] = useState("");
  const [footerYoutubeUrl, setFooterYoutubeUrl] = useState("");
  const [footerCopyrightText, setFooterCopyrightText] = useState("");
  const [showFooter, setShowFooter] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function fillSettings(settings: FooterSettings) {
    setSettingsId(settings.id);
    setFooterBrandText(settings.footer_brand_text || "Million Dollar Ticket Productions");
    setFooterDescription(
      settings.footer_description ||
        "A polished booking website template built for service brands, creatives, and entrepreneurs."
    );
    setFooterEmail(settings.footer_email || "");
    setFooterPhone(settings.footer_phone || "");
    setFooterAddress(settings.footer_address || "");
    setFooterInstagramUrl(settings.footer_instagram_url || "");
    setFooterFacebookUrl(settings.footer_facebook_url || "");
    setFooterTiktokUrl(settings.footer_tiktok_url || "");
    setFooterYoutubeUrl(settings.footer_youtube_url || "");
    setFooterCopyrightText(
      settings.footer_copyright_text ||
        "© 2026 Million Dollar Ticket Productions. All rights reserved."
    );
    setShowFooter(settings.show_footer ?? true);
  }

  async function fetchSettings() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("site_settings")
        .select(
          `
            id,
            footer_brand_text,
            footer_description,
            footer_email,
            footer_phone,
            footer_address,
            footer_instagram_url,
            footer_facebook_url,
            footer_tiktok_url,
            footer_youtube_url,
            footer_copyright_text,
            show_footer
          `
        )
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) fillSettings(data as FooterSettings);
    } catch (error) {
      console.error("FOOTER SETTINGS FETCH ERROR:", error);
      setError("Footer settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        footer_brand_text: footerBrandText.trim(),
        footer_description: footerDescription.trim(),
        footer_email: footerEmail.trim(),
        footer_phone: footerPhone.trim(),
        footer_address: footerAddress.trim(),
        footer_instagram_url: footerInstagramUrl.trim(),
        footer_facebook_url: footerFacebookUrl.trim(),
        footer_tiktok_url: footerTiktokUrl.trim(),
        footer_youtube_url: footerYoutubeUrl.trim(),
        footer_copyright_text: footerCopyrightText.trim(),
        show_footer: showFooter,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error } = await supabase
          .from("site_settings")
          .update(payload)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("site_settings")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        if (data) fillSettings(data as FooterSettings);
      }

      setSuccess("Footer settings updated.");
      await fetchSettings();
    } catch (error) {
      console.error("FOOTER SETTINGS SAVE ERROR:", error);
      setError("Footer settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Footer Settings...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Footer
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Edit footer branding, contact details, social links, copyright text,
            and visibility.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Dashboard Home
          </Link>

          <Link
            href="/"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View Website
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-3xl border border-green-500 bg-green-500/10 p-5 text-green-300">
          {success}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Footer Manager
          </p>

          <h2 className="text-3xl font-bold">
            Footer Content
          </h2>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Brand Text</span>
              <input
                value={footerBrandText}
                onChange={(event) => setFooterBrandText(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Description</span>
              <textarea
                value={footerDescription}
                onChange={(event) => setFooterDescription(event.target.value)}
                rows={5}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">Email</span>
                <input
                  value={footerEmail}
                  onChange={(event) => setFooterEmail(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">Phone</span>
                <input
                  value={footerPhone}
                  onChange={(event) => setFooterPhone(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Address</span>
              <input
                value={footerAddress}
                onChange={(event) => setFooterAddress(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">Instagram URL</span>
                <input
                  value={footerInstagramUrl}
                  onChange={(event) => setFooterInstagramUrl(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">Facebook URL</span>
                <input
                  value={footerFacebookUrl}
                  onChange={(event) => setFooterFacebookUrl(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">TikTok URL</span>
                <input
                  value={footerTiktokUrl}
                  onChange={(event) => setFooterTiktokUrl(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">YouTube URL</span>
                <input
                  value={footerYoutubeUrl}
                  onChange={(event) => setFooterYoutubeUrl(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Copyright Text</span>
              <input
                value={footerCopyrightText}
                onChange={(event) => setFooterCopyrightText(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">Show Footer</span>
                <span className="text-sm text-zinc-500">
                  Hide the footer without deleting its saved content.
                </span>
              </span>

              <input
                type="checkbox"
                checked={showFooter}
                onChange={(event) => setShowFooter(event.target.checked)}
                className="h-5 w-5"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Footer Settings"}
              </button>

              <button
                onClick={fetchSettings}
                disabled={saving}
                className="rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset Unsaved Changes
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Preview
          </p>

          <h2 className="text-3xl font-bold">
            Current Footer
          </h2>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-black p-8">
            <h3 className="text-2xl font-bold">
              {footerBrandText || "Footer Brand"}
            </h3>

            <p className="mt-4 text-zinc-400">
              {footerDescription || "Footer description preview."}
            </p>

            <div className="mt-6 grid gap-2 text-sm text-zinc-400">
              {footerEmail && <p>{footerEmail}</p>}
              {footerPhone && <p>{footerPhone}</p>}
              {footerAddress && <p>{footerAddress}</p>}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-300">
              {footerInstagramUrl && <span>Instagram</span>}
              {footerFacebookUrl && <span>Facebook</span>}
              {footerTiktokUrl && <span>TikTok</span>}
              {footerYoutubeUrl && <span>YouTube</span>}
            </div>

            <p className="mt-8 border-t border-white/10 pt-6 text-sm text-zinc-500">
              {footerCopyrightText}
            </p>

            {!showFooter && (
              <div className="mt-6 rounded-2xl border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                Footer is currently hidden from the public website.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}