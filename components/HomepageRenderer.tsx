"use client";

import { useEffect, useState } from "react";

import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import Gallery from "@/components/sections/Gallery";
import Booking from "@/components/sections/Booking";
import Contact from "@/components/sections/Contact";
import CTA from "@/components/sections/CTA";

const defaultOrder = ["hero", "services", "booking", "gallery", "cta", "contact"];

type LayoutSettings = {
  sectionOrder?: string[];
  showHero?: boolean;
  showServices?: boolean;
  showBooking?: boolean;
  showGallery?: boolean;
  showCta?: boolean;
  showContact?: boolean;
};

type PublicSettings = {
  homepage_layout_settings?: LayoutSettings;
};

function isShown(section: string, layout: LayoutSettings) {
  if (section === "hero") return layout.showHero !== false;
  if (section === "services") return layout.showServices !== false;
  if (section === "booking") return layout.showBooking !== false;
  if (section === "gallery") return layout.showGallery !== false;
  if (section === "cta") return layout.showCta !== false;
  if (section === "contact") return layout.showContact !== false;
  return true;
}

function renderSection(section: string) {
  if (section === "hero") return <Hero key="hero" />;
  if (section === "services") return <Services key="services" />;
  if (section === "booking") return <Booking key="booking" />;
  if (section === "gallery") return <Gallery key="gallery" />;
  if (section === "cta") return <CTA key="cta" />;
  if (section === "contact") return <Contact key="contact" />;
  return null;
}

export default function HomepageRenderer() {
  const [settings, setSettings] = useState<PublicSettings>({});

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/public/site-settings", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        setSettings(data?.settings ?? {});
      } catch (error) {
        console.error("HOMEPAGE SETTINGS LOAD ERROR:", error);
      }
    }

    fetchSettings();
  }, []);

  const layout = settings.homepage_layout_settings ?? {};
  const order = Array.isArray(layout.sectionOrder) && layout.sectionOrder.length > 0 ? layout.sectionOrder : defaultOrder;
  const normalizedOrder = [...order, ...defaultOrder.filter((section) => !order.includes(section))];

  return <>{normalizedOrder.filter((section) => isShown(section, layout)).map((section) => renderSection(section))}</>;
}
