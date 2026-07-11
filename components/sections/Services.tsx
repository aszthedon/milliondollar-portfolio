"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../Container";
import FadeIn from "../FadeIn";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type Service = { id: number; title: string; description: string | null; price: number | null; duration: number | null; section_id?: number | null; allow_quantity?: boolean | null; quantity_label?: string | null; min_quantity?: number | null; max_quantity?: number | null };
type Section = { id: number; title: string; description: string | null; sort_order: number; is_active: boolean };
type SiteSettings = { business_name?: string | null; navbar_brand_text?: string | null; home_services_heading?: string | null; home_services_description?: string | null; homepage_layout_settings?: { servicesLayout?: string } };

export default function Services() {
  const siteSlug = getClientSiteSlug();
  const [services, setServices] = useState<Service[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);
      const [servicesResponse, sectionsResponse, settingsResponse] = await Promise.all([
        fetch("/api/public/services", { cache: "no-store" }),
        fetch("/api/public/service-sections", { cache: "no-store" }),
        fetch("/api/public/site-settings", { cache: "no-store" }),
      ]);
      const servicesData = await servicesResponse.json().catch(() => ({}));
      const sectionsData = await sectionsResponse.json().catch(() => ({}));
      const settingsData = await settingsResponse.json().catch(() => ({}));
      if (!servicesResponse.ok) throw new Error(servicesData.error ?? "Services could not be loaded.");
      setServices((servicesData.services ?? []) as Service[]);
      setSections((sectionsData.sections ?? []) as Section[]);
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
  const groups = useMemo(() => {
    const activeSections = sections.filter((section) => section.is_active !== false);
    return [
      ...activeSections.map((section) => ({ section, services: services.filter((service) => Number(service.section_id) === Number(section.id)) })),
      { section: { id: 0, title: "Other Services", description: "", sort_order: 9999, is_active: true }, services: services.filter((service) => !service.section_id) },
    ].filter((group) => group.services.length > 0);
  }, [sections, services]);

  function serviceCardClass() {
    if (layout === "compact") return "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5";
    return "rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10";
  }

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
            <div className="grid gap-12">
              {groups.map((group) => (
                <div key={group.section.id}>
                  <div className="mb-5">
                    <h3 className="text-3xl font-black">{group.section.title}</h3>
                    {group.section.description && <p className="mt-2 max-w-2xl text-zinc-400">{group.section.description}</p>}
                  </div>
                  <div className={layout === "compact" ? "grid gap-3" : layout === "featured" ? "grid gap-6 lg:grid-cols-3" : "grid gap-6 md:grid-cols-2"}>
                    {group.services.map((service) => (
                      <div key={service.id} className={serviceCardClass()}>
                        <div>
                          <h4 className="mb-3 text-2xl font-semibold">{service.title}</h4>
                          {service.description && <p className="leading-relaxed text-zinc-300">{service.description}</p>}
                        </div>
                        <div className="mt-6 flex flex-wrap gap-6 text-sm text-zinc-500">
                          <span>${Number(service.price ?? 0).toFixed(2)}</span>
                          <span>{service.duration ?? 60} mins</span>
                          {service.allow_quantity && <span>{service.quantity_label || "Quantity"}: {service.min_quantity ?? 1}-{service.max_quantity ?? 1}</span>}
                        </div>
                      </div>
                    ))}
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
