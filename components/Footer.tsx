"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Container from "@/components/Container";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

interface FooterSettings {
  business_name: string;
  footer_brand_text: string;
  footer_description: string;
  footer_email: string;
  footer_phone: string;
  footer_address: string;
  footer_instagram_url: string;
  footer_facebook_url: string;
  footer_tiktok_url: string;
  footer_youtube_url: string;
  footer_copyright_text: string;
  show_footer: boolean;
  show_policies_link: boolean;
  primary_color: string;
  secondary_color: string;
}

const fallbackFooter: FooterSettings = {
  business_name: "",
  footer_brand_text: "Iyanla Fix My Crown",
  footer_description: "Professional hairstyling, crown care, and confidence-centered beauty services.",
  footer_email: "",
  footer_phone: "",
  footer_address: "",
  footer_instagram_url: "",
  footer_facebook_url: "",
  footer_tiktok_url: "",
  footer_youtube_url: "",
  footer_copyright_text: "© 2026 Iyanla Fix My Crown. All rights reserved.",
  show_footer: true,
  show_policies_link: true,
  primary_color: "#ffffff",
  secondary_color: "#a1a1aa",
};

function SocialLink({ href, label, color }: { href: string; label: string; color: string }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm transition hover:opacity-80" style={{ color }}>{label}</a>;
}

export default function Footer() {
  const siteSlug = getClientSiteSlug();
  const [settings, setSettings] = useState<FooterSettings>(fallbackFooter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFooter() {
      try {
        const response = await fetch("/api/public/site-settings", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));

        if (data?.settings) {
          setSettings({ ...fallbackFooter, ...data.settings });
        }
      } catch (error) {
        console.error("PUBLIC FOOTER SETTINGS ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFooter();
  }, [siteSlug]);

  if (!loading && settings.show_footer === false) return null;

  const primaryColor = settings.primary_color || "#ffffff";
  const secondaryColor = settings.secondary_color || "#a1a1aa";
  const brandText = settings.footer_brand_text || settings.business_name || fallbackFooter.footer_brand_text;
  const description = settings.footer_description || fallbackFooter.footer_description;
  const copyright = settings.footer_copyright_text || `© 2026 ${brandText}. All rights reserved.`;

  return (
    <footer className="border-t py-12" style={{ borderColor: `${primaryColor}33` }}>
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="text-xl font-bold" style={{ color: primaryColor }}>{brandText}</Link>
            <p className="mt-4 max-w-xl leading-relaxed" style={{ color: secondaryColor }}>{description}</p>
            {settings.show_policies_link !== false && (
              <Link href="/policies" className="mt-4 inline-block text-sm transition hover:opacity-80" style={{ color: primaryColor }}>
                Policies
              </Link>
            )}
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.25em]" style={{ color: secondaryColor }}>Contact</h3>
            <div className="mt-4 grid gap-2 text-sm" style={{ color: secondaryColor }}>
              {settings.footer_email && <p>{settings.footer_email}</p>}
              {settings.footer_phone && <p>{settings.footer_phone}</p>}
              {settings.footer_address && <p>{settings.footer_address}</p>}
            </div>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.25em]" style={{ color: secondaryColor }}>Social</h3>
            <div className="mt-4 flex flex-wrap gap-4">
              <SocialLink href={settings.footer_instagram_url} label="Instagram" color={secondaryColor} />
              <SocialLink href={settings.footer_facebook_url} label="Facebook" color={secondaryColor} />
              <SocialLink href={settings.footer_tiktok_url} label="TikTok" color={secondaryColor} />
              <SocialLink href={settings.footer_youtube_url} label="YouTube" color={secondaryColor} />
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-sm" style={{ borderColor: `${primaryColor}33`, color: secondaryColor }}>{copyright}</div>
      </Container>
    </footer>
  );
}
