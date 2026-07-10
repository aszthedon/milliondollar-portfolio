"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../Container";
import FadeIn from "../FadeIn";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type Service = { id: number; title: string; description: string | null; price: number | null; duration: number | null };
type SiteSettings = { business_name?: string | null; navbar_brand_text?: string | null; home_services_heading?: string | null; home_services_description?: string | null; homepage_layout_settings?: { servicesLayout?: string } };

export default function Services() {
  const siteSlug = getClientSiteSlug();
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);
      const [servicesResponse, settingsResponse] = await Promise.all([
        fetch("/api/public/services", { cache: "no-store" }),
        fetch("/api/public/site-settings", { cache: "no-store" }),
      ]);
      const servicesData = await servicesResponse.json().catch(() => ({}));
      const settingsData = await settingsResponse.json().catch(() => ({}));
      if (!servicesResponse.ok) throw new Error(servicesData.error ?? "Services could not be loaded.");
      setServices((servicesData.services ?? []) as Service[]);
      setSettings((settingsData.settings ?? servicesData.settings ?? {}) as SiteSettings);
    } catch (error) {
      console.error("PUBLIC SERVICES ERROR:", error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [siteSlug]);

  const heading = useMemo(() => {
    if (settings.home_services_heading) return settings.home_services_heading;
    const brand = settings?.navbar_brand_text || settings?.business_name;
    if (siteSlug === "fix-my-crown") return "Hair Services";
    return brand ? `${brand} Services` : "Services";
  }, [settings, siteSlug]);
  const description = settings.home_services_description || "Choose the service that fits your needs and book your appointment online.";
  const layout = settings.homepage_layout_settings?.servicesLayout ?? "cards";

  return (
    <FadeIn>
      <section id="services" className="bg-black py-32 text-white">
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">Services</p>
            <h2 className="text-4xl font-bold md:text-5xl">{heading}</h2>
            <p className="mt-4 text-zinc-400">{description}</p>
          </div>
          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading services...</div> : services.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">No services are published yet. Add services from the dashboard service manager.</div> : (
            <div className={layout === "compact" ? "grid gap-3" : layout === "featured" ? "grid gap-6 lg:grid-cols-3" : "grid gap-6 md:grid-cols-2"}>
              {services.map((service) => (
                <div key={service.id} className={layout === "compact" ? "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5" : "rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:-translate-y-2 hover:border-white/20 hover:bg-white/10"}>
                  <div>
                    <h3 className="mb-3 text-2xl font-semibold">{service.title}</h3>
                    {service.description && <p className="leading-relaxed text-zinc-300">{service.description}</p>}
                  </div>
                  <div className="mt-6 flex gap-6 text-sm text-zinc-500">
                    <span>${Number(service.price ?? 0).toFixed(2)}</span>
                    <span>{service.duration ?? 60} mins</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>
    </FadeIn>
  );
}
