"use client";

import { useEffect, useState } from "react";

import Container from "../Container";
import FadeIn from "../FadeIn";

import { supabase } from "@/lib/supabase";

interface Service {
  id: number;
  title: string;
  description: string;
  price: number;
  duration: number;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("id", { ascending: true });

    if (data) {
      setServices(data);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <FadeIn>
      <section
        id="services"
        className="bg-black py-32 text-white"
      >
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Services
            </p>

            <h2 className="text-4xl font-bold md:text-5xl">
              Built For Modern Businesses
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:-translate-y-2 hover:border-white/20 hover:bg-white/10"
              >
                <h3 className="mb-4 text-2xl font-semibold">
                  {service.title}
                </h3>

                <p className="leading-relaxed text-zinc-300">
                  {service.description}
                </p>

                <div className="mt-6 flex gap-6 text-sm text-zinc-500">
                  <span>${service.price}</span>

                  <span>{service.duration} mins</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </FadeIn>
  );
}