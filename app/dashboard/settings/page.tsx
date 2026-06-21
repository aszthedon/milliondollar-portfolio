"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface SiteSettings {
  id: number;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hero_heading: string | null;
  hero_description: string | null;
  navbar_brand_text: string | null;
  header_cta_label: string | null;
  header_cta_href: string | null;
  show_dashboard_button: boolean | null;
  show_client_portal_button: boolean | null;
}

export default function SettingsPage() {
  const [
    settingsId,
    setSettingsId,
  ] = useState<number | null>(null);

  const [businessName, setBusinessName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [heroHeading, setHeroHeading] =
    useState("");

  const [
    heroDescription,
    setHeroDescription,
  ] = useState("");

  const [
    navbarBrandText,
    setNavbarBrandText,
  ] = useState("");

  const [
    headerCtaLabel,
    setHeaderCtaLabel,
  ] = useState("");

  const [
    headerCtaHref,
    setHeaderCtaHref,
  ] = useState("");

  const [
    showDashboardButton,
    setShowDashboardButton,
  ] = useState(true);

  const [
    showClientPortalButton,
    setShowClientPortalButton,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function fillSettings(
    settings: SiteSettings
  ) {
    setSettingsId(settings.id);

    setBusinessName(
      settings.business_name || ""
    );

    setPhone(settings.phone || "");
    setEmail(settings.email || "");
    setAddress(settings.address || "");

    setHeroHeading(
      settings.hero_heading || ""
    );

    setHeroDescription(
      settings.hero_description || ""
    );

    setNavbarBrandText(
      settings.navbar_brand_text ||
        settings.business_name ||
        "MDT Productions"
    );

    setHeaderCtaLabel(
      settings.header_cta_label ||
        "Book Now"
    );

    setHeaderCtaHref(
      settings.header_cta_href ||
        "/#booking"
    );

    setShowDashboardButton(
      settings.show_dashboard_button ??
        true
    );

    setShowClientPortalButton(
      settings.show_client_portal_button ??
        false
    );
  }

  async function fetchSettings() {
    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("site_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        fillSettings(
          data as SiteSettings
        );
      }
    } catch (error) {
      console.error(
        "SETTINGS FETCH ERROR:",
        error
      );

      setError(
        "Site settings could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function updateSettings() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        business_name:
          businessName.trim(),

        phone:
          phone.trim(),

        email:
          email.trim(),

        address:
          address.trim(),

        hero_heading:
          heroHeading.trim(),

        hero_description:
          heroDescription.trim(),

        navbar_brand_text:
          navbarBrandText.trim() ||
          businessName.trim() ||
          "MDT Productions",

        header_cta_label:
          headerCtaLabel.trim(),

        header_cta_href:
          headerCtaHref.trim(),

        show_dashboard_button:
          showDashboardButton,

        show_client_portal_button:
          showClientPortalButton,

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
            .select("*")
            .single();

        if (error) {
          throw error;
        }

        if (data) {
          fillSettings(
            data as SiteSettings
          );
        }
      }

      setSuccess(
        "Site settings updated."
      );

      await fetchSettings();
    } catch (error) {
      console.error(
        "SETTINGS UPDATE ERROR:",
        error
      );

      setError(
        "Site settings could not be saved."
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
            Loading Site Settings...
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
            Site Settings
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Edit brand information, hero text, and public website header
            controls.
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

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Brand Information
          </p>

          <h2 className="text-3xl font-bold">
            Business Details
          </h2>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Business Name
              </span>

              <input
                placeholder="Million Dollar Ticket Productions"
                value={businessName}
                onChange={(event) =>
                  setBusinessName(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Phone
              </span>

              <input
                placeholder="(555) 555-5555"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Email
              </span>

              <input
                placeholder="hello@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Address
              </span>

              <input
                placeholder="City, State"
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Homepage
          </p>

          <h2 className="text-3xl font-bold">
            Hero Content
          </h2>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Hero Heading
              </span>

              <input
                placeholder="Book your next service with ease"
                value={heroHeading}
                onChange={(event) =>
                  setHeroHeading(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Hero Description
              </span>

              <textarea
                placeholder="Describe the brand, services, or offer..."
                value={heroDescription}
                onChange={(event) =>
                  setHeroDescription(
                    event.target.value
                  )
                }
                rows={8}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 xl:col-span-2">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
                Website Header
              </p>

              <h2 className="text-3xl font-bold">
                Navbar Branding
              </h2>

              <p className="mt-3 max-w-2xl text-sm text-zinc-400">
                These settings control the brand name and buttons shown in the
                public website header. Menu links themselves are controlled on
                the Navigation page.
              </p>
            </div>

            <Link
              href="/dashboard/navigation"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Edit Menu Links
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Navbar Brand Text
              </span>

              <input
                placeholder="MDT Productions"
                value={navbarBrandText}
                onChange={(event) =>
                  setNavbarBrandText(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Header CTA Label
              </span>

              <input
                placeholder="Book Now"
                value={headerCtaLabel}
                onChange={(event) =>
                  setHeaderCtaLabel(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm text-zinc-400">
                Header CTA Link
              </span>

              <input
                placeholder="/#booking or /client or https://example.com"
                value={headerCtaHref}
                onChange={(event) =>
                  setHeaderCtaHref(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">
                  Show Dashboard Button
                </span>

                <span className="text-sm text-zinc-500">
                  Useful while building. Hide for client-facing templates.
                </span>
              </span>

              <input
                type="checkbox"
                checked={showDashboardButton}
                onChange={(event) =>
                  setShowDashboardButton(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">
                  Show Client Portal Button
                </span>

                <span className="text-sm text-zinc-500">
                  Shows a direct client portal button in the header.
                </span>
              </span>

              <input
                type="checkbox"
                checked={showClientPortalButton}
                onChange={(event) =>
                  setShowClientPortalButton(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <button
          onClick={updateSettings}
          disabled={saving}
          className="rounded-full bg-white px-8 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Settings"}
        </button>

        <button
          onClick={fetchSettings}
          disabled={saving}
          className="rounded-full border border-white/10 px-8 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset Unsaved Changes
        </button>
      </div>
    </main>
  );
}