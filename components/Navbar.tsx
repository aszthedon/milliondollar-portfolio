"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { Menu, X } from "lucide-react";

import Container from "./Container";
import { supabase } from "@/lib/supabase";

interface NavigationLink {
  id: number;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  opens_new_tab: boolean;
}

const fallbackLinks: NavigationLink[] = [
  {
    id: 1,
    label: "Home",
    href: "/#home",
    sort_order: 1,
    is_visible: true,
    opens_new_tab: false,
  },
  {
    id: 2,
    label: "Services",
    href: "/#services",
    sort_order: 2,
    is_visible: true,
    opens_new_tab: false,
  },
  {
    id: 3,
    label: "Book Now",
    href: "/#booking",
    sort_order: 3,
    is_visible: true,
    opens_new_tab: false,
  },
  {
    id: 4,
    label: "Gallery",
    href: "/#gallery",
    sort_order: 4,
    is_visible: true,
    opens_new_tab: false,
  },
];

function isExternalLink(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [links, setLinks] =
    useState<NavigationLink[]>(
      fallbackLinks
    );

  useEffect(() => {
    async function fetchNavigationLinks() {
      const { data, error } =
        await supabase
          .from("navigation_links")
          .select(
            `
              id,
              label,
              href,
              sort_order,
              is_visible,
              opens_new_tab
            `
          )
          .eq("is_visible", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        console.error(
          "PUBLIC NAVIGATION ERROR:",
          error
        );
        return;
      }

      if (data && data.length > 0) {
        setLinks(
          data as NavigationLink[]
        );
      }
    }

    fetchNavigationLinks();
  }, []);

  function renderDesktopLink(
    link: NavigationLink
  ) {
    const external =
      isExternalLink(link.href) ||
      link.opens_new_tab;

    if (external) {
      return (
        <a
          key={link.id}
          href={link.href}
          target={
            link.opens_new_tab
              ? "_blank"
              : undefined
          }
          rel={
            link.opens_new_tab
              ? "noopener noreferrer"
              : undefined
          }
          className="text-sm text-zinc-300 transition hover:text-white"
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={link.id}
        href={link.href}
        className="text-sm text-zinc-300 transition hover:text-white"
      >
        {link.label}
      </Link>
    );
  }

  function renderMobileLink(
    link: NavigationLink
  ) {
    const external =
      isExternalLink(link.href) ||
      link.opens_new_tab;

    if (external) {
      return (
        <a
          key={link.id}
          href={link.href}
          target={
            link.opens_new_tab
              ? "_blank"
              : undefined
          }
          rel={
            link.opens_new_tab
              ? "noopener noreferrer"
              : undefined
          }
          onClick={() =>
            setMenuOpen(false)
          }
          className="rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={link.id}
        href={link.href}
        onClick={() =>
          setMenuOpen(false)
        }
        className="rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/10 hover:text-white"
      >
        {link.label}
      </Link>
    );
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <Container>
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="text-lg font-semibold uppercase tracking-[0.2em] text-white"
          >
            MDT Productions
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) =>
              renderDesktopLink(link)
            )}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Dashboard
            </Link>
          </div>

          <button
            onClick={() =>
              setMenuOpen(
                (current) => !current
              )
            }
            className="text-white md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X size={28} />
            ) : (
              <Menu size={28} />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-2 border-t border-white/10 py-6 md:hidden">
            {links.map((link) =>
              renderMobileLink(link)
            )}

            <Link
              href="/dashboard"
              onClick={() =>
                setMenuOpen(false)
              }
              className="rounded-2xl border border-white/10 px-4 py-3 text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Dashboard
            </Link>
          </div>
        )}
      </Container>
    </nav>
  );
}