"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import Container from "./Container";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

interface NavigationLink {
  id: number;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  opens_new_tab: boolean;
}

interface SiteSettings {
  business_name: string | null;
  navbar_brand_text: string | null;
  header_cta_label: string | null;
  header_cta_href: string | null;
  show_dashboard_button: boolean | null;
  show_client_portal_button: boolean | null;
  show_policies_link: boolean | null;
}

const fallbackLinks: NavigationLink[] = [
  { id: 1, label: "Home", href: "/#home", sort_order: 1, is_visible: true, opens_new_tab: false },
  { id: 2, label: "Services", href: "/#services", sort_order: 2, is_visible: true, opens_new_tab: false },
  { id: 3, label: "Book Now", href: "/#booking", sort_order: 3, is_visible: true, opens_new_tab: false },
  { id: 4, label: "Gallery", href: "/#gallery", sort_order: 4, is_visible: true, opens_new_tab: false },
];

function isExternalLink(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:");
}

function NavLinkItem({ link, mobile = false, onClick }: { link: NavigationLink; mobile?: boolean; onClick?: () => void }) {
  const external = isExternalLink(link.href) || link.opens_new_tab;
  const className = mobile ? "rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/10 hover:text-white" : "text-sm text-zinc-300 transition hover:text-white";

  if (external) return <a href={link.href} target={link.opens_new_tab ? "_blank" : undefined} rel={link.opens_new_tab ? "noopener noreferrer" : undefined} onClick={onClick} className={className}>{link.label}</a>;
  return <Link href={link.href} onClick={onClick} className={className}>{link.label}</Link>;
}

export default function Navbar() {
  const siteSlug = getClientSiteSlug();
  const [menuOpen, setMenuOpen] = useState(false);
  const [links, setLinks] = useState<NavigationLink[]>(fallbackLinks);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    async function fetchHeaderData() {
      const [navigationResponse, settingsResponse] = await Promise.all([
        supabase
          .from("navigation_links")
          .select("id,label,href,sort_order,is_visible,opens_new_tab")
          .eq("site_slug", siteSlug)
          .eq("is_visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("site_settings")
          .select("business_name,navbar_brand_text,header_cta_label,header_cta_href,show_dashboard_button,show_client_portal_button,show_policies_link")
          .eq("site_slug", siteSlug)
          .maybeSingle(),
      ]);

      if (navigationResponse.error) console.error("PUBLIC NAVIGATION ERROR:", navigationResponse.error);
      if (navigationResponse.data && navigationResponse.data.length > 0) setLinks(navigationResponse.data as NavigationLink[]);
      if (settingsResponse.error) console.error("HEADER SETTINGS ERROR:", settingsResponse.error);
      if (settingsResponse.data) setSettings(settingsResponse.data as SiteSettings);
    }

    fetchHeaderData();
  }, [siteSlug]);

  const brandText = settings?.navbar_brand_text || settings?.business_name || "MDT Productions";
  const ctaLabel = settings?.header_cta_label || "Book Now";
  const ctaHref = settings?.header_cta_href || "/#booking";
  const showDashboardButton = settings?.show_dashboard_button ?? true;
  const showClientPortalButton = settings?.show_client_portal_button ?? false;
  const showPoliciesLink = settings?.show_policies_link ?? true;
  const showCta = Boolean(ctaLabel.trim() && ctaHref.trim());
  const ctaIsExternal = isExternalLink(ctaHref);
  const hasPoliciesLink = links.some((link) => link.href === "/policies" || link.label.toLowerCase() === "policies");
  const visibleLinks = showPoliciesLink && !hasPoliciesLink ? [...links, { id: 9999, label: "Policies", href: "/policies", sort_order: 9999, is_visible: true, opens_new_tab: false }] : links;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <Container>
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="max-w-[220px] truncate text-lg font-semibold uppercase tracking-[0.2em] text-white">{brandText}</Link>
          <div className="hidden items-center gap-8 md:flex">{visibleLinks.map((link) => <NavLinkItem key={link.id} link={link} />)}</div>
          <div className="hidden items-center gap-3 md:flex">
            {showClientPortalButton && <Link href="/client" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black">Client Portal</Link>}
            {showDashboardButton && <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black">Dashboard</Link>}
            {showCta && (ctaIsExternal ? <a href={ctaHref} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">{ctaLabel}</a> : <Link href={ctaHref} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">{ctaLabel}</Link>)}
          </div>
          <button onClick={() => setMenuOpen((current) => !current)} className="text-white md:hidden" aria-label="Toggle menu">{menuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
        {menuOpen && (
          <div className="flex flex-col gap-2 border-t border-white/10 py-6 md:hidden">
            {visibleLinks.map((link) => <NavLinkItem key={link.id} link={link} mobile onClick={() => setMenuOpen(false)} />)}
            {showClientPortalButton && <Link href="/client" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-zinc-300 transition hover:bg-white hover:text-black">Client Portal</Link>}
            {showDashboardButton && <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-zinc-300 transition hover:bg-white hover:text-black">Dashboard</Link>}
            {showCta && (ctaIsExternal ? <a href={ctaHref} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="rounded-2xl bg-white px-4 py-3 text-black">{ctaLabel}</a> : <Link href={ctaHref} onClick={() => setMenuOpen(false)} className="rounded-2xl bg-white px-4 py-3 text-black">{ctaLabel}</Link>)}
          </div>
        )}
      </Container>
    </nav>
  );
}
