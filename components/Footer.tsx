"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Container from "@/components/Container";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

interface FooterSettings {
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
  show_policies_link: boolean | null;
}

const fallbackFooter: FooterSettings = {
  footer_brand_text: "Million Dollar Ticket Productions",
  footer_description: "A polished booking website template built for service brands, creatives, and entrepreneurs.",
  footer_email: null,
  footer_phone: null,
  footer_address: null,
  footer_instagram_url: null,
  footer_facebook_url: null,
  footer_tiktok_url: null,
  footer_youtube_url: null,
  footer_copyright_text: "© 2026 Million Dollar Ticket Productions. All rights reserved.",
  show_footer: true,
  show_policies_link: true,
};

function SocialLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 transition hover:text-white">{label}</a>;
}

export default function Footer() {
  const siteSlug = getClientSiteSlug();
  const [settings, setSettings] = useState<FooterSettings>(fallbackFooter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFooter() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("footer_brand_text,footer_description,footer_email,footer_phone,footer_address,footer_instagram_url,footer_facebook_url,footer_tiktok_url,footer_youtube_url,footer_copyright_text,show_footer,show_policies_link")
        .eq("site_slug", siteSlug)
        .maybeSingle();

      if (error) {
        console.error("PUBLIC FOOTER ERROR:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          footer_brand_text: data.footer_brand_text || fallbackFooter.footer_brand_text,
          footer_description: data.footer_description || fallbackFooter.footer_description,
          footer_email: data.footer_email,
          footer_phone: data.footer_phone,
          footer_address: data.footer_address,
          footer_instagram_url: data.footer_instagram_url,
          footer_facebook_url: data.footer_facebook_url,
          footer_tiktok_url: data.footer_tiktok_url,
          footer_youtube_url: data.footer_youtube_url,
          footer_copyright_text: data.footer_copyright_text || fallbackFooter.footer_copyright_text,
          show_footer: data.show_footer ?? true,
          show_policies_link: data.show_policies_link ?? true,
        });
      }

      setLoading(false);
    }

    fetchFooter();
  }, [siteSlug]);

  if (!loading && settings.show_footer === false) return null;

  return (
    <footer className="border-t border-white/10 py-12">
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="text-xl font-bold text-white">{settings.footer_brand_text}</Link>
            <p className="mt-4 max-w-xl leading-relaxed text-zinc-400">{settings.footer_description}</p>
            {settings.show_policies_link !== false && (
              <Link href="/policies" className="mt-4 inline-block text-sm text-zinc-400 transition hover:text-white">
                Policies
              </Link>
            )}
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.25em] text-zinc-500">Contact</h3>
            <div className="mt-4 grid gap-2 text-sm text-zinc-400">
              {settings.footer_email && <p>{settings.footer_email}</p>}
              {settings.footer_phone && <p>{settings.footer_phone}</p>}
              {settings.footer_address && <p>{settings.footer_address}</p>}
            </div>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.25em] text-zinc-500">Social</h3>
            <div className="mt-4 flex flex-wrap gap-4">
              <SocialLink href={settings.footer_instagram_url} label="Instagram" />
              <SocialLink href={settings.footer_facebook_url} label="Facebook" />
              <SocialLink href={settings.footer_tiktok_url} label="TikTok" />
              <SocialLink href={settings.footer_youtube_url} label="YouTube" />
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-zinc-500">{settings.footer_copyright_text}</div>
      </Container>
    </footer>
  );
}
