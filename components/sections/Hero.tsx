"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Container from "@/components/Container";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

interface SiteSettings {
  business_name: string | null;
  hero_eyebrow: string | null;
  hero_heading: string | null;
  hero_description: string | null;
  header_cta_label: string | null;
  header_cta_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
}

const fallbackSettings: SiteSettings = {
  business_name: "Million Dollar Ticket Productions",
  hero_eyebrow: "Creative Booking Platform",
  hero_heading: "Book creative services with confidence.",
  hero_description:
    "A polished booking website template built for service brands, creatives, and entrepreneurs.",
  header_cta_label: "Book Now",
  header_cta_href: "/#booking",
  cta_secondary_label: "View Services",
  cta_secondary_href: "/#services",
};

function isExternalLink(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

function HeroButton({
  label,
  href,
  variant,
}: {
  label: string | null;
  href: string | null;
  variant: "primary" | "secondary";
}) {
  if (!label || !href) return null;

  const className =
    variant === "primary"
      ? "rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200"
      : "rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black";

  if (isExternalLink(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export default function Hero() {
  const siteSlug = getClientSiteSlug();
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          `
            business_name,
            hero_eyebrow,
            hero_heading,
            hero_description,
            header_cta_label,
            header_cta_href,
            cta_secondary_label,
            cta_secondary_href
          `
        )
        .eq("site_slug", siteSlug)
        .maybeSingle();

      if (error) {
        console.error("HERO SETTINGS ERROR:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          business_name: data.business_name || fallbackSettings.business_name,
          hero_eyebrow: data.hero_eyebrow || fallbackSettings.hero_eyebrow,
          hero_heading: data.hero_heading || fallbackSettings.hero_heading,
          hero_description: data.hero_description || fallbackSettings.hero_description,
          header_cta_label: data.header_cta_label || fallbackSettings.header_cta_label,
          header_cta_href: data.header_cta_href || fallbackSettings.header_cta_href,
          cta_secondary_label: data.cta_secondary_label || fallbackSettings.cta_secondary_label,
          cta_secondary_href: data.cta_secondary_href || fallbackSettings.cta_secondary_href,
        });
      }

      setLoading(false);
    }

    fetchSettings();
  }, [siteSlug]);

  return (
    <section id="home" className="relative min-h-[90vh] overflow-hidden py-28">
      <div className="absolute left-1/2 top-24 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

      <Container>
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="mb-6 text-sm uppercase tracking-[0.35em] text-zinc-500">
            {loading ? "Loading" : settings.hero_eyebrow}
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            {settings.hero_heading}
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            {settings.hero_description}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <HeroButton label={settings.header_cta_label} href={settings.header_cta_href} variant="primary" />
            <HeroButton label={settings.cta_secondary_label} href={settings.cta_secondary_href} variant="secondary" />
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-3xl font-bold">24/7</p>
              <p className="mt-2 text-sm text-zinc-500">Online booking access</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-3xl font-bold">Stripe</p>
              <p className="mt-2 text-sm text-zinc-500">Secure checkout flow</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-3xl font-bold">Google</p>
              <p className="mt-2 text-sm text-zinc-500">Calendar + Meet sync</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
