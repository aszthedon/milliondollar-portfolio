"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import Container from "./Container";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

interface NavigationLink {
  id: number;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  opens_new_tab: boolean;
}

interface SiteSettings {
  business_name: string;
  navbar_brand_text: string;
  header_cta_label: string;
  header_cta_href: string;
  show_dashboard_button: boolean;
  show_client_portal_button: boolean;
  show_policies_link: boolean;
  primary_color: string;
  foreground_color: string;
}

const fallbackLinks: NavigationLink[] = [
  { id: 1, label: "Home", href: "/", sort_order: 1, is_visible: true, opens_new_tab: false },
  { id: 2, label: "Services", href: "/services", sort_order: 2, is_visible: true, opens_new_tab: false },
  { id: 3, label: "Booking", href: "/booking", sort_order: 3, is_visible: true, opens_new_tab: false },
  { id: 4, label: "Gallery", href: "/gallery", sort_order: 4, is_visible: true, opens_new_tab: false },
];

const fallbackSettings: SiteSettings = {
  business_name: "",
  navbar_brand_text: "",
  header_cta_label: "Book Now",
  header_cta_href: "/booking",
  show_dashboard_button: true,
  show_client_portal_button: false,
  show_policies_link: true,
  primary_color: "#ffffff",
  foreground_color: "#ffffff",
};

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
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings);

  useEffect(() => {
    async function fetchHeaderData() {
      const [pagesResponse, settingsResponse] = await Promise.all([
        fetch("/api/public/pages", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
        fetch("/api/public/site-settings", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
      ]);

      const pageLinks = Array.isArray(pagesResponse?.pages)
        ? pagesResponse.pages
            .filter((page: any) => page.show_in_header !== false)
            .map((page: any) => ({ id: Number(page.id), label: page.title, href: `/${page.slug}`, sort_order: Number(page.sort_order ?? 100), is_visible: true, opens_new_tab: page.opens_new_tab === true }))
        : [];

      setLinks([{ id: 0, label: "Home", href: "/", sort_order: 0, is_visible: true, opens_new_tab: false }, ...(pageLinks.length > 0 ? pageLinks : fallbackLinks.filter((link) => link.href !== "/"))]);
      if (settingsResponse?.settings) setSettings({ ...fallbackSettings, ...settingsResponse.settings });
    }

    fetchHeaderData();
  }, [siteSlug]);

  const brandText = settings.navbar_brand_text || settings.business_name || "Iyanla Fix My Crown";
  const ctaLabel = settings.header_cta_label || "Book Now";
  const ctaHref = settings.header_cta_href || "/booking";
  const showDashboardButton = settings.show_dashboard_button ?? true;
  const showClientPortalButton = settings.show_client_portal_button ?? false;
  const showPoliciesLink = settings.show_policies_link ?? true;
  const showCta = Boolean(ctaLabel.trim() && ctaHref.trim());
  const ctaIsExternal = isExternalLink(ctaHref);
  const hasPoliciesLink = links.some((link) => link.href === "/policies" || link.label.toLowerCase() === "policies");
  const visibleLinks = showPoliciesLink && !hasPoliciesLink ? [...links, { id: 9999, label: "Policies", href: "/policies", sort_order: 9999, is_visible: true, opens_new_tab: false }] : links;
  const primaryColor = settings.primary_color || "#ffffff";

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur" style={{ borderColor: `${primaryColor}33` }}>
      <Container>
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="max-w-[220px] truncate text-lg font-semibold uppercase tracking-[0.2em]" style={{ color: primaryColor }}>{brandText}</Link>
          <div className="hidden items-center gap-8 md:flex">{visibleLinks.map((link) => <NavLinkItem key={link.id} link={link} />)}</div>
          <div className="hidden items-center gap-3 md:flex">
            {showClientPortalButton && <Link href="/client" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black">Client Portal</Link>}
            {showDashboardButton && <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black">Dashboard</Link>}
            {showCta && (ctaIsExternal ? <a href={ctaHref} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2 text-sm font-medium text-black transition" style={{ backgroundColor: primaryColor }}>{ctaLabel}</a> : <Link href={ctaHref} className="rounded-full px-4 py-2 text-sm font-medium text-black transition" style={{ backgroundColor: primaryColor }}>{ctaLabel}</Link>)}
          </div>
          <button onClick={() => setMenuOpen((current) => !current)} className="text-white md:hidden" aria-label="Toggle menu">{menuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
        {menuOpen && <div className="flex flex-col gap-2 border-t border-white/10 py-6 md:hidden">{visibleLinks.map((link) => <NavLinkItem key={link.id} link={link} mobile onClick={() => setMenuOpen(false)} />)}{showClientPortalButton && <Link href="/client" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-zinc-300 transition hover:bg-white hover:text-black">Client Portal</Link>}{showDashboardButton && <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-zinc-300 transition hover:bg-white hover:text-black">Dashboard</Link>}{showCta && (ctaIsExternal ? <a href={ctaHref} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-black" style={{ backgroundColor: primaryColor }}>{ctaLabel}</a> : <Link href={ctaHref} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-black" style={{ backgroundColor: primaryColor }}>{ctaLabel}</Link>)}</div>}
      </Container>
    </nav>
  );
}
