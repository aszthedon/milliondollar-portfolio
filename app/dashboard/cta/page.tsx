"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface CTASettings {
  id: number;
  cta_eyebrow: string | null;
  cta_heading: string | null;
  cta_description: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  show_cta_section: boolean | null;
}

export default function CTADashboardPage() {
  const [settingsId, setSettingsId] =
    useState<number | null>(null);

  const [ctaEyebrow, setCtaEyebrow] =
    useState("Ready to get started?");

  const [ctaHeading, setCtaHeading] =
    useState("Book your next service today.");

  const [
    ctaDescription,
    setCtaDescription,
  ] = useState(
    "Choose your service, select a time, and complete checkout in just a few clicks."
  );

  const [
    ctaPrimaryLabel,
    setCtaPrimaryLabel,
  ] = useState("Book Now");

  const [
    ctaPrimaryHref,
    setCtaPrimaryHref,
  ] = useState("/#booking");

  const [
    ctaSecondaryLabel,
    setCtaSecondaryLabel,
  ] = useState("View Services");

  const [
    ctaSecondaryHref,
    setCtaSecondaryHref,
  ] = useState("/#services");

  const [
    showCtaSection,
    setShowCtaSection,
  ] = useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function fillSettings(
    settings: CTASettings
  ) {
    setSettingsId(settings.id);

    setCtaEyebrow(
      settings.cta_eyebrow ||
        "Ready to get started?"
    );

    setCtaHeading(
      settings.cta_heading ||
        "Book your next service today."
    );

    setCtaDescription(
      settings.cta_description ||
        "Choose your service, select a time, and complete checkout in just a few clicks."
    );

    setCtaPrimaryLabel(
      settings.cta_primary_label ||
        "Book Now"
    );

    setCtaPrimaryHref(
      settings.cta_primary_href ||
        "/#booking"
    );

    setCtaSecondaryLabel(
      settings.cta_secondary_label ||
        "View Services"
    );

    setCtaSecondaryHref(
      settings.cta_secondary_href ||
        "/#services"
    );

    setShowCtaSection(
      settings.show_cta_section ??
        true
    );
  }

  async function fetchSettings() {
    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("site_settings")
          .select(
            `
              id,
              cta_eyebrow,
              cta_heading,
              cta_description,
              cta_primary_label,
              cta_primary_href,
              cta_secondary_label,
              cta_secondary_href,
              show_cta_section
            `
          )
          .limit(1)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        fillSettings(
          data as CTASettings
        );
      }
    } catch (error) {
      console.error(
        "CTA SETTINGS FETCH ERROR:",
        error
      );

      setError(
        "CTA settings could not be loaded."
      );
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
        cta_eyebrow:
          ctaEyebrow.trim(),

        cta_heading:
          ctaHeading.trim(),

        cta_description:
          ctaDescription.trim(),

        cta_primary_label:
          ctaPrimaryLabel.trim(),

        cta_primary_href:
          ctaPrimaryHref.trim(),

        cta_secondary_label:
          ctaSecondaryLabel.trim(),

        cta_secondary_href:
          ctaSecondaryHref.trim(),

        show_cta_section:
          showCtaSection,

        updated_at:
          new Date().toISOString(),
      };

      if (settingsId) {
        const { error } =
          await supabase
            .from("site_settings")
            .update(payload)
            .eq("id", settingsId);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } =
          await supabase
            .from("site_settings")
            .insert(payload)
            .select(
              `
                id,
                cta_eyebrow,
                cta_heading,
                cta_description,
                cta_primary_label,
                cta_primary_href,
                cta_secondary_label,
                cta_secondary_href,
                show_cta_section
              `
            )
            .single();

        if (error) {
          throw error;
        }

        if (data) {
          fillSettings(
            data as CTASettings
          );
        }
      }

      setSuccess(
        "CTA section updated."
      );

      await fetchSettings();
    } catch (error) {
      console.error(
        "CTA SETTINGS SAVE ERROR:",
        error
      );

      setError(
        "CTA settings could not be saved."
      );
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
            Loading CTA Settings...
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
            CTA Section
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Edit the final call-to-action section shown near the bottom of the
            public website.
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
            href="/#cta"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View CTA
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
            Website CTA
          </p>

          <h2 className="text-3xl font-bold">
            Call To Action
          </h2>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Eyebrow Text
              </span>

              <input
                value={ctaEyebrow}
                onChange={(event) =>
                  setCtaEyebrow(
                    event.target.value
                  )
                }
                placeholder="Ready to get started?"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Heading
              </span>

              <input
                value={ctaHeading}
                onChange={(event) =>
                  setCtaHeading(
                    event.target.value
                  )
                }
                placeholder="Book your next service today."
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Description
              </span>

              <textarea
                value={ctaDescription}
                onChange={(event) =>
                  setCtaDescription(
                    event.target.value
                  )
                }
                rows={6}
                placeholder="Tell visitors why they should take action."
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Primary Button Label
                </span>

                <input
                  value={ctaPrimaryLabel}
                  onChange={(event) =>
                    setCtaPrimaryLabel(
                      event.target.value
                    )
                  }
                  placeholder="Book Now"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Primary Button Link
                </span>

                <input
                  value={ctaPrimaryHref}
                  onChange={(event) =>
                    setCtaPrimaryHref(
                      event.target.value
                    )
                  }
                  placeholder="/#booking"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Secondary Button Label
                </span>

                <input
                  value={ctaSecondaryLabel}
                  onChange={(event) =>
                    setCtaSecondaryLabel(
                      event.target.value
                    )
                  }
                  placeholder="View Services"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Secondary Button Link
                </span>

                <input
                  value={ctaSecondaryHref}
                  onChange={(event) =>
                    setCtaSecondaryHref(
                      event.target.value
                    )
                  }
                  placeholder="/#services"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">
                  Show CTA Section
                </span>

                <span className="text-sm text-zinc-500">
                  Hide the whole final CTA section without deleting its text.
                </span>
              </span>

              <input
                type="checkbox"
                checked={showCtaSection}
                onChange={(event) =>
                  setShowCtaSection(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save CTA Settings"}
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
            Current CTA
          </h2>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-black p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              {ctaEyebrow || "Eyebrow"}
            </p>

            <h3 className="mt-5 text-4xl font-bold">
              {ctaHeading || "CTA Heading"}
            </h3>

            <p className="mt-5 leading-relaxed text-zinc-400">
              {ctaDescription ||
                "CTA description preview."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {ctaPrimaryLabel &&
                ctaPrimaryHref && (
                  <span className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black">
                    {ctaPrimaryLabel}
                  </span>
                )}

              {ctaSecondaryLabel &&
                ctaSecondaryHref && (
                  <span className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300">
                    {ctaSecondaryLabel}
                  </span>
                )}
            </div>

            {!showCtaSection && (
              <div className="mt-6 rounded-2xl border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                This section is currently hidden from the public website.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}