"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Container from "@/components/Container";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

interface CTASettings {
  cta_eyebrow: string | null;
  cta_heading: string | null;
  cta_description: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  show_cta_section: boolean | null;
}

const fallbackSettings: CTASettings = {
  cta_eyebrow: "Ready to get started?",
  cta_heading: "Book your next service today.",
  cta_description: "Choose your service, select a time, and complete checkout in just a few clicks.",
  cta_primary_label: "Book Now",
  cta_primary_href: "/#booking",
  cta_secondary_label: "View Services",
  cta_secondary_href: "/#services",
  show_cta_section: true,
};

function isExternalLink(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:");
}

function CTAButton({ label, href, variant }: { label: string | null; href: string | null; variant: "primary" | "secondary" }) {
  if (!label || !href) return null;

  const className =
    variant === "primary"
      ? "rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200"
      : "rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black";

  if (isExternalLink(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>;
  }

  return <Link href={href} className={className}>{label}</Link>;
}

export default function CTA() {
  const siteSlug = getClientSiteSlug();
  const [settings, setSettings] = useState<CTASettings>(fallbackSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("cta_eyebrow,cta_heading,cta_description,cta_primary_label,cta_primary_href,cta_secondary_label,cta_secondary_href,show_cta_section")
        .eq("site_slug", siteSlug)
        .maybeSingle();

      if (error) {
        console.error("PUBLIC CTA SETTINGS ERROR:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          cta_eyebrow: data.cta_eyebrow || fallbackSettings.cta_eyebrow,
          cta_heading: data.cta_heading || fallbackSettings.cta_heading,
          cta_description: data.cta_description || fallbackSettings.cta_description,
          cta_primary_label: data.cta_primary_label || fallbackSettings.cta_primary_label,
          cta_primary_href: data.cta_primary_href || fallbackSettings.cta_primary_href,
          cta_secondary_label: data.cta_secondary_label || fallbackSettings.cta_secondary_label,
          cta_secondary_href: data.cta_secondary_href || fallbackSettings.cta_secondary_href,
          show_cta_section: data.show_cta_section ?? true,
        });
      }

      setLoading(false);
    }

    fetchSettings();
  }, [siteSlug]);

  if (!loading && settings.show_cta_section === false) return null;

  return (
    <section id="cta" className="relative py-24">
      <Container>
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center md:p-14">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">{settings.cta_eyebrow}</p>
            <h2 className="text-4xl font-bold md:text-6xl">{settings.cta_heading}</h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400">{settings.cta_description}</p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <CTAButton label={settings.cta_primary_label} href={settings.cta_primary_href} variant="primary" />
              <CTAButton label={settings.cta_secondary_label} href={settings.cta_secondary_href} variant="secondary" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
