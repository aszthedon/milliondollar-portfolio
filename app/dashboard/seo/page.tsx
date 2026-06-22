"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface SEOSettings {
  id: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_og_image_url: string | null;
}

export default function SEODashboardPage() {
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [seoTitle, setSeoTitle] = useState("Million Dollar Ticket Productions");
  const [seoDescription, setSeoDescription] = useState(
    "Book services, manage appointments, and run a polished client experience online."
  );
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function fillSettings(settings: SEOSettings) {
    setSettingsId(settings.id);
    setSeoTitle(settings.seo_title || "Million Dollar Ticket Productions");
    setSeoDescription(
      settings.seo_description ||
        "Book services, manage appointments, and run a polished client experience online."
    );
    setSeoKeywords(settings.seo_keywords || "");
    setSeoOgImageUrl(settings.seo_og_image_url || "");
  }

  async function fetchSettings() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("site_settings")
        .select("id, seo_title, seo_description, seo_keywords, seo_og_image_url")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) fillSettings(data as SEOSettings);
    } catch (error) {
      console.error("SEO SETTINGS FETCH ERROR:", error);
      setError("SEO settings could not be loaded.");
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
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        seo_keywords: seoKeywords.trim(),
        seo_og_image_url: seoOgImageUrl.trim(),
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
          .select("id, seo_title, seo_description, seo_keywords, seo_og_image_url")
          .single();

        if (error) throw error;
        if (data) fillSettings(data as SEOSettings);
      }

      setSuccess("SEO settings updated.");
      await fetchSettings();
    } catch (error) {
      console.error("SEO SETTINGS SAVE ERROR:", error);
      setError("SEO settings could not be saved.");
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
            Loading SEO Settings...
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
            SEO Settings
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Edit the default page title, search description, keywords, and social
            preview image.
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
            Metadata
          </p>

          <h2 className="text-3xl font-bold">
            Search + Social Preview
          </h2>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">SEO Title</span>
              <input
                value={seoTitle}
                onChange={(event) => setSeoTitle(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">SEO Description</span>
              <textarea
                value={seoDescription}
                onChange={(event) => setSeoDescription(event.target.value)}
                rows={5}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Keywords</span>
              <input
                value={seoKeywords}
                onChange={(event) => setSeoKeywords(event.target.value)}
                placeholder="booking, services, appointments, creative services"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Open Graph Image URL</span>
              <input
                value={seoOgImageUrl}
                onChange={(event) => setSeoOgImageUrl(event.target.value)}
                placeholder="https://..."
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save SEO Settings"}
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
            Search Result
          </h2>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-black p-8">
            <p className="text-sm text-blue-400">
              milliondollarticketproductions.com
            </p>

            <h3 className="mt-2 text-2xl font-semibold text-blue-300">
              {seoTitle}
            </h3>

            <p className="mt-3 leading-relaxed text-zinc-400">
              {seoDescription}
            </p>

            {seoKeywords && (
              <p className="mt-5 text-sm text-zinc-500">
                Keywords: {seoKeywords}
              </p>
            )}

            {seoOgImageUrl && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={seoOgImageUrl}
                  alt="SEO preview"
                  className="h-48 w-full object-cover"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}