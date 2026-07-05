"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../Container";
import FadeIn from "../FadeIn";

import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

type Service = {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  duration: number | null;
};

type SiteSettings = {
  business_name: string | null;
  navbar_brand_text: string | null;
};

export default function Services() {
  const siteSlug = getClientSiteSlug();
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchServices() {
    try {
      setLoading(true);

      const [servicesResult, settingsResult] = await Promise.all([
        supabase
          .from("services")
          .select("id,title,description,price,duration")
          .eq("site_slug", siteSlug)
          .order("created_at", { ascending: true }),
        supabase
          .from("site_settings")
          .select("business_name,navbar_brand_text")
          .eq("site_slug", siteSlug)
          .maybeSingle(),
      ]);

      if (servicesResult.error) {
        console.error("PUBLIC SERVICES ERROR:", servicesResult.error);
      }

      if (settingsResult.error) {
        console.error("PUBLIC SERVICES SETTINGS ERROR:", settingsResult.error);
      }

      setServices((servicesResult.data ?? []) as Service[]);
      setSettings((settingsResult.data ?? null) as SiteSettings | null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, [siteSlug]);

  const heading = useMemo(() => {
    const brand = settings?.navbar_brand_text || settings?.business_name;

    if (siteSlug === "fix-my-crown") {
      return "Hair Services";
    }

    return brand ? `${brand} Services` : "Services";
  }, [settings, siteSlug]);

  return (
    <FadeIn>
      <section id="services" className="bg-black py-32 text-white">
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">Services</p>
            <h2 className="text-4xl font-bold md:text-5xl">{heading}</h2>
            <p className="mt-4 text-zinc-400">These services are managed from the dashboard service manager.</p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">
              No services are published yet. Add services from the dashboard service manager.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {services.map((service) => (
                <div key={service.id} className="rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:-translate-y-2 hover:border-white/20 hover:bg-white/10">
                  <h3 className="mb-4 text-2xl font-semibold">{service.title}</h3>
                  {service.description && <p className="leading-relaxed text-zinc-300">{service.description}</p>}
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
