"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Container from "@/components/Container";

interface SiteSettings {
  home_eyebrow: string;
  hero_heading: string;
  hero_description: string;
  header_cta_label: string;
  header_cta_href: string;
  cta_secondary_label?: string;
  cta_secondary_href?: string;
  homepage_layout_settings?: { heroLayout?: string };
}

const fallbackSettings: SiteSettings = {
  home_eyebrow: "Book Now",
  hero_heading: "Book creative services with confidence.",
  hero_description: "A polished booking website built for service brands, creatives, and entrepreneurs.",
  header_cta_label: "Book Now",
  header_cta_href: "/#booking",
  cta_secondary_label: "View Services",
  cta_secondary_href: "/#services",
};

function isExternalLink(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:");
}

function HeroButton({ label, href, variant }: { label?: string | null; href?: string | null; variant: "primary" | "secondary" }) {
  if (!label || !href) return null;
  const className = variant === "primary" ? "rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200" : "rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black";
  if (isExternalLink(href)) return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>;
  return <Link href={href} className={className}>{label}</Link>;
}

export default function Hero() {
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/public/site-settings", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (data?.settings) setSettings({ ...fallbackSettings, ...data.settings });
      } catch (error) {
        console.error("HERO SETTINGS ERROR:", error);
      }
    }
    fetchSettings();
  }, []);

  const heroLayout = settings.homepage_layout_settings?.heroLayout ?? "centered";
  const isSplit = heroLayout === "split";
  const isMinimal = heroLayout === "minimal";

  return (
    <section id="home" className="relative min-h-[90vh] overflow-hidden py-28">
      {!isMinimal && <div className="absolute left-1/2 top-24 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />}
      <Container>
        <div className={isSplit ? "relative grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]" : "relative mx-auto max-w-5xl text-center"}>
          <div className={isSplit ? "text-left" : "text-center"}>
            <p className="mb-6 text-sm uppercase tracking-[0.35em] text-zinc-500">{settings.home_eyebrow}</p>
            <h1 className="text-5xl font-bold leading-tight md:text-7xl">{settings.hero_heading}</h1>
            <p className={isSplit ? "mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl" : "mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-zinc-400 md:text-xl"}>{settings.hero_description}</p>
            <div className={isSplit ? "mt-10 flex flex-wrap gap-4" : "mt-10 flex flex-wrap justify-center gap-4"}>
              <HeroButton label={settings.header_cta_label} href={settings.header_cta_href} variant="primary" />
              <HeroButton label={settings.cta_secondary_label} href={settings.cta_secondary_href} variant="secondary" />
            </div>
          </div>
          {!isMinimal && (
            <div className={isSplit ? "grid gap-4" : "mt-16 grid gap-4 md:grid-cols-3"}>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><p className="text-3xl font-bold">24/7</p><p className="mt-2 text-sm text-zinc-500">Online booking access</p></div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><p className="text-3xl font-bold">Stripe</p><p className="mt-2 text-sm text-zinc-500">Secure checkout flow</p></div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><p className="text-3xl font-bold">Google</p><p className="mt-2 text-sm text-zinc-500">Calendar sync</p></div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
